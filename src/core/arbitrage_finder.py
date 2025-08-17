import time
from src.api.jupiter import JupiterAPI
from src.api.meteora import MeteoraAPI
from src.core.simulation import Simulation
from src.blockchain.solana_rpc import SolanaRPC
from config.settings import MIN_PROFIT_PERCENTAGE, TRADE_CAPITAL_SOL, BASE_TOKENS
from src.utils.logger import setup_logger
from src.utils.helpers import to_raw_amount, to_human_readable # Import new helper functions

logger = setup_logger(__name__)

class ArbitrageFinder:
    def __init__(self):
        self.jupiter_api = JupiterAPI()
        self.meteora_api = MeteoraAPI()
        self.simulation = Simulation()
        self.solana_rpc = SolanaRPC() # Initialize SolanaRPC to get token metadata
        self.opportunities = []
        self.token_decimals_cache = {}
        self.token_symbol_cache = {} # New cache for token symbols

    async def _get_token_decimals(self, mint_address):
        if mint_address not in self.token_decimals_cache:
            if mint_address == BASE_TOKENS["SOL"]:
                self.token_decimals_cache[mint_address] = 9
            elif mint_address == BASE_TOKENS["USDC"]:
                self.token_decimals_cache[mint_address] = 6
            else:
                token_meta = self.solana_rpc.get_token_metadata(mint_address)
                if token_meta and token_meta.get("decimals") is not None:
                    self.token_decimals_cache[mint_address] = token_meta["decimals"]
                else:
                    logger.warning(f"No se pudieron obtener los decimales para el token: {mint_address}. Usando 6 por defecto.")
                    self.token_decimals_cache[mint_address] = 6
        return self.token_decimals_cache[mint_address]

    async def _get_token_symbol(self, mint_address):
        if mint_address not in self.token_symbol_cache:
            if mint_address == BASE_TOKENS["SOL"]:
                self.token_symbol_cache[mint_address] = "SOL"
            elif mint_address == BASE_TOKENS["USDC"]:
                self.token_symbol_cache[mint_address] = "USDC"
            else:
                token_meta = self.solana_rpc.get_token_metadata(mint_address)
                if token_meta and token_meta.get("symbol"):
                    self.token_symbol_cache[mint_address] = token_meta["symbol"]
                else:
                    logger.warning(f"No se pudo obtener el símbolo para el token: {mint_address}. Usando la dirección como símbolo.")
                    self.token_symbol_cache[mint_address] = mint_address # Fallback to address if symbol not found
        return self.token_symbol_cache[mint_address]

    async def find_opportunities(self):
        logger.info("Buscando oportunidades de arbitraje...")
        self.opportunities = []

        one_day_ago_timestamp = int(time.time()) - (24 * 60 * 60)

        meteora_pools = self.meteora_api.get_damm_v2_pools(created_within_hours=24)
        if not meteora_pools:
            logger.warning("No se pudieron obtener o no hay pools de Meteora DAMM v2 recientes.")
            return

        for pool in meteora_pools:
            pool_address = pool.get("address")
            mint_x = pool.get("mint_x")
            mint_y = pool.get("mint_y")

            if not pool_address or not mint_x or not mint_y:
                logger.warning(f"Pool de Meteora incompleta, saltando: {pool}")
                continue

            is_sol_pair = mint_x == BASE_TOKENS["SOL"] or mint_y == BASE_TOKENS["SOL"]
            is_usdc_pair = mint_x == BASE_TOKENS["USDC"] or mint_y == BASE_TOKENS["USDC"]

            if not (is_sol_pair or is_usdc_pair):
                continue

            if mint_x in BASE_TOKENS.values():
                base_mint = mint_x
                meme_mint = mint_y
            elif mint_y in BASE_TOKENS.values():
                base_mint = mint_y
                meme_mint = mint_x
            else:
                continue

            base_token_symbol = await self._get_token_symbol(base_mint)
            meme_token_symbol = await self._get_token_symbol(meme_mint)

            logger.info(f"Analizando par {meme_token_symbol}/{base_token_symbol} en pool Meteora {pool_address}")

            base_token_decimals = await self._get_token_decimals(base_mint)
            trade_capital_lamports = to_raw_amount(TRADE_CAPITAL_SOL, base_token_decimals)

            # --- Simulación: Comprar en Jupiter, Vender en Meteora ---
            try:
                jupiter_quote_buy = self.jupiter_api.get_quote(base_mint, meme_mint, trade_capital_lamports)
                if not jupiter_quote_buy:
                    logger.warning(f"No se obtuvo cotización de Jupiter para comprar {meme_token_symbol} con {base_token_symbol}.")
                    continue

                meme_amount_from_jupiter = int(jupiter_quote_buy["outAmount"])
                meteora_sim_sell_result = self.simulation.simulate_meteora_swap(
                    pool_address, meme_mint, base_mint, meme_amount_from_jupiter, pool
                )

                if meteora_sim_sell_result and meteora_sim_sell_result["out_amount"] > 0:
                    net_profit_buy_jupiter_sell_meteora = meteora_sim_sell_result["out_amount"] - trade_capital_lamports
                    profit_percentage = (net_profit_buy_jupiter_sell_meteora / trade_capital_lamports) * 100

                    if profit_percentage >= MIN_PROFIT_PERCENTAGE:
                        self.opportunities.append({
                            "pair": f"{meme_token_symbol}/{base_token_symbol}",
                            "direction": "Jupiter -> Meteora",
                            "capital": f"{TRADE_CAPITAL_SOL} {base_token_symbol}",
                            "net_profit_lamports": net_profit_buy_jupiter_sell_meteora,
                            "profit_percentage": round(profit_percentage, 4),
                            "buy_platform": "Jupiter",
                            "sell_platform": "Meteora",
                            "jupiter_link": f"https://jup.ag/swap/{base_token_symbol}-{meme_token_symbol}?amount={to_human_readable(trade_capital_lamports, base_token_decimals)}",
                            "meteora_link": f"https://app.meteora.ag/pools/{pool_address}",
                            "timestamp": int(time.time())
                        })
                        logger.info(f"Oportunidad detectada (J->M): {meme_token_symbol}/{base_token_symbol} - {profit_percentage:.4f}% de ganancia.")

            except Exception as e:
                logger.error(f"Error en simulación J->M para {meme_token_symbol}/{base_token_symbol}: {e}")

            # --- Simulación: Comprar en Meteora, Vender en Jupiter ---
            try:
                meteora_sim_buy_result = self.simulation.simulate_meteora_swap(
                    pool_address, base_mint, meme_mint, trade_capital_lamports, pool
                )

                if meteora_sim_buy_result and meteora_sim_buy_result["out_amount"] > 0:
                    meme_amount_from_meteora = meteora_sim_buy_result["out_amount"]

                    jupiter_quote_sell = self.jupiter_api.get_quote(meme_mint, base_mint, meme_amount_from_meteora)
                    if not jupiter_quote_sell:
                        logger.warning(f"No se obtuvo cotización de Jupiter para vender {meme_token_symbol} por {base_token_symbol}.")
                        continue

                    net_profit_buy_meteora_sell_jupiter = int(jupiter_quote_sell["outAmount"]) - trade_capital_lamports
                    profit_percentage = (net_profit_buy_meteora_sell_jupiter / trade_capital_lamports) * 100

                    if profit_percentage >= MIN_PROFIT_PERCENTAGE:
                        self.opportunities.append({
                            "pair": f"{meme_token_symbol}/{base_token_symbol}",
                            "direction": "Meteora -> Jupiter",
                            "capital": f"{TRADE_CAPITAL_SOL} {base_token_symbol}",
                            "net_profit_lamports": net_profit_buy_meteora_sell_jupiter,
                            "profit_percentage": round(profit_percentage, 4),
                            "buy_platform": "Meteora",
                            "sell_platform": "Jupiter",
                            "jupiter_link": f"https://jup.ag/swap/{meme_token_symbol}-{base_token_symbol}?amount={to_human_readable(meme_amount_from_meteora, await self._get_token_decimals(meme_mint))}",
                            "meteora_link": f"https://app.meteora.ag/pools/{pool_address}",
                            "timestamp": int(time.time())
                        })
                        logger.info(f"Oportunidad detectada (M->J): {meme_token_symbol}/{base_token_symbol} - {profit_percentage:.4f}% de ganancia.")

            except Exception as e:
                logger.error(f"Error en simulación M->J para {meme_token_symbol}/{base_token_symbol}: {e}")

        logger.info(f"Búsqueda de oportunidades finalizada. Encontradas {len(self.opportunities)} oportunidades.")
        return self.opportunities

    def get_current_opportunities(self):
        return self.opportunities


