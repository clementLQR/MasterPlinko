# MasterPlinko

La machine de Papy, dans la cave du chalet. Un jeu solo de Plinko avec achats, automatisation et argent fictif, développé avec Vite, TypeScript et Three.js. Les volumes 3D et les sons sont générés par code ; bois, pierre et tapis utilisent aussi trois textures locales générées.

La cave occupe toute la fenêtre, sans HUD. Dans la cave, les commandes et informations appartiennent aux objets 3D. Seule exception : après la montée de l’escalier, destinations sur fond entièrement noir, puis poste de travail 3D dans sa salle d’usine pendant le service. Le survol et le focus clavier affichent une courte indication près de l’objet.

## Lancer le jeu

Prérequis : Node.js 24 ou plus récent, npm et un navigateur de bureau récent avec WebGL et Web Locks (Chrome, Edge, Firefox). Utiliser localhost ; ouvrir directement `index.html` ne suffit pas.

```powershell
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:5173**. Le port est fixe : les sauvegardes du navigateur sont rattachées à cette adresse. `localhost` et `127.0.0.1` ont des espaces de stockage distincts.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

Le build produit `dist/`. L’aperçu de production utilise l’adresse indiquée dans le terminal (habituellement le port 4173, avec sa propre sauvegarde locale).

## Jouer

- Départ : **19,00 pièces** et mise de **1,00**. Les boutons −/+ règlent la mise entière entre 1 et 10.
- **Lancer une bille**, ou **Espace** en vue Plinko, débite la mise. Un intervalle de 0,5 seconde sépare les lancers ; 50 billes simultanées maximum.
- La sortie indique le **retour total** : ×1 rembourse la mise ; ×0,3 rend 30 %. Le bénéfice net est affiché séparément.
- Le Plinko utilise désormais un réglage plus sévère : **84 % de pertes**, **10 % de remboursements** et **6 % de gains nets**, hors Surchauffe. Le retour moyen théorique est de **59,75 % de la mise**. Chances par multiplicateur : ×0,3 : 60 % ; ×0,5 : 24 % ; ×1 : 10 % ; ×1,5 : 3,5 % ; ×3 : 1,5 % ; ×5 : 0,6 % ; ×10 : 0,3 % ; ×40 : 0,1 %. Le catalogue affiche ces chances. Les paiements déjà enregistrés restent conservés.
- Le **catalogue posé sur l’établi d’Azur** se consulte au clic : la caméra se rapproche de ses pages, qui portent prix, conditions et achats. **Échap** revient à la machine ; une confirmation d’import est d’abord annulée. Une transition dure 0,5 seconde et devient instantanée en mouvement réduit.
- Une panne unique arrive à **50 pièces de retours cumulés du Plinko**. L’établi propose une réparation à **25 pièces** une fois les billes réglées. Il ouvre ensuite le **Doigt mécanique** (40 pièces) et le **Bac comptable** (15 pièces).
- Le Doigt, activé avec son **interrupteur physique et son voyant**, produit une bille gratuite de base 1 toutes les 2 secondes. Il continue à l’établi ; la mise sélectionnée n’affecte pas les billes gratuites.
- Après 100 règlements, le **bouton rose ×2** s’allume : il active la Décharge sur les billes lancées pendant 10 secondes actives. Les segments et l’écran de Surchauffe appartiennent à la machine.
- Le **Bac comptable** imprime un ticket consultable par pages, avec origine, mise, base, multiplicateur, bonus, retour et net.
- L’**escalier à gauche** permet de sortir. Attendre zéro bille en cours ; si le Doigt tourne, l’arrêter et laisser arriver ses billes. Le survol explique cette attente. Un départ autorisé arrête le Doigt et bloque les autres interactions.
- La caméra s’approche des marches et monte, puis un fondu au noir révèle les **destinations**. Le trajet garde la hauteur de regard de la vue Plinko, suit les marches et conserve cette stature à la descente. Au retour, on découvre l’atelier scientifique à l’arrière de la cave : tableau noir, fenêtre pluvieuse, instruments et inventions de Papy. Le regard revient ensuite progressivement vers le Plinko et la caméra rejoint la vue de jeu par un virage arrondi. Les clics répétés n’empilent aucun trajet. En mouvement réduit, un court fondu remplace la montée et le retour.
- Sur fond noir, choisir **Aller travailler à l’usine**, **Rendre visite à Azur** après sa rencontre à la première panne, ou **Redescendre dans la cave**. Marceau et Matéo restent indisponibles. Ouvrir cette liste ne commence aucun travail ni visite.
- Dans la **boutique publique d’Azur**, cliquer le comptoir pour s’approcher ; **Tabulation**, **Entrée/Espace** permettent les mêmes interactions. Après l’achat de la **réparation initiale**, la porte derrière le comptoir donne accès à la réserve. Tourner le bouton de la **radio** pour déverrouiller l’étagère coulissante, puis sélectionner le passage découvert pour entrer dans l’atelier caché. Cliquer le Plinko cassé, le Doigt/Bac ouvert ou le Duplicateur pour observer leurs détails ; cliquer à nouveau revient à la vue d’ensemble. Les prototypes sont décoratifs, sans nouveaux achats ni déblocages.
- Les repères physiques et **Échap** ramènent à la vue d’ensemble, à la réserve puis à la boutique ; depuis l’entrée, Échap ou l’entrée vitrée ramène aux destinations. Aucun HUD ; le Plinko et la Surchauffe restent en pause pendant toute la visite. Les mouvements réduits rendent les transitions immédiates. Le mécanisme est remis à zéro à chaque visite ; recharger retrouve la cave sans modifier la progression.
- Le service dure **une minute active** : cliquer les **billes grises marquées +** sur le tapis rapporte **0,50 pièce par bille**, versée à la fin. Les grises manquées ne rapportent rien. Une **rouge marquée ×** fait exploser le joueur et termine le service avec **zéro gain**, sans toucher aux pièces déjà possédées. Sans grise cliquée, aucun salaire. **Tabulation** choisit une bille ; **Entrée/Espace** la valide.
- Des **événements temporaires** varient le rythme : **Surcadence** (tapis et arrivées ×2), **Arrivage massif** (arrivées ×2) et **Ralentissement** (tapis et arrivées ÷2). La fiche annonce chaque effet deux secondes avant, pour sept secondes. Leur ordre varie à chaque service et reste conservé au rechargement. Le prix des grises et le risque des rouges restent identiques.
- L’ancienne salle d’usine est conservée, avec son établi, ses étagères et ses cartons. Les fiches du poste affichent temps restant, grises validées et salaire en attente. Aucun HUD. À la fin ou après une explosion, choisir explicitement un nouveau service ou redescendre ; aucune sortie anticipée pendant le travail.
- **Redescendre** ou **Échap** depuis les destinations révèle le haut des marches, puis la caméra redescend jusqu’à Plinko. En mouvement réduit : court fondu. L’automatisation reste arrêtée jusqu’à sa réactivation par le joueur.
- Le **boîtier mural entre la machine et l’escalier** permet de couper le son, réduire les animations, alléger le rendu et exporter/importer une partie. Le bouton **Supprimer la sauvegarde…** demande confirmation avant d’effacer la progression et de recommencer à 19 pièces ; vous pouvez exporter avant de confirmer. Les réglages sont conservés. **Échap** annule la confirmation. « Réessayer » apparaît seulement en cas d’erreur ; le bouton « Relire la sauvegarde » a été retiré. Les sons sont désactivés au départ.

Au clavier : **Tabulation** parcourt les objets, **Entrée/Espace** active l’objet indiqué. **M** : machine, **C** : commandes, **A** : établi, **S** : départ depuis Plinko (ou retour au cadrage Plinko depuis un autre support), **R** : réglages, **H** : ticket acquis. **Échap** revient à la machine après annulation d’une confirmation d’import ou de suppression. Sans objet sélectionné, **Espace** lance depuis la machine ; **+/−** règle la mise. Hors cave, Tabulation/Entrée/Espace servent aux destinations ou aux objets du poste ; Échap redescend depuis la liste.

La production continue pendant les achats et cadrages ordinaires. Montée, destinations et descente suspendent tout le temps de jeu. Pendant le travail, seule l’horloge du service avance, si l’onglet est visible. Boîtier, import, ticket et onglets masqués conservent leurs pauses. Aucun revenu hors ligne. Le Doigt attend une activation explicite après retour, chargement ou import.

La cave lofi est entièrement construite en 3D : maçonnerie, poutres, fenêtre pluvieuse, luminaires, établi, escalier, tapis et rangements. La machine en bois clair et crème porte des touches sauge, rose et lavande. Le Doigt mécanique et le Bac comptable apparaissent sur leurs emplacements 3D à l’achat, y compris sur les sauvegardes existantes. Les modèles de duplicateur, compteur d’instabilité et ventilation sont préparés mais restent cachés ; leurs mécaniques ne sont pas implémentées.

Les nouvelles références guident un décor plus fourni : canapé brun avec plaid, pouf, tapis persan usé, poêle et bûches, étagères de livres et vieux appareils, robots bricolés, plantes, plans et petits éclairages chauds. Le prototype à chambre électrique appartient au décor. Le cadrage principal montre la pièce ; **C** rapproche les commandes et **A** cadre l’atelier. La qualité basse retire les passes d’ombres de contact et de halo pour alléger le rendu. Les [textures et leurs prompts](src/assets/textures/README.md) sont inclus dans le projet, sans téléchargement externe pendant le jeu.
L’établi et le catalogue sont installés contre le mur latéral droit. La caméra se tourne vers eux pour consulter les améliorations. Le canapé dispose d’une assise à trois places et la fenêtre reste dégagée.

Le plateau conserve ses quinze inscriptions dans les cadrages de jeu. La grille métallique en quinconce, les billes et les trajectoires partagent leurs coordonnées et rayons ; l’arrivée allume brièvement le bon compartiment et actualise le résultat après règlement réussi. Les contacts ont un son discret avec variations, limité en fréquence lorsque de nombreuses billes sont présentes. Les pierres déformées, meubles, plantes et lumières sont procéduraux ; les textures restent attachées aux objets, aucun asset distant ni moteur physique ajouté.

## Sauvegarde

Une sauvegarde JSON complète est écrite dans `localStorage` sous `masterplinko.save`, après chaque transaction et environ chaque seconde pour les chronomètres. Les durées sont enregistrées sans anticiper leur progression.

Le résultat et le bonus de chaque bille sont enregistrés au lancement. Après rechargement, les vols sont réglés dans l’ordre avec leur gain enregistré, une seule fois. Un résumé indique le total de reprise. Les 100 derniers résultats sont conservés dès le départ et deviennent consultables après achat du Bac.

Un service d’usine actif reprend au poste avec son temps, son score et ses billes sauvegardés. Chaque clic accepté est enregistré avant son effet visuel ; aucune double validation ni revenu pendant l’absence. Une explosion reste perdue après rechargement. Le format interne JSON passe à 3 avec migration des formats 1 et 2, sans nouveaux fichiers : solde et progression conservés. Un ancien service déjà commencé garde exceptionnellement sa durée et son ancien salaire de 15 pièces ; les suivants durent une minute et utilisent le tri. Un ancien service de tri du format 2 conserve son score et ses billes, sans événement jusqu’au prochain service. Le trajet et les destinations restent transitoires. Les anciens résultats au bonus ×10 gardent leur retour figé ; les nouveaux lancements avec Surchauffe utilisent ×2. Les sorties ordinaires ×10 sont inchangées.

L’import valide les données avant de proposer le remplacement. Vous pouvez exporter l’état courant avant de confirmer. Une sauvegarde illisible ou de format incompatible n’est jamais écrasée automatiquement. En cas de stockage indisponible, le jeu est suspendu et propose export et nouvelle tentative. Restaurer volontairement un ancien export restaure cette ancienne progression.

La suppression confirmée remplace toute la progression par le snapshot d’une nouvelle partie en une seule écriture. Si cette écriture échoue, la partie précédente reste intacte et le jeu se suspend. Aucune autre donnée du navigateur ni fichier exporté n’est effacé. Une sauvegarde incompatible peut aussi être remplacée, uniquement après cette confirmation explicite.

Un seul onglet peut écrire : les autres attendent, puis relisent la partie après fermeture de l’onglet propriétaire. Cette protection évite les duplications accidentelles ; le jeu solo local n’est pas un système anti-triche.

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/config.ts` | Prix, probabilités, délais et cadrages |
| `src/game/` | État sérialisable et transactions indépendantes du rendu |
| `src/navigation/` | Vues et transitions, sans effet économique |
| `src/persistence/` | Validation, sauvegarde et verrouillage entre onglets |
| `src/rendering/` | Cave, poste d’usine et surfaces interactives 3D, survol/focus et trajectoires |
| `src/ui/` | Canevas, écrans noirs hors cave, accessibilité et sons synthétisés |
| `tests/` | Vérifications de logique et parcours Chrome |
| `doc/` | Conception et spécification prioritaire du jeu |

