# Breaker 3D Arcade

Breaker 3D Arcade est un clone de casse-briques futuriste développé avec Three.js. Après la refonte structurelle récente, le projet s’organise désormais autour d’ES modules clairs (scène, entités, audio, configuration). Cette documentation résume les fonctionnalités, la navigation dans le code, et la manière de lancer le jeu.

---
## ✨ Caractéristiques principales

- **Six arènes thématiques** : Synthwave Nebula, Cosmic Garden, Orbital Station, Aurora Peaks, Desert Mirage et Neon Shards (chacune embarque textures, éclairages, musique et décor GLTF spécifiques).
- **Contrôles fluides** : clavier et souris, combo/hud dynamique, gestion du score et des quêtes.
- **Pouvoirs & bonus** : trois capacités spéciales par paddle (Inferno Strike, Ice Barrier, Time Slow) + power-ups aléatoires.
- **Effets visuels** : particules, halos additifs, débris, animations de suppression de briques.
- **Audio évolué** : Web Audio API, presets synthétisés, MP3 locaux, crossfades, slider de volume.
- **Déploiement simple** : HTML statique + modules ES, aucun bundler requis.

---
## 🗂️ Nouvelle structure du code

Depuis la modularisation, le répertoire contient les dossiers suivants :

```
threejs-simple-3d-game/
├─ index.html              # Markup + CSS + lien vers src/main.js
├─ resources/              # Pistes audio locales
├─ src/
│  ├─ main.js              # Point d’entrée : instancie les modules et le gameplay
│  ├─ core/
│  │  └─ scene.js          # Initialisation Three.js (renderer, lumière, loaders)
│  ├─ entities/
│  │  ├─ ball.js           # Construction de la balle (mesh, glow, lumière)
│  │  └─ paddle.js         # Construction du paddle et placeholders décoratifs
│  ├─ audio/
│  │  └─ index.js          # Système audio Web Audio (SFX, musique, presets)
│  └─ config/
│     ├─ difficulties.js   # Profils de difficulté (vitesses, vies, musique)
│     └─ paddles.js        # Profils de paddles (couleurs, capacités, paramètres)
└─ README.md               # Ce document
```

- `src/main.js` orchestre les modules : instancie la scène, le paddle, la balle, le système audio, puis garde la logique de jeu existante (HUD, collisions, pouvoirs, etc.).
- `core/scene.js` expose `initScene()` qui renvoie renderer, caméra, loaders et utilitaires (`getBrickTexture`, `setSkyTexture`, ...).
- `entities/paddle.js` et `entities/ball.js` encapsulent la création des modèles et fournissent les matériaux, lumières et helpers.
- `audio/index.js` centralise l’état audio (`audioState`) et expose des fonctions (`playSfx`, `startThemeMusic`, `toggleAudio`, ...).
- `config/` stocke les données statiques (profils de paddles/difficultés) importées par les modules.

Cette découpe facilite les tests, le rechargement partiel et l’évolutivité (ajout de nouvelles entités ou de systèmes supplémentaires).

---
## 🎮 Contrôles

| Action                     | Touches / Interface            |
|----------------------------|--------------------------------|
| Démarrer / reprendre       | Bouton `Start` ou `Space`      |
| Pause / reprise            | `Space` ou bouton `Pause`      |
| Déplacer la raquette       | Flèches gauche/droite ou souris|
| Activer la magie           | Touche `F`                     |
| Sélection niveau / paddle | Boutons HUD (coin supérieur)   |
| Activer / couper le son    | Bouton `Audio: on/off`         |

---
## 🧱 Systèmes de jeu

- **Paddle & balle** : interpolation douce, clamp de vitesse, collisions avec effets d’angle et pouvoirs.
- **Génération des briques** : layouts dynamiques (grille, vagues, pyramide) + textures dépendantes du thème.
- **Quêtes & combos** : suivi du score, meilleur score via `localStorage`, quêtes à objectifs (récompense de points).
- **Pouvoirs** : habilités spécifiques à chaque paddle, cooldowns, feedback HUD/audio/VFX.

---
## 🎧 Pipeline audio (module `audio/index.js`)

- Préserve les presets d’oscillateurs (SFX) et les pistes MP3.
- Instancie le graphe (`AudioContext`, `masterGain`, etc.).
- Fournit des helpers : `ensureAudioReady`, `resumeMusic`, `pauseMusic`, `setMasterVolume`, `playProceduralMusic`.
- `audioState` garde la configuration (volume, thèmes en attente, buffers décodés).

---
## ⚙️ Lancer le projet

1. Cloner ou télécharger le dépôt.
2. Laisser le dossier `resources/` au même niveau que `index.html` (pour les MP3).
3. Ouvrir `index.html` dans un navigateur moderne (Chrome/Firefox/Edge). Pour Safari/iOS, servir via un petit serveur HTTP (par ex. `python -m http.server`).
4. Aucune dépendance supplémentaire n’est requise : les scripts Three.js viennent du CDN.

> Les modèles GLTF chargés depuis un CDN nécessitent une connexion réseau.

---
## 🚀 Pistes d’amélioration

- Ajouter un module `game/loop.js` pour isoler la boucle `requestAnimationFrame` et répartir les updates.
- Extraire la logique HUD/UI (`updateHUD`, modales) vers `src/ui/`.
- Factoriser la gestion des particules et FX dans un module `src/game/effects.js`.
- Intégrer des tests unitaires (Jest ou Vitest) pour les helpers (difficulté, score, etc.).

---
## 🤝 Contribution

Les pull requests sont bienvenues : assets optimisés, nouvelles arènes, améliorations audio, documentation. Pour les changements majeurs (multi-balles, pipeline shaders…), ouvrir une issue pour discuter de l’architecture.

---
## 📜 Licence

- Code : **MIT** (voir le dépôt).
- Audio (`resources/`) : boucles libres de droits (Pixabay CC0) — remplacer au besoin.
- Modèles / textures : sources Three.js et banques libres ; vérifier leur licence si redistribution.

Bon jeu !
