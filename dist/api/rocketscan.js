"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RocketscanAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class RocketscanAPI {
    constructor() {
        this.baseUrl = 'https://rocketscan.fun/api';
    }
    async getDammV2Pools(limit = 24, sortBy = 'createdAt', sortOrder = 'desc') {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: limit.toString(),
                sortBy: sortBy,
                sortOrder: sortOrder,
                _: Date.now().toString() // Cache-buster
            });
            const response = await axios_1.default.get(`${this.baseUrl}/dammv2-pools?${params.toString()}`, {
                headers: {
                    'accept': '*/*',
                    'accept-language': 'es-CO,es-ES;q=0.9,es;q=0.8',
                    'cache-control': 'no-cache, no-store, must-revalidate',
                    'expires': '0',
                    'pragma': 'no-cache',
                    'priority': 'u=1, i',
                    'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin'
                }
            });
            const pools = response.data.pools;
            return Array.isArray(pools) ? pools : [];
        }
        catch (error) {
            console.error('Error fetching DAMM v2 pools from Rocketscan:', error);
            return [];
        }
    }
}
exports.RocketscanAPI = RocketscanAPI;
