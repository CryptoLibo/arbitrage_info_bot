import { Connection, PublicKey } from '@solana/web3.js';
export interface PoolInfo {
    publicKey: PublicKey;
    tokenAMint: PublicKey;
    tokenBMint: PublicKey;
    account: any;
}
export declare class MeteoraClient {
    private connection;
    private cpAmm;
    constructor(connection: Connection);
    getPoolInfo(poolAddress: PublicKey): Promise<PoolInfo | null>;
    getCurrentFeeRate(poolState: any): Promise<number>;
}
//# sourceMappingURL=meteora-client.d.ts.map