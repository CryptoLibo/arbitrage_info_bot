import requests
import json

class MeteoraAPI:
    # Base URL para la API de Meteora DAMM v2 (ejemplo, verificar la URL exacta en la documentación)
    BASE_URL = "https://api.meteora.ag/v2" # Esta URL es un placeholder, debe ser verificada

    def get_damm_v2_pools(self):
        # Este endpoint es un placeholder, debe ser verificado en la documentación de Meteora
        # En la investigación previa, vimos /pools para DAMM v2
        url = f"{self.BASE_URL}/pools"
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al obtener pools de Meteora DAMM v2: {e}")
            return None

    def get_damm_v2_pool_details(self, pool_address):
        # Este endpoint es un placeholder, debe ser verificado en la documentación de Meteora
        # En la investigación previa, vimos /pools/{address} para DAMM v2
        url = f"{self.BASE_URL}/pools/{pool_address}"
        try:
            response = requests.get(url)
            response.raise_for_status() # Lanza una excepción para errores HTTP
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al obtener detalles de la pool {pool_address} de Meteora DAMM v2: {e}")
            return None


