// TEMPORARY, TO CHANGE WHEN AI ON BACKEND
//var exports = typeof exports === 'undefined' ? window : exports;

const BOARD_SIZE = 10;
const INITIAL_PYRAMIDS = 7;
const SWAP_COOLDOWN = 4;

let botId = 0;
let opponentId = 0;
let board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
);  // 10x10 board

class Player {
    constructor(id) {
        this.id = id;
        this.cooldowns = { sphinx: 0, pharaoh: 0 };
        this.reserve = INITIAL_PYRAMIDS;
        this.pieces = [];
        this.canShoot = true;
    }
}

let players = [];
let me = null;
let opponent = null;

// Initialize board from initial positions
function initBoard(initialPositions) {
    board = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => null)
    );

    // Place first player pieces
    const p1 = initialPositions;
    let sphinxCords = cellToCoords(p1.sphinx);
    let pharaohCords = cellToCoords(p1.pharaoh);
    let scarabCords = cellToCoords(p1.scarab.position);

    let anubis1Row = (sphinxCords.row === 0) ? 4 : 5;
    let anubis2row = (sphinxCords.row === 0) ? 2 : 7;
    let orientation1 = (sphinxCords.row === 0) ? 0 : 180;

    const mirrorCord = (coord) => 9 - coord;
    let scarabOrientation = p1.scarab.orientation;


    board[sphinxCords.row][sphinxCords.col] = { type: 'sphinx', owner: 1, orientation: orientation1 };
    board[pharaohCords.row][pharaohCords.col] = { type: 'pharaoh', owner: 1 };
    board[scarabCords.row][scarabCords.col] = { type: 'scarab', owner: 1, orientation: scarabOrientation };
    board[anubis1Row][pharaohCords.col] = { type: 'anubis', owner: 1, orientation: orientation1 };
    board[anubis2row][mirrorCord(sphinxCords.col)] = { type: 'anubis', owner: 1, orientation: orientation1 };

    // Place second player pieces symmetrically
    const mirrorOrientation = (orient) => (orient + 180) % 360;

    // Simple 180 mirror
    board[mirrorCord(sphinxCords.row)][mirrorCord(sphinxCords.col)] = { type: 'sphinx', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(pharaohCords.row)][mirrorCord(pharaohCords.col)] = { type: 'pharaoh', owner: 2 };
    board[mirrorCord(scarabCords.row)][mirrorCord(scarabCords.col)] = { type: 'scarab', owner: 2, orientation: scarabOrientation };
    board[mirrorCord(anubis1Row)][mirrorCord(pharaohCords.col)] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(anubis2row)][sphinxCords.col] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    // Track our pieces
    refreshPieces();
}

// Convert cell number to row/col
function cellToCoords(cell) {
    return { row: Math.floor(cell / 10), col: (cell % 10) };
}

// Convert row/col to cell number
function coordsToCell(row, col) {
    return (row) * 10 + (col);
}

// Orientation to direction vector
const orientationToDir = {
    0: { dx: 0, dy: 1 },    // Up
    90: { dx: 1, dy: 0 },    // Right
    180: { dx: 0, dy: -1 },   // Down
    270: { dx: -1, dy: 0 }   // Left
};

// Get the hit side based on laser direction
function getHitSide(dx, dy) {
    if (dx === 0 && dy === -1) return 'down';
    if (dx === 0 && dy === 1) return 'up';
    if (dx === -1 && dy === 0) return 'right';
    if (dx === 1 && dy === 0) return 'left';
    return null;
}

// Check if a piece is protected from a given hit side
function isProtected(piece, hitSide) {
    if (piece.type === 'sphinx') return true; // Sphinx is protected from all sides
    if (piece.type === 'pharaoh') return false; // Pharaoh has no protection
    if (piece.type === 'scarab') return false; // Scarab reflects but isn't protected

    if (piece.type === 'anubis') {
        // Anubis is protected on its front side only
        const protectedSideMap = { 0: 'down', 90: 'left', 180: 'up', 270: 'right' };
        return protectedSideMap[piece.orientation] === hitSide;
    }

    if (piece.type === 'pyramid') {
        // Pyramid has no protection, only reflection
        return false;
    }

    return false;
}

