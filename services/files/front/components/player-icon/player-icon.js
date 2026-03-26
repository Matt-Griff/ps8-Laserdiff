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
}

customElements.define('player-icon', PlayerIcon);