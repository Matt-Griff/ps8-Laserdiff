class Throbber extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
    }

    async connectedCallback() {
        const htmlString = await fetch("/components/throbber/throbber.html").then(res => res.text());

        const div = document.createElement("div");
        div.innerHTML = htmlString;

        const template = div.querySelector("template");
        const style = document.createElement("link");
        style.setAttribute("rel", "stylesheet");
        style.setAttribute("href", "/components/throbber/throbber.css");
        
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
}

customElements.define('global-throbber', Throbber);