import { CONFIG } from "../../js/config.js";
import { getMyJWT } from "../../js/controllers/user-controller.js";

const MOCK_ONLINE_FRIENDS = [
    { id: 'mock1', username: 'Alice' },
    { id: 'mock2', username: 'Bob' }
];

const MOCK_OFFLINE_FRIENDS = [
    { id: 'mock3', username: 'Charlie' },
    { id: 'mock4', username: 'Diana' }
];

class Chat extends HTMLElement {
    #activeTab = 'global';
    #socket = null;
    #clientId = null;
    #username = null;
    #selectedFriendId = null;
    #onlineUsers = [];

    #globalMessages = JSON.parse(sessionStorage.getItem('chat_global_messages') || '[]');
    #friendMessages = {};
    #ingameMessages = [];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['show-in-game-tab'];
    }

    async connectedCallback() {
        const [htmlText, cssText] = await Promise.all([
            fetch('/components/chat/chat.html').then(r => r.text()),
            fetch('/components/chat/chat.css').then(r => r.text())
        ]);

        const style = document.createElement('style');
        style.textContent = cssText;
        this.shadowRoot.appendChild(style);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        const template = tempDiv.querySelector('template');
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#setupTabs();
        this.#setupGlobalInput();
        this.#setupFriendsView();
        this.#setupInGamePresets();
        this.#setupMinimize();
        this.#updateInGameTabVisibility();

        await this.#initSocket();
        
        this.#renderCurrentTab();
    }

    disconnectedCallback() {
        if (this.#socket) {
            this.#socket.disconnect();
            this.#socket = null;
        }
    }

    attributeChangedCallback(name) {
        if (name === 'show-in-game-tab') {
            this.#updateInGameTabVisibility();
        }
    }

    async #initSocket() {
        const gatewayUrl = CONFIG.GATEWAY_URL || "http://localhost:8000";
        const jwt = getMyJWT();
        if (!jwt) {
            return;
        }

        try {
            const res = await fetch(`${gatewayUrl}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.#username = data.username;
            }
        } catch (e) {
            console.error('Chat: could not fetch username', e);
        }

        this.#socket = io(gatewayUrl + '/chat');

        this.#socket.on('connect', () => {
            this.#socket.emit('chat_init', {
                clientJWT: jwt,
                username: this.#username || 'Anonymous'
            });
        });

        this.#socket.on('chat_init_ok', ({ clientId }) => {
            this.#clientId = clientId;
            this.#socket.emit('chat_get_online_users', {});
        });

        this.#socket.on('chat_global_receive', ({ author, text, senderId }) => {
            const isMe = senderId === this.#clientId;
            
            // Maximum 50 messages to not overflow sessionStorage
            if (this.#globalMessages.length > 50) this.#globalMessages.shift();
            
            this.#globalMessages.push({ author, text, isMe });
            sessionStorage.setItem('chat_global_messages', JSON.stringify(this.#globalMessages));
            
            if (this.#activeTab === 'global') this.#renderGlobalMessages();
        });

        this.#socket.on('chat_friend_receive', ({ from, author, text, isMe, targetId }) => {
            const friendId = isMe ? targetId : from;
            if (!this.#friendMessages[friendId]) this.#friendMessages[friendId] = [];
            this.#friendMessages[friendId].push({ author, text, isMe: !!isMe });
            if (this.#activeTab === 'friends' && this.#selectedFriendId === friendId) {
                this.#renderFriendConversation();
            }
        });

        this.#socket.on('chat_friend_history_response', ({ targetId, messages }) => {
            this.#friendMessages[targetId] = messages.map(m => ({
                author: m.author,
                text: m.text,
                isMe: m.isMe
            }));
            if (this.#selectedFriendId === targetId) {
                this.#renderFriendConversation();
            }
        });

        this.#socket.on('chat_online_users', ({ users }) => {
            this.#onlineUsers = users;
            this.#renderFriendList();
        });

        this.#socket.on('chat_online_users_update', ({ users }) => {
            this.#onlineUsers = users.filter(u => u.id !== this.#clientId);
            this.#renderFriendList();
        });

        this.#socket.on('chat_ingame_receive', ({ author, text, isMe }) => {
            this.#ingameMessages.push({ author, text, isMe: !!isMe });
            if (this.#activeTab === 'in-game') this.#renderIngameMessages();
        });
    }

    #setupTabs() {
        const tabs = this.shadowRoot.querySelectorAll('.tab');
        const views = this.shadowRoot.querySelectorAll('.chat-view');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.#activeTab = tab.dataset.tab;

                views.forEach(v => v.classList.remove('active'));
                const targetView = this.shadowRoot.querySelector(`.chat-view[data-view="${this.#activeTab}"]`);
                if (targetView) targetView.classList.add('active');

                this.#renderCurrentTab();
            });
        });
    }

    #renderCurrentTab() {
        if (this.#activeTab === 'global') {
            this.#renderGlobalMessages();
            this.#focusInput('global-input');
        } else if (this.#activeTab === 'friends') {
            this.#renderFriendList();
            if (this.#selectedFriendId) {
                this.#focusInput('friend-input');
            }
        } else if (this.#activeTab === 'in-game') {
            this.#renderIngameMessages();
        }
    }

    #focusInput(inputId) {
        setTimeout(() => {
            const input = this.shadowRoot.getElementById(inputId);
            if (input) input.focus();
        }, 50);
    }

    #updateInGameTabVisibility() {
        const show = this.hasAttribute('show-in-game-tab');
        const inGameTab = this.shadowRoot.querySelector('.tab[data-tab="in-game"]');
        if (inGameTab) {
            inGameTab.style.display = show ? '' : 'none';
            if (show) {
                inGameTab.click();
            } else if (this.#activeTab === 'in-game') {
                const globalTab = this.shadowRoot.querySelector('.tab[data-tab="global"]');
                if (globalTab) globalTab.click();
            }
        }
    }

    #setupGlobalInput() {
        const input = this.shadowRoot.getElementById('global-input');
        const sendBtn = this.shadowRoot.getElementById('global-send');
        if (!input || !sendBtn) return;

        const send = () => {
            const text = input.value.trim();
            if (!text || !this.#isRealtimeEnabled()) return;
            this.#socket.emit('chat_global', {
                username: this.#username || 'Anonymous',
                text
            });
            input.value = '';
        };

        sendBtn.addEventListener('click', send);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    }

    #renderGlobalMessages() {
        const container = this.shadowRoot.getElementById('global-messages');
        if (!container) return;
        container.innerHTML = '';
        this.#globalMessages.forEach(msg => {
            container.appendChild(this.#buildMessageEl(msg));
        });
        container.scrollTop = container.scrollHeight;
    }

    #setupFriendsView() {
        const backBtn = this.shadowRoot.getElementById('friend-back-btn');
        const input = this.shadowRoot.getElementById('friend-input');
        const sendBtn = this.shadowRoot.getElementById('friend-send');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.#selectedFriendId = null;
                this.#showFriendList();
            });
        }

        if (input && sendBtn) {
            const send = () => {
                const text = input.value.trim();
                if (!text || !this.#selectedFriendId) return;

                if (this.#isRealtimeEnabled()) {
                    this.#socket.emit('chat_friend_send', {
                        username: this.#username || 'Anonymous',
                        targetId: this.#selectedFriendId,
                        text
                    });
                } else {
                    this.#addLocalMockFriendMessage(this.#selectedFriendId, text);
                }
                input.value = '';
            };
            sendBtn.addEventListener('click', send);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
        }
    }

    #renderFriendList() {
        const list = this.shadowRoot.getElementById('friend-list-items');
        if (!list) return;
        list.innerHTML = '';

        const onlineUsers = this.#onlineUsers.length > 0
            ? this.#onlineUsers
            : [...MOCK_ONLINE_FRIENDS];

        const onlineIds = new Set(onlineUsers.map(user => user.id));
        const offlineUsers = MOCK_OFFLINE_FRIENDS.filter(user => !onlineIds.has(user.id));

        this.#appendFriendSection(list, 'Online', onlineUsers, true);
        this.#appendFriendSection(list, 'Offline', offlineUsers, false);
    }

    #appendFriendSection(container, title, users, isOnline) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'friend-section-title';
        sectionTitle.textContent = title;
        container.appendChild(sectionTitle);

        if (users.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'friend-empty';
            empty.textContent = `No ${title.toLowerCase()} users`;
            container.appendChild(empty);
            return;
        }

        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'friend-item';

            const avatar = document.createElement('div');
            avatar.className = 'friend-avatar';
            avatar.textContent = (user.username || '?')[0].toUpperCase();

            const name = document.createElement('span');
            name.className = 'friend-item-name';
            name.textContent = user.username;

            const status = document.createElement('span');
            status.className = `friend-status${isOnline ? '' : ' offline'}`;

            item.appendChild(avatar);
            item.appendChild(name);
            item.appendChild(status);

            item.addEventListener('click', () => {
                this.#selectedFriendId = user.id;
                this.#openFriendConversation(user.id, user.username);
            });

            container.appendChild(item);
        });
    }

    #openFriendConversation(friendId, friendName) {
        const friendList = this.shadowRoot.getElementById('friend-list');
        const conversation = this.shadowRoot.getElementById('friend-conversation');
        const nameEl = this.shadowRoot.getElementById('friend-name');

        if (friendList) friendList.style.display = 'none';
        if (conversation) conversation.style.display = 'flex';
        if (nameEl) nameEl.textContent = friendName;

        if (this.#isRealtimeEnabled()) {
            this.#socket.emit('chat_friend_history', { targetId: friendId });
        } else if (!this.#friendMessages[friendId]) {
            this.#friendMessages[friendId] = [
                { author: friendName, text: 'Hey! This is a mock friend chat.', isMe: false }
            ];
        }

        this.#renderFriendConversation();
        this.#focusInput('friend-input');
    }

    #addLocalMockFriendMessage(friendId, text) {
        if (!this.#friendMessages[friendId]) this.#friendMessages[friendId] = [];

        this.#friendMessages[friendId].push({
            author: this.#username || 'Me',
            text,
            isMe: true
        });

        const friendName = this.#onlineUsers.find(u => u.id === friendId)?.username || 'Friend';
        this.#friendMessages[friendId].push({
            author: friendName,
            text: 'Mock reply: noted 👍',
            isMe: false
        });

        if (this.#activeTab === 'friends' && this.#selectedFriendId === friendId) {
            this.#renderFriendConversation();
        }
    }

    #showFriendList() {
        const friendList = this.shadowRoot.getElementById('friend-list');
        const conversation = this.shadowRoot.getElementById('friend-conversation');
        if (friendList) friendList.style.display = '';
        if (conversation) conversation.style.display = 'none';
    }

    #renderFriendConversation() {
        const container = this.shadowRoot.getElementById('friend-messages');
        if (!container) return;
        container.innerHTML = '';
        const msgs = this.#friendMessages[this.#selectedFriendId] || [];
        msgs.forEach(msg => {
            container.appendChild(this.#buildMessageEl(msg));
        });
        container.scrollTop = container.scrollHeight;
    }

    #setupInGamePresets() {
        const buttons = this.shadowRoot.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetId = btn.dataset.preset;
                if (!this.#isRealtimeEnabled() || !presetId) return;
                this.#socket.emit('chat_ingame_send', { presetId });
            });
        });
    }

    #renderIngameMessages() {
        const container = this.shadowRoot.getElementById('ingame-messages');
        if (!container) return;
        container.innerHTML = '';
        this.#ingameMessages.forEach(msg => {
            container.appendChild(this.#buildMessageEl(msg));
        });
        container.scrollTop = container.scrollHeight;
    }

    #setupMinimize() {
        const wrapper    = this.shadowRoot.querySelector('.chat-wrapper');
        const minimizeBtn = this.shadowRoot.querySelector('.minimize-btn');
        const bar        = this.shadowRoot.querySelector('.minimize-bar');

        if (minimizeBtn && wrapper) {
            minimizeBtn.addEventListener('click', () => {
                wrapper.classList.add('collapsed');
            });
        }

        if (bar && wrapper) {
            bar.addEventListener('click', () => {
                wrapper.classList.remove('collapsed');
                this.#renderCurrentTab(); // Automatically focus the correct input when expanding
            });
        }
    }

    #isRealtimeEnabled() {
        return !!this.#socket?.connected;
    }

    #buildMessageEl({ author, text, isMe }) {
        const div = document.createElement('div');
        div.className = 'message' + (isMe ? ' me' : '');

        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = author;

        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = text;

        div.appendChild(authorSpan);
        div.appendChild(textSpan);
        return div;
    }

}

customElements.define('laser-chat', Chat);
