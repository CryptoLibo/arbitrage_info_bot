"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitrageFinder = void 0;
const web3_js_1 = require("@solana/web3.js");
const meteora_api_1 = require("../api/meteora_api");
const meteora_client_1 = require("../api/meteora-client");
const jupiter_client_1 = require("../api/jupiter-client");
class ArbitrageFinder {
    constructor(connection) {
        this.connection = connection;
        this.meteoraAPI = new meteora_api_1.MeteoraAPI();
        this.meteoraClient = new meteora_client_1.MeteoraClient(connection);
        this.jupiterClient = new jupiter_client_1.JupiterClient(connection);
    }
    async findArbitrageOpportunities(timeframeHours = 0.5) {
        console.log(`Buscando pools DAMM v2 creadas en las últimas ${timeframeHours} horas...`);
        const recentMeteoraPools = await this.meteoraAPI.getPools(500); // Get a reasonable number of recent pools
        console.log(`Meteora API devolvió ${recentMeteoraPools.length} pools.`);
        const opportunities = [];
        const now = Date.now();
        for (const meteoraPool of recentMeteoraPools) {
            const createdAtTimestamp = meteoraPool.created_at_slot_timestamp * 1000; // Convert seconds to milliseconds
            if ((now - createdAtTimestamp) < 0 || (now - createdAtTimestamp) > (timeframeHours * 60 * 60 * 1000)) {
                continue; // Skip if older than timeframeHours
            }
            console.log(`Analizando pool de Meteora: ${meteoraPool.pool_address} (createdAt: ${new Date(createdAtTimestamp).toISOString()})`);
            const poolPublicKey = new web3_js_1.PublicKey(meteoraPool.pool_address);
            const poolInfo = await this.meteoraClient.getPoolInfo(poolPublicKey);
            if (!poolInfo) {
                console.log(`  No se pudo obtener información de la pool desde la blockchain para ${meteoraPool.pool_address}`);
                continue;
            }
            console.log(`  Información de la pool obtenida: Token A: ${poolInfo.tokenAMint.toBase58()}, Token B: ${poolInfo.tokenBMint.toBase58()}`);
            const feeRate = await this.meteoraClient.getCurrentFeeRate(poolInfo.account);
            console.log(`  Fee Rate: ${feeRate.toFixed(2)}%`);
            // Check if tokens are swappable on Jupiter
            const tokenASwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenAMint.toBase58());
            console.log(`  Token A (${poolInfo.tokenAMint.toBase58()}) swappable en Jupiter: ${tokenASwappable}`);
            const tokenBSwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenBMint.toBase58());
            console.log(`  Token B (${poolInfo.tokenBMint.toBase58()}) swappable en Jupiter: ${tokenBSwappable}`);
            const jupiterSwapPossible = tokenASwappable && tokenBSwappable;
            opportunities.push({
                poolAddress: meteoraPool.pool_address,
                tokenA: poolInfo.tokenAMint.toBase58(),
                tokenB: poolInfo.tokenBMint.toBase58(),
                feeRate: feeRate,
                jupiterSwapPossible: jupiterSwapPossible
            });
        }
        return opportunities;
    }
}
exports.ArbitrageFinder = ArbitrageFinder;
