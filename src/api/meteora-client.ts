import { Connection, PublicKey } from '@solana/web3.js';
import { CpAmm, getUnClaimReward, GetQuoteParams } from '@meteora-ag/cp-amm-sdk';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { JupiterClient } from './jupiter-client'; // Import JupiterClient

export interface PoolInfo {
    publicKey: PublicKey;
    tokenAMint: PublicKey;
    tokenBMint: PublicKey;
    account: any;
}

export class MeteoraClient {
    private connection: Connection;
    private cpAmm: CpAmm;
    private jupiterClient: JupiterClient; // Add JupiterClient

    constructor(connection: Connection) {
        this.connection = connection;
        this.cpAmm = new CpAmm(connection);
        this.jupiterClient = new JupiterClient(connection); // Initialize JupiterClient
    }

    async getPoolInfo(poolAddress: PublicKey): Promise<PoolInfo | null> {
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
        } catch (error) {
            console.error('Error fetching pool info from blockchain:', error);
            return null;
        }
    }

    async getCurrentFeeRate(poolState: any): Promise<number> {
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
                } else {
                    const currentSlot = await this.connection.getSlot();
                    const elapsedSlots = currentSlot - activationPoint;
                    elapsedPeriods = periodFrequency > 0 ? Math.floor(elapsedSlots / periodFrequency) : 0;
                }
                
                const effectivePeriods = Math.min(elapsedPeriods, numberOfPeriod);
                
                let currentFeeNumerator = cliffFeeNumerator;
                if (feeSchedulerMode === 0) { // Linear
                    currentFeeNumerator = Math.max(0, cliffFeeNumerator - (effectivePeriods * reductionFactor));
                } else if (feeSchedulerMode === 1) { // Exponential
                    const reductionRate = reductionFactor / 10000;
                    currentFeeNumerator = currentFeeNumerator * Math.pow(1 - reductionRate, effectivePeriods);
                } else {
                    console.log(`   ⚠️ Unknown fee scheduler mode: ${feeSchedulerMode}, using cliff fee rate`);
                    currentFeeNumerator = cliffFeeNumerator;
                }
                
                const FEE_DENOMINATOR = 1000000000;
                const feePercentage = (currentFeeNumerator / FEE_DENOMINATOR) * 100;
                
                return Math.max(0, feePercentage);
            } else {
                return 25;
            }
            
        } catch (error) {
            console.log(`   ⚠️ Could not calculate current fee rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return 25; 
        }
    }

    async getQuote(poolState: any, tokenInMint: PublicKey, amountIn: BN): Promise<{ swapInAmount: BN; consumedInAmount: BN; swapOutAmount: BN; minSwapOutAmount: BN; totalFee: BN; priceImpact: any; } | null> {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const currentSlot = await this.connection.getSlot();

            const tokenADecimal = await this.jupiterClient.getTokenDecimals(poolState.tokenAMint.toBase58());
            const tokenBDecimal = await this.jupiterClient.getTokenDecimals(poolState.tokenBMint.toBase58());

            if (tokenADecimal === undefined || tokenBDecimal === undefined) {
                console.error('Could not get token decimals for Meteora quote.');
                return null;
            }

            const quote = await this.cpAmm.getQuote({
                inAmount: amountIn,
                inputTokenMint: tokenInMint,
                slippage: 10, // 0.1% slippage
                poolState: poolState.account,
                currentTime: currentTime,
                currentSlot: currentSlot,
                tokenADecimal: tokenADecimal,
                tokenBDecimal: tokenBDecimal
            } as GetQuoteParams);
            return quote;
        } catch (error) {
            console.error('Error getting Meteora quote:', error);
            return null;
        }
    }
}


