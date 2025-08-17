# Bot de Información de Arbitraje (Jupiter - Meteora DAMM v2)

Este proyecto es un bot de información diseñado para detectar oportunidades de arbitraje en tiempo real entre Jupiter Aggregator y las pools DAMM v2 de Meteora en la red de Solana. El bot simula transacciones y calcula posibles ganancias, presentando la información en un dashboard interactivo para que el usuario pueda analizarla y decidir si ejecutar los swaps manualmente.

## Características

- **Detección de Oportunidades:** Escanea las pools DAMM v2 de Meteora y compara precios con Jupiter Aggregator.
- **Simulación de Swaps:** Simula la compra/venta de memecoins con tokens base (SOL/USDC) para estimar la rentabilidad.
- **Dashboard Interactivo:** Muestra las oportunidades de arbitraje en tiempo real, incluyendo el par, la dirección del arbitraje, el capital simulado, la ganancia neta, el porcentaje de ganancia y enlaces directos a Jupiter y Meteora.
- **Enfoque en Memecoins:** Prioriza la detección de oportunidades en pares con memecoins y tokens base.
- **Modular y Extensible:** Diseñado con una estructura modular para facilitar futuras mejoras y adiciones.

## Estructura del Proyecto

```
arbitrage_info_bot/
├── config/
│   ├── __init__.py
│   ├── rpc_endpoints.py    # Configuración de los endpoints RPC de QuickNode
│   └── settings.py         # Configuración general del bot (capital, % de ganancia, etc.)
├── dashboard/
│   ├── __init__.py
│   ├── app.py              # Aplicación Flask para el dashboard web
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css   # Estilos CSS del dashboard
│   │   └── js/
│   │       └── script.js   # Lógica JavaScript para el dashboard
│   └── templates/
│       └── index.html      # Plantilla HTML del dashboard
├── src/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── jupiter.py      # Interacción con la API de Jupiter Aggregator
│   │   └── meteora.py      # Interacción con la API de Meteora (DAMM v2)
│   ├── blockchain/
│   │   ├── __init__.py
│   │   └── solana_rpc.py   # Interacción con la RPC de Solana (HTTP y WebSockets)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── arbitrage_finder.py # Lógica principal para encontrar oportunidades de arbitraje
│   │   └── simulation.py   # Módulo para simular swaps en Meteora DAMM v2
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── helpers.py      # Funciones de utilidad (conversión de cantidades, etc.)
│   │   └── logger.py       # Configuración del sistema de logging
│   └── main.py             # Punto de entrada principal del bot
└── requirements.txt        # Dependencias de Python
```

## Configuración del Entorno

### 1. Clonar el Repositorio

```bash
git clone https://github.com/CryptoLibo/arbitrage_info_bot.git
cd arbitrage_info_bot
```

### 2. Configurar Endpoints RPC

Edita el archivo `config/rpc_endpoints.py` y reemplaza los placeholders con tus propios endpoints de QuickNode (o cualquier otro proveedor RPC de Solana).

```python
# config/rpc_endpoints.py

QUICKNODE_RPC_HTTP = "TU_ENDPOINT_HTTP_QUICKNODE"
QUICKNODE_RPC_WS = "TU_ENDPOINT_WS_QUICKNODE"
```

### 3. Instalar Dependencias

Se recomienda usar un entorno virtual.

```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configuración del Bot

Edita `config/settings.py` para ajustar parámetros como el porcentaje mínimo de ganancia y el capital de trade simulado.

```python
# config/settings.py

MIN_PROFIT_PERCENTAGE = 0.1  # Porcentaje mínimo de ganancia para considerar una oportunidad (ej. 0.1 para 0.1%)
TRADE_CAPITAL_SOL = 0.1      # Capital simulado por trade en SOL (ej. 0.1 SOL)
METEORA_POOLS_POLLING_INTERVAL = 10 # Intervalo en segundos para buscar nuevas oportunidades en Meteora

# Direcciones de los tokens base (SOL y USDC)
BASE_TOKENS = {
    "SOL": "So11111111111111111111111111111111111111112",
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" # Ejemplo de USDC en Solana
}
```

## Ejecución del Bot

Para iniciar el bot y el dashboard, ejecuta el archivo `main.py`:

```bash
python3 src/main.py
```

El bot comenzará a buscar oportunidades de arbitraje y el dashboard estará accesible en `http://0.0.0.0:5000`. Si lo ejecutas en un servidor remoto o en un entorno como este sandbox, necesitarás exponer el puerto 5000 para acceder a él desde tu navegador.

## Limitaciones y Consideraciones

- **Simulación de Meteora:** La simulación de swaps en Meteora DAMM v2 es una aproximación simplificada. Para un bot de ejecución real, se necesitaría una implementación mucho más precisa de la lógica de los bins de Meteora o el uso de su SDK oficial.
- **Detección de Memecoins:** La detección de nuevas memecoins y pools se basa actualmente en el escaneo de pools existentes. Una implementación más avanzada podría requerir la suscripción a logs de programas específicos de Solana para detectar la creación de nuevas pools en tiempo real.
- **Rate Limits RPC:** El uso de RPCs gratuitos puede llevar a limitaciones de tasa. Para un uso intensivo, se recomienda una suscripción de pago.
- **Slippage y Liquidez:** Aunque se intenta estimar el slippage, la baja liquidez de muchas memecoins puede hacer que las oportunidades de arbitraje sean efímeras o no rentables en la práctica.
- **Dashboard:** El dashboard actual es una interfaz básica. Puede ser mejorado con más funcionalidades, gráficos y filtros.
- **No Ejecución de Trades:** Este bot está diseñado **únicamente para información**. No ejecuta trades automáticamente. La decisión y ejecución de los swaps recae en el usuario.

## Contribuciones

Este proyecto está diseñado para ser modular y fácil de entender. Las contribuciones son bienvenidas para mejorar la precisión de las simulaciones, añadir nuevas características o refinar la interfaz de usuario.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.


