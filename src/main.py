import asyncio
import time
import threading
import sys
import os

# Add the project root to sys.path to allow imports from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from src.core.arbitrage_finder import ArbitrageFinder
from src.blockchain.solana_rpc import SolanaRPC
from src.utils.logger import setup_logger
from config.settings import METEORA_POOLS_POLLING_INTERVAL

logger = setup_logger(__name__)

# Global instance of ArbitrageFinder to be shared with the dashboard
# In a more complex setup, a message queue or database would be used for inter-process communication
shared_arbitrage_finder = ArbitrageFinder()

class ArbitrageInfoBot:
    def __init__(self):
        self.arbitrage_finder = shared_arbitrage_finder
        self.solana_rpc = SolanaRPC()

    def start_dashboard_thread(self):
        # Import app here to avoid circular dependencies
        from dashboard.app import app as dashboard_app
        logger.info("Iniciando el dashboard interactivo en un hilo separado...")
        # Run Flask app in a separate thread
        # app.run(debug=True, host=\'0.0.0.0\', port=5000, use_reloader=False) is for development
        # For production, use a WSGI server like Gunicorn or Waitress
        dashboard_app.run(host=\'0.0.0.0\', port=5000, debug=False, use_reloader=False)

    async def run_arbitrage_finder(self):
        while True:
            logger.info("Iniciando ciclo de búsqueda de arbitraje...")
            await self.arbitrage_finder.find_opportunities()
            opportunities = self.arbitrage_finder.get_current_opportunities()
            logger.info(f"Oportunidades actuales encontradas: {len(opportunities)}")

            logger.info(f"Esperando {METEORA_POOLS_POLLING_INTERVAL} segundos para la próxima búsqueda...")
            await asyncio.sleep(METEORA_POOLS_POLLING_INTERVAL)

    async def start_solana_listeners(self):
        # Placeholder for starting WebSocket listeners for new pools/tokens
        logger.info("Iniciando listeners de Solana RPC (WebSockets)...")
        # TODO: Implement actual WebSocket subscriptions and handlers
        pass

    async def start(self):
        # Start dashboard in a separate thread
        dashboard_thread = threading.Thread(target=self.start_dashboard_thread, daemon=True)
        dashboard_thread.start()

        # Start Solana listeners (if implemented)
        await self.start_solana_listeners()

        # Run arbitrage finder in the main async loop
        await self.run_arbitrage_finder()

if __name__ == "__main__":
    bot = ArbitrageInfoBot()
    try:
        asyncio.run(bot.start())
    except KeyboardInterrupt:
        logger.info("Bot detenido por el usuario.")
    except Exception as e:
        logger.error(f"Error inesperado en el bot: {e}")




