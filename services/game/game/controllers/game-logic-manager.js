import { createBoard, initGamePieces, serializeBoard } from "../functions/game-functions.js";
import * as Actions from "../functions/game-actions-functions.js";
import { setup, nextMove } from "../../ai/laserdiff.js";
import { RotateablePawn, MoveableRotateablePawn } from "../classes/game-classes.js";
import { getSphinxOfPlayer, getPharaohOfPlayer, getOrentationForAi } from "../functions/game-utils.js";

export class GameLogicManager {
    constructor(uiManager, player1 = null, player2 = null, mode = "local") {
        this.ui = uiManager;
        this.board = createBoard();
        this.mode = mode;

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
    }

    start() {
        this.ui.setProfile(this.player1.clientId, this.player2.clientId);
        this.ui.setCurrentPlayer(this.currentPlayer.clientId);
        this.ui.setBoard(this.board);
        this.updateTurnInfo();
        this.ui.updatePlayerStats(this.player1, this.player2);
        this.ui.toggleRotationButtons(false);
        this.ui.disableSwapButton();
        if (this.currentPlayer.is_ai) {
            this.askAIForMove();
        }
    }

    // --- INPUT HANDLERS (The State Machine) ---
    async handleCellClick(row, col, clientId = null) {
        if (this.state === "GAME_OVER") return;
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) {
            console.warn(`Received swap request from client ${clientId}, but it's not their turn.`);
            return;
        }

        const clickedPiece = this.board[row][col];

        // 1. STATE: PLACING A PYRAMID FROM RESERVE
        if (this.state === "PLACING_RESERVE") {
            const rotation = await this.getPyramidSectorClicker(); // Assumed method
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
                this.ui.setPossibleMoves(null);
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

    handleReserveClick(playerId, clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) {
            console.warn(`Received swap request from client ${clientId}, but it's not their turn.`);
            return;
        }
        if (this.state === "GAME_OVER") return;
        if (playerId !== this.currentPlayer.game_id) return;
        if (this.currentPlayer.pyramid_count <= 0) return;

        // Reset previous selections
        this.deselect();

        // Calculate and show placements
        const placements = Actions.getPossibleReservePlacements(this.board, this.currentPlayer);
        this.ui.setPossibleMoves(placements);
        this.ui.drawPossiblePyramidPlacements(this.currentPlayer.game_id);

        this.state = "PLACING_RESERVE";
    }

    handleRotation(direction, clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) {
            console.warn(`Received swap request from client ${clientId}, but it's not their turn.`);
            return;
        }
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
        this.ui.setBoard(this.board);
        this.endTurn();
    }

    handleSwap(clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) {
            console.warn(`Received swap request from client ${clientId}, but it's not their turn.`);
            return;
        }
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

    getPyramidSectorClicker() {
        return new Promise((resolve) => {
            this.pyramidSectorResolver = resolve;
            this.ui.getPyramidSectorClicker();
        });
    }

    handlePyramidSectorResponse(sector, clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) {
            console.warn(`Received pyramid sector response from client ${clientId}, but it's not their turn.`);
            return;
        }
        if (this.pyramidSectorResolver) {
            this.pyramidSectorResolver(sector);
            this.pyramidSectorResolver = null;
        }
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
            this.ui.enableSwapButton();
        } else {
            this.ui.disableSwapButton();
        }

        // Calculate rotation buttons
        if (piece instanceof RotateablePawn || piece instanceof MoveableRotateablePawn) {
            this.ui.toggleRotationButtons(true);
        } else {
            this.ui.toggleRotationButtons(false);
        }

        // Update UI
        this.ui.removePyramidMouseMoveHandler();
        this.ui.setPossibleMoves(moves);
        this.ui.drawPositionHighlighter(row, col);
    }

    deselect() {
        this.selectedPiece = null;
        this.selectedCoords = null;
        this.nextCoords = null;
        this.rotation = "N/A";
        this.ui.setPossibleMoves(null);
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
                console.log("AI selected move:", result);
                Actions.executeAIMove(result, this.board, this.currentPlayer);
                this.previousAction = result;
                this.endTurn();
            } else {
                console.error("AI move timed out.");
            }
        });
    }


    endTurn() {
        // 0. Update UI & History
        this.ui.updateHistory(this.turnCount + 1, this.currentPlayer.game_id, this.previousAction);
        this.ui.setBoard(this.board);
        this.deselect();

        // 1. Laser Phase
        const laserMap = Actions.shootLaser(this.board, this.currentPlayer, this.player1, this.player2);
        this.ui.displayLaserPath(laserMap, this.currentPlayer.game_id);

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
        this.ui.setCurrentPlayer(this.currentPlayer.clientId);

        // 4.5 Sleep to see laser path
        setTimeout(() => {
            // 5. AI Move if applicable
            if (this.currentPlayer.is_ai) {
                this.askAIForMove();
            }
        }, 1000);
    }

    updateTurnInfo() {
        this.ui.setTurn(this.currentPlayer.clientId);
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
            sphinx.canShootLaser = true;
        });
    }

    handlePermanentDisconnect(clientId) {
        const player = (this.player1.clientId === clientId) ? this.player1 : (this.player2.clientId === clientId) ? this.player2 : null;
        if (player) {
            this.ui.displayMessage(`Player ${player.game_id} has permanently disconnected. Ending game.`);
            this.state = "GAME_OVER";
        }
    }

    handleDisconnect(clientId) {
        this.ui.otherPlayerDisconnected(clientId);
    }

    handleReconnect(clientId) {
        this.ui.otherPlayerReconnected(clientId);
        this.ui.setBoard(this.board);
        this.ui.updatePlayerStats(this.player1, this.player2);
        this.ui.setProfile(this.player1.clientId, this.player2.clientId);
        if (this.currentPlayer.clientId === clientId) {
            this.ui.setCurrentPlayer(clientId);
            this.updateTurnInfo();
        }
    }
}