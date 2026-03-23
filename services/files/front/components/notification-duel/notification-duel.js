class NotificationDuel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

    }

    async connectedCallback() {
        let template = document.getElementById("notification-duel-container");
        if (!template) {
            const htmlString = await fetch('/components/notification-duel/notification-duel.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
}

customElements.define('notification-duel', NotificationDuel);