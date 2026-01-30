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

    canReflectLaser(hitSide) {
        const relativeSide = this.getRelativeSide(hitSide);
        return this.reflectiveSides[relativeSide];
    }

    getRelativeSide(hitSide) {
        const sideToAngle = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
        const hitAngle = sideToAngle[hitSide];
        const relativeSide = (hitAngle - this.orientation + 360) % 360;
        switch (relativeSide) {
            case 0:
                return 'front';
            case 90:
                return 'rightSide';
            case 180:
                return 'back';
            case 270:
                return 'leftSide';
            default:
                return null;
        }
    }

    reflectLaser(hitSide, callback) {
        const relativeSide = this.getRelativeSide(hitSide);

        const orientationMap = {
            0: { dx: 0, dy: -1 },    // up
            90: { dx: 1, dy: 0 },    // right
            180: { dx: 0, dy: 1 },   // down
            270: { dx: -1, dy: 0 }   // left
        };

        let exitOrientation;

        if (relativeSide === "back") {
            exitOrientation = (this.orientation + 90) % 360;
        } else if (relativeSide === "rightSide") {
            exitOrientation = (this.orientation + 180) % 360;
        }

        const { dx, dy } = orientationMap[exitOrientation];
        callback(-dx, dy);
    }


}

class Scarab extends MoveableRotateablePawn {

    constructor(owner) {

        super(owner);

        this.reflectiveSides = {
            front: true,
            back: true,
            leftSide: true,
            rightSide: true
        };
    }

    canReflectLaser(hitSide) {
        return true;
    }

    getRelativeSide(hitSide) {
        const sideToAngle = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
        const hitAngle = sideToAngle[hitSide];
        const relativeSide = (hitAngle - this.orientation + 360) % 360;

        switch (relativeSide) {
            case 0:
                return 'front';
            case 90:
                return 'rightSide';
            case 180:
                return 'back';
            case 270:
                return 'leftSide';
            default:
                return null;
        }
    }

    reflectLaser(hitSide, callback) {
        const relativeSide = this.getRelativeSide(hitSide);

        const orientationMap = {
            0: { dx: 0, dy: 1 },    // up
            90: { dx: 1, dy: 0 },    // right
            180: { dx: 0, dy: -1 },   // down
            270: { dx: -1, dy: 0 }   // left
        };

        let exitOrientation;

        switch (relativeSide) {
            case "front":
                exitOrientation = (this.orientation + 90) % 360;
                break;
            case "rightSide":
                exitOrientation = this.orientation;
                break;
            case "back":
                exitOrientation = (this.orientation + 270) % 360;
                break;
            case "leftSide":
                exitOrientation = (this.orientation + 180) % 360;
                break;
        }

        const { dx, dy } = orientationMap[exitOrientation];
        callback(dx, dy);
    }
}

class Pharaoh extends Pawn {

    constructor(owner) {
        super(owner);

        this.scarabCooldown = 0;
    }
}

class Player {

    constructor(game_id, name, is_ai = false) {
        this.game_id = game_id; // Not the database ID, but the player's number in the game (1 or 2)
        this.name = name;
        this.pyramid_count = PYRAMIDS_PER_PLAYER;
        this.pyramid_cooldown = [];
        this.killed_anubis = 0;
        this.is_ai = is_ai;
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