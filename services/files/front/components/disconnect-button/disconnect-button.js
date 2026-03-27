import { changeStatus } from "../../js/controllers/user-controller.js";

class DisconnectButton extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
    }

    async connectedCallback() {
        let template = document.querySelector('#disconnect-button');
        if (!template) {
            const htmlString = await fetch("/components/disconnect-button/disconnect-button.html").then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        const cssPath = new URL('/components/disconnect-button/disconnect-button.css', import.meta.url).href;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        this.shadowRoot.appendChild(link);

        const button = this.shadowRoot.querySelector('.disconnect-button-container');
        if(button) {
            button.addEventListener('click', () => this.handleClick());
        }
    }

    async handleClick() {
        // In order to disconnect, we only need to remove both access and refresh tokens from cookies.

        if (!confirm("Are you sure you want to disconnect?")) {
            return;
        }
        await changeStatus("offline");
        const cookies = document.cookie.split("; ");
        cookies.forEach(cookie => {
            const [name] = cookie.split("=");
            if (name === "accessToken" || name === "refreshToken") {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });

        window.location.reload();
    }
}

customElements.define("disconnect-button", DisconnectButton);