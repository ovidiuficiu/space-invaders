import { H } from '../config.js';

// ---------- Powerup pickups (dropped by the UFO) ----------
export class Powerup {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 18;
        this.vy = 1.9;
        this.wob = 0;
    }

    // Returns true when the pickup has fallen off the bottom of the screen.
    update() {
        this.wob += 0.15;
        this.y += this.vy;
        return this.y > H;
    }
}
