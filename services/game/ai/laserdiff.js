// TEMPORARY, TO CHANGE WHEN AI ON BACKEND
//var exports = typeof exports === 'undefined' ? window : exports;

const BOARD_SIZE = 10;
const INITIAL_PYRAMIDS = 7;
const SWAP_COOLDOWN = 4;

class Player {
    constructor(id, isFirstPlayer) {
        this.id = id;
        this.cooldowns = { sphinx: 0, pharaoh: 0 };
        this.reserve = INITIAL_PYRAMIDS;
        this.pieces = [];
        this.canShoot = true;
        this.isFirstPlayer = isFirstPlayer;
    }
}

const createState = () => {
    return {
        botId: 0,
        opponentId: 0,
        board: Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null)),
        players: [],
        me: null,
        opponent: null,
        aiStartTime: 0,
        nodesEvaluated: 0,
    }
}

// Initialize board from initial positions
function initBoard(s, initialPositions) {
    s.board = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => null)
    );

    const p1 = initialPositions;
    let sphinxCords = cellToCoords(p1.sphinx);
    let pharaohCords = cellToCoords(p1.pharaoh);
    let scarabCords = cellToCoords(p1.scarab.position);

    let anubis1Row = (sphinxCords.row === 0) ? 4 : 5;
    let anubis2row = (sphinxCords.row === 0) ? 2 : 7;
    let orientation1 = (sphinxCords.row === 0) ? 0 : 180;
    let sphinkOrientation = sphinxCords.col < BOARD_SIZE / 2 ? 90 : 270;

    const mirrorCord = (coord) => 9 - coord;
    let scarabOrientation = p1.scarab.orientation;

    s.board[sphinxCords.row][sphinxCords.col] = { type: 'sphinx', owner: 1, orientation: sphinkOrientation };
    s.board[pharaohCords.row][pharaohCords.col] = { type: 'pharaoh', owner: 1 };
    s.board[scarabCords.row][scarabCords.col] = { type: 'scarab', owner: 1, orientation: scarabOrientation };
    s.board[anubis1Row][pharaohCords.col] = { type: 'anubis', owner: 1, orientation: orientation1 };
    s.board[anubis2row][mirrorCord(sphinxCords.col)] = { type: 'anubis', owner: 1, orientation: orientation1 };

    const mirrorOrientation = (orient) => (orient + 180) % 360;

    s.board[mirrorCord(sphinxCords.row)][mirrorCord(sphinxCords.col)] = { type: 'sphinx', owner: 2, orientation: mirrorOrientation(sphinkOrientation) };
    s.board[mirrorCord(pharaohCords.row)][mirrorCord(pharaohCords.col)] = { type: 'pharaoh', owner: 2 };
    s.board[mirrorCord(scarabCords.row)][mirrorCord(scarabCords.col)] = { type: 'scarab', owner: 2, orientation: scarabOrientation };
    s.board[mirrorCord(anubis1Row)][mirrorCord(pharaohCords.col)] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    s.board[mirrorCord(anubis2row)][sphinxCords.col] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };

    refreshPieces(s);
    console.log("Initial board state:", s.board);
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
    if (piece.type === 'sphinx') return true;
    if (piece.type === 'pharaoh') return false;
    if (piece.type === 'scarab') return false;

    if (piece.type === 'anubis') {
        const protectedSideMap = { 0: 'down', 90: 'left', 180: 'up', 270: 'right' };
        return protectedSideMap[piece.orientation] === hitSide;
    }

    if (piece.type === 'pyramid') {
        return false;
    }

    return false;
}

// Check if a piece can reflect from a given hit side
function canReflect(piece, hitSide) {
    if (piece.type !== 'pyramid' && piece.type !== 'scarab') return false;
    if (piece.type === 'scarab') return true;

    // FIX: Corrected sideToAngle mapping to use valid orientation values (0, 9, 90, 99)
    // Each side lists which orientations can reflect from that side
    const orientation = piece.orientation;
    const reflectMap = {
        // orientation 0:  reflects 'up' and 'left'
        // orientation 9:  reflects 'up' and 'right'
        // orientation 99: reflects 'down' and 'right'
        // orientation 90: reflects 'down' and 'left'
        'up': [0, 9],
        'right': [9, 99],
        'down': [99, 90],
        'left': [90, 0]
    };
    const validOrientations = reflectMap[hitSide];
    return validOrientations && (orientation === validOrientations[0] || orientation === validOrientations[1]);
}

