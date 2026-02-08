export class SocketCommunication {
    constructor(uiManager, socket) {
        this.socket = socket;
        this.uiManager = uiManager;
    }

    bind(gameMode) {
        this.bindSocketEvents(gameMode);
        this.bindUi(this.uiManager);
    }

    bindSocketEvents(gameMode) {
        this.socket.emit("game_mode", { mode: gameMode });

        this.socket.onAny((eventName, payload) => {
            // console.log(`Received event: ${eventName} with payload:`, payload); 
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
        this.socket.emit("cell_click", { 'row': row, 'col': col });
    }

    handleReserveClick(pid) {
        this.socket.emit("reserve_click", { 'playerId': pid });
    }

    handleRotation(direction) {
        this.socket.emit("rotate", { 'direction': direction });
    }

    handleSwap() {
        this.socket.emit("swap");
    }
}