import { CONFIG } from "../config.js";
import { getMyJWT } from "../controllers/user-controller.js";
import { Capacitor, registerPlugin } from "https://cdn.jsdelivr.net/npm/@capacitor/core@8.3.1/dist/index.min.js";

const LocalNotifications = registerPlugin("LocalNotifications");

export class ChatSocket {
    constructor(chatComponent) {
        this.chatComponent = chatComponent;
        this.socket = null;
        this.clientId = null;
        this.username = null;
        this.pp = null;
        this.jwt = getMyJWT();

        this.init();
    }

    async init() {
        if (!this.jwt) return;

        if (Capacitor.isNativePlatform()) {
            LocalNotifications.createChannel({
                id: 'chat-messages',
                name: 'Chat Messages',
                importance: 5,
                visibility: 1,
                sound: 'default',
                vibration: true,
            });

            LocalNotifications.addListener('localNotificationReceived', (notification) => {
                console.log('Notification received: ', notification);
            });
            LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
                console.log('Notification action performed: ', action);
                const extra = action.notification.extra;
                if (extra && extra.friendId && extra.author) {
                    document.dispatchEvent(new CustomEvent('open-chat-with-user', {
                        detail: { userId: extra.friendId, username: extra.author }
                    }));
                }
            });
        }

        const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";

        try {
            const res = await fetch(`${gatewayUrl}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${this.jwt}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.username = data.username;
                this.pp = data.pp;
                this.chatComponent.setClientInfo(this.clientId, this.username, this.pp);
            }
        } catch (e) {
            console.error('ChatCommunication: could not fetch username', e);
        }

        this.socket = io(gatewayUrl + '/chat');

        this.socket.on('connect', () => {
            this.socket.emit('chat_init', {
                clientJWT: this.jwt,
                username: this.username || 'Anonymous',
                pp: this.pp
            });
            this.chatComponent.setSocketConnected(true);
        });

        this.socket.on('disconnect', () => {
            this.chatComponent.setSocketConnected(false);
        });

        this.socket.on('chat_init_ok', ({ clientId }) => {
            this.clientId = clientId;
            this.chatComponent.setClientInfo(this.clientId, this.username, this.pp);
            this.socket.emit('chat_get_online_users', {});
        });

        this.socket.on('chat_global_receive', ({ author, text }) => {
            this.chatComponent.receiveGlobalMessage({ author, text });
        });

        this.socket.on('chat_error', ({ message }) => {
            this.chatComponent.receiveSystemMessage(message);
        });

        this.socket.on('chat_friend_receive', ({ friendId, author, text, isMe }) => {
            this.chatComponent.receiveFriendMessage({ friendId, author, text, isMe });

            if (!isMe && Capacitor.isNativePlatform()) {
                LocalNotifications.schedule({
                    notifications: [{
                        title: author,
                        body: text,
                        id: Math.floor(Math.random() * 2147483647),
                        schedule: { at: new Date(Date.now() + 1000) },
                        sound: 'default',
                        importance: 5,
                        visibility: 1,
                        channelId: 'chat-messages',
                        extra: { friendId: friendId, author: author }
                    }]
                });
            }
        });

        this.socket.on('chat_friend_history_response', ({ targetId, messages }) => {
            this.chatComponent.receiveFriendHistory(targetId, messages);
        });

        this.socket.on('chat_online_users', ({ users }) => {
            this.chatComponent.setOnlineUsers(users);
        });

        this.socket.on('chat_online_users_update', ({ users }) => {
            this.chatComponent.updateOnlineUsers(users, this.clientId);
        });

        this.socket.on('chat_ingame_receive', ({ author, text, isMe }) => {
            this.chatComponent.receiveInGameMessage({ author, text, isMe });
        });

        // Listen to events from the Chat component
        this.chatComponent.addEventListener('chat-send-global', (e) => {
            if (!this.socket?.connected) return;
            this.socket.emit('chat_global', {
                username: this.username || 'Anonymous',
                text: e.detail.text
            });
        });

        this.chatComponent.addEventListener('chat-send-friend', (e) => {
            if (!this.socket?.connected) return;
            this.socket.emit('chat_friend_send', {
                username: this.username || 'Anonymous',
                targetId: e.detail.targetId,
                text: e.detail.text
            });
        });

        this.chatComponent.addEventListener('chat-request-friend-history', (e) => {
            if (!this.socket?.connected) return;
            this.socket.emit('chat_friend_history', { targetId: e.detail.targetId });
        });

        this.chatComponent.addEventListener('chat-send-ingame', (e) => {
            if (!this.socket?.connected) return;
            this.socket.emit('chat_ingame_send', { presetId: e.detail.presetId });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
