import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

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

export class JupiterClient {
  private connection: Connection;
  private baseUrl: string;

  constructor(connection: Connection) {
    this.connection = connection;
    this.baseUrl = 'https://quote-api.jup.ag/v6';
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 10
  ): Promise<JupiterQuote | null> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const response = await axios.get(`${this.baseUrl}/quote?${params.toString()}`, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout for quote requests
      });

      return response.data as JupiterQuote;
    } catch (error: any) {
      if (error.response?.data?.error !== 'No routes found') {
        console.error('Error getting Jupiter quote:', error.response?.data || error.message || error);
      }
      return null;
    }
  }

  getSOLMint(): string {
    return 'So11111111111111111111111111111111111111112';
  }

  async isSwappableToken(tokenMint: string): Promise<boolean> {
    const SOL_MINT = this.getSOLMint();
    const WSOL_MINT = 'So11111111111111111111111111111111111111112'; // WSOL is the same as SOL_MINT

    // Don't swap if it's already SOL/WSOL
    if (tokenMint === SOL_MINT || tokenMint === WSOL_MINT) {
      return false;
    }

    // Try to get a quote to see if it's swappable
    try {
      const quote = await this.getQuote(tokenMint, SOL_MINT, 1000000); // Try with a small amount
      return quote !== null;
    } catch (error) {
      console.log(`Error checking if token ${tokenMint.slice(0, 8)}... is swappable: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}

