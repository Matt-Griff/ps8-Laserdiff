const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const { getUserIdFromToken } = require('./user');

const handleSocketIoRequests = (server) => {
    // Create Socket.IO server on the gateway (A socket B)
    const io = socketIO(server, {
        path: '/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // --- Game Service Connection ---
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

    // --- Chat Service Connection ---
    const chatServiceUrl = process.env.CHATSERVICE_URL || "http://localhost:8003";
    const chatBackendSocket = ioClient(chatServiceUrl, {
        reconnection: true,
        reconnectionDelay: 1000
    });

    chatBackendSocket.on('connect', () => {
        console.log('Gateway connected to chat service');
    });

    chatBackendSocket.on('disconnect', (reason) => {
        console.log('Gateway disconnected from chat service:', reason);
    });

    chatBackendSocket.on('connect_error', (error) => {
        console.error('Gateway connection error to chat service:', error.message);
    });

    // --- Game Namespace (default /) ---
    const clientSockets = new Map();
    const SocketIdClientId = new Map();
    const ClientIdSocketId = new Map();
    const initializedSockets = new Set();

    const MANUAL_EVENTS = ["client_init", "reconnect", "disconnect", "is_game_active"]; // Events that are handled manually and not forwarded to backend

    // Handle client connections (A socket B)
    io.on('connection', (clientSocket) => {
        console.log(`Client connected: ${clientSocket.id}`);

        // Store the client socket
        clientSockets.set(clientSocket.id, clientSocket);


        clientSocket.on("is_game_active", async (payload) => {
            const clientJWT = payload.clientJWT;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id} for is_game_active check`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            ClientIdSocketId.set(clientId, clientSocket.id);
            SocketIdClientId.set(clientSocket.id, clientId);
            backendSocket.emit("is_game_active", { clientId });
        });

        clientSocket.on("client_init", async (payload) => {
            const { mode, clientJWT } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id}`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            SocketIdClientId.set(clientSocket.id, clientId);
            ClientIdSocketId.set(clientId, clientSocket.id);
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
            }
        });
    });

    // Handle messages from backend and forward to appropriate clients
    backendSocket.onAny((eventName, payload) => {
        if (payload && payload.clientId) {
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

        // When a game starts, notify chat service about the pairing
        if (eventName === "game_start" && payload?.clientId && payload?.data?.opponent) {
            chatBackendSocket.emit("chat_game_start", {
                player1Id: payload.clientId,
                player2Id: payload.data.opponent
            });
        }
        
        // When a game ends, notify chat service
        if (eventName === "game_end" && payload?.clientId) {
            chatBackendSocket.emit("chat_game_end", {
                player1Id: payload.clientId,
                player2Id: null
            });
        }
    });

    // --- Chat Namespace (/chat) ---
    const chatIo = io.of('/chat');
    const chatClientSockets = new Map();
    const chatSocketIdClientId = new Map();
    const chatClientIdSocketId = new Map();

    const CHAT_MANUAL_EVENTS = ["chat_init", "disconnect"];

    chatIo.on('connection', (clientSocket) => {
        console.log(`Chat client connected: ${clientSocket.id}`);
        chatClientSockets.set(clientSocket.id, clientSocket);

        clientSocket.on("chat_init", async (payload) => {
            const { clientJWT, username } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from chat client ${clientSocket.id}`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            chatSocketIdClientId.set(clientSocket.id, clientId);
            chatClientIdSocketId.set(clientId, clientSocket.id);
            console.log(`Chat: Mapped client ${clientId} (${username}) to socket ${clientSocket.id}`);
            chatBackendSocket.emit("chat_user_connect", { clientId, username });
            clientSocket.emit("chat_init_ok", { clientId });
        });

        // Forward all chat events to chat backend
        clientSocket.onAny((eventName, ...args) => {
            if (CHAT_MANUAL_EVENTS.includes(eventName)) return;

            const clientId = chatSocketIdClientId.get(clientSocket.id);
            if (!clientId) {
                console.error(`No client ID for chat socket ${clientSocket.id}, cannot forward "${eventName}"`);
                return;
            }
            console.log(`F->CHAT : "${eventName}" from ${clientSocket.id}`);
            chatBackendSocket.emit(eventName, { clientId, ...args[0] });
        });

        clientSocket.on('disconnect', () => {
            console.log(`Chat client disconnected: ${clientSocket.id}`);
            const clientId = chatSocketIdClientId.get(clientSocket.id);
            chatClientSockets.delete(clientSocket.id);
            chatSocketIdClientId.delete(clientSocket.id);
            if (clientId) {
                chatClientIdSocketId.delete(clientId);
                chatBackendSocket.emit("chat_user_disconnect", { clientId });
            }
        });
    });

    // Handle messages from chat backend and forward to clients
    chatBackendSocket.onAny((eventName, payload) => {
        if (payload && payload.clientId) {
            const socketId = chatClientIdSocketId.get(payload.clientId);
            if (!socketId) {
                console.error(`No chat socket for client ${payload.clientId}, cannot forward "${eventName}"`);
                return;
            }
            const clientSocket = chatClientSockets.get(socketId);
            if (clientSocket) {
                console.log(`CHAT->F : "${eventName}" -> ${payload.clientId}`);
                clientSocket.emit(eventName, payload.data);
            }
        } else if (payload && payload.broadcast) {
            console.log(`CHAT broadcast: "${eventName}"`);
            chatIo.emit(eventName, payload.data);
        }
    });

    console.log('Socket.IO handler set up on gateway (game + chat)');
}

exports.handleSocketIoRequests = handleSocketIoRequests;