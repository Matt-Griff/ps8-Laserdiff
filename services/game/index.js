const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Map to track client sessions
const clients = new Map();

io.on("connection", (gatewaySocket) => {
    console.log("Gateway connected:", gatewaySocket.id);

    gatewaySocket.onAny((eventName, payload) => {
        console.log(" Received event " + eventName + " from gateway:" + payload);

        // Handle client disconnect
        if (eventName === "client_disconnect") {
            console.log("Client ${payload.clientId} disconnected");
            clients.delete(payload.clientId);
            return;
        }

        // Handle client connection
        if (eventName === "client_connected") {
            const { clientId } = payload;
            console.log("New client connected: ${clientId}");

            clients.set(clientId, { id: clientId, connectedAt: Date.now() });

            // Send welcome message to new client
            console.log("Sending welcome to client ${clientId}");
            gatewaySocket.emit("welcome", {
                clientId: clientId,
                data: "Welcome to the game server!"
            });
            return;
        }

        const { clientId, data } = payload;

        // Handle different game events
        handleGameEvent(eventName, clientId, data, gatewaySocket);
    });

    gatewaySocket.on("disconnect", () => {
        console.log(" Gateway disconnected:", gatewaySocket.id);
        // Gateway disconnected, clear all clients
        clients.clear();
    });
});

function handleGameEvent(eventName, clientId, data, gatewaySocket) {
    console.log(`Handling event ${eventName} from client ${clientId} with data:`, data);

    switch (eventName) {
        case "cell_click":
            const cell = Array.isArray(data) ? data[0] : data;
            console.log(`Client ${clientId} clicked cell at row ${cell?.row}, col ${cell?.col}`);
            break;
        case "reserve_click":
            const playerId = Array.isArray(data) ? data[0]?.playerId : data?.playerId;
            console.log(`Client ${clientId} clicked reserve for player ${data.playerId}`);
            break;
        case "rotate":
            const direction = Array.isArray(data) ? data[0]?.direction : data?.direction;
            console.log(`Client ${clientId} requested rotation: ${data.direction}`);
            break;
        case "swap":
            console.log(`Client ${clientId} requested swap`);
            break;
        default:
            console.log(" Unknown event: " + eventName);
            break;
    }
}

server.listen(8002, () => {
    console.log("Game server listening on port 8002");
});