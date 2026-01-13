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

    async render() {
        const resp = await fetch('/components/timer/timer.css');
        const css = await resp.text();
        this.shadowRoot.innerHTML = `
            <style>${css}</style>
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

    // Add start/stop logic here
}

customElements.define('game-timer', TimerComponent);
