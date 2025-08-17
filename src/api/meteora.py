import requests
import json
import time
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class MeteoraAPI:
    BASE_URL = "https://rocketscan.fun/api"

    def get_damm_v2_pools(self, created_after_timestamp=None):
        """
        Obtiene una lista de todas las pools DAMM v2 de Rocketscan, opcionalmente filtradas por fecha de creación.

        Args:
            created_after_timestamp (int, optional): Timestamp Unix. Solo se devolverán las pools creadas después de este tiempo.

        Returns:
            list: Lista de objetos de pools DAMM v2 si es exitoso, None en caso contrario.
        """
        url = f"{self.BASE_URL}/dammv2-pools"
        params = {
            "page": 1,
            "limit": 100, # Increased limit to fetch more pools per request
            "sortBy": "createdAt",
            "sortOrder": "desc",
            "_": int(time.time() * 1000) # Cache buster
        }
        all_pools = []
        page = 1
        while True:
            params["page"] = page
            try:
                response = requests.get(url, params=params)
                response.raise_for_status() # Lanza una excepción para errores HTTP
                data = response.json()
                pools = data.get("pools", []) # Rocketscan returns pools under 'pools' key

                if not pools:
                    break # No hay más pools

                # Filter pools by creation timestamp if provided
                # Rocketscan returns 'createdAt' in ISO format, convert to timestamp for comparison
                if created_after_timestamp:
                    filtered_current_page_pools = []
                    for p in pools:
                        created_at_iso = p.get("createdAt")
                        if created_at_iso:
                            # Convert ISO 8601 string to datetime object, then to Unix timestamp
                            # Example: '2025-08-17T15:00:00.000Z'
                            try:
                                # Python 3.11+ can parse 'Z' directly as UTC
                                # For older Python, might need .replace('Z', '+00:00')
                                dt_object = datetime.fromisoformat(created_at_iso.replace('Z', '+00:00'))
                                pool_created_timestamp = int(dt_object.timestamp())
                                if pool_created_timestamp >= created_after_timestamp:
                                    filtered_current_page_pools.append(p)
                            except ValueError:
                                logger.warning(f"Formato de fecha inválido para pool {p.get('address')}: {created_at_iso}")
                                continue
                        else:
                            logger.warning(f"Pool {p.get('address')} no tiene campo 'createdAt'.")

                else:
                    filtered_current_page_pools = pools

                all_pools.extend(filtered_current_page_pools)
                
                # If the number of pools returned is less than the page size, it's the last page
                if len(pools) < params["limit"]:
                    break
                else:
                    page += 1 # Go to the next page

            except requests.exceptions.RequestException as e:
                logger.error(f"Error al obtener pools de Rocketscan DAMM v2: {e}")
                return None
        
        return all_pools

    def get_damm_v2_pool_details(self, pool_address):
        """
        Obtiene los detalles de una pool DAMM v2 específica de Rocketscan.
        Nota: Rocketscan no parece tener un endpoint directo para detalles de pool por dirección.
        Podríamos necesitar buscar en la lista completa o confiar en los datos de la lista inicial.
        Por ahora, mantendremos el endpoint original de Meteora si es necesario para otros detalles.

        Args:
            pool_address (str): Dirección de la pool DAMM v2.

        Returns:
            dict: Objeto de detalles de la pool si es exitoso, None en caso contrario.
        """
        # Este endpoint probablemente no funcionará con Rocketscan BASE_URL
        # Si necesitamos detalles específicos, tendremos que reevaluar cómo obtenerlos.
        url = f"https://damm-api.meteora.ag/pair/{pool_address}" # Revertir a la API original de Meteora para detalles
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener detalles de la pool {pool_address} de Meteora DAMM v2 (usando API original): {e}")
            return None

from datetime import datetime # Import datetime for ISO format parsing



