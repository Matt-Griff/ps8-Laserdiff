class PieceSlot extends HTMLElement {
    static get observedAttributes() {
        return ['label', 'count', 'color', 'piece']; 
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const cssPath = new URL('./piece-slot.css', import.meta.url).href;

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${cssPath}">
            <div class="slot-container">
                <div class="slot-label"></div>
                <div class="slot-content">
                    <img class="piece-icon" src="" alt="piece" />
                    <div class="piece-count"></div>
                </div>
            </div>
        `;
        this._update();
    }

    attributeChangedCallback() {
        this._update();
    }

    _update() {
        if (!this.shadowRoot.querySelector('.slot-label')) return;

        const label = this.getAttribute('label');
        const count = this.getAttribute('count');
        const color = this.getAttribute('color');
        const piece = this.getAttribute('piece');

        this.shadowRoot.querySelector('.slot-label').textContent = label;
        this.shadowRoot.querySelector('.piece-count').textContent = `x${count}`;
        
        const img = this.shadowRoot.querySelector('.piece-icon');
        
        // Path to pieces
        const assetPath = new URL(`../../assets/pieces/${piece}_${color}.png`, import.meta.url).href;
        
        img.src = assetPath;
        img.alt = `${color} ${piece}`;
    }
}

customElements.define('piece-slot', PieceSlot);
