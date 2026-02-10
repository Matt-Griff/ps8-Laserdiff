export class UIManager {
    constructor() {
        this.elements = {
            board: document.querySelector("#game-board"),
            history: document.querySelector("game-history"),
            turnMessage: document.querySelectorAll(".current-turn"),
            p1: {
                reserve: document.querySelector("#player1-reserve"),
                cooldown: document.querySelector("#player1-cooldown"),
                killed: document.querySelector("#player1-killed"),
            },
            p2: {
                reserve: document.querySelector("#player2-reserve"),
                cooldown: document.querySelector("#player2-cooldown"),
                killed: document.querySelector("#player2-killed"),
            },
            rotateButtons: document.querySelectorAll(".arrow-button"),
            swapButton: document.querySelectorAll(".swap-anubis"),
        };
    }

    displayMessage(message) {
        this.elements.turnMessage.forEach(el => el.innerText = message);
    }

    setTheme(playerId) {
        this.elements.turnMessage.forEach(el => {
            el.classList.toggle("player1-theme", playerId === 1);
            el.classList.toggle("player2-theme", playerId === 2);
        });
    }

    updatePlayerStats(player1, player2) {
        this.updateSinglePlayerGUI(this.elements.p1, player1);
        this.updateSinglePlayerGUI(this.elements.p2, player2);
    }

    updateSinglePlayerGUI(uiGroup, player) {
        uiGroup.reserve.setAttribute("count", player.pyramidCount);
        uiGroup.cooldown.setAttribute("count", player.cooldownCount);
        uiGroup.killed.setAttribute("count", player.killedAnubis);
    }

    toggleRotationButtons(active) {
        this.elements.rotateButtons.forEach(btn => btn.disabled = !active);
    }

    // Attach event listeners that callback to the GameManager
    bindEvents(handlers) {
        // 1. Board Clicks (assuming board_gui emits a custom event or we listen to click)
        this.elements.board.addEventListener("click", (e) => {
            const size = (this.elements.board.logicalWidth < this.elements.board.logicalHeight ? this.elements.board.logicalWidth : this.elements.board.logicalHeight) / 10;
            const rect = this.elements.board.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left) / size);
            const row = Math.floor((e.clientY - rect.top) / size);
            handlers.onCellClick(row, col);
        });

        // 2. Reserve Clicks
        this.elements.p1.reserve.addEventListener("click", () => handlers.onReserveClick(1));
        this.elements.p2.reserve.addEventListener("click", () => handlers.onReserveClick(2));

        // 3. Rotation Clicks
        this.elements.rotateButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.dataset.action === "rotate-left") handlers.onRotate("clockwise");
                if (btn.dataset.action === "rotate-right") handlers.onRotate("counterclockwise");
            });
        });

        //4. Swap Button Clicks
        this.elements.swapButton.forEach(btn => {
            btn.addEventListener("click", () => {
                handlers.onSwap();
            });
        });
    }

    updateHistory(roundId, playerId, action) {
        if (!action || action.action === 'N/A') {
            return;
        }

        // Extract from cell (row * 10 + col)
        const fromCell = action.cell;
        const fromRow = Math.floor(fromCell / 10) + 1;
        const fromCol = (fromCell % 10) + 1;

        let toRow = fromRow;
        let toCol = fromCol;
        let actionType = action.action;

        // Parse result based on action type
        if (action.action === "MOVE") {
            const toCell = action.result;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "PLACE") {
            const toCell = action.result.destination;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "EXCHANGE") {
            actionType = "SWAP";
            const toCell = action.result;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "ROTATE") {
            actionType = action.result; // "CW" or "CCW"
        }

        // Determine piece type based on action
        const pieceType = action.action === "PLACE" ? "Pyramid" : "Piece";

        this.elements.history.addHistoryMove(roundId, playerId, pieceType, fromRow, fromCol, toRow, toCol, actionType);
    }

    setBoard(board) {
        this.elements.board.setBoard(board);
    }

    getPyramidSectorClicker() {
        return this.elements.board.getPyramidSectorClicker();
    }

    setPossibleMoves(moves) {
        this.elements.board.setPossibleMoves(moves);
    }

    drawPossiblePyramidPlacements(playerId) {
        this.elements.board.drawPossiblePyramidPlacements(playerId);
    }

    removePyramidMouseMoveHandler() {
        this.elements.board.removePyramidMouseMoveHandler();
    }

    drawPositionHighlighter(row, col) {
        this.elements.board.drawPositionHighlighter(row, col);
    }

    displayLaserPath(laserMap, playerId) {
        this.elements.board.displayLaserPath(laserMap, playerId);
    }

    enableSwapButton() {
        this.elements.swapButton.forEach(btn => btn.disabled = false);
    }

    disableSwapButton() {
        this.elements.swapButton.forEach(btn => btn.disabled = true);
    }
}