// Get new laser direction after reflection
function getReflectedDirection(hitSide, piece) {
    const orientation = piece.orientation;
    aiLog("Getting reflection for piece:", piece, "hitSide:", hitSide, "orientation:", orientation);

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
            if (orientation === 9) return { dx: 0, dy: 1 };
            if (orientation === 0) return { dx: 0, dy: -1 };
        }
    }

    if (piece.type === 'pyramid') {
        if (hitSide === 'up') {
            if (orientation === 0) return { dx: -1, dy: 0 };  // deflect left
            if (orientation === 9) return { dx: 1, dy: 0 };   // deflect right
        }
        if (hitSide === 'right') {
            if (orientation === 9) return { dx: 0, dy: -1 }; // deflect up 
            if (orientation === 99) return { dx: 0, dy: 1 };  // deflect down
        }
        if (hitSide === 'down') {
            if (orientation === 99) return { dx: 1, dy: 0 };  // deflect right
            if (orientation === 90) return { dx: -1, dy: 0 }; // deflect left
        }
        if (hitSide === 'left') {
            if (orientation === 90) return { dx: 0, dy: 1 };  // deflect down
            if (orientation === 0) return { dx: 0, dy: -1 }; // deflect up
        }
    }
    return { dx: -100, dy: -100 };
}

function displayLaser(dx = 0, dy = 0, row = -1, col = -1) {
    if (dx === 0 && dy === 1) {
        aiLog("↓" + ` at (${row}, ${col})`);
    }
    else if (dx === 0 && dy === -1) {
        aiLog("↑" + ` at (${row}, ${col})`);
    }
    else if (dx === 1 && dy === 0) {
        aiLog("→" + ` at (${row}, ${col})`);
    }
    else if (dx === -1 && dy === 0) {
        aiLog("←" + ` at (${row}, ${col})`);
    }
}

// Simulate the laser shooting after a player's turn
function shootLaser(s, player) {
    if (!player.canShoot) return;

    let sphinxRow = -1;
    let sphinxCol = -1;
    let sphinxPiece = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (s.board[i][j] && s.board[i][j].type === 'sphinx' && s.board[i][j].owner === player.id) {
                sphinxRow = i;
                sphinxCol = j;
                sphinxPiece = s.board[i][j];
                break;
            }
        }
    }

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
        const targetPiece = s.board[laserRow][laserCol];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            if (isProtected(targetPiece, hitSide)) {
                aiLog(`AI : Laser hit a protected side of ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                break;
            }

            if (canReflect(targetPiece, hitSide)) {
                aiLog(`AI : Laser reflected by ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                const newDir = getReflectedDirection(hitSide, targetPiece);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                aiLog(`AI : Piece ${targetPiece.type} at (${laserRow}, ${laserCol}) destroyed by laser.`);
                s.board[laserRow][laserCol] = null;
            }
        }

        laserRow += dy;
        laserCol += dx;
    }

    refreshPieces(s);
}

// Get adjacent cells (for moves)
function getAdjacentCells(cell) {
    const { row, col } = cellToCoords(cell);
    const adjacent = [];
    if (row > 0) adjacent.push(coordsToCell(row - 1, col));
    if (row < BOARD_SIZE - 1) adjacent.push(coordsToCell(row + 1, col));
    if (col > 0) adjacent.push(coordsToCell(row, col - 1));
    if (col < BOARD_SIZE - 1) adjacent.push(coordsToCell(row, col + 1));
    return adjacent;
}

function isAdjacentToRestricted(boardState, row, col, playerId) {
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

// Refresh the myPieces array
function refreshPieces(s) {
    s.players[1].pieces = [];
    s.players[2].pieces = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (s.board[i][j]) {
                s.players[s.board[i][j].owner].pieces.push({
                    type: s.board[i][j].type,
                    cell: coordsToCell(i, j),
                    orientation: s.board[i][j].orientation || 0
                });
            }
        }
    }
}

