import { GameLogicManager } from "./controllers/game-logic-manager.js";
import { UIManager } from "./controllers/ui-manager.js";
import { Player } from "./classes/game-classes.js";


export default class GameManager {
    constructor(mode = "local", gateWaySocket, clientIds = [], gameId = null) {
        let playerArray = this.getPlayer(mode, clientIds);
        this.uiManager = new UIManager(gateWaySocket, clientIds);
        this.gameLogic = new GameLogicManager(this.uiManager, playerArray[0], playerArray[1], mode);
        this.mode = mode;
        this.clientIds = clientIds;
        this.gameId = gameId;
    }

    getPlayer(mode, clientIds) {
        if (mode === "local") {
            return [new Player(1, "Player 1", false, clientIds[0]), new Player(2, "Player 2", false, clientIds[0])];
        } else if (mode === "ai") {
            return [new Player(1, "Player 1", false, clientIds[0]), new Player(2, "AI", true)];
        } else {
            return [new Player(1, "Player 1", false, clientIds[0]), new Player(2, "Player 2", false, clientIds[1])];
        }
    }

    startGame() {
        this.gameLogic.start();
    }
}