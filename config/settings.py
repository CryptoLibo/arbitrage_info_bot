# Configuración general del bot

MIN_PROFIT_PERCENTAGE = 0.1  # Porcentaje mínimo de ganancia para considerar una oportunidad
TRADE_CAPITAL_SOL = 0.1      # Capital fijo por trade en SOL

# Tokens base (SOL y USDC)
BASE_TOKENS = {
    "SOL": "So11111111111111111111111111111111111111112",
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" # Ejemplo de USDC en Solana
}

# Intervalos de polling (en segundos)
METEORA_POOLS_POLLING_INTERVAL = 60

# Rutas de archivos de caché
POOLS_CACHE_FILE = "data/pools_cache.json"
TOKEN_METADATA_FILE = "data/token_metadata.json"


