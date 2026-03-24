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

    displayDuelRequest(challengerID, challengerName, timeoutSeconds, socket, username) {
        console.log("Displaying duel request from", challengerName);
        const container = this.shadowRoot.getElementById("notification-duel-container");
        container.classList.remove("not-visible");
        const nameSpan = this.shadowRoot.getElementById("challenger-name");
        nameSpan.textContent = challengerName + " has challenged you!";
        setTimeout(() => {
            container.classList.add("not-visible");
        }, timeoutSeconds * 1000);
        const acceptButton = this.shadowRoot.getElementById("accept-button");
        const declineButton = this.shadowRoot.getElementById("decline-button");
        acceptButton.onclick = () => {
            socket.emit("duel_response", { requesterClientId: challengerID, accept: true, username });
            container.classList.add("not-visible");
        };
        declineButton.onclick = () => {
            socket.emit("duel_response", { requesterClientId: challengerID, accept: false, username });
            container.classList.add("not-visible");
        };
    }

    displayDuelResult(id, username, accept) {
        const container = this.shadowRoot.getElementById("notification-duel-container");
        if (container.classList.contains("not-visible")) {
            container.classList.remove("not-visible");
            const nameSpan = this.shadowRoot.getElementById("challenger-name");
            if (accept) {
                nameSpan.textContent = `The duel with ${username} has been accepted!`;
            } else {
                nameSpan.textContent = `The duel with ${username} has been declined.`;
            }
            const acceptButton = this.shadowRoot.getElementById("accept-button");
            const declineButton = this.shadowRoot.getElementById("decline-button");
            acceptButton.style.display = "none";
            declineButton.style.display = "none";
        }
    }
}

customElements.define('notification-duel', NotificationDuel);