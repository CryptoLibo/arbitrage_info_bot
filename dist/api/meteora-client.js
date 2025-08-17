"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeteoraClient = void 0;
const cp_amm_sdk_1 = require("@meteora-ag/cp-amm-sdk");
class MeteoraClient {
    constructor(connection) {
        this.connection = connection;
        this.cpAmm = new cp_amm_sdk_1.CpAmm(connection);
    }
    async getPoolInfo(poolAddress) {
        try {
            console.log(`Intentando obtener pool info para: ${poolAddress.toBase58()}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Add a delay to avoid rate limits
            const poolState = await this.cpAmm.fetchPoolState(poolAddress);
            if (!poolState) {
                console.log(`  No se encontró poolState para ${poolAddress.toBase58()}`);
                return null;
            }
            console.log(`  PoolState encontrado para ${poolAddress.toBase58()}:`, poolState);
            return {
                publicKey: poolAddress,
                tokenAMint: poolState.tokenAMint,
                tokenBMint: poolState.tokenBMint,
                account: poolState
            };
        }
        catch (error) {
            console.error('Error fetching pool info from blockchain:', error);
            return null;
        }
    }
    async getCurrentFeeRate(poolState) {
        try {
            if (poolState.poolFees && poolState.poolFees.baseFee) {
                const baseFee = poolState.poolFees.baseFee;
                const cliffFeeNumerator = Number(baseFee.cliffFeeNumerator || 0);
                const numberOfPeriod = baseFee.numberOfPeriod || 0;
                const reductionFactor = Number(baseFee.reductionFactor || 0);
                const periodFrequency = Number(baseFee.periodFrequency || 1);
                const feeSchedulerMode = baseFee.feeSchedulerMode || 0;
                const activationPoint = Number(poolState.activationPoint || 0);
                let elapsedPeriods = 0;
                if (activationPoint > 1000000000) {
                    const currentTimestamp = Math.floor(Date.now() / 1000);
                    const elapsedTime = currentTimestamp - activationPoint;
                    elapsedPeriods = periodFrequency > 0 ? Math.floor(elapsedTime / periodFrequency) : 0;
                }
                else {
                    const currentSlot = await this.connection.getSlot();
                    const elapsedSlots = currentSlot - activationPoint;
                    elapsedPeriods = periodFrequency > 0 ? Math.floor(elapsedSlots / periodFrequency) : 0;
                }
                const effectivePeriods = Math.min(elapsedPeriods, numberOfPeriod);
                let currentFeeNumerator = cliffFeeNumerator;
                if (feeSchedulerMode === 0) { // Linear
                    currentFeeNumerator = Math.max(0, cliffFeeNumerator - (effectivePeriods * reductionFactor));
                }
                else if (feeSchedulerMode === 1) { // Exponential
                    const reductionRate = reductionFactor / 10000;
                    currentFeeNumerator = cliffFeeNumerator * Math.pow(1 - reductionRate, effectivePeriods);
                }
                else {
                    console.log(`   ⚠️ Unknown fee scheduler mode: ${feeSchedulerMode}, using cliff fee rate`);
                    currentFeeNumerator = cliffFeeNumerator;
                }
                const FEE_DENOMINATOR = 1000000000;
                const feePercentage = (currentFeeNumerator / FEE_DENOMINATOR) * 100;
                return Math.max(0, feePercentage);
            }
            else {
                return 25;
            }
        }
        catch (error) {
            console.log(`   ⚠️ Could not calculate current fee rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return 25;
        }
    }
}
exports.MeteoraClient = MeteoraClient;
