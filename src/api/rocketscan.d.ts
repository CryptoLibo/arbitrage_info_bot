export interface RocketscanPool {
    id: string;
    poolAddress: string;
    tokenAMint: string;
    tokenBMint: string;
    createdAt: string;
}
export declare class RocketscanAPI {
    private baseUrl;
    getDammV2Pools(limit?: number, sortBy?: string, sortOrder?: 'desc' | 'asc'): Promise<RocketscanPool[]>;
}
//# sourceMappingURL=rocketscan.d.ts.map