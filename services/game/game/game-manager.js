import { GameLogicManager } from "./controllers/game-logic-manager.js";
import { UIManager } from "./controllers/ui-manager.js";
import { Player } from "./classes/game-classes.js";
import { EloController } from "./controllers/elo-controller.js";


export default class GameManager {
    constructor(mode = "local", gateWaySocket, playersInfo = [], gameId = null) {
        let playerArray = this.getPlayer(mode, playersInfo);
        const clientIds = playersInfo.map(info => info.clientId);
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
            return [new Player(1, name, false, playersInfo[0].clientId), new Player(2, name + " 2", false, playersInfo[0].clientId)];
        } else if (mode === "ai") {
            const name = playersInfo[0].username || "Player 1";
            return [new Player(1, name, false, playersInfo[0].clientId), new Player(2, "AI", true, playersInfo[0].clientId)];
        } else {
            const name1 = playersInfo[0].username || "Player 1";
            const name2 = playersInfo[1].username || "Player 2";
            return [new Player(1, name1, false, playersInfo[0].clientId), new Player(2, name2, false, playersInfo[1].clientId)];
        }
    }

    startGame() {
        this.gameLogic.start();
    }
}