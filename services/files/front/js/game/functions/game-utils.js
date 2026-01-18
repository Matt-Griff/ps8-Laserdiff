import { Anubis } from "../classes/game-classes.js";
import { BOARDSIZE } from "../utils/game-constants.js";

const checkIfUniquePawnAlreadyPlaced = (board, player, clazz) => board.flat().some(pawn => pawn instanceof clazz && pawn.owner === player);

const getPawnPosition = (board, playerId, clazz) => {

    for (let row = 0; row < BOARDSIZE; row++) {
        for (let col = 0; col < BOARDSIZE; col++) {
            const pawn = board[row][col];
            if (pawn instanceof clazz && pawn.owner.game_id === playerId) {
                return { row, col };
            }
        }
    }

    return null;
}

const getSecondAnubisPosition = (board, playerId) => {

    for (let row = 0; row < BOARDSIZE; row++) {
        const pawn = board[row][2];
        if (pawn instanceof Anubis && pawn.owner.game_id === playerId) {
            return { row, col: 2 };
        }
    }
    return null;
}

const getLeftAdjacentPiece = (board, col, row) => {
    if (col > 0) {
        return board[col - 1][row];
    }
    return null;
}

const getRightAdjacentPiece = (board, col, row) => {
    if (col < BOARDSIZE - 1) {
        return board[col + 1][row];
    }
    return null;
}

const getTopAdjacentPiece = (board, col, row) => {
    if (row > 0) {
        return board[col][row - 1];
    }
    return null;
}

const getBottomAdjacentPiece = (board, col, row) => {
    if (row < BOARDSIZE - 1) {
        return board[col][row + 1];
    }
    return null;
}


export {
    checkIfUniquePawnAlreadyPlaced,
    getPawnPosition,
    getSecondAnubisPosition,
    getLeftAdjacentPiece,
    getRightAdjacentPiece,
    getTopAdjacentPiece,
    getBottomAdjacentPiece
}