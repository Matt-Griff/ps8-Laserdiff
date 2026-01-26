class ExplanationPopup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        let template = document.getElementsByClassName('explanation')[0];
        if (!template) {
            const htmlString = await fetch('/components/explanation/explanation.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true)); 

        const css = await fetch('/components/explanation/explanation.css').then(response => response.text());
        

        // Get elements from shadow DOM
        const explanationPopup = this.shadowRoot.getElementById('explanation-popup');
        const closeExplanationBtn = this.shadowRoot.getElementById('close-explanation');

        // Close button event listener
        if (closeExplanationBtn) {
            closeExplanationBtn.addEventListener('click', () => this.hide());
        }

        // Close popup when clicking outside the content
        if (explanationPopup) {
            explanationPopup.addEventListener('click', (e) => {
                if (e.target === explanationPopup) {
                    this.hide();
                }
            });
        }

        // Close popup with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && explanationPopup && !explanationPopup.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    show() {
        const explanationPopup = this.shadowRoot.getElementById('explanation-popup');
        if (explanationPopup) {
            explanationPopup.classList.remove('hidden');
        }
    }

    hide() {
        const explanationPopup = this.shadowRoot.getElementById('explanation-popup');
        if (explanationPopup) {
            explanationPopup.classList.add('hidden');
        }
    }
}

customElements.define('explanation-popup', ExplanationPopup);
