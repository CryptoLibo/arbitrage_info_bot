from flask import Flask, render_template, jsonify
import sys
import os
import time

# Add the parent directory to the sys.path to allow imports from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 
                                                os.pardir)))

# Import the shared ArbitrageFinder instance from main.py
from src.main import shared_arbitrage_finder
from src.utils.logger import setup_logger
from src.utils.helpers import to_human_readable
from config.settings import BASE_TOKENS

logger = setup_logger(__name__)

app = Flask(__name__, 
            template_folder=
            os.path.abspath(os.path.join(os.path.dirname(__file__), 
                                        'templates')),
            static_folder=
            os.path.abspath(os.path.join(os.path.dirname(__file__), 
                                        'static')))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/opportunities')
def get_opportunities():
    opportunities = shared_arbitrage_finder.get_current_opportunities()
    
    formatted_opportunities = []
    for opp in opportunities:
        formatted_opp = opp.copy()
        
        # Determine the base token symbol and its decimals for display
        base_token_symbol = opp['capital'].split(' ')[1] # e.g., '0.1 SOL' -> 'SOL'
        base_mint_address = BASE_TOKENS.get(base_token_symbol) # Get mint address from settings
        
        # This is a simplification. In a real scenario, you'd need to fetch decimals for any token.
        # For now, rely on the base tokens defined in settings.
        base_token_decimals = 9 if base_token_symbol == "SOL" else (6 if base_token_symbol == "USDC" else 0)

        if 'net_profit_lamports' in formatted_opp:
            formatted_opp['net_profit_display'] = f"{to_human_readable(formatted_opp['net_profit_lamports'], base_token_decimals):.6f} {base_token_symbol}"
        
        # Format timestamp for display
        if 'timestamp' in formatted_opp and isinstance(formatted_opp['timestamp'], int):
            formatted_opp['timestamp_display'] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(formatted_opp['timestamp']))
        else:
            formatted_opp['timestamp_display'] = 'N/A'

        formatted_opportunities.append(formatted_opp)

    return jsonify(formatted_opportunities)

if __name__ == '__main__':
    logger.info("Iniciando servidor del dashboard en http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)


