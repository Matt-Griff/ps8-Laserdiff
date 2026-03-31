import { SocketCommunication } from "../socket/communication.js";
import { UIManager } from "./ui-manager.js";
import { CONFIG } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
    const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
    const socket = io(gatewayUrl);
    const uiManager = new UIManager();
    const socketComm = new SocketCommunication(uiManager, socket);

    let gameMode = "local";
    let opponentId = null;
    // 1. Initialize the UI View  
    if (document.URL.includes("mode=ai-vs-player")) {
        gameMode = "ai";
    } else if (document.URL.includes("mode=online")) {
        gameMode = "online";
    } else if (document.URL.includes("mode=duel")) {
        const urlParams = new URLSearchParams(window.location.search);
        opponentId = urlParams.get("opponentId");
        if (!opponentId) {
            console.error("Duel mode requires an opponentId in the URL");
            return;
        }
        gameMode = "duel";
    }

    const chat = document.querySelector('laser-chat');
    if (chat) {
        if (gameMode === "local") {
            chat.removeAttribute('show-in-game-tab');
        } else {
            chat.setAttribute('data-mode', gameMode);
        }
    }

    socketComm.bind(gameMode, opponentId);
});