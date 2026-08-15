# Space Invaders — Refactoring Plan

## 1. Goal

Split the current single-file `space-invaders.html` into a maintainable, modular
project with separate HTML, CSS, and JavaScript. Then further organize the
JavaScript into focused ES modules / classes.

### Non-goals (for now)

- Changing gameplay behavior or visuals.
- Adding new features (powerups, difficulty, touch controls all stay as-is).
- Adding a build tool (no bundler). Plain ES modules loaded via `<script type="module">`.

---

## 2. Current State Analysis

| Concern | Location | Size | Problems |
| --- | --- | --- | --- |
| HTML structure | `<body>` | ~100 lines | Fine, just needs extraction |
| CSS | `<style>` | ~200 lines | Fine, move to file |
| JS | `<script>` IIFE | ~1200 lines | One giant closure mixes everything |

The JS currently bundles these responsibilities in one scope:

1. **Audio** — Web Audio synth (`ensureAudio`, `tone`, `sfx`, `setMuted`)
2. **Config/data** — `DIFFICULTIES`, `SUPERPOWERS`, `POWERUP_TYPES`, sprite grids, constants
3. **Game state** — `state`, `player`, `invaders`, `shields`, `shots`, `particles`, `powerups`
4. **Entity logic** — player, invaders, UFO, projectiles, powerups, shields, particles
5. **Rendering** — `draw*` functions, sprite drawing, menus, overlays
6. **Input** — keyboard, touch, on-screen buttons, drag-to-steer
7. **Game flow** — menu, start/end/next level, scoring
8. **Main loop** — `loop()` + init

Shared state is accessed via free variables, which makes splitting harder.
The refactor must introduce clear ownership boundaries.

---

## 3. Target Structure

```
Space invaders/
├── index.html
├── styles.css
├── js/
│   ├── main.js                 # entry point: wires everything up, starts loop
│   ├── config.js               # constants & static data (no logic)
│   ├── audio.js                # AudioManager class
│   ├── input.js                # InputManager class
│   ├── renderer.js             # Renderer class (all canvas drawing)
│   ├── game.js                 # Game class (orchestration + game flow)
│   └── entities/
│       ├── Player.js
│       ├── InvaderGrid.js      # manages all invaders as a group
│       ├── Ufo.js
│       ├── Projectile.js       # player & invader shots (or two classes)
│       ├── Powerup.js
│       ├── Shield.js           # shield grid / bunkers
│       └── Particle.js
```

`index.html` loads a single entry module:

```html
<script type="module" src="js/main.js"></script>
```

> Note: ES modules require serving over HTTP (or using a local server), because
> `file://` blocks module CORS. Use `python3 -m http.server` or VS Code Live Server.
> If offline/no-server is a hard requirement, fall back to plain scripts with a
> load order — see §7.

---

## 4. Module / Class Responsibilities

### 4.1 `js/config.js` (pure data, no dependencies)

Extract all static data currently inlined:

- `DIFFICULTIES` array
- `SUPERPOWERS` array
- `POWERUP_TYPES` array
- `POWERUP_DURATION`
- Canvas/logic constants: `W`, `H`, `INVADER_W/H`, `COLS`, `ROWS`, `SHOT_SPEED`, etc.
- Sprite grids: `SPRITE_SQUID`, `SPRITE_CRAB`, `SPRITE_OCTO` (+ `*_2` variants)
- Local storage keys (`siHigh`, `siMuted`)

Export with named exports:

```js
export const DIFFICULTIES = [...];
export const SPRITES = { squid: [...], crab: [...], octo: [...] };
```

### 4.2 `js/audio.js` — `AudioManager`

Owns the Web Audio context and synth.

- `ensureAudio()` → `ensure()`
- `tone(freq, dur, type, vol, slideTo, delay)` → private
- `sfx.shoot` → `play('shoot')`
- `setMuted(m)` → `setMuted(m)`
- `isMuted()` getter
- Persists `siMuted` to `localStorage`

```js
export class AudioManager {
  constructor() { this.muted = localStorage.getItem('siMuted') === '1'; }
  ensure() { ... }
  setMuted(m) { ... }
  shoot() { ... }
}
```

### 4.3 `js/input.js` — `InputManager`

Centralizes all input. Exposes a plain snapshot object and a menu callback API.

- Tracks `left`, `right`, `space` (as today)
- Handles `keydown`/`keyup`
- Binds the on-screen touch buttons (`btnLeft`, `btnRight`, `btnFire`, `btnUp`,
  `btnDown`, `btnBack`, `pauseBtn`)
