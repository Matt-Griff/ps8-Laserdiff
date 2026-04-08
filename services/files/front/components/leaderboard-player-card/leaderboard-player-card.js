import { cropImageToContent } from "../../js/utils.js";

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
        if(!pp) {
            this.pp = "https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png"
        }
        this.shadowRoot.querySelector("#profile-pic-img").src = pp;
        this.shadowRoot.querySelector("#league-img").src = league;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = league;
        image.onload = () => {
            const croppedDataUrl = cropImageToContent(image);
            this.shadowRoot.querySelector("#league-img").src = croppedDataUrl;
        };
        this.shadowRoot.querySelector(".league-name").textContent = leagueName;
    }
        
}

customElements.define('leaderboard-player-card', LeaderboardPlayerCard);