// Check if a piece can reflect from a given hit side
function canReflect(piece, hitSide) {
    if (piece.type !== 'pyramid' && piece.type !== 'scarab') return false;
    if (piece.type === 'scarab') return true;


    const orientation = piece.orientation;
    const sideToAngle = { 'up': [0, 9], 'right': [9, 99], 'down': [99, 90], 'left': [90, 0] };
    const hitAngles = sideToAngle[hitSide];
    return orientation === hitAngles[0] || orientation === hitAngles[1];
}

// Get new laser direction after reflection
function getReflectedDirection(hitSide, piece) {
    const orientation = piece.orientation;
    // console.log("Getting reflection for piece:", piece, "hitSide:", hitSide, "orientation:", orientation);
    // Scarab reflection logic
    if (piece.type === 'scarab') {
        if (hitSide === 'up') {
            if (orientation === 0) return { dx: -1, dy: 0 };
            if (orientation === 9) return { dx: 1, dy: 0 };
        }
        if (hitSide === 'right') {
            if (orientation === 0) return { dx: 0, dy: 1 };
            if (orientation === 9) return { dx: 0, dy: -1 };
        }
        if (hitSide === 'down') {
            if (orientation === 9) return { dx: -1, dy: 0 };
            if (orientation === 0) return { dx: 1, dy: 0 };
        }
        if (hitSide === 'left') {
            if (orientation === 9) return { dx: 0, dy: -1 };
            if (orientation === 0) return { dx: 0, dy: 1 };
        }
    }

    // Pyramid reflection logic
    if (piece.type === 'pyramid') {
        if (hitSide === 'up') {
            if (orientation === 0) return { dx: -1, dy: 0 }; // right
            if (orientation === 9) return { dx: 1, dy: 0 }; // left
        }
        if (hitSide === 'right') {
            if (orientation === 9) return { dx: 0, dy: -1 }; // up
            if (orientation === 99) return { dx: 0, dy: 1 }; // down
        }
        if (hitSide === 'down') {
            if (orientation === 99) return { dx: 1, dy: 0 }; // left
            if (orientation === 90) return { dx: -1, dy: 0 }; // right
        }
        if (hitSide === 'left') {
            if (orientation === 90) return { dx: 0, dy: 1 }; // down
            if (orientation === 0) return { dx: 0, dy: -1 }; // up
        }
    }
    return { dx: -100, dy: -100 };
}

function displayLaser(dx = 0, dy = 0, row = -1, col = -1) {
    if (dx === 0 && dy === 1) {
        console.log("↓" + ` at (${row}, ${col})`);
    }
    else if (dx === 0 && dy === -1) {
        console.log("↑" + ` at (${row}, ${col})`);
    }
    else if (dx === 1 && dy === 0) {
        console.log("→" + ` at (${row}, ${col})`);
    }
    else if (dx === -1 && dy === 0) {
        console.log("←" + ` at (${row}, ${col})`);
    }
}

// Simulate the laser shooting after a player's turn
function shootLaser(player) {
    // Check if player can shoot
    if (!player.canShoot) return;

    // Find the sphinx of the player who just moved
    let sphinxRow = -1;
    let sphinxCol = -1;
    let sphinxPiece = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] && board[i][j].type === 'sphinx' && board[i][j].owner === player.id) {
                sphinxRow = i;
                sphinxCol = j;
                sphinxPiece = board[i][j];
                break;
            }
        }
    }

    // If no sphinx found, 
    if (!sphinxPiece) {
        console.error("Sphinx not found for player", player.id);
        return;
    }

    const startRow = sphinxRow;
    const startCol = sphinxCol;
    let { dx, dy } = orientationToDir[sphinxPiece.orientation];

    let laserRow = startRow + dy;
    let laserCol = startCol + dx;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE) {
        displayLaser(dx, dy, laserRow, laserCol);
        const targetPiece = board[laserRow][laserCol];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            // Check if protected
            if (isProtected(targetPiece, hitSide)) {
                console.log(`AI : Laser hit a protected side of ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                break;
            }

            // Check if can reflect
            if (canReflect(targetPiece, hitSide)) {
                console.log(`AI : Laser reflected by ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                const newDir = getReflectedDirection(hitSide, targetPiece);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                // Piece is destroyed and the laser continues
                console.log(`AI : Piece ${targetPiece.type} at (${laserRow}, ${laserCol}) destroyed by laser.`);
                board[laserRow][laserCol] = null;
            }
        }

        laserRow += dy;
        laserCol += dx;
    }

    refreshPieces();
}

