import { CONFIG } from "../config.js";
import { getMyJWT, getMyUsername } from "../controllers/user-controller.js";

document.addEventListener("DOMContentLoaded", () => {
    const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
    const socket = io(gatewayUrl);
    const notificationElement = document.getElementById("notification-duel");

    socket.emit("waiting_for_duel", { clientJWT: getMyJWT() });

    socket.on("duel_requested", (payload) => {
        if (!payload) return;
        if (notificationElement) {
            notificationElement.displayDuelRequest(payload.requesterClientId, payload.senderName, 10, socket, getMyUsername());
        }
    });

    socket.onAny((event, payload) => {
        console.log(`SOCKET-DUEL : Received event "${event}" with payload:`, payload);
    });

    function sendDuelRequest(targetId, senderName) {
        console.log("SOCKET-DUEL : Sending duel request to", targetId);
        socket.emit("duel_request", { targetId, senderName, clientJWT: getMyJWT() });
    }

    socket.on("duel_result", (payload) => {
        if (!payload) return;
        const { id, username, accept } = payload;
        if (notificationElement) {
            notificationElement.displayDuelResult(id, username, accept);
        }
    });

    const sendButton = document.getElementById("send-duel");
    if (sendButton) {
        sendButton.addEventListener("click", () => {
            const targetId = document.getElementsByClassName("username")[0].id; // Assuming the username is stored in the id attribute
            const senderName = getMyUsername();
            sendDuelRequest(targetId, senderName);
        });
    }
});