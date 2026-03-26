const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const { getUserIdFromToken, getUserIdFromUsername } = require('./user');

const handleSocketIoRequests = (server) => {
    const io = socketIO(server, {
        path: '/socket.io',
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    const gameserviceUrl = process.env.GAMESERVICE_URL || "http://localhost:8002";
    const backendSocket = ioClient(gameserviceUrl, {
        reconnection: true,
        reconnectionDelay: 1000
    });

    backendSocket.on('connect', () => console.log('Gateway connected to backend'));
    backendSocket.on('disconnect', (r) => console.log('Gateway disconnected from backend:', r));
    backendSocket.on('connect_error', (e) => console.error('Gateway connection error:', e.message));

    // ── GAME sockets  (client_init / is_game_active) ──────────────────────────
    const gameSockets = new Map(); // socketId  -> socket
    const socketToGameClient = new Map(); // socketId  -> clientId
    const gameClientToSocket = new Map(); // clientId  -> socketId
    const initializedSockets = new Set(); // sockets that completed client_init

    // ── DUEL sockets  (waiting_for_duel / duel_request) ──────────────────────
    const duelSockets = new Map(); // socketId  -> socket
    const socketToDuelClient = new Map(); // socketId  -> clientId
    const duelClientToSocket = new Map(); // clientId  -> socketId

    // ── Duel requests ─────────────────────────────────────────────────────────
    const requestMap = new Map(); // targetClientId -> { requesterClientId, timeout, expiresAt }
    const idToUsernameCache = new Map(); // clientId -> username (to avoid repeated lookups)

    const MANUAL_EVENTS = [
        "client_init", "reconnect", "disconnect",
        "is_game_active", "waiting_for_duel", "duel_request"
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getDuelSocket = (clientId) => duelSockets.get(duelClientToSocket.get(clientId));
    const getGameSocket = (clientId) => gameSockets.get(gameClientToSocket.get(clientId));

    // ── Duel handlers ─────────────────────────────────────────────────────────
    const handleWaitingForDuel = async (clientSocket, payload) => {
        const clientId = await getUserIdFromToken(payload.clientJWT);
        if (!clientId) {
            clientSocket.emit("error", { message: "Invalid authentication token" });
            return;
        }

        // Register in DUEL maps only
        duelSockets.set(clientSocket.id, clientSocket);
        socketToDuelClient.set(clientSocket.id, clientId);
        duelClientToSocket.set(clientId, clientSocket.id);

        // Resume a request that arrived before this client connected
        if (requestMap.has(clientId)) {
            const { requesterClientId, expiresAt } = requestMap.get(clientId);

            const requesterSocket = getDuelSocket(requesterClientId);
            if (!requesterSocket) return; // requester gone

            const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            clientSocket.emit("duel_requested", {
                requesterClientId,
                senderName: idToUsernameCache.get(requesterClientId) || "Unknown",
                timeoutSeconds: remainingSeconds
            });
        }

        clientSocket.on("disconnect", () => {
            duelSockets.delete(clientSocket.id);
            socketToDuelClient.delete(clientSocket.id);
            duelClientToSocket.delete(clientId);
        });
    };

    const handleDuelRequest = async (clientSocket, payload) => {
        const { targetId, senderName, clientJWT } = payload;

        const requesterClientId = await getUserIdFromToken(clientJWT);
        if (!requesterClientId) {
            clientSocket.emit("error", { message: "Invalid authentication token" });
            return;
        }

        const targetClientId = targetId;
        if (!targetClientId) {
            clientSocket.emit("error", { message: "Target user not found" });
            return;
        }

        if (!duelClientToSocket.has(targetClientId)) {
            clientSocket.emit("error", { message: "Target user is not connected" });
            return;
        }

        if (requestMap.has(targetClientId)) {
            clientSocket.emit("error", { message: "A duel request is already pending for this user" });
            return;
        }

        const expiresAt = Date.now() + 30_000;
        const timeout = setTimeout(() => {
            requestMap.delete(targetClientId);
            clientSocket.emit("duel_timeout", { message: "Duel request expired for " + targetClientId });
        }, 30_000);

        requestMap.set(targetClientId, { requesterClientId, timeout, expiresAt });

        const targetSocket = getDuelSocket(targetClientId);
        if (targetSocket) {
            targetSocket.emit("duel_requested", { requesterClientId, senderName, timeoutSeconds: 30 });
            idToUsernameCache.set(requesterClientId, senderName);
        } else {
            clearTimeout(timeout);
            requestMap.delete(targetClientId);
            clientSocket.emit("error", { message: "Target user is not connected" });
        }
    };

    const handleDuelResponse = async (clientSocket, payload) => {
        const { requesterClientId, accept, username } = payload;
        console.log("Duel response received:", payload);

        const responderClientId = socketToDuelClient.get(clientSocket.id);
        if (!responderClientId) {
            clientSocket.emit("error", { message: "You are not registered for duels" });
            return;
        }

        const requesterSocket = getDuelSocket(requesterClientId);
        if (!requesterSocket) {
            clientSocket.emit("error", { message: "Requester is no longer connected" });
            return;
        }

        const pendingRequest = requestMap.get(responderClientId);
        if (!pendingRequest) {
            clientSocket.emit("error", { message: "No pending duel request found" });
            return;
        }

        clearTimeout(pendingRequest.timeout);
        requestMap.delete(responderClientId);

        requesterSocket?.emit("duel_result", { id: responderClientId, username: username, accept });
        clientSocket.emit("duel_result", { id: requesterClientId, username: idToUsernameCache.get(requesterClientId), accept });
    };

    // ── Connection handler ────────────────────────────────────────────────────
    io.on('connection', (clientSocket) => {
        console.log(`Client connected: ${clientSocket.id}`);

        // Every socket goes into the game pool by default
        // (it will also go into the duel pool if it emits waiting_for_duel)
        gameSockets.set(clientSocket.id, clientSocket);

        clientSocket.on("is_game_active", async (payload) => {
            const clientId = await getUserIdFromToken(payload.clientJWT);
            if (!clientId) {
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            socketToGameClient.set(clientSocket.id, clientId);
            gameClientToSocket.set(clientId, clientSocket.id);
            backendSocket.emit("is_game_active", { clientId });
        });

        clientSocket.on("waiting_for_duel", (payload) => handleWaitingForDuel(clientSocket, payload));
        clientSocket.on("duel_request", (payload) => handleDuelRequest(clientSocket, payload));
        clientSocket.on("duel_response", async (payload) => { handleDuelResponse(clientSocket, payload) });

        clientSocket.on("client_init", async (payload) => {
            const { mode, clientJWT, opponentId } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id}`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }
            socketToGameClient.set(clientSocket.id, clientId);
            gameClientToSocket.set(clientId, clientSocket.id);
            initializedSockets.add(clientSocket.id);
            console.log(`[GAME] Mapped client ${clientId} -> socket ${clientSocket.id}`);
            backendSocket.emit("client_connected", { clientId, mode, opponentId });
        });

        // Forward game-socket events to backend
        clientSocket.onAny((eventName, ...args) => {
            if (MANUAL_EVENTS.includes(eventName)) return;

            const clientId = socketToGameClient.get(clientSocket.id);
            if (!clientId) {
                console.error(`No game client ID for socket ${clientSocket.id}, dropping "${eventName}"`);
                return;
            }
            console.log(`F->GMS : "${eventName}" from ${clientSocket.id}`);
            backendSocket.emit(eventName, { clientId, data: args });
        });

        clientSocket.on('disconnect', () => {
            console.log(`Client disconnected: ${clientSocket.id}`);
            const clientId = socketToGameClient.get(clientSocket.id);
            const wasInitialized = initializedSockets.has(clientSocket.id);

            gameSockets.delete(clientSocket.id);
            socketToGameClient.delete(clientSocket.id);
            initializedSockets.delete(clientSocket.id);

            if (clientId) {
                gameClientToSocket.delete(clientId);
                if (wasInitialized) backendSocket.emit('client_disconnect', { clientId });
            }
            // duel cleanup is handled by the listener registered in handleWaitingForDuel
        });
    });

    // ── Backend → frontend forwarding ─────────────────────────────────────────
    backendSocket.onAny((eventName, payload) => {
        if (payload?.clientId) {
            const clientSocket = getGameSocket(payload.clientId);
            if (clientSocket) {
                console.log(`GMS->F : "${eventName}" -> ${payload.clientId}`);
                clientSocket.emit(eventName, payload.data);
            } else {
                console.error(`Game socket for client ${payload.clientId} not found, dropping "${eventName}"`);
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

exports.handleSocketIoRequests = handleSocketIoRequests;