import { Connection, PublicKey } from '@solana/web3.js';
import { MeteoraAPI, MeteoraPool } from '../api/meteora_api';
import { MeteoraClient, PoolInfo } from '../api/meteora-client';
import { JupiterClient } from '../api/jupiter-client';
// import { SolanaTrackerAPI } from '../api/solana_tracker_api'; // Comentado temporalmente
import BN from 'bn.js';

export interface ArbitrageOpportunity {
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    feeRate: number;
    jupiterSwapPossible: boolean;
    profitPercentage?: number; // Optional field for profit percentage
    path?: string; // Optional field to describe the arbitrage path
}

export class ArbitrageFinder {
    private connection: Connection;
    private meteoraAPI: MeteoraAPI;
    private meteoraClient: MeteoraClient;
    private jupiterClient: JupiterClient;
    // private solanaTrackerAPI: SolanaTrackerAPI; // Comentado temporalmente

    // Umbral de liquidez mínima para la pool de Meteora en USD
    private readonly MIN_METEORA_POOL_LIQUIDITY_USD = 100;
    // Umbral de liquidez mínima general del token en USD
    // private readonly MIN_GENERAL_TOKEN_LIQUIDITY_USD = 1000; // Comentado temporalmente

    constructor(connection: Connection) {
        this.connection = connection;
        this.meteoraAPI = new MeteoraAPI();
        this.meteoraClient = new MeteoraClient(connection);
        this.jupiterClient = new JupiterClient(connection);
        // this.solanaTrackerAPI = new SolanaTrackerAPI(); // Comentado temporalmente
    }

    async findArbitrageOpportunities(timeframeHours: number = 0.5): Promise<ArbitrageOpportunity[]> {
        console.log(`Buscando pools DAMM v2 creadas en las últimas ${timeframeHours} horas y con liquidez > $${this.MIN_METEORA_POOL_LIQUIDITY_USD} USD...`);
        const allMeteoraPools = await this.meteoraAPI.getPools(500); // Get a reasonable number of recent pools
        console.log(`Meteora API devolvió ${allMeteoraPools.length} pools.`);

        const opportunities: ArbitrageOpportunity[] = [];
        const now = Date.now();

        for (const meteoraPool of allMeteoraPools) {
            const createdAtTimestamp = meteoraPool.created_at_slot_timestamp * 1000; // Convert seconds to milliseconds
            if ((now - createdAtTimestamp) < 0 || (now - createdAtTimestamp) > (timeframeHours * 60 * 60 * 1000)) {
                continue; // Skip if older than timeframeHours
            }

            // Nuevo filtro de liquidez de la pool de Meteora
            const poolLiquidity = meteoraPool.tvl || 0; // Usar tvl en lugar de liquidity_usd
            if (poolLiquidity < this.MIN_METEORA_POOL_LIQUIDITY_USD) {
                console.log(`  Pool ${meteoraPool.pool_address} descartada por baja liquidez en Meteora ($${poolLiquidity.toFixed(2)} USD).`);
                continue;
            }

            console.log(`Analizando pool de Meteora: ${meteoraPool.pool_address} (createdAt: ${new Date(createdAtTimestamp).toISOString()}, Liquidez: $${poolLiquidity.toFixed(2)} USD)`);
            const poolPublicKey = new PublicKey(meteoraPool.pool_address);
            const poolInfo = await this.meteoraClient.getPoolInfo(poolPublicKey);

            if (!poolInfo) {
                console.log(`  No se pudo obtener información de la pool desde la blockchain para ${meteoraPool.pool_address}`);
                continue;
            }
            console.log(`  Información de la pool obtenida: Token A: ${poolInfo.tokenAMint.toBase58()}, Token B: ${poolInfo.tokenBMint.toBase58()}`);

            // Nuevo filtro de liquidez general del token (desactivado temporalmente)
            // const tokenALiquidity = await this.solanaTrackerAPI.getTokenLiquidity(poolInfo.tokenAMint.toBase58());
            // const tokenBLiquidity = await this.solanaTrackerAPI.getTokenLiquidity(poolInfo.tokenBMint.toBase58());

            // if (tokenALiquidity === undefined || tokenBLiquidity === undefined || 
            //     tokenALiquidity < this.MIN_GENERAL_TOKEN_LIQUIDITY_USD || 
            //     tokenBLiquidity < this.MIN_GENERAL_TOKEN_LIQUIDITY_USD) {
            //     console.log(`  Pool ${meteoraPool.pool_address} descartada por baja liquidez general de token. Token A Liquidez: $${tokenALiquidity?.toFixed(2) || 'N/A'} USD, Token B Liquidez: $${tokenBLiquidity?.toFixed(2) || 'N/A'} USD.`);
            //     continue;
            // }
            // console.log(`  Liquidez general de tokens: Token A: $${tokenALiquidity.toFixed(2)} USD, Token B: $${tokenBLiquidity.toFixed(2)} USD.`);

            const feeRate = await this.meteoraClient.getCurrentFeeRate(poolInfo.account);
            console.log(`  Fee Rate: ${feeRate.toFixed(2)}%`);

            // Check if tokens are swappable on Jupiter
            const tokenASwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenAMint.toBase58());
            console.log(`  Token A (${poolInfo.tokenAMint.toBase58()}) swappable en Jupiter: ${tokenASwappable}`);
            const tokenBSwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenBMint.toBase58());
            console.log(`  Token B (${poolInfo.tokenBMint.toBase58()}) swappable en Jupiter: ${tokenBSwappable}`);

