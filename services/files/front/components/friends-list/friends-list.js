import { getFriendsList } from "../../js/friends/friend-command.js";


class FriendsList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
        this.loadFriendsList();
    }

    async loadFriendsList() {
        const friendsListContainer = this.shadowRoot.querySelector('.friends-list');
        friendsListContainer.innerHTML = '';

        const data = await getFriendsList();
        data.friends.forEach(friend => {
            console.log(friend);
            const friendItem = document.createElement('div');
            friendItem.classList.add('friend-item');

            // Icon wrapper
            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('pp-wrapper');


            // Image element for profile picture
            const image = document.createElement('img');
            const randId = Math.floor(Math.random() * 29);
            image.src = friend.profilePictureUrl || `https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/${randId}.png`;

            // Is online status indicator
            const statusIndicator = document.createElement('span');
            statusIndicator.classList.add('status-indicator');
            const status = ["Online", "Offline", "In Game"];
            const randStatus = Math.floor(Math.random() * 3);
            statusIndicator.classList.add(status[randStatus].toLowerCase().replace(/\s/g, '-'));

            iconWrapper.appendChild(image);
            iconWrapper.appendChild(statusIndicator);

            // Text wrapper
            const textWrapper = document.createElement('div');
            textWrapper.classList.add('friend-text');
            textWrapper.classList.add(status[randStatus].toLowerCase().replace(/\s/g, '-'));


            // Item text
            const text = document.createElement('span');
            text.classList.add('friend-status');
            text.textContent = status[randStatus];

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
}

customElements.define('friends-list', FriendsList);
