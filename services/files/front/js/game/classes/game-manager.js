// classes/GameManager.js
import { createBoard, initGamePieces, serializeBoard } from "../functions/game-functions.js";
import * as Actions from "../functions/game-actions-functions.js";
import { setup, nextMove } from "../../ai/laserdiff.js";
import { Player, Sphinx, RotateablePawn, MoveableRotateablePawn } from "./game-classes.js";
import { getSphinxOfPlayer, getPharaohOfPlayer, getOrentationForAi } from "../functions/game-utils.js";

export class GameManager {
    constructor(uiManager, player1 = null, player2 = null) {
        this.ui = uiManager;
        this.board = createBoard();

        this.player1 = player1;
        this.player2 = player2;
        this.currentPlayer = Math.random() < 0.5 ? this.player1 : this.player2;

        // GAME STATE
        this.state = "IDLE"; // IDLE, SELECTED, PLACING_RESERVE, GAME_OVER
        this.selectedPiece = null;
        this.selectedCoords = null;
        this.nextCoords = null;
        this.turnCount = 0;
        this.rotation = "N/A";
        this.previousAction = {
            "action": "N/A",  // "ROTATE", "MOVE", "PLACE", "EXCHANGE".
            "cell": null, // rowCol = cell 27 is the cell in the 8th column of the 3rd line
            "result": "N/A" // "CCW, "CW", coords, {destination: Cell, orientation: 0|9|90|99}
        };

        // Initialize
        initGamePieces(this.board, this.player1, this.player2);
        this.initializeForAI(this.player1, this.player2);
        this.bindUIEvents();
    }

    start() {
        this.ui.elements.board.setBoard(this.board);
        this.updateTurnInfo();
        this.ui.updatePlayerStats(this.player1, this.player2);
        this.ui.toggleRotationButtons(false);
        if (this.currentPlayer.is_ai) {
            this.askAIForMove();
        }
        this.ui.elements.swapButton.forEach(btn => btn.disabled = true);
    }



    // Connects UI inputs to Game Logic
    bindUIEvents() {
        this.ui.bindEvents({
            onCellClick: (row, col) => this.handleCellClick(row, col),
            onReserveClick: (pid) => this.handleReserveClick(pid),
            onRotate: (direction) => this.handleRotation(direction),
            onSwap: () => this.handleSwap(),
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
                this.previousAction = {
                    "action": "PLACE",
                    "cell": row * 10 + col,
                    "result": { destination: row * 10 + col, orientation: getOrentationForAi(this.board[row][col].orientation) }
                };
                this.endTurn();
            } else {
                this.state = "IDLE";
                this.ui.elements.board.setPossibleMoves(null);
            }
            return;
        }

        // 2. STATE: IDLE (Trying to select a piece)
        if (this.state === "IDLE" || (this.state === "SELECTED" && clickedPiece?.owner === this.currentPlayer)) {
            if (clickedPiece && clickedPiece.owner === this.currentPlayer) {
                this.selectPiece(clickedPiece, row, col);
            }
            return;
        }

        // 3. STATE: SELECTED (Trying to move to an empty spot)
        if (this.state === "SELECTED") {
            const success = Actions.movePiece(this.board, this.selectedCoords.row, this.selectedCoords.col, row, col);
            if (success) {
                this.nextCoords = { row, col };
                this.previousAction = {
                    "action": "MOVE",
                    "cell": this.selectedCoords.row * 10 + this.selectedCoords.col,
                    "result": this.nextCoords.row * 10 + this.nextCoords.col
                };
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
            this.previousAction = {
                "action": "ROTATE",
                "cell": this.selectedCoords.row * 10 + this.selectedCoords.col,
                "result": "CW"
            };
        }
        else {
            this.rotation = "CCW";
            Actions.rotatePieceCounterClockwise(this.selectedPiece);
            this.previousAction = {
                "action": "ROTATE",
                "cell": this.selectedCoords.row * 10 + this.selectedCoords.col,
                "result": "CCW"
            };
        }
        // Visual update immediately
        this.ui.elements.board.setBoard(this.board);
        this.endTurn();
    }

    handleSwap() {
        if (this.state !== "SELECTED") return;
        if (this.currentPlayer.swap_cooldown > 0) return;

        const { row, col } = this.selectedCoords;
        const scarabPos = Actions.swapWithScarab(this.board, this.selectedPiece, this.currentPlayer);
        this.nextCoords = { row, col };
        this.previousAction = {
            "action": "EXCHANGE",
            "cell": scarabPos.row * 10 + scarabPos.col,
            "result": row * 10 + col
        };
        this.endTurn();
    }

    selectPiece(piece, row, col) {
        this.selectedPiece = piece;
        this.selectedCoords = { row, col };
        this.state = "SELECTED";

        // Calculate moves
        const moves = Actions.possibleMoves(this.board, this.currentPlayer, row, col);

        // Calculate if swap is possible
        const pharaoh = getPharaohOfPlayer(this.board, this.currentPlayer);
        const sphinx = getSphinxOfPlayer(this.board, this.currentPlayer);
        if ((pharaoh && pharaoh.scarabCooldown === 0 && piece.constructor.name === "Pharaoh") || (sphinx && sphinx.scarabCooldown === 0 && piece.constructor.name === "Sphinx")) {
            this.ui.elements.swapButton.forEach(btn => btn.disabled = false);
        } else {
            this.ui.elements.swapButton.forEach(btn => btn.disabled = true);
        }

        // Calculate rotation buttons
        if (piece instanceof RotateablePawn || piece instanceof MoveableRotateablePawn) {
            this.ui.toggleRotationButtons(true);
        } else {
            this.ui.toggleRotationButtons(false);
        }

        // Update UI
        this.ui.elements.board.removePyramidMouseMoveHandler();
        this.ui.elements.board.setPossibleMoves(moves);
        this.ui.elements.board.drawPositionHighlighter(row, col);
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


    // --- AI INTEGRATION ---
    initializeForAI(player1, player2) {
        let isPlayerOneFirst = this.currentPlayer === player1;
        const boardState = serializeBoard(this.board, this.currentPlayer.game_id);
        if (player1.is_ai) {
            Promise.race([
                setup(boardState, isPlayerOneFirst),
                new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000))
            ]).then((result) => {
                console.log(result);
            });
        }
        if (player2.is_ai) {
            Promise.race([
                setup(boardState, !isPlayerOneFirst),
                new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000))
            ]).then((result) => {
                console.log(result);
            });
        }
    }

    askAIForMove() {
        const action = this.previousAction;
        Promise.race([
            nextMove(action),
            new Promise((resolve) => setTimeout(() => resolve("timeout"), 250))
        ]).then((result) => {
            if (result !== "timeout") {
                Actions.executeAIMove(this, result);
                this.previousAction = result;
                this.endTurn();
            } else {
                console.log("AI move timed out.");
            }
        });
    }


    endTurn() {
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

        console.log("Previous Action:", this.previousAction);
        // 5. AI Move if applicable
        if (this.currentPlayer.is_ai) {
            this.askAIForMove();
        }
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
            const pharaoh = getPharaohOfPlayer(this.board, p);
            const sphinx = getSphinxOfPlayer(this.board, p);
            if (pharaoh && pharaoh.scarabCooldown > 0) pharaoh.scarabCooldown -= 1;
            if (sphinx && sphinx.scarabCooldown > 0) sphinx.scarabCooldown -= 1;
        });
    }
}