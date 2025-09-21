# Breaker 3D Arcade

Breaker 3D Arcade est une revisite moderne du casse-brique réalisée avec [Three.js](https://threejs.org/). Le projet tient dans un seul `index.html` et met en scène un gameplay arcade, plusieurs univers thématiques, des modèles 3D distants et des mécaniques de gamification (combos, quêtes, succès).

## Fonctionnalités principales

- **Gameplay casse-brique en 3D** avec raquette cylindrique, bille dynamique et trajectoire influencée par la position d’impact.
- **Plusieurs scènes thématiques** qui s’enchaînent à mesure que les niveaux défilent : changement d’éclairage, de brouillard, de sol et chargement d’un modèle glTF externe (casque futuriste, flamant rose, robot expressif, etc.).
- **Moteur de niveaux variés** (motifs classiques, en vagues, pyramide) générant automatiquement les briques et augmentant la difficulté.
- **Gamification** : système de score combo, meilleures performances enregistrées en `localStorage`, quêtes dynamiques avec récompenses, power-ups (agrandissement, vie, bonus de score) et réalisations.
- **Ambiance sonore complète** avec effets contextuels, bande-son par scène, contrôle de volume et fondu enchaîné lors des transitions.
- **Animations glTF** pilotées par `THREE.AnimationMixer` (ex. robot orbital qui alterne plusieurs clips d’animation).

## Lancer le jeu

1. Clone ou télécharge ce dépôt.
2. Ouvre `index.html` dans un navigateur moderne (Chrome, Edge, Firefox). Pas besoin de serveur.
3. Vérifie que le navigateur peut accéder à Internet pour récupérer les modèles glTF et les musiques distants.
4. Clique sur **Démarrer** pour lancer la partie.

> 💡 Si le jeu reste figé, ouvre la console (F12) et vérifie qu’aucun bloqueur n’empêche le chargement des ressources distantes.

## Contrôles

- **Flèches gauche/droite** : déplacer la raquette.
- **Souris** : déplacer la raquette horizontalement.
- **Espace** : mettre en pause / reprendre.
- **Boutons HUD** : démarrer, mettre en pause, activer/désactiver l’audio, régler le volume.

## Structure du projet

```
threejs-simple-3d-game/
├─ index.html   # Jeu complet (scène Three.js + logique + UI)
└─ README.md    # Ce guide
```

Tout le code est regroupé dans `index.html` pour faciliter le déploiement statique (GitHub Pages, Netlify, Vercel, etc.).

## Ressources externes

- **Three.js 0.119.1** et **GLTFLoader** via jsDelivr.
- Modèles glTF (DamagedHelmet, Flamingo, Robot Expressive) depuis les exemples officiels de Three.js.
- Effets sonores et musiques téléchargés depuis [Pixabay](https://pixabay.com/).

Crédite les auteurs si tu publies le jeu, et veille à respecter la licence des assets.

## Idées d’amélioration

- Ajouter un système de particules et des shaders personnalisés pour les explosions de briques.
- Intégrer un mode multijoueur local ou un classement en ligne.
- Gérer la physique avec Cannon.js ou Ammo.js pour des collisions plus réalistes.
- Exporter la logique de jeu dans des modules ES pour faciliter les tests unitaires et la maintenance.

Bon jeu !