- Canvas drag-to-steer → exposes `steerX` (canvas-space) or `null`
- **Decouples from game logic via callbacks** so Input doesn't know about Game:

```js
constructor(canvas, callbacks) {
  this.onNavigate = callbacks.onNavigate;   // dir => void
  this.onConfirm = callbacks.onConfirm;
  this.onBack    = callbacks.onBack;
  this.onPause   = callbacks.onPause;
  this.onMute    = callbacks.onMute;
  this.onAnyKey  = callbacks.onAnyKey;      // ensureAudio
}
```

- Menu keys (`ArrowUp/Down`, `Enter`, `Backspace`, `P`, `M`) call the callbacks;
  Input only routes, never mutates game state.
- Keeps the `updateBackBtn` visibility logic? **No** — button visibility moves to
  the Game/UI layer; Input just receives the elements it binds to.

### 4.4 `js/entities/*.js`

| Class | State it owns | Key methods |
| --- | --- | --- |
| `Player` | x, y, w, h, speed, cooldown, shield, powerup, powerupTime | `update(input)`, `fire(superPower)`, `hit()`, `reset()` |
| `InvaderGrid` | invaders[], dir, speed, drop, moveTimer, shootTimers | `build()`, `update(difficulty, level)`, `aliveList()`, `isCleared()` |
| `Ufo` | x, y, w, h, dir, timer | `update(level)`, `isActive` |
| `Projectile` | x, y, vx, vy, w, h, bounce/bounces, split, pierce/hitSet | `update()` returns hit/expired; factory for player/invader shots |
| `Powerup` | x, y, type, wob, vy | `update()` |
| `Shield` | cells[] per bunker | `build()`, `cells`, `damage(proj)` |
| `Particle` | x, y, vx, vy, life, color, size | `update()` |

> Particle system can be a lightweight `ParticleSystem` class (array + `spawn` +
> `update` + draw) instead of one class per particle.

### 4.5 `js/renderer.js` — `Renderer`

Holds `ctx` and all drawing. **No game logic** — receives state and draws it.

- `drawGrid()`, `drawPlayer(p)`, `drawInvaders(invaders)`, `drawUFO(u)`,
  `drawShields()`, `drawShots()`, `drawPowerups()`, `drawParticles()`
- `drawStartScreen(menuStep, diff, super, time)`
- `drawPauseScreen()`, `drawGameOverScreen(score, high)`
- `drawPowerupTimer(powerup, remaining)`
- Sprite drawing helper (`drawPixelArt` + sprite lookup from `config.js`)

This keeps every `ctx.fillText(...)` menu string in one file.

### 4.6 `js/game.js` — `Game`

The orchestrator. Owns the game state object (`state`) and coordinates the others.

- `startGame()`, `endGame()`, `nextLevel()`, `resetLevel()`
- `menuNavigate(dir)`, `menuConfirm()`, `menuBack()`
- `addScore(pts)` + milestone extra life (`nextLifeScore`)
- `playerHit()` / `applyPowerup()`
- `update(dt)` — calls each entity's update in the current order
- Holds instances: `this.player`, `this.invaders`, `this.renderer`, `this.audio`, `this.input`
- Exposes `updateBackBtn()` for UI state (moved from Input)
- Collision helper `rectsOverlap(a, b)` can live here or in a `utils.js`

### 4.7 `js/main.js` (entry point)

```js
import { Game } from './game.js';

const game = new Game(document.getElementById('game'));
game.init();
game.run();
```

Keeps only bootstrapping: grab DOM refs, instantiate dependencies, start
`requestAnimationFrame` loop. Optionally add a tiny `utils.js` for `rectsOverlap`
and `padStart` helpers.

---

## 5. Migration Steps (in safe, runnable increments)

Do these **one step at a time**, verifying the game still works after each.

1. **Extract CSS** → `styles.css`, add `<link rel="stylesheet" href="styles.css">`.
   Nothing else changes.
2. **Extract HTML** → move `<style>` out (done in step 1) and keep the body markup in
   `index.html`. Verify layout unchanged.
3. **Extract JS as a single module** → move the entire IIFE body into `js/main.js`
   as a module (remove IIFE wrapper, add exports/imports as needed). Verify parity.
   This is the riskiest single cut; keep it as one file first.
4. **Split static data** into `config.js` and import it.
5. **Introduce `AudioManager`** — move audio code; replace `ensureAudio`/`tone`/`sfx` calls.
6. **Introduce `InputManager`** — move keyboard/touch/button wiring; route menu keys
   through callbacks. Verify menus, pause, mute, touch buttons.
