# Breaker 3D Arcade

Breaker 3D Arcade is a modern, single‑page Three.js brick breaker that mixes neon sci‑fi and stylised biomes with a surprising amount of depth. The entire game lives inside `index.html`, yet it delivers six themed arenas, animated glTF scenery, power‑ups, particle FX, and audio‑reactive ambience.

---
## 🚀 Feature Overview

- **Six handcrafted arenas** – Synthwave Nebula, Cosmic Garden, Orbital Station, Aurora Peaks, Desert Mirage, and Neon Shards each ship with bespoke lighting, skybox imagery, brick textures, soundtrack, and decorative glTF collectibles.
- **Dynamic gameplay** – Smooth paddle controls (keyboard + mouse), multi-state HUD (score, lives, combo, ability cooldown), adaptive difficulty curves, and smart quest/achievement tracking.
- **Magic & power-ups** – Trigger Inferno Strike, Ice Barrier, or Time Slow with `F`. Collect spawnable bonuses (expand paddle, extra life, score boost, and upcoming multi/fast/slow ball variants) rendered with colour-coded particles.
- **VFX pipeline** – Custom canvas-generated sprite textures, additive fire/ice/slow halos, procedural brick “wizz” rings, and fading debris spawned from precise collision data.
- **Audio design** – Per-level streaming MP3s, procedural backup synth pads, dynamic cross-fades, and distinct SFX cues for magic casting, collisions, UI, and state transitions.
- **Lightweight deployment** – No build step, no bundler. Drop the folder on any static host (GitHub Pages, Netlify, S3, etc.) and you are live.

---
## 📁 Project Structure

```
threejs-simple-3d-game/
├─ index.html   # Complete game: Three.js scene, logic, HUD, audio, FX
├─ resources/   # Local music tracks (start + 3 in-game loops; extendable)
└─ README.md    # This document
```

---
## 🎮 Controls

| Action                         | Input                                 |
|--------------------------------|----------------------------------------|
| Launch game / resume           | `Start` button (or `Space` if paused) |
| Pause / resume                 | `Space` or `Pause` button             |
| Move paddle                    | `←` `→` keys or mouse move            |
| Toggle audio                   | `Audio: on/off` button                |
| Trigger magic ability          | `F` key (ability must be ready)       |
| Switch level / paddle choose   | Selector buttons in top-right HUD     |

---
## 🛠️ Tech Stack

- **Three.js 0.119.1** (classic build) + `GLTFLoader`, `RGBELoader`
- **Vanilla JavaScript** (ES5-compatible) inside a single HTML file
- **Web Audio API** for music and SFX graph, procedural backup synths
- **Canvas-generated textures** for particle sprites
- **Browser storage** (`localStorage`) for best score persistence

> The project intentionally avoids bundlers and relies on CDN scripts so it runs from a local file URL or any static host.

---
## 🧱 Gameplay Systems

### Paddle & Ball Logic
- Paddle physics interpolated with mouse or keyboard input (smoothed velocity clamping).
- Ball acceleration curve tied to level progression and ability modifiers.
- Collision system handles paddle spin, brick bounding boxes, arena walls, ice barriers, and upcoming multi-ball support.

### Brick Generation
- Layouts generated per level (classic grid, wave offset, pyramid). Themes provide bespoke brick textures.
- Brick destruction spawns fade-out meshes, debris, and ability-specific particle effects.

### Power-ups & Magic
- **Power-ups** drop with varying rarity (paddle expand, life, score bonus, with multi/fast/slow ball in the pipeline).
- **Magic abilities** mapped to paddles:
  - *Inferno Strike* – converts the ball into an unstoppable, chaining fireball for 4 seconds.
  - *Ice Barrier* – spawns a rebound wall near the fail line for 5 seconds.
  - *Time Slow* – slows ball velocity for a fixed duration.
- Each ability has unique audio, VFX, and HUD feedback.

### HUD & Progression
- Score, best score, lives, level, combo multiplier, quest tracker, ability status.
- Achievements unlock based on milestones (score thresholds, level completion, combo, quest completion).
- Level selector and paddle selector available mid-session.

---
## 🎧 Audio Pipeline
- Music map assigns a local MP3 loop per arena plus a lobby track.
- Procedural synth fallback plays if streaming fails (ensures ambience even offline).
- SFX are generated via Web Audio oscillators with per-event envelopes.
- Master gain obeys HUD slider; mute/pause handled gracefully with resume safeguards.

---
## 🚧 Roadmap Ideas
- **Multi-ball engine** – manage multiple ball instances, unique colours, per-ball modifiers.
- **New power-ups** – fast ball, slow ball, shield, beam, teleporter.
- **Leaderboard UI** – persist top runs (score + time) with shareable seeds.
- **Shader polish** – bloom/glow post-processing, refraction for ice barrier, stylised trails.
- **Touch controls** – mobile friendly drag input and vibration feedback.

---
## 📦 Running Locally

1. Clone or download the repository.
2. Ensure the `resources/` directory stays alongside `index.html` (for music playback).
3. Open `index.html` in a modern browser (Chrome, Edge, Firefox). For Safari/iOS, consider serving via a local HTTP server to avoid local-file restrictions.

> When running from `file://`, remote glTF assets still require an internet connection.

---
## 🤝 Contributing

This project is intentionally self-contained, so contributions are welcome in the form of pull requests that:
- Improve visuals, performance, or accessibility without introducing build tooling.
- Add new level themes or assets while keeping the footprint reasonable.
- Expand documentation, localization, or testing.

For major features (multi-ball, shader pipeline, etc.), open an issue first to align on scope.

---
## 📜 License & Credits

- **Code** – MIT License (see repository).
- **Audio** – Tracks in `resources/` follow their original license (Pixabay CC0); replace or extend as needed.
- **Models & textures** – Demo assets from the Three.js examples and royalty-free imagery; check their licenses before redistribution.

Made with ☕ and 🎧 by the Breaker 3D Arcade team. Enjoy the neon chaos!

---
## 🚧 TODO

- **cool background picture** - Add background pictures or videos
- **bonus** ensure adding new bonus (fast ball, slow ball, multiple balls, etc)