export class GameCard extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const html = await fetch('/components/game-card/game-card.html').then(res => res.text());
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const template = tempDiv.querySelector('template');
        const style = document.createElement('style');
        style.setAttribute('rel', 'stylesheet');
        style.textContent = `@import "/components/game-card/game-card.css";`;
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        const result = this.getAttribute('result');
        const mode = this.getAttribute('mode');
        const date = this.getAttribute('date');
        let opponentPp = this.getAttribute('opponentPp');
        const opponentUsername = this.getAttribute('opponentUsername');
        const resultClass = result === "Victory" ? "victory" : result === "Defeat" ? "defeat" : "draw";
        this.shadowRoot.querySelector(".game-result").classList.add(resultClass);
        this.shadowRoot.querySelector(".game-result").textContent = result;
        this.shadowRoot.querySelector(".game-mode").textContent = mode;
        this.shadowRoot.querySelector(".game-date").textContent = date;
        if(!opponentPp) {
            opponentPp = "https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png";
        }
        this.shadowRoot.querySelector("#opponent-profile-pic").src = opponentPp;
        this.shadowRoot.querySelector('.opponent-username').textContent = opponentUsername;
        this.shadowRoot.querySelector('.turn-count').textContent = `Turns: ${this.getAttribute('turnCount')}`;
        const eloChange = parseInt(this.getAttribute('eloChange'), 10) || 0;
        this.shadowRoot.querySelector('.elo-change').textContent = `Elo change: ${eloChange > 0 ? '+' : ''}${eloChange}`;
    }
}

customElements.define('game-card', GameCard);