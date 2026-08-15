import { W, H } from './config.js';

// ---------- Input: keyboard, touch buttons, and canvas drag-to-steer ----------
// Decoupled from game logic via callbacks. Never mutates game state directly.
export class InputManager {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.keys = { left: false, right: false, space: false };
        this.steerX = null; // canvas-space X while dragging, else null
        this.menuStartY = null;  // touch start Y while in the start menu
        this.menuSwiped = false; // whether the current menu touch was a swipe
        this.tapX = 0;  // last tap position in canvas space
        this.tapY = 0;
        this.cb = callbacks;

        this.btnPause = document.getElementById('pauseBtn');

        // true on touch devices / small windows (used by Game for auto-fire)
        this.isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 860;
        window.addEventListener('resize', () => {
            this.isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 860;
        });

        this.bindKeyboard();
        this.bindPause();
        this.bindCanvas();
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (this.cb.onAnyKey) this.cb.onAnyKey();
            switch (e.code) {
                case 'ArrowLeft': e.preventDefault(); this.keys.left = true; break;
                case 'ArrowRight': e.preventDefault(); this.keys.right = true; break;
                case 'Space': e.preventDefault(); if (!e.repeat) this.keys.space = true; break;
                case 'KeyM':
                    if (this.cb.onMute) this.cb.onMute();
                    break;
                case 'KeyO':
                    if (this.cb.isMenu && this.cb.isMenu() && this.cb.onOptions) this.cb.onOptions();
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                    if (this.cb.isMenu && this.cb.isMenu()) {
                        e.preventDefault();
                        if (this.cb.onNavigate) this.cb.onNavigate(e.code === 'ArrowUp' ? -1 : 1);
                    }
                    break;
                case 'Backspace':
                case 'Escape':
                    e.preventDefault();
                    if (this.cb.onBack) this.cb.onBack();
                    break;
                case 'KeyP':
                    if (this.cb.onPause) this.cb.onPause();
                    break;
                case 'Enter':
                case 'NumpadEnter':
                    if (this.cb.onConfirm) this.cb.onConfirm();
                    break;
            }
        });
        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft': this.keys.left = false; break;
                case 'ArrowRight': this.keys.right = false; break;
                case 'Space': this.keys.space = false; break;
            }
        });
    }

    bindPause() {
        this.btnPause.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.cb.onAnyKey) this.cb.onAnyKey();
            if (this.cb.onPause) this.cb.onPause();
        });
    }

    // canvas: drag to steer (gameplay); swipe up/down to choose + tap to
    // confirm (start menu); tap when game over -> back to menu
    bindCanvas() {
        const canvas = this.canvas;
        const SWIPE = 16; // vertical px to register one menu navigation step

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.cb.onAnyKey) this.cb.onAnyKey();
            const rect = canvas.getBoundingClientRect();
            this.steerX = (e.touches[0].clientX - rect.left) * (W / rect.width);
            this.tapX = this.steerX;
            this.tapY = (e.touches[0].clientY - rect.top) * (H / rect.height);

            if (this.cb.isMenu && this.cb.isMenu()) {
                // in the start menu: swipe to browse, tap a row to select (no buttons on mobile)
                this.menuStartY = e.touches[0].clientY;
                this.menuSwiped = false;
            } else if (this.cb.isGameOver && this.cb.isGameOver()) {
                setTimeout(() => { if (this.cb.isGameOver() && this.cb.onConfirm) this.cb.onConfirm(); }, 200);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            this.steerX = (e.touches[0].clientX - rect.left) * (W / rect.width);

            if (this.menuStartY !== null) {
                const dy = e.touches[0].clientY - this.menuStartY;
                if (Math.abs(dy) >= SWIPE) {
                    if (this.cb.onNavigate) this.cb.onNavigate(dy < 0 ? -1 : 1);
                    this.menuStartY = e.touches[0].clientY; // allow continued swiping
                    this.menuSwiped = true;
                }
            }
        }, { passive: false });

        const endTouch = () => {
            if (this.menuStartY !== null) {
                // a tap (no swipe) selects the tapped row, or falls back to advancing
                if (!this.menuSwiped) {
                    if (this.cb.onTap) this.cb.onTap(this.tapX, this.tapY);
                    else if (this.cb.onConfirm) this.cb.onConfirm();
                }
                this.menuStartY = null;
                this.menuSwiped = false;
            }
            this.steerX = null;
        };
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); endTouch(); }, { passive: false });
        canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); endTouch(); }, { passive: false });
    }
}