Les fontes DM Sans et Libre Caslon Display sont fournies localement dans `public/fonts/`, avec leurs licences SIL Open Font License. Aucun service externe n’est requis pour jouer une fois les dépendances installées.

## Vérifications navigateur

```powershell
npm run test:browser
```

Les tests utilisent Google Chrome installé et démarrent temporairement le serveur local s’il est absent. Ils vérifient notamment rechargement pendant un vol, import/export, atelier, usine, concurrence d’onglets, navigation et rendu simultané de 50 billes. Les captures et résultats temporaires se trouvent dans `test-results/`, ignoré par Git. Le rendu logiciel du navigateur de test ne mesure pas les performances d’un GPU réel.

Pour exécuter ces mêmes parcours avec l’accélération graphique réelle disponible sur la machine (PowerShell) :

```powershell
$env:PLINKO_GPU = '1'
npm run test:browser
Remove-Item Env:PLINKO_GPU
```

Sans cette variable, les tests conservent leur rendu logiciel SwiftShader. Le parcours du plateau répartit 50 vols entre les quinze sorties, refuse la 51e tentative et compare chaque arrivée au crédit économique réel. Les tests de trajectoire couvrent également plusieurs chemins par sortie, les picots de toute la grille et les cloisons, avec et sans mouvement réduit.

## État et limites

La boucle prévue est implémentée. La validation consolidée avec les nouvelles probabilités a réussi : 43 tests de logique et 18 parcours Chrome complets, puis trois contrôles de rendu après mise à jour du mode d’ombres. Le compte rendu des vérifications et les essais restant à réaliser sont dans `doc/07_A_FAIRE_MAINTENANT.md`. L’équilibrage des prix et probabilités reste à évaluer pendant une partie de 10 à 15 minutes par le créateur. Chalet complet, autres personnages, longues cinématiques, recalibrage et synchronisation sont hors du périmètre actuel.

Le dépôt distant est configuré sur https://github.com/clementLQR/MasterPlinko.git. Aucun commit, push ou déploiement n’est effectué sans demande explicite.
