
class MyBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.imgMap = this.loadAsset();
        this.board = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => null)
        );
        this.directionMap = { 'n': 0, 'e': 90, 's': 180, 'w': 270 };

        this.board[0][0] = {
            type: "sphinx",
            color: "red",
            rotation: "n"
        };

        this.selected = null;
    }

    async connectedCallback() {
        let template = document.getElementById("board");
        if (!template) {
            const htmlString = await fetch("/components/board/board.html").then(r => r.text());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            template = tempDiv.querySelector('template#board');
            if (template) {
                document.body.appendChild(template);
            }
        }
        if (template && this.shadowRoot.childNodes.length === 0) {
            this.shadowRoot.appendChild(template.content.cloneNode(true));

            this.canvas = this.shadowRoot.getElementById('board-canvas');
            this.context = this.canvas.getContext('2d');
            // Set canvas dimensions
            this.canvas.width = 700;
            this.canvas.height = 700;
            this.canvas.style.backgroundColor = '#f0f0f0';
        }

        this.render();
        this.handleClick();
    }

    loadAsset() {
        const imgMap = new Map();
        const pieces = [
            { type: "sphinx", color: "red" },
            { type: "sphinx", color: "blue" },
        ];

        pieces.forEach(({ type, color }) => {
            const img = new Image();
            img.src = `/assets/pieces/${type}_${color}.png`;
            imgMap.set(`${type}_${color}`, img);
        });

        return imgMap;
    }


    render() {
        console.log("Rendering");
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawPieces();
        this.drawHighlights();
    }

    drawPieces() {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                let piece = this.board[row][col];
                if (!piece) continue;
                this.addPiece(row, col, piece.color, piece.type, piece.rotation);
            }
        }
    }

    addPiece(row, col, color, type, rotate = 's') {
        const caseSize = this.canvas.width / 10;
        const img = this.imgMap.get(`${type}_${color}`);
        if (!img) return;

        this.context.save();
        this.context.translate(
            col * caseSize + caseSize / 2,
            row * caseSize + caseSize / 2
        );
        this.context.rotate((this.directionMap[rotate] * Math.PI) / 180);
        this.context.drawImage(
            img,
            -caseSize / 2,
            -caseSize / 2,
            caseSize,
            caseSize
        );
        this.context.restore();
    }



    drawGrid() {
        const context = this.context;
        const width = this.canvas.width;
        const caseSize = width / 10;
        const caseColor = ['#000000', '#ffffff'];

        // Draw checkerboard pattern
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                context.fillStyle = caseColor[(row + col) % 2];
                context.fillRect(col * caseSize, row * caseSize, caseSize, caseSize);
            }
        }

        // Draw border
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.strokeRect(0, 0, width, width);
    }

    handleClick() {
        const size = this.canvas.width / 10;
        this.canvas.addEventListener("click", (e) => {
            console.log("Canvas clicked");
            const rect = this.canvas.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left) / size);
            const row = Math.floor((e.clientY - rect.top) / size);

            this.selected = { row, col };
            this.render();
        });
    }

    drawHighlights() {
        if (!this.selected) return;
        const size = this.canvas.width / 10;
        this.context.fillStyle = "rgba(255, 0, 0, 0.3)";
        this.context.fillRect(
            this.selected.col * size,
            this.selected.row * size,
            size,
            size
        );
    }

}

customElements.define("my-board", MyBoard);


