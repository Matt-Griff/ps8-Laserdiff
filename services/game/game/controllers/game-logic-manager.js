import { createBoard, initGamePieces, serializeBoard } from "../functions/game-functions.js";
import * as Actions from "../functions/game-actions-functions.js";
import { setup, nextMove, createAIInstance } from "../../ai/laserdiff.js";
import { RotateablePawn, MoveableRotateablePawn } from "../classes/game-classes.js";
import { getSphinxOfPlayer, getPharaohOfPlayer, getOrentationForAi } from "../functions/game-utils.js";

export class GameLogicManager {
    constructor(uiManager, eloController, gameHistoryController, player1 = null, player2 = null, mode = "local") {
        this.ui = uiManager;
        this.eloController = eloController;
        this.gameHistoryController = gameHistoryController;
        this.board = createBoard();
        this.mode = mode;
        this.ai = null;
        this.player1 = player1;
        this.player2 = player2;
        this.currentPlayer = Math.random() < 0.5 ? this.player1 : this.player2;

        // GAME STATE
        this.state = "IDLE"; // IDLE, SELECTED, PLACING_RESERVE, CONFIRM_RESERVE_PLACEMENT, GAME_OVER
        this.selectedPiece = null;
        this.selectedCoords = null;
        this.previewCoords = null;
        this.previewRotation = 0;
        this.nextCoords = null;
        this.turnCount = 0;
        this.moveInTurn = 0; // 0: first player, 1: second player
        this.rotation = "N/A";
        this.previousAction = {
            "action": "N/A",  // "ROTATE", "MOVE", "PLACE", "EXCHANGE".
            "cell": null, // rowCol = cell 27 is the cell in the 8th column of the 3rd line
            "result": "N/A" // "CCW, "CW", coords, {destination: Cell, orientation: 0|9|90|99}
        };

        // Timer properties
        const STARTING_TIME_MS = 600000; // 10 minutes (600,000 ms)
        this.player1Time = STARTING_TIME_MS;
        this.player2Time = STARTING_TIME_MS;
        this.timerInterval = null;
        this.lastTurnStartTime = null;

        // Initialize
        initGamePieces(this.board, this.player1, this.player2);
        this.initializeForAI(this.player1, this.player2);
    }

    start() {
        this.ui.setProfile(this.player1.clientId, this.player2.clientId, this.player1.name, this.player2.name);
        this.ui.setCurrentPlayer(this.currentPlayer.clientId);
        this.ui.setBoard(this.board);
        this.updateTurnInfo();
        this.startTimer();
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
            const placements = Actions.getPossibleReservePlacements(this.board, this.currentPlayer);
            if (!placements.some(p => p.row === row && p.col === col)) return; // not valid
            
            this.ui.removePyramidMouseMoveHandler();
            const rotation = await this.getPyramidSectorClicker(); // initial rotation from hover
            
            this.state = "CONFIRM_RESERVE_PLACEMENT";
            this.previewCoords = { row, col };
            this.previewRotation = rotation;
            
            const pieceColor = this.currentPlayer.game_id === 1 ? "red" : "blue";
            this.ui.showPreviewPyramid(row, col, pieceColor, rotation);
            this.ui.showPlacementOverlay(row, col);
            this.ui.toggleRotationButtons(true);
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
            console.warn(`Received rotation request from client ${clientId}, but it's not their turn.`);
            return;
        }

