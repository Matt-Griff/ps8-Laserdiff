import { getMyJWT } from "../controllers/user-controller.js";
import { CONFIG } from "../config.js";

export class UIManager {
    constructor() {
        this.elements = {
            board: document.querySelector("#game-board"),
            history: document.querySelector("game-history"),
            turnMessage: document.querySelectorAll(".current-turn"),
            p1: {
                name: document.querySelector("#player1-icon"),
                timer: document.querySelector(".player1-info game-timer"),
                reserve: document.querySelector("#player1-reserve"),
                cooldown: document.querySelector("#player1-cooldown"),
                killed: document.querySelector("#player1-killed"),
            },
            p2: {
                name: document.querySelector("#player2-icon"),
                timer: document.querySelector(".player2-info game-timer"),
                reserve: document.querySelector("#player2-reserve"),
                cooldown: document.querySelector("#player2-cooldown"),
                killed: document.querySelector("#player2-killed"),
            },
            rotateButtons: document.querySelectorAll(".arrow-button"),
            swapButton: document.querySelectorAll(".swap-anubis"),
            endResult: document.querySelector("#end-result-container"),
        };
        
        // Initialize timer values from config
        if (this.elements.p1.timer && this.elements.p2.timer) {
            this.elements.p1.timer.setAttribute("time", CONFIG.TURN_TIME || "10:00");
            this.elements.p2.timer.setAttribute("time", CONFIG.TURN_TIME || "10:00");
        }

        this.gameIsOver = false;
        this.p1 = null;
        this.p2 = null;
        this.reconnected = false;
        this.clientIdToUsernameMap = new Map();
        this.audioVolume = 0.3;
        this.isSoundPlaying = false;
        
        document.addEventListener('ingame-chat-message', (e) => {
            const { author, text, isMe } = e.detail;
            
            const p1Name = this.elements.p1.name.getAttribute('name');
            const p2Name = this.elements.p2.name.getAttribute('name');
            
            if (author === p1Name) {
                this.elements.p1.name.showBubble(text);
            } else if (author === p2Name) {
                this.elements.p2.name.showBubble(text);
            } else {
                // If names don't match, use isMe as fallback
                if (isMe) {
                    this.elements.p1.name.showBubble(text);
                } else {
                    this.elements.p2.name.showBubble(text);
                }
            }
        });
    }

    displayMessage(message) {
        this.elements.turnMessage.forEach(el => el.innerText = message);
    }

    setTheme(playerId) {
        this.elements.turnMessage.forEach(el => {
            el.classList.toggle("player1-theme", playerId === 1);
            el.classList.toggle("player2-theme", playerId === 2);
        });
    }

    updatePlayerStats(player1, player2) {
        this.updateSinglePlayerGUI(this.elements.p1, player1);
        this.updateSinglePlayerGUI(this.elements.p2, player2);
    }

    updateSinglePlayerGUI(uiGroup, player) {
        uiGroup.reserve.setAttribute("count", player.pyramidCount);
        uiGroup.cooldown.setAttribute("count", player.cooldownCount);
        uiGroup.killed.setAttribute("count", player.killedAnubis);
    }

    toggleRotationButtons(active) {
        this.elements.rotateButtons.forEach(btn => btn.disabled = !active);
    }