// Get adjacent cells (for moves)
function getAdjacentCells(cell) {
    const { row, col } = cellToCoords(cell);
    const adjacent = [];
    if (row > 0) adjacent.push(coordsToCell(row - 1, col)); // up
    if (row < BOARD_SIZE - 1) adjacent.push(coordsToCell(row + 1, col)); // down
    if (col > 0) adjacent.push(coordsToCell(row, col - 1)); // left
    if (col < BOARD_SIZE - 1) adjacent.push(coordsToCell(row, col + 1)); // right
    return adjacent;
}

// Check if a cell is orthogonally adjacent to any Sphinx or your own Pharaoh
function isAdjacentToRestricted(row, col, playerId) {
    const adjacent = getAdjacentCells(coordsToCell(row, col));
    for (const adjCell of adjacent) {
        const { row: adjRow, col: adjCol } = cellToCoords(adjCell);
        const piece = board[adjRow][adjCol];
        if (piece) {
            if (piece.type === 'sphinx') return true;
            if (piece.type === 'pharaoh' && piece.owner === playerId) return true;
        }
    }
    return false;
}


// Refresh the myPieces array
function refreshPieces() {
    players[1].pieces = [];
    players[2].pieces = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j]) {
                players[board[i][j].owner].pieces.push({
                    type: board[i][j].type,
                    cell: coordsToCell(i, j),
                    orientation: board[i][j].orientation || 0
                });
            }
        }
    }
}

// Apply an action to our internal board state
function applyAction(action, player) {
    // Decrement cooldowns
    if (player.cooldowns.sphinx > 0) player.cooldowns.sphinx--;
    if (player.cooldowns.pharaoh > 0) player.cooldowns.pharaoh--;
    player.canShoot = true;

    if (action.action === "N/A") {
        // No action taken
        console.error("No action taken by player", player.id);
        return;
    }

    if (!action) {
        // Even if no action, laser still shoots
        shootLaser(player);
        return;
    }

    const { action: actionType, cell: cell, result: result } = action;
    const { row, col } = cellToCoords(cell);

    switch (actionType) {
        case 'MOVE':
            if (board[row][col]) {
                const { row: resultRow, col: resultCol } = cellToCoords(result);
                board[resultRow][resultCol] = board[row][col];
                board[row][col] = null;
            }
            break;
        case 'ROTATE':
            if (board[row][col]) {
                const piece = board[row][col];
                const rotateCWMap = { 0: 9, 9: 99, 99: 90, 90: 0 };
                const rotateCCWMap = { 0: 90, 90: 99, 99: 9, 9: 0 };
                if (piece.type === 'scarab') {
                    piece.orientation = (piece.orientation == 0) ? 9 : 0;
                }
                else if (piece.type === 'pyramid') {
                    if (result === 'CW') {
                        piece.orientation = rotateCWMap[piece.orientation];
                    } else {
                        piece.orientation = rotateCCWMap[piece.orientation];
                    }
                } else {
                    if (result === 'CW') {
                        piece.orientation = ((piece.orientation || 0) + 270) % 360;
                    } else {
                        piece.orientation = ((piece.orientation || 0) + 90) % 360;
                    }
                }
            }
            break;
        case 'PLACE':
            const { row: placeRow, col: placeCol } = cellToCoords(result.destination);
            board[placeRow][placeCol] = {
                type: 'pyramid',
                owner: player.id,
                orientation: result.orientation
            };
            player.reserve--;
            console.log(`AI: PLACED`);
            break;
        case 'EXCHANGE':
            const { row: cellRow, col: cellCol } = cellToCoords(cell);
            const { row: resultRow, col: resultCol } = cellToCoords(result);
            if (board[cellRow][cellCol] && board[resultRow][resultCol]) {
                const temp = board[cellRow][cellCol];
                board[cellRow][cellCol] = board[resultRow][resultCol];
                board[resultRow][resultCol] = temp;

                // Set cooldown if we are the ones swapping
                // One of the pieces involved is the Scarab, the other is Sphinx or Pharaoh
                // We check both involved pieces to determine which cooldown to activate
                const piece1 = board[cellRow][cellCol];
                const piece2 = board[resultRow][resultCol];

                if (piece1.type === 'sphinx' || piece2.type === 'sphinx') {
                    player.cooldowns.sphinx = SWAP_COOLDOWN;
                }
                if (piece1.type === 'pharaoh' || piece2.type === 'pharaoh') {
                    player.cooldowns.pharaoh = SWAP_COOLDOWN;
                }
                player.canShoot = false;
            }
            break;
    }
    // Shoot laser after action
    shootLaser(player);

    refreshPieces();
}

