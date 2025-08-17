import requests
import json
import time
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class MeteoraAPI:
    BASE_URL = "https://damm-api.meteora.ag"

    def get_damm_v2_pools(self, created_after_timestamp=None):
        """
        Obtiene una lista de todas las pools DAMM v2 de Meteora, opcionalmente filtradas por fecha de creación.

        Args:
            created_after_timestamp (int, optional): Timestamp Unix. Solo se devolverán las pools creadas después de este tiempo.

        Returns:
            list: Lista de objetos de pools DAMM v2 si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/pools/search"
        params = {
            "pool_type": "dynamic", # Asumiendo que 'dynamic' corresponde a DAMM v2
            "page": 0,
            "size": 100
        }
        all_pools = []
        while True:
            try:
                response = requests.get(url, params=params)
                response.raise_for_status() # Lanza una excepción para errores HTTP
                data = response.json()
                pools = data.get("data", [])

                if not pools:
                    break # No hay más pools

                # Filter pools by creation timestamp if provided
                if created_after_timestamp:
                    filtered_current_page_pools = [p for p in pools if p.get("created_at") and p["created_at"] >= created_after_timestamp]
                else:
                    filtered_current_page_pools = pools

                all_pools.extend(filtered_current_page_pools)
                
                # If the number of pools returned is less than the page size, it's the last page
                if len(pools) < params["size"]:
                    break
                else:
                    params["page"] += 1 # Go to the next page

            except requests.exceptions.RequestException as e:
                logger.error(f"Error al obtener pools de Meteora DAMM v2: {e}")
                return None
        
        return all_pools

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



