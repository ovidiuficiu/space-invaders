import { SHOT_SPEED } from '../config.js';

// ---------- Projectiles (player & invader shots) ----------
export class Projectile {
    constructor(x, y, vx, vy, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.w = opts.w ?? 4;
        this.h = opts.h ?? 14;
        this.fromPlayer = opts.fromPlayer ?? true;
        this.bounce = !!opts.bounce;
        this.bounces = opts.bounces ?? 0;
        this.split = !!opts.split;
        this.splitDist = 0;
        this.pierce = !!opts.pierce;
        this.hitSet = this.pierce ? (opts.hitSet || new Set()) : null;
        this.dist = 0;
        this.children = [];
    }

    static player(x, y, angle, opts = {}) {
        return new Projectile(
            x, y,
            Math.sin(angle) * SHOT_SPEED,
            -Math.cos(angle) * SHOT_SPEED,
            {
                w: opts.w ?? 4, h: opts.h ?? 14,
                bounce: opts.bounce,
                bounces: opts.bounce ? 2 : 0,
                split: opts.split,
                pierce: opts.pierce
            }
        );
    }

    static invader(x, y, vx, vy) {
        return new Projectile(x, y, vx, vy, { w: 4, h: 12, fromPlayer: false });
    }

    // Advances the projectile one frame.
    // Returns 'alive' | 'off' (expired) | 'split' (children spawned in this.children).
    update(W, H) {
        this.x += this.vx;
        this.y += this.vy;
        this.dist += Math.abs(this.vx) + Math.abs(this.vy);

        // bounce off walls (top + sides) — without the ceiling bounce,
        // shots exit the top long before reaching a side wall, so BOUNCE
        // would never visibly do anything.
        if (this.bounce && this.bounces > 0) {
            if (this.y <= 0 && this.vy < 0) { this.y = 0; this.vy = Math.abs(this.vy); this.bounces--; }
            else if (this.x <= 0 && this.vx < 0) { this.x = 0; this.vx = Math.abs(this.vx); this.bounces--; }
            else if (this.x + this.w >= W && this.vx > 0) { this.x = W - this.w; this.vx = -Math.abs(this.vx); this.bounces--; }
        }

        // off top
        if (this.y < 0) return 'off';
        // off sides
        if (this.x < -20 || this.x > W + 20) return 'off';
        // off bottom (invader shots)
        if (this.y > H) return 'off';

        // split into two mid-flight
        if (this.split && this.dist >= 55) {
            const speed = Math.hypot(this.vx, this.vy) || SHOT_SPEED;
            const base = Math.atan2(this.vy, this.vx);
            this.children = [
                new Projectile(this.x, this.y, Math.cos(base - 0.35) * speed, Math.sin(base - 0.35) * speed, this.copyOpts(false)),
                new Projectile(this.x, this.y, Math.cos(base + 0.35) * speed, Math.sin(base + 0.35) * speed, this.copyOpts(false))
            ];
            return 'split';
        }

        return 'alive';
    }

    copyOpts(split) {
        return {
            w: this.w, h: this.h, fromPlayer: this.fromPlayer,
            bounce: this.bounce, bounces: this.bounces,
            split,
            pierce: this.pierce,
            hitSet: this.hitSet
        };
    }
}
