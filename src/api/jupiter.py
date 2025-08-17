import requests
import json

class JupiterAPI:
    BASE_URL = "https://quote-api.jup.ag/v6"

    def get_quote(self, input_mint, output_mint, amount, slippage_bps=50):
        # amount should be in lamports (smallest unit)
        url = f"{self.BASE_URL}/quote?inputMint={input_mint}&outputMint={output_mint}&amount={amount}&slippageBps={slippage_bps}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def get_swap_transaction(self, quote_response, user_public_key):
        url = f"{self.BASE_URL}/swap"
        headers = {"Content-Type": "application/json"}
        data = {
            "quoteResponse": quote_response,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True
        }
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        return response.json()



