export class UIManager {
    constructor(gateWaySocket, clientIds) {
        this.gateWaySocket = gateWaySocket;
        this.clientIds = clientIds;
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
        this.sentMessage("rotate_buttons", { enabled: active });
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
        this.sentMessage("get_pyramid_sector", {});
    }

    setPossibleMoves(moves) {
        this.sentMessage("possible_moves", { "moves": moves });
    }

    drawPossiblePyramidPlacements(playerId) {
        this.sentMessage("draw_pyramid_placements", { "playerId": playerId });
    }

    removePyramidMouseMoveHandler() {
        this.sentMessage("remove_pyramid_handler", {});
    }

    drawPositionHighlighter(row, col) {
        this.sentMessage("position_highlight", { "row": row, "col": col });
    }

    displayLaserPath(laserMap, playerId) {
        this.sentMessage("laser_path", { "laserMap": laserMap, "playerId": playerId });
    }

    enableSwapButton() {
        this.sentMessage("swap_button", { enabled: true });
    }

    disableSwapButton() {
        this.sentMessage("swap_button", { enabled: false });
    }

    sentMessage(eventName, data) {
        for (const clientId of this.clientIds) {
            this.gateWaySocket.emit(eventName, { clientId, data });
        }
    }
}