// Apply an action to our internal board state
function applyAction(s, action, player) {
    if (player.cooldowns.sphinx > 0) player.cooldowns.sphinx--;
    if (player.cooldowns.pharaoh > 0) player.cooldowns.pharaoh--;
    player.canShoot = true;

    if (action.action === "N/A") {
        console.error("No action taken by player", player.id);
        return;
    }

    if (!action) {
        shootLaser(s, player);
        return;
    }

    const { action: actionType, cell: cell, result: result } = action;
    const { row, col } = cellToCoords(cell);

    switch (actionType) {
        case 'MOVE': {
            if (s.board[row][col]) {
                const { row: resultRow, col: resultCol } = cellToCoords(result);
                s.board[resultRow][resultCol] = s.board[row][col];
                s.board[row][col] = null;
            }
            break;
        }
        case 'ROTATE': {
            if (s.board[row][col]) {
                const piece = s.board[row][col];
                const rotateCWMap = { 0: 9, 9: 99, 99: 90, 90: 0 };
                const rotateCCWMap = { 0: 90, 90: 99, 99: 9, 9: 0 };
                if (piece.type === 'scarab') {
                    piece.orientation = (piece.orientation == 0) ? 9 : 0;
                }
                else if (piece.type === 'pyramid') {
                    if (result === 'CLOCKWISE') {
                        piece.orientation = rotateCWMap[piece.orientation];
                    } else {
                        piece.orientation = rotateCCWMap[piece.orientation];
                    }
                } else {
                    if (result === 'CLOCKWISE') {
                        piece.orientation = ((piece.orientation || 0) + 270) % 360;
                    } else {
                        piece.orientation = ((piece.orientation || 0) + 90) % 360;
                    }
                }
            }
            break;
        }
        case 'PLACE': {
            const { row: placeRow, col: placeCol } = cellToCoords(result.destination);
            s.board[placeRow][placeCol] = {
                type: 'pyramid',
                owner: player.id,
                orientation: result.orientation
            };
            player.reserve--;
            aiLog(`AI: PLACED`);
            break;
        }
        case 'EXCHANGE': {
            const { row: cellRow, col: cellCol } = cellToCoords(cell);
            const { row: resultRow, col: resultCol } = cellToCoords(result);
            if (s.board[cellRow][cellCol] && s.board[resultRow][resultCol]) {
                const temp = s.board[cellRow][cellCol];
                s.board[cellRow][cellCol] = s.board[resultRow][resultCol];
                s.board[resultRow][resultCol] = temp;

                const piece1 = s.board[cellRow][cellCol];
                const piece2 = s.board[resultRow][resultCol];

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
    }

    shootLaser(s, player);
    refreshPieces(s);
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
function getAllPossibleActions(s, player) {
    const actions = [];

    // 1. MOVE actions
    const moveablePieces = getMoveablePieces(player);
    for (const piece of moveablePieces) {
        const adjacent = getAdjacentCells(piece.cell);
        for (const destCell of adjacent) {
            let { row: destRow, col: destCol } = cellToCoords(destCell);
            if (s.board[destRow][destCol] === null) {
                actions.push({
                    action: 'MOVE',
                    cell: piece.cell,
                    result: destCell
                });
            }
        }
    }

    // 2. ROTATE actions
    const rotateablePieces = getRotateablePieces(player);
    for (const piece of rotateablePieces) {
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CLOCKWISE' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'ANTICLOCKWISE' });
    }

    // 3. PLACE actions
    if (player.reserve > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (s.board[i][j] === null) {
                    if (!isAdjacentToRestricted(s.board, i, j, player.id)) {
                        [0, 90, 9, 99].forEach(orient => {
                            actions.push({
                                action: 'PLACE',
                                cell: player.isFirstPlayer ? -1 : -2,
                                result: { destination: coordsToCell(i, j), orientation: orient }
                            });
                        });
                    }
                }
            }
        }
    }

    // 4. EXCHANGE actions
    const myScarab = player.pieces.find(p => p.type === 'scarab');
    const mySphinx = player.pieces.find(p => p.type === 'sphinx');
    const myPharaoh = player.pieces.find(p => p.type === 'pharaoh');

    if (myScarab) {
        if (mySphinx && player.cooldowns.sphinx === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: mySphinx.cell
            });
        }
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
    MAX_TIME_MS: 200,
    MAX_DEPTH: 100,
    PIECE_VALUES: {
        pharaoh: 10000,
        sphinx: 0,
        anubis: 500,
        scarab: 0,
        pyramid: 100
    },
    CONSOLE_LOG: false
};

function aiLog(...args) {
    if (AI_CONFIG.CONSOLE_LOG) {
        console.log(...args);
    }
}