// Find all moveable pieces (Anubis, Pyramid, Scarab)
function getMoveablePieces(player) {
    return player.pieces.filter(p => p.type !== 'sphinx' && p.type !== 'pharaoh');
}

// Find all rotateable pieces (Sphinx, Anubis, Scarab, Pyramid)
function getRotateablePieces(player) {
    return player.pieces.filter(p => ['sphinx', 'anubis', 'scarab', 'pyramid'].includes(p.type));
}

// Generate all possible actions
function getAllPossibleActions(player) {
    const actions = [];

    // 1. MOVE actions
    // Move orthogonally one of your Anubis, Pyramid or Scarab (Sphinx/Pharaoh cannot move)
    const moveablePieces = getMoveablePieces(player);
    for (const piece of moveablePieces) {
        const adjacent = getAdjacentCells(piece.cell);
        for (const destCell of adjacent) {
            // Cannot move to a cell where another piece is already placed
            let { row: destRow, col: destCol } = cellToCoords(destCell);
            if (board[destRow][destCol] === null) {
                actions.push({
                    action: 'MOVE',
                    cell: piece.cell,
                    result: destCell
                });
            }
        }
    }

    // 2. ROTATE actions
    // Rotate 90 degrees one of your Sphinx, Anubis, Scarab or Pyramid (Pharaoh cannot rotate)
    const rotateablePieces = getRotateablePieces(player);
    for (const piece of rotateablePieces) {
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CW' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CCW' });
    }

    // 3. PLACE actions
    // Place a Pyramid from your reserve box
    // Not adjacent to your Pharaoh or any Sphinx
    if (player.reserve > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] === null) {
                    if (!isAdjacentToRestricted(i, j, botId)) {
                        // Standard orientations: 0, 90, 180, 270 (North, East, South, West)
                        [0, 90, 9, 99].forEach(orient => {
                            actions.push({
                                action: 'PLACE',
                                cell: -1, // Convention for reserve
                                result: { destination: coordsToCell(i, j), orientation: orient }
                            });
                        });
                    }
                }
            }
        }
    }

    // 4. EXCHANGE actions
    // Change your Scarab's position with your Sphinx or your Pharaoh
    // Each swap target has its own independent cooldown: 4 player's turns
    const myScarab = player.pieces.find(p => p.type === 'scarab');
    const mySphinx = player.pieces.find(p => p.type === 'sphinx');
    const myPharaoh = player.pieces.find(p => p.type === 'pharaoh');

    if (myScarab) {
        // Swap with Sphinx
        if (mySphinx && player.cooldowns.sphinx === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: mySphinx.cell
            });
        }
        // Swap with Pharaoh
        if (myPharaoh && player.cooldowns.pharaoh === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: myPharaoh.cell
            });
        }
    }
    return actions;
}

