import requests
import json
import time
from datetime import datetime, timedelta
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class MeteoraAPI:
    BASE_URL = "https://dammv2-api.meteora.ag"

    def get_damm_v2_pools(self, created_within_hours=24):
        """
        Obtiene una lista de todas las pools DAMM v2 de Meteora, filtrando por pools creadas en las últimas X horas.

        Args:
            created_within_hours (int): Número de horas hacia atrás para filtrar las pools.

        Returns:
            list: Lista de objetos de pools DAMM v2 si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/pools"
        all_pools = []
        page = 1
        limit = 100 # Max limit per request

        # Calculate the timestamp for 24 hours ago
        time_ago = datetime.utcnow() - timedelta(hours=created_within_hours)
        min_timestamp = int(time_ago.timestamp())

        while True:
            params = {
                "page": page,
                "limit": limit,
                "order_by": "created_at_slot_timestamp",
                "order": "desc",
            }
            try:
                response = requests.get(url, params=params)
                response.raise_for_status() # Lanza una excepción para errores HTTP
                data = response.json()
                pools = data.get("data", [])

                if not pools:
                    break # No hay más pools

                filtered_current_page_pools = []
                for p in pools:
                    created_at_slot_timestamp = p.get("created_at_slot_timestamp")
                    if created_at_slot_timestamp and created_at_slot_timestamp >= min_timestamp:
                        filtered_current_page_pools.append(p)
                    else:
                        # Since pools are ordered by timestamp desc, if we find one older than min_timestamp,
                        # we can stop fetching more pages.
                        break
                
                all_pools.extend(filtered_current_page_pools)

                if len(pools) < limit or (len(filtered_current_page_pools) < len(pools) and created_within_hours is not None):
                    break # No more pages or we've found all recent pools
                else:
                    page += 1

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
        url = f"{self.BASE_URL}/pools/{pool_address}"
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener detalles de la pool {pool_address} de Meteora DAMM v2: {e}")
            return None


