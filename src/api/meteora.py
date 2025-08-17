import requests
import json
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class MeteoraAPI:
    # La URL base correcta para la API de Meteora DLMM/DAMM v2 es https://dlmm-api.meteora.ag/
    # Aunque la documentación mencionaba /v2, la URL real para los endpoints de pools es la raíz.
    BASE_URL = "https://dlmm-api.meteora.ag"

    def get_damm_v2_pools(self):
        """
        Obtiene una lista de todas las pools DAMM v2 de Meteora.

        Returns:
            list: Lista de objetos de pools DAMM v2 si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/pair/all"
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener pools de Meteora DAMM v2: {e}")
            return None

    def get_damm_v2_pool_details(self, pool_address):
        """
        Obtiene los detalles de una pool DAMM v2 específica de Meteora.

        Args:
            pool_address (str): Dirección de la pool DAMM v2.

        Returns:
            dict: Objeto de detalles de la pool si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/pair/{pool_address}"
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener detalles de la pool {pool_address} de Meteora DAMM v2: {e}")
            return None


