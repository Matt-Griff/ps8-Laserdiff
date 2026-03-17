import { saveFriendMessage, getFriendMessages } from "./data/mongo.js";

const PRESET_MESSAGES = {
    "hello": "Hello",
    "bye": "Bye",
    "good-luck": "Good luck",
    "well-played": "Well played",
    "good-game": "Good game",
    "oops": "Oops",
    "emote-teemo": "emote:teemo",
    "emote-lulu": "emote:lulu",
    "emote-yasuo": "emote:yasuo",
    "emote-lee": "emote:lee"
};

const onlineUsers = new Map();
const gamePairings = new Map();

// --- Chat Protection Configurations ---
const globalChatCooldowns = new Map();
const GLOBAL_COOLDOWN_MS = 2000; // 2 seconds between messages

const filterMessage = async (text) => {
    try {
        // Use a public profanity filter API (PurgoMalum)
        const response = await fetch(`https://www.purgomalum.com/service/plain?text=${encodeURIComponent(text)}`);
        if (response.ok) {
            return await response.text();
        }
    } catch (e) {
        console.error("Profanity fetch failed, falling back to original", e);
    }
    return text;
};

const runSafely = async (label, fn) => {
    try {
        await fn();
    } catch (error) {
        console.error(`CHAT: ${label} failed: ${error.message}`);
    }
};

const broadcastOnlineUsers = (gatewaySocket) => {
    const users = Array.from(onlineUsers.entries()).map(([id, info]) => ({
        id,
        username: info.username
    }));

    gatewaySocket.emit("chat_online_users_update", {
        broadcast: true,
        data: { users }
    });
};

const handleUserConnect = (gatewaySocket, payload) => {
    const { clientId, username } = payload;
    console.log(`CHAT: User connected: ${clientId} (${username})`);
    onlineUsers.set(clientId, { username });
    broadcastOnlineUsers(gatewaySocket);
};

const handleUserDisconnect = (gatewaySocket, payload) => {
    const { clientId } = payload;
    console.log(`CHAT: User disconnected: ${clientId}`);
    onlineUsers.delete(clientId);
    gamePairings.delete(clientId);
    globalChatCooldowns.delete(clientId);
    broadcastOnlineUsers(gatewaySocket);
};

const handleGlobalChat = async (gatewaySocket, payload) => {
    const { clientId, username, text } = payload;

    // 1. Rate limiting protection
    const now = Date.now();
    const lastMsgTime = globalChatCooldowns.get(clientId) || 0;
    if (now - lastMsgTime < GLOBAL_COOLDOWN_MS) {
        gatewaySocket.emit("chat_error", {
            clientId,
            data: { message: "Please wait 2 seconds between messages." }
        });
        return;
    }
    globalChatCooldowns.set(clientId, now);

    // 2. Bad words filter
    const safeText = await filterMessage(text);
    console.log(`CHAT: Global message from ${username}: ${safeText}`);

    gatewaySocket.emit("chat_global_receive", {
        broadcast: true,
        data: { author: username, text: safeText }
    });
};

const handleFriendSend = async (gatewaySocket, payload) => {
    const { clientId, username, targetId, text } = payload;
    console.log(`CHAT: Friend message from ${username} to ${targetId}: ${text}`);

    // Only private friend messages are stored in MongoDB.
    await saveFriendMessage(clientId, targetId, username, text);

    if (onlineUsers.has(targetId)) {
        gatewaySocket.emit("chat_friend_receive", {
            clientId: targetId,
            data: { friendId: clientId, author: username, text, isMe: false }
        });
    }

    gatewaySocket.emit("chat_friend_receive", {
        clientId,
        data: { friendId: targetId, author: username, text, isMe: true }
    });
};

const handleFriendHistory = async (gatewaySocket, payload) => {
    const { clientId, targetId } = payload;
    console.log(`CHAT: History request from ${clientId} for conversation with ${targetId}`);

    const messages = await getFriendMessages(clientId, targetId);
    
    gatewaySocket.emit("chat_friend_history_response", {
        clientId,
        data: {
            targetId,
            messages: messages.map((message) => ({
                from: message.fromId,
                author: message.authorName,
                text: message.text,
                isMe: message.fromId === clientId,
                timestamp: message.timestamp
            }))
        }
    });
};

const handleGetOnlineUsers = (gatewaySocket, payload) => {
    const { clientId } = payload;

    const users = Array.from(onlineUsers.entries())
        .filter(([id]) => id !== clientId)
        .map(([id, info]) => ({ id, username: info.username }));

    gatewaySocket.emit("chat_online_users", {
        clientId,
        data: { users }
    });
};

const handleInGameSend = (gatewaySocket, payload) => {
    const { clientId, presetId } = payload;
    const text = PRESET_MESSAGES[presetId];
    if (!text) return;

    const opponentId = gamePairings.get(clientId);
    if (!opponentId) return;

    const username = onlineUsers.get(clientId)?.username || "Player";

    gatewaySocket.emit("chat_ingame_receive", {
        clientId: opponentId,
        data: { from: clientId, author: username, presetId, text }
    });

    gatewaySocket.emit("chat_ingame_receive", {
        clientId,
        data: { from: clientId, author: username, presetId, text, isMe: true }
    });
};

const handleGameStart = (payload) => {
    const { player1Id, player2Id } = payload;
    console.log(`CHAT: Game pairing: ${player1Id} vs ${player2Id}`);
    gamePairings.set(player1Id, player2Id);
    gamePairings.set(player2Id, player1Id);
};

const handleGameEnd = (payload) => {
    const { player1Id, player2Id } = payload;
    console.log(`CHAT: Game ended: ${player1Id} vs ${player2Id}`);
    gamePairings.delete(player1Id);
    gamePairings.delete(player2Id);
};

const handleGatewayDisconnect = (gatewaySocket) => {
    console.log("CHAT: Gateway disconnected:", gatewaySocket.id);
    onlineUsers.clear();
    gamePairings.clear();
    globalChatCooldowns.clear();
};

export const setupChatHandlers = (io) => {
    io.on("connection", (gatewaySocket) => {
        console.log("CHAT: Gateway connected:", gatewaySocket.id);

        gatewaySocket.on("chat_user_connect", (payload) => 
            runSafely("chat_user_connect", () => handleUserConnect(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_user_disconnect", (payload) => 
            runSafely("chat_user_disconnect", () => handleUserDisconnect(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_get_online_users", (payload) => 
            runSafely("chat_get_online_users", () => handleGetOnlineUsers(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_ingame_send", (payload) => 
            runSafely("chat_ingame_send", () => handleInGameSend(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_game_start", (payload) => 
            runSafely("chat_game_start", () => handleGameStart(payload))
        );
        gatewaySocket.on("chat_game_end", (payload) => 
            runSafely("chat_game_end", () => handleGameEnd(payload))
        );

        gatewaySocket.on("chat_global", (payload) => 
            runSafely("chat_global", async () => await handleGlobalChat(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_friend_send", (payload) => 
            runSafely("chat_friend_send", () => handleFriendSend(gatewaySocket, payload))
        );
        gatewaySocket.on("chat_friend_history", (payload) => 
            runSafely("chat_friend_history", async () => await handleFriendHistory(gatewaySocket, payload))
        );

        gatewaySocket.on("disconnect", () => 
            runSafely("disconnect", () => handleGatewayDisconnect(gatewaySocket))
        );
    });
};
