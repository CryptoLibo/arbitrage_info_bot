import { Connection } from '@solana/web3.js';
export interface ArbitrageOpportunity {
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    feeRate: number;
    jupiterSwapPossible: boolean;
}
export declare class ArbitrageFinder {
    private connection;
    private rocketscanAPI;
    private meteoraClient;
    private jupiterClient;
    constructor(connection: Connection);
    findArbitrageOpportunities(timeframeHours?: number): Promise<ArbitrageOpportunity[]>;
}
//# sourceMappingURL=arbitrage_finder.d.ts.map