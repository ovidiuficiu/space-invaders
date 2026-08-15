import { W, H, DIFFICULTIES, SUPERPOWERS, POWERUP_TYPES, POWERUP_DURATION, SPRITES } from './config.js';

// Start-menu layout. Shared between drawing and tap-to-select hit-testing so
// the tappable rows always match what's on screen.
const MENU = {
    panelW: 460, panelH: 360, py: 150,
    difficulty: { itemH: 76, startY: 92, boxTop: -28, boxH: 44 },
    superpower: { itemH: 58, startY: 86, boxTop: -26, boxH: 40 }
};

// ---------- Renderer: all canvas drawing, no game logic ----------
export class Renderer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
    }

    // ---- helpers ----
    currentDiff(difficultyIdx) { return DIFFICULTIES[difficultyIdx]; }
    currentSuper(superIdx) { return SUPERPOWERS[superIdx]; }
    availablePowers() { return SUPERPOWERS; }

    drawPixelArt(dx, dy, scale, palette, grid) {
        const ctx = this.ctx;
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const ch = grid[r][c];
                if (ch === '.' || ch === ' ') continue;
                ctx.fillStyle = palette[ch] || '#fff';
                ctx.fillRect(dx + c * scale, dy + r * scale, scale, scale);
            }
        }
    }

    // ---- main frame ----
    render(view) {
        const ctx = this.ctx;
        const { state, player, grid, ufo, playerShots, invaderShots, powerups, particles, shields, menuStep, difficultyIdx, superIdx, isTouch } = view;

        ctx.clearRect(0, 0, W, H);
        this.drawGrid();

        // player
        if (state.running || !state.gameOver) this.drawPlayer(player, state);

        // shields
        for (const bunker of shields) this.drawShield(bunker);

        // invaders
        for (const inv of grid.invaders) this.drawInvader(inv);

        // ufo
        this.drawUFO(ufo);

        // shots
        ctx.fillStyle = '#ffd54f';
        for (const s of playerShots) ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#ff6b6b';
        for (const s of invaderShots) ctx.fillRect(s.x, s.y, s.w, s.h);

        // powerup pickups
        for (const pu of powerups) this.drawPowerupPickup(pu);

        // particles
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / 40);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // active timed powerup indicators (stacked)
        if (state.running && player.activePowers.size > 0) this.drawPowerupTimer(player);

        // overlays
        if (!state.running && !state.gameOver) this.drawStartScreen(state, menuStep, difficultyIdx, superIdx, isTouch);
        if (state.paused && state.running) this.drawPauseScreen();
        if (state.gameOver) this.drawGameOverScreen(state);
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(57,255,140,.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
    }

    drawPlayer(player, state) {
        const ctx = this.ctx;
        ctx.fillStyle = '#39ff8c';
        // main body
        ctx.fillRect(player.x, player.y + 12, player.w, 6);
        // cannon
        ctx.fillRect(player.x + player.w / 2 - 3, player.y + 4, 6, 10);
        // fins
        ctx.fillRect(player.x + 4, player.y + 16, 6, 8);
        ctx.fillRect(player.x + player.w - 10, player.y + 16, 6, 8);
        // glow
        ctx.shadowColor = '#39ff8c';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#aaffcc';
        ctx.fillRect(player.x + player.w / 2 - 1, player.y + 2, 2, 4);
        ctx.shadowBlur = 0;

        // SHIELD superpower bubble
        if (player.shield > 0) {
            const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
            const pulse = 6 + Math.sin(state.time * 0.2) * 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, player.w / 2 + pulse, player.h + pulse, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,213,79,.9)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,213,79,.25)';
            ctx.lineWidth = 6;
            ctx.stroke();
        }
    }

    drawInvader(inv) {
        if (!inv.alive) return;
        const grid = inv.frame === 0
            ? (inv.type === 3 ? SPRITES.squid : inv.type === 2 ? SPRITES.crab : SPRITES.octo)
            : (inv.type === 3 ? SPRITES.squid2 : inv.type === 2 ? SPRITES.crab2 : SPRITES.octo2);
        const scale = 3;
        const dw = grid[0].length * scale, dh = grid.length * scale;
        const dx = inv.x + (inv.w - dw) / 2, dy = inv.y + (inv.h - dh) / 2;
        const color = inv.type === 3 ? '#ff5f8f' : inv.type === 2 ? '#39ff8c' : '#7de2ff';
        this.drawPixelArt(dx, dy, scale, { '#': color }, grid);
    }

    drawUFO(ufo) {
        if (!ufo.active) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#ff4d6d';
        ctx.fillRect(ufo.x, ufo.y, ufo.w, ufo.h);
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(ufo.x + ufo.w * 0.25, ufo.y - 4, ufo.w * 0.5, 5);
        ctx.fillStyle = '#7de2ff';
        ctx.fillRect(ufo.x + ufo.w * 0.12, ufo.y + ufo.h * 0.5, 8, 8);
        ctx.fillRect(ufo.x + ufo.w * 0.72, ufo.y + ufo.h * 0.5, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ufo.x + ufo.w * 0.44, ufo.y + ufo.h * 0.4, 4, 6);
    }

    drawShield(cells) {
        const ctx = this.ctx;
        for (const c of cells) {
            ctx.fillStyle = '#3dff88';
            ctx.fillRect(c.x, c.y, c.w, c.h);
        }
    }

    drawPowerupPickup(pu) {
        const ctx = this.ctx;
        const cx = pu.x + pu.w / 2, cy = pu.y + pu.h / 2;
        const wobble = Math.sin(pu.wob) * 3;
        ctx.save();
        ctx.translate(cx, cy + wobble);
        ctx.rotate(Math.sin(pu.wob) * 0.2);
        ctx.shadowColor = pu.type.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.strokeStyle = pu.type.color;
        ctx.lineWidth = 2;
        const rw = pu.w, rh = pu.h;
        ctx.beginPath();
        ctx.moveTo(-rw / 2 + 6, -rh / 2);
        ctx.arcTo(rw / 2, -rh / 2, rw / 2, rh / 2, 6);
        ctx.arcTo(rw / 2, rh / 2, -rw / 2, rh / 2, 6);
        ctx.arcTo(-rw / 2, rh / 2, -rw / 2, -rh / 2, 6);
        ctx.arcTo(-rw / 2, -rh / 2, rw / 2, -rh / 2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = pu.type.color;
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type.label, 0, 1);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
    }

    drawPowerupTimer(player) {
        const ctx = this.ctx;
        const entries = [...player.activePowers.entries()];
        if (entries.length === 0) return;
        const chipW = 96, chipH = 30, gap = 8;
        const totalW = entries.length * chipW + (entries.length - 1) * gap;
        let x = W / 2 - totalW / 2;
        const y = 8;
        for (const [id, t] of entries) {
            const pu = POWERUP_TYPES.find(p => p.id === id);
            const frac = Math.max(0, Math.min(1, t / POWERUP_DURATION));
            // chip background
            ctx.fillStyle = 'rgba(0,0,0,.55)';
            ctx.fillRect(x, y, chipW, chipH);
            // label
            ctx.fillStyle = pu.color;
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(pu.name, x + 8, y + 11);
            // remaining-time bar
            ctx.fillStyle = 'rgba(255,255,255,.15)';
            ctx.fillRect(x + 6, y + chipH - 8, chipW - 12, 4);
            ctx.fillStyle = pu.color;
            ctx.fillRect(x + 6, y + chipH - 8, (chipW - 12) * frac, 4);
            x += chipW + gap;
        }
        ctx.textBaseline = 'alphabetic';
    }

    drawStartScreen(state, menuStep, difficultyIdx, superIdx, isTouch) {
        const ctx = this.ctx;
        const currentDiff = this.currentDiff(difficultyIdx);
        const currentSuper = this.currentSuper(superIdx);
        const availablePowers = this.availablePowers(difficultyIdx);

        ctx.fillStyle = 'rgba(0,0,0,.65)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';

        // Title
        ctx.fillStyle = '#39ff8c';
        ctx.font = 'bold 46px "Courier New", monospace';
        ctx.shadowColor = '#39ff8c'; ctx.shadowBlur = 18;
        ctx.fillText('SPACE INVADERS', W / 2, 104);
        ctx.shadowBlur = 0;

        const panelW = MENU.panelW, panelH = MENU.panelH;
        const px = (W - panelW) / 2, py = MENU.py;

        // ---------- Step 1: pick difficulty ----------
        if (menuStep === 0) {
            ctx.fillStyle = 'rgba(10,14,40,.85)';
            ctx.strokeStyle = 'rgba(57,255,140,.4)';
            ctx.lineWidth = 1;
            ctx.fillRect(px, py, panelW, panelH);
            ctx.strokeRect(px, py, panelW, panelH);

            ctx.fillStyle = '#aaf0ff';
            ctx.font = 'bold 26px "Courier New", monospace';
            ctx.fillText('SELECT DIFFICULTY', W / 2, py + 34);

            const dm = MENU.difficulty;
            const itemH = dm.itemH, startY = py + dm.startY;
            DIFFICULTIES.forEach((d, i) => {
                const y = startY + i * itemH;
                const selected = i === difficultyIdx;
                if (selected) {
                    ctx.fillStyle = 'rgba(57,255,140,.12)';
                    ctx.fillRect(px + 14, y + dm.boxTop, panelW - 28, dm.boxH);
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 14, y + dm.boxTop, panelW - 28, dm.boxH);
                }
                ctx.textAlign = 'left';
                ctx.fillStyle = selected ? d.color : '#7f8bb3';
                ctx.font = (selected ? 'bold ' : '') + '24px "Courier New", monospace';
                ctx.fillText((selected ? '▶ ' : '   ') + d.name, px + 32, y);
                ctx.font = '17px "Courier New", monospace';
                ctx.fillStyle = selected ? 'rgba(170,240,255,.9)' : 'rgba(127,139,179,.6)';
                ctx.fillText(d.desc, px + 190, y);
            });
            ctx.textAlign = 'center';

            if (Math.floor(state.time / 30) % 2 === 0) {
                ctx.fillStyle = '#39ff8c';
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.shadowColor = '#39ff8c'; ctx.shadowBlur = 10;
                ctx.fillText(isTouch ? 'TAP A ROW · PRESS CONFIRM' : 'PRESS ENTER TO CONTINUE', W / 2, py + panelH + 34);
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#7f8bb3';
            ctx.font = '15px "Courier New", monospace';
            ctx.fillText(isTouch ? 'tap to highlight · swipe to browse' : '↑ ↓ choose · Enter to continue', W / 2, H - 18);
        }

        // ---------- Step 2: pick superpower ----------
        else {
            ctx.fillStyle = 'rgba(10,14,40,.85)';
            ctx.strokeStyle = 'rgba(199,146,234,.4)';
            ctx.lineWidth = 1;
            ctx.fillRect(px, py, panelW, panelH);
            ctx.strokeRect(px, py, panelW, panelH);

            ctx.fillStyle = '#c792ea';
            ctx.font = 'bold 26px "Courier New", monospace';
            ctx.fillText('SELECT SUPERPOWER', W / 2, py + 34);

            // show which difficulty this is for
            ctx.font = '18px "Courier New", monospace';
            ctx.fillStyle = currentDiff.color;
            ctx.fillText('for ' + currentDiff.name + ' difficulty', W / 2, py + 56);

            const powers = availablePowers;
            const sm = MENU.superpower;
            const itemH = sm.itemH, startY = py + sm.startY;
            powers.forEach((p, i) => {
                const y = startY + i * itemH;
                const selected = p.id === currentSuper.id;
                if (selected) {
                    ctx.fillStyle = 'rgba(199,146,234,.12)';
                    ctx.fillRect(px + 14, y + sm.boxTop, panelW - 28, sm.boxH);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 14, y + sm.boxTop, panelW - 28, sm.boxH);
                }
                ctx.textAlign = 'left';
                ctx.fillStyle = selected ? p.color : '#7f8bb3';
                ctx.font = (selected ? 'bold ' : '') + '23px "Courier New", monospace';
                ctx.fillText((selected ? '▶ ' : '   ') + p.name, px + 32, y);
                ctx.font = '17px "Courier New", monospace';
                ctx.fillStyle = selected ? 'rgba(170,240,255,.9)' : 'rgba(127,139,179,.6)';
                ctx.fillText(p.desc, px + 190, y);
            });
            ctx.textAlign = 'center';

            if (Math.floor(state.time / 30) % 2 === 0) {
                ctx.fillStyle = '#39ff8c';
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.shadowColor = '#39ff8c'; ctx.shadowBlur = 10;
                ctx.fillText(isTouch ? 'TAP A ROW · PRESS CONFIRM' : 'PRESS ENTER TO START', W / 2, py + panelH + 34);
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#7f8bb3';
            ctx.font = '15px "Courier New", monospace';
            ctx.fillText(isTouch ? 'tap to highlight · swipe to browse' : '↑ ↓ choose · Enter to start · Backspace back', W / 2, H - 18);
        }
    }

    // Hit-test rects for the current start-menu rows (used for tap-to-select).
    // Must stay in sync with the layout drawn in drawStartScreen (same MENU consts).
    menuRows(menuStep, difficultyIdx, superIdx) {
        const panelW = MENU.panelW;
        const px = (W - panelW) / 2;
        if (menuStep === 0) {
            const { itemH, startY, boxTop, boxH } = MENU.difficulty;
            return DIFFICULTIES.map((d, i) => {
                const y = MENU.py + startY + i * itemH;
                return { index: i, id: i, name: d.name, x: px + 14, y: y + boxTop, w: panelW - 28, h: boxH };
            });
        }
        const { itemH, startY, boxTop, boxH } = MENU.superpower;
        return this.availablePowers(difficultyIdx).map((p, i) => {
            const y = MENU.py + startY + i * itemH;
            return { index: i, id: p.id, name: p.name, x: px + 14, y: y + boxTop, w: panelW - 28, h: boxH };
        });
    }

    drawPauseScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.fillText('PAUSED', W / 2, H / 2);
        ctx.fillStyle = '#aaf0ff';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText('Press P to resume', W / 2, H / 2 + 30);
    }

    drawGameOverScreen(state) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 44px "Courier New", monospace';
        ctx.shadowColor = '#ff6b6b'; ctx.shadowBlur = 15;
        ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffd54f';
        ctx.font = '22px "Courier New", monospace';
        ctx.fillText('Score: ' + String(state.score).padStart(4, '0'), W / 2, H / 2 + 10);
        ctx.fillStyle = '#aaf0ff';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText('High Score: ' + String(state.high).padStart(4, '0'), W / 2, H / 2 + 40);
        ctx.fillText('Press ENTER for menu', W / 2, H / 2 + 75);
    }
}
