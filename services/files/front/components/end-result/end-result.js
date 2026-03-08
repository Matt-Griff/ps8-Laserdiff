class EndResult extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        let template = document.querySelector('#end-result');
        const htmlString = await fetch("/components/end-result/end-result.html").then(response => response.text());
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        template = tempDiv.querySelector('template');
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    set_victorious(isVictorious = true) {
        const canvas = this.shadowRoot.querySelector('#end-result-canvas');
        if (!canvas) {
            console.error("Canvas element not found in shadow DOM.");
            return;
        }
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = isVictorious ? "/assets/victory.png" : "/assets/defeat.png";

        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 3000);
    }

    setCooked() {
        const canvas = this.shadowRoot.querySelector('#end-result-canvas');
        if (!canvas) {
            console.error("Canvas element not found in shadow DOM.");
            return;
        }
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.globalAlpha = 0;
            this.canChangeOpacity = true;
            this.changeOpacity(ctx, canvas, img);
        };
        img.src = "/assets/cooked.png";
        this.canChangeOpacity = true;
        setTimeout(() => {
            this.canChangeOpacity = false;
        }, 7000);
    }

    changeOpacity(ctx, canvas, img) {
        if (!this.canChangeOpacity) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        if (ctx.globalAlpha < 1) {
            ctx.globalAlpha += 0.003;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        }
        setTimeout(() => this.changeOpacity(ctx, canvas, img), 25);

    }



}
customElements.define("end-result", EndResult);