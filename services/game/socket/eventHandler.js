import GameManager from "../game/game-manager.js";

/**
 * Creates event handlers bound to the shared state.
 * @param {{ clients: Map, games: Map, clientsQueue: Array, deconnectedClients: Map }} state
 */
export function createEventHandler({ clients, games, clientsQueue, deconnectedClients }) {

    function handleOnlineQueue(clientId, gatewaySocket) {
        clientsQueue.push(clientId);
        if (clientsQueue.length >= 2) {
            const player1Id = clientsQueue.shift();
            const player2Id = clientsQueue.shift();
            const gameId = `game-online1v1-${player1Id}-${player2Id}`;

            const game = new GameManager("online", gatewaySocket, [player1Id, player2Id], gameId);
            clients.get(player1Id).game = game;
            clients.get(player2Id).game = game;
            games.set(gameId, game);

            gatewaySocket.emit("game_start", { clientId: player1Id, data: { gameId, opponent: player2Id } });
            gatewaySocket.emit("game_start", { clientId: player2Id, data: { gameId, opponent: player1Id } });
            console.log(`GMS : Starting online game ${gameId} between ${player1Id} and ${player2Id}`);
            game.startGame();
        } else {
            gatewaySocket.emit("waiting_for_opponent", { clientId });
        }
    }

    function onClientConnected(payload, gatewaySocket) {
        const { clientId, mode } = payload;

        if (clients.has(clientId)) {
            console.warn(`GMS : Client ${clientId} already exists, checking for reconnection`);
            if (deconnectedClients.has(clientId)) {
                console.log(`GMS : Client ${clientId} reconnected, restoring game if possible`);
                deconnectedClients.delete(clientId);
                const game = games.get(clients.get(clientId)?.game?.gameId);
                if (game) {
                    game.gameLogic.handleReconnect(clientId, gatewaySocket);
                    return;
                } else {
                    console.warn(`GMS : No game found for reconnected client ${clientId}, treating as new connection`);
                }
            } else {
                const existingClient = clients.get(clientId);
                const existingGame = existingClient?.game;
                if (!existingGame || existingGame.gameLogic.isGameOver()) {
                    console.log(`GMS : Client ${clientId} previous game is over or null, cleaning up and treating as new connection`);
                    if (existingGame) {
                        games.delete(existingGame.gameId);
                    }
                    clients.delete(clientId);
                } else {
                    console.warn(`GMS : Client ${clientId} already connected with an active game, ignoring duplicate connection`);
                    return;
                }
            }
        }
        console.log(`GMS : New Client ${clientId} selected game mode: ${mode}`);

        clients.set(clientId, { gatewaySocketId: gatewaySocket.id, game: null });
        const client = clients.get(clientId);

        function createAndStartGame(type, players, gameId) {
            client.game = new GameManager(type, gatewaySocket, players, gameId);
            games.set(gameId, client.game);
            client.game.startGame();
        }

        switch (mode) {
            case "local":
                createAndStartGame("local", [clientId], `game-local-${clientId}`);
                break;
            case "ai":
                createAndStartGame("ai", [clientId], `game-ai-${clientId}`);
                break;
            case "online":
                handleOnlineQueue(clientId, gatewaySocket);
                break;
            default:
                console.warn(`GMS : Unknown game mode: ${mode}`);
        }
    }

    function onClientDisconnect(payload) {
        const { clientId } = payload;
        console.log(`GMS : Client ${clientId} disconnected`);
        const client = clients.get(payload.clientId);

        // If already marked as disconnected, don't reset the timer
        if (deconnectedClients.has(clientId)) {
            console.log(`GMS : Client ${clientId} already in disconnect grace period, skipping reset`);
            return;
        }

        const queueIndex = clientsQueue.indexOf(clientId);
        if (queueIndex > -1) {
            clientsQueue.splice(queueIndex, 1);
        } else {
            const gameId = client?.game?.gameId;
            if (gameId) {
                const game = games.get(gameId);
                if (game && !game.gameLogic.isGameOver()) {
                    game.gameLogic.handleDisconnect(clientId);
                    deconnectedClients.set(clientId, Date.now() + 30000);
                    setTimeout(() => handleDisconnected(clientId, game), 30000);
                }
            }
        }
    }

    function handleDisconnected(clientId, game) {
        if (!deconnectedClients.has(clientId)) return;
        deconnectedClients.delete(clientId);
        clients.delete(clientId);
        game.gameLogic.handlePermanentDisconnect(clientId);
        console.log(`GMS : Cleaned up disconnected client ${clientId}`);
    }

    function handleGameEvent(eventName, clientId, data) {
        switch (eventName) {
            case "cell_click": {
                const cell = Array.isArray(data) ? data[0] : data;
                console.log(`GMS : Client ${clientId} clicked cell at row ${cell?.row}, col ${cell?.col}`);
                clients.get(clientId)?.game?.gameLogic.handleCellClick(cell.row, cell.col, clientId);
                break;
            }
            case "reserve_click": {
                const playerId = Array.isArray(data) ? data[0]?.playerId : data?.playerId;
                console.log(`GMS : Client ${clientId} clicked reserve for player ${playerId}`);
                clients.get(clientId)?.game?.gameLogic.handleReserveClick(playerId, clientId);
                break;
            }
            case "rotate": {
                const direction = Array.isArray(data) ? data[0]?.direction : data?.direction;
                console.log(`GMS : Client ${clientId} requested rotation: ${direction}`);
                clients.get(clientId)?.game?.gameLogic.handleRotation(direction, clientId);
                break;
            }
            case "swap":
                console.log(`GMS : Client ${clientId} requested swap`);
                clients.get(clientId)?.game?.gameLogic.handleSwap(clientId);
                break;
            case "pyramid_sector_response": {
                const sector = Array.isArray(data) ? data[0]?.sector : data?.sector;
                console.log(`GMS : Client ${clientId} responded with pyramid sector: ${sector}`);
                clients.get(clientId)?.game?.gameLogic.handlePyramidSectorResponse(sector, clientId);
                break;
            }
            default:
                console.error("GMS : Unknown event: " + eventName);
        }
    }

    function onIsGameActive(payload, gatewaySocket) {
        const { clientId } = payload;
        const client = clients.get(clientId);
        const game = client?.game;
        const isActive = !!game && !game?.gameLogic.isGameOver();
        console.log(`GMS : Client ${clientId} is_game_active check: ${isActive}`);

        if (game && game.gameLogic.isGameOver()) {
            const gameId = game.gameId;
            client.game = null;
            games.delete(gameId);
            deconnectedClients.delete(clientId);
        }
        const endTimestamp = deconnectedClients.get(clientId) || null;
        const remainingMs = endTimestamp ? Math.max(0, endTimestamp - Date.now()) : null;
        gatewaySocket.emit("game_active_status", { clientId, data: { isActive, remainingMs } });
    }

    return { onClientConnected, onClientDisconnect, onIsGameActive, handleGameEvent };
}
