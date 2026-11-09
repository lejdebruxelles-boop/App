# Monétisation de Mozaik

L'objectif est de gagner de l'argent sur **tous** les joueurs :

| Joueur | Ce qui rapporte | Où |
|---|---|---|
| Ne paie jamais (≈ 97 %) | Pubs AdMob : vidéo récompensée (indice) + interstitielle entre les niveaux | iPhone |
| Paie (≈ 1 à 3 %) | **Mozaik+** : abonnement annuel, mensuel ou achat à vie | iPhone |
| Joueur sur PC | Application **payante** sur le Microsoft Store (tout est débloqué) | Windows |
| Visiteur web | Démo limitée à 10 niveaux, qui renvoie vers l'App Store | Web |

## Ce que contient Mozaik+

- Aucune publicité
- Indices illimités (la version gratuite en a 1 par jour, plus 1 par vidéo regardée)
- Archives : les 90 derniers défis du jour
- 5 thèmes de couleurs exclusifs

## Comment les pubs sont dosées

Ces réglages sont dans `src/config.ts` :

- Aucune publicité avant le niveau 6, pour ne pas faire fuir les nouveaux joueurs.
- Une interstitielle au plus tous les 3 niveaux, et jamais à moins de 90 secondes de la précédente.
- Aucune publicité pendant le défi du jour : c'est ce qui fait revenir les joueurs, donc on n'y touche pas.
- À partir du niveau 10, une fois par jour, l'offre Mozaik+ remplace la pub entre deux niveaux.
- Une demande de note App Store est faite une seule fois, après un score « Parfait ».

## Prix conseillés

À régler dans App Store Connect. L'app affiche automatiquement les prix de la boutique, dans la devise du joueur.

| Produit | Type | Prix | ID produit |
|---|---|---|---|
| Mozaik+ annuel | Abonnement auto-renouvelable, essai gratuit 7 jours | 19,99 € | `mozaik_plus_annual` |
| Mozaik+ mensuel | Abonnement auto-renouvelable | 3,99 € | `mozaik_plus_monthly` |
| Mozaik+ à vie | Achat intégré non consommable | 39,99 € | `mozaik_plus_lifetime` |
| Version Windows | Prix de l'app sur le Microsoft Store | 2,99 € | — |

L'offre annuelle est mise en avant (« Meilleure offre ») et l'essai gratuit est affiché automatiquement. C'est
en général cette combinaison qui convertit le mieux.

## Mise en place (une seule fois, environ 2 heures)

### 1. App Store Connect : contrats et produits
1. *Accords, taxes et banque* : signez le contrat **Apps payantes** et renseignez votre compte bancaire et vos
   informations fiscales. Sans cela, aucun achat ne fonctionne.
2. Dans votre app, *Abonnements* : créez un groupe « Mozaik+ » avec les abonnements annuel (offre de lancement :
   essai gratuit de 7 jours) et mensuel.
3. *Achats intégrés* : créez le non-consommable « Mozaik+ à vie ».
4. Ajoutez une capture d'écran du paywall à chaque produit : Apple l'exige pour la revue.

### 2. RevenueCat (gratuit jusqu'à 2 500 $ de revenus mensuels)
RevenueCat vérifie les achats et vous fournit un tableau de bord des revenus, sans serveur à gérer.
1. Créez un compte sur [revenuecat.com](https://www.revenuecat.com), puis un projet et une app iOS (Bundle ID
   `com.antonis.mozaik`). Ajoutez la clé *In-App Purchase* générée dans App Store Connect (*Utilisateurs et accès › Intégrations*).
2. *Products* : importez les 3 produits.
3. *Entitlements* : créez `premium` et attachez-y les 3 produits.
4. *Offerings* : dans l'offering `default`, ajoutez les paquets **Annual**, **Monthly** et **Lifetime**.
5. Copiez la clé publique Apple (`appl_…`) dans `src/config.ts` → `revenueCatIosKey`.

### 3. AdMob
1. Créez un compte sur [admob.google.com](https://admob.google.com), puis ajoutez l'app iOS.
2. Créez deux blocs d'annonces : **Interstitiel** et **Avec récompense**.
3. Dans `src/config.ts` : collez les deux IDs de blocs et passez `testing` à `false`.
4. Dans `ios/App/App/Info.plist` : remplacez `GADApplicationIdentifier` par l'**ID d'application** AdMob (`ca-app-pub-…~…`).
5. *Confidentialité et messages* : créez un message **RGPD** pour l'Europe. Il est obligatoire, car vous êtes en
   Belgique et vos joueurs européens doivent donner leur consentement. Le formulaire s'affiche ensuite
   automatiquement dans l'app.
6. Pour de meilleurs revenus, ajoutez dans `Info.plist` la liste complète des `SKAdNetworkItems` fournie par Google
   (une seule entrée est présente pour l'instant).
7. Créez un fichier `app-ads.txt` sur votre site web avec la ligne fournie par AdMob.

### 4. Site web (obligatoire pour Apple)
Apple exige une URL de politique de confidentialité. Elle est prête : `public/privacy.html`. Mettez le dossier
`dist/` en ligne (Netlify ou Vercel, gratuits), puis indiquez cette URL dans `src/config.ts` (`privacyUrl`) et dans App Store Connect.

### 5. Déclarations App Store Connect
- *Confidentialité de l'app* : **Identifiants** (identifiant publicitaire), **Données d'utilisation** (interactions
  avec le produit, publicité) et **Diagnostics**, utilisés pour la **publicité tierce** et le **suivi**. Vous ne
  pouvez plus déclarer « Aucune donnée collectée », à cause d'AdMob.
- *Âge* : 4+.
- *Utilise l'identifiant publicitaire* : oui.

### 6. Tester avant de publier
- Dans Xcode, testez les achats avec un compte **Sandbox** (App Store Connect › Utilisateurs › Testeurs Sandbox).
  Les achats sont gratuits et les abonnements se renouvellent en accéléré.
- Testez les pubs en laissant `testing: true` : ce sont des pubs Google de démonstration. **Ne cliquez jamais sur
  vos propres vraies pubs**, Google ferme les comptes pour ça.

### 7. Microsoft Store (version payante)
Dans Partner Center, réglez le *Prix* sur 2,99 € et ajoutez une période d'essai gratuite de 7 jours (option
proposée par le Store). Tout est déjà débloqué dans la version bureau.

## Combien ça peut rapporter ? (ordre de grandeur, pas une promesse)

Tout dépend du nombre de joueurs actifs, d'où l'importance du marketing décrit dans `STRATEGIE.md`.
Exemple avec **10 000 téléchargements par mois** :

- **Abonnements** : 1,5 % de conversion, soit 150 abonnés par mois. À environ 20 € par an, une fois retirée la
  commission Apple (15 % pour les développeurs qui gagnent moins d'un million par an), cela fait environ **2 500 € par an et par cohorte mensuelle**.
- **Publicités** : environ 3 000 joueurs actifs par jour × 2 pubs par jour × 8 € pour 1 000 pubs (France/Europe) ≈
  **50 € par jour, soit environ 1 500 € par mois**.

Les revenus s'additionnent mois après mois, car les abonnés restent. Il faut vérifier dans RevenueCat (conversion,
résiliations) et dans AdMob (eCPM) les vrais chiffres après 2 ou 3 semaines, puis ajuster les réglages de
`src/config.ts` en conséquence.
