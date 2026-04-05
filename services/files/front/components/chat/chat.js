import { ChatSocket } from "../../js/socket/chat.js";
import { getFriendsList } from "../../js/friends/friend-command.js";

class Chat extends HTMLElement {
    #activeTab = 'global';
    #isSocketConnected = false;
    #clientId = null;
    #username = null;
    #pp = null;
    #selectedFriendId = null;
    #onlineUsers = [];
    #lastInGameMessageTime = 0;
    #lastLocalInGameMessage = null;
    #wasCollapsed = false;

    #globalMessages = JSON.parse(sessionStorage.getItem('chat_global_messages') || '[]');
    #friendMessages = {};

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
        if (!this.isConnected) return;

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

        const muteCheckbox = this.shadowRoot.getElementById('mute-ingame-checkbox');
        if (muteCheckbox) {
            muteCheckbox.checked = sessionStorage.getItem('ingame_muted') === 'true';
            muteCheckbox.addEventListener('change', (e) => {
                sessionStorage.setItem('ingame_muted', e.target.checked);
            });
        }
        
        this.chatSocket = new ChatSocket(this);
        
        this.#renderCurrentTab();

        document.addEventListener('open-chat-with-user', (e) => {
            const { userId, username } = e.detail;
            this.#setCollapsedState(false);
            
            const tab = this.shadowRoot.querySelector('.tab[data-tab="friends"]');
            if (tab) tab.click();
            
            this.#selectedFriendId = userId;
            this.#openFriendConversation(userId, username);
        });
    }

    #setCollapsedState(collapsed) {
        const wrapper = this.shadowRoot?.querySelector('.chat-wrapper');
        if (!wrapper || this.#wasCollapsed === collapsed) return;

        this.#wasCollapsed = collapsed;
        wrapper.classList.toggle('collapsed', collapsed);

        if (collapsed) {
            this.style.height = '50px';
            return;
        }

        this.style.removeProperty('height');
        this.#renderCurrentTab();
    }

    disconnectedCallback() {
        if (this.chatSocket) {
            this.chatSocket.disconnect();
            this.chatSocket = null;
        }
    }

    attributeChangedCallback(name) {
        if (name === 'show-in-game-tab') {
            this.#updateInGameTabVisibility();
        }
    }

    setSocketConnected(isConnected) {
        this.#isSocketConnected = isConnected;
    }

    setClientInfo(clientId, username, pp) {
        this.#clientId = clientId;
        this.#username = username;
        this.#pp = pp;
    }

    receiveGlobalMessage({ author, text }) {
        const isMe = author === this.#username;
        if (this.#globalMessages.length > 50) this.#globalMessages.shift();
        
        this.#globalMessages.push({ author, text, isMe });
        sessionStorage.setItem('chat_global_messages', JSON.stringify(this.#globalMessages));
        
        if (this.#activeTab === 'global') this.#renderGlobalMessages();
    }

    receiveSystemMessage(message) {
        if (this.#globalMessages.length > 50) this.#globalMessages.shift();
        this.#globalMessages.push({ author: 'System', text: message, isSystem: true });
        sessionStorage.setItem('chat_global_messages', JSON.stringify(this.#globalMessages));
        if (this.#activeTab === 'global') this.#renderGlobalMessages();
    }

    receiveFriendMessage({ friendId, author, text, isMe }) {
        if (!this.#friendMessages[friendId]) this.#friendMessages[friendId] = [];
        this.#friendMessages[friendId].push({ author, text, isMe: !!isMe });
        if (this.#activeTab === 'friends' && this.#selectedFriendId === friendId) {
            this.#renderFriendConversation();
        }
    }

    receiveFriendHistory(targetId, messages) {
        this.#friendMessages[targetId] = messages.map(m => ({
            author: m.author,
            text: m.text,
            isMe: m.isMe
        }));
        if (this.#selectedFriendId === targetId) {
            this.#renderFriendConversation();
        }
    }

    setOnlineUsers(users) {
        this.#onlineUsers = users;
        this.#renderFriendList();
    }

    updateOnlineUsers(users, clientId) {
        this.#onlineUsers = users.filter(u => u.id !== clientId);
        this.#renderFriendList();
    }

    receiveInGameMessage({ author, text, isMe }) {
        const isMuted = sessionStorage.getItem('ingame_muted') === 'true';
        if (!isMe && isMuted) return;

        // Avoid duplicate bubble when server echoes a just-sent local message.
        if (isMe && this.#lastLocalInGameMessage) {
            const { text: lastText, time } = this.#lastLocalInGameMessage;
            if (lastText === text && (Date.now() - time) < 2000) {
                this.#lastLocalInGameMessage = null;
                return;
            }
        }

        document.dispatchEvent(new CustomEvent('ingame-chat-message', {
            detail: { author, text, isMe }
        }));
    }

    #setupTabs() {
        const tabs = this.shadowRoot.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.#activateTab(tab.dataset.tab);
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
        }
    }

    #focusInput(inputId) {
        requestAnimationFrame(() => {
            const input = this.shadowRoot.getElementById(inputId);
            if (input) input.focus();
        });
    }

    #activateTab(tabName) {
        const targetTab = this.shadowRoot.querySelector(`.tab[data-tab="${tabName}"]`);
        if (!targetTab || targetTab.style.display === 'none') return false;

        const tabs = this.shadowRoot.querySelectorAll('.tab');
        const views = this.shadowRoot.querySelectorAll('.chat-view');

        tabs.forEach(t => t.classList.remove('active'));
        targetTab.classList.add('active');
        this.#activeTab = tabName;

        views.forEach(v => v.classList.remove('active'));
        const targetView = this.shadowRoot.querySelector(`.chat-view[data-view="${tabName}"]`);
        if (targetView) targetView.classList.add('active');

        this.#renderCurrentTab();
        return true;
    }

    activateInGameTab() {
        this.#activateTab('in-game');
    }

    #updateInGameTabVisibility() {
        const show = this.hasAttribute('show-in-game-tab');
        const inGameTab = this.shadowRoot.querySelector('.tab[data-tab="in-game"]');
        if (inGameTab) {
            inGameTab.style.display = show ? '' : 'none';
            if (show) {
                this.#activateTab('in-game');
            } else if (this.#activeTab === 'in-game') {
                this.#activateTab('global');
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
            this.dispatchEvent(new CustomEvent('chat-send-global', { detail: { text } }));
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
                    this.dispatchEvent(new CustomEvent('chat-send-friend', {
                        detail: { targetId: this.#selectedFriendId, text }
                    }));
                }
                input.value = '';
            };
            sendBtn.addEventListener('click', send);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
        }
    }

    async #renderFriendList() {
        const list = this.shadowRoot.getElementById('friend-list-items');
        if (!list) return;
        
        try {
            const data = await getFriendsList();
            const friends = data.friends || [];
            
            list.innerHTML = '';
            
            const onlineFriends = [];
            const offlineFriends = [];

            friends.forEach(f => {
                const friendObj = {
                    id: f._id || f.id,
                    username: f.username,
                    pp: f.pp,
                    status: f.status
                };
                if (f.status === 'online' || f.status === 'in-game') {
                    onlineFriends.push(friendObj);
                } else {
                    offlineFriends.push(friendObj);
                }
            });

            this.#appendFriendSection(list, 'Online', onlineFriends, true);
            this.#appendFriendSection(list, 'Offline', offlineFriends, false);
        } catch (e) {
            console.error('Failed to load friends in chat', e);
            list.innerHTML = '<div class="friend-empty">Error loading friends</div>';
        }
    }

    #appendFriendSection(container, title, friendsData, isOnline) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'friend-section-title';
        sectionTitle.textContent = title;
        container.appendChild(sectionTitle);

        if (friendsData.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'friend-empty';
            empty.textContent = `No ${title.toLowerCase()} friends`;
            container.appendChild(empty);
            return;
        }

        friendsData.forEach(user => {
            const item = document.createElement('div');
            item.className = 'friend-item';

            const avatar = document.createElement('img');
            const pp = user.pp || `https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png`;
            avatar.src = pp;
            avatar.alt = user.username;
            avatar.className = 'friend-avatar';

            const name = document.createElement('span');
            name.className = 'friend-item-name';
            name.textContent = user.username;

            const status = document.createElement('span');
            status.className = `friend-status ${user.status === 'in-game' ? 'in-game' : (isOnline ? 'online' : 'offline')}`;

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
            this.dispatchEvent(new CustomEvent('chat-request-friend-history', {
                detail: { targetId: friendId }
            }));
        }

        this.#renderFriendConversation();
        this.#focusInput('friend-input');
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
        const INGAME_PRESETS = {
            "hello": "Hello !",
            "bye": "Bye !",
            "good-luck": "Good luck !",
            "well-played": "Well played !",
            "good-game": "Good game !",
            "oops": "Oops !",
            "emote-teemo": "emote:teemo",
            "emote-lulu": "emote:lulu",
            "emote-yasuo": "emote:yasuo",
            "emote-lee": "emote:lee"
        };
        const buttons = this.shadowRoot.querySelectorAll('.preset-btn, .preset-img');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const now = Date.now();
                if (now - this.#lastInGameMessageTime < 3000) {
                    console.log("Please wait before sending another message.");
                    return;
                }

                const presetId = btn.dataset.preset;
                if (!presetId) return;

                this.#lastInGameMessageTime = now;

                const mode = this.getAttribute('data-mode');
                if (mode === 'ai') {
                    const text = INGAME_PRESETS[presetId];
                    if (text) {
                        // Fake dispatch my message locally
                        document.dispatchEvent(new CustomEvent('ingame-chat-message', {
                            detail: {
                                author: this.#username || 'Player 1',
                                text: text,
                                isMe: true
                            }
                        }));

                        // 50% chance AI replies with random emote/message.
                        if (Math.random() < 0.5) {
                            setTimeout(() => {
                                const isMuted = sessionStorage.getItem('ingame_muted') === 'true';
                                if (isMuted) return;

                                const aiOptions = ["oops", "well-played", "emote-teemo", "emote-lulu", "emote-yasuo", "emote-lee"];
                                const aiChoice = aiOptions[Math.floor(Math.random() * aiOptions.length)];
                                document.dispatchEvent(new CustomEvent('ingame-chat-message', {
                                    detail: {
                                        author: 'AI',
                                        text: INGAME_PRESETS[aiChoice],
                                        isMe: false
                                    }
                                }));
                            }, 1000);
                        }
                    }
                    return;
                }

                // If online, use socket
                const text = INGAME_PRESETS[presetId];
                if (text) {
                    document.dispatchEvent(new CustomEvent('ingame-chat-message', {
                        detail: {
                            author: this.#username || 'Player 1',
                            text,
                            isMe: true
                        }
                    }));
                    this.#lastLocalInGameMessage = { text, time: now };
                }

                if (!this.#isRealtimeEnabled()) return;
                this.dispatchEvent(new CustomEvent('chat-send-ingame', {
                    detail: { presetId }
                }));
            });
        });
    }

    #setupMinimize() {
        const minimizeBtn = this.shadowRoot.querySelector('.minimize-btn');
        const bar = this.shadowRoot.querySelector('.minimize-bar');

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.#setCollapsedState(true);
            });
        }

        if (bar) {
            bar.addEventListener('click', () => {
                this.#setCollapsedState(false);
            });
        }
    }

    #isRealtimeEnabled() {
        return this.#isSocketConnected;
    }

    #buildMessageEl({ author, text, isMe, isSystem }) {
        const div = document.createElement('div');
        div.className = 'message' + (isMe ? ' me' : '');

        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = author;

        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        
        if (text && text.startsWith('emote:')) {
            const emoteName = text.split(':')[1];
            const img = document.createElement('img');
            img.style.width = '40px';
            if (emoteName === 'teemo') img.src = '/assets/emotes/teemo-thumbs-up.png';
            else if (emoteName === 'lulu') img.src = '/assets/emotes/lulu-shrug.png';
            else if (emoteName === 'yasuo') img.src = '/assets/emotes/yasuo-ez.png';
            else if (emoteName === 'lee') img.src = '/assets/emotes/lee-sin-facepalm.png';
            textSpan.appendChild(img);
        } else {
            textSpan.textContent = text;
        }
        
        if (isSystem) {
            authorSpan.style.color = '#ff6b6b';
            textSpan.style.color = '#ff6b6b';
            textSpan.style.fontStyle = 'italic';
            textSpan.style.borderBottomColor = '#ff6b6b';
        }

        div.appendChild(authorSpan);
        div.appendChild(textSpan);
        return div;
    }

}

customElements.define('laser-chat', Chat);
