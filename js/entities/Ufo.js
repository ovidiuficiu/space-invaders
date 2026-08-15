import { W, UFO } from '../config.js';

// ---------- UFO (special ship that drops powerups) ----------
export class Ufo {
    constructor() {
        this.x = null;
        this.y = 38;
        this.w = UFO.w;
        this.h = UFO.h;
        this.dir = 1;
        this.timer = 0;
    }

    get active() {
        return this.x !== null;
    }

    reset() {
        this.x = null;
        this.timer = 0;
    }

    // Removes the UFO after being shot (keeps the spawn timer as-is).
    despawn() {
        this.x = null;
    }

    update(level) {
        this.timer++;
        if (!this.active && this.timer > 130 + Math.random() * 90) {
            this.x = -50;
            this.y = 38;
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.timer = 0;
        }
        if (this.active) {
            this.x += this.dir * (1.6 + level * 0.12);
            if (this.x < -60 || this.x > W + 60) this.x = null;
        }
    }
}
