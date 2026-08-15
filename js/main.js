import { Game } from './game.js';

// ---------- Entry point: bootstrap only ----------
const game = new Game(document.getElementById('game'));
game.init();
game.run();
