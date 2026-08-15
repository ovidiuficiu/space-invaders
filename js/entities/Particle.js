// ---------- Particles (explosion effects) ----------
export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, n, speed) {
        for (let i = 0; i < (n || 12); i++) {
            const a = Math.random() * Math.PI * 2;
            const s = (speed || 3) * (0.4 + Math.random());
            this.particles.push({
                x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 30 + Math.random() * 20, color, size: 1 + Math.random() * 2
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }
}
