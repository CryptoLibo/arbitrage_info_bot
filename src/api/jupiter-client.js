"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupiterClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
class JupiterClient {
    connection;
    baseUrl;
    constructor(connection) {
        this.connection = connection;
        this.baseUrl = 'https://quote-api.jup.ag/v6';
    }
    async getQuote(inputMint, outputMint, amount, slippageBps = 10) {
        try {
            const params = new URLSearchParams({
                inputMint,
                outputMint,
                amount: amount.toString(),
                slippageBps: slippageBps.toString(),
                onlyDirectRoutes: 'false',
                asLegacyTransaction: 'false'
            });
            const response = await axios_1.default.get(`${this.baseUrl}/quote?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 second timeout for quote requests
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.data?.error !== 'No routes found') {
                console.error('Error getting Jupiter quote:', error.response?.data || error.message || error);
            }
            return null;
        }
    }
    getSOLMint() {
        return 'So11111111111111111111111111111111111111112';
    }
    async isSwappableToken(tokenMint) {
        const SOL_MINT = this.getSOLMint();
        const WSOL_MINT = 'So11111111111111111111111111111111111111112'; // WSOL is the same as SOL_MINT
        // Don't swap if it's already SOL/WSOL
        if (tokenMint === SOL_MINT || tokenMint === WSOL_MINT) {
            return false;
        }
        // Try to get a quote to see if it's swappable
        try {
            const quote = await this.getQuote(tokenMint, SOL_MINT, 1000000); // Try with a small amount
            return quote !== null;
        }
        catch (error) {
            console.log(`Error checking if token ${tokenMint.slice(0, 8)}... is swappable: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}
exports.JupiterClient = JupiterClient;
//# sourceMappingURL=jupiter-client.js.map