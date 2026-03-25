const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const { getUserIdFromToken, getUsernameFromToken } = require('./user');
const axios = require('axios');

const handleSocketIoRequests = (server) => {
    // Create Socket.IO server on the gateway (A socket B)
    const io = socketIO(server, {
        path: '/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Connect to backend Socket.IO service (B socket C)
    const gameserviceUrl = process.env.GAMESERVICE_URL || "http://localhost:8002";
    const backendSocket = ioClient(gameserviceUrl, {
        reconnection: true,
        reconnectionDelay: 1000
    });

    backendSocket.on('connect', () => {
        console.log('Gateway connected to backend Socket.IO service');
    });

    backendSocket.on('disconnect', (reason) => {
        console.log('Gateway disconnected from backend:', reason);
    });

    backendSocket.on('connect_error', (error) => {
        console.error('Gateway connection error to backend:', error.message);
    });

    // Map to track client sockets
    const clientSockets = new Map();
    const SocketIdClientId = new Map();
    const ClientIdSocketId = new Map();
    const initializedSockets = new Set();
    const clientIdToUserName = new Map();
    const clientIdToOpponentId = new Map();

    const disconnectTimers = new Map(); // clientId -> timeout
    const GRACE_PERIOD_MS = 2000;

    const MANUAL_EVENTS = ["client_init", "reconnect", "disconnect", "is_game_active"]; // Events that are handled manually and not forwarded to backend

    const cancelDisconnectTimer = (clientId) => {
        if(disconnectTimers.has(clientId)) {
            clearTimeout(disconnectTimers.get(clientId));
            disconnectTimers.delete(clientId);
        }
    }
    // Handle client connections (A socket B)
    io.on('connection', (clientSocket) => {
        console.log(`Client connected: ${clientSocket.id}`);

        // Store the client socket
        clientSockets.set(clientSocket.id, clientSocket);


        clientSocket.on("is_game_active", async (payload) => {
            const clientJWT = payload.clientJWT;
            const clientId = await getUserIdFromToken(clientJWT);
            const username = await getUsernameFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id} for is_game_active check`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            
            cancelDisconnectTimer(clientId);

            ClientIdSocketId.set(clientId, clientSocket.id);
            clientIdToUserName.set(clientId, username);
            changeUserStatus(username, "online");
            SocketIdClientId.set(clientSocket.id, clientId);
            backendSocket.emit("is_game_active", { clientId });
        });

        clientSocket.on("client_init", async (payload) => {
            const { mode, clientJWT } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            const username = await getUsernameFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id}`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            SocketIdClientId.set(clientSocket.id, clientId);
            ClientIdSocketId.set(clientId, clientSocket.id);
            clientIdToUserName.set(clientId, username);
            initializedSockets.add(clientSocket.id);
            console.log(`Mapped client ID ${clientId} to socket ID ${clientSocket.id}`);
            backendSocket.emit("client_connected", { clientId, mode });
        });

        // Forward client messages to backend
        clientSocket.onAny(async (eventName, ...args) => {
            if (MANUAL_EVENTS.includes(eventName)) return;

            console.log(`F->GMS : "${eventName}" from ${clientSocket.id}`);
            const clientId = SocketIdClientId.get(clientSocket.id);
            if (!clientId) {
                console.error(`No client ID found for socket ${clientSocket.id}, cannot forward event "${eventName}"`);
                return;
            }

            // Include client ID so backend knows which client sent it
            backendSocket.emit(eventName, {
                clientId: clientId,
                data: args
            });
        });

        // Handle client disconnect
        clientSocket.on('disconnect', () => {
            console.log(`Client disconnected: ${clientSocket.id}`);
            const clientId = SocketIdClientId.get(clientSocket.id);
            const wasInitialized = initializedSockets.has(clientSocket.id);
            clientSockets.delete(clientSocket.id);
            SocketIdClientId.delete(clientSocket.id);
            initializedSockets.delete(clientSocket.id);
            if (clientId) {
                ClientIdSocketId.delete(clientId);
                // Only notify backend if this socket actually started a game (client_init)
                if (wasInitialized) {
                    backendSocket.emit('client_disconnect', { clientId });
                }

                const username = clientIdToUserName.get(clientId);
                const timerId = setTimeout(() => {
                    changeUserStatus(username, "offline");
                    disconnectTimers.delete(clientId);
                }, GRACE_PERIOD_MS);

                disconnectTimers.set(clientId, timerId);
            }
           
            
            clientIdToUserName.delete(clientId);
        });
    });

    // Handle messages from backend and forward to appropriate clients
    backendSocket.onAny((eventName, payload) => {
        if (payload && payload.clientId) {
            if(eventName === "game_start") {
                const username = clientIdToUserName.get(payload.clientId);
                const otherClientId = payload.data?.opponent;
                const opponentUsername = clientIdToUserName.get(otherClientId);
                payload.data.opponentUsername = opponentUsername;

                clientIdToOpponentId.set(payload.clientId, otherClientId);
                clientIdToOpponentId.set(otherClientId, payload.clientId);
            }

            if(eventName === "game_end") {
                const opponentId = clientIdToOpponentId.get(payload.clientId);
                const opponentUsername = clientIdToUserName.get(opponentId);
                payload.data.opponentUsername = opponentUsername;
            }
            // Message for specific client
            const clientSocketId = ClientIdSocketId.get(payload.clientId);
            if (!clientSocketId) {
                console.error(`No socket ID found for client ${payload.clientId}, cannot forward event "${eventName}"`);
                return;
            }
            const clientSocket = clientSockets.get(clientSocketId);
            if (clientSocket) {
                console.log(`GMS->F : "${eventName}" -> ${payload.clientId}`);
                clientSocket.emit(eventName, payload.data);
            } else {
                console.error(`Client ${payload.clientId} not found in clientSockets`);
            }
        } else if (payload && payload.broadcast) {
            // Broadcast to all clients
            console.log(` Broadcasting to all clients`);
            io.emit(eventName, payload.data);
        } else if (payload && payload.room) {
            // Send to specific room
            console.log(` Sending to room ${payload.room}`);
            io.to(payload.room).emit(eventName, payload.data);
        } else {
            console.log(` Received event without proper routing info:`, payload);
        }
    });

    console.log('Socket.IO handler set up on gateway');
}

const changeUserStatus = async (username, status) => {
    const userserviceUrl = process.env.USER_SERVICE_URL || "http://localhost:8006";

    if (!username) return;

    const res = await axios.put(`${userserviceUrl}/api/user/${username}/status`, { status }).catch(err => {
        console.error(`Failed to change status for client ${username} to ${status}:`, err.message);
    });

    if (res && res.status === 200) {
        console.log(`Changed status for client ${username} to ${status}`);
    } else {
        console.error(`Failed to change status for client ${username} to ${status}:`, res ? res.statusText : "No response");
    }
}

exports.handleSocketIoRequests = handleSocketIoRequests;