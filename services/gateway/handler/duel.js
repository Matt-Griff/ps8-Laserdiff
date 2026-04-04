// duel.js (backend)
const { getUserIdFromToken } = require('./user');

const NOTIFICATION_DURATION_MS = 10 * 1000;
const USERNAME_CACHE_TTL_MS = 5 * 60_000;

const duelSockets = new Map();         // socketId  -> socket
const socketToDuelClient = new Map();  // socketId  -> clientId
const duelClientToSocket = new Map();  // clientId  -> socketId

const requestMap = new Map();          // targetClientId -> { requesterClientId, expiresAt, timeout }
const idToUsernameCache = new Map();   // clientId -> { username, expiresAt }

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
    return entry ? entry.username : undefined;
};

const getDuelSocket = (clientId) => duelSockets.get(duelClientToSocket.get(clientId));

async function handleWaitingForDuel(socket, payload) {
    console.log("Received waiting_for_duel from", socket.id, payload);

    const clientId = await getUserIdFromToken(payload.clientJWT);
    if (!clientId) {
        socket.emit("error", { message: "Invalid authentication token" });
        return;
    }

    const existingSocketId = duelClientToSocket.get(clientId);
    if (existingSocketId && existingSocketId !== socket.id) {
        duelSockets.delete(existingSocketId);
        socketToDuelClient.delete(existingSocketId);
    }

    duelSockets.set(socket.id, socket);
    socketToDuelClient.set(socket.id, clientId);
    duelClientToSocket.set(clientId, socket.id);

    // Resume a request that arrived before this client reconnected
    if (requestMap.has(clientId)) {
        const { requesterClientId, expiresAt } = requestMap.get(clientId);
        const requesterSocket = getDuelSocket(requesterClientId);

        if (!requesterSocket) {
            requestMap.delete(clientId);
        } else {
            const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            socket.emit("duel_requested", {
                requesterClientId,
                senderName: getCachedUsername(requesterClientId) || "Unknown",
                timeoutSeconds: remainingSeconds
            });
        }
    }

    socket.on("disconnect", () => {
        duelSockets.delete(socket.id);
        socketToDuelClient.delete(socket.id);
        duelClientToSocket.delete(clientId);
    });
}

async function handleDuelRequest(socket, payload) {
    console.log("Received duel request from", socket.id, payload);

    const { targetId, senderName, clientJWT } = payload;

    const requesterClientId = await getUserIdFromToken(clientJWT);
    if (!requesterClientId) {
        socket.emit("error", { message: "Invalid authentication." });
        return;
    }

    if (targetId === requesterClientId) {
        socket.emit("error", { message: "You cannot duel yourself." });
        return;
    }

    if (!duelClientToSocket.has(targetId)) {
        socket.emit("error", { message: "Target user is not online." });
        return;
    }

    if (requestMap.has(targetId)) {
        socket.emit("error", { message: "Target user already has a pending duel request." });
        return;
    }

    const targetSocket = getDuelSocket(targetId);
    if (!targetSocket) {
        socket.emit("error", { message: "Target user is not online." });
        return;
    }

    const expiresAt = Date.now() + NOTIFICATION_DURATION_MS;
    const timeout = setTimeout(() => {
        requestMap.delete(targetId);
        socket.emit("duel_timeout", { message: "Duel request expired." });
    }, NOTIFICATION_DURATION_MS);

    requestMap.set(targetId, { requesterClientId, expiresAt, timeout });
    setCachedUsername(requesterClientId, senderName);
    targetSocket.emit("duel_requested", {
        requesterClientId,
        senderName,
        timeoutSeconds: NOTIFICATION_DURATION_MS / 1000
    });
}

async function handleDuelResponse(socket, payload) {
    console.log("Received duel response from", socket.id, payload);

    const { requesterClientId, accept, username, clientJWT } = payload;

    const responderClientId = await getUserIdFromToken(clientJWT);
    if (!responderClientId) {
        socket.emit("error", { message: "Invalid authentication token" });
        return;
    }

    // Make sure the socket matches who it claims to be
    const registeredClientId = socketToDuelClient.get(socket.id);
    if (registeredClientId !== responderClientId) {
        socket.emit("error", { message: "Socket identity mismatch" });
        return;
    }

    const pendingRequest = requestMap.get(responderClientId);
    if (!pendingRequest) {
        socket.emit("error", { message: "No pending duel request found" });
        return;
    }

    const requesterSocket = getDuelSocket(requesterClientId);
    if (!requesterSocket) {
        socket.emit("error", { message: "Requester is no longer connected" });
        return;
    }

    clearTimeout(pendingRequest.timeout);
    requestMap.delete(responderClientId);

    requesterSocket.emit("duel_result", { id: responderClientId, username, accept });
    socket.emit("duel_result", {
        id: requesterClientId,
        username: getCachedUsername(requesterClientId),
        accept
    });
}

exports.handleDuelRequest = handleDuelRequest;
exports.handleDuelResponse = handleDuelResponse;
exports.handleWaitingForDuel = handleWaitingForDuel;