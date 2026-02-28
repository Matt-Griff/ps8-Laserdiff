import { CONFIG } from "../config.js";
import { getMyJWT } from "../controllers/user-controller.js";

document.addEventListener("DOMContentLoaded", () => {
    const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
    const socket = io(gatewayUrl);

    socket.emit("is_game_active", { clientJWT: getMyJWT() });

    socket.on("game_active_status", (payload) => {
        if (!payload) return;
        if (payload.isActive) {
            console.log("Client is currently in an active game session");
            // Change Online Status to "In Game" 
            const profileIcon = document.querySelector("profile-icon");
            const statusElement = profileIcon?.shadowRoot?.getElementById("status");
            const statusRound = profileIcon?.shadowRoot?.querySelector(".status-icon");
            if (statusElement && statusRound) {
                const textNodes = [...statusElement.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
                if (textNodes.length > 0) {
                    textNodes[textNodes.length - 1].textContent = " In Game";
                }
                statusElement.style.color = "#00c8c8";
                statusRound.style.border = "2px solid #00c8c8";
            }

            // Show join game button           
            const joinGameBtn = document.getElementById("rejoin");
            const remainingMs = payload.remainingMs;
            if (remainingMs && remainingMs > 0 && joinGameBtn) {
                let remainingSeconds = Math.floor(remainingMs / 1000);
                joinGameBtn.style.display = "block";
                let btn = joinGameBtn.querySelector("button");
                const gameButtons = Array.from(document.querySelectorAll(".game-button")).slice(0, 3);
                gameButtons.forEach(btn => btn.style.display = "none");
                btn.textContent = `Rejoin Game (${remainingSeconds}s)`;
                const intervalId = setInterval(() => {
                    remainingSeconds--;
                    if (remainingSeconds > 0) {
                        btn.textContent = `Rejoin Game (${remainingSeconds}s)`;
                    } else {
                        joinGameBtn.style.display = "none";
                        gameButtons.forEach(btn => btn.style.display = "block");
                        clearInterval(intervalId);
                    }
                }, 1000);
            }
        }
    });
});