// Check if we're running out of time
function isTimeUp(s) {
    return (Date.now() - s.aiStartTime) >= AI_CONFIG.MAX_TIME_MS;
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
        canShoot: player.canShoot,
        isFirstPlayer: player.isFirstPlayer
    };
}

// Simulate an action on a cloned board and return the new state
function simulateAction(boardState, action, player, opponentPlayer) {
    const newBoard = cloneBoard(boardState);
    const newPlayer = clonePlayer(player);
    const newOpponent = clonePlayer(opponentPlayer);

    if (newPlayer.cooldowns.sphinx > 0) newPlayer.cooldowns.sphinx--;
    if (newPlayer.cooldowns.pharaoh > 0) newPlayer.cooldowns.pharaoh--;
    newPlayer.canShoot = true;

    if (!action || action.action === "N/A") {
        simulateLaser(newBoard, newPlayer);
        return { board: newBoard, player: newPlayer, opponent: newOpponent };
    }

    const { action: actionType, cell: cell, result: result } = action;

    switch (actionType) {
        case 'MOVE': {
            const { row, col } = cellToCoords(cell);
            if (newBoard[row][col]) {
                const { row: resultRow, col: resultCol } = cellToCoords(result);
                newBoard[resultRow][resultCol] = newBoard[row][col];
                newBoard[row][col] = null;
            }
            break;
        }
        case 'ROTATE': {
            const { row: rotRow, col: rotCol } = cellToCoords(cell);
            if (newBoard[rotRow][rotCol]) {
                const piece = newBoard[rotRow][rotCol];
                const rotateCWMap = { 0: 9, 9: 99, 99: 90, 90: 0 };
                const rotateCCWMap = { 0: 90, 90: 99, 99: 9, 9: 0 };

                if (piece.type === 'scarab') {
                    piece.orientation = (piece.orientation == 0) ? 9 : 0;
                } else if (piece.type === 'pyramid') {
                    piece.orientation = result === 'CLOCKWISE' ? rotateCWMap[piece.orientation] : rotateCCWMap[piece.orientation];
                } else {
                    piece.orientation = result === 'CLOCKWISE'
                        ? ((piece.orientation || 0) + 270) % 360
                        : ((piece.orientation || 0) + 90) % 360;
                }
            }
            break;
        }
        case 'PLACE': {
            const { row: placeRow, col: placeCol } = cellToCoords(result.destination);
            newBoard[placeRow][placeCol] = {
                type: 'pyramid',
                owner: newPlayer.id,
                orientation: result.orientation
            };
            newPlayer.reserve--;
            break;
        }
        case 'EXCHANGE': {
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
    }

    simulateLaser(newBoard, newPlayer);

    return { board: newBoard, player: newPlayer, opponent: newOpponent };
}

// Simulate laser on a board state (modifies the board in place)
function simulateLaser(boardState, player) {
    if (!player.canShoot) return;

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
        if (sphinxPiece) break;
    }

    if (!sphinxPiece) return;

    let { dx, dy } = orientationToDir[sphinxPiece.orientation];
    let laserRow = sphinxRow + dy;
    let laserCol = sphinxCol + dx;

    let steps = 0;
    const MAX_STEPS = 100;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE && steps < MAX_STEPS) {
        steps++;
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

function getLaserPath(boardState, playerId) {
    const path = [];

    let sphinxRow = -1, sphinxCol = -1, sphinxPiece = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (boardState[i][j] && boardState[i][j].type === 'sphinx' && boardState[i][j].owner === playerId) {
                sphinxRow = i;
                sphinxCol = j;
                sphinxPiece = boardState[i][j];
                break;
            }
        }
        if (sphinxPiece) break;
    }

    if (!sphinxPiece) return path;

    let { dx, dy } = orientationToDir[sphinxPiece.orientation];
    let laserRow = sphinxRow + dy;
    let laserCol = sphinxCol + dx;

    let steps = 0;
    const MAX_STEPS = 100;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE && steps < MAX_STEPS) {
        steps++;
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
            }
        }
        path.push({ row: laserRow, col: laserCol });
        laserRow += dy;
        laserCol += dx;
    }
    return path;
}

