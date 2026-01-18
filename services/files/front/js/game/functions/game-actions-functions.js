import { Sphinx, Anubis, Scarab, Pharaoh, MoveablePawn, MoveableRotateablePawn, RotateablePawn, Pyramid } from "../classes/game-classes.js";
import { getPawnPosition, getLeftAdjacentPiece, getRightAdjacentPiece, getTopAdjacentPiece, getBottomAdjacentPiece, getSphinxOfPlayer, getPharaohOfPlayer } from "./game-utils.js";
import { BOARDSIZE } from "../utils/game-constants.js";


const dirMap = {
    'up': { dx: 0, dy: 1 },
    'down': { dx: 0, dy: -1 },
    'left': { dx: -1, dy: 0 },
    'right': { dx: 1, dy: 0 }
};

const orientationMap = {
    0: { dx: 0, dy: 1 },    // Up
    90: { dx: 1, dy: 0 },    // Right
    180: { dx: 0, dy: -1 },   // Down
    270: { dx: -1, dy: 0 }   // Left
};

const hitSideMap = {
    'up': 'frontProtection',
    'down': 'backProtection',
    'left': 'leftSideProtection',
    'right': 'rightSideProtection'
};



const rotatePieceClockwise = (piece) => {
    if (piece instanceof (MoveableRotateablePawn, RotateablePawn)) {
        piece.rotateClockwise();
    }
}

const rotatePieceCounterClockwise = (piece) => {
    if (piece instanceof (MoveableRotateablePawn, RotateablePawn)) {
        piece.rotateCounterClockwise();
    }
}

const movePiece = (board, fromRow, fromCol, toRow, toCol) => {
    if (!board[fromRow][fromCol]) {
        console.error("No piece at the source location.");
        return false;
    }

    if (!(board[fromRow][fromCol] instanceof MoveablePawn)) {
        console.error("The piece at the source location cannot be moved.");
        return false;
    }

    if (board[toRow][toCol] && board[toRow][toCol].owner === board[fromRow][fromCol].owner) {
        console.error("Cannot move to a location occupied by your own piece.");
        return false;
    }

    if (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) !== 1) {
        console.error("Invalid move. Pieces can only move to adjacent squares.");
        return false;
    }

    if (board[toRow][toCol] !== null) {
        console.error("Target location is not empty.");
        return false;
    }

    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
    return true;
};

const placePyramid = (board, row, col, player) => {

    // The col and row are supposed to be validated before calling this function
    // There must be no piece at the target location
    // A pyramid musn't be orthogonally adjacent to player pharaoh or any sphinx

    if (player.pyramid_count <= 0) {
        console.error("No pyramids left to place.");
        return false;
    }

    if (board[row][col] !== null) {
        console.error("Target location is not empty.");
        return false;
    }

    const leftPiece = getLeftAdjacentPiece(board, row, col);
    const rightPiece = getRightAdjacentPiece(board, row, col);
    const topPiece = getTopAdjacentPiece(board, row, col);
    const bottomPiece = getBottomAdjacentPiece(board, row, col);

    const adjacentPieces = [leftPiece, rightPiece, topPiece, bottomPiece];
    if (adjacentPieces.some(piece => piece instanceof Sphinx || (piece instanceof Pharaoh && piece.owner === player))) {
        console.error("Cannot place pyramid adjacent to player's pharaoh or any sphinx.");
        return false;
    }

    const pyramid = new Pyramid(player);

    board[row][col] = pyramid;
    player.pyramid_count -= 1;
    return true;
}

const swapWithScarab = (board, piece, scarab) => {

    if (!(piece instanceof Pharaoh) || !(piece instanceof Sphinx)) {
        return;
    }

    if (!scarab || !(scarab instanceof Scarab)) {
        console.error("Invalid scarab piece.");
        return;
    }

    if (piece.scarabCooldown > 0) {
        console.error("Scarab swap is on cooldown.");
        return;
    }

    const piecePos = getPawnPosition(board, piece.owner.game_id, piece.constructor);
    const scarabPos = getPawnPosition(board, scarab.owner.game_id, scarab.constructor);

    if (!piecePos || !scarabPos) {
        console.error("Piece or scarab not found on the board.");
        return;
    }

    const { col: pieceCol, row: pieceRow } = piecePos;
    const { col: scarabCol, row: scarabRow } = scarabPos;
    board[pieceCol][pieceRow] = scarab;
    board[scarabCol][scarabRow] = piece;
    piece.scarabCooldown = 4;

    if (piece instanceof Sphinx) {
        piece.canShootLaser = false;
    }
}

