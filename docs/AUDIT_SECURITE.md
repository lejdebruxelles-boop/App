# Audit de sécurité et de fonctionnement de Mozaik (méthode finecomb)

## Conclusion et périmètre

- **Cible** : le dépôt `lejdebruxelles-boop/app`, branche `claude/multi-platform-download-app-rtbtez`.
  L'audit porte sur le commit `5178555`, et les corrections sont dans le commit qui ajoute ce rapport.
- **Date** : 9 novembre 2026.
- **Exclus (code tiers et généré)** : `node_modules/`, `dist/` et `ios/App/App/public/` (copie du build). Ils ont tout
  de même été lus pour suivre les appels, notamment le code natif iOS des plugins AdMob et RevenueCat.
- **Mode** : audit exhaustif, sécurité et qualité, avec correction des problèmes trouvés (autorisée par le propriétaire).
- **Résultat** : **9 problèmes confirmés** (0 critique, 0 élevé, 3 moyens, 6 faibles) ; **9 corrigés**.
  3 points restent ouverts : ce sont des choix de conception ou des décisions qui vous reviennent (voir plus bas).

### Vérifications sautées (et ce qu'il faudrait pour les faire)

| Vérification | Raison | Ce qu'il faudrait |
|---|---|---|
| Lancer l'app iPhone (achats sandbox, vraies pubs, formulaire RGPD, politique de sécurité CSP dans la WebView iOS) | Pas de Mac ni de Xcode dans l'environnement cloud | Lancer l'app sur votre iPhone depuis Xcode ; la check-list est en bas de ce rapport |
| Lancer l'app bureau Electron | Le binaire Electron n'est pas téléchargé dans l'environnement ; je ne l'ai pas installé sans votre accord | `npm run desktop` sur votre PC ou votre Mac |
| En-têtes HTTP du site en ligne | Le site n'est pas encore déployé (envoi bloqué par le contrôle de sécurité de la session) | Lier le dépôt dans Netlify, puis vérifier sur securityheaders.com |
| Tests de sécurité actifs (scan, fuzzing) contre des services en ligne | Non autorisés et inutiles : aucun serveur à nous | — |

## Problèmes trouvés

### F1 · Moyen · Des publicités pouvaient être chargées sans consentement RGPD valide — **Corrigé**
- **Où** : `src/monetization.ts`, fonction `initAds`.
- **Cause** : le SDK de pub démarrait **avant** la collecte du consentement. Si la demande de consentement échouait
  (téléphone hors ligne, erreur Google), l'erreur était ignorée et les pubs étaient quand même chargées. La valeur
  `canRequestAds` n'était jamais lue.
- **Preuve** : lecture du code, confirmée par le code natif du plugin
  (`ConsentInformation.requestConsentInfoUpdate` renvoie `canRequestAds`).
- **Impact** : des requêtes publicitaires envoyées depuis l'Europe sans base légale, avec un risque de non-conformité
  RGPD et de suspension du compte AdMob par Google.
- **Correction** : l'ordre est maintenant consentement → ATT (Apple) → démarrage du SDK. Si `canRequestAds` est faux
  ou si la demande échoue, aucune pub n'est chargée. Trois tests le vérifient.

### F2 · Moyen · La page d'abonnement ne respectait pas les règles d'Apple (règle 3.1.2) — **Corrigé**
- **Où** : `src/main.ts` (`showPaywall`) et `src/monetization.ts` (`getOffers`).
- **Cause** : la page ne disait pas que l'abonnement **se renouvelle automatiquement**, ni comment le résilier. La durée
  d'essai s'affichait aussi en anglais brut au milieu du français (« 7 day gratuits »).
- **Impact** : risque élevé de **refus à la revue App Store**, et mention légale obligatoire absente en Europe pour les
  abonnements.
- **Correction** : un texte de renouvellement automatique et de résiliation s'affiche sous le bouton pour les offres
  annuelle et mensuelle, dans les 6 langues. La durée d'essai est traduite automatiquement par le système (« 7 jours »,
  « 1 semaine », « 7 Tage »). Le prix venant du Store est échappé avant d'être inséré dans la page.

