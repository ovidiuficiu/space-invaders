import { W } from './config.js';

// ---------- Input: keyboard, touch buttons, and canvas drag-to-steer ----------
// Decoupled from game logic via callbacks. Never mutates game state directly.
export class InputManager {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.keys = { left: false, right: false, space: false };
        this.steerX = null; // canvas-space X while dragging, else null
        this.cb = callbacks;

        this.btnUp = document.getElementById('btnUp');
        this.btnDown = document.getElementById('btnDown');
        this.btnLeft = document.getElementById('btnLeft');
        this.btnRight = document.getElementById('btnRight');
        this.btnFire = document.getElementById('btnFire');
        this.btnBack = document.getElementById('btnBack');
        this.btnPause = document.getElementById('pauseBtn');
        this.touchControls = document.getElementById('touchControls');

        this.bindKeyboard();
        this.bindHoldButtons();
        this.bindPause();
        this.bindCanvas();
        this.updateTouchControls();
        window.addEventListener('resize', () => this.updateTouchControls());
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

    // hold-to-press buttons (pointer events unify mouse + touch)
    bindHold(el, onDown, onUp) {
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) { }
            el.classList.add('pressed');
            onDown();
        });
        const release = () => { el.classList.remove('pressed'); onUp && onUp(); };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('lostpointercapture', release);
    }

    bindHoldButtons() {
        this.bindHold(this.btnLeft, () => { this.keys.left = true; }, () => { this.keys.left = false; });
        this.bindHold(this.btnRight, () => { this.keys.right = true; }, () => { this.keys.right = false; });

        // FIRE: in-game = shoot; in menu / game over = confirm
        this.bindHold(this.btnFire, () => {
            if (this.cb.isPlaying && this.cb.isPlaying()) {
                this.keys.space = true;
            } else if (this.cb.onConfirm) {
                this.cb.onConfirm();
            }
        }, () => { this.keys.space = false; });

        // menu navigation buttons
        this.bindHold(this.btnUp, () => { if (this.cb.isMenu && this.cb.isMenu() && this.cb.onNavigate) this.cb.onNavigate(-1); });
        this.bindHold(this.btnDown, () => { if (this.cb.isMenu && this.cb.isMenu() && this.cb.onNavigate) this.cb.onNavigate(1); });
        this.bindHold(this.btnBack, () => { if (this.cb.onBack) this.cb.onBack(); });
    }

    bindPause() {
        this.btnPause.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.cb.onAnyKey) this.cb.onAnyKey();
            if (this.cb.onPause) this.cb.onPause();
        });
    }

    // canvas: drag to steer; tap when game over -> back to menu
    bindCanvas() {
        const canvas = this.canvas;
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.cb.onAnyKey) this.cb.onAnyKey();
            const rect = canvas.getBoundingClientRect();
            this.steerX = (e.touches[0].clientX - rect.left) * (W / rect.width);
            if (this.cb.isGameOver && this.cb.isGameOver()) {
                setTimeout(() => { if (this.cb.isGameOver() && this.cb.onConfirm) this.cb.onConfirm(); }, 200);
            }
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            this.steerX = (e.touches[0].clientX - rect.left) * (W / rect.width);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.steerX = null;
        }, { passive: false });
        canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.steerX = null;
        }, { passive: false });
    }

    // show touch controls on coarse-pointer (touch) devices, else on small windows
    updateTouchControls() {
        this.touchControls.classList.toggle('visible', window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 860);
    }

    updateBackButton(visible) {
        if (this.btnBack) this.btnBack.style.display = visible ? 'flex' : 'none';
    }
}
