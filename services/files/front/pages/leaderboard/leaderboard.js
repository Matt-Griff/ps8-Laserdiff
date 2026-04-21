import { CONFIG } from "../../js/config.js";
import { cropImageToContent } from "../../js/utils.js";
import { isloggedIn } from "../../js/auth/is-logged.js";
import { getRawCookie } from "../../js/auth/auth.js";

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
            await import("../../js/socket/socket.io.js");
            await Promise.all([
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
            const ownProfileContainer = document.getElementById("own-profile-container");
            const currentUsername = getRawCookie("username");
            let i = 1;
            data.forEach(element => {
                const playerCard = document.createElement("leaderboard-player-card");
                playerCard.setAttribute("rank", i);
                playerCard.setAttribute("name", element.username);
                playerCard.setAttribute("elo", element.elo || 0);
                if (element.pp !== undefined) {
                    playerCard.setAttribute("pp", element.pp);
                }
                playerCard.setAttribute("league", `${LEAGUESICONSURL}${(element.league || 'BRONZE').toLowerCase()}.png`);
                playerCard.setAttribute("leagueName", element.league || 'BRONZE');

                leaderboardContainer.appendChild(playerCard);
                playerCard.addEventListener("click", () => {
                    window.location.href = `../profile/profile.html?user=${element.username}`;
                });

                if (loggedIn && currentUsername === element.username) {
                    playerCard.setAttribute("data-me", "true");
                    playerCard.classList.add("is-me");
                    const ownCard = playerCard.cloneNode(true);
                    ownCard.addEventListener("click", () => {
                        window.location.href = `../profile/profile.html?user=${element.username}`;
                    });
                    ownProfileContainer.appendChild(ownCard);
                }
                i++;
            });
            
            if (loggedIn && currentUsername && ownProfileContainer.children.length === 0) {
                ownProfileContainer.style.display = 'none';
            } else if (!loggedIn || !currentUsername) {
                ownProfileContainer.style.display = 'none';
            }
        });

    fetch(`${CONFIG.GATEWAY_URL}/api/league-thresholds`)
        .then(response => response.json())
        .then(data => {
            const rankScaling = document.getElementById("rank-scaling");
            const sortedEntries = Object.entries(data).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            for (const [threshold, leagueName] of sortedEntries) {
                const leagueItem = document.createElement("div");
                leagueItem.classList.add("league-item");
                if (leagueName === "LR") {
                    continue;
                }
                rankScaling.appendChild(leagueItem);
                const croppedImage = new Image();
                croppedImage.crossOrigin = "anonymous";
                croppedImage.src = `${LEAGUESICONSURL}${leagueName.toLowerCase()}.png`;
                croppedImage.onload = () => {
                    const croppedDataUrl = cropImageToContent(croppedImage);
                    const imgElement = document.createElement("img");
                    imgElement.src = croppedDataUrl;
                    leagueItem.appendChild(imgElement);
                    const textNode = document.createTextNode(` ${leagueName} : ${threshold} ELO`);
                    leagueItem.appendChild(textNode);
                };
            }
        });

});
