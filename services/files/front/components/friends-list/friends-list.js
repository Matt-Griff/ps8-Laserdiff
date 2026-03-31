import { getFriendsList } from "../../js/friends/friend-command.js";


class FriendsList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._ready = new Promise(resolve => this._resolveReady = resolve);
        this.isLoggedIn = false;
    }

    async connectedCallback() {
        let template = document.getElementsByClassName('friends-list')[0];
        if (!template) {
            const htmlString = await fetch('/components/friends-list/friends-list.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        await this._ready;
        this.loadFriendsList();
    }

    async loadFriendsList() {
        if (!this.isLoggedIn) {
            return;
        }
        const loginContainer = this.shadowRoot.getElementById('login-container');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        const friendsListContainer = this.shadowRoot.querySelector('.friends-list');
        friendsListContainer.innerHTML = '';
        friendsListContainer.style.display = 'block';

        const data = await getFriendsList();
        data.friends.forEach(friend => {
            const friendItem = document.createElement('div');
            friendItem.classList.add('friend-item');

            friendItem.addEventListener('mouseenter', () => {
                friendItem.classList.add('hovered');
            });

            friendItem.addEventListener('mouseleave', () => {
                friendItem.classList.remove('hovered');
            });

            friendItem.addEventListener('click', () => {
                const username = encodeURIComponent(friend.username);
                window.location.href = `../profile/profile.html?user=${username}`;
            });

            // Icon wrapper
            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('pp-wrapper');


            // Image element for profile picture
            const image = document.createElement('img');
            const pp = friend.pp;
            image.src = pp || `https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/${29}.png`;

            // Is online status indicator
            const statusIndicator = document.createElement('span');
            statusIndicator.classList.add('status-indicator');
            const status = friend.status ? friend.status.charAt(0).toUpperCase() + friend.status.slice(1) : 'Offline';
            statusIndicator.classList.add(status.toLowerCase() || 'offline');

            iconWrapper.appendChild(image);
            iconWrapper.appendChild(statusIndicator);

            // Text wrapper
            const textWrapper = document.createElement('div');
            textWrapper.classList.add('friend-text');
            textWrapper.classList.add(status.toLowerCase() || 'offline');


            // Item text
            const text = document.createElement('span');
            text.classList.add('friend-status');
            text.textContent = status;

            // Username element
            const username = document.createElement('span');
            username.classList.add('friend-username');
            username.textContent = friend.username;

            textWrapper.appendChild(username);
            textWrapper.appendChild(text);


            friendItem.appendChild(iconWrapper);
            friendItem.appendChild(textWrapper);
            friendsListContainer.appendChild(friendItem);
        });
    }

    setLoggedIn(loggedIn) {
        this.isLoggedIn = loggedIn;
        this._resolveReady();
    }
}

customElements.define('friends-list', FriendsList);
