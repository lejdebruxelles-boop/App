# Mozaik — un puzzle de couleurs par jour

**Mozaik** est un jeu de réflexion quotidien : touchez une case, elle et ses 4 voisines changent de couleur
(rouge → jaune → bleu). Le but est de rendre toute la grille d'une seule couleur, en un minimum de coups.

- **Défi du jour** : le même puzzle pour tout le monde, chaque jour, avec une difficulté qui monte du lundi au dimanche.
- **Niveaux** : une progression infinie, du 3×3 au 6×6.
- **Partage** : un résultat en emojis 🟥🟨🟦 à poster partout. C'est le moteur de croissance du jeu.
- **Série 🔥, étoiles, statistiques, 3 indices par jour**
- 6 langues (FR, EN, ES, DE, PT, IT), mode daltonien, vibrations, jouable hors-ligne.
- **Monétisation** : abonnement **Mozaik+** (sans pub, indices illimités, archives, thèmes) via RevenueCat, et pubs AdMob
  (vidéo récompensée et interstitielle dosée) pour les joueurs gratuits.

- Pourquoi cette idée, et comment obtenir des téléchargements : **[docs/STRATEGIE.md](docs/STRATEGIE.md)**
- Comment gagner de l'argent et ce qu'il faut configurer : **[docs/MONETISATION.md](docs/MONETISATION.md)**

> ⚠️ Avant de publier, remplissez `src/config.ts` (clé RevenueCat, IDs AdMob) et l'ID AdMob dans
> `ios/App/App/Info.plist`. Tant que ce n'est pas fait, l'app tourne avec des pubs de test et sans achats.

## Une seule base de code, toutes vos plateformes

| Plateforme | Technologie | Où publier |
|---|---|---|
| iPhone / iPad | Capacitor (dossier `ios/`) | App Store |
| Windows | Electron (`.exe` et `.appx`) | Microsoft Store, ou site web |
| Mac | Electron (`.dmg`) | Site web (ou Mac App Store plus tard) |
| Web | Vite (PWA) | N'importe quel hébergeur (Netlify, Vercel…) |

Le jeu lui-même est en TypeScript (`src/`). Le solveur (`src/game.ts`) calcule le nombre de coups **optimal**
de chaque grille par algèbre linéaire sur GF(3) : l'« objectif » affiché est donc toujours atteignable et
les indices sont toujours justes.

## Démarrer (Windows ou Mac)

Installez [Node.js 22](https://nodejs.org), puis :

```bash
npm install
npm run dev        # jeu dans le navigateur : http://localhost:5173
npm test           # tests du moteur de jeu
npm run desktop    # version bureau (Electron)
```

## Publier sur l'App Store (sur votre Mac)

Prérequis : Xcode (Mac App Store) et votre compte Apple Developer.

1. Sur [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list), créez un identifiant
   d'app (*Identifiers → +*) : `com.antonis.mozaik`. Si vous en choisissez un autre, changez-le aussi dans
   `capacitor.config.ts` et dans Xcode.
2. Sur [App Store Connect](https://appstoreconnect.apple.com), *Mes apps → + → Nouvelle app* : nom « Mozaik »
   (ou une variante si le nom est pris, par ex. « Mozaik – Puzzle couleurs »), SKU `mozaik`, catégorie Jeux › Puzzle.
3. Dans le terminal du Mac :
   ```bash
   npm install
   npm run ios:sync   # compile le jeu et le copie dans le projet iOS
   npm run ios:open   # ouvre Xcode
   ```
4. Dans Xcode : cible **App** → *Signing & Capabilities* → cochez *Automatically manage signing* et
   choisissez votre équipe.
5. Testez sur votre iPhone : branchez-le et cliquez ▶︎.
6. Pour publier : *Product → Archive*, puis *Distribute App → App Store Connect*. Ajoutez le build dans
   App Store Connect, remplissez la fiche (textes prêts dans `docs/STRATEGIE.md`) et soumettez à la revue.

Les icônes et l'écran de lancement sont déjà générés. Pour les refaire après avoir modifié `resources/icon.png` :
`npm run assets`.

## Publier sur Windows et Mac (bureau)

- **Automatique** : poussez un tag (`git tag v1.0.0 && git push origin v1.0.0`). Le workflow GitHub *Desktop builds*
  produit l'installateur Windows `.exe`, le paquet `.appx` du Microsoft Store et le `.dmg` macOS, à télécharger depuis
  l'onglet *Actions*.
- **À la main** : `npm run dist:win` sur le PC, `npm run dist:mac` sur le Mac (fichiers dans `release/`).
- **Microsoft Store** : créez un compte sur [Partner Center](https://partner.microsoft.com/dashboard), réservez le nom
  « Mozaik », puis reportez l'*Identity Name* et le *Publisher* fournis dans la section `appx` de `package.json`.
  Téléversez ensuite le `.appx`.
- Le `.dmg` n'est pas signé. Pour le distribuer sans avertissement de sécurité, il faut un certificat
  *Developer ID* (inclus dans votre compte Apple) et une notarisation.

## Structure

```
src/game.ts       moteur : règles, générateur, solveur optimal, défi du jour
src/main.ts       interface (écrans, modales, partage)
src/i18n.ts       traductions
src/storage.ts    sauvegarde locale, séries, statistiques
src/platform.ts   vibrations et partage natifs (iOS), repli web
src/config.ts     ⚠️ clés et réglages de monétisation à remplir
src/monetization.ts  achats (RevenueCat), pubs (AdMob), demande de note
public/privacy.html  politique de confidentialité (obligatoire pour Apple)
ios/              projet Xcode (Capacitor)
electron/         application bureau
tests/            tests du moteur
docs/             stratégie et fiche App Store
```
