# Reprendre le projet Mozaik dans Claude Code sur le Mac

## 1. À taper dans le Terminal du Mac (une seule fois)

Prérequis : Xcode (App Store) ouvert au moins une fois, et Node.js LTS (nodejs.org).

```bash
xcode-select --install 2>/dev/null; sudo xcodebuild -license accept
npm install -g @anthropic-ai/claude-code
git clone https://github.com/lejdebruxelles-boop/app.git ~/Developer/mozaik
cd ~/Developer/mozaik
git checkout claude/multi-platform-download-app-rtbtez
npm install
claude
```

## 2. Message à coller dans Claude Code

```text
Contexte : tu reprends le projet Mozaik, commencé dans une session cloud. Je suis sur mon Mac (MacBook Air),
avec Xcode et un compte Apple Developer. Réponds-moi en français, simplement, étape par étape.

Le projet
- Jeu de puzzle de couleurs quotidien « Mozaik » : TypeScript + Vite ; iOS via Capacitor 8 (dossier ios/),
  Windows/Mac via Electron, web sur Netlify.
- Dépôt : github.com/lejdebruxelles-boop/app (compte GitHub lejdebruxelles-boop),
  branche claude/multi-platform-download-app-rtbtez. Travaille et pousse sur cette branche.
- Bundle ID iOS : com.antonis.mozaik
- Site en ligne : https://mozaik-puzzle.netlify.app (projet Netlify « mozaik-puzzle », compte Netlify
  julien.antonis@gmail.com, connexion Google). Déployé à la main par glisser-déposer : il n'est PAS relié à GitHub.
- Monétisation : abonnement Mozaik+ via RevenueCat et pubs AdMob (src/monetization.ts, réglages dans src/config.ts).
- À lire d'abord : README.md, docs/MONETISATION.md, docs/STRATEGIE.md, docs/AUDIT_SECURITE.md.
- État : 22 tests OK (npm test), build OK (npm run build), audit de sécurité fait et corrigé.

Ce que je veux maintenant, dans l'ordre
1. Vérifie l'environnement (node, npm, xcodebuild, simulateurs) et lance npm test et npm run build.
2. Lance l'app sur le simulateur iPhone (npm run ios:sync, puis compilation et lancement avec xcodebuild et
   xcrun simctl) et fais la check-list iPhone qui est en bas de docs/AUDIT_SECURITE.md.
3. Guide-moi pour lancer l'app sur mon vrai iPhone (signature automatique dans Xcode avec mon équipe).
4. Ajoute la traduction française du message de suivi Apple (NSUserTrackingUsageDescription) via
   InfoPlist.strings dans le projet Xcode.
5. Relie le site Netlify au dépôt GitHub (Netlify CLI : npx netlify login, puis npx netlify link
   et la configuration du déploiement continu), ou explique-moi les clics si c'est plus simple.
6. Quand je t'envoie ma clé publique RevenueCat (appl_…) et mes identifiants AdMob, mets-les dans src/config.ts et
   ios/App/App/Info.plist, passe admob.testing à false, puis recompile.
7. Prépare l'archive App Store (Product > Archive) et la fiche App Store (textes dans docs/STRATEGIE.md).

Règles
- Demande-moi avant toute action irréversible ou publique (publication, suppression, envoi vers l'App Store).
- Ne me demande jamais de mot de passe, et ne mets jamais de clé secrète dans le code
  (pas de clé RevenueCat sk_…, pas de fichier .p8). Seules les clés publiques vont dans l'app.
- Les contrats, la banque, les impôts et les connexions à mes comptes, c'est moi qui les fais : guide-moi.
- Après chaque modification : npm test et npm run build, puis commit et push sur la branche.
```

## 3. Ce que vous seul pouvez faire (Claude vous guidera)

- Xcode → Réglages → Comptes : ajouter votre identifiant Apple Developer.
- App Store Connect : signer le contrat « Apps payantes », renseigner la banque et les impôts, créer l'app et les produits Mozaik+.
- Créer les comptes RevenueCat et AdMob, puis donner à Claude la clé **publique** `appl_…` et les identifiants AdMob.
- Activer la double authentification sur GitHub, Netlify, Google et Apple.
- Rendre le dépôt GitHub privé (App → Settings → General → Change visibility).
