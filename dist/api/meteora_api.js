"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeteoraAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class MeteoraAPI {
    constructor() {
        this.baseUrl = 'https://dammv2-api.meteora.ag';
    }
    async getPools(limit = 100) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                order_by: 'created_at_slot_timestamp', // This parameter might not work as expected for sorting by creation time
                order: 'desc'
            });
            const response = await axios_1.default.get(`${this.baseUrl}/pools?${params.toString()}`);
            console.log("Raw Meteora API response data:", response.data);
            const pools = response.data.data;
            return Array.isArray(pools) ? pools : [];
        }
        catch (error) {
            console.error('Error fetching pools from Meteora API:', error);
            return [];
        }
    }
}
exports.MeteoraAPI = MeteoraAPI;
