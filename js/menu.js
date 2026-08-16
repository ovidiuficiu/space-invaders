import { DIFFICULTIES, SHIPS, SUPERPOWERS } from './config.js';

// ---------- Menu: start-screen state & selection logic ----------
// Owns the difficulty / superpower picks. The Game only drives it via
// navigate()/confirm()/back() and reads currentDiff()/currentSuper().
export class Menu {
    constructor() {
        this.step = 0;          // 0 = difficulty, 1 = ship, 2 = superpower
        this.difficultyIdx = 1;
        this.shipIdx = 0;
        this.superIdx = 0;
    }

    currentDiff() { return DIFFICULTIES[this.difficultyIdx]; }
    currentShip() { return SHIPS[this.shipIdx]; }
    currentSuper() { return SUPERPOWERS[this.superIdx]; }
    // every superpower is always available, regardless of difficulty
    availablePowers() { return SUPERPOWERS; }

    // Move the selection up/down (dir = -1 | 1)
    navigate(dir) {
        if (this.step === 0) {
            this.difficultyIdx = (this.difficultyIdx + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
        } else if (this.step === 1) {
            this.shipIdx = (this.shipIdx + dir + SHIPS.length) % SHIPS.length;
        } else {
            const powers = this.availablePowers();
            const cur = powers.findIndex(p => p.id === this.currentSuper().id);
            const next = powers[(cur + dir + powers.length) % powers.length];
            this.superIdx = SUPERPOWERS.indexOf(next);
        }
    }

    // Directly pick a difficulty by its index (tap-to-select).
    selectDifficulty(index) {
        this.difficultyIdx = index;
    }

    selectShip(index) {
        this.shipIdx = index;
    }

    // Directly pick a superpower by id (tap-to-select).
    selectSuper(id) {
        const idx = SUPERPOWERS.findIndex(p => p.id === id);
        if (idx !== -1) this.superIdx = idx;
    }

    // Advance one menu step. Returns true when the game should start.
    confirm() {
        if (this.step === 0) {
            this.step = 1;
            return false;
        }
        if (this.step === 1) {
            this.step = 2;
            return false;
        }
        return true;
    }

    // Back from superpower to difficulty. Returns true if a step changed.
    back() {
        if (this.step > 0) {
            this.step--;
            return true;
        }
        return false;
    }

    reset() {
        this.step = 0;
    }
}
