class NotificationDuel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.pendingNotifications = [];
        this.activeNotification = null;
        this.activeTimeoutId = null;
        this.ui = null;
        this.canPlaySound = false;
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

        this.ui = {
            container: this.shadowRoot.getElementById("notification-duel-container"),
            nameSpan: this.shadowRoot.getElementById("challenger-name"),
            acceptButton: this.shadowRoot.getElementById("accept-button"),
            declineButton: this.shadowRoot.getElementById("decline-button"),
            timeRemaining: this.shadowRoot.getElementById("timeRemaining"),
        };

        this.ui.acceptButton.addEventListener("click", () => this.handleDuelDecision(true));
        this.ui.declineButton.addEventListener("click", () => this.handleDuelDecision(false));

        this.initAudioUnlock();

        this.processNextNotification();
    }

    initAudioUnlock() {
        const unlockAudio = () => {
            this.canPlaySound = true;
        };

        window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
        window.addEventListener("keydown", unlockAudio, { once: true });
        window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    }

    displayDuelRequest(challengerID, challengerName, timeoutSeconds, socket, username, jwt) {
        console.log("Displaying duel request from", challengerName);
        this.pendingNotifications.push({
            type: "request",
            challengerID,
            challengerName,
            timeoutSeconds,
            socket,
            username,
            jwt
        });
        this.processNextNotification();
    }

    displayDuelResult(id, username, accept) {
        this.pendingNotifications.push({
            type: "result",
            id,
            username,
            accept,
        });
        this.processNextNotification();
    }

    processNextNotification() {
        if (!this.ui || this.activeNotification) {
            return;
        }

        const nextNotification = this.pendingNotifications.shift();
        if (!nextNotification) {
            this.hideNotification();
            return;
        }

        this.activeNotification = nextNotification;
        const { container, nameSpan, acceptButton, declineButton } = this.ui;
        container.classList.remove("not-visible");

        if (nextNotification.type === "request") {
            acceptButton.style.display = "inline-block";
            declineButton.style.display = "inline-block";
            nameSpan.textContent = nextNotification.challengerName + " has challenged you!";
            this.scheduleNotificationEnd(nextNotification.timeoutSeconds * 1000);
            return;
        }

        acceptButton.style.display = "none";
        declineButton.style.display = "none";

        if (nextNotification.accept) {
            nameSpan.textContent = `The duel with ${nextNotification.username} has been accepted!`;
            window.location.href = `../game/game.html?mode=duel&opponentId=${nextNotification.id}`;
            return;
        }

        nameSpan.textContent = `The duel with ${nextNotification.username} has been declined.`;
        this.scheduleNotificationEnd(5000);
    }

    handleDuelDecision(accept) {
        if (!this.activeNotification || this.activeNotification.type !== "request") {
            return;
        }

        const { socket, challengerID, username, jwt } = this.activeNotification;
        socket.emit("duel_response", { requesterClientId: challengerID, accept, username, clientJWT: jwt });
        this.finishActiveNotification();
    }

    scheduleNotificationEnd(delayMs) {
        if (this.activeTimeoutId) {
            clearTimeout(this.activeTimeoutId);
        }

        this.startTimeRemainingAnimation(delayMs);

        this.activeTimeoutId = setTimeout(() => {
            this.finishActiveNotification();
        }, delayMs);
    }

    startTimeRemainingAnimation(delayMs) {
        const timeRemaining = this.ui?.timeRemaining;
        if (!timeRemaining) {
            return;
        }

        timeRemaining.classList.remove("running");
        timeRemaining.style.animationDuration = `${delayMs}ms`;
        void timeRemaining.offsetWidth;
        timeRemaining.classList.add("running");
        this.playSound("/assets/music/queue.m4a");
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

    resetTimeRemainingAnimation() {
        const timeRemaining = this.ui?.timeRemaining;
        if (!timeRemaining) {
            return;
        }

        timeRemaining.classList.remove("running");
        timeRemaining.style.animationDuration = "";
        timeRemaining.style.transform = "scaleX(1)";
    }

    finishActiveNotification() {
        if (this.activeTimeoutId) {
            clearTimeout(this.activeTimeoutId);
            this.activeTimeoutId = null;
        }

        this.activeNotification = null;
        this.hideNotification();
        this.processNextNotification();
    }

    hideNotification() {
        if (!this.ui) {
            return;
        }

        const { container, acceptButton, declineButton } = this.ui;
        container.classList.add("not-visible");
        acceptButton.style.display = "inline-block";
        declineButton.style.display = "inline-block";
        this.resetTimeRemainingAnimation();
    }
}

customElements.define('notification-duel', NotificationDuel);