    // Attach event listeners that callback to the GameManager
    bindEvents(handlers) {
        // 1. Board Clicks (assuming board_gui emits a custom event or we listen to click)
        this.elements.board.addEventListener("click", (e) => {
            const size = (this.elements.board.logicalWidth < this.elements.board.logicalHeight ? this.elements.board.logicalWidth : this.elements.board.logicalHeight) / 10;
            const rect = this.elements.board.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left) / size);
            const row = Math.floor((e.clientY - rect.top) / size);
            handlers.onCellClick(row, col);
        });

        // 2. Reserve Clicks
        this.elements.p1.reserve.addEventListener("click", () => handlers.onReserveClick(1));
        this.elements.p2.reserve.addEventListener("click", () => handlers.onReserveClick(2));

        // 3. Rotation Clicks
        this.elements.rotateButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.dataset.action === "rotate-left") handlers.onRotate("clockwise");
                if (btn.dataset.action === "rotate-right") handlers.onRotate("counterclockwise");
            });
        });

        //4. Swap Button Clicks
        this.elements.swapButton.forEach(btn => {
            btn.addEventListener("click", () => {
                handlers.onSwap();
            });
        });
    }

    updateHistory(roundId, playerId, action) {
        if (!action || action.action === 'N/A') {
            return;
        }

        // Extract from cell (row * 10 + col)
        const fromCell = action.cell;
        const fromRow = Math.floor(fromCell / 10) + 1;
        const fromCol = (fromCell % 10) + 1;

        let toRow = fromRow;
        let toCol = fromCol;
        let actionType = action.action;

        // Parse result based on action type
        if (action.action === "MOVE") {
            const toCell = action.result;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "PLACE") {
            const toCell = action.result.destination;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "EXCHANGE") {
            actionType = "SWAP";
            const toCell = action.result;
            toRow = Math.floor(toCell / 10) + 1;
            toCol = (toCell % 10) + 1;
        } else if (action.action === "ROTATE") {
            actionType = action.result; // "CW" or "CCW"
        }

        // Determine piece type based on action
        const pieceType = action.action === "PLACE" ? "Pyramid" : "Piece";

        this.elements.history.addHistoryMove(roundId, playerId, pieceType, fromRow, fromCol, toRow, toCol, actionType);
    }

    setBoard(board) {
        this.elements.board.setBoard(board);
    }

    getPyramidSectorClicker() {
        return this.elements.board.getPyramidSectorClicker();
    }

    setPossibleMoves(moves) {
        this.elements.board.setPossibleMoves(moves);
    }

    drawPossiblePyramidPlacements(playerId) {
        this.elements.board.drawPossiblePyramidPlacements(playerId);
    }

    removePyramidMouseMoveHandler() {
        this.elements.board.removePyramidMouseMoveHandler();
    }

    drawPositionHighlighter(row, col) {
        this.elements.board.drawPositionHighlighter(row, col);
    }

    displayLaserPath(laserMap, playerId) {
        if (this.isSoundPlaying) {
            setTimeout(() => this.displayLaserPath(laserMap, playerId), 500);
            return;
        }
        this.elements.board.displayLaserPath(laserMap, playerId);
    }

    enableSwapButton() {
        this.elements.swapButton.forEach(btn => btn.disabled = false);
    }

    disableSwapButton() {
        this.elements.swapButton.forEach(btn => btn.disabled = true);
    }

    async setProfile(player1Id, player2Id) {
        this.profileReady = (async () => {
            this.p1 = player1Id;
            this.p2 = player2Id;
            const jwt = await getMyJWT();
            try {
                const fetchUser = async (userId) => {
                    const res = await fetch(`${CONFIG.GATEWAY_URL}/api/user/info`, {
                        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify({ userId })
                    });
                    if (res.status === 200) {
                        return res.json();
                    }
                    throw new Error(`Failed to retrieve user info: ${res.status}`);
                };

                const [player1Data, player2Data] = await Promise.all([
                    fetchUser(player1Id),
                    fetchUser(player2Id)
                ]);

                this.clientIdToUsernameMap.set(player1Id, player1Data.username);
                this.clientIdToUsernameMap.set(player2Id, player2Data.username);

                if (player1Data?.username) {
                    this.elements.p1.name.setAttribute("name", player1Data.username);
                    this.elements.p1.name.setAttribute("rating", "Online");
                }
                if (player2Data?.username) {
                    this.elements.p2.name.setAttribute("name", player2Data.username);
                    this.elements.p2.name.setAttribute("rating", "Online");
                }
            } catch (error) {
                console.error(`Error setting profiles: ${error.message}`);
            }
        })();
        return this.profileReady;
    }

    otherPlayerDisconnected(clientId) {
        if (sessionStorage.getItem('playSound') === 'true') {
            const audio = new Audio("/assets/music/disconnected.m4a");
            audio.volume = this.audioVolume;
            audio.play().catch(e => console.log("Blocked:", e));
        }


        let elementToUpdate = null;
        if (clientId === this.p1) {
            elementToUpdate = this.elements.p1.name;
        } else if (clientId === this.p2) {
            elementToUpdate = this.elements.p2.name;
        }
        if (!elementToUpdate) return;

        if (this.disconnectTimer) {
            clearInterval(this.disconnectTimer);
        }

        this.reconnected = false;
        this.disconnectedElement = elementToUpdate;
        elementToUpdate.setAttribute("rating", "Offline 30s");

        let sec = 30;
        this.disconnectTimer = setInterval(() => {
            if (this.reconnected) {
                clearInterval(this.disconnectTimer);
                this.disconnectTimer = null;
                return;
            }
            sec--;
            if (sec > 0) {
                elementToUpdate.setAttribute("rating", `Offline ${sec}s`);
            } else {
                elementToUpdate.setAttribute("rating", "Offline");
                clearInterval(this.disconnectTimer);
                this.disconnectTimer = null;
            }
        }, 1000);
    }

    otherPlayerReconnected(clientId) {
        if (sessionStorage.getItem('playSound') === 'true') {
            const audio = new Audio("/assets/music/reconnected.m4a");
            audio.volume = this.audioVolume;
            audio.play().catch(e => console.log("Blocked:", e));
        }

        this.reconnected = true;
        if (this.disconnectTimer) {
            clearInterval(this.disconnectTimer);
            this.disconnectTimer = null;
        }
        if (this.disconnectedElement) {
            this.disconnectedElement.setAttribute("rating", "Online");
            this.disconnectedElement = null;
        }
    }

    async setTurn(payload) {
        if (this.profileReady) await this.profileReady;
        if (this.gameIsOver) return;
        
        let playerId = payload?.playerId ?? payload;
        let gameId = payload?.gameId ?? null;
        let p1TimeMs = payload?.player1RemainingMs ?? null;
        let p2TimeMs = payload?.player2RemainingMs ?? null;

        const username = this.clientIdToUsernameMap.get(playerId) || `${playerId}`;
        this.elements.turnMessage.forEach(el => el.innerText = `Player ${username}'s turn`);

        if (gameId === 1 || (gameId == null && playerId === this.p1)) {
            this.syncTimers({ player1RemainingMs: p1TimeMs, player2RemainingMs: p2TimeMs });
            this.elements.p1.timer.start();
            this.elements.p2.timer.stop();
        } else if (gameId === 2 || (gameId == null && playerId === this.p2)) {
            this.syncTimers({ player1RemainingMs: p1TimeMs, player2RemainingMs: p2TimeMs });
            this.elements.p2.timer.start();
            this.elements.p1.timer.stop();
        }
    }

    syncTimers(payload) {
        if (!payload) return;
        let p1TimeMs = payload.player1RemainingMs !== undefined ? payload.player1RemainingMs : null;
        let p2TimeMs = payload.player2RemainingMs !== undefined ? payload.player2RemainingMs : null;

        const formatTime = (ms) => {
            const totalSeconds = Math.max(0, Math.round(ms / 1000));
            const min = Math.floor(totalSeconds / 60);
            const sec = totalSeconds % 60;
            return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        };

        if (p1TimeMs !== null && this.elements.p1.timer) this.elements.p1.timer.setAttribute('time', formatTime(p1TimeMs));
        if (p2TimeMs !== null && this.elements.p2.timer) this.elements.p2.timer.setAttribute('time', formatTime(p2TimeMs));
    }

    setEndResult(isVictorious) {
        this.gameIsOver = true;
        if (this.elements.p1 && this.elements.p1.timer) this.elements.p1.timer.stop();
        if (this.elements.p2 && this.elements.p2.timer) this.elements.p2.timer.stop();

        if (this.isSoundPlaying) {
            setTimeout(() => this.setEndResult(isVictorious), 500);
            return;
        }

        this.elements.endResult.hidden = false;
        this.elements.endResult.set_victorious(isVictorious);
    }

    playEndSound(isVictorious) {
        const soundFile = isVictorious ? "/assets/music/victory.m4a" : "/assets/music/cooked.m4a";
        if (isVictorious) return;
        if (sessionStorage.getItem('playSound') === 'true') {
            this.elements.endResult.hidden = false;
            this.elements.endResult.setCooked();
            this.isSoundPlaying = true;
            const audio = new Audio(soundFile);
            audio.volume = this.audioVolume;
            audio.play().catch(e => console.log("Blocked:", e));
            audio.onended = () => { this.isSoundPlaying = false; this.elements.endResult.hidden = true; };
        }
    }

    displayWaitingScreen() {
        const waitingScreenOverlay = document.createElement("div");
        waitingScreenOverlay.id = "waiting-screen-overlay";
        waitingScreenOverlay.className = "global-throbber-overlay";

        const waitingScreenThrobber = document.createElement("global-throbber");
        waitingScreenThrobber.id = "waiting-screen-throbber";
        waitingScreenOverlay.appendChild(waitingScreenThrobber);

        const waitingText = document.createElement("div");
        waitingText.id = "waiting-screen-text";
        waitingText.innerText = "Waiting for opponent...";
        waitingScreenOverlay.appendChild(waitingText);

        document.body.appendChild(waitingScreenOverlay);
    }

    clearWaitingScreen() {
        const waitingScreenOverlay = document.getElementById("waiting-screen-overlay");
        if (waitingScreenOverlay) {
            waitingScreenOverlay.remove();
        }
    }
}