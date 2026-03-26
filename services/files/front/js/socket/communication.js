import { getMyJWT } from "../controllers/user-controller.js";

export class SocketCommunication {
    constructor(uiManager, socket) {
        this.socket = socket;
        this.uiManager = uiManager;
        this.canSendMove = true;
    }

    bind(gameMode, opponentId = null) {
        this.bindSocketEvents(gameMode, opponentId);
        this.bindUi(this.uiManager);
    }

    bindSocketEvents(gameMode, opponentId = null) {
        this.socket.emit("client_init", { clientJWT: getMyJWT(), mode: gameMode, opponentId });

        this.socket.onAny((eventName, payload) => {
            console.log(`Received event: ${eventName} with payload:`, payload);
        });

        this.socket.on("game_start", (payload) => {
            console.log("Game started with payload:", payload);
            this.uiManager.displayMessage("Game started! Your opponent is " + payload.opponent);
        });

        this.socket.on("waiting_for_opponent", (payload) => {
            console.log("Waiting for opponent");
            this.uiManager.displayMessage("Waiting for opponent...");
        });

        this.socket.on("disable_actions", (payload) => {
            this.uiManager.toggleRotationButtons(false);
            this.uiManager.disableSwapButton();
            this.canSendMove = false;
        });

        this.socket.on("enable_actions", (payload) => {
            this.canSendMove = true;
        });

        this.socket.on("welcome", (payload) => {
            console.log("Received welcome from server:", payload);
        });

        this.socket.on("message", (payload) => {
            this.uiManager.displayMessage(payload.message);
        });

        this.socket.on("set_board", (payload) => {
            this.uiManager.setBoard(payload.board);
        });

        this.socket.on("theme_update", (payload) => {
            this.uiManager.setTheme(payload.playerId);
        });

        this.socket.on("layer_stats_update", (payload) => {
            this.uiManager.updatePlayerStats(payload.player1, payload.player2);
        });

        this.socket.on("get_pyramid_sector", (payload) => {
            let ps = this.uiManager.getPyramidSectorClicker();
            this.socket.emit("pyramid_sector_response", { sector: ps });
        });

        this.socket.on("possible_moves", (payload) => {
            this.uiManager.setPossibleMoves(payload.moves);
        });

        this.socket.on("draw_pyramid_placements", (payload) => {
            this.uiManager.drawPossiblePyramidPlacements(payload.playerId);
        });

        this.socket.on("remove_pyramid_handler", (payload) => {
            this.uiManager.removePyramidMouseMoveHandler();
        });

        this.socket.on("position_highlight", (payload) => {
            this.uiManager.drawPositionHighlighter(payload.row, payload.col);
        });

        this.socket.on("laser_path", (payload) => {
            this.uiManager.displayLaserPath(payload.laserMap, payload.playerId);
        });

        this.socket.on("swap_button", (payload) => {
            if (payload.enabled) {
                this.uiManager.enableSwapButton();
            } else {
                this.uiManager.disableSwapButton();
            }
        });

        this.socket.on("rotate_buttons", (payload) => {
            this.uiManager.toggleRotationButtons(payload.enabled);
        });

        this.socket.on("history_update", (payload) => {
            const { roundId, playerId, pieceType, fromRow, fromCol, toRow, toCol, actionType } = payload;
            this.uiManager.elements.history.addHistoryMove(roundId, playerId, pieceType, fromRow, fromCol, toRow, toCol, actionType);
        });

        this.socket.on("set_profile", (payload) => {
            const { player1Id, player2Id } = payload;
            this.uiManager.setProfile(player1Id, player2Id);
        });

        this.socket.on("other_player_disconnected", (payload) => {
            this.uiManager.otherPlayerDisconnected(payload.clientId);
        });

        this.socket.on("other_player_reconnected", (payload) => {
            this.uiManager.otherPlayerReconnected(payload.clientId);
        });

        this.socket.on("set_turn", (payload) => {
            this.uiManager.setTurn(payload.playerId);
        });

        this.socket.on("game_end", (payload) => {
            this.uiManager.setEndResult(payload.isVictorious);
        });

        this.socket.on("play_sound", (payload) => {
            this.uiManager.playEndSound(payload.isVictorious);
        });


    }

    bindUi(uiManager) {
        uiManager.bindEvents(
            {
                onCellClick: (row, col) => this.handleCellClick(row, col),
                onReserveClick: (pid) => this.handleReserveClick(pid),
                onRotate: (direction) => this.handleRotation(direction),
                onSwap: () => this.handleSwap(),
            }
        )
    }

    handleCellClick(row, col) {
        if (!this.canSendMove) return;
        console.log(`Emitting cell_click for row ${row}, col ${col}`);
        this.socket.emit("cell_click", { 'row': row, 'col': col });
    }

    handleReserveClick(pid) {
        if (!this.canSendMove) return;
        console.log(`Emitting reserve_click for playerId ${pid}`);
        this.socket.emit("reserve_click", { 'playerId': pid });
    }

    handleRotation(direction) {
        if (!this.canSendMove) return;
        console.log(`Emitting rotate for direction ${direction}`);
        this.socket.emit("rotate", { 'direction': direction });
    }

    handleSwap() {
        if (!this.canSendMove) return;
        console.log("Emitting swap");
        this.socket.emit("swap");
    }
}