import requests
import json
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class JupiterAPI:
    BASE_URL = "https://quote-api.jup.ag/v6"

    def get_quote(self, input_mint, output_mint, amount, slippage_bps=50):
        """
        Obtiene una cotización de swap de Jupiter.

        Args:
            input_mint (str): Dirección del token de entrada.
            output_mint (str): Dirección del token de salida.
            amount (int): Cantidad del token de entrada en la unidad más pequeña (lamports).
            slippage_bps (int): Deslizamiento máximo aceptable en puntos base (e.g., 50 para 0.5%).

        Returns:
            dict: Objeto de cotización de Jupiter si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/quote?inputMint={input_mint}&outputMint={output_mint}&amount={amount}&slippageBps={slippage_bps}"
        try:
            response = requests.get(url)
            response.raise_for_status()  # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener cotización de Jupiter para {input_mint} -> {output_mint} con {amount}: {e}")
            return None

    def get_swap_transaction(self, quote_response, user_public_key):
        """
        Obtiene una transacción de swap de Jupiter (sin firmar).

        Args:
            quote_response (dict): Objeto de cotización obtenido de get_quote.
            user_public_key (str): Clave pública del usuario que realizará el swap.

        Returns:
            dict: Objeto de transacción de Jupiter si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/swap"
        headers = {"Content-Type": "application/json"}
        data = {
            "quoteResponse": quote_response,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True
        }
        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
            response.raise_for_status()  # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener transacción de swap de Jupiter: {e}")
            return None