        if (this.state === "CONFIRM_RESERVE_PLACEMENT") {
            if (direction === "clockwise") {
                this.previewRotation = (this.previewRotation + 270) % 360;
            } else {
                this.previewRotation = (this.previewRotation + 90) % 360;
            }
            const pieceColor = this.currentPlayer.game_id === 1 ? "red" : "blue";
            this.ui.showPreviewPyramid(this.previewCoords.row, this.previewCoords.col, pieceColor, this.previewRotation);
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

    handleValidatePlacement(clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) return;
        if (this.state !== "CONFIRM_RESERVE_PLACEMENT") return;

        const { row, col } = this.previewCoords;

        let commandRotation = this.previewRotation;
        if (this.currentPlayer.game_id === 1) {
            commandRotation = (360 - this.previewRotation) % 360;
        } else if (this.currentPlayer.game_id === 2) {
            commandRotation = (180 - this.previewRotation + 360) % 360;
        }

        const success = Actions.placePyramid(this.board, row, col, this.currentPlayer, commandRotation);
        
        this.ui.hidePlacementOverlay();
        this.ui.toggleRotationButtons(false);

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
            this.ui.setBoard(this.board);
        }
    }

    handleCancelPlacement(clientId = null) {
        if (this.mode === "online" && this.currentPlayer.clientId !== clientId) return;
        if (this.state !== "CONFIRM_RESERVE_PLACEMENT") return;

        this.state = "IDLE";
        this.previewCoords = null;
        this.ui.hidePlacementOverlay();
        this.ui.toggleRotationButtons(false);
        this.ui.setPossibleMoves(null);
        this.ui.setBoard(this.board);
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
        if (player1.is_ai || player2.is_ai) {
            this.ai = createAIInstance();
            const isFirst = player1.is_ai ? isPlayerOneFirst : !isPlayerOneFirst;
            Promise.race([
                this.ai.setup(boardState, isFirst),
                new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000))
            ]).then((result) => {
                console.log(result);
            });
        }
    }

    askAIForMove() {
        if (!this.ai) return;
        const action = this.previousAction;
        Promise.race([
            this.ai.nextMove(action),
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

    stopTimer() {
        if (this.timerInterval) {
            clearTimeout(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.lastTurnStartTime) {
            const elapsed = Date.now() - this.lastTurnStartTime;
            if (this.currentPlayer === this.player1) {
                this.player1Time = Math.max(0, this.player1Time - elapsed);
            } else {
                this.player2Time = Math.max(0, this.player2Time - elapsed);
            }
            this.lastTurnStartTime = null;
        }
    }

    startTimer() {
        if (this.state === "GAME_OVER") return;
        this.stopTimer();
        this.lastTurnStartTime = Date.now();
        const remainingTime = this.currentPlayer === this.player1 ? this.player1Time : this.player2Time;

        // Add +1500ms of lag compensation
        this.timerInterval = setTimeout(() => {
            if (this.state !== "GAME_OVER") {
                this.handleTimeout(this.currentPlayer.game_id, "server");
            }
        }, remainingTime + 1500);
    }

    resyncTimerAfterReconnect() {
        if (this.state === "GAME_OVER") return;
        this.stopTimer();
        this.startTimer();
    }

    endTurn() {
        this.stopTimer();

        // 0. Update UI & History
        this.ui.updateHistory(this.turnCount + 1, this.currentPlayer.game_id, this.previousAction);
        this.ui.setBoard(this.board);
        this.deselect();

        // 1. Laser Phase
        const laserData = Actions.shootLaser(this.board, this.currentPlayer, this.player1, this.player2);

        const winner = Actions.checkGameOver(this.board, this.player1, this.player2);
        if (winner) {
            this.state = "GAME_OVER";
            this.stopTimer();
            this.ui.syncTimers(this.player1Time, this.player2Time, true);
            this.ui.displayMessage(`Game Over! Player ${winner.name} wins!`);
            switch (this.mode) {
                case "online":
                    this.ui.playSound(winner.clientId);
                    this.ui.showEndResult(winner.clientId);
                    this.eloController.handleEloUpdate(this.player1, this.player2, winner, (p1OldElo, p1NewElo, p2OldElo, p2NewElo) => {
                        const eloChange = { p1: p1NewElo - p1OldElo, p2: p2NewElo - p2OldElo };
                        this.gameHistoryController.saveGame(this.player1, this.player2, winner, this.turnCount, "Online 1v1", eloChange);
                    });
                    break;
                case "duel":
                    this.ui.showEndResult(winner.clientId);
                    this.gameHistoryController.saveGame(this.player1, this.player2, winner, this.turnCount, "Online 1v1");
                    break;
                case "ai":
                    this.ui.playSoundAi(!winner.is_ai);
                    this.ui.showEndResultAi(!winner.is_ai);
                    this.gameHistoryController.saveGame(this.player1, this.player2, winner, this.turnCount, "Ai vs Player");
                    break;
                default:
                    this.ui.showEndResultAi(true);
                    break;
            }
        }
        this.ui.displayLaserPath(laserData, this.currentPlayer.game_id);

        // Cooldowns
        if (this.moveInTurn === 0) {
            this.updateCooldowns();
            this.ui.updatePlayerStats(this.player1, this.player2);
        }

        // 3. Check Win Condition
        const isDraw = Actions.checkDraw(this.board, this.player1, this.player2);
        if (isDraw || this.turnCount > 100) {
            this.state = "GAME_OVER";
            this.stopTimer();
            this.ui.syncTimers(this.player1Time, this.player2Time, true);
            this.ui.displayMessage(`Game Over! Beautiful game, it's a draw!`);
            this.ui.showDraw();
        }

        if (this.state === "GAME_OVER") {
            return;
        }

        // 4. Switch Player
        this.currentPlayer = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
        // Only increment turnCount after both players have moved
        this.moveInTurn = 1 - this.moveInTurn;
        if (this.moveInTurn === 0) {
            this.turnCount++;
        }
        this.updateTurnInfo();
        this.startTimer();
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
        this.ui.setTurn(
            this.currentPlayer.clientId,
            this.currentPlayer.game_id,
            this.player1Time,
            this.player2Time
        );
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
            this.stopTimer();
        }
    }

    handleDisconnect(clientId) {
        this.ui.otherPlayerDisconnected(clientId);
    }

    handleReconnect(clientId) {
        this.ui.otherPlayerReconnected(clientId);
        this.resyncTimerAfterReconnect();
        this.ui.setBoard(this.board, clientId);
        this.ui.updatePlayerStats(this.player1, this.player2);
        this.ui.setProfile(this.player1.clientId, this.player2.clientId);
        if (this.currentPlayer.clientId === clientId) {
            this.ui.setCurrentPlayer(clientId);
        }
        this.updateTurnInfo();
    }

    handleTimeout(playerIdx, clientId) {
        if (clientId !== "server") {
            console.warn(`Blocked spoofed timeout event from client ${clientId}`);
            return;
        }

        if (this.state === "GAME_OVER") return;

        // Identify loser and winner based on reported playerIdx
        const loser = (playerIdx === 1) ? this.player1 : this.player2;
        const winner = (playerIdx === 1) ? this.player2 : this.player1;

        if (!loser || !winner) return;

        this.state = "GAME_OVER";
        this.stopTimer();

        // Hard clamp the loser's time strictly to 0 
        if (loser === this.player1) {
            this.player1Time = 0;
        } else {
            this.player2Time = 0;
        }

        // Just sync timers directly, don't tell the frontend it's the winner's "turn"
        this.ui.syncTimers(this.player1Time, this.player2Time, true);

        this.ui.displayMessage(`Game Over! Player ${winner.game_id} wins! Player ${loser.game_id} timed out.`);

        if (this.mode === "online") {
            this.ui.playSound(winner.clientId);
            this.ui.showEndResult(winner.clientId);
        } else if (this.mode === "ai") {
            this.ui.playSoundAi(!winner.is_ai);
            this.ui.showEndResultAi(!winner.is_ai);
        } else {
            this.ui.showEndResultAi(true);
        }
    }

    isGameOver() {
        return this.state === "GAME_OVER";
    }
}