            const jupiterSwapPossible = tokenASwappable && tokenBSwappable;

            let profitPercentage: number | undefined;
            let path: string | undefined;

            if (jupiterSwapPossible) {
                // Try arbitrage path: Token A -> Meteora -> Token B -> Jupiter -> Token A
                const result1 = await this.calculateArbitrage(poolInfo, feeRate, poolInfo.tokenAMint, poolInfo.tokenBMint);
                if (result1 && result1.profitPercentage > 0) {
                    profitPercentage = result1.profitPercentage;
                    path = `A->Meteora->B->Jupiter->A (Profit: ${profitPercentage.toFixed(4)}%)`;
                }

                // Try arbitrage path: Token B -> Meteora -> Token A -> Jupiter -> Token B
                const result2 = await this.calculateArbitrage(poolInfo, feeRate, poolInfo.tokenBMint, poolInfo.tokenAMint);
                if (result2 && result2.profitPercentage > 0) {
                    if (!profitPercentage || result2.profitPercentage > profitPercentage) {
                        profitPercentage = result2.profitPercentage;
                        path = `B->Meteora->A->Jupiter->B (Profit: ${profitPercentage.toFixed(4)}%)`;
                    }
                }

                if (profitPercentage !== undefined && profitPercentage > 0) {
                    console.log(`  Potencial de Arbitraje: ${path}`);
                } else {
                    console.log(`  No se encontró oportunidad de arbitraje rentable.`);
                }
            }

            opportunities.push({
                poolAddress: meteoraPool.pool_address,
                tokenA: poolInfo.tokenAMint.toBase58(),
                tokenB: poolInfo.tokenBMint.toBase58(),
                feeRate: feeRate,
                jupiterSwapPossible: jupiterSwapPossible,
                profitPercentage: profitPercentage,
                path: path
            });
        }
        return opportunities;
    }

    private async calculateArbitrage(poolInfo: PoolInfo, meteoraFeeRate: number, tokenInMint: PublicKey, tokenOutMint: PublicKey): Promise<{ profitPercentage: number, finalAmount: number } | undefined> {
        try {
            const tokenInDecimals = await this.jupiterClient.getTokenDecimals(tokenInMint.toBase58());
            const tokenOutDecimals = await this.jupiterClient.getTokenDecimals(tokenOutMint.toBase58());

            if (tokenInDecimals === undefined || tokenOutDecimals === undefined) {
                console.log(`    No se pudieron obtener los decimales para ${tokenInMint.toBase58()} o ${tokenOutMint.toBase58()}.`);
                return undefined;
            }

            // Start with a realistic amount, e.g., 1 unit of tokenIn
            const amountIn = new BN(1 * (10 ** tokenInDecimals)); 

            // Step 1: Swap tokenIn for tokenOut on Meteora using Meteora SDK\\\'s getQuote
            const meteoraQuote = await this.meteoraClient.getQuote(
                poolInfo,
                tokenInMint,
                amountIn
            );

            if (!meteoraQuote) {
                console.log(`    No se encontró cotización de Meteora para ${tokenInMint.toBase58()} a ${tokenOutMint.toBase58()} con ${amountIn.toString()} unidades.`);
                return undefined;
            }

            const meteoraAmountOut = meteoraQuote.swapOutAmount;
            console.log(`    Meteora: ${amountIn.toString()} (raw) ${tokenInMint.toBase58().slice(0, 8)}... -> ${meteoraAmountOut.toString()} (raw) ${tokenOutMint.toBase58().slice(0, 8)}...`);

            // Step 2: Get Jupiter quote for selling meteoraAmountOut (tokenOut) to get tokenIn
            const jupiterQuote = await this.jupiterClient.getQuote(
                tokenOutMint.toBase58(),
                tokenInMint.toBase58(),
                meteoraAmountOut.toNumber() // Convert BN to number for Jupiter API
            );

            if (jupiterQuote && jupiterQuote.outAmount) {
                const finalAmount = parseFloat(jupiterQuote.outAmount.toString());
                const profit = finalAmount - amountIn.toNumber();
                const profitPercentage = (profit / amountIn.toNumber()) * 100;
                console.log(`    Jupiter: ${meteoraAmountOut.toString()} (raw) ${tokenOutMint.toBase58().slice(0, 8)}... -> ${jupiterQuote.outAmount} (raw) ${tokenInMint.toBase58().slice(0, 8)}...`);
                return { profitPercentage, finalAmount };
            } else {
                console.log(`    No se encontró cotización de Jupiter para ${tokenOutMint.toBase58()} a ${tokenInMint.toBase58()} con ${meteoraAmountOut.toString()} unidades.`);
                return undefined;
            }

        } catch (error) {
            console.error("Error calculando arbitraje:", error);
            return undefined;
        }
    }
}


