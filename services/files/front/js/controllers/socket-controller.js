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
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");

    // 1. Initialize the UI view from query params.
    if (mode === "ai-vs-player") {
        gameMode = "ai";
    } else if (mode === "online") {
        gameMode = "online";
    } else if (mode === "duel") {
        opponentId = urlParams.get("opponentId");
        if (!opponentId) {
            console.error("Duel mode requires an opponentId in the URL");
            return;
        }
        gameMode = "duel";
    }

    console.log(`Initializing game in mode: ${gameMode} with opponentId: ${opponentId}`);

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