// Simple random move selection
function selectRandomAction(actions) {
    if (actions.length === 0) return null;
    const index = Math.floor(Math.random() * actions.length);
    return actions[index];
}

// ==================== AI ENGINE - MINIMAX ====================

const AI_CONFIG = {
    MAX_TIME_MS: 190,  // Leave some buffer under 200ms
    MAX_DEPTH: 4,      // Initial max depth
    PIECE_VALUES: {
        pharaoh: 10000,
        sphinx: 0,      // Indestructible, no point value
        anubis: 500,
        scarab: 0,  // Indestructible, no point value
        pyramid: 100
    }
};

let aiStartTime = 0;
let nodesEvaluated = 0;

// Check if we're running out of time
function isTimeUp() {
    return (Date.now() - aiStartTime) >= AI_CONFIG.MAX_TIME_MS;
}

// Deep copy the board state
function cloneBoard(boardState) {
    return boardState.map(row => row.map(cell => cell ? { ...cell } : null));
}

// Deep copy a player state
function clonePlayer(player) {
    return {
        id: player.id,
        cooldowns: { ...player.cooldowns },
        reserve: player.reserve,
        pieces: player.pieces.map(p => ({ ...p })),
        canShoot: player.canShoot
    };
}

// Simulate an action on a cloned board and return the new state
function simulateAction(boardState, action, player) {
    const newBoard = cloneBoard(boardState);
    const newPlayer = clonePlayer(player);

    // Decrement cooldowns
    if (newPlayer.cooldowns.sphinx > 0) newPlayer.cooldowns.sphinx--;
    if (newPlayer.cooldowns.pharaoh > 0) newPlayer.cooldowns.pharaoh--;
    newPlayer.canShoot = true;

    if (!action || action.action === "N/A") {
        return { board: newBoard, player: newPlayer };
    }

    const { action: actionType, cell: cell, result: result } = action;
    const { row, col } = cellToCoords(cell);

    switch (actionType) {
        case 'MOVE':
            if (newBoard[row][col]) {
                const { row: resultRow, col: resultCol } = cellToCoords(result);
                newBoard[resultRow][resultCol] = newBoard[row][col];
                newBoard[row][col] = null;
            }
            break;
        case 'ROTATE':
            if (newBoard[row][col]) {
                const piece = newBoard[row][col];
                // All pieces use standard 0, 90, 180, 270 rotation
                if (piece.type === 'scarab') {
                    // Scarab toggles between 0 and 90 (only 2 states due to symmetry)
                    piece.orientation = (piece.orientation == 0) ? 9 : 0;
                } else {
                    piece.orientation = result === 'CW' ? ((piece.orientation || 0) + 270) % 360 : ((piece.orientation || 0) + 90) % 360;
                }
            }
            break;
        case 'PLACE':
            const { row: placeRow, col: placeCol } = cellToCoords(result.destination);
            newBoard[placeRow][placeCol] = {
                type: 'pyramid',
                owner: newPlayer.id,
                orientation: result.orientation
            };
            newPlayer.reserve--;
            break;
        case 'EXCHANGE':
            const { row: cellRow, col: cellCol } = cellToCoords(cell);
            const { row: resultRow, col: resultCol } = cellToCoords(result);
            if (newBoard[cellRow][cellCol] && newBoard[resultRow][resultCol]) {
                const temp = newBoard[cellRow][cellCol];
                newBoard[cellRow][cellCol] = newBoard[resultRow][resultCol];
                newBoard[resultRow][resultCol] = temp;

                const piece1 = newBoard[cellRow][cellCol];
                const piece2 = newBoard[resultRow][resultCol];

                if (piece1.type === 'sphinx' || piece2.type === 'sphinx') {
                    newPlayer.cooldowns.sphinx = SWAP_COOLDOWN;
                }
                if (piece1.type === 'pharaoh' || piece2.type === 'pharaoh') {
                    newPlayer.cooldowns.pharaoh = SWAP_COOLDOWN;
                }
                newPlayer.canShoot = false;
            }
            break;
    }

    // Simulate laser shooting
    simulateLaser(newBoard, newPlayer);

    return { board: newBoard, player: newPlayer };
}

