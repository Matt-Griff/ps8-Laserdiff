import { getMyUsername } from "../../js/controllers/user-controller.js";

class BurgerMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._ready = new Promise(resolve => this._resolveReady = resolve);
    }

    async connectedCallback() {
        let template = document.getElementsByClassName('burger-menu')[0];
        if (!template) {
            const htmlString = await fetch('/components/burger-menu/burger-menu.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');

            const disconnectScript = document.createElement('script');
            disconnectScript.type = 'module';
            disconnectScript.src = '/components/disconnect-button/disconnect-button.js';
            document.head.appendChild(disconnectScript);

            const script = document.createElement('script');
            script.type = 'module';
            script.src = '/components/explanation/explanation.js';
            document.head.appendChild(script);

            script.onload = () => {
                if (!document.querySelector('explanation-popup')) {
                    const explanationPopup = document.createElement('explanation-popup');
                    document.body.appendChild(explanationPopup);
                }
            };
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        const learnIcon = this.shadowRoot.querySelectorAll('.learn-icon');
        if (learnIcon) {
            learnIcon.forEach((icon) => {
                icon.addEventListener('click', () => {
                    const explanationPopup = document.querySelector('explanation-popup');
                    if (explanationPopup) {
                        explanationPopup.show();
                    }
                });
            });
        }

        // Very Important
        let audio = new Audio('/assets/music/home.m4a');
        audio.loop = true;
        audio.volume = 0.2;

        const soundIcon = this.shadowRoot.getElementById('sound-icon');
        const containerSound = this.shadowRoot.querySelector('.sound-controller');
        const soundLabel = this.shadowRoot.getElementById('sound-label');
        let isSoundOn = false;
        containerSound.addEventListener('click', () => {
            isSoundOn = !isSoundOn;
            soundIcon.src = isSoundOn ? '/assets/icon/sound-on.svg' : '/assets/icon/sound-off.svg';
            if (isSoundOn) {
                soundLabel.textContent = 'Pause music';
                audio.play();
            } else {
                soundLabel.textContent = 'Play music';
                audio.pause();
            }

        });


        const container = this.shadowRoot.querySelector('.burger-menu-container');
        const webMenu = this.shadowRoot.querySelector('.web-menu');
        if (container && webMenu) {
            container.addEventListener('mouseenter', () => {
                webMenu.classList.add('expanded');
                container.style.background = 'rgba(16, 22, 23, 1)';
            });
            container.addEventListener('mouseleave', () => {
                webMenu.classList.remove('expanded');
                container.style.background = 'rgba(16, 22, 23, 0.95)';
            });
        }

        if (window.location.pathname.includes('/pages/game/')) {
            const chatLink = this.shadowRoot.querySelector('.chat-item');
            if (chatLink) {
                chatLink.style.display = 'flex';
                chatLink.addEventListener('click', (e) => {
                    this.dispatchEvent(new CustomEvent('open-chat', { bubbles: true, composed: true }));
                });
            }
            const leaderboardLink = this.shadowRoot.querySelector('.leaderboard-item');
            if (leaderboardLink) {
                leaderboardLink.style.display = 'none';
            }
        } else {
            const chatLink = this.shadowRoot.querySelector('.chat-item');
            if (chatLink) {
                chatLink.style.display = 'none';
            }
            const leaderboardLink = this.shadowRoot.querySelector('.leaderboard-item');
            if (leaderboardLink) {
                leaderboardLink.style.display = 'flex';
            }
        }

        const profileLinks = this.shadowRoot.querySelectorAll('.profile-link');
        const username = await getMyUsername();
        if (username) {
            profileLinks.forEach((profileLink) => {
                profileLink.href = `/pages/profile/profile.html?user=${username}`;
            });
        } else {
            profileLinks.forEach((profileLink) => {
                profileLink.href = `/`;
            });
        }

        const menu = this.shadowRoot.querySelector('#see-more');
        const mobileMenuList = this.shadowRoot.querySelector('.mobile-menu-list');
        const seeMoreIcon = this.shadowRoot.querySelector('#see-more-icon');
        const seeMoreLabel = this.shadowRoot.querySelector('#see-more-label');
        if (menu && mobileMenuList) {
            menu.addEventListener('click', () => {
                if (mobileMenuList.classList.contains('expanded')) {
                    mobileMenuList.classList.remove('expanded');
                    seeMoreIcon.src = "/assets/icon/menu.svg";
                    seeMoreLabel.textContent = "Menu";
                } else {
                    mobileMenuList.classList.add('expanded');
                    seeMoreIcon.src = "/assets/icon/close.svg";
                    seeMoreLabel.textContent = "Close";
                }
            });
        }

        this._resolveReady();
    }

    async setLoggedIn(loggedIn) {
        await this._ready;
        const loginContainer = this.shadowRoot.querySelectorAll('.login-link');
        const profileLinks = this.shadowRoot.querySelectorAll('.profile-link');
        const logoutButton = this.shadowRoot.querySelectorAll('.disconnect-container');
        const playLinks = this.shadowRoot.querySelectorAll('.play-link');

        if (loggedIn) {
            if (loginContainer) {
                loginContainer.forEach((link) => {
                    link.style.display = 'none';
                });
            }
            profileLinks.forEach((profileLink) => {
                profileLink.style.display = 'flex';
            });
            if (logoutButton) {
                logoutButton.forEach((button) => {
                    button.style.display = 'block';
                });
            }
            playLinks.forEach((playLink) => {
                playLink.style.display = 'flex';
            });
        }
        else {
            if (loginContainer) {
                loginContainer.forEach((link) => {
                    link.style.display = 'flex';
                });
            }
            profileLinks.forEach((profileLink) => {
                profileLink.style.display = 'none';
            });
            if (logoutButton) {
                logoutButton.forEach((button) => {
                    button.style.display = 'none';
                });
            }
            playLinks.forEach((playLink) => {
                playLink.style.display = 'none';
            });
        }
    }
}

customElements.define('burger-menu', BurgerMenu);
