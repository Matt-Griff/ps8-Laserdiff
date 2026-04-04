import { GameLogicManager } from "./controllers/game-logic-manager.js";
import { UIManager } from "./controllers/ui-manager.js";
import { Player } from "./classes/game-classes.js";
import { EloController } from "./controllers/elo-controller.js";


export default class GameManager {
    constructor(mode = "local", gateWaySocket, playersInfo = [], gameId = null) {

        // In order to handle either array of raw client IDs for ai or offline mode, or array of objects with clientId and username for multiplayer mode
        
        const normalizedPlayersInfo = this.normalizePlayersInfo(playersInfo);
        
        let playerArray = this.getPlayer(mode, normalizedPlayersInfo);
        const clientIds = normalizedPlayersInfo.map(info => info.clientId);
        this.uiManager = new UIManager(gateWaySocket, clientIds);
        this.eloController = new EloController();
        this.gameLogic = new GameLogicManager(this.uiManager, this.eloController, playerArray[0], playerArray[1], mode);
        this.mode = mode;
        this.clientIds = clientIds;
        this.gameId = gameId;
    }

    getPlayer(mode, playersInfo) {
        if (mode === "local") {
            const name = playersInfo[0].username || "Player 1";
            const clientId = playersInfo[0].clientId;
            return [new Player(1, name, false, clientId), new Player(2, name + " 2", false, clientId)];
        } else if (mode === "ai") {
            const name = playersInfo[0].username || "Player 1";
            const clientId = playersInfo[0].clientId;
            return [new Player(1, name, false, clientId), new Player(2, "AI", true, clientId)];
        } else {
            const name1 = playersInfo[0].username || "Player 1";
            const name2 = playersInfo[1].username || "Player 2";
            const clientId1 = playersInfo[0].clientId;
            const clientId2 = playersInfo[1].clientId;
            
            return [new Player(1, name1, false, clientId1), new Player(2, name2, false, clientId2)];
        }
    }

    // Returns an array of Player objects to ensure handling of both clientIds and objects with clientId and username
    normalizePlayersInfo(playersInfo) {
        if (!Array.isArray(playersInfo)) {
            throw new Error("playersInfo must be an array");
        }

        if (playersInfo.length === 0) {
            throw new Error("playersInfo cannot be empty");
        }

        return playersInfo.map((info, index) => {
            
            // Already in the right format
            if (typeof info === 'object' && info !== null && info.clientId) {
                return {
                    clientId: info.clientId,
                    username: info.username || `Player ${index + 1}`
                };
            }
            
            // Only client ids
            if (typeof info === 'string' || typeof info === 'number') {
                return {
                    clientId: String(info),
                    username: `Player ${index + 1}`
                };
            }

            // Invalid format
            throw new Error(
                `Invalid playersInfo entry at index ${index}. Expected object with { clientId, username } or raw ID string, got: ${JSON.stringify(info)}`
            );
        });
    }


    startGame() {
        this.gameLogic.start();
    }
}