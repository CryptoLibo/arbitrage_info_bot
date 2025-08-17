import axios from 'axios';

interface SolanaTrackerTokenInfo {
    market_cap_usd?: number;
    liquidity_usd?: number;
    // Otros campos que puedan ser relevantes
}

export class SolanaTrackerAPI {
    private baseUrl = 'https://data.solanatracker.io';

    async getTokenLiquidity(tokenAddress: string): Promise<number | undefined> {
        try {
            const response = await axios.get<SolanaTrackerTokenInfo>(`${this.baseUrl}/tokens/${tokenAddress}`);
            console.log(`Raw Solana Tracker API response for ${tokenAddress}:`, JSON.stringify(response.data, null, 2)); // Log para depuración
            if (response.data) {
                // Priorizar liquidity_usd si está disponible, de lo contrario usar market_cap_usd
                if (response.data.liquidity_usd !== undefined) {
                    return response.data.liquidity_usd;
                } else if (response.data.market_cap_usd !== undefined) {
                    return response.data.market_cap_usd;
                }
            }
            return undefined;
        } catch (error: any) {
            console.error(`Error al obtener liquidez del token ${tokenAddress} de Solana Tracker:`, error.message);
            return undefined;
        }
    }
}


