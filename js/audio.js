import { STORAGE_KEYS } from './config.js';

// ---- 80s action music data (Am – F – C – G, driving synthwave) ----
// Bar root frequencies (Hz) and semitone patterns (relative to the root).
const MUSIC_CHORD_ROOTS = [110.0, 87.31, 130.81, 98.0]; // Am, F, C, G
const MUSIC_BASS = [
    [0, 0, 12, 0, 7, 0, 12, 0],
    [0, 0, 12, 0, 7, 0, 12, 0],
    [0, 0, 12, 0, 7, 0, 12, 0],
    [0, 0, 12, 0, 7, 0, 12, 0]
];
const MUSIC_LEAD = [
    [12, 15, 19, 15, 12, 19, 15, 19], // A4 C5 E5 ...
    [12, 16, 19, 16, 12, 19, 16, 19], // F4 A4 C5 ...
    [12, 16, 19, 16, 12, 19, 16, 19], // C4 E4 G4 ...
    [12, 16, 19, 16, 12, 19, 16, 19]  // G4 B4 D5 ...
];
const MUSIC_TOTAL_STEPS = 64; // 4 bars x 16 sixteenths

// ---------- Audio (Web Audio API synth) ----------
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = localStorage.getItem(STORAGE_KEYS.muted) === '1';
        this.musicBus = null;
        this.musicVolume = this.loadMusicVolume();
        this.noiseBuffer = null;
        this.musicTimer = null;
        this.musicStep = 0;
        this.nextNoteTime = 0;
        this.tempo = 138;
    }

    get isMuted() {
        return this.muted;
    }

    ensure() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.muted ? 0 : 0.5;
                this.master.connect(this.ctx.destination);
                this.musicBus = this.ctx.createGain();
                this.musicBus.gain.value = this.musicVolume;
                this.musicBus.connect(this.master);
                this.noiseBuffer = this.makeNoiseBuffer();
            } catch (e) { }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.startMusic();
    }

    setMuted(m) {
        this.muted = m;
        localStorage.setItem(STORAGE_KEYS.muted, m ? '1' : '0');
        if (this.master) this.master.gain.value = m ? 0 : 0.5;
        const btn = document.getElementById('muteBtn');
        if (btn) btn.textContent = m ? '🔇 Sound Off' : '🔊 Sound On';
        if (!m && this.ctx && this.musicTimer) {
            // restart the sequencer cleanly so it doesn't burst a backlog of notes
            this.musicStep = 0;
            this.nextNoteTime = this.ctx.currentTime + 0.1;
        }
    }

    loadMusicVolume() {
        const stored = parseFloat(localStorage.getItem(STORAGE_KEYS.musicVol));
        if (!Number.isFinite(stored)) return 0.6; // default: lowered a bit
        return Math.min(1, Math.max(0, stored));
    }

    // Music volume (0..1). 0 = music off. Persisted separately from mute.
    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, v));
        localStorage.setItem(STORAGE_KEYS.musicVol, String(this.musicVolume));
        if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
        if (this.musicVolume > 0 && this.musicTimer && this.ctx) {
            // resume cleanly from a fully-off state without a note backlog
            this.musicStep = 0;
            this.nextNoteTime = this.ctx.currentTime + 0.1;
        }
    }

    // tone: envelope-controlled oscillator
    tone(freq, dur, type, vol, slideTo, delay, dest) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + (delay || 0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
        gain.gain.setValueAtTime(vol || 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(dest || this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    shoot() {
        this.tone(900, 0.09, 'square', 0.045, 300);
        this.tone(1400, 0.06, 'sawtooth', 0.02, 500);
    }

    // ================= 80s action background music =================
    // Lookahead-scheduled 16th-note sequencer: kick/snare/hat + saw bass + square lead.
    startMusic() {
        if (!this.ctx || this.musicTimer) return;
        this.musicStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusic() {
        if (!this.ctx || this.muted || this.musicVolume <= 0) return;
        const sec16 = 60 / this.tempo / 4;
        while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
            this.playMusicStep(this.musicStep, this.nextNoteTime - this.ctx.currentTime);
            this.nextNoteTime += sec16;
            this.musicStep = (this.musicStep + 1) % MUSIC_TOTAL_STEPS;
        }
    }

    playMusicStep(step, delay) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const root = MUSIC_CHORD_ROOTS[bar];

        // drums
        if (s % 4 === 0) this.kick(delay); // four on the floor
        if (s === 4 || s === 12) this.snare(delay); // backbeat on 2 & 4
        if (s % 2 === 1) this.hat(delay); // offbeat 8ths

        // bass + lead on 8th notes
        if (s % 2 === 0) {
            const bassSemi = MUSIC_BASS[bar][s / 2];
            this.playBass(root * Math.pow(2, bassSemi / 12), delay);
            const leadSemi = MUSIC_LEAD[bar][s / 2];
            this.playLead(root * Math.pow(2, leadSemi / 12), delay);
        }
    }

    playBass(freq, delay) {
        this.tone(freq, 0.16, 'sawtooth', 0.14, freq * 0.98, delay, this.musicBus);
    }

    playLead(freq, delay) {
        this.tone(freq, 0.14, 'square', 0.07, undefined, delay, this.musicBus);
    }

    kick(delay) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this.musicBus);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    snare(delay) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.8;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(filter).connect(gain).connect(this.musicBus);
        src.start(t);
        src.stop(t + 0.15);
    }

    hat(delay) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(filter).connect(gain).connect(this.musicBus);
        src.start(t);
        src.stop(t + 0.05);
    }

    makeNoiseBuffer() {
        const len = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }
}