const shootLaser = (board, player) => {
    const sphinx = getSphinxOfPlayer(board, player);

    if (!(sphinx instanceof Sphinx)) {
        console.error("Sphinx piece not found for the player.");
        return [];
    }

    if (!sphinx.canShootLaser) {
        console.error("Sphinx cannot shoot laser this turn.");
        return [];
    }

    // The laser shoots in the direction the sphinx is facing
    // it continues until it hits a piece whose side is protected or goes off the board
    // if it hits a piece whose side is not protected, that piece is removed from the board
    // if it hits a reflective side of a piece (pyramid or scarab), it changes direction accordingly

    const position = getPawnPosition(board, sphinx.owner.game_id, Sphinx);
    if (!position) {
        console.error("Sphinx not found on the board.");
        return [];
    }

    let { row, col } = position;
    let laserMap = [];
    let { dx, dy } = orientationMap[sphinx.orientation];
    let laserCol = col + dx;
    let laserRow = row + dy;
    while (laserCol >= 0 && laserCol < BOARDSIZE && laserRow >= 0 && laserRow < BOARDSIZE) {
        laserMap.push({ row: laserRow, col: laserCol });
        const targetPiece = board[laserRow][laserCol];
        if (targetPiece) {

            let hitSide = Object.keys(dirMap).find(dir => {
                const { dx: dirDx, dy: dirDy } = dirMap[dir];
                return dirDx === -dx && dirDy === -dy;
            });

            const hitSideProperty = hitSideMap[hitSide];
            console.log("hitSideProperty", hitSideProperty);
            if (targetPiece[hitSideProperty]) {
                console.log(`Laser hit a protected side of ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);
                break;
            }

            if (targetPiece instanceof Pyramid || targetPiece instanceof Scarab) {
                if (targetPiece.canReflectLaser(hitSide)) {
                    console.log(`Laser reflected by ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);

                    // Update laser direction based on reflection
                    targetPiece.reflectLaser(hitSide, (newDx, newDy) => {
                        dx = -newDx;
                        dy = newDy;
                    });

                } else {
                    console.log(`Laser hit and destroyed ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);
                    board[laserRow][laserCol] = null;
                }
            }

            else {
                console.log(`Laser hit and destroyed ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);
                board[laserRow][laserCol] = null;
            }
        }

        laserCol += dx;
        laserRow += dy;
    }

    return laserMap;
}

const possibleMoves = (board, player, row, col) => {
    if (!board[row][col] || board[row][col].owner !== player) {
        console.log("No piece at the given position or not your piece.");
        return [];
    }

    if (board[row][col].constructor.name === "Sphinx" || board[row][col].constructor.name === "Pharaoh") {
        console.log(board[row][col].constructor.name + " piece cannot move.");
        return [];
    }

    let moves = [];
    const directions = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

    directions.forEach(({ dx, dy }) => {
        let newRow = row + dx;
        let newCol = col + dy;
        if (newRow >= 0 && newRow < BOARDSIZE && newCol >= 0 && newCol < BOARDSIZE) {
            if (!board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });
    return moves;
}

const checkGameOver = (board, player1, player2) => {
    const pharaoh1 = getPharaohOfPlayer(board, player1);
    const pharaoh2 = getPharaohOfPlayer(board, player2);
    if (!pharaoh1) {
        return player2;
    }
    if (!pharaoh2) {
        return player1;
    }
    return null;
}

const getPossibleReservePlacements = (board, player) => {
    let placements = [];
    for (let row = 0; row < BOARDSIZE; row++) {
        for (let col = 0; col < BOARDSIZE; col++) {
            // Check if the cell is empty
            if (board[row][col] !== null) {
                continue;
            }

            // Check adjacent pieces for Sphinx or Pharaoh of the same player
            const leftPiece = getLeftAdjacentPiece(board, row, col);
            const rightPiece = getRightAdjacentPiece(board, row, col);
            const topPiece = getTopAdjacentPiece(board, row, col);
            const bottomPiece = getBottomAdjacentPiece(board, row, col);

            const adjacentPieces = [leftPiece, rightPiece, topPiece, bottomPiece];
            if (adjacentPieces.some(piece => piece instanceof Sphinx || (piece instanceof Pharaoh && piece.owner === player))) {
                continue;
            }

            placements.push({ row: row, col: col });

        }
    }
    return placements;
}

export {
    rotatePieceClockwise,
    rotatePieceCounterClockwise,
    movePiece,
    placePyramid,
    swapWithScarab,
    shootLaser,
    possibleMoves,
    checkGameOver,
    getPossibleReservePlacements
}

