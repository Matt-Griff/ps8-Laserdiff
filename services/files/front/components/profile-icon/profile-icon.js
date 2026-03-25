import { CONFIG } from "../../js/config.js";
import { getMyJWT, getMyUsername } from "../../js/controllers/user-controller.js";

class ProfileIcon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        // Fetch and attach template and style
        const htmlString = await fetch('/components/profile-icon/profile-icon.html').then(response => response.text());
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        const template = tempDiv.querySelector('template');
        const style = document.createElement('link');
        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('href', '/components/profile-icon/profile-icon.css');
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        // Set profile name after rendering
        this.setProfileName();
        this.setStatus();
    }

    async setProfileName() {
        try {
            const res = await fetch(`${CONFIG.GATEWAY_URL}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${getMyJWT()}` }
            });
            if (res.ok) {
                const data = await res.json();
                const slot = this.shadowRoot.querySelector('slot#profile-name');
                if (slot) {
                    const assigned = slot.assignedNodes();
                    if (assigned.length > 0) {
                        assigned.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                                node.textContent = data.username;
                            }
                        });
                    } else {
                        const fallback = slot.querySelector('p');
                        if (fallback) fallback.textContent = data.username;
                    }
                }
                const profilePic = this.shadowRoot.querySelector('.profile-img');
                if (profilePic && data.pp) {
                    profilePic.src = data.pp;
                }

                const profileContainer = this.shadowRoot.querySelector('.profile-container');
                if (profileContainer) {
                    profileContainer.style.cursor = 'pointer';
                    profileContainer.addEventListener('click', () => {
                        const safeUsername = encodeURIComponent(data.username);
                        window.location.href = `../profile/profile.html?user=${safeUsername}`;
                    });
                }
            } else {
                console.error('Failed to fetch profile name');
            }
        } catch (e) {
            console.error('Error fetching profile name', e);
        }
    }

    async setStatus() {
        try {
            const res = await fetch(`${CONFIG.GATEWAY_URL}/api/user/` + getMyUsername() + `/status`, {
                headers: { 'Authorization': `Bearer ${getMyJWT()}` }
            });
            if (res.ok) {
                const data = await res.json();
                const status = data.status;
                const statusP = this.shadowRoot.querySelector('.status-indicator');
                if (statusP) {
                    statusP.textContent = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                    statusP.className = 'status-' + status.toLowerCase();
                }

            } else {
                console.error('Failed to fetch user status');
            }
        } catch (e) {
            console.error('Error fetching user status', e);
        }
    }
}

customElements.define('profile-icon', ProfileIcon);