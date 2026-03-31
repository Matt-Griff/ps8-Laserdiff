import axios from "axios";

export class EloController {
    
    async handleEloUpdate(player1, player2, winner) {
        const player1CurrentElo = await this.getEloFrom(player1.name);
        const player2CurrentElo = await this.getEloFrom(player2.name);

        if (player1CurrentElo === null || player2CurrentElo === null) {
            console.error("Cannot compute new elo: missing elo data");
            return;
        }
        
        const player1Win = winner === player1 ? 1 : 0;
        const player2Win = winner === player2 ? 1 : 0;
        
        const newEloPlayer1 = await this.computeNewElo(player1CurrentElo, player2CurrentElo, player1Win);
        const newEloPlayer2 = await this.computeNewElo(player2CurrentElo, player1CurrentElo, player2Win);

        
        await this.updateElo(player1.name, newEloPlayer1);
        await this.updateElo(player2.name, newEloPlayer2);
    }

    async computeNewElo(playerElo, opponentElo, win) {
        const K = 30;
        
        const v = (D) => {
            return 1 / (1 + Math.pow(10, -D/400));
        }

        const D = playerElo - opponentElo;
        const vD = v(D);
        const newElo = Math.round(playerElo + K * (win - vD));

        return newElo;
    }

    async getEloFrom(username) {
        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";
        try {
            const res = await axios.get(`${USER_SERVICE_URL}/api/user/${username}/elo`);
            return res.data.elo;
        } catch (error) {
            console.error("Error fetching elo for user " + username, error);
            return null;
        }
    }


    async updateElo(username, newElo) {
        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";
        try {
            await axios.put(`${USER_SERVICE_URL}/api/user/${username}/elo`, { elo: newElo });
        } catch (error) {
            console.error("Error updating elo for user " + username, error);
        }
    }

}