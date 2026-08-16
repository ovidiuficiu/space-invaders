import { W, H, PLAYER, SHIPS } from '../config.js';
import { Projectile } from './Projectile.js';

// ---------- Player ----------
export class Player {
    constructor(ship = SHIPS[0]) {
        this.w = PLAYER.w;
        this.h = PLAYER.h;
        this.x = W / 2;
        this.y = H - 44;
        this.speed = PLAYER.speed;
        this.cooldown = 0;
        this.cooldownMax = PLAYER.cooldownMax;
        this.shield = 0;        // hit-shields from SHIELD superpower
        this.armor = 0;
        this.ship = ship;
        this.activePowers = new Map(); // stacked timed powerups: id -> remaining frames
    }

    configure(ship) {
        this.ship = ship;
        this.speed = ship.speed;
        this.cooldownMax = ship.cooldownMax;
        this.armor = ship.armor;
        this.w = PLAYER.w;
        this.h = PLAYER.h;
    }

    center() {
        this.x = W / 2 - this.w / 2;
    }

    // Movement + cooldown. Firing is handled by the game loop (needs superpower context).
    update(input) {
        if (input.left) this.x -= this.speed;
        if (input.right) this.x += this.speed;
        this.x = Math.max(10, Math.min(W - this.w - 10, this.x));
        if (this.cooldown > 0) this.cooldown--;
    }

    // Builds shots based on the chosen superpower + active powerups (which stack).
    // Sets the fire cooldown and returns the array of shots to add.
    fire(superPower) {
        const ap = this.activePowers;
        const triple = superPower.id === 'triple' || ap.has('triple');
        const split = ap.has('split');
        const bounce = superPower.id === 'bounce' || ap.has('bounce');
        const pierce = superPower.id === 'pierce' || ap.has('pierce');
        const rapid = superPower.id === 'rapid' || ap.has('rapid');

        const mkShot = (angle) => Projectile.player(
            this.x + this.w / 2 - 2,
            this.y,
            angle,
            { bounce, split, pierce, w: this.ship.shotW, h: this.ship.shotH }
        );

        const angles = triple ? [-0.28, 0, 0.28] : this.ship.shotAngles;
        const shots = angles.map(mkShot);
        this.cooldown = rapid ? 10 : this.cooldownMax;
        return shots;
    }
}
