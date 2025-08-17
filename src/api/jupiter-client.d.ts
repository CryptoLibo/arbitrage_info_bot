import { Connection } from '@solana/web3.js';
export interface JupiterQuote {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: any;
    priceImpactPct: string;
    routePlan: any[];
}
export declare class JupiterClient {
    private connection;
    private baseUrl;
    constructor(connection: Connection);
    getQuote(inputMint: string, outputMint: string, amount: number, slippageBps?: number): Promise<JupiterQuote | null>;
    getSOLMint(): string;
    isSwappableToken(tokenMint: string): Promise<boolean>;
}
//# sourceMappingURL=jupiter-client.d.ts.map