import { Sphinx, Anubis, Scarab, Pharaoh } from "../classes/game-classes.js";
import { checkIfUniquePawnAlreadyPlaced, getPawnPosition, getSecondAnubisPosition } from "./game-utils.js";
import { BOARDSIZE } from "../utils/game-constants.js";

const initSphinx = (board, player) => {

    if (checkIfUniquePawnAlreadyPlaced(board, player, Sphinx)) return ;

    const sphinx = new Sphinx(player);
    let randomCol = Math.floor(Math.random() * BOARDSIZE);
    
    if (player.game_id === 1) {
        board[randomCol][0] = sphinx;
    } else {
        const player1SphinxPos = getPawnPosition(board, 1, Sphinx);
        const symCol = BOARDSIZE - 1 - player1SphinxPos.col;
        const symRow = BOARDSIZE - 1 - player1SphinxPos.row;
        board[symCol][symRow] = sphinx;
    }

}

const initPharaoh = (board, player) => {

    if (checkIfUniquePawnAlreadyPlaced(board, player, Pharaoh)) return ;

    const pharaoh = new Pharaoh(player);

    if(player.game_id === 1) {
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
        board[selectedCol][row] = pharaoh;
    }
    
    else {
        const player1PharaohPos = getPawnPosition(board, 1, Pharaoh);
        const symCol = BOARDSIZE - 1 - player1PharaohPos.col;
        const symRow = BOARDSIZE - 1 - player1PharaohPos.row;
        board[symCol][symRow] = pharaoh;
    }

}

const initFirstAnubis = (board, player) => {

    const anubis = new Anubis(player);

    if(player.game_id === 1) {
        let row = 4;
        let col = getPawnPosition(board, player.game_id, Pharaoh).col;
        board[col][row] = anubis;
    }

    else {
        const player1FirstAnubisPos = getPawnPosition(board, 1, Anubis);
        const symCol = BOARDSIZE - 1 - player1FirstAnubisPos.col;
        const symRow = BOARDSIZE - 1 - player1FirstAnubisPos.row;
        board[symCol][symRow] = anubis;
    }

    
}

const initSecondAnubis = (board, player) => {

    const anubis = new Anubis(player);

    if(player.game_id === 1) {
        let row = 2;
        let col = getPawnPosition(board, 2, Sphinx).col;
        board[col][row] = anubis;
    }

    else {
        const player1SecondAnubisPos = getSecondAnubisPosition(board, 1);
        const symCol = BOARDSIZE - 1 - player1SecondAnubisPos.col;
        const symRow = BOARDSIZE - 1 - player1SecondAnubisPos.row;
        board[symCol][symRow] = anubis;
    }
   
}

const initScarab = (board, player) => {

    const scarab = new Scarab(player);

    if(player.game_id === 1) {
        let row = 3;
        let col = Math.floor(Math.random() * BOARDSIZE);
        board[col][row] = scarab;
    }
    
    else {
        const player1ScarabPos = getPawnPosition(board, 1, Scarab);
        const symCol = BOARDSIZE - 1 - player1ScarabPos.col;
        const symRow = BOARDSIZE - 1 - player1ScarabPos.row;
        board[symCol][symRow] = scarab;
    }
    
}

export {
    initSphinx,
    initPharaoh,
    initFirstAnubis,
    initSecondAnubis,
    initScarab,
}