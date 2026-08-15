import { W, H } from '../config.js';

// ---------- Shields (bunkers) ----------
export class Shield {
    constructor() {
        this.bunkers = [];
        this.build();
    }

    build() {
        this.bunkers = [];
        const shieldW = 70, shieldH = 44, gap = 96;
        const y = H - 130;
        const startX = (W - (4 * shieldW + 3 * gap)) / 2;
        for (let i = 0; i < 4; i++) {
            const sx = startX + i * (shieldW + gap);
            const cells = [];
            const rows = 8, cols = 12;
            const cellW = shieldW / cols, cellH = shieldH / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // carve out the classic arch shape
                    const isArch = (r < 3) && (c < 2 || c >= cols - 2);
                    const isTop = r === 0 && (c < 1 || c >= cols - 1);
                    if (!isArch && !isTop) {
                        cells.push({ x: sx + c * cellW, y: y + r * cellH, w: cellW + 1, h: cellH + 1 });
                    }
                }
            }
            this.bunkers.push(cells);
        }
    }
}
