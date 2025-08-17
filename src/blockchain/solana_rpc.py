from solana.rpc.api import Client
from solana.rpc.websocket_api import connect
from solders.pubkey import Pubkey as PublicKey
from solana.rpc.types import TokenAccountOpts
from config.rpc_endpoints import QUICKNODE_RPC_HTTP, QUICKNODE_RPC_WS
from src.utils.logger import setup_logger
import asyncio
import json

logger = setup_logger(__name__)

class SolanaRPC:
    def __init__(self):
        self.http_client = Client(QUICKNODE_RPC_HTTP)
        self.ws_client = None # Will be initialized when needed

    def get_latest_blockhash(self):
        try:
            response = self.http_client.get_latest_blockhash()
            return response.value
        except Exception as e:
            logger.error(f"Error al obtener el último blockhash: {e}")
            return None

    def get_token_supply(self, mint_address):
        try:
            response = self.http_client.get_token_supply(PublicKey(mint_address))
            return response.value.amount
        except Exception as e:
            logger.error(f"Error al obtener el suministro del token {mint_address}: {e}")
            return None

    def get_token_account_balance(self, token_account_address):
        try:
            response = self.http_client.get_token_account_balance(PublicKey(token_account_address))
            return response.value.amount
        except Exception as e:
            logger.error(f"Error al obtener el balance de la cuenta de token {token_account_address}: {e}")
            return None

    def get_token_metadata(self, mint_address):
        # This is a simplified placeholder. Real token metadata often comes from Metaplex or other registries.
        # For memecoins, this might not be available or reliable.
        # A more robust solution would involve querying a token registry API or parsing on-chain data.
        try:
            # Attempt to get basic info from token mint account
            account_info = self.http_client.get_account_info(PublicKey(mint_address))
            if account_info.value:
                # This is a very basic attempt to infer decimals. Not reliable for all tokens.
                # For accurate decimals, you\'d typically need to parse the Tokenkeg program data
                # or rely on a token list/registry.
                # For now, we\'ll assume common decimals for SOL/USDC and default for others.
                if mint_address == "So11111111111111111111111111111111111111112": # SOL
                    decimals = 9
                    symbol = "SOL"
                elif mint_address == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": # USDC (example)
                    decimals = 6
                    symbol = "USDC"
                else:
                    # Fallback for other tokens - very basic
                    decimals = 6 # Common default, but highly unreliable
                    symbol = mint_address[:4] + "..." + mint_address[-4:] # Use part of address as symbol

                return {"mint": mint_address, "decimals": decimals, "symbol": symbol}
            return None
        except Exception as e:
            logger.error(f"Error al obtener metadatos del token {mint_address}: {e}")
            return None

    async def connect_websocket(self):
        if not self.ws_client:
            try:
                self.ws_client = await connect(QUICKNODE_RPC_WS)
                logger.info("Conexión WebSocket establecida con Solana RPC.")
            except Exception as e:
                logger.error(f"Error al conectar WebSocket a Solana RPC: {e}")
                self.ws_client = None
        return self.ws_client

    async def subscribe_to_logs(self, program_id, callback):
        if not await self.connect_websocket():
            return
        try:
            # Subscribe to logs for a specific program ID
            # This is useful for detecting new pool creations or significant events
            await self.ws_client.logs_subscribe(program_id, commitment="finalized")
            logger.info(f"Suscrito a logs del programa: {program_id}")
            async for msg in self.ws_client:
                await callback(msg)
        except Exception as e:
            logger.error(f"Error en la suscripción a logs para {program_id}: {e}")

    async def subscribe_to_program_accounts(self, program_id, callback):
        if not await self.connect_websocket():
            return
        try:
            # Subscribe to account changes for a specific program ID
            # This can be used to monitor changes in pool accounts (e.g., liquidity changes)
            await self.ws_client.program_subscribe(program_id, commitment="finalized")
            logger.info(f"Suscrito a cuentas del programa: {program_id}")
            async for msg in self.ws_client:
                await callback(msg)
        except Exception as e:
            logger.error(f"Error en la suscripción a cuentas del programa {program_id}: {e}")

    async def close_websocket(self):
        if self.ws_client:
            try:
                await self.ws_client.close()
                logger.info("Conexión WebSocket cerrada.")
            except Exception as e:
                logger.error(f"Error al cerrar conexión WebSocket: {e}")
            finally:
                self.ws_client = None





