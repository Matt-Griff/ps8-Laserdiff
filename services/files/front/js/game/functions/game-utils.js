import { Anubis } from "../classes/game-classes.js";
import { BOARDSIZE } from "../utils/game-constants.js";

const checkIfUniquePawnAlreadyPlaced = (board, player, clazz) => board.flat().some(pawn => pawn instanceof clazz && pawn.owner === player);

const getPawnPosition = (board, playerId, clazz) => {

    for (let col = 0; col < BOARDSIZE; col++) {
        for (let row = 0; row < BOARDSIZE; row++) {
            const pawn = board[col][row];
            if (pawn instanceof clazz && pawn.owner.game_id === playerId) {
                return { col, row };
            }
        }
    }

    return null;
}

const getSecondAnubisPosition = (board, playerId) => {

    for (let col = 0; col < BOARDSIZE; col++) {
        const pawn = board[col][2];
        if (pawn instanceof Anubis && pawn.owner.game_id === playerId) {
            return { col, row: 2 };
        }
    }
    return null;
}


export {
    checkIfUniquePawnAlreadyPlaced,
    getPawnPosition,
    getSecondAnubisPosition
}