7. **Introduce entity classes** one at a time (start with `Particle`/`ParticleSystem`,
   then `Player`, `InvaderGrid`, `Ufo`, `Projectile`, `Powerup`, `Shield`).
8. **Introduce `Renderer`** — move all `draw*` functions; pass state in.
9. **Introduce `Game`** — pull flow/state together, delete duplicated logic.
10. **Slim `main.js`** to just bootstrapping.

Each step should leave the game functionally identical to the previous step.

---

## 6. Suggested File-by-File Mapping

| Current code | Destination |
| --- | --- |
| `<style>...</style>` | `styles.css` |
| `<body>...</body>` markup | `index.html` |
| `DIFFICULTIES`, `SUPERPOWERS`, `POWERUP_TYPES`, `POWERUP_DURATION`, constants, sprites | `js/config.js` |
| `ensureAudio`, `setMuted`, `tone`, `sfx`, `audioCtx`, `masterGain`, `muted` | `js/audio.js` |
| `input` object, `keydown`/`keyup` handlers, `bindHold`, button refs, canvas touch handlers, `touchX` | `js/input.js` |
| `player` object, `updatePlayer`, `fire` | `js/entities/Player.js` |
| `invaders`, `invaderDir`, `invaderSpeed`, `invaderDrop`, `moveTimer`, `buildInvaders`, `updateInvaders` | `js/entities/InvaderGrid.js` |
| `ufo`, `ufoTimer`, `updateUFO` | `js/entities/Ufo.js` |
| `playerShots`, `invaderShots`, `updateShots`, shot creation | `js/entities/Projectile.js` |
| `powerups`, `applyPowerup`, `updatePowerups` | `js/entities/Powerup.js` |
| `shields`, `buildShields` | `js/entities/Shield.js` |
| `particles`, `spawnParticles`, `updateParticles` | `js/entities/Particle.js` |
| `draw*`, `drawPixelArt`, `drawStartScreen`, `drawPauseScreen`, `drawGameOverScreen` | `js/renderer.js` |
| `state`, `startGame`, `endGame`, `nextLevel`, `resetLevel`, `menuNavigate`, `menuConfirm`, `menuBack`, `addScore`, `playerHit`, `updateHigh`, `loop` | `js/game.js` |
| IIFE bootstrap / init / `requestAnimationFrame(loop)` | `js/main.js` |

---

## 7. Risks & Decisions

- **ES modules need a server.** `file://` disallows module imports. Decide: run a
  local static server (recommended) or use ordered plain `<script>` tags with
  global names (simpler for casual double-click use but less clean).
- **Shared mutable state.** Today free variables are read/written across many
  functions. The class refactor must give each piece a single owner to avoid
  circular references (e.g., `Projectile` needing to add score → Game calls
  `addScore`; use return values or callback, not direct Game access).
- **Circular imports.** Keep `config.js` dependency-free and have `Renderer` import
  only `config.js`. `Game` imports everything and injects dependencies downward.
- **Behavioral parity.** No gameplay changes — only structure. Test after every step
  (see checklist below).
- **Local storage keys** stay unchanged so existing high scores/mute persist.

### Dependency direction (important)

```
main.js → Game → { Renderer, InputManager, AudioManager, entities }
entities → config.js only
Renderer → config.js only
InputManager → DOM only (+ callbacks into Game)
```

Nothing imports `Game` except `main.js`. This prevents circular imports.

---

## 8. Testing Checklist (after each step)

Run the game and confirm:

1. Page renders identical layout (title, HUD, canvas, buttons).
2. Start screen → difficulty select → superpower select → game starts (Enter and FIRE).
3. Arrows move the player; Space/FIRE shoots; cooldown works.
4. Invaders move, animate, drop at edges, and speed up with level.
5. Collisions: player shots kill invaders, UFO, and shields; invader shots hit
   player/shields; pierce/bounce/split/triple behave the same.
6. Powerups: UFO drops them, they fall, get caught, apply effects, timed bar works.
7. Lives, score, high score (persists across reload), extra life at 1000.
8. Pause (P / button), mute (M / button) persist and work.
9. Game over screen → Enter/FIRE returns to menu.
10. Touch: buttons show on coarse pointer/small screen; drag-to-steer works;
    tap on game over returns to menu.
11. No console errors on load or during play.

---

## 9. Definition of Done

- [x] `index.html`, `styles.css`, and `js/` exist with clean separation.
- [x] No `<style>` or `<script>` blocks remain inline in `index.html`.
- [x] JS organized into the classes/modules in §4.
- [x] `main.js` is only bootstrapping.
- [x] Gameplay is functionally identical to the original.
- [x] All items in §8 pass (verified in a browser via local HTTP server).

