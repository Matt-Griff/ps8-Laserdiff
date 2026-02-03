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
    console.log(" Handling " + eventName + " for client " + clientId + ":", data);

    // Example event handlers
    switch (eventName) {
        default:
            console.log(" Unknown event: " + eventName);
    }
}

server.listen(8002, () => {
    console.log("Game server listening on port 8002");
});