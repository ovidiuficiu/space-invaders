import { W, INVADER_W, INVADER_H, COLS, ROWS } from '../config.js';
import { Projectile } from './Projectile.js';

// ---------- Invaders (the whole formation as a group) ----------
export class InvaderGrid {
    constructor() {
        this.invaders = [];
        this.dir = 1;        // 1 = right, -1 = left
        this.speed = 0.7;    // px per frame
        this.drop = 18;
        this.moveTimer = 0;
        this.build();
    }

    build() {
        this.invaders = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.invaders.push({
                    x: 60 + c * (INVADER_W + 14),
                    y: 60 + r * (INVADER_H + 14),
                    w: INVADER_W, h: INVADER_H,
                    type: r < 1 ? 3 : r < 3 ? 2 : 1, // top = squid(3), mid = crab(2), bottom = octopus(1)
                    alive: true,
                    frame: 0,
                    shootTimer: Math.random() * 400 + 200
                });
            }
        }
    }

    reset() {
        this.build();
        this.dir = 1;
        this.moveTimer = 0;
    }

    alive() {
        return this.invaders.filter(i => i.alive);
    }

    isCleared() {
        return this.invaders.every(i => !i.alive);
    }

    // Moves/shoots the formation. Emits invader shots via onShot(projectile).
    // Returns { reachedPlayer } when an invader has dropped to the player's line.
    update(difficulty, level, playerY, onShot) {
        if (this.invaders.length === 0) return { reachedPlayer: false };
        this.moveTimer++;
        const speed = this.speed * (0.9 + level * 0.12);
        if (this.moveTimer >= Math.max(6, 26 - this.speed * 4)) {
            this.moveTimer = 0;
            let edge = false;
            for (const inv of this.invaders) {
                if (!inv.alive) continue;
                inv.x += this.dir * speed * 2;
                if (inv.x <= 6 || inv.x + inv.w >= W - 6) edge = true;
            }
            if (edge) {
                this.dir *= -1;
                for (const inv of this.invaders) {
                    if (!inv.alive) continue;
                    inv.y += this.drop;
                }
            }
            for (const inv of this.invaders) inv.frame = inv.frame === 0 ? 1 : 0;
        }

        // invader shooting
        const alive = this.alive();
        if (alive.length > 0) {
            const shooter = alive[Math.floor(Math.random() * alive.length)];
            shooter.shootTimer -= 1;
            if (shooter.shootTimer <= 0) {
                shooter.shootTimer = Math.max(difficulty.shootMin, difficulty.shootBase - level * 30) * (0.5 + Math.random() * 0.7);
                // aim from the bottom-most invader in the shooter's column
                const colShooters = alive.filter(i => Math.abs(i.x - shooter.x) < 20);
                const bottom = colShooters.reduce((a, b) => (a.y > b.y ? a : b), shooter);
                onShot(Projectile.invader(
                    bottom.x + bottom.w / 2 - 2,
                    bottom.y + bottom.h,
                    (Math.random() - 0.5) * 0.4,
                    3
                ));
            }
        }

        // reach player line -> game over
        for (const inv of alive) {
            if (inv.y + inv.h >= playerY + 6) return { reachedPlayer: true };
        }
        return { reachedPlayer: false };
    }
}
