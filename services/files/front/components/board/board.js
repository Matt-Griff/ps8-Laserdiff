
class MyBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.loadAsset();
        this.board = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => null)
        );
        this.possibleMoves = [];
        this.rotationsArrows = [];
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
            this.canvas.width = 700;
            this.canvas.height = 700;
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
        this.render();
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
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.imageSmoothingEnabled = false;
        this.drawGrid();
        this.drawPossibleMoves();
        this.drawPossibleRotations();
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
        const caseSize = this.canvas.width / 10;
        const img = this.imgMap.get(`${type}_${color}`);
        if (!img || !img.complete || img.naturalWidth === 0) return;

        this.context.save();
        this.context.translate(
            col * caseSize + caseSize / 2,
            row * caseSize + caseSize / 2
        );
        this.context.rotate((rotate * Math.PI) / 180);
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

    async waitForUserClick() {
        return new Promise((resolve) => {
            const onClick = (e) => {
                const size = this.canvas.width / 10;
                const rect = this.canvas.getBoundingClientRect();
                const col = Math.floor((e.clientX - rect.left) / size);
                const row = Math.floor((e.clientY - rect.top) / size);
                this.canvas.removeEventListener("click", onClick);
                resolve({ row, col });
            };
            this.canvas.addEventListener("click", onClick);
        });
    }

    drawPossibleMoves() {
        if (!this.possibleMoves) return;
        const context = this.context;
        const size = this.canvas.width / 10;
        context.fillStyle = 'rgba(255, 0, 0)';

        this.possibleMoves.forEach(({ row, col }) => {
            context.fillRect(col * size, row * size, size, size);
        });
    }

    drawPossibleRotations() {
        if (!this.possibleRotations || this.possibleRotations.length === 0) return;
        
        const context = this.context;
        const size = this.canvas.width / 10;
        
        this.possibleRotations.forEach(({ direction, row, col }) => {
            const centerX = col * size + size / 2;
            const centerY = row * size + size / 2;
            const offset = size * 0.55;
            const radius = size * 0.35;
            
            context.save();
            context.lineWidth = 6;
            context.lineCap = 'round';
            
            if (direction === 'clockwise') {
                const arrowX = centerX + offset;
                const arrowY = centerY;

                this.rotationsArrows.push({
                    direction: direction,
                    row,
                    col,
                    x: arrowX - radius,
                    y: arrowY - radius,
                    width: radius * 2,
                    height: radius * 2
                });
                
                context.strokeStyle = '#00cc00';
                context.fillStyle = '#00cc00';
                
                context.beginPath();
                context.arc(arrowX, arrowY, radius, Math.PI * 0.5, -Math.PI * 0.5, true);
                context.stroke();
                
                const tipX = arrowX;
                const tipY = arrowY - radius;
                context.beginPath();
                context.moveTo(tipX, tipY - 6);
                context.lineTo(tipX - 7, tipY + 4);
                context.lineTo(tipX + 7, tipY + 4);
                context.closePath();
                context.fill();
                
            } else {
                const arrowX = centerX - offset;
                const arrowY = centerY;

                this.rotationsArrows.push({
                    direction: direction,
                    row,
                    col,
                    x: arrowX - radius,
                    y: arrowY - radius,
                    width: radius * 2,
                    height: radius * 2
                });
                
                context.strokeStyle = '#0066ff';
                context.fillStyle = '#0066ff';
                
                context.beginPath();
                context.arc(arrowX, arrowY, radius, -Math.PI * 0.5, Math.PI * 0.5, true);
                context.stroke();
                
                const tipX = arrowX;
                const tipY = arrowY + radius;
                context.beginPath();
                context.moveTo(tipX, tipY + 6);
                context.lineTo(tipX - 7, tipY - 4);
                context.lineTo(tipX + 7, tipY - 4);
                context.closePath();
                context.fill();
            }
            
            context.restore();
        });
    }

    getRotationArrowAtPosition(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        for (const arrow of this.rotationArrows) {
            if (canvasX >= arrow.x && canvasX <= arrow.x + arrow.width &&
                canvasY >= arrow.y && canvasY <= arrow.y + arrow.height) {
                return arrow;
            }
        }
        return null;
    }

   

    setBoard(newBoard) {
        this.board = newBoard;
        this.render();
    }

    setPossibleMoves(moves) {
        this.possibleMoves = moves;
        this.render();
    }

    setPossibleRotations(rotations) {
        this.possibleRotations = rotations;
        this.render();
    }
    
    displayLaserPath(laserMap, playerId) {
        if (!laserMap) return;
        const context = this.context;
        const size = this.canvas.width / 10;
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


