import http from "http";
import { Server } from "socket.io";
import { createEventHandler } from "./socket/eventHandler.js";

const server = http.createServer();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Shared state
const clients = new Map();    // Client ID → Client Info
const games = new Map();       // Game ID → GameManager
const clientsQueue = [];       // Queue for online matchmaking
const deconnectedClients = new Map(); // Set of recently disconnected client ID with timestamp when cleanup should occur

const { onClientConnected, onClientDisconnect, onIsGameActive, handleGameEvent } = createEventHandler({ clients, games, clientsQueue, deconnectedClients });

io.on("connection", (gatewaySocket) => {
    console.log("GMS : Gateway connected:", gatewaySocket.id);

    gatewaySocket.onAny((eventName, payload) => {
        if (eventName === "client_disconnect") {
            onClientDisconnect(payload);
            return;
        }

        if (eventName === "client_connected") {
            onClientConnected(payload, gatewaySocket);
            return;
        }

        if(eventName === "is_game_active") {
            onIsGameActive(payload, gatewaySocket);
            return;
        }

        const { clientId, data } = payload;
        handleGameEvent(eventName, clientId, data);
    });

    gatewaySocket.on("disconnect", () => {
        console.log("GMS : Gateway disconnected:", gatewaySocket.id);
        clients.clear();
        games.clear();
        clientsQueue.length = 0;
    });
});

server.listen(8002, () => {
    console.log("GMS : Game server listening on port 8002");
});