// Enhanced board evaluation with multiple strategic factors
function evaluateBoard(boardState, currentPlayerId) {
    let score = 0;

    let myPharaohAlive = false;
    let opponentPharaohAlive = false;
    let myPharaohPos = null;
    let opponentPharaohPos = null;
    let myPieceCount = { anubis: 0, pyramid: 0, scarab: 0 };
    let oppPieceCount = { anubis: 0, pyramid: 0, scarab: 0 };

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const piece = boardState[i][j];
            if (piece) {
                const value = AI_CONFIG.PIECE_VALUES[piece.type] || 0;

                if (piece.owner === currentPlayerId) {
                    score += value;
                    if (piece.type === 'pharaoh') {
                        myPharaohAlive = true;
                        myPharaohPos = { row: i, col: j };
                    } else if (piece.type === 'anubis') myPieceCount.anubis++;
                    else if (piece.type === 'pyramid') myPieceCount.pyramid++;
                    else if (piece.type === 'scarab') myPieceCount.scarab++;
                } else {
                    score -= value;
                    if (piece.type === 'pharaoh') {
                        opponentPharaohAlive = true;
                        opponentPharaohPos = { row: i, col: j };
                    } else if (piece.type === 'anubis') oppPieceCount.anubis++;
                    else if (piece.type === 'pyramid') oppPieceCount.pyramid++;
                    else if (piece.type === 'scarab') oppPieceCount.scarab++;
                }
            }
        }
    }

    if (!opponentPharaohAlive) {
        return 100000;
    }
    if (!myPharaohAlive) {
        return -100000;
    }

    if (myPharaohPos) {
        score += evaluatePharaohSafety(boardState, myPharaohPos, currentPlayerId) * 50;
    }
    if (opponentPharaohPos) {
        score -= evaluatePharaohSafety(boardState, opponentPharaohPos, currentPlayerId === 1 ? 2 : 1) * 50;
    }

    const materialAdvantage = (myPieceCount.anubis - oppPieceCount.anubis) * 50
        + (myPieceCount.pyramid - oppPieceCount.pyramid) * 10;
    score += materialAdvantage;
    return score;
}

function evaluatePharaohSafety(boardState, pharaohPos, ownerId) {
    let safety = 0;
    const { row, col } = pharaohPos;

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

    if (row === 0 || row === BOARD_SIZE - 1) safety -= 2;
    if (col === 0 || col === BOARD_SIZE - 1) safety -= 2;
    return safety;
}

