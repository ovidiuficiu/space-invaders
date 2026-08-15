import { DIFFICULTIES, SUPERPOWERS } from './config.js';

// ---------- Menu: start-screen state & selection logic ----------
// Owns the difficulty / superpower picks. The Game only drives it via
// navigate()/confirm()/back() and reads currentDiff()/currentSuper().
export class Menu {
    constructor() {
        this.step = 0;          // 0 = picking difficulty, 1 = picking superpower
        this.difficultyIdx = 1;
        this.superIdx = 0;
    }

    currentDiff() { return DIFFICULTIES[this.difficultyIdx]; }
    currentSuper() { return SUPERPOWERS[this.superIdx]; }
    availablePowers() { return this.currentDiff().powers.map(i => SUPERPOWERS[i]); }

    // Move the selection up/down (dir = -1 | 1)
    navigate(dir) {
        if (this.step === 0) {
            this.difficultyIdx = (this.difficultyIdx + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
            // snap the superpower to the first one available for this difficulty
            const firstPower = this.availablePowers()[0];
            if (firstPower.id !== this.currentSuper().id) {
                this.superIdx = SUPERPOWERS.indexOf(firstPower);
            }
        } else {
            const powers = this.availablePowers();
            const cur = powers.findIndex(p => p.id === this.currentSuper().id);
            const next = powers[(cur + dir + powers.length) % powers.length];
            this.superIdx = SUPERPOWERS.indexOf(next);
        }
    }

    // Advance one menu step. Returns true when the game should start.
    confirm() {
        if (this.step === 0) {
            this.step = 1;
            return false;
        }
        return true;
    }

    // Back from superpower to difficulty. Returns true if a step changed.
    back() {
        if (this.step === 1) {
            this.step = 0;
            return true;
        }
        return false;
    }

    reset() {
        this.step = 0;
    }
}
