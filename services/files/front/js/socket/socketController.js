import { SocketCommunication } from "./communication.js";
import { UIManager } from "../game/controllers/ui-manager.js";

document.addEventListener("DOMContentLoaded", () => {
    const socket = io("http://localhost:8000");
    const uiManager = new UIManager();
    const socketComm = new SocketCommunication(uiManager, socket);
    socketComm.bind();
});