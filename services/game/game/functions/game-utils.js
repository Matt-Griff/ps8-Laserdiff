import { Anubis, Sphinx, Pharaoh, Scarab, MoveablePawn, MoveableRotateablePawn } from "../classes/game-classes.js";
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

const getLeftAdjacentPiece = (board, row, col) => {
    if (col > 0) {
        return board[row][col - 1];
    }
    return null;
}

const getRightAdjacentPiece = (board, row, col) => {
    if (col < BOARDSIZE - 1) {
        return board[row][col + 1];
    }
    return null;
}

const getTopAdjacentPiece = (board, row, col) => {
    if (row > 0) {
        return board[row - 1][col];
    }
    return null;
}

const getBottomAdjacentPiece = (board, row, col) => {
    if (row < BOARDSIZE - 1) {
        return board[row + 1][col];
    }
    return null;
}

const getSphinxOfPlayer = (board, player) => {
    for (let row = 0; row < BOARDSIZE; row++) {
        for (let col = 0; col < BOARDSIZE; col++) {
            const pawn = board[row][col];
            if (pawn instanceof Sphinx && pawn.owner === player) {
                return pawn;
            }
        }
    }
    return null;
}

const getPharaohOfPlayer = (board, player) => {
    for (let row = 0; row < BOARDSIZE; row++) {
        for (let col = 0; col < BOARDSIZE; col++) {
            const pawn = board[row][col];
            if (pawn instanceof Pharaoh && pawn.owner.game_id === player.game_id) {
                return pawn;
            }
        }
    }
    return null;
}

const getScarabOfPlayer = (board, playerID) => {
    for (let row = 0; row < BOARDSIZE; row++) {
        for (let col = 0; col < BOARDSIZE; col++) {
            const pawn = board[row][col];
            if (pawn instanceof Scarab && pawn.owner.game_id === playerID) {
                return pawn;
            }
        }
    }
}

const orientationSerializationMap = {
    0: 90,
    90: 0,
    180: 9,
    270: 99,
}

const getOrentationForAi = (orientation) => {
    return orientationSerializationMap[orientation];
}


export {
    checkIfUniquePawnAlreadyPlaced,
    getPawnPosition,
    getSecondAnubisPosition,
    getLeftAdjacentPiece,
    getRightAdjacentPiece,
    getTopAdjacentPiece,
    getBottomAdjacentPiece,
    getSphinxOfPlayer,
    getPharaohOfPlayer,
    getScarabOfPlayer,
    getOrentationForAi
}