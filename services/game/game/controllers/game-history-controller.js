import axios from "axios";

export class GameHistoryController {
    constructor() {
        this.rankingServiceUrl = process.env.RANKING_SERVICE_URL || "http://localhost:8005";
    }

    saveGame(player1, player2, winner, turnCount, mode, eloChange={p1: 0, p2: 0}) {
        // Save to both players history (if they are both human ofc, otherwise only to the human player)

        switch(mode) {
            case "Online 1v1":
                this.saveGameForPlayer(player1, player2, winner, turnCount, mode, eloChange.p1);
                this.saveGameForPlayer(player2, player1, winner, turnCount, mode, eloChange.p2);
                break;
            case "Ai vs Player":
                this.saveGameForPlayer(player1, player2, winner, turnCount, mode, eloChange.p1);
                break;
            case "Local 1v1":
                this.saveGameForPlayer(player1, player2, winner, turnCount, mode, 0);
                break;
            default:
                console.warn("Unknown game mode for history saving:", mode);
                break;    
        }
    }

    async saveGameForPlayer(player, opponent, winner, turnCount, mode, eloChange) {
        if (player.is_ai) return; // Don't save for AI players
        
        let resultStr = "Draw";
        if (winner) {
            resultStr = player.name === winner.name ? "Victory" : "Defeat";
        }

        const gameRecord = {
            result: resultStr,
            mode: mode,
            date: new Date().toISOString(),
            opponentProfilePic: null, // Directly setting it in the ranking service to avoid multiple fetches in one
            opponentUsername: opponent.name || "Unknown",
            turnCount: turnCount + 1,
            eloChange: eloChange
        };
        console.log("Saving game history for player:", player.name, gameRecord);
        await axios.post(`${this.rankingServiceUrl}/api/user/${player.name}/games`, gameRecord).catch(err => {
            console.error("Failed to save game history for player:", player.name, err);
        });
    }
}