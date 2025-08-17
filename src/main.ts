import { Connection, PublicKey } from '@solana/web3.js';
import { ArbitrageFinder } from './core/arbitrage_finder';

async function main() {
    console.log("Bot de arbitraje informativo iniciado...");

    // Replace with your actual Solana RPC endpoint
    const connection = new Connection("https://api.mainnet-beta.solana.com"); 

    const arbitrageFinder = new ArbitrageFinder(connection);

    try {
        const opportunities = await arbitrageFinder.findArbitrageOpportunities(24); // Last 24 hours

        if (opportunities.length > 0) {
            console.log("\n--- Pools DAMM v2 encontradas ---");
            opportunities.forEach(opp => {
                console.log(`Pool: ${opp.poolAddress}`);
                console.log(`  Token A: ${opp.tokenA}`);
                console.log(`  Token B: ${opp.tokenB}`);
                console.log(`  Fee Rate: ${opp.feeRate.toFixed(2)}%`);
                console.log(`  Jupiter Swap Posible: ${opp.jupiterSwapPossible ? 'Sí' : 'No'}`);
                console.log("----------------------------------");
            });
        } else {
            console.log("No se encontraron pools DAMM v2 en el período especificado.");
        }
    } catch (error) {
        console.error("Error al buscar oportunidades de arbitraje:", error);
    }
}

main();

