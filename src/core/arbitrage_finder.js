"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitrageFinder = void 0;
const web3_js_1 = require("@solana/web3.js");
const rocketscan_1 = require("../api/rocketscan");
const meteora_client_1 = require("../api/meteora-client");
const jupiter_client_1 = require("../api/jupiter-client");
class ArbitrageFinder {
    connection;
    rocketscanAPI;
    meteoraClient;
    jupiterClient;
    constructor(connection) {
        this.connection = connection;
        this.rocketscanAPI = new rocketscan_1.RocketscanAPI();
        this.meteoraClient = new meteora_client_1.MeteoraClient(connection);
        this.jupiterClient = new jupiter_client_1.JupiterClient(connection);
    }
    async findArbitrageOpportunities(timeframeHours = 0.5) {
        console.log(`Buscando pools DAMM v2 creadas en las últimas ${timeframeHours} horas...`);
        const recentRocketscanPools = await this.rocketscanAPI.getDammV2Pools(100); // Get a reasonable number of recent pools
        const opportunities = [];
        const now = Date.now();
        for (const rocketscanPool of recentRocketscanPools) {
            const createdAtTimestamp = new Date(rocketscanPool.createdAt).getTime();
            if ((now - createdAtTimestamp) / (1000 * 60 * 60) > timeframeHours) {
                continue; // Skip if older than timeframeHours
            }
            console.log(`Analizando pool de Rocketscan: ${rocketscanPool.poolAddress}`);
            const poolPublicKey = new web3_js_1.PublicKey(rocketscanPool.poolAddress);
            const poolInfo = await this.meteoraClient.getPoolInfo(poolPublicKey);
            if (poolInfo) {
                const feeRate = await this.meteoraClient.getCurrentFeeRate(poolInfo.account);
                // Check if tokens are swappable on Jupiter
                const tokenASwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenAMint.toBase58());
                const tokenBSwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenBMint.toBase58());
                const jupiterSwapPossible = tokenASwappable && tokenBSwappable;
                opportunities.push({
                    poolAddress: rocketscanPool.poolAddress,
                    tokenA: poolInfo.tokenAMint.toBase58(),
                    tokenB: poolInfo.tokenBMint.toBase58(),
                    feeRate: feeRate,
                    jupiterSwapPossible: jupiterSwapPossible
                });
            }
        }
        return opportunities;
    }
}
exports.ArbitrageFinder = ArbitrageFinder;
//# sourceMappingURL=arbitrage_finder.js.map