// Simulate laser on a board state (modifies the board in place)
function simulateLaser(boardState, player) {
    if (!player.canShoot) return;

    // Find sphinx
    let sphinxRow = -1, sphinxCol = -1, sphinxPiece = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (boardState[i][j] && boardState[i][j].type === 'sphinx' && boardState[i][j].owner === player.id) {
                sphinxRow = i;
                sphinxCol = j;
                sphinxPiece = boardState[i][j];
                break;
            }
        }
    }

    if (!sphinxPiece) return;

    let { dx, dy } = orientationToDir[sphinxPiece.orientation];
    let laserRow = sphinxRow + dy;
    let laserCol = sphinxCol + dx;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE) {
        const targetPiece = boardState[laserRow][laserCol];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            if (isProtected(targetPiece, hitSide)) {
                break;
            }

            if (canReflect(targetPiece, hitSide)) {
                const newDir = getReflectedDirection(hitSide, targetPiece);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                boardState[laserRow][laserCol] = null;
            }
        }

        laserRow += dy;
        laserCol += dx;
    }
}

// Evaluate board state from the perspective of the AI (botId)
function evaluateBoard(boardState) {
    nodesEvaluated++;
    let score = 0;

    let myPharaohAlive = false;
    let opponentPharaohAlive = false;
    let myPharaohPos = null;
    let opponentPharaohPos = null;

    // Count pieces and their values
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const piece = boardState[i][j];
            if (piece) {
                const value = AI_CONFIG.PIECE_VALUES[piece.type] || 0;

                if (piece.owner === botId) {
                    score += value;
                    if (piece.type === 'pharaoh') {
                        myPharaohAlive = true;
                        myPharaohPos = { row: i, col: j };
                    }
                } else {
                    score -= value;
                    if (piece.type === 'pharaoh') {
                        opponentPharaohAlive = true;
                        opponentPharaohPos = { row: i, col: j };
                    }
                }

                // Bonus for pieces in central positions (control)
                const centerDist = Math.abs(i - 4.5) + Math.abs(j - 4.5);
                if (piece.owner === botId && piece.type !== 'sphinx') {
                    score += (10 - centerDist) * 2;
                } else if (piece.owner !== botId && piece.type !== 'sphinx') {
                    score -= (10 - centerDist) * 2;
                }
            }
        }
    }

    // Winning/losing conditions
    if (!opponentPharaohAlive) {
        return 100000; // We win
    }
    if (!myPharaohAlive) {
        return -100000; // We lose
    }

    // Pharaoh safety evaluation
    if (myPharaohPos) {
        score += evaluatePharaohSafety(boardState, myPharaohPos, botId) * 50;
    }
    if (opponentPharaohPos) {
        score -= evaluatePharaohSafety(boardState, opponentPharaohPos, opponentId) * 50;
    }

    return score;
}

// Evaluate how safe a pharaoh is (count protecting pieces around it)
function evaluatePharaohSafety(boardState, pharaohPos, ownerId) {
    let safety = 0;
    const { row, col } = pharaohPos;

    // Check adjacent cells for friendly pieces
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            const piece = boardState[nr][nc];
            if (piece && piece.owner === ownerId) {
                if (piece.type === 'anubis') safety += 3;
                else if (piece.type === 'pyramid') safety += 1;
                else if (piece.type === 'scarab') safety += 2;
            }
        }
    }

    // Penalty for being near edges (easier to target)
    if (row === 0 || row === BOARD_SIZE - 1) safety -= 2;
    if (col === 0 || col === BOARD_SIZE - 1) safety -= 2;

    return safety;
}

