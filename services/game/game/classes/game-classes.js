import { PYRAMIDS_PER_PLAYER } from "../utils/game-constants.js";


class Pawn {

    constructor(owner) {
        this.owner = owner;
        this.frontProtection = false;
        this.backProtection = false;
        this.leftSideProtection = false;
        this.rightSideProtection = false;
    }
}

class RotateablePawn extends Pawn {

    constructor(owner) {
        super(owner);
        if (owner.game_id == 2) {
            this.orientation = 180;
        } else {
            this.orientation = 0;
        }
    }

    rotateClockwise() {
        this.orientation = (this.orientation + 270) % 360;
    }

    rotateCounterClockwise() {
        this.orientation = (this.orientation + 90) % 360;
    }

}

class MoveablePawn extends Pawn {

    constructor(owner) {
        super(owner);
        this.x = 0;
        this.y = 0;
    }

    moveBy(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

class MoveableRotateablePawn extends MoveablePawn {

    constructor(owner) {
        super(owner);
        if (owner.game_id == 2) {
            this.orientation = 180;
        } else {
            this.orientation = 0;
        }
    }

    rotateClockwise() {
        this.orientation = (this.orientation + 270) % 360;
    }

    rotateCounterClockwise() {
        this.orientation = (this.orientation + 90) % 360;
    }
}

class Sphinx extends RotateablePawn {

    constructor(owner) {
        super(owner);
        this.frontProtection = true;
        this.backProtection = true;
        this.leftSideProtection = true;
        this.rightSideProtection = true;

        this.scarabCooldown = 0; // nb of turns before able to swap with scarab again
        // Notice that the sphinx cannot shoot a laser the turn it swaps

        this.canShootLaser = true;
    }

    isProtected(hitSide) {
        return true;
    }

    canReflectLaser(hitSide) {
        return false;
    }
}

class Anubis extends MoveableRotateablePawn {

    constructor(owner) {
        super(owner);
        this.setProtectionSides();
    }

    rotateClockwise() {
        this.orientation = (this.orientation + 270) % 360;
        this.setProtectionSides();
    }

    rotateCounterClockwise() {
        this.orientation = (this.orientation + 90) % 360;
        this.setProtectionSides();
    }

    setProtectionSides() {
        // Reset all protections
        this.frontProtection = false;
        this.backProtection = false;
        this.leftSideProtection = false;
        this.rightSideProtection = false;

        // Set protection based on orientation
        switch (this.orientation) {
            case 0:
                this.frontProtection = true;
                break;
            case 90:
                this.rightSideProtection = true;
                break;
            case 180:
                this.backProtection = true;
                break;
            case 270:
                this.leftSideProtection = true;
                break;
        }
    }

    isProtected(hitSide) {
        return this[hitSide + 'Protection'];
    }

    canReflectLaser(hitSide) {
        return false;
    }
}

class Pyramid extends MoveableRotateablePawn {

    constructor(owner) {

        super(owner);

        this.reflectiveSides = {
            front: false,
            back: true,
            leftSide: false,
            rightSide: true
        };

    }

    isProtected(hitSide) {
        return false;
    }

    canReflectLaser(hitSide) {
        let reflective = { 'front': [270, 180], 'back': [90, 0], 'leftSide': [180, 90], 'rightSide': [0, 270] };
        return reflective[hitSide].includes(this.orientation);
    }

    getReflectedDirection(hitSide) {
        switch (hitSide) {
            case 'front':
                if (this.orientation === 270) {
                    return { dx: 1, dy: 0 }; // right
                } else if (this.orientation === 180) {
                    return { dx: -1, dy: 0 }; // left
                }
            case 'back':
                if (this.orientation === 90) {
                    return { dx: -1, dy: 0 }; // left
                } else if (this.orientation === 0) {
                    return { dx: 1, dy: 0 }; // right
                }
            case 'leftSide':
                if (this.orientation === 180) {
                    return { dx: 0, dy: 1 }; // up
                } else if (this.orientation === 90) {
                    return { dx: 0, dy: -1 }; // down
                }
            case 'rightSide':
                if (this.orientation === 270) {
                    return { dx: 0, dy: 1 }; // up
                } else if (this.orientation === 0) {
                    return { dx: 0, dy: -1 }; // down
                }
            default:
                console.error("Sphinx cannot reflect laser with" + hitSide + " with orientation" + this.orientation);
                return null;
        }
    }
}

class Scarab extends MoveableRotateablePawn {

    constructor(owner) {
        super(owner);
    }
    isProtected(hitSide) {
        return false;
    }

    canReflectLaser(hitSide) {
        return true;
    }

    getReflectedDirection(hitSide) {
        switch (hitSide) {
            case 'front':
                if (this.orientation % 180 === 0) {
                    return { dx: -1, dy: 0 }; // left
                } else {
                    return { dx: 1, dy: 0 }; // right
                }
            case 'back':
                if (this.orientation % 180 === 0) {
                    return { dx: 1, dy: 0 }; // right
                } else {
                    return { dx: -1, dy: 0 }; // left
                }
            case 'leftSide':
                if (this.orientation % 180 === 0) {
                    return { dx: 0, dy: 1 }; // up
                } else {
                    return { dx: 0, dy: -1 }; // down
                }
            case 'rightSide':
                if (this.orientation % 180 === 0) {
                    return { dx: 0, dy: -1 }; // down
                } else {
                    return { dx: 0, dy: 1 }; // up
                }
            default:
                console.error("Scarab reflection logic error with hitSide:", hitSide);
                return null;
        }
    }
}

class Pharaoh extends Pawn {

    constructor(owner) {
        super(owner);

        this.scarabCooldown = 0;
    }

    isProtected(hitSide) {
        return false;
    }

    canReflectLaser(hitSide) {
        return false;
    }
}

class Player {

    constructor(game_id, name, is_ai = false, clientId = null) {
        this.game_id = game_id; // Not the database ID, but the player's number in the game (1 or 2)
        this.name = name;
        this.pyramid_count = PYRAMIDS_PER_PLAYER;
        this.pyramid_cooldown = [];
        this.killed_anubis = 0;
        this.is_ai = is_ai;
        this.clientId = clientId;
    }
}

class MoveHistory {
    constructor(PlayerID, pieceType, fromX, fromY, toX, toY, rotation) {
        this.playerID = PlayerID;
        this.pieceType = pieceType;
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.rotation = rotation;
    }
}

export {
    Sphinx,
    Anubis,
    Pyramid,
    Scarab,
    Pharaoh,
    Player,
    RotateablePawn,
    MoveablePawn,
    MoveableRotateablePawn,
    MoveHistory
}