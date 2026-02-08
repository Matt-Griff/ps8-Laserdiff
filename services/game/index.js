import GameManager from "./game/game-manager.js";
import http from "http";
import { Server } from "socket.io";

const server = http.createServer();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Map to track client sessions
const clients = new Map(); // Client ID to Client Info Mapping

io.on("connection", (gatewaySocket) => {
    console.log("Gateway connected:", gatewaySocket.id);

    gatewaySocket.onAny((eventName, payload) => {
        // Handle client disconnect
        if (eventName === "client_disconnect") {
            console.log("Client ${payload.clientId} disconnected");
            clients.delete(payload.clientId);
            return;
        }

        // Handle client connection
        if (eventName === "client_connected") {
            const { clientId } = payload;
            console.log("New client connected: " + clientId);

            clients.set(clientId, { gatewaySocketId: gatewaySocket.id });

            // Send welcome message to new client
            console.log("Sending welcome to client " + clientId);
            gatewaySocket.emit("welcome", {
                clientId: clientId,
                data: "Welcome from the game service!"
            });
            return;
        }

        const { clientId, data } = payload;

        // Handle different game events
        handleGameEvent(eventName, clientId, data, gatewaySocket);
    });

    gatewaySocket.on("disconnect", () => {
        console.log("GMS : Gateway disconnected:", gatewaySocket.id);
        // Gateway disconnected, clear all clients
        clients.clear();
    });
});

function handleGameEvent(eventName, clientId, data, gatewaySocket) {
    switch (eventName) {
        case "game_mode":
            const mode = Array.isArray(data) ? data[0]?.mode : data?.mode;
            console.log(`GMS : Client ${clientId} selected game mode: ${mode}`);

            const client = clients.get(clientId);
            if (!client) {
                console.error(`GMS : Client ${clientId} not found`);
                break;
            }

            if (mode === "local") {
                client.game = new GameManager("local", gatewaySocket, [clientId]);
                client.game.startGame();
            } else if (mode === "ai") {
                client.game = new GameManager("ai", gatewaySocket, [clientId]);
                client.game.startGame();
            }
            break;
        case "cell_click":
            const cell = Array.isArray(data) ? data[0] : data;
            console.log(`GMS : Client ${clientId} clicked cell at row ${cell?.row}, col ${cell?.col}`);
            clients.get(clientId)?.game?.gameLogic.handleCellClick(cell.row, cell.col);
            break;
        case "reserve_click":
            const playerId = Array.isArray(data) ? data[0]?.playerId : data?.playerId;
            console.log(`GMS : Client ${clientId} clicked reserve for player ${playerId}`);
            clients.get(clientId)?.game?.gameLogic.handleReserveClick(playerId);
            break;
        case "rotate":
            const direction = Array.isArray(data) ? data[0]?.direction : data?.direction;
            console.log(`GMS : Client ${clientId} requested rotation: ${direction}`);
            clients.get(clientId)?.game?.gameLogic.handleRotation(direction);
            break;
        case "swap":
            console.log(`GMS : Client ${clientId} requested swap`);
            clients.get(clientId)?.game?.gameLogic.handleSwap();
            break;
        case "pyramid_sector_response":
            const sector = Array.isArray(data) ? data[0]?.sector : data?.sector;
            console.log(`GMS : Client ${clientId} responded with pyramid sector: ${sector}`);
            clients.get(clientId)?.game?.gameLogic.handlePyramidSectorResponse(sector);
            break;
        default:
            console.error("GMS : Unknown event: " + eventName);
            break;
    }
}

server.listen(8002, () => {
    console.log("GMS : Game server listening on port 8002");
});