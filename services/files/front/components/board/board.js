
class MyBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.loadAsset();
        this.board = [];
        this.possibleMoves = [];
        this.imagesLoaded = false;

        this.laserPath = null;
        this.laserProgress = 0;
        this.laserAnimating = false;
        this.laserPlayerId = null;
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


        this.casesName = ["piece_2.png", "piece_1.png"];
        this.cases = [];
        const caseLoadPromises = this.casesName.map((caseImg, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.cases[index] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${caseImg}`);
                    resolve(); // Resolve anyway to not block other images
                };
                img.src = `/assets/${caseImg}`;
            });
        });


        Promise.all([...loadPromises, ...caseLoadPromises]).then(() => {
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
        for (const piece of this.board) {
            this.addPiece(piece.row, piece.col, piece.ownerId === 1 ? "red" : "blue", piece.type, piece.orientation || 0);
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

        // Draw checkerboard pattern
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const img = this.cases[(row + col) % 2];
                if (img && img.complete && img.naturalWidth !== 0) {
                    context.drawImage(img, col * caseSize, row * caseSize, caseSize, caseSize);
                } else {
                    // fallback: fill with a color if image not loaded
                    context.fillStyle = ((row + col) % 2 === 0) ? '#e0e0e0' : '#161616';
                    context.fillRect(col * caseSize, row * caseSize, caseSize, caseSize);
                }
            }
        }

        // Draw border
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.strokeRect(0, 0, width, width);
    }

    drawPossibleMoves() {
        // Désactive l'aperçu pyramide si actif
        if (!this.possibleMoves) return;
        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        context.fillStyle = 'rgba(255, 0, 0, 0.5)';

        this.possibleMoves.forEach(({ row, col }) => {
            const margin = 8;
            context.fillRect(
                col * size + margin,
                row * size + margin,
                size - 2 * margin,
                size - 2 * margin
            );
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
                rotation = 90;
            } else if (localX >= caseSize / 2 && localY < caseSize / 2) {
                rotation = 0;
            } else if (localX >= caseSize / 2 && localY >= caseSize / 2) {
                rotation = 270;
            } else {
                rotation = 180;
            }
            rotation = (rotation) % 360;
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
        if (playerId === 2 && (OrentationClicker === 0 || OrentationClicker === 180)) OrentationClicker += 180;
        if (playerId === 1 && (OrentationClicker === 90 || OrentationClicker === 270)) OrentationClicker += 180;
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


    displayLaserPath(laserData, playerId) {
        if (!laserData || laserData.length === 0) return;

        this.laserPath = laserData.laserPath;
        this.deadPieces = laserData.deadPieces;
        this.laserPlayerId = playerId;
        this.laserProgress = 0;
        this.laserAnimating = true;

        this.animateLaser();
    }

    animateLaser() {
        if (!this.laserAnimating || !this.laserPath) {
            return;
        }

        // Clear and redraw everything
        this.render();

        // Draw the laser path up to current progress
        this.drawAnimatedLaserLine();

        // Update progress (adjust speed here: 0.02 = slower, 0.05 = faster)
        this.laserProgress += 0.03;

        // Continue animation or stop
        if (this.laserProgress >= 1) {
            this.laserProgress = 1;
            this.drawAnimatedLaserLine();
            this.laserAnimating = false;
            setTimeout(() => this.blowPieces(), 500);
        } else {
            requestAnimationFrame(() => this.animateLaser());
        }
    }

    blowPieces() {
        if (!this.deadPieces) return;
        for (const { piece, row, col } of this.deadPieces) {
            this.board = this.board.filter(p => !(p.row === row && p.col === col && p.type === piece));
            this.drawExplosion(row, col);
        }
        this.render();
    }

    drawExplosion(row, col) {
        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        const centerX = col * size + size / 2;
        const centerY = row * size + size / 2;
        const maxRadius = size / 2;
        let currentRadius = 0;
        const explosionInterval = setInterval(() => {
            context.save();
            context.globalAlpha = 1 - currentRadius / maxRadius;
            context.fillStyle = this.laserPlayerId === 1 ? '#8c00ff' : '#FFD700';
            context.beginPath();
            context.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
            context.fill();
            context.restore();
            currentRadius += 2;
            if (currentRadius > maxRadius) {
                clearInterval(explosionInterval);
                this.render();
            }
        }, 30);
    }

    drawAnimatedLaserLine() {
        if (!this.laserPath || this.laserPath.length === 0) return;

        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;

        const totalSegments = this.laserPath.length - 1;
        const currentSegment = Math.floor(this.laserProgress * totalSegments);
        const segmentProgress = (this.laserProgress * totalSegments) % 1;

        // Laser style
        context.save();
        context.strokeStyle = this.laserPlayerId === 1 ? '#8c00ff' : '#FFD700';
        context.lineWidth = 10;
        context.lineCap = 'square';
        context.lineJoin = 'square';

        context.beginPath();

        const firstCell = this.laserPath[0];
        context.moveTo(
            firstCell.col * size + size / 2,
            firstCell.row * size + size / 2
        );

        // Draw complete segments
        for (let i = 1; i <= currentSegment && i < this.laserPath.length; i++) {
            const cell = this.laserPath[i];
            context.lineTo(
                cell.col * size + size / 2,
                cell.row * size + size / 2
            );

            // End of path reaches edge of board, extend line to edge
            if (i == this.laserPath.length - 1 && !this.board.some(piece => piece.row === cell.row && piece.col === cell.col && piece.type === 'anubis')) {
                if (cell.row === 0) {
                    context.lineTo(
                        cell.col * size + size / 2,
                        cell.row * size
                    );
                } else if (cell.row === 9) {
                    context.lineTo(
                        cell.col * size + size / 2,
                        cell.row * size + size
                    );
                } else if (cell.col === 0) {
                    context.lineTo(
                        cell.col * size,
                        cell.row * size + size / 2
                    );
                } else if (cell.col === 9) {
                    context.lineTo(
                        cell.col * size + size,
                        cell.row * size + size / 2
                    );
                }
            }
        }

        // Draw partial segment for smooth animation
        if (currentSegment + 1 < this.laserPath.length) {
            const prevCell = this.laserPath[currentSegment];
            const nextCell = this.laserPath[currentSegment + 1];
            const x = prevCell.col * size + size / 2 +
                (nextCell.col - prevCell.col) * size * segmentProgress;
            const y = prevCell.row * size + size / 2 +
                (nextCell.row - prevCell.row) * size * segmentProgress;
            context.lineTo(x, y);
        }

        context.stroke();
        context.restore();
    }

    drawPositionHighlighter(row, col) {
        const context = this.context;
        const size = (this.logicalWidth < this.logicalHeight ? this.logicalWidth : this.logicalHeight) / 10;
        context.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        context.lineWidth = 4;
        context.strokeRect(col * size + 2, row * size + 2, size - 4, size - 4);
    }
}

customElements.define("my-board", MyBoard);

