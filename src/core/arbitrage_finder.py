from src.api.jupiter import JupiterAPI
from src.api.meteora import MeteoraAPI
from src.core.simulation import Simulation
from config.settings import MIN_PROFIT_PERCENTAGE, TRADE_CAPITAL_SOL, BASE_TOKENS
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class ArbitrageFinder:
    def __init__(self):
        self.jupiter_api = JupiterAPI()
        self.meteora_api = MeteoraAPI()
        self.simulation = Simulation()
        self.opportunities = []

    async def find_opportunities(self):
        logger.info("Buscando oportunidades de arbitraje...")
        self.opportunities = [] # Limpiar oportunidades anteriores

        # 1. Obtener todas las pools DAMM v2 de Meteora
        meteora_pools = self.meteora_api.get_damm_v2_pools()
        if not meteora_pools:
            logger.warning("No se pudieron obtener las pools de Meteora DAMM v2.")
            return

        for pool in meteora_pools:
            pool_address = pool.get("address")
            mint_x = pool.get("mint_x")
            mint_y = pool.get("mint_y")
            pool_name = pool.get("name", f"{mint_x}/{mint_y}")

            if not pool_address or not mint_x or not mint_y:
                logger.warning(f"Pool de Meteora incompleta, saltando: {pool}")
                continue

            # Filtrar por pares con tokens base (SOL o USDC)
            is_sol_pair = mint_x == BASE_TOKENS["SOL"] or mint_y == BASE_TOKENS["SOL"]
            is_usdc_pair = mint_x == BASE_TOKENS["USDC"] or mint_y == BASE_TOKENS["USDC"]

            if not (is_sol_pair or is_usdc_pair):
                continue # No es un par con SOL o USDC

            # Determinar la memecoin y el token base
            if mint_x in BASE_TOKENS.values():
                base_mint = mint_x
                meme_mint = mint_y
                base_token_symbol = next(key for key, value in BASE_TOKENS.items() if value == base_mint)
                meme_token_symbol = pool_name.replace(f"/{base_token_symbol}", "") # Intento de obtener el símbolo de la memecoin
            elif mint_y in BASE_TOKENS.values():
                base_mint = mint_y
                meme_mint = mint_x
                base_token_symbol = next(key for key, value in BASE_TOKENS.items() if value == base_mint)
                meme_token_symbol = pool_name.replace(f"{base_token_symbol}/", "") # Intento de obtener el símbolo de la memecoin
            else:
                continue # No debería llegar aquí si el filtro funciona

            logger.info(f"Analizando par {meme_token_symbol}/{base_token_symbol} en pool Meteora {pool_address}")

            # Convertir TRADE_CAPITAL_SOL a la unidad más pequeña (lamports) si es SOL
            # Asumimos 9 decimales para SOL, 6 para USDC. Esto debe ser dinámico con metadatos de token.
            if base_token_symbol == "SOL":
                trade_capital_lamports = int(TRADE_CAPITAL_SOL * (10**9)) # SOL tiene 9 decimales
            elif base_token_symbol == "USDC":
                trade_capital_lamports = int(TRADE_CAPITAL_SOL * (10**6)) # USDC tiene 6 decimales (ejemplo, debe ser dinámico)
            else:
                continue # No es un token base soportado

            # --- Simulación: Comprar en Jupiter, Vender en Meteora ---
            try:
                # Obtener cotización de Jupiter (comprar memecoin con token base)
                jupiter_quote_buy = self.jupiter_api.get_quote(base_mint, meme_mint, trade_capital_lamports)
                if not jupiter_quote_buy:
                    logger.warning(f"No se obtuvo cotización de Jupiter para comprar {meme_token_symbol} con {base_token_symbol}.")
                    continue

                # Simular venta en Meteora (vender memecoin por token base)
                # Necesitamos el outAmount de Jupiter para la simulación en Meteora
                meme_amount_from_jupiter = int(jupiter_quote_buy["outAmount"])
                meteora_sim_sell_result = self.simulation.simulate_meteora_swap(
                    pool_address, meme_mint, base_mint, meme_amount_from_jupiter, pool # Pasar la pool completa para detalles
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
                            "jupiter_link": f"https://jup.ag/swap/{base_token_symbol}-{meme_token_symbol}?amount={TRADE_CAPITAL_SOL}", # Placeholder
                            "meteora_link": f"https://app.meteora.ag/pools/{pool_address}", # Placeholder
                            "timestamp": "TODO: add real timestamp"
                        })
                        logger.info(f"Oportunidad detectada (J->M): {meme_token_symbol}/{base_token_symbol} - {profit_percentage:.4f}% de ganancia.")

            except Exception as e:
                logger.error(f"Error en simulación J->M para {pool_name}: {e}")

            # --- Simulación: Comprar en Meteora, Vender en Jupiter ---
            try:
                # Simular compra en Meteora (comprar memecoin con token base)
                meteora_sim_buy_result = self.simulation.simulate_meteora_swap(
                    pool_address, base_mint, meme_mint, trade_capital_lamports, pool # Pasar la pool completa para detalles
                )

                if meteora_sim_buy_result and meteora_sim_buy_result["out_amount"] > 0:
                    meme_amount_from_meteora = meteora_sim_buy_result["out_amount"]

                    # Obtener cotización de Jupiter (vender memecoin por token base)
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
                            "jupiter_link": f"https://jup.ag/swap/{meme_token_symbol}-{base_token_symbol}?amount={meme_amount_from_meteora}", # Placeholder
                            "meteora_link": f"https://app.meteora.ag/pools/{pool_address}", # Placeholder
                            "timestamp": "TODO: add real timestamp"
                        })
                        logger.info(f"Oportunidad detectada (M->J): {meme_token_symbol}/{base_token_symbol} - {profit_percentage:.4f}% de ganancia.")

            except Exception as e:
                logger.error(f"Error en simulación M->J para {pool_name}: {e}")

        logger.info(f"Búsqueda de oportunidades finalizada. Encontradas {len(self.opportunities)} oportunidades.")
        return self.opportunities

    def get_current_opportunities(self):
        return self.opportunities


