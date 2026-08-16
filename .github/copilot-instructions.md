# Space Invaders Project Instructions

## Project purpose

This repository contains a browser-based Space Invaders game. It is a plain HTML, CSS, and JavaScript project with native ES modules. It has no framework, package manager, bundler, build step, or runtime dependency.

The active refactored application is `index.html`. The older single-file implementation is `space-invaders.html` and is retained as a backup/reference; do not modify it unless the task explicitly targets that legacy version.

## How to run

Because `index.html` imports JavaScript modules, do not open it with `file://`. Browsers block module imports from local files. Start a static HTTP server from the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`. Port 8000 may be replaced if it is already in use. A VS Code Live Server extension is also acceptable. No `npm install`, `npm run`, compilation, or bundling is required.

To stop the Python server, press `Ctrl+C` in the terminal running it.

## How to play

Desktop keyboard:

- `ArrowLeft` / `ArrowRight`: move.
- `Space`: fire.
- `P`: pause/resume.
- `M`: toggle sound.
- `O`: open options from the main menu.
- `ArrowUp` / `ArrowDown`: navigate the main menu.
- `Enter` or `NumpadEnter`: confirm, start, or restart.
- `Escape` or `Backspace`: go back in the menu.
- The pause button in the canvas also pauses the game.

Touch and small screens:

- Controls appear on coarse-pointer devices or windows at most 860px wide.
- Drag on the canvas to steer; touch gameplay uses automatic firing.
- Swipe vertically in the start menu to change selection, then tap to select/confirm.
- Touch pause, restart, quit, options, and sound controls are available in the UI.
- Tap the canvas after game over to return to the menu.

Game flow:

1. Choose one of four difficulty levels.
2. Choose a ship: INTERCEPTOR (fast and precise), BOMBER (spread fire), GUARDIAN (two armor hits), or PULSE (wide heavy shots).
3. Choose one of five starting superpowers.
4. Confirm to begin.
5. Destroy invaders, avoid projectiles, collect UFO powerups, and survive levels.
6. High score, mute state, and music volume persist in browser `localStorage`.

## Active entry points

- `index.html`: active document, HUD, canvas, buttons, overlays, and module script.
- `styles.css`: active styling.
- `js/main.js`: bootstrap only; creates `Game`, calls `init()`, and starts `run()`.
- `js/game.js`: game state, frame/update flow, collisions, score, lives, pause/game-over flow, DOM wiring, and subsystem coordination.

## JavaScript modules

- `js/config.js`: dependency-free constants/data, 640x720 canvas dimensions, storage keys, difficulty, ships, superpowers, powerups, and sprites.
- `js/input.js`: keyboard, pause button, touch controls, drag-to-steer, menu swipes, and touch taps; routes through callbacks.
- `js/menu.js`: difficulty, ship, and starting-superpower selection state.
- `js/audio.js`: synthesized Web Audio effects/music and persisted mute/volume.
- `js/renderer.js`: canvas drawing only; no gameplay decisions.
- `js/entities/Player.js`: selected-ship movement, firing, armor, and shields.
- `js/entities/InvaderGrid.js`: formation movement, animation, and enemy firing.
- `js/entities/Projectile.js`: projectile movement and special behaviors.
- `js/entities/Ufo.js`: special ship lifecycle.
- `js/entities/Powerup.js`: falling powerups and effect/timing data.
- `js/entities/Shield.js`: destructible shield cells.
- `js/entities/Particle.js`: particle effects and updates.

## Dependency direction

Preserve this direction to avoid circular imports:

```text
main.js -> Game -> Renderer, InputManager, AudioManager, entities
entities -> config.js only
Renderer -> config.js only
InputManager -> DOM and callbacks
```

Only `main.js` should import `Game`. Entities should use return values or callbacks supplied by `Game`, not import `Game`. Keep `config.js` free of DOM access and logic.

## Change guidelines

- Make small, focused edits that preserve gameplay and module boundaries.
- Treat `index.html`, `styles.css`, and `js/` as the active implementation surface.
- Do not add frameworks, dependencies, bundlers, or build tools for ordinary feature work.
- Preserve native ES modules and `.js` extensions in imports.
- Keep rendering in `Renderer`, input routing in `InputManager`, menu selection in `Menu`, and orchestration/collisions in `Game`.
- Preserve `localStorage` keys `siHigh`, `siMuted`, and `siMusicVol`.
- Preserve the logical canvas size 640x720 unless the game design explicitly changes.
- Update HTML and JavaScript together when adding/removing controls, preserving existing DOM ids and callbacks.
- Do not edit `space-invaders.html` for active-game changes; it is the monolithic backup.
- Do not add generated files, build output, logs, or dependencies.
- Keep source files ASCII unless an existing user-facing character is required.

## Validation checklist

Serve the repository over HTTP and browser-test the active page after gameplay or UI changes:

1. No console errors; imports resolve.
2. Title, HUD, canvas, buttons, and overlays render.
3. Difficulty, ship, and superpower selection work with keyboard and touch.
4. Enter/FIRE starts and restarts.
5. Each ship has the intended movement, firing pattern, visual identity, and armor behavior; movement, cooldown, and drag-to-steer work.
6. Invaders move, animate, fire, reach the player, and speed up by level.
7. Collisions work for invaders, UFOs, shots, and shields.
8. Triple, bounce, pierce, split, rapid, shield, and life effects work.
9. Score, lives, extra life at 1000, game over, and high score persistence work.
10. Pause, restart, main-menu navigation, mute, and volume work.
11. Touch controls appear on coarse-pointer or narrow-screen layouts.
12. Reloading preserves high score, mute, and volume.

There is no automated test suite or package script; browser smoke testing is the project validation method. If module requests fail, the page was likely opened with `file://` or the server was started outside the repository root.