// Get all possible actions for a player on a given board state
function getAllActionsForState(boardState, player, otherPlayer) {
    const actions = [];
    const playerPieces = [];

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
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CLOCKWISE' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'ANTICLOCKWISE' });
    }

    // PLACE actions
    let path1 = getLaserPath(boardState, player.id);
    let path2 = getLaserPath(boardState, otherPlayer.id);

    if (player.reserve > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                // FIX: use isAdjacentToRestricted with boardState instead of separate isAdjacentToRestrictedOnBoard
                if (boardState[i][j] === null && !isAdjacentToRestricted(boardState, i, j, player.id) && (path1.some(p => p.row === i && p.col === j) || path2.some(p => p.row === i && p.col === j))) {
                    [0, 9, 90, 99].forEach(orient => {
                        actions.push({
                            action: 'PLACE',
                            cell: player.isFirstPlayer ? -1 : -2,
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

// Move ordering heuristic for alpha-beta pruning efficiency
function orderMoves(actions, boardState, isMaximizing) {
    return actions.sort((a, b) => {
        let scoreA = 0, scoreB = 0;

        if (a.action === 'ROTATE') scoreA += 5;
        if (b.action === 'ROTATE') scoreB += 5;

        if (a.action === 'EXCHANGE') scoreA += 10;
        if (b.action === 'EXCHANGE') scoreB += 10;

        return scoreB - scoreA;
    });
}

// Minimax with alpha-beta pruning
function minimax(s, boardState, depth, alpha, beta, isMaximizing, currentPlayer, opponentPlayer) {
    s.nodesEvaluated++;

    if (isTimeUp(s)) {
        return { score: evaluateBoard(boardState, s.botId), action: null, timedOut: true };
    }

    const score = evaluateBoard(boardState, s.botId);

    if (depth === 0 || Math.abs(score) >= 50000) {
        return { score: score, action: null, timedOut: false };
    }

    const actions = getAllActionsForState(boardState, currentPlayer, opponentPlayer);

    if (actions.length === 0) {
        return { score: score, action: null, timedOut: false };
    }

    const orderedActions = orderMoves(actions, boardState, isMaximizing);
    let bestAction = orderedActions[0];

    if (isMaximizing) {
        let maxEval = -Infinity;

        for (const action of orderedActions) {
            if (isTimeUp(s)) {
                return {
                    score: maxEval === -Infinity ? score : maxEval,
                    action: bestAction,
                    timedOut: true
                };
            }

            const { board: newBoard, player: newPlayer, opponent: newOpponent } =
                simulateAction(boardState, action, currentPlayer, opponentPlayer);

            const result = minimax(s, newBoard, depth - 1, alpha, beta, false, newOpponent, newPlayer);

            if (result.score > maxEval) {
                maxEval = result.score;
                bestAction = action;
            }

            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) break;
        }

        return { score: maxEval, action: bestAction, timedOut: false };

    } else {
        let minEval = Infinity;

        for (const action of orderedActions) {
            if (isTimeUp(s)) {
                return {
                    score: minEval === Infinity ? score : minEval,
                    action: bestAction,
                    timedOut: true
                };
            }

            const { board: newBoard, player: newPlayer, opponent: newOpponent } =
                simulateAction(boardState, action, currentPlayer, opponentPlayer);

            const result = minimax(s, newBoard, depth - 1, alpha, beta, true, newOpponent, newPlayer);

            if (result.score < minEval) {
                minEval = result.score;
                bestAction = action;
            }

            beta = Math.min(beta, result.score);
            if (beta <= alpha) break;
        }

        return { score: minEval, action: bestAction, timedOut: false };
    }
}

// Iterative deepening search with time limit
function findBestAction(s, boardState, myPlayer, opponentPlayer) {
    s.aiStartTime = Date.now();
    s.nodesEvaluated = 0;

    let bestAction = null;
    let bestScore = -Infinity;
    let depthReached = 0;

    const allActions = getAllActionsForState(boardState, myPlayer, opponentPlayer);

    if (allActions.length === 0) {
        return null;
    }

    if (allActions.length === 1) {
        return allActions[0];
    }

    for (let depth = 1; depth <= AI_CONFIG.MAX_DEPTH; depth++) {
        if (isTimeUp(s)) break;

        const result = minimax(s, boardState, depth, -Infinity, Infinity, true, myPlayer, opponentPlayer);

        if (!result.timedOut && result.action) {
            bestAction = result.action;
            bestScore = result.score;
            depthReached = depth;
        }

        if (bestScore >= 50000) break;

        if (result.timedOut) break;
    }

    const timeUsed = Date.now() - s.aiStartTime;
    aiLog(`AI: Depth ${depthReached}, Score ${bestScore}, Nodes ${s.nodesEvaluated}, Time ${timeUsed}ms`);

    return bestAction || allActions[0];
}
// ==================== END AI ENGINE ====================

function _setup(s, initialPositions, isFirstPlayer) {
    return new Promise((resolve) => {
        s.botId = isFirstPlayer ? 1 : 2;
        s.opponentId = isFirstPlayer ? 2 : 1;
        s.players[s.botId] = new Player(s.botId, isFirstPlayer);
        s.players[s.opponentId] = new Player(s.opponentId, !isFirstPlayer);
        s.me = s.players[s.botId];
        s.opponent = s.players[s.opponentId];
        initBoard(s, initialPositions);
        resolve(true);
    });
}

function _nextMove(s, opponentAction) {
    return new Promise((resolve) => {
        if(opponentAction != null) {
            applyAction(s, opponentAction, s.opponent);
        }

        const selectedAction = findBestAction(
            s,
            cloneBoard(s.board),
            clonePlayer(s.me),
            clonePlayer(s.opponent)
        );

        applyAction(s, selectedAction, s.me);
        resolve(selectedAction);
        setImmediate(() => displayBoard(s));
    });
}

const _defaultState = createState();

function setup(initialPositions, isFirstPlayer) {
    Object.assign(_defaultState, createState());
    console.log("AI: Setup. First player:", isFirstPlayer, "Initial positions:", initialPositions);
    return _setup(_defaultState, initialPositions, isFirstPlayer);
}

function nextMove(opponentAction) {
    return _nextMove(_defaultState, opponentAction);
}

export function createAIInstance() {
    const s = createState();
    return {
        setup: (initialPositions, isFirstPlayer) => _setup(s, initialPositions, isFirstPlayer),
        nextMove: (opponentAction) => _nextMove(s, opponentAction),
    };
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

const displayBoard = (s) => {
    // console.log("Current Board:" + s.board);
}

export { setup, nextMove };