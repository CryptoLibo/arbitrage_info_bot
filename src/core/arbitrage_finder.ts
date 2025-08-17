import { Connection, PublicKey } from '@solana/web3.js';
import { MeteoraAPI, MeteoraPool } from '../api/meteora_api';
import { MeteoraClient, PoolInfo } from '../api/meteora-client';
import { JupiterClient } from '../api/jupiter-client';
import { RaydiumAPI } from '../api/raydium_api';
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
    private raydiumAPI: RaydiumAPI;
    // private solanaTrackerAPI: SolanaTrackerAPI; // Comentado temporalmente

    // Umbral de liquidez mínima para la pool de Meteora en USD
    private readonly MIN_METEORA_POOL_LIQUIDITY_USD = 100;
    // Umbral de fee máxima para la pool de Meteora en porcentaje
    private readonly MAX_METEORA_POOL_FEE_PERCENTAGE = 5; // 5% de fee máxima
    // Umbral de rentabilidad mínima en porcentaje
    private readonly MIN_PROFIT_PERCENTAGE = 0.1; // 0.1% de ganancia mínima
    // Cantidad inicial en USD para el cálculo de arbitraje
    private readonly INITIAL_ARBITRAGE_AMOUNT_USD = 10; // $10 USD iniciales

    constructor(connection: Connection) {
        this.connection = connection;
        this.meteoraAPI = new MeteoraAPI();
        this.meteoraClient = new MeteoraClient(connection);
        this.jupiterClient = new JupiterClient(connection);
        this.raydiumAPI = new RaydiumAPI();
        // this.solanaTrackerAPI = new SolanaTrackerAPI(); // Comentado temporalmente
    }

    async findArbitrageOpportunities(timeframeHours: number = 24): Promise<ArbitrageOpportunity[]> {
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

            const feeRate = await this.meteoraClient.getCurrentFeeRate(poolInfo.account);
            console.log(`  Fee Rate: ${feeRate.toFixed(2)}%`);

            // Nuevo filtro de fee máxima
            if (feeRate > this.MAX_METEORA_POOL_FEE_PERCENTAGE) {
                console.log(`  Pool ${meteoraPool.pool_address} descartada por fee excesiva en Meteora (${feeRate.toFixed(2)}%).`);
                continue;
            }

            // Check if tokens are swappable on Jupiter
            let tokenASwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenAMint.toBase58());
            if (!tokenASwappable) {
                console.log(`  Token A (${poolInfo.tokenAMint.toBase58()}) no swappable en Jupiter. Intentando con Raydium...`);
                tokenASwappable = await this.raydiumAPI.isSwappableToken(poolInfo.tokenAMint.toBase58());
            }
            console.log(`  Token A (${poolInfo.tokenAMint.toBase58()}) swappable en Jupiter/Raydium: ${tokenASwappable}`);

            let tokenBSwappable = await this.jupiterClient.isSwappableToken(poolInfo.tokenBMint.toBase58());
            if (!tokenBSwappable) {
                console.log(`  Token B (${poolInfo.tokenBMint.toBase58()}) no swappable en Jupiter. Intentando con Raydium...`);
                tokenBSwappable = await this.raydiumAPI.isSwappableToken(poolInfo.tokenBMint.toBase58());
            }
            console.log(`  Token B (${poolInfo.tokenBMint.toBase58()}) swappable en Jupiter/Raydium: ${tokenBSwappable}`);

            const jupiterSwapPossible = tokenASwappable && tokenBSwappable;

            let profitPercentage: number | undefined;
            let path: string | undefined;

            if (jupiterSwapPossible) {
                // Try arbitrage path: Token A -> Meteora -> Token B -> Jupiter -> Token A
                const result1 = await this.calculateArbitrage(poolInfo, feeRate, poolInfo.tokenAMint, poolInfo.tokenBMint);
                if (result1 && result1.profitPercentage > this.MIN_PROFIT_PERCENTAGE) {
                    profitPercentage = result1.profitPercentage;
                    path = `A->Meteora->B->Jupiter->A (Profit: ${profitPercentage.toFixed(4)}%)`;
                }

                // Try arbitrage path: Token B -> Meteora -> Token A -> Jupiter -> Token B
                const result2 = await this.calculateArbitrage(poolInfo, feeRate, poolInfo.tokenBMint, poolInfo.tokenAMint);
                if (result2 && result2.profitPercentage > this.MIN_PROFIT_PERCENTAGE) {
                    if (!profitPercentage || result2.profitPercentage > profitPercentage) {
                        profitPercentage = result2.profitPercentage;
                        path = `B->Meteora->A->Jupiter->B (Profit: ${profitPercentage.toFixed(4)}%)`;
                    }
                }

                if (profitPercentage !== undefined && profitPercentage > this.MIN_PROFIT_PERCENTAGE) {
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
            const tokenInMintAddress = tokenInMint.toBase58();
            const tokenOutMintAddress = tokenOutMint.toBase58();

            const tokenInDecimals = await this.jupiterClient.getTokenDecimals(tokenInMintAddress);
            const tokenOutDecimals = await this.jupiterClient.getTokenDecimals(tokenOutMintAddress);

            console.log(`    Decimals: Token In (${tokenInMintAddress}): ${tokenInDecimals}, Token Out (${tokenOutMintAddress}): ${tokenOutDecimals}`);

            if (tokenInDecimals === undefined || tokenOutDecimals === undefined) {
                console.log(`    No se pudieron obtener los decimales para ${tokenInMintAddress} o ${tokenOutMintAddress}.`);
                return undefined;
            }

            // Get price of tokenIn in USD from Raydium to calculate a realistic amountIn
            const tokenInPriceUSD = await this.raydiumAPI.getTokenPrice(tokenInMintAddress);
            console.log(`    Precio de ${tokenInMintAddress} en USD (Raydium): ${tokenInPriceUSD}`);

            if (tokenInPriceUSD === undefined || tokenInPriceUSD <= 0) {
                console.log(`    No se pudo obtener el precio en USD para ${tokenInMintAddress}.`);
                return undefined;
            }

            // Calculate amountIn based on INITIAL_ARBITRAGE_AMOUNT_USD
            const amountIn = new BN(Math.floor((this.INITIAL_ARBITRAGE_AMOUNT_USD / tokenInPriceUSD) * (10 ** tokenInDecimals)));
            console.log(`    AmountIn (raw) para Meteora: ${amountIn.toString()} (equivalente a $${this.INITIAL_ARBITRAGE_AMOUNT_USD} USD)`);
            
            if (amountIn.isZero()) {
                console.log(`    AmountIn calculado es cero para ${tokenInMintAddress}.`);
                return undefined;
            }

            // Step 1: Swap tokenIn for tokenOut on Meteora using Meteora SDK's getQuote
            const meteoraQuote = await this.meteoraClient.getQuote(
                poolInfo,
                tokenInMint,
                amountIn
            );

            if (!meteoraQuote) {
                console.log(`    No se encontró cotización de Meteora para ${tokenInMintAddress} a ${tokenOutMintAddress} con ${amountIn.toString()} unidades.`);
                return undefined;
            }

            const meteoraAmountOut = meteoraQuote.swapOutAmount;
            console.log(`    Meteora: ${amountIn.toString()} (raw) ${tokenInMintAddress.slice(0, 8)}... -> ${meteoraAmountOut.toString()} (raw) ${tokenOutMintAddress.slice(0, 8)}...`);

            // Step 2: Get Jupiter quote for selling meteoraAmountOut (tokenOut) to get tokenIn
            const jupiterQuote = await this.jupiterClient.getQuote(
                tokenOutMintAddress,
                tokenInMintAddress,
                meteoraAmountOut.toNumber() // Convert BN to number for Jupiter API
            );
            console.log(`    Jupiter Quote: ${JSON.stringify(jupiterQuote)}`);

            if (jupiterQuote && jupiterQuote.outAmount) {
                const finalAmount = parseFloat(jupiterQuote.outAmount.toString());
                const profit = finalAmount - amountIn.toNumber();
                const profitPercentage = (profit / amountIn.toNumber()) * 100;
                console.log(`    Jupiter: ${meteoraAmountOut.toString()} (raw) ${tokenOutMintAddress.slice(0, 8)}... -> ${jupiterQuote.outAmount} (raw) ${tokenInMintAddress.slice(0, 8)}...`);
                console.log(`    Profit (raw): ${profit}, Profit Percentage: ${profitPercentage.toFixed(4)}%`);
                return { profitPercentage, finalAmount };
            } else {
                console.log(`    No se encontró cotización de Jupiter para ${tokenOutMintAddress} a ${tokenInMintAddress} con ${meteoraAmountOut.toString()} unidades.`);
                return undefined;
            }

        } catch (error) {
            console.error("Error calculando arbitraje:", error);
            return undefined;
        }
    }
}