// Get all possible actions for a player on a given board state
function getAllActionsForState(boardState, player) {
    const actions = [];
    const playerPieces = [];

    // Collect pieces for this player
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (boardState[i][j] && boardState[i][j].owner === player.id) {
                playerPieces.push({
                    type: boardState[i][j].type,
                    cell: coordsToCell(i, j),
                    orientation: boardState[i][j].orientation || 0
                });
            }
        }
    }

    // MOVE actions
    const moveablePieces = playerPieces.filter(p => p.type !== 'sphinx' && p.type !== 'pharaoh');
    for (const piece of moveablePieces) {
        const adjacent = getAdjacentCells(piece.cell);
        for (const destCell of adjacent) {
            const { row: destRow, col: destCol } = cellToCoords(destCell);
            if (boardState[destRow][destCol] === null) {
                actions.push({ action: 'MOVE', cell: piece.cell, result: destCell });
            }
        }
    }

    // ROTATE actions
    const rotateablePieces = playerPieces.filter(p => ['sphinx', 'anubis', 'scarab', 'pyramid'].includes(p.type));
    for (const piece of rotateablePieces) {
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CW' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CCW' });
    }

    // PLACE actions
    if (player.reserve > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (boardState[i][j] === null && !isAdjacentToRestrictedOnBoard(boardState, i, j, player.id)) {
                    [0, 90, 180, 270].forEach(orient => {
                        actions.push({
                            action: 'PLACE',
                            cell: -1,
                            result: { destination: coordsToCell(i, j), orientation: orient }
                        });
                    });
                }
            }
        }
    }

    // EXCHANGE actions
    const myScarab = playerPieces.find(p => p.type === 'scarab');
    const mySphinx = playerPieces.find(p => p.type === 'sphinx');
    const myPharaoh = playerPieces.find(p => p.type === 'pharaoh');

    if (myScarab) {
        if (mySphinx && player.cooldowns.sphinx === 0) {
            actions.push({ action: 'EXCHANGE', cell: myScarab.cell, result: mySphinx.cell });
        }
        if (myPharaoh && player.cooldowns.pharaoh === 0) {
            actions.push({ action: 'EXCHANGE', cell: myScarab.cell, result: myPharaoh.cell });
        }
    }

    return actions;
}

// Check adjacent restriction on a board state
function isAdjacentToRestrictedOnBoard(boardState, row, col, playerId) {
    const adjacent = getAdjacentCells(coordsToCell(row, col));
    for (const adjCell of adjacent) {
        const { row: adjRow, col: adjCol } = cellToCoords(adjCell);
        const piece = boardState[adjRow][adjCol];
        if (piece) {
            if (piece.type === 'sphinx') return true;
            if (piece.type === 'pharaoh' && piece.owner === playerId) return true;
        }
    }
    return false;
}

// Minimax with alpha-beta pruning
function minimax(boardState, depth, alpha, beta, isMaximizing, currentPlayer, currentOpponent) {
    // Check time limit
    if (isTimeUp()) {
        return { score: evaluateBoard(boardState), action: null, timedOut: true };
    }

    // Terminal conditions
    const score = evaluateBoard(boardState);
    if (depth === 0 || Math.abs(score) >= 50000) {
        return { score: score, action: null, timedOut: false };
    }

    const actions = getAllActionsForState(boardState, currentPlayer);

    if (actions.length === 0) {
        return { score: score, action: null, timedOut: false };
    }

    let bestAction = actions[0];

    if (isMaximizing) {
        let maxEval = -Infinity;

        for (const action of actions) {
            if (isTimeUp()) {
                return { score: maxEval === -Infinity ? score : maxEval, action: bestAction, timedOut: true };
            }

            const { board: newBoard, player: newPlayer } = simulateAction(boardState, action, currentPlayer);
            const result = minimax(newBoard, depth - 1, alpha, beta, false, currentOpponent, newPlayer);

            if (result.score > maxEval) {
                maxEval = result.score;
                bestAction = action;
            }

            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) break; // Beta cutoff
        }

        return { score: maxEval, action: bestAction, timedOut: false };
    } else {
        let minEval = Infinity;

        for (const action of actions) {
            if (isTimeUp()) {
                return { score: minEval === Infinity ? score : minEval, action: bestAction, timedOut: true };
            }

            const { board: newBoard, player: newPlayer } = simulateAction(boardState, action, currentPlayer);
            const result = minimax(newBoard, depth - 1, alpha, beta, true, currentOpponent, newPlayer);

            if (result.score < minEval) {
                minEval = result.score;
                bestAction = action;
            }

            beta = Math.min(beta, result.score);
            if (beta <= alpha) break; // Alpha cutoff
        }

        return { score: minEval, action: bestAction, timedOut: false };
    }
}

