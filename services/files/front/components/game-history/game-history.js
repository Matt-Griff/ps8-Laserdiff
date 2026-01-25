class GameHistory extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        let template = document.getElementsByClassName('game-history')[0];
        if (!template) {
            const htmlString = await fetch('/components/game-history/game-history.html').then(response => response.text());
            const css = await fetch('/components/game-history/game-history.css').then(response => response.text());
            const tempDiv = document.createElement('div');
            const style = document.createElement('link');
            style.setAttribute('rel', 'stylesheet');
            style.setAttribute('href', '/components/game-history/game-history.css');
            this.shadowRoot.appendChild(style);
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    addHistoryMove(round, playerID, piece, fromX, fromY, toX, toY, rotation) {
        const historyList = this.shadowRoot.querySelector('.move-list');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${round}</td>
            <td>${playerID}</td>
            <td>${piece}</td>
            <td>(${fromX}, ${fromY})</td>
            <td>(${toX}, ${toY})</td>
            <td>${rotation}</td>
        `;
        historyList.appendChild(row);
    }
}

customElements.define('game-history', GameHistory);