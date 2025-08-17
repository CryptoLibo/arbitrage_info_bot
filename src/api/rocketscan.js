"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RocketscanAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class RocketscanAPI {
    baseUrl = 'https://rocketscan.fun/api';
    async getDammV2Pools(limit = 24, sortBy = 'createdAt', sortOrder = 'desc') {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: limit.toString(),
                sortBy: sortBy,
                sortOrder: sortOrder,
                _: Date.now().toString() // Cache-buster
            });
            const response = await axios_1.default.get(`${this.baseUrl}/dammv2-pools?${params.toString()}`);
            return response.data.pools;
        }
        catch (error) {
            console.error('Error fetching DAMM v2 pools from Rocketscan:', error);
            return [];
        }
    }
}
exports.RocketscanAPI = RocketscanAPI;
//# sourceMappingURL=rocketscan.js.map