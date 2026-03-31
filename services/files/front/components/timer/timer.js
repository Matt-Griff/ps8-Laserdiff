class TimerComponent extends HTMLElement {
    static get observedAttributes() {
        return ['time'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._interval = null;
        this._seconds = 0;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const cssPath = new URL('./timer.css', import.meta.url).href;
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${cssPath}">
            <div class="timer-container">
                <span class="timer-value"></span>
            </div>
        `;
        this._setInitialTime();
        this._updateDisplay();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'time') {
            this._setInitialTime();
            this._updateDisplay();
        }
    }

    _setInitialTime() {
        const timeStr = this.getAttribute('time') || '00:00';
        const [min, sec] = timeStr.split(':').map(Number);
        this._seconds = min * 60 + sec;
    }

    _updateDisplay() {
        if (!this.shadowRoot.querySelector('.timer-value')) return;
        const min = Math.floor(this._seconds / 60).toString().padStart(2, '0');
        const sec = (this._seconds % 60).toString().padStart(2, '0');
        this.shadowRoot.querySelector('.timer-value').textContent = `${min}:${sec}`;
    }

    start() {
        if (this._interval) return;
        this._interval = setInterval(() => {
            if (this._seconds > 0) {
                this._seconds--;
                this._updateDisplay();
                if (this._seconds === 0) {
                    this.stop();
                    this.dispatchEvent(new CustomEvent('timeout'));
                }
            } else {
                this.stop();
                this.dispatchEvent(new CustomEvent('timeout'));
            }
        }, 1000);
    }

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }
}

customElements.define('game-timer', TimerComponent);
