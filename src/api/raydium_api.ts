import axios from 'axios';

export class RaydiumAPI {
    private baseUrl: string;

    constructor() {
        this.baseUrl = 'https://api.raydium.io/v2/main';
    }

    async getTokenPrice(mintAddress: string): Promise<number | undefined> {
        try {
            const response = await axios.get(`${this.baseUrl}/price`);
            const prices = response.data as { [key: string]: number };
            const price = prices[mintAddress];
            if (price !== undefined) {
                console.log(`  Precio de ${mintAddress} en Raydium: ${price}`);
                return price;
            } else {
                console.log(`  Token ${mintAddress} no encontrado en la API de precios de Raydium.`);
                return undefined;
            }
        } catch (error) {
            console.error(`Error obteniendo precio de token ${mintAddress} de Raydium API:`, error);
            return undefined;
        }
    }

    async isSwappableToken(mintAddress: string): Promise<boolean> {
        // If a token has a price on Raydium, it's generally considered swappable.
        const price = await this.getTokenPrice(mintAddress);
        return price !== undefined && price > 0;
    }
}