### F3 · Moyen · La vidéo récompensée ne se terminait jamais si on la fermait avant la fin — **Corrigé**
- **Où** : `src/monetization.ts`, fonction `showRewarded`.
- **Cause** : le plugin natif ne répond **que** si la récompense est gagnée
  (`AdRewardExecutor.swift`, `userDidEarnRewardHandler`). Si le joueur fermait la vidéo avant la fin, ou si elle ne
  s'affichait pas, l'attente ne finissait jamais : la pub suivante n'était pas préchargée, et un double appui
  pouvait lancer deux vidéos en même temps.
- **Correction** : l'app écoute aussi les événements « fermée » et « échec d'affichage », et une seule vidéo à la fois
  est autorisée. Trois tests le vérifient.

### F4 · Faible · Annuler un achat affichait « Achat impossible, réessayez » — **Corrigé**
- **Cause** : l'erreur native arrive sous la forme `{ code: "1", data: { userCancelled: true } }`, mais le code lisait
  `e.userCancelled`, qui n'existe pas (forme vérifiée dans `PluginHelperExtensions.swift`).
- **Correction** : l'app lit `code` et `data.userCancelled`. Testé.

### F5 · Faible · Partager affichait « Copié » même quand la copie avait échoué — **Corrigé**
- **Où** : `src/platform.ts`, fonction `shareText`.
- **Correction** : la fonction renvoie maintenant `shared`, `copied` ou `failed`, et le message affiché correspond à ce
  qui s'est vraiment passé. Vérifié dans un vrai navigateur : le texte est bien dans le presse-papiers.

### F6 · Faible · « Restaurer mes achats » disait « Aucun achat trouvé » quand la boutique était indisponible — **Corrigé**
- **Correction** : l'app affiche « Boutique indisponible ». Avant, un abonné pouvait croire qu'il avait perdu son achat.

### F7 · Faible · App bureau : options internes d'Electron (« fuses ») laissées ouvertes — **Corrigé**
- **Où** : `package.json` → `build`.
- **Cause** : par défaut, l'exécutable Electron peut être relancé comme un simple Node.js (`RunAsNode`) ou recevoir un
  débogueur. Un programme malveillant déjà présent sur le PC peut alors exécuter son code sous l'identité de Mozaik.
- **Correction** : `electronFuses` désactive RunAsNode, `NODE_OPTIONS` et `--inspect`, active la vérification
  d'intégrité de l'archive et le chiffrement des cookies, et impose le chargement depuis l'archive.
- **À vérifier** : relancer `npm run dist:win` / `dist:mac`, puis ouvrir l'app.

### F8 · Faible · Actions GitHub référencées par une étiquette modifiable — **Corrigé**
- **Où** : `.github/workflows/*.yml`.
- **Correction** : chaque action est figée sur un identifiant de commit exact (`checkout` v4.4.0, `setup-node` v4.4.0,
  `upload-artifact` v4.6.2). Les workflows ont déjà des permissions minimales (`contents: read`) et aucun secret.

### F9 · Faible · Sauvegarde : un fichier modifié à la main pouvait faire planter l'app — **Corrigé (avant cet audit)**
- `sanitize()` valide chaque champ, et `Object.hasOwn` bloque les noms de thème piégés. Sept tests de sécurité couvrent ces cas.

## Points ouverts (décisions, pas des défauts de code)

