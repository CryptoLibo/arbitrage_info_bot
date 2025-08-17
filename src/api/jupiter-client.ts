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
  private tokens: any[] = [];

  constructor(connection: Connection) {
    this.connection = connection;
    this.baseUrl = 'https://quote-api.jup.ag/v6';
    this.loadTokens();
  }

  private async loadTokens() {
    try {
      // Updated endpoint for Jupiter tokens
      const response = await axios.get('https://tokens.jup.ag/tokens');
      this.tokens = response.data as any[];
      console.log(`Cargados ${this.tokens.length} tokens de Jupiter.`);
    } catch (error) {
      console.error('Error loading tokens from Jupiter API:', error);
    }
  }

  async getTokenDecimals(mintAddress: string): Promise<number | undefined> {
    if (this.tokens.length === 0) {
      await this.loadTokens(); // Ensure tokens are loaded
    }
    const token = this.tokens.find(t => t.address === mintAddress);
    if (!token) {
        console.log(`    Token ${mintAddress} no encontrado en la lista de tokens de Jupiter.`);
    }
    return token ? token.decimals : undefined;
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 10
  ): Promise<JupiterQuote | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add a 1-second delay
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      console.log(`  Solicitando cotización de Jupiter: ${inputMint} -> ${outputMint} con ${amount} unidades. URL: ${this.baseUrl}/quote?${params.toString()}`);
      const response = await axios.get(`${this.baseUrl}/quote?${params.toString()}`, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout for quote requests
      });
      console.log(`  Respuesta de Jupiter para ${inputMint} -> ${outputMint}:`, JSON.stringify(response.data, null, 2));

      return response.data as JupiterQuote;
    } catch (error: any) {
      if (error.response?.data?.error !== 'No routes found') {
        console.error('Error getting Jupiter quote:', error.response ? error.response.data : error.message);
      }
      console.log(`  No se encontró cotización para ${inputMint} -> ${outputMint}. Error: ${error.response?.data?.error || error.message}`);
      return null;
    }
  }

  getSOLMint(): string {
    return 'So11111111111111111111111111111111111111112';
  }

  getUSDCMint(): string {
    return 'EPjFWdd5AufqSSqeM2qN1xzybapTVG4itwqZNfFVdvfM'; // USDC mint address
  }

  async isSwappableToken(tokenMint: string): Promise<boolean> {
    const SOL_MINT = this.getSOLMint();
    const USDC_MINT = this.getUSDCMint();

    // Don't swap if it's already SOL/WSOL or USDC
    if (tokenMint === SOL_MINT || tokenMint === USDC_MINT) {
      console.log(`  Token ${tokenMint} es SOL/WSOL o USDC, no se considera swappable para arbitraje.`);
      return false;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Add a 0.5-second delay
      console.log(`  Verificando si el token ${tokenMint} es swappable en Jupiter.`);

      const tokenDecimals = await this.getTokenDecimals(tokenMint);
      if (tokenDecimals === undefined) {
        console.log(`    No se pudieron obtener los decimales para el token ${tokenMint}.`);
        return false;
      }

      // Use a fixed amount for checking swappability, e.g., 1 unit of the token
      const amountToCheck = 1 * (10 ** tokenDecimals); 
      
      // Try swapping to SOL
      console.log(`    Intentando obtener cotización de ${tokenMint} a SOL con ${amountToCheck} unidades.`);
      let quote = await this.getQuote(tokenMint, SOL_MINT, amountToCheck); 
      if (quote) {
        console.log(`    Token ${tokenMint} es swappable a SOL en Jupiter. Quote: ${JSON.stringify(quote)}`);
        return true;
      }

      // If not swappable to SOL, try swapping to USDC
      console.log(`    Intentando obtener cotización de ${tokenMint} a USDC con ${amountToCheck} unidades.`);
      quote = await this.getQuote(tokenMint, USDC_MINT, amountToCheck); 
      if (quote) {
        console.log(`    Token ${tokenMint} es swappable a USDC en Jupiter. Quote: ${JSON.stringify(quote)}`);
        return true;
      }

      console.log(`    Token ${tokenMint} NO es swappable en Jupiter. No se encontró cotización a SOL ni a USDC.`);
      return false;
    } catch (error) {
      console.error(`Error verificando si el token ${tokenMint.slice(0, 8)}... es swappable:`, error);
      return false;
    }
  }
}


