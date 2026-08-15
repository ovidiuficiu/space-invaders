import { W, H, PLAYER } from '../config.js';
import { Projectile } from './Projectile.js';

// ---------- Player ----------
export class Player {
    constructor() {
        this.w = PLAYER.w;
        this.h = PLAYER.h;
        this.x = W / 2;
        this.y = H - 44;
        this.speed = PLAYER.speed;
        this.cooldown = 0;
        this.cooldownMax = PLAYER.cooldownMax;
        this.shield = 0;        // hit-shields from SHIELD superpower
        this.powerup = null;     // active timed powerup id
        this.powerupTime = 0;    // remaining frames
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

    // Builds shots based on the chosen superpower + active powerup.
    // Sets the fire cooldown and returns the array of shots to add.
    fire(superPower) {
        const pu = this.powerup;
        const triple = superPower.id === 'triple' || pu === 'triple';
        const split = pu === 'split';
        const bounce = superPower.id === 'bounce' || pu === 'bounce';
        const pierce = superPower.id === 'pierce' || pu === 'pierce';
        const rapid = superPower.id === 'rapid' || pu === 'rapid';

        const mkShot = (angle) => Projectile.player(
            this.x + this.w / 2 - 2,
            this.y,
            angle,
            { bounce, split, pierce }
        );

        const shots = triple ? [mkShot(-0.28), mkShot(0), mkShot(0.28)] : [mkShot(0)];
        this.cooldown = rapid ? 10 : this.cooldownMax;
        return shots;
    }
}
