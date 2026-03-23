import { CONFIG } from "../config.js";
import { getMyJWT } from "../controllers/user-controller.js";

document.addEventListener("DOMContentLoaded", () => {
    const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
    const socket = io(gatewayUrl);

    socket.emit("waiting_for_duel", { clientJWT: getMyJWT() });

    socket.on("duel_requested", (payload) => {
        if (!payload) return;
        console.log("SOCKET-DUEL : Received duel request:", payload);
    });

    socket.onAny((event, payload) => {
        console.log(`SOCKET-DUEL : Received event "${event}" with payload:`, payload);
    });

    function sendDuelRequest(targetUsername) {
        socket.emit("duel_request", { targetUsername, clientJWT: getMyJWT() });
    }

    function respondToDuelRequest(requesterClientId, accept) {
        socket.emit("duel_response", { requesterClientId, accept, clientJWT: getMyJWT() });
    }
});