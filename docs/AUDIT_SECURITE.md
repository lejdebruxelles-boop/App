# Audit de sécurité de Mozaik

Date : 9 novembre 2026. Périmètre : tout le code du dépôt (jeu, sauvegarde, paiements, publicités, app bureau,
site web, intégration continue).

## Résumé

| Domaine | Résultat |
|---|---|
| Dépendances livrées aux joueurs | ✅ 0 vulnérabilité (`npm audit --omit=dev`) |
| Dépendances de compilation | ⚠️ 6 alertes « modérées » dans `electron-builder` (voir plus bas) : elles ne sont pas livrées aux joueurs |
| Injection de code (XSS) | ✅ Aucune donnée externe n'est insérée dans la page ; la sauvegarde est validée champ par champ |
| Politique de sécurité du contenu (CSP) | ✅ Seuls les fichiers de l'app peuvent s'exécuter, sur le web, sur iPhone et sur PC |
| En-têtes du site web | ✅ HSTS, anti-iframe, nosniff, Permissions-Policy, isolation d'origine |
| App bureau (Electron) | ✅ Durcie selon la liste de contrôle officielle d'Electron |
| Paiements | ✅ Vérifiés côté Apple et RevenueCat, jamais dans l'app |
| Données personnelles | ✅ Aucun serveur, aucun compte ; consentement RGPD et ATT avant toute pub ciblée |
| Secrets dans le code | ✅ Aucun (la clé RevenueCat `appl_…` est une clé **publique**, prévue pour être dans l'app) |

Résultat des tests : **11 tests sur 11 réussis** (`npm test`), relancés automatiquement à chaque push par GitHub Actions.

## Détail, fonction par fonction

### `src/game.ts` : moteur du jeu
- `tap`, `affected`, `isSolved` : fonctions pures, sans accès extérieur. Les indices sont toujours compris dans la grille.
- `solve` (élimination de Gauss sur GF(3)) : l'énumération est plafonnée à 3⁷ combinaisons, ce qui empêche tout blocage
  du téléphone. Le temps mesuré pour toutes les grilles est inférieur à 30 ms.
- `generate` : au plus 300 tentatives, avec repli garanti. Une grille est toujours produite.
- Tests : chaque solution trouvée résout bien la grille, l'objectif affiché est optimal, les défis du jour sont
  identiques pour tout le monde et les niveaux 1 à 60 se résolvent avec les indices.

### `src/storage.ts` : sauvegarde
- **Risque traité** : une sauvegarde corrompue ou modifiée à la main pouvait faire planter l'app (langue inconnue)
  ou injecter du HTML.
- **Correction** : `sanitize()` valide chaque champ (types, bornes, format des dates `AAAA-MM-JJ`, langues
  autorisées, thème en lettres minuscules seulement) et ignore les clés piégées comme `__proto__`.
- **Limite connue** : sur la **version web**, quelqu'un peut se donner Mozaik+ en modifiant son stockage local.
  C'est sans conséquence : le web est une démo gratuite où rien ne s'achète. **Sur iPhone**, le statut Mozaik+ est
  toujours revérifié auprès de RevenueCat au lancement, donc la valeur locale n'est qu'un cache.
- Tests : entrées invalides, balises `<img onerror>` et `<script>`, `__proto__`, premium donné en texte au lieu
  d'un booléen, séries qui traversent un changement de mois.

### `src/main.ts` : interface
- Tout le HTML est construit à partir de textes de traduction fixes, de nombres et de dates validées. Aucun texte
  saisi par un utilisateur n'existe.
- Les thèmes passent par `Object.hasOwn`, ce qui bloque les noms piégés comme `constructor`.
- Un test vérifie qu'aucune traduction ne contient `<` ou `>`.

### `src/monetization.ts` : paiements et pubs
- Les achats passent par StoreKit (Apple) et sont validés par RevenueCat côté serveur. L'app ne fait que lire le
  droit d'accès `premium`.
- Les annulations d'achat ne sont pas traitées comme des erreurs, et les autres erreurs ne débloquent rien.
- Le consentement RGPD (Google UMP) est demandé, puis l'autorisation de suivi Apple (ATT), **avant** de charger des
  pubs. Un bouton « Options de confidentialité » permet de changer d'avis.
- Les pubs de test sont activées par défaut, pour éviter de cliquer sur de vraies pubs pendant le développement.

### `electron/main.cjs` : app Windows et Mac
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true` et pas de `<webview>`.
- La fenêtre ne peut jamais quitter le jeu : toute navigation est bloquée et seuls les liens `https:` s'ouvrent,
  dans le navigateur du système.
- Toutes les permissions (caméra, micro, position, notifications…) sont refusées.

### Site web (`netlify.toml`)
- **CSP** : `default-src 'self'`, pas de script externe ni inline, pas de `eval`, `frame-ancestors 'none'`,
  `form-action 'none'`, `object-src 'none'`.
- **HSTS** sur 2 ans, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` restrictive,
  `Cross-Origin-Opener-Policy` et `Cross-Origin-Resource-Policy`.
- Le site est statique (pas de serveur, de base de données ni de formulaire), donc la surface d'attaque est quasi nulle.
- **Vérifié** : le jeu complet et la page de confidentialité tournent avec ces en-têtes sans aucune violation de la CSP
  (test automatisé dans un vrai navigateur).
- **Style inline** : `style-src` autorise `'unsafe-inline'`, car l'app utilise des attributs `style` (taille de la grille).
  Le risque est faible, puisque les scripts restent interdits.

### Intégration continue (GitHub Actions)
- Les workflows ont des permissions minimales (`contents: read`).
- À chaque push, GitHub lance les tests, la compilation et `npm audit` sur les dépendances livrées.

## Point ouvert

- **`electron-builder` (outil de compilation)** : 6 alertes modérées via `minimatch` (lenteur possible face à des
  motifs de fichiers piégés). Elles ne concernent que la machine qui compile, avec nos propres fichiers, et ne sont pas
  livrées aux joueurs. La seule « correction » proposée par npm est un retour à une version de 2023, plus ancienne.
  Il faut plutôt mettre à jour `electron-builder` dès qu'une version corrigée sort.

## À faire de votre côté pour rester sûr

1. Activez la **double authentification** sur Apple, Google (AdMob), RevenueCat, Netlify, GitHub et Microsoft.
2. Ne partagez jamais la **clé secrète** RevenueCat (`sk_…`) ni la clé *In-App Purchase* Apple (`.p8`). Seule la clé
   publique `appl_…` va dans l'app.
3. Ne cliquez jamais sur vos propres vraies pubs.
4. Relancez `npm audit` et `npm test` avant chaque nouvelle version. GitHub le fait déjà à chaque push.
