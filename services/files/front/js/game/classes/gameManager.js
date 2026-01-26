// classes/GameManager.js
import { createBoard, initGamePieces } from "../functions/game-functions.js";
import { Player } from "./game-classes.js";
import * as Actions from "../functions/game-actions-functions.js";

export class GameManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.board = createBoard();

        this.player1 = new Player(1, "Player 1");
        this.player2 = new Player(2, "Player 2");
        this.currentPlayer = Math.random() < 0.5 ? this.player1 : this.player2;

        // GAME STATE
        this.state = "IDLE"; // IDLE, SELECTED, PLACING_RESERVE, GAME_OVER
        this.selectedPiece = null;
        this.selectedCoords = null;
        this.nextCoords = null;
        this.turnCount = 0;
        this.rotation = "N/A";

        // Initialize
        initGamePieces(this.board, this.player1, this.player2);
        this.bindUIEvents();
    }

    start() {
        this.ui.elements.board.setBoard(this.board);
        this.updateTurnInfo();
        this.ui.updatePlayerStats(this.player1, this.player2);
        this.ui.toggleRotationButtons(false);
    }

    // Connects UI inputs to Game Logic
    bindUIEvents() {
        this.ui.bindEvents({
            onCellClick: (row, col) => this.handleCellClick(row, col),
            onReserveClick: (pid) => this.handleReserveClick(pid),
            onRotate: (direction) => this.handleRotation(direction)
        });
    }

    // --- INPUT HANDLERS (The State Machine) ---
    handleCellClick(row, col) {
        if (this.state === "GAME_OVER") return;

        const clickedPiece = this.board[row][col];

        // 1. STATE: PLACING A PYRAMID FROM RESERVE
        if (this.state === "PLACING_RESERVE") {
            const rotation = this.ui.elements.board.getPyramidSectorClicker(); // Assumed method
            const success = Actions.placePyramid(this.board, row, col, this.currentPlayer, rotation);
            if (success) {
                this.nextCoords = { row, col };
                this.endTurn();
            } else {
                this.state = "IDLE";
                this.ui.elements.board.setPossibleMoves(null);
            }
            return;
        }

        // 2. STATE: IDLE (Trying to select a piece)
        if (this.state === "IDLE" || (this.state === "SELECTED" && clickedPiece?.owner === this.currentPlayer)) {
            if (clickedPiece && clickedPiece.owner === this.currentPlayer && clickedPiece.constructor.name !== "Pharaoh") {
                this.selectPiece(clickedPiece, row, col);
            }
            return;
        }

        // 3. STATE: SELECTED (Trying to move to an empty spot)
        if (this.state === "SELECTED") {
            const success = Actions.movePiece(this.board, this.selectedCoords.row, this.selectedCoords.col, row, col);
            if (success) {
                this.nextCoords = { row, col };
                this.endTurn();
            }
        }
    }

    handleReserveClick(playerId) {
        if (this.state === "GAME_OVER") return;
        if (playerId !== this.currentPlayer.game_id) return;
        if (this.currentPlayer.pyramid_count <= 0) return;

        // Reset previous selections
        this.deselect();

        // Calculate and show placements
        const placements = Actions.getPossibleReservePlacements(this.board, this.currentPlayer);
        this.ui.elements.board.setPossibleMoves(placements);
        this.ui.elements.board.drawPossiblePyramidPlacements(this.currentPlayer.game_id);

        this.state = "PLACING_RESERVE";
    }

    handleRotation(direction) {
        if (this.state !== "SELECTED" || !this.selectedPiece) return;

        if (direction === "clockwise") {
            this.rotation = "CW";
            Actions.rotatePieceClockwise(this.selectedPiece);
        }
        else {
            this.rotation = "CCW";
            Actions.rotatePieceCounterClockwise(this.selectedPiece);
        }
        // Visual update immediately
        this.ui.elements.board.setBoard(this.board);
        this.endTurn();
    }

    selectPiece(piece, row, col) {
        this.selectedPiece = piece;
        this.selectedCoords = { row, col };
        this.state = "SELECTED";

        // Calculate moves
        const moves = Actions.possibleMoves(this.board, this.currentPlayer, row, col);

        // Update UI
        this.ui.elements.board.removePyramidMouseMoveHandler();
        this.ui.elements.board.setPossibleMoves(moves);
        this.ui.elements.board.drawPositionHighlighter(row, col);
        this.ui.toggleRotationButtons(true);
    }

    deselect() {
        this.selectedPiece = null;
        this.selectedCoords = null;
        this.nextCoords = null;
        this.rotation = "N/A";
        this.ui.elements.board.setPossibleMoves(null);
        this.ui.toggleRotationButtons(false);
        this.state = "IDLE";
    }

    async endTurn() {
        // 0. Update UI & History
        this.ui.updateHistory(this.turnCount + 1, this.currentPlayer.game_id, this.selectedPiece?.constructor.name || "Pyramid",
            this.selectedCoords?.row + 1, this.selectedCoords?.col + 1, this.nextCoords?.row + 1, this.nextCoords?.col + 1, this.rotation
        );
        this.ui.elements.board.setBoard(this.board);
        this.deselect();

        // 1. Laser Phase
        const laserMap = Actions.shootLaser(this.board, this.currentPlayer, this.player1, this.player2);
        this.ui.elements.board.displayLaserPath(laserMap, this.currentPlayer.game_id);

        // 2. Cooldowns
        this.updateCooldowns();
        this.ui.updatePlayerStats(this.player1, this.player2);

        // 3. Check Win Condition
        const winner = Actions.checkGameOver(this.board, this.player1, this.player2);
        if (winner) {
            this.state = "GAME_OVER";
            this.ui.displayMessage(`Game Over! Player ${winner.game_id} wins!`);
            return;
        }

        // 4. Switch Player
        this.currentPlayer = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
        this.turnCount++;
        this.updateTurnInfo();
    }

    updateTurnInfo() {
        this.ui.displayMessage(`Player ${this.currentPlayer.game_id}'s turn`);
        this.ui.setTheme(this.currentPlayer.game_id);
    }

    updateCooldowns() {
        [this.player1, this.player2].forEach(p => {
            for (let i = 0; i < p.pyramid_cooldown.length; i++) {
                p.pyramid_cooldown[i] -= 1;
                if (p.pyramid_cooldown[i] === 0) {
                    p.pyramid_cooldown.splice(i, 1);
                    p.pyramid_count += 1;
                    i--;
                }
            }
        });
    }
}