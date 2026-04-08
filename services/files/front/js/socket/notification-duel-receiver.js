import { CONFIG } from "../config.js";
import { getMyJWT, getMyUsername } from "../controllers/user-controller.js";
import { changeStatus } from "../controllers/user-controller.js";

const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
const socket = io(gatewayUrl);

async function ensureNotificationComponentReady() {
    if (!customElements.get("notification-duel")) {
        try {
            await import("../../components/notification-duel/notification-duel.js");
        } catch (error) {
            console.error("SOCKET-DUEL : Could not load notification-duel component:", error);
        }
    }

    if (customElements.get("notification-duel")) {
        await customElements.whenDefined("notification-duel");
    }
}

function getNotificationElement() {
    return document.getElementById("notification-duel");
}

function callNotificationMethod(methodName, ...args) {
    const notificationElement = getNotificationElement();
    if (!notificationElement) {
        console.warn("SOCKET-DUEL : notification-duel element not found in the DOM.");
        return;
    }

    const method = notificationElement[methodName];
    if (typeof method !== "function") {
        console.warn(`SOCKET-DUEL : notification-duel.${methodName} is not available yet.`);
        return;
    }

    method.apply(notificationElement, args);
}

await ensureNotificationComponentReady();

socket.emit("waiting_for_duel", { clientJWT: getMyJWT() });
await changeStatus("online");

socket.on("duel_requested", (payload) => {
    if (!payload) return;
    callNotificationMethod(
        "displayDuelRequest",
        payload.requesterClientId,
        payload.senderName,
        payload.timeoutSeconds,
        socket,
        getMyUsername(),
        getMyJWT(),
        true
    );
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
    callNotificationMethod("displayDuelResult", id, username, accept);
});

socket.on("error", (error) => {
    callNotificationMethod("displayError", error);
});

const sendButton = document.getElementById("send-duel");
if (sendButton) {
    sendButton.addEventListener("click", () => {
        const targetId = document.getElementsByClassName("username")[0].id; // Assuming the username is stored in the id attribute
        const senderName = getMyUsername();
        sendDuelRequest(targetId, senderName);
    });
}