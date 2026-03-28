const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const { getUserIdFromToken, getUsernameFromToken } = require('./user');
const axios = require('axios');

const GRACE_PERIOD_MS = 15 * 1_000;              
const REQUEST_TIMEOUT_MS = 30 * 1_000;
const USERNAME_CACHE_TTL_MS = 5 * 60_000;

const MANUAL_EVENTS = [
    "client_init", "reconnect", "disconnect",
    "is_game_active", "waiting_for_duel", "duel_request", "duel_response" 
];

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
    const gameSockets = new Map();          // socketId  -> socket
    const socketToGameClient = new Map();   // socketId  -> clientId
    const gameClientToSocket = new Map();   // clientId  -> socketId
    const initializedSockets = new Set();   // sockets that completed client_init

    // ── DUEL sockets  (waiting_for_duel / duel_request) ──────────────────────
    const duelSockets = new Map();          // socketId  -> socket
    const socketToDuelClient = new Map();   // socketId  -> clientId
    const duelClientToSocket = new Map();   // clientId  -> socketId

    // ── Duel requests ─────────────────────────────────────────────────────────
    const requestMap = new Map();           // targetClientId -> { requesterClientId, timeout, expiresAt }
    const idToUsernameCache = new Map();    // clientId -> { username, expiresAt }

    // ── User status / grace-period tracking ───────────────────────────────────
    const clientIdToUserName = new Map();
    const disconnectTimers = new Map();     // clientId -> timeout
    const pendingEvents = new Map();        // clientId -> [{ eventName, data }]

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getDuelSocket = (clientId) => duelSockets.get(duelClientToSocket.get(clientId));
    const getGameSocket = (clientId) => gameSockets.get(gameClientToSocket.get(clientId));

    const setCachedUsername = (clientId, username) => {
        idToUsernameCache.set(clientId, { username, expiresAt: Date.now() + USERNAME_CACHE_TTL_MS });
        setTimeout(() => {
            const entry = idToUsernameCache.get(clientId);
            if (entry && entry.expiresAt <= Date.now()) {
                idToUsernameCache.delete(clientId);
            }
        }, USERNAME_CACHE_TTL_MS + 1000);  
    };
    const getCachedUsername = (clientId) => {
        const entry = idToUsernameCache.get(clientId);
        if (!entry) return undefined;
        return entry.username;
    };

    // ── Grace-period helpers ──────────────────────────────────────────────────
    const cancelDisconnectTimer = (clientId) => {
        if (disconnectTimers.has(clientId)) {
            clearTimeout(disconnectTimers.get(clientId));
            disconnectTimers.delete(clientId);
        }
    };

    const flushPendingEvents = (clientId) => {
        const queued = pendingEvents.get(clientId);
        if (!queued || queued.length === 0) return;
        const clientSocket = getGameSocket(clientId);
        if (!clientSocket) return;
        for (const { eventName, data } of queued) {
            console.log(`Flushing queued event "${eventName}" to ${clientId}`);
            clientSocket.emit(eventName, data);
        }
        pendingEvents.delete(clientId);
    };

    // ── Duel handlers ─────────────────────────────────────────────────────────
    const handleWaitingForDuel = async (clientSocket, payload) => {
        const clientId = await getUserIdFromToken(payload.clientJWT);
        if (!clientId) {
            clientSocket.emit("error", { message: "Invalid authentication token" });
            return;
        }

        const existingSocketId = duelClientToSocket.get(clientId);
        if (existingSocketId && existingSocketId !== clientSocket.id) {
            duelSockets.delete(existingSocketId);
            socketToDuelClient.delete(existingSocketId);
        }

        duelSockets.set(clientSocket.id, clientSocket);
        socketToDuelClient.set(clientSocket.id, clientId);
        duelClientToSocket.set(clientId, clientSocket.id);

        // Resume a request that arrived before this client connected
        if (requestMap.has(clientId)) {
            const { requesterClientId, expiresAt } = requestMap.get(clientId);
            const requesterSocket = getDuelSocket(requesterClientId);

            if (!requesterSocket) {
                requestMap.delete(clientId);
            } else {
                const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
                clientSocket.emit("duel_requested", {
                    requesterClientId,
                    senderName: getCachedUsername(requesterClientId) || "Unknown",
                    timeoutSeconds: remainingSeconds
                });
            }
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

        if (!targetId) {
            clientSocket.emit("error", { message: "Target user not found" });
            return;
        }

        if (!duelClientToSocket.has(targetId)) {
            clientSocket.emit("error", { message: "Target user is not connected" });
            return;
        }

        if (requestMap.has(targetId)) {
            clientSocket.emit("error", { message: "A duel request is already pending for this user" });
            return;
        }

        const targetSocket = getDuelSocket(targetId);
        if (!targetSocket) {
            clientSocket.emit("error", { message: "Target user is not connected" });
            return;
        }

        const expiresAt = Date.now() + REQUEST_TIMEOUT_MS;
        const timeout = setTimeout(() => {
            requestMap.delete(targetId);
            clientSocket.emit("duel_timeout", { message: "Duel request expired for " + targetId });
        }, REQUEST_TIMEOUT_MS);

        requestMap.set(targetId, { requesterClientId, timeout, expiresAt });
        setCachedUsername(requesterClientId, senderName); 
        targetSocket.emit("duel_requested", { requesterClientId, senderName, timeoutSeconds: 30 });
    };

    const handleDuelResponse = async (clientSocket, payload) => {
        const { requesterClientId, accept, username, clientJWT } = payload;

        const responderClientId = await getUserIdFromToken(clientJWT);  
        if (!responderClientId) {
            clientSocket.emit("error", { message: "Invalid authentication token" });
            return;
        }

        // Verify the socket matches the authenticated user
        const registeredClientId = socketToDuelClient.get(clientSocket.id);
        if (registeredClientId !== responderClientId) {
            clientSocket.emit("error", { message: "Socket identity mismatch" });
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

        requesterSocket.emit("duel_result", { id: responderClientId, username, accept });
        clientSocket.emit("duel_result", { id: requesterClientId, username: getCachedUsername(requesterClientId), accept });
    };

    // ── Connection handler ────────────────────────────────────────────────────
    io.on('connection', (clientSocket) => {
        console.log(`Client connected: ${clientSocket.id}`);

        gameSockets.set(clientSocket.id, clientSocket);

        const safeAsync = (fn) => async (payload) => {
            try {
                await fn(clientSocket, payload);
            } catch (err) {
                console.error(`Unhandled error in handler for socket ${clientSocket.id}:`, err);
                clientSocket.emit("error", { message: "Internal server error" });
            }
        };

        clientSocket.on("is_game_active", safeAsync(async (_socket, payload) => {
            const { clientJWT } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }

            const username = await getUsernameFromToken(clientJWT);
            if (!username) { 
                clientSocket.emit("error", { message: "Could not resolve username from token" });
                return;
            }

            const existingSocketId = gameClientToSocket.get(clientId);
            if (existingSocketId && existingSocketId !== clientSocket.id) {
                gameSockets.delete(existingSocketId);
                socketToGameClient.delete(existingSocketId);
                initializedSockets.delete(existingSocketId);
            }

            socketToGameClient.set(clientSocket.id, clientId);
            gameClientToSocket.set(clientId, clientSocket.id);
            clientIdToUserName.set(clientId, username);

            cancelDisconnectTimer(clientId);
            flushPendingEvents(clientId);  

            changeUserStatus(username, "online");
            backendSocket.emit("is_game_active", { clientId });
        }));

        clientSocket.on("waiting_for_duel", safeAsync(handleWaitingForDuel));   
        clientSocket.on("duel_request",     safeAsync(handleDuelRequest));       
        clientSocket.on("duel_response",    safeAsync(handleDuelResponse));     

        clientSocket.on("client_init", safeAsync(async (_socket, payload) => {
            const { mode, clientJWT, opponentId } = payload;
            const clientId = await getUserIdFromToken(clientJWT);
            if (!clientId) {
                console.error(`Invalid JWT from client ${clientSocket.id}`);
                clientSocket.emit("error", { message: "Invalid authentication token" });
                return;
            }

            const username = await getUsernameFromToken(clientJWT);
            if (!username) { 
                clientSocket.emit("error", { message: "Could not resolve username from token" });
                return;
            }

            const existingSocketId = gameClientToSocket.get(clientId);
            if (existingSocketId && existingSocketId !== clientSocket.id) {
                gameSockets.delete(existingSocketId);
                socketToGameClient.delete(existingSocketId);
                initializedSockets.delete(existingSocketId);
            }

            socketToGameClient.set(clientSocket.id, clientId);
            gameClientToSocket.set(clientId, clientSocket.id);
            clientIdToUserName.set(clientId, username);
            initializedSockets.add(clientSocket.id);

            cancelDisconnectTimer(clientId);
            flushPendingEvents(clientId); 

            console.log(`[GAME] Mapped client ${clientId} -> socket ${clientSocket.id}`);
            backendSocket.emit("client_connected", { clientId, mode, opponentId });
        }));

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

                if (wasInitialized) {
                    backendSocket.emit('client_disconnect', { clientId });
                }

                const username = clientIdToUserName.get(clientId);
                const timerId = setTimeout(() => {
                    changeUserStatus(username, "offline");
                    clientIdToUserName.delete(clientId);  
                    pendingEvents.delete(clientId);      
                    disconnectTimers.delete(clientId);
                }, GRACE_PERIOD_MS);

                disconnectTimers.set(clientId, timerId);
            }
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
                console.warn(`Game socket for client ${payload.clientId} not found, buffering "${eventName}"`);
                if (!pendingEvents.has(payload.clientId)) {
                    pendingEvents.set(payload.clientId, []);
                }
                pendingEvents.get(payload.clientId).push({ eventName, data: payload.data });
            }
        } else if (payload?.broadcast) {
            console.log('Broadcasting to all clients');
            io.emit(eventName, payload.data);
        } else if (payload?.room) {
            console.log(`Sending to room ${payload.room}`);
            io.to(payload.room).emit(eventName, payload.data);
        } else {
            console.warn('Received event without proper routing info:', payload);
        }
    });

    console.log('Socket.IO handler set up on gateway');
};

const changeUserStatus = async (username, status) => {
    const userserviceUrl = process.env.USER_SERVICE_URL || "http://localhost:8006";
    if (!username) return;

    try {
        const res = await axios.put(`${userserviceUrl}/api/user/${username}/status`, { status });
        if (res.status === 200) {
            console.log(`Changed status for client ${username} to ${status}`);
        } else {
            console.error(`Failed to change status for ${username} to ${status}:`, res.statusText);
        }
    } catch (err) {
        console.error(`Failed to change status for ${username} to ${status}:`, err.message);
    }
};

exports.handleSocketIoRequests = handleSocketIoRequests;