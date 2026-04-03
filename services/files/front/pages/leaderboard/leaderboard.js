import { CONFIG } from "../../js/config.js";
const LEAGUESICONSURL = "https://raw.communitydragon.org/16.2/plugins/rcp-fe-lol-static-assets/global/default/ranked-emblem/emblem-";
document.addEventListener("DOMContentLoaded", function() {

    fetch(`${CONFIG.GATEWAY_URL}/api/leaderboard`)
        .then(response => response.json())
        .then(data => {
            const leaderboardContainer = document.getElementById("players-list");
            let i = 1;
            for(let x = 0; x < 16; ++x) {
                
            }
            data.forEach(element => {
                const playerCard = document.createElement("leaderboard-player-card");
                playerCard.setAttribute("rank", i);
                playerCard.setAttribute("name", element.username);
                playerCard.setAttribute("elo", element.elo);
                playerCard.setAttribute("pp", element.pp)
                playerCard.setAttribute("league", `${LEAGUESICONSURL}${element.league.toLowerCase()}.png`);
                playerCard.setAttribute("leagueName", element.league);
                if (i === 1) {
                    playerCard.setAttribute("data-first", "true");
                    playerCard.classList.add("first-place");
                }
                leaderboardContainer.appendChild(playerCard);
                playerCard.addEventListener("click", () => {
                    window.location.href = `../profile/profile.html?user=${element.username}`;
                });
                i++;
            });
        });
});
