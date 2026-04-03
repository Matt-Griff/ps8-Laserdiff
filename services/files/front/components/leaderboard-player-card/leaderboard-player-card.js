export class LeaderboardPlayerCard extends HTMLElement {
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const html = await fetch('/components/leaderboard-player-card/leaderboard-player-card.html').then(res => res.text());
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const template = tempDiv.querySelector('template'); 
        const style = document.createElement('style');
        style.setAttribute('rel', 'stylesheet');
        style.textContent = `@import "/components/leaderboard-player-card/leaderboard-player-card.css";`;
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));      

        const rank = this.getAttribute('rank');
        const name = this.getAttribute('name');
        const elo = this.getAttribute('elo');
        const pp = this.getAttribute("pp");
        const league = this.getAttribute("league");
        const leagueName = this.getAttribute("leagueName");

        this.shadowRoot.querySelector(".rank").textContent = rank;
        this.shadowRoot.querySelector(".player-name").textContent = name;
        this.shadowRoot.querySelector(".player-elo").textContent = elo;
        this.shadowRoot.querySelector("#profile-pic-img").src = pp;
        this.shadowRoot.querySelector("#league-img").src = league;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = league;
        image.onload = () => {
            const croppedDataUrl = this.cropImageToContent(image);
            this.shadowRoot.querySelector("#league-img").src = croppedDataUrl;
        };
        this.shadowRoot.querySelector(".league-name").textContent = leagueName;
    }

    cropImageToContent(img) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let top = null, left = null, right = null, bottom = null;

        for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];

            if (alpha > 0) {
                if (top === null) top = y;
                if (left === null || x < left) left = x;
                if (right === null || x > right) right = x;
                if (bottom === null || y > bottom) bottom = y;
                }
            }
        }

        const width = right - left + 1;
        const height = bottom - top + 1;

        const croppedCanvas = document.createElement("canvas");
        const croppedCtx = croppedCanvas.getContext("2d");

        croppedCanvas.width = width;
        croppedCanvas.height = height;

        croppedCtx.drawImage(
            canvas,
            left, top, width, height,
            0, 0, width, height
        );

        return croppedCanvas.toDataURL();
    }
}

customElements.define('leaderboard-player-card', LeaderboardPlayerCard);