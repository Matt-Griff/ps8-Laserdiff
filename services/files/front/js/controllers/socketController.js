import { SocketCommunication } from "../socket/communication.js";
import { UIManager } from "./ui-manager.js";
import { CONFIG } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
    const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
    const socket = io(gatewayUrl);
    const uiManager = new UIManager();
    const socketComm = new SocketCommunication(uiManager, socket);

    let gameMode = "local";
    // 1. Initialize the UI View  
    if (document.URL.includes("mode=ai-vs-player")) {
        gameMode = "ai";
    }
    socketComm.bind(gameMode);
});