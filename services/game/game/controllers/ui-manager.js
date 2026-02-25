export class UIManager {
    constructor(gateWaySocket, clientIds) {
        this.gateWaySocket = gateWaySocket;
        this.clientIds = clientIds;
    }

    setCurrentPlayer(playerId) {
        this.currentPlayerId = playerId;
        this.disableOtherPlayerActions(playerId);
        this.enablePlayerActions(playerId);
    }

    disableOtherPlayerActions(playerId) {
        if (this.clientIds.length < 2) return;
        const otherClientId = this.clientIds.find(id => id !== playerId);
        if (otherClientId) {
            this.gateWaySocket.emit("disable_actions", { clientId: otherClientId });
        }
    }

    enablePlayerActions(playerId) {
        if (this.clientIds.length < 2) return;
        this.gateWaySocket.emit("enable_actions", { clientId: playerId });
    }

    displayMessage(message) {
        this.sentMessage("message", { "message": message });
    }

    setTheme(playerId) {
        this.sentMessage("theme_update", { "playerId": playerId });
    }

    updatePlayerStats(player1, player2) {
        let data1 = this.updateSinglePlayerGUI(player1);
        let data2 = this.updateSinglePlayerGUI(player2);
        this.sentMessage("layer_stats_update", { "player1": data1, "player2": data2 });
    }

    updateSinglePlayerGUI(player) {
        return {
            "pyramidCount": player.pyramid_count,
            "cooldownCount": player.pyramid_cooldown.length,
            "killedAnubis": player.killed_anubis,
        };
    }

    toggleRotationButtons(active) {
        this.sentMessage("rotate_buttons", { enabled: active }, true);
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
        this.sentMessage("history_update", {
            "roundId": roundId,
            "playerId": playerId,
            "pieceType": pieceType,
            "fromRow": fromRow,
            "fromCol": fromCol,
            "toRow": toRow,
            "toCol": toCol,
            "actionType": actionType
        });
    }

    setBoard(board) {
        let boardData = [];
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                let piece = board[row][col];
                if (piece) {
                    boardData.push({
                        row: row,
                        col: col,
                        type: piece.constructor.name.toLowerCase(),
                        ownerId: piece.owner.game_id,
                        orientation: piece.orientation || 0
                    });
                }
            }
        }
        this.sentMessage("set_board", { "board": boardData });
    }

    getPyramidSectorClicker() {
        this.sentMessage("get_pyramid_sector", {}, true);
    }

    setPossibleMoves(moves) {
        this.sentMessage("possible_moves", { "moves": moves }, true);
    }

    drawPossiblePyramidPlacements(playerId) {
        this.sentMessage("draw_pyramid_placements", { "playerId": playerId }, true);
    }

    removePyramidMouseMoveHandler() {
        this.sentMessage("remove_pyramid_handler", {}, true);
    }

    drawPositionHighlighter(row, col) {
        this.sentMessage("position_highlight", { "row": row, "col": col }, true);
    }

    displayLaserPath(laserMap, playerId) {
        this.sentMessage("laser_path", { "laserMap": laserMap, "playerId": playerId });
    }

    enableSwapButton() {
        this.sentMessage("swap_button", { enabled: true }, true);
    }

    disableSwapButton() {
        this.sentMessage("swap_button", { enabled: false }, true);
    }

    otherPlayerDisconnected(clientId) {
        const otherClientId = this.clientIds.find(id => id !== clientId);
        if (otherClientId) {
            this.sentMessage("other_player_disconnected", { clientId: otherClientId }, otherClientId);
        }
    }

    otherPlayerReconnected(clientId) {
        const otherClientId = this.clientIds.find(id => id !== clientId);
        if (otherClientId) {
            this.uniqueSentMessage("other_player_reconnected", { clientId: otherClientId }, otherClientId);
        }
    }

    uniqueSentMessage(eventName, data, clientId) {
        this.gateWaySocket.emit(eventName, { clientId, data });
    }

    sentMessage(eventName, data, currentPlayerOnly = false) {
        if (currentPlayerOnly) {
            this.gateWaySocket.emit(eventName, { clientId: this.currentPlayerId, data });
            return;
        }
        for (const clientId of this.clientIds) {
            this.gateWaySocket.emit(eventName, { clientId, data });
        }
    }
}