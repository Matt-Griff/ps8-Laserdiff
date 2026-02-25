import { CONFIG } from "../config.js";
import { getMyJWT } from "../controllers/user-controller.js";


const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
const socket = io(gatewayUrl);

socket.emit("is_game_active", { clientJWT: getMyJWT() });

socket.on("game_active_status", (payload) => {
    console.log("Received game active status:", payload);
    if (payload.isActive) {
        window.location.href = "/game";
    }
});