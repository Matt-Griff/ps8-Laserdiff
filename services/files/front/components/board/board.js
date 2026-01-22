
class MyBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.loadAsset();
        this.board = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => null)
        );
        this.possibleMoves = [];
        this.imagesLoaded = false;
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
            this.resizeCanvas();
            this.canvas.style.backgroundColor = '#f0f0f0';
        }
        await new Promise(resolve => {
            const checkImagesLoaded = () => {
                if (this.imagesLoaded) {
                    resolve();
                } else {
                    setTimeout(checkImagesLoaded, 100);
                }
            };
            checkImagesLoaded();
        });
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
        this.render();
    }

    resizeCanvas() {
        const rect = this.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Store logical size (CSS pixels)
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;

        // CSS size
        this.canvas.style.width = rect.width + "px";
        this.canvas.style.height = rect.height + "px";

        // Bitmap size
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Reset + scale
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }


    disconnectedCallback() {
        window.removeEventListener("resize", this._onResize);
    }



    loadAsset() {
        const pieces = [
            { type: "sphinx", color: "red" },
            { type: "sphinx", color: "blue" },
            { type: "pharaoh", color: "red" },
            { type: "pharaoh", color: "blue" },
            { type: "anubis", color: "red" },
            { type: "anubis", color: "blue" },
            { type: "scarab", color: "red" },
            { type: "scarab", color: "blue" },
            { type: "pyramid", color: "red" },
            { type: "pyramid", color: "blue" },
        ];
        this.imgMap = new Map();
        const loadPromises = pieces.map(({ type, color }) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.imgMap.set(`${type}_${color}`, img);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${type}_${color}`);
                    resolve(); // Resolve anyway to not block other images
                };
                img.src = `/assets/pieces/${type}_${color}.png`;
            });
        });

        Promise.all(loadPromises).then(() => {
            this.imagesLoaded = true;
        });
    }

    render() {
        let width = this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight;
        this.context.clearRect(0, 0, width, width);
        this.context.imageSmoothingEnabled = false;
        this.drawGrid();
        this.drawPossibleMoves();
        this.drawPieces();
    }

    drawPieces() {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                let piece = this.board[row][col];
                if (!piece) continue;
                this.addPiece(row, col, piece.owner.game_id === 1 ? "red" : "blue", piece.constructor.name.toLowerCase(), piece.orientation || 0);
            }
        }
    }

    addPiece(row, col, color, type, rotate = 0) {
        const caseSize = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        const img = this.imgMap.get(`${type}_${color}`);
        if (!img || !img.complete || img.naturalWidth === 0) return;

        this.context.save();
        this.context.translate(
            col * caseSize + caseSize / 2,
            row * caseSize + caseSize / 2
        );
        this.context.rotate((-rotate * Math.PI) / 180);
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
        const width = this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight;
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

    async waitForUserClick() {
        return new Promise((resolve) => {
            const onClick = (e) => {
                const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
                const rect = this.canvas.getBoundingClientRect();
                const col = Math.floor((e.clientX - rect.left) / size);
                const row = Math.floor((e.clientY - rect.top) / size);
                this.canvas.removeEventListener("click", onClick);
                resolve({ type: 'cell', row, col });
            };
            this.canvas.addEventListener("click", onClick);
        });
    }

    drawPossibleMoves() {
        // Désactive l'aperçu pyramide si actif
        if (!this.possibleMoves) return;
        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        context.fillStyle = 'rgba(255, 0, 0, 0.5)';

        this.possibleMoves.forEach(({ row, col }) => {
            context.fillRect(col * size, row * size, size, size);
        });
    }

    drawPossiblePyramidPlacements(playerId) {
        this.drawPossibleMoves();
        if (!this.possibleMoves) return;

        // Remove previous mousemove listener if any
        if (this._pyramidMouseMoveHandler) {
            this.canvas.removeEventListener('mousemove', this._pyramidMouseMoveHandler);
        }

        const caseSize = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        let pyramidColor = playerId === 1 ? 'red' : 'blue';

        // Store handler for later removal
        this._pyramidMouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / caseSize);
            const row = Math.floor(y / caseSize);

            // Hover only on possible moves
            try {
                if (!this.possibleMoves.some(move => move.row === row && move.col === col)) {
                    this.render();
                    return;
                }
            } catch {
                return;
            }

            // Calcul du quadrant relatif à la case
            const localX = x - (col * caseSize);
            const localY = y - (row * caseSize);
            let rotation = 0;
            if (localX < caseSize / 2 && localY < caseSize / 2) {
                rotation = 270;
            } else if (localX >= caseSize / 2 && localY < caseSize / 2) {
                rotation = 180;
            } else if (localX >= caseSize / 2 && localY >= caseSize / 2) {
                rotation = 90;
            } else {
                rotation = 0;
            }
            rotation = (rotation + 180) % 360;

            this.setPyramidSectorClicker(rotation, playerId);
            this.showPreviewPyramid(row, col, pyramidColor, rotation);
        };
        this.canvas.addEventListener('mousemove', this._pyramidMouseMoveHandler);
    }

    removePyramidMouseMoveHandler() {
        if (this._pyramidMouseMoveHandler) {
            this.canvas.removeEventListener('mousemove', this._pyramidMouseMoveHandler);
            this._pyramidMouseMoveHandler = null;
        }
    }

    setPyramidSectorClicker(OrentationClicker, playerId) {
        if (playerId === 2) {
            OrentationClicker = (OrentationClicker + 180) % 360;
        }
        this.pyramidOrentationClicked = OrentationClicker;
    }

    getPyramidSectorClicker() {
        return this.pyramidOrentationClicked;
    }

    showPreviewPyramid(row, col, color, rotation) {
        this.render();
        this.addPiece(row, col, color, 'pyramid', rotation);

    }

    setBoard(newBoard) {
        this.board = newBoard;
        this.render();
    }

    setPossibleMoves(moves) {
        this.possibleMoves = moves;
        this.render();
    }


    displayLaserPath(laserMap, playerId) {
        if (!laserMap) return;
        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        if (playerId === 1) {
            context.fillStyle = 'rgba(36, 2, 80, 0.6)';
        } else {
            context.fillStyle = 'rgba(255, 251, 0, 0.6)';
        }
        laserMap.forEach(({ row, col }) => {
            context.fillRect(col * size, row * size, size, size);
        });
    }
}

customElements.define("my-board", MyBoard);


