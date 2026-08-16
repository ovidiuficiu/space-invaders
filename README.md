# 👾 Space Invaders

A modern, canvas-based take on the classic arcade shooter — built with plain
HTML, CSS, and JavaScript. No frameworks, no bundlers, no dependencies.

## ✨ Features

- **Classic arcade gameplay** — squadrons of invaders, destructible shields, and a sneaky UFO
- **4 difficulty levels** — from a chill EASY pace to full-on INSANE bullet hell
- **4 ship types** — choose a fast interceptor, spread-fire bomber, armored guardian, or heavy-shot pulse ship
- **Superpowers** — BLAZING, TRIPLE, BOUNCE, PIERCE, and SHIELD
- **Pickups** — collect powerups (and the occasional 1UP) dropped by the special ship
- **Full sound** — synth-based audio effects and music, all generated in the browser
- **Responsive input** — keyboard, on-screen touch buttons, and drag-to-steer on mobile
- **Persistent progress** — your high score and settings are saved locally

## 🎮 How to play

| Action      | Key          |
| ----------- | ------------ |
| Move        | ← → (or drag)|
| Fire        | Space / FIRE |
| Pause       | P            |
| Toggle sound| M            |
| Start/Restart | Enter     |

## 🚀 Run it

Because the game uses ES modules, serve it over HTTP rather than opening the
file directly:

```bash
python3 -m http.server
```

Then open <http://localhost:8000>.

## 🧱 Structure

```
├── index.html          # entry point
├── styles.css          # all styling
└── js/
    ├── main.js         # bootstrap
    ├── config.js       # constants & game data
    ├── audio.js        # AudioManager (Web Audio synth)
    ├── input.js        # InputManager (keyboard + touch)
    ├── renderer.js     # Renderer (all canvas drawing)
    ├── game.js         # Game (state, flow, collisions)
    └── entities/       # Player, InvaderGrid, Ufo, Projectile,
                        # Powerup, Shield, Particle
```

The code is organized into small, focused ES modules. `space-invaders.html`
holds the original single-file version as a backup.
