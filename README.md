# Breaker 3D Arcade

Breaker 3D Arcade est un casse-brique moderne en 3D réalisé avec [Three.js](https://threejs.org/), intégrant des modèles glTF distants, des power-ups, un système de score, des réalisations et plusieurs états de jeu (menu, partie, pause, game over).

## Fonctionnalités

- **Gameplay 3D** : raquette cylindrique, balle dynamique, briques générées automatiquement selon le niveau.
- **HUD interactif** : affichage du score, des vies, du niveau et des réalisations.
- **Modèles 3D décoratifs** : chargement d’un modèle glTF distant (exemple : Duck) animé dans la scène.
- **Power-ups** : objets bonus apparaissant aléatoirement (agrandissement de la raquette, vie supplémentaire).
- **Plusieurs états de jeu** : menu d’accueil, partie en cours, pause, game over.
- **Gamification** : système de réalisations débloquées selon la progression (score, niveau).
- **Contrôles améliorés** : clavier (flèches, espace), souris (déplacement horizontal), boutons HUD (démarrer, pause).
- **Responsive** : adaptation automatique à la taille de la fenêtre.

## Lancer le jeu

1. Télécharge ou clone ce dépôt.
2. Ouvre `index.html` dans un navigateur moderne (Chrome, Edge, Firefox).
3. Clique sur **Démarrer** pour jouer.

> ⚠️ Le jeu nécessite une connexion Internet pour charger le modèle 3D décoratif.

## Contrôles

- **Flèches gauche/droite** : déplacer la raquette.
- **Souris** : déplacer la raquette horizontalement.
- **Espace** : pause / reprise.
- **Boutons HUD** : démarrer, pause.

## Structure

```
threejs-simple-3d-game/
├─ index.html   # Jeu complet (Three.js + logique + UI)
└─ README.md    # Ce guide
```

Tout le code est dans `index.html` pour faciliter le déploiement statique.

## Ressources externes

- **Three.js 0.119.1** et **GLTFLoader** via jsDelivr.
- Modèle glTF Duck depuis les exemples officiels de Three.js.

## Améliorations possibles

- Ajouter des effets sonores et musiques.
- Intégrer des modèles 3D variés selon le niveau.
- Ajouter des particules et des shaders personnalisés.
- Gérer la physique avec Cannon.js ou Ammo.js.

Bon jeu !


