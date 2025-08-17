import axios from 'axios';

export interface MeteoraPool {
    pool_address: string;
    token_a_mint: string;
    token_b_mint: string;
    created_at_slot_timestamp: number; // Unix timestamp
    tvl: number; // Total Value Locked en USD (liquidez de la pool)
    // Add other fields as needed
}

export class MeteoraAPI {
    private baseUrl: string = 'https://dammv2-api.meteora.ag';

    async getPools(limit: number = 100): Promise<MeteoraPool[]> {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                order_by: 'created_at_slot_timestamp', // This parameter might not work as expected for sorting by creation time
                order: 'desc'
            });
            const response = await axios.get(`${this.baseUrl}/pools?${params.toString()}`);
            // console.log("Raw Meteora API response data:", JSON.stringify(response.data, null, 2)); // Descomentar para depuración
            const pools = (response.data as any).data;
            return Array.isArray(pools) ? pools as MeteoraPool[] : [];
        } catch (error) {
            console.error('Error fetching pools from Meteora API:', error);
            return [];
        }
    }
}

