import { Sphinx, Scarab, Pharaoh, Anubis, MoveablePawn, MoveableRotateablePawn, RotateablePawn, Pyramid } from "../classes/game-classes.js";
import { getPawnPosition, getLeftAdjacentPiece, getRightAdjacentPiece, getTopAdjacentPiece, getBottomAdjacentPiece, getSphinxOfPlayer, getPharaohOfPlayer } from "./game-utils.js";
import { BOARDSIZE, PYRAMID_COOLDOWN_TURNS, SWAP_COOLDOWN_TURNS } from "../utils/game-constants.js";
import { getUnserializedPos } from "./game-functions.js";

const orientationMap = {
    0: { dx: 0, dy: 1 },    // Up
    90: { dx: 1, dy: 0 },    // Right
    180: { dx: 0, dy: -1 },   // Down
    270: { dx: -1, dy: 0 }   // Left
};

const rotatePieceClockwise = (piece) => {
    if (piece instanceof MoveableRotateablePawn || piece instanceof RotateablePawn) {
        piece.rotateClockwise();
        return true;
    }
    return false;
}

const rotatePieceCounterClockwise = (piece) => {
    if (piece instanceof MoveableRotateablePawn || piece instanceof RotateablePawn) {
        piece.rotateCounterClockwise();
        return true;
    }
    return false;
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

const placePyramid = (board, row, col, player, rotation) => {

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
    let rotationValue = rotation / 90;
    for (let i = 0; i < rotationValue; i++) {
        rotatePieceClockwise(pyramid);
    }

    board[row][col] = pyramid;
    player.pyramid_count -= 1;
    return true;
}

const swapWithScarab = (board, piece) => {

    if (!(piece instanceof Pharaoh) && !(piece instanceof Sphinx)) {
        return null;
    }

    if (piece.scarabCooldown > 0) {
        console.error("Scarab swap is on cooldown.");
        return null;
    }

    const piecePos = getPawnPosition(board, piece.owner.game_id, piece.constructor);
    const scarabPos = getPawnPosition(board, piece.owner.game_id, Scarab);

    if (!piecePos || !scarabPos) {
        console.error("Piece or scarab not found on the board.");
        return null;
    }

    const { row: pieceRow, col: pieceCol } = piecePos;
    const { row: scarabRow, col: scarabCol } = scarabPos;
    board[pieceRow][pieceCol] = board[scarabRow][scarabCol];
    board[scarabRow][scarabCol] = piece;
    piece.scarabCooldown = SWAP_COOLDOWN_TURNS;

    if (piece instanceof Sphinx) {
        piece.canShootLaser = false;
    }
    return scarabPos;
}

// Get the hit side based on laser direction
function getHitSide(dx, dy) {
    if (dx === 0 && dy === -1) return 'front';
    if (dx === 0 && dy === 1) return 'back';
    if (dx === -1 && dy === 0) return 'rightSide';
    if (dx === 1 && dy === 0) return 'leftSide';
    return null;
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
    let deadPieces = [];
    let { dx, dy } = orientationMap[sphinx.orientation];
    let laserCol = col + dx;
    let laserRow = row + dy;
    while (laserCol >= 0 && laserCol < BOARDSIZE && laserRow >= 0 && laserRow < BOARDSIZE) {
        laserMap.push({ row: laserRow, col: laserCol });
        const targetPiece = board[laserRow][laserCol];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            // Check if protected
            if (targetPiece.isProtected(hitSide)) {
                console.log(`MG : Laser hit a protected side of ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);
                break;
            }
            // Check if can reflect
            if (targetPiece.canReflectLaser(hitSide)) {
                console.log(`MG : Laser reflected by ${targetPiece.constructor.name} at (${laserRow}, ${laserCol})`);
                const newDir = targetPiece.getReflectedDirection(hitSide);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                // Piece is destroyed and the laser continues
                console.log(`MG : Piece ${targetPiece.constructor.name} at (${laserRow}, ${laserCol}) destroyed by laser.`);
                board[laserRow][laserCol] = null;
                deadPieces.push({ piece: targetPiece.constructor.name.toLowerCase(), row: laserRow, col: laserCol });
                if (targetPiece instanceof Anubis) {
                    let owner = targetPiece.owner;
                    owner.killed_anubis += 1;
                }
                if (targetPiece instanceof Pyramid) {
                    player.pyramid_cooldown.push(PYRAMID_COOLDOWN_TURNS);
                }
            }
        }

        laserCol += dx;
        laserRow += dy;
    }

    return { laserPath: laserMap, deadPieces: deadPieces};
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

const checkDraw = (board, player1, player2) => {
    const pharaoh1 = getPharaohOfPlayer(board, player1);
    const pharaoh2 = getPharaohOfPlayer(board, player2);
    if(!pharaoh1 && !pharaoh2) {
        return true;
    }
    return false;
}

const checkGameOver = (board, player1, player2) => {
    const pharaoh1 = getPharaohOfPlayer(board, player1);
    const pharaoh2 = getPharaohOfPlayer(board, player2);
    if(!pharaoh1 && !pharaoh2) {
        return null;
    }
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

const orientationDeserializationMap = {
    9: 0,
    0: 90,
    90: 180,
    99: 270
}

const executeAIMove = (action, board, player) => {
    let success = false;
    switch (action.action) {
        case 'PLACE':
            let posPyramid = getUnserializedPos(action.result.destination);
            // AI gives absolute orientation (0/90/180/270) after deserialization,
            // but placePyramid expects a clockwise-step rotation value from the
            // pyramid's default orientation (which depends on player side).
            let targetOrientation = orientationDeserializationMap[action.result.orientation];
            const defaultOrientation = player.game_id === 2 ? 180 : 0;
            const clockwiseSteps = ((defaultOrientation - targetOrientation + 360) % 360) / 90;
            const rotation = clockwiseSteps * 90;

            console.log("AI placement target orientation:", targetOrientation, "rotation arg:", rotation);
            success = placePyramid(board, posPyramid.row, posPyramid.col, player, rotation);
            break;
        case 'MOVE':
            let from = getUnserializedPos(action.cell);
            let to = getUnserializedPos(action.result);
            success = movePiece(board, from.row, from.col, to.row, to.col);
            break;
        case 'ROTATE':
            let pos = getUnserializedPos(action.cell);
            let piece = board[pos.row][pos.col];

            if (!piece || piece.owner.game_id !== player.game_id) break;

            if (action.result === 'CW') {
                success = rotatePieceClockwise(piece);
            } else if (action.result === 'CCW') {
                success = rotatePieceCounterClockwise(piece);
            }
            break;
        case 'EXCHANGE':
            let swapPos = getUnserializedPos(action.result);
            let pieceToSwap = board[swapPos.row][swapPos.col];
            if (pieceToSwap && pieceToSwap.owner.game_id === player.game_id) {
                success = swapWithScarab(board, pieceToSwap) !== null;
            }
            break;
        default:
            console.error("Unknown action type:", action.action);
            break;
    }
    if (!success) {
        console.error("Failed to execute AI action:", action);
    }
};

export {
    rotatePieceClockwise,
    rotatePieceCounterClockwise,
    movePiece,
    placePyramid,
    swapWithScarab,
    shootLaser,
    possibleMoves,
    checkDraw,
    checkGameOver,
    getPossibleReservePlacements,
    executeAIMove
}

