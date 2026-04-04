class PlayerIcon extends HTMLElement {
    static get observedAttributes() {
        return ['name', 'rating', 'color'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const cssPath = new URL('./player-icon.css', import.meta.url).href;

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${cssPath}">
            <div class="player-icon-container">
                <div class="player-avatar"></div>
                <div class="player-info">
                    <span class="player-name"></span>
                    <span class="player-rating"></span>
                </div>
            </div>
        `;
        this._update();
    }

    attributeChangedCallback() {
        this._update();
    }

    _update() {
        if (!this.shadowRoot.querySelector('.player-name')) return;
        const name = this.getAttribute('name') || 'Player';
        const rating = this.getAttribute('rating') || '';
        const color = this.getAttribute('color') || '#ccc';
        const theme = this.getAttribute('theme') || 'default';
        this.shadowRoot.querySelector('.player-name').textContent = name;
        this.shadowRoot.querySelector('.player-rating').textContent = rating ? `(${rating})` : '';
        this.shadowRoot.querySelector('.player-avatar').style.background = color;
        this.shadowRoot.querySelector(".player-icon-container").className = `player-icon-container ${theme}`;
    }

    showBubble(text) {
        const container = this.shadowRoot.querySelector('.player-icon-container');
        if (!container) return;
        
        const existing = container.querySelectorAll('.chat-bubble');
        existing.forEach(el => el.remove());

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        if (this.getAttribute('bubble-dir') === 'down') {
            bubble.classList.add('down');
        }

        if (text && text.startsWith('emote:')) {
            const emoteName = text.split(':')[1];
            const img = document.createElement('img');
            if (emoteName === 'teemo') img.src = '/assets/emotes/teemo-thumbs-up.png';
            else if (emoteName === 'lulu') img.src = '/assets/emotes/lulu-shrug.png';
            else if (emoteName === 'yasuo') img.src = '/assets/emotes/yasuo-ez.png';
            else if (emoteName === 'lee') img.src = '/assets/emotes/lee-sin-facepalm.png';
            bubble.appendChild(img);
        } else {
            bubble.textContent = text;
        }

        container.appendChild(bubble);

        setTimeout(() => {
            if (bubble.parentElement) {
                bubble.remove();
            }
        }, 5000);
    }
}

customElements.define('player-icon', PlayerIcon);