class NotificationDuel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.notificationTimers = new Map();
        this.ui = null;
        this.canPlaySound = false;
    }

    async connectedCallback() {
        let template = document.getElementById("notification-duel-template");
        if (!template) {
            const htmlString = await fetch('/components/notification-duel/notification-duel.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.ui = {
            stack: this.shadowRoot.getElementById("notification-duel-stack"),
        };

        this.initAudioUnlock();
    }

    disconnectedCallback() {
        for (const timeoutId of this.notificationTimers.values()) {
            clearTimeout(timeoutId);
        }
        this.notificationTimers.clear();
    }

    initAudioUnlock() {
        const unlockAudio = () => {
            this.canPlaySound = true;
        };

        window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
        window.addEventListener("keydown", unlockAudio, { once: true });
        window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    }

    displayDuelRequest(challengerID, challengerName, timeoutSeconds, socket, username, jwt, sound = false) {
        console.log("Displaying duel request from", challengerName);
        const timeoutMs = Math.max(0, Number(timeoutSeconds) || 30) * 1000;
        const notificationId = this.createNotificationId(`request-${challengerID || "unknown"}`);
        const card = this.createNotificationCard({
            notificationId,
            message: `${challengerName} has challenged you!`,
            timeoutMs,
            withActions: true,
        });

        const acceptButton = card.querySelector(".accept-button");
        const declineButton = card.querySelector(".decline-button");

        acceptButton.addEventListener("click", () => {
            socket.emit("duel_response", { requesterClientId: challengerID, accept: true, username, clientJWT: jwt });
            this.removeNotification(notificationId);
        });

        declineButton.addEventListener("click", () => {
            socket.emit("duel_response", { requesterClientId: challengerID, accept: false, username, clientJWT: jwt });
            this.removeNotification(notificationId);
        });

        this.mountNotification(notificationId, card, timeoutMs);

        if (sound) {
            this.playSound("/assets/music/queue.m4a");
        }
    }

    displayDuelResult(id, username, accept) {
        if (accept) {
            window.location.href = `../game/game.html?mode=duel&opponentId=${id}`;
            return;
        }

        const notificationId = this.createNotificationId("result");
        const card = this.createNotificationCard({
            notificationId,
            message: `The duel with ${username} has been declined.`,
            timeoutMs: 5000,
            withActions: false,
        });
        this.mountNotification(notificationId, card, 5000);
    }

    createNotificationId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    createNotificationCard({ notificationId, message, timeoutMs, withActions }) {
        const card = document.createElement("div");
        card.className = "notification-duel-card";
        card.dataset.notificationId = notificationId;

        const content = document.createElement("div");
        content.className = "notification-content";

        const messageSpan = document.createElement("span");
        messageSpan.textContent = message;
        content.appendChild(messageSpan);

        card.appendChild(content);

        if (withActions) {
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "button-container";

            const acceptButton = document.createElement("button");
            acceptButton.className = "accept-button";
            acceptButton.textContent = "Accept";

            const declineButton = document.createElement("button");
            declineButton.className = "decline-button";
            declineButton.textContent = "Decline";

            buttonContainer.appendChild(acceptButton);
            buttonContainer.appendChild(declineButton);
            card.appendChild(buttonContainer);
        }

        const timeRemaining = document.createElement("div");
        timeRemaining.className = "time-remaining-bar running";
        timeRemaining.style.animationDuration = `${timeoutMs}ms`;
        card.appendChild(timeRemaining);

        return card;
    }

    mountNotification(notificationId, card, timeoutMs) {
        const stack = this.ui?.stack;
        if (!stack) {
            return;
        }

        stack.classList.remove("not-visible");
        stack.prepend(card);
        const timeoutId = setTimeout(() => this.removeNotification(notificationId), timeoutMs);
        this.notificationTimers.set(notificationId, timeoutId);
    }

    playSound(src) {
        if (!this.canPlaySound) {
            console.warn("Sound playback is locked until user interaction. Cannot play sound:", src);
            return;
        }

        const audio = new Audio(src);
        audio.play().catch((error) => {
            if (error.name !== "NotAllowedError") {
                console.error(`Error playing sound: ${error.message}`);
            }
        });
    }

    removeNotification(notificationId) {
        const timeoutId = this.notificationTimers.get(notificationId);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        this.notificationTimers.delete(notificationId);

        const stack = this.ui?.stack;
        if (!stack) {
            return;
        }

        const card = stack.querySelector(`[data-notification-id="${notificationId}"]`);
        if (!card) {
            this.toggleStackVisibility();
            return;
        }

        card.classList.add("is-hiding");
        setTimeout(() => {
            card.remove();
            this.toggleStackVisibility();
        }, 180);
    }

    toggleStackVisibility() {
        const stack = this.ui?.stack;
        if (!stack) {
            return;
        }

        if (stack.children.length === 0) {
            stack.classList.add("not-visible");
            return;
        }

        stack.classList.remove("not-visible");
    }

    displayError(error) {
        const notificationId = this.createNotificationId("error");
        const card = this.createNotificationCard({
            notificationId,
            message: `Error: ${error?.message || error}`,
            timeoutMs: 5000,
            withActions: false,
        });
        this.mountNotification(notificationId, card, 5000);

    }
}

customElements.define('notification-duel', NotificationDuel);