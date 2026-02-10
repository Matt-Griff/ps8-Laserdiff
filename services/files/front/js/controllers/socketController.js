import { SocketCommunication } from "../socket/communication.js";
import { UIManager } from "./ui-manager.js";

document.addEventListener("DOMContentLoaded", () => {
    const socket = io("http://localhost:8000");
    const uiManager = new UIManager();
    const socketComm = new SocketCommunication(uiManager, socket);

    let gameMode = "local";
    // 1. Initialize the UI View  
    if (document.URL.includes("mode=ai-vs-player")) {
        gameMode = "ai";
    }
    socketComm.bind(gameMode);
});