| Point | Évaluation | Recommandation |
|---|---|---|
| Changer l'heure du téléphone donne plus d'indices gratuits et peut fausser la série | Inhérent à un jeu 100 % hors ligne ; le gain est minime (1 indice) | Accepté. Pour l'empêcher, il faudrait un serveur d'horloge, ce qui coûte plus que ça ne rapporte |
| Version web : Mozaik+ peut être activé en modifiant le stockage du navigateur | Sans conséquence : rien ne s'achète sur le web, qui n'est qu'une démo. Sur iPhone, le statut est revérifié auprès du Store à chaque lancement (testé) | Accepté |
| Votre adresse Gmail personnelle est publiée dans `public/privacy.html` | Elle est exigée comme contact, mais elle sera visible par tous et risque de recevoir du spam | Créez une adresse dédiée (par ex. `mozaik.app@…`) et remplacez-la |
| Le message de demande de suivi Apple (ATT) n'existe qu'en anglais | Moins de joueurs acceptent, donc des pubs moins bien payées | Dans Xcode : *Localizations* → ajouter le français, puis un fichier `InfoPlist.strings` |
| Outil de compilation `electron-builder` : 6 alertes moyennes (`minimatch`) | Outil utilisé seulement sur la machine qui compile, avec nos propres fichiers ; rien n'est livré aux joueurs | Mettre à jour dès qu'une version corrigée sort |

## Couverture

| Élément | Statut |
|---|---|
| Moteur de jeu `game.ts` (tap, solveur GF(3), générateur, défi du jour) | Vérifié, aucun problème : bornes de calcul plafonnées, solveur optimal vérifié par les tests |
| Sauvegarde `storage.ts` | Vérifié, problème trouvé (F9, corrigé) |
| Interface `main.ts` (insertion HTML, paywall, archives, thèmes, partage) | Vérifié, problèmes trouvés (F2, F5, F6, corrigés) |
| Monétisation `monetization.ts` (RevenueCat, AdMob, avis) | Vérifié, problèmes trouvés (F1, F3, F4, corrigés) |
| App bureau `electron/main.cjs` et packaging | Vérifié statiquement, problème trouvé (F7, corrigé) ; exécution non vérifiée (voir plus haut) |
| Projet iOS (`Info.plist`, `capacitor.config.ts`) | Vérifié statiquement : ATS par défaut (HTTPS imposé), aucun schéma d'URL personnalisé exposé, chiffrement déclaré ; exécution non vérifiée |
| Site web (`netlify.toml`, `public/`) | Vérifié : en-têtes stricts, jeu complet testé sans violation de la politique de sécurité |
| Intégration continue | Vérifié, problème trouvé (F8, corrigé) |
| Dépendances livrées | Vérifié : 0 vulnérabilité |
| Facettes de causes racines (validation, représentation, états, cohérence, ressources, processus) | Posées à chaque objet. Non applicables : mémoire et analyse binaire (pas de code natif écrit par nous, JavaScript uniquement) |
| Spécialités retenues | 4.35 apps clientes, 4.49 apps mobiles, 4.39 paiements, 4.33 CI, 30 vie privée, 36 chaîne d'approvisionnement, table JavaScript/TypeScript |
| Non applicables | Serveurs, bases de données, authentification, multi-utilisateur, blockchain, etc. : l'app n'a ni serveur ni compte utilisateur |

## Vérifications exécutées

| Commande | Résultat |
|---|---|
| `npm test` (vitest 5.1.0) | **22/22 réussis** : moteur 5, sauvegarde et traductions 6, pubs et paiements 11 (plugins iOS simulés) |
| `npm run build` (TypeScript strict + Vite 8.3.6) | Réussi ; la politique de sécurité CSP est injectée dans `dist/index.html` |
| Navigateur Chromium (Playwright) avec les en-têtes de production | Jeu complet et page de confidentialité : **0 violation CSP, 0 erreur** ; partage → texte bien copié |
| `npm audit --omit=dev` | 0 vulnérabilité |
| `git ls-remote` sur les actions GitHub | Identifiants de commit des versions figées |

## Check-list à faire sur votre iPhone (ce que je n'ai pas pu exécuter)

1. L'app démarre sans écran blanc, ce qui confirme que la politique de sécurité ne bloque rien dans la WebView iOS.
2. En Europe, le formulaire de consentement apparaît avant la demande de suivi Apple, puis une pub de test s'affiche
   au niveau 6.
3. Fermez la vidéo récompensée avant la fin : vous ne devez pas recevoir d'indice, et l'app doit continuer à répondre.
4. Faites un achat en sandbox, annulez-le, puis faites-en un autre : l'annulation n'affiche pas d'erreur, l'achat active
   Mozaik+, et « Restaurer » fonctionne.