// Iterative deepening search with time limit
function findBestAction(boardState, myPlayer, opponentPlayer) {
    aiStartTime = Date.now();
    nodesEvaluated = 0;

    let bestAction = null;
    let bestScore = -Infinity;
    let depthReached = 0;

    // Iterative deepening
    for (let depth = 1; depth <= AI_CONFIG.MAX_DEPTH; depth++) {
        if (isTimeUp()) break;

        const result = minimax(boardState, depth, -Infinity, Infinity, true, myPlayer, opponentPlayer);

        if (!result.timedOut && result.action) {
            bestAction = result.action;
            bestScore = result.score;
            depthReached = depth;
        }

        // If we found a winning move, no need to search deeper
        if (bestScore >= 50000) break;

        if (result.timedOut) break;
    }

    const timeUsed = Date.now() - aiStartTime;
    console.log(`AI: Depth ${depthReached}, Score ${bestScore}, Nodes ${nodesEvaluated}, Time ${timeUsed}ms`);

    return bestAction;
}

// ==================== END AI ENGINE ====================

function setup(initialPositions, isFirstPlayer) {
    return new Promise((resolve) => {
        botId = isFirstPlayer ? 1 : 2;
        opponentId = isFirstPlayer ? 2 : 1;

        players[botId] = new Player(botId);
        players[opponentId] = new Player(opponentId);
        me = players[botId];
        opponent = players[opponentId];

        initBoard(initialPositions, isFirstPlayer);
        resolve("AI setup completed.");
    });
}

function nextMove(opponentAction) {
    displayBoard(board);
    return new Promise((resolve) => {
        // Apply opponent's action to our board state
        applyAction(opponentAction, opponent);
        displayBoard(board);

        // Use minimax AI engine to find best action
        const selectedAction = findBestAction(cloneBoard(board), clonePlayer(me), clonePlayer(opponent));

        applyAction(selectedAction, me);

        resolve(selectedAction);
        displayBoard(board);
    });
}

const orientationNames = {
    0: "S",
    90: "E",
    180: "N",
    270: "W",
};

const pieceAbbr = {
    sphinx: 'SP',
    pharaoh: 'PH',
    scarab: 'SC',
    anubis: 'AN',
    pyramid: 'PY'
};

const displayBoard = (board) => {
    console.log("--- Board ---");
    for (let row = 0; row < BOARD_SIZE; row++) {
        let rowString = "";
        let styleArr = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const pawn = board[row][col];
            if (pawn) {
                let abbr = pieceAbbr[pawn.type] || pawn.type.substring(0, 2).toUpperCase();
                let pawnStr = abbr + '-';
                if (pawn.type === 'pyramid' || pawn.type === 'scarab') {
                    pawnStr += pawn.orientation;
                }
                else if (pawn.orientation !== undefined) {
                    pawnStr += orientationNames[pawn.orientation];
                }
                let color = pawn.owner === 1 ? 'color: #2196f3' : 'color: #e53935';
                rowString += `%c${pawnStr} `;
                styleArr.push(color);
            } else {
                rowString += '%c .  ';
                styleArr.push('color: #888');
            }
        }
        console.log(rowString, ...styleArr);
    }
}

// exports.setup = setup;
// exports.nextMove = nextMove; 
export { setup, nextMove };