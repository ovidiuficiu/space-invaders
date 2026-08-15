import { W, H, DIFFICULTIES, SUPERPOWERS, POWERUP_TYPES, POWERUP_DURATION, STORAGE_KEYS } from './config.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import { Player } from './entities/Player.js';
import { InvaderGrid } from './entities/InvaderGrid.js';
import { Ufo } from './entities/Ufo.js';
import { Powerup } from './entities/Powerup.js';
import { Shield } from './entities/Shield.js';
import { ParticleSystem } from './entities/Particle.js';

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- Game: orchestrates state, flow, and all sub-systems ----------
export class Game {
    constructor(canvas) {
        this.canvas = canvas;

        this.dom = {
            score: document.getElementById('score'),
            high: document.getElementById('high'),
            level: document.getElementById('level'),
            lives: document.getElementById('lives'),
            diff: document.getElementById('diff'),
            super: document.getElementById('super')
        };

        // core state
        this.state = {
            running: false,
            paused: false,
            gameOver: false,
            score: 0,
            high: parseInt(localStorage.getItem(STORAGE_KEYS.high) || '0', 10),
            level: 1,
            lives: 3,
            time: 0
        };

        // sub-systems
        this.audio = new AudioManager();
        this.renderer = new Renderer(canvas);
        this.input = new InputManager(canvas, this.inputCallbacks());

        // entities
        this.player = new Player();
        this.grid = new InvaderGrid();
        this.ufo = new Ufo();
        this.shields = new Shield();
        this.particles = new ParticleSystem();
        this.playerShots = [];
        this.invaderShots = [];
        this.powerups = [];

        // menu state
        this.difficultyIdx = 1;
        this.superIdx = 0;
        this.menuStep = 0; // 0 = difficulty, 1 = superpower

        // scoring
        this.nextLifeScore = 1000;
    }

    // ---- menu data helpers ----
    currentDiff() { return DIFFICULTIES[this.difficultyIdx]; }
    currentSuper() { return SUPERPOWERS[this.superIdx]; }
    availablePowers() { return this.currentDiff().powers.map(i => SUPERPOWERS[i]); }

    // ---- input callbacks (InputManager only routes through these) ----
    inputCallbacks() {
        return {
            onAnyKey: () => this.audio.ensure(),
            onMute: () => this.toggleMute(),
            onNavigate: (dir) => this.menuNavigate(dir),
            onBack: () => this.menuBack(),
            onPause: () => this.togglePause(),
            onConfirm: () => this.menuConfirm(),
            isMenu: () => !this.state.running && !this.state.gameOver,
            isPlaying: () => this.state.running && !this.state.gameOver,
            isGameOver: () => this.state.gameOver,
            onOptions: () => this.openOptions()
        };
    }

    togglePause() {
        if (this.state.running && !this.state.gameOver) this.state.paused = !this.state.paused;
    }

    toggleMute() {
        this.audio.ensure();
        this.audio.setMuted(!this.audio.isMuted);
    }

    openOptions() {
        this.audio.ensure();
        if (this.optionsOverlay) {
            this.syncVolUI();
            this.optionsOverlay.hidden = false;
        }
    }

    // ---- firing ----
    fire() {
        const shots = this.player.fire(this.currentSuper());
        this.playerShots.push(...shots);
        this.audio.shoot();
    }

    updatePlayer() {
        this.player.update(this.input.keys);
        if (this.input.keys.space && this.player.cooldown === 0) {
            this.fire();
        }
    }

    updateInvaders() {
        const { reachedPlayer } = this.grid.update(
            this.currentDiff(),
            this.state.level,
            this.player.y,
            (shot) => this.invaderShots.push(shot)
        );
        if (reachedPlayer) this.endGame();
    }

    updateUFO() {
        this.ufo.update(this.state.level);
    }

    updateShots() {
        // player shots
        for (let i = this.playerShots.length - 1; i >= 0; i--) {
            const s = this.playerShots[i];
            const status = s.update(W, H);
            if (status === 'off') { this.playerShots.splice(i, 1); continue; }
            if (status === 'split') {
                this.playerShots.splice(i, 1);
                this.playerShots.push(...s.children);
                continue;
            }

            // vs invaders
            let hit = false;
            for (const inv of this.grid.invaders) {
                if (!inv.alive) continue;
                if (s.pierce && s.hitSet.has(inv)) continue;
                if (rectsOverlap(s, inv)) {
                    inv.alive = false;
                    this.addScore(inv.type === 3 ? 30 : inv.type === 2 ? 20 : 10);
                    this.particles.spawn(inv.x + inv.w / 2, inv.y + inv.h / 2, inv.type === 3 ? '#ff5f8f' : '#39ff8c', 14, 4);
                    if (s.pierce) {
                        s.hitSet.add(inv);
                        continue; // keep flying through
                    }
                    this.playerShots.splice(i, 1);
                    hit = true;
                    break;
                }
            }
            if (hit) continue;

            // vs ufo (special ship) -> drops a powerup
            if (this.ufo.active && rectsOverlap(s, this.ufo)) {
                this.addScore(100 + Math.floor(Math.random() * 200));
                this.particles.spawn(this.ufo.x + this.ufo.w / 2, this.ufo.y + this.ufo.h / 2, '#ffd54f', 20, 4);
                const pt = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                this.powerups.push(new Powerup(pt, this.ufo.x + this.ufo.w / 2 - 12, this.ufo.y + 6));
                this.ufo.despawn();
                this.playerShots.splice(i, 1);
                continue;
            }

            // vs shields (pierce shots keep going, chipping one cell)
            let broke = false;
            for (const bunker of this.shields.bunkers) {
                for (let c = bunker.length - 1; c >= 0; c--) {
                    if (rectsOverlap(s, bunker[c])) {
                        bunker.splice(c, 1);
                        if (!s.pierce) this.playerShots.splice(i, 1);
                        broke = true;
                        break;
                    }
                }
                if (broke) break;
            }
        }

        // invader shots
        for (let i = this.invaderShots.length - 1; i >= 0; i--) {
            const s = this.invaderShots[i];
            if (s.update(W, H) === 'off') { this.invaderShots.splice(i, 1); continue; }

            // vs player
            if (rectsOverlap(s, this.player)) {
                this.invaderShots.splice(i, 1);
                this.playerHit();
                continue;
            }

            // vs shields
            let broke = false;
            for (const bunker of this.shields.bunkers) {
                for (let c = bunker.length - 1; c >= 0; c--) {
                    if (rectsOverlap(s, bunker[c])) {
                        bunker.splice(c, 1);
                        this.invaderShots.splice(i, 1);
                        broke = true;
                        break;
                    }
                }
                if (broke) break;
            }
        }
    }

    updatePowerups() {
        // move pickups, catch with player
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            if (pu.update()) { this.powerups.splice(i, 1); continue; }
            if (rectsOverlap(pu, this.player)) {
                this.applyPowerup(pu.type);
                this.particles.spawn(pu.x + pu.w / 2, pu.y + pu.h / 2, pu.type.color, 16, 3);
                this.powerups.splice(i, 1);
            }
        }
        // timed powerup countdown
        if (this.player.powerupTime > 0) {
            this.player.powerupTime--;
            if (this.player.powerupTime <= 0) this.player.powerup = null;
        }
    }

    applyPowerup(type) {
        if (type.id === 'life') {
            this.state.lives++;
            this.dom.lives.textContent = String(this.state.lives);
        } else {
            this.player.powerup = type.id;
            this.player.powerupTime = POWERUP_DURATION;
        }
    }

    playerHit() {
        // SHIELD superpower absorbs a hit
        if (this.player.shield > 0) {
            this.player.shield--;
            this.particles.spawn(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ffd54f', 20, 4);
            this.invaderShots = [];
            return;
        }
        this.state.lives--;
        this.dom.lives.textContent = String(this.state.lives);
        this.particles.spawn(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#39ff8c', 30, 5);
        if (this.state.lives <= 0) {
            this.endGame();
        } else {
            // brief respawn invulnerability: clear shots & recenter
            this.invaderShots = [];
            this.player.center();
        }
    }

    // ---- scoring ----
    addScore(pts) {
        this.state.score += pts;
        this.dom.score.textContent = String(this.state.score).padStart(4, '0');
        if (this.state.score >= this.nextLifeScore) {
            this.nextLifeScore += 1000;
            this.state.lives++;
            this.dom.lives.textContent = String(this.state.lives);
        }
    }

    updateHigh() {
        if (this.state.score > this.state.high) {
            this.state.high = this.state.score;
            localStorage.setItem(STORAGE_KEYS.high, String(this.state.high));
        }
    }

    // ---- game flow ----
    resetLevel() {
        this.grid.reset();
        this.grid.speed = this.currentDiff().speed + (this.state.level - 1) * 0.15;
        this.shields.build();
        this.playerShots = [];
        this.invaderShots = [];
        this.ufo.reset();
    }

    startGame() {
        this.audio.ensure();
        this.state.running = true;
        this.state.gameOver = false;
        this.state.paused = false;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;
        this.nextLifeScore = 1000;
        this.dom.score.textContent = '0000';
        this.dom.lives.textContent = '3';
        this.dom.level.textContent = '1';
        this.dom.diff.textContent = this.currentDiff().name;
        this.dom.super.textContent = this.currentSuper().name;
        this.dom.super.style.color = this.currentSuper().color;
        this.player.x = W / 2 - this.player.w / 2;
        this.player.shield = this.currentSuper().id === 'shield' ? 2 : 0;
        this.player.powerup = null;
        this.player.powerupTime = 0;
        this.playerShots = [];
        this.invaderShots = [];
        this.powerups = [];
        this.resetLevel();
        this.updateBackBtn();
    }

    nextLevel() {
        this.state.level++;
        this.dom.level.textContent = String(this.state.level);
        this.resetLevel();
    }

    endGame() {
        this.state.gameOver = true;
        this.state.running = false;
        this.updateHigh();
        this.dom.high.textContent = String(this.state.high).padStart(4, '0');
        this.particles.spawn(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ff6b6b', 40, 5);
        this.updateBackBtn();
    }

    // ---- menu ----
    menuNavigate(dir) {
        if (this.state.running || this.state.gameOver) return;
        if (this.menuStep === 0) {
            this.difficultyIdx = (this.difficultyIdx + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
            this.dom.diff.textContent = this.currentDiff().name;
            // snap superpower to the first one available for this difficulty
            const firstPower = this.availablePowers()[0];
            if (firstPower.id !== this.currentSuper().id) {
                this.superIdx = SUPERPOWERS.indexOf(firstPower);
            }
            this.dom.super.textContent = this.currentSuper().name;
            this.dom.super.style.color = this.currentSuper().color;
        } else {
            const powers = this.availablePowers();
            const cur = powers.findIndex(p => p.id === this.currentSuper().id);
            const next = powers[(cur + dir + powers.length) % powers.length];
            this.superIdx = SUPERPOWERS.indexOf(next);
            this.dom.super.textContent = next.name;
            this.dom.super.style.color = next.color;
        }
        this.updateBackBtn();
    }

    menuConfirm() {
        if (this.state.running && !this.state.gameOver) {
            // In-game Enter: abandon the current run and restart the whole flow from the start menu
            this.state.running = false;
            this.state.paused = false;
            this.state.gameOver = false;
            this.menuStep = 0;
            this.updateBackBtn();
        } else if (this.state.gameOver) {
            this.state.gameOver = false;
            this.menuStep = 0;
            this.updateBackBtn();
        } else if (!this.state.running) {
            if (this.menuStep === 0) {
                this.menuStep = 1; // difficulty chosen -> show superpowers
                this.updateBackBtn();
            } else {
                this.startGame();
            }
        }
    }

    menuBack() {
        if (!this.state.running && !this.state.gameOver && this.menuStep === 1) {
            this.menuStep = 0;
            this.updateBackBtn();
        }
    }

    updateBackBtn() {
        this.input.updateBackButton(!this.state.running && !this.state.gameOver && this.menuStep === 1);
        if (this.optionsBtn) this.optionsBtn.style.display = this.state.running ? 'none' : 'inline-block';
    }

    // ---- render view ----
    view() {
        return {
            state: this.state,
            player: this.player,
            grid: this.grid,
            ufo: this.ufo,
            playerShots: this.playerShots,
            invaderShots: this.invaderShots,
            powerups: this.powerups,
            particles: this.particles.particles,
            shields: this.shields.bunkers,
            menuStep: this.menuStep,
            difficultyIdx: this.difficultyIdx,
            superIdx: this.superIdx
        };
    }

    // ---- main loop ----
    loop() {
        this.state.time++;
        if (this.state.running && !this.state.paused && !this.state.gameOver) {
            // touch steering
            if (this.input.steerX !== null) {
                const target = this.input.steerX - this.player.w / 2;
                const diff = target - this.player.x;
                this.player.x += Math.sign(diff) * Math.min(Math.abs(diff), 7);
                this.player.x = Math.max(10, Math.min(W - this.player.w - 10, this.player.x));
                if (this.input.keys.space && this.player.cooldown === 0) {
                    this.fire();
                }
                if (this.player.cooldown > 0) this.player.cooldown--;
            } else {
                this.updatePlayer();
            }
            this.updateInvaders();
            this.updateUFO();
            this.updateShots();
            this.updatePowerups();
            this.particles.update();

            // level cleared
            if (this.grid.isCleared()) {
                this.nextLevel();
            }
        } else {
            this.particles.update();
        }

        this.renderer.render(this.view());
        requestAnimationFrame(() => this.loop());
    }

    // ---- init / run ----
    init() {
        this.dom.high.textContent = String(this.state.high).padStart(4, '0');
        this.dom.diff.textContent = this.currentDiff().name;
        this.dom.super.textContent = this.currentSuper().name;
        this.dom.super.style.color = this.currentSuper().color;

        const muteBtn = document.getElementById('muteBtn');
        muteBtn.textContent = this.audio.isMuted ? '🔇 Sound Off' : '🔊 Sound On';
        muteBtn.addEventListener('click', () => this.toggleMute());

        // Options menu (background music volume)
        this.optionsBtn = document.getElementById('optionsBtn');
        this.optionsOverlay = document.getElementById('optionsOverlay');
        this.musicVolSlider = document.getElementById('musicVol');
        this.musicVolLabel = document.getElementById('musicVolLabel');
        this.optionsClose = document.getElementById('optionsClose');

        this.syncVolUI();
        this.musicVolSlider.addEventListener('input', () => {
            this.audio.setMusicVolume(Number(this.musicVolSlider.value) / 100);
            this.syncVolUI();
        });
        this.optionsBtn.addEventListener('click', () => this.openOptions());
        this.optionsClose.addEventListener('click', () => { this.optionsOverlay.hidden = true; });
        this.optionsOverlay.addEventListener('click', (e) => {
            if (e.target === this.optionsOverlay) this.optionsOverlay.hidden = true;
        });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.optionsOverlay && !this.optionsOverlay.hidden) {
                this.optionsOverlay.hidden = true;
            }
        });

        this.updateBackBtn();
    }

    syncVolUI() {
        if (!this.musicVolSlider) return;
        this.musicVolSlider.value = Math.round(this.audio.musicVolume * 100);
        this.musicVolLabel.textContent = this.audio.musicVolume <= 0.005
            ? 'OFF'
            : Math.round(this.audio.musicVolume * 100) + '%';
    }

    run() {
        this.renderer.render(this.view());
        requestAnimationFrame(() => this.loop());
    }
}
