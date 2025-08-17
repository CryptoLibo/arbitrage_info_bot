document.addEventListener("DOMContentLoaded", function() {
    const opportunitiesTableBody = document.querySelector("#opportunities-table tbody");
    const noOpportunitiesMessage = document.getElementById("no-opportunities");
    const botStatus = document.getElementById("bot-status");

    async function fetchOpportunities() {
        try {
            botStatus.textContent = "Actualizando...";
            const response = await fetch("/opportunities");
            const opportunities = await response.json();

            opportunitiesTableBody.innerHTML = ""; // Clear existing rows

            if (opportunities.length === 0) {
                noOpportunitiesMessage.style.display = "block";
            } else {
                noOpportunitiesMessage.style.display = "none";
                opportunities.forEach(opportunity => {
                    const row = opportunitiesTableBody.insertRow();

                    row.insertCell().textContent = opportunity.pair;
                    row.insertCell().textContent = opportunity.direction;
                    row.insertCell().textContent = opportunity.capital;
                    
                    const netProfitCell = row.insertCell();
                    netProfitCell.textContent = opportunity.net_profit_display; // Usar el campo formateado
                    netProfitCell.classList.add(opportunity.net_profit_lamports > 0 ? "profit-positive" : "profit-negative");

                    row.insertCell().textContent = `${opportunity.profit_percentage}%`;
                    row.insertCell().textContent = opportunity.buy_platform;
                    row.insertCell().textContent = opportunity.sell_platform;
                    // Placeholder for Meteora Liquidity - needs to be added to opportunity object
                    row.insertCell().textContent = "N/A"; 
                    row.insertCell().textContent = opportunity.timestamp_display; // Usar el campo formateado

                    const actionsCell = row.insertCell();
                    actionsCell.classList.add("action-buttons");
                    
                    const jupiterLink = document.createElement("a");
                    jupiterLink.href = opportunity.jupiter_link;
                    jupiterLink.target = "_blank";
                    jupiterLink.textContent = "Jupiter";
                    actionsCell.appendChild(jupiterLink);

                    const meteoraLink = document.createElement("a");
                    meteoraLink.href = opportunity.meteora_link;
                    meteoraLink.target = "_blank";
                    meteoraLink.textContent = "Meteora";
                    actionsCell.appendChild(meteoraLink);
                });
            }
            botStatus.textContent = "Activo";
        } catch (error) {
            console.error("Error fetching opportunities:", error);
            botStatus.textContent = "Error";
            noOpportunitiesMessage.style.display = "block";
        }
    }

    // Fetch opportunities every 5 seconds
    setInterval(fetchOpportunities, 5000);
    fetchOpportunities(); // Initial fetch
});


