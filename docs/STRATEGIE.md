# Stratégie : comment faire télécharger Mozaik

## Pourquoi un puzzle quotidien ?

1. **Croissance gratuite par le partage.** Les jeux du jour (le modèle popularisé par Wordle) se sont répandus
   presque uniquement grâce au résultat partagé en emojis. Chaque partie terminée produit une petite image
   colorée 🟥🟨🟦 suivie du lien de l'app : chaque joueur fait de la publicité.
2. **Rétention.** Un puzzle par jour, une série 🔥 à ne pas casser et un compte à rebours ramènent le joueur
   chaque jour. Or l'algorithme de l'App Store favorise les apps qui gardent leurs utilisateurs.
3. **Universel.** Il n'y a pas de texte à lire pour jouer : ça marche dans tous les pays. Les 6 langues ouvrent
   6 marchés dès le premier jour.
4. **Coût nul.** Pas de serveur, pas de compte et pas de données personnelles, donc une revue Apple simple
   et une étiquette de confidentialité « Aucune donnée collectée ».
5. **Une base de code pour iPhone, Windows, Mac et le web.**

## Lancement : plan d'action

**Semaine 1 : publication**
- App Store (prioritaire), puis Microsoft Store (peu de concurrence sur les puzzles, et une bonne mise en avant).
- Mettez la version web en ligne gratuitement (Netlify ou Vercel, `npm run build` puis dossier `dist/`). Elle sert de
  démo et de lien de partage pour ceux qui n'ont pas l'app.
- Remplacez `STORE_URL` dans `src/platform.ts` par le vrai lien App Store, puis republiez.

**Semaines 2 à 4 : faire connaître le jeu**
- Reddit : r/iosgaming, r/puzzles, r/WebGames, r/AppHookup (le jour de la sortie), r/SideProject.
- Product Hunt, Hacker News (« Show HN », en mettant en avant le solveur optimal sur GF(3)).
- TikTok / Reels / Shorts : vidéos de 10 secondes d'une grille résolue en accéléré, avec la question
  « Tu fais mieux que 12 coups ? ». C'est ce format qui génère le plus de téléchargements pour les puzzles.
- Demandez un avis dans l'app après une victoire « Parfait » (à ajouter avec le plugin
  `@capacitor-community/in-app-review`).

**Ensuite : revenus**
- Version gratuite + achat unique « Mozaik+ » (2,99 €) : indices illimités, thèmes de couleurs, archive des défis passés.
- Ou publicités récompensées, uniquement pour obtenir un indice supplémentaire. Ne jamais interrompre une partie.

## Fiche App Store (à copier dans App Store Connect)

**Nom** : Mozaik – Puzzle de couleurs
**Sous-titre** (30 car.) : Un casse-tête par jour
**Mots-clés** (100 car.) : `puzzle,casse-tête,logique,couleur,jeu du jour,cerveau,réflexion,grille,défi,quotidien,zen`

**Description**
> Un puzzle. Trois couleurs. Un seul objectif : rendre toute la grille d'une même couleur.
>
> Touchez une case : elle et ses quatre voisines changent de couleur. Simple ? Chaque jour, un nouveau défi,
> le même pour tout le monde, de plus en plus corsé du lundi au dimanche. Saurez-vous trouver la solution
> parfaite ?
>
> • Un nouveau défi chaque jour
> • Des centaines de niveaux, du 3×3 au 6×6
> • Partagez votre score en emojis et défiez vos amis
> • Séries, étoiles et statistiques
> • Mode daltonien
> • Sans compte, sans pub intrusive, 100 % hors-ligne

**English**
- Name: Mozaik – Color Puzzle
- Subtitle: One brain teaser a day
- Keywords: `puzzle,brain,logic,daily,color,flip,tiles,grid,mind,game,relax,iq,challenge,teaser`
- Description:
> One puzzle. Three colors. One goal: make the whole grid a single color.
> Tap a tile and it flips along with its four neighbours. Every day brings a new puzzle — the same for
> everyone — getting harder from Monday to Sunday. Can you find the perfect solution?

**Confidentialité** : « Aucune donnée collectée ». Il faut tout de même une URL de politique de confidentialité :
une page web d'une ligne suffit, par exemple « Mozaik ne collecte aucune donnée personnelle ».

**Captures d'écran** : lancez le simulateur iPhone 6,9" dans Xcode, puis *File → Save Screen*. Prévoyez quatre écrans :
l'accueil, une grille en cours, l'écran « Parfait ! » et les statistiques. Ajoutez une phrase d'accroche au-dessus
de chaque capture.

## Autres idées d'apps à décliner ensuite (même base technique)

1. **Mozaik Kids** : grilles 3×3 et 4×4, sons et animations, catégorie Enfants.
2. **Widget « compte à rebours »** pour les événements (vacances, anniversaire). Les widgets iOS sont très
   recherchés, mais l'app doit être en Swift natif.
3. **Un deuxième jeu du jour** avec une autre mécanique (chemin de chiffres, glisser des lignes), puis une app
   « collection » qui regroupe les jeux. Les joueurs de l'un découvrent ainsi les autres.
