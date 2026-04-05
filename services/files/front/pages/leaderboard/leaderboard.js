import { CONFIG } from "../../js/config.js";
import { isloggedIn } from "../../js/auth/is-logged.js";

const LEAGUESICONSURL = "https://raw.communitydragon.org/16.2/plugins/rcp-fe-lol-static-assets/global/default/ranked-emblem/emblem-";

document.addEventListener("DOMContentLoaded", async function () {
    const loggedIn = await isloggedIn();

    try {
        await Promise.all([
            import("../../components/leaderboard-player-card/leaderboard-player-card.js"),
            import("../../components/burger-menu/burger-menu.js"),
        ]);
    } catch (error) {
        console.error("Error loading leaderboard modules:", error);
    }

    const burgerMenu = document.querySelector("burger-menu");
    if (burgerMenu && typeof burgerMenu.setLoggedIn === "function") {
        burgerMenu.setLoggedIn(loggedIn);
    }

    if (loggedIn) {
        try {
            await Promise.all([
                import("../../js/socket/socket.io.js"),
                import("../../components/notification-duel/notification-duel.js"),
                import("../../js/socket/notification-duel-receiver.js"),
            ]);
        } catch (error) {
            console.error("Error loading duel notification modules:", error);
        }
    }
    fetch(`${CONFIG.GATEWAY_URL}/api/leaderboard`)
        .then(response => response.json())
        .then(data => {
            const leaderboardContainer = document.getElementById("players-list");
            let i = 1;
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