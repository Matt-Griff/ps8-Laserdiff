import { Sphinx, Anubis, Scarab, Pharaoh } from "../classes/game-classes.js";
import { checkIfUniquePawnAlreadyPlaced, getPawnPosition, getSecondAnubisPosition } from "./game-utils.js";
import { BOARDSIZE } from "../utils/game-constants.js";

const initSphinx = (board, player) => {

    if (checkIfUniquePawnAlreadyPlaced(board, player, Sphinx)) return;

    const sphinx = new Sphinx(player);
    let randomCol = Math.floor(Math.random() * BOARDSIZE);

    if (player.game_id === 1) {
        board[0][randomCol] = sphinx;
    } else {
        const player1SphinxPos = getPawnPosition(board, 1, Sphinx);
        const symCol = BOARDSIZE - 1 - player1SphinxPos.col;
        const symRow = BOARDSIZE - 1 - player1SphinxPos.row;
        board[symRow][symCol] = sphinx;
    }

}

const initPharaoh = (board, player) => {

    if (checkIfUniquePawnAlreadyPlaced(board, player, Pharaoh)) return;

    const pharaoh = new Pharaoh(player);

    if (player.game_id === 1) {
        let row = 2;
        const currentPlayerSphinxPos = getPawnPosition(board, player.game_id, Sphinx);
        const opponentPlayerSphinxPos = getPawnPosition(board, player.game_id === 1 ? 2 : 1, Sphinx);

        const currentPlayerSphinxCol = currentPlayerSphinxPos.col;
        const opponentPlayerSphinxCol = opponentPlayerSphinxPos.col;

        const availableCols = [];

        for (let col = 1; col < BOARDSIZE - 1; col++) {
            if (col !== currentPlayerSphinxCol && col !== opponentPlayerSphinxCol) {
                availableCols.push(col);
            }
        }

        const randomIndex = Math.floor(Math.random() * availableCols.length);
        const selectedCol = availableCols[randomIndex];
        board[row][selectedCol] = pharaoh;
    }

    else {
        const player1PharaohPos = getPawnPosition(board, 1, Pharaoh);
        const symCol = BOARDSIZE - 1 - player1PharaohPos.col;
        const symRow = BOARDSIZE - 1 - player1PharaohPos.row;
        board[symRow][symCol] = pharaoh;
    }

}

const initFirstAnubis = (board, player) => {

    const anubis = new Anubis(player);

    if (player.game_id === 1) {
        let row = 4;
        let col = getPawnPosition(board, player.game_id, Pharaoh).col;
        board[row][col] = anubis;
    }

    else {
        const player1FirstAnubisPos = getPawnPosition(board, 1, Anubis);
        const symCol = BOARDSIZE - 1 - player1FirstAnubisPos.col;
        const symRow = BOARDSIZE - 1 - player1FirstAnubisPos.row;
        board[symRow][symCol] = anubis;
    }


}

const initSecondAnubis = (board, player) => {

    const anubis = new Anubis(player);

    if (player.game_id === 1) {
        let row = 2;
        let col = getPawnPosition(board, 2, Sphinx).col;
        board[row][col] = anubis;
    } else {
        const player1SecondAnubisPos = getPawnPosition(board, 1, Anubis);
        const symCol = BOARDSIZE - 1 - player1SecondAnubisPos.col;
        const symRow = BOARDSIZE - 1 - player1SecondAnubisPos.row;
        board[symRow][symCol] = anubis;
    }

}

const initScarab = (board, player, orientation) => {

    const scarab = new Scarab(player);
    if (orientation == 90) {
        scarab.rotateClockwise();
    }

    if (player.game_id === 1) {
        let row = 3;
        let col = Math.floor(Math.random() * BOARDSIZE);
        board[row][col] = scarab;
    }

    else {
        const player1ScarabPos = getPawnPosition(board, 1, Scarab);
        const symCol = BOARDSIZE - 1 - player1ScarabPos.col;
        const symRow = BOARDSIZE - 1 - player1ScarabPos.row;
        board[symRow][symCol] = scarab;
    }

}

export {
    initSphinx,
    initPharaoh,
    initFirstAnubis,
    initSecondAnubis,
    initScarab,
}