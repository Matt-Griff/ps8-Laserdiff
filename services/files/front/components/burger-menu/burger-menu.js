class BurgerMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        let template = document.getElementsByClassName('burger-menu')[0];
        if (!template) {
            const htmlString = await fetch('/components/burger-menu/burger-menu.html').then(response => response.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template');

            const disconnectScript = document.createElement('script');
            disconnectScript.type = 'module';
            disconnectScript.src = '/components/disconnect-button/disconnect-button.js';
            document.head.appendChild(disconnectScript);

            const script = document.createElement('script');
            script.type = 'module';
            script.src = '/components/explanation/explanation.js';
            document.head.appendChild(script);

            script.onload = () => {
                if (!document.querySelector('explanation-popup')) {
                    const explanationPopup = document.createElement('explanation-popup');
                    document.body.appendChild(explanationPopup);
                }
            };
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        const learnIcon = this.shadowRoot.getElementById('learn-icon');
        if (learnIcon) {
            learnIcon.addEventListener('click', () => {
                const explanationPopup = document.querySelector('explanation-popup');
                if (explanationPopup) {
                    explanationPopup.show();
                }
            });
        }

        let audio = new Audio('/assets/music/home.m4a');
        audio.loop = true;
        audio.volume = 0.5;

        const soundIcon = this.shadowRoot.getElementById('sound-icon');
        const containerSound = this.shadowRoot.querySelector('.sound-controller');
        const soundLabel = this.shadowRoot.getElementById('sound-label');
        let isSoundOn = false;
        containerSound.addEventListener('click', () => {
            isSoundOn = !isSoundOn;
            soundIcon.src = isSoundOn ? '/assets/icon/sound-on.svg' : '/assets/icon/sound-off.svg';
            if (isSoundOn) {
                soundLabel.textContent = 'Pause music';
                audio.play();
            } else {
                soundLabel.textContent = 'Play music';
                audio.pause();
            }

        });


        const container = this.shadowRoot.querySelector('.burger-menu-container');
        container.addEventListener('mouseenter', (event) => {
            container.classList.add('expanded');
        });
        container.addEventListener('mouseleave', (event) => {
            container.classList.remove('expanded');
        });
    }
}

customElements.define('burger-menu', BurgerMenu);
