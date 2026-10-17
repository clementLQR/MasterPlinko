# MasterPlinko — gameplay et économie

## Choix confirmés
- Navigateur sur ordinateur.
- Résultat tiré au lancement : la physique ne le détermine pas.
- Solde initial : 19 pièces.
- Mise entière : de 1 à 10 pièces, valeur initiale 1.
- Multiplicateurs : x0,3 ; x0,5 ; x1 ; x1,5 ; x3 ; x5 ; x10 ; x40.
- Maximum 50 billes simultanées.
- Sans argent : travail à l'usine ; pas de fin de partie.

## Boucle
Lancer → retour → améliorations → automatisation. Résidus, synergies et recalibrage viendront ensuite.

## Convention
Le multiplicateur indique le retour total, pas le bénéfice.
Pour 10 pièces : x0,3 rend 3 (net -7), x1 rend 10 (net 0), x3 rend 30 (net +20).
Le solde peut être fractionnaire : une mise de 1 peut rendre 0,30.
Stocker la monnaie en centièmes entiers ; afficher deux décimales.

## Première distribution proposée
| Multiplicateur | Probabilité |
| --- | --- |
| x0,3 | 40 % |
| x0,5 | 25 % |
| x1 | 17 % |
| x1,5 | 9 % |
| x3 | 5 % |
| x5 | 2 % |
| x10 | 1,8 % |
| x40 | 0,2 % |

Total 100 %. Retour moyen hors bonus : 1,06 fois la mise. Bénéfice moyen théorique : 6 % de la mise, sans garantie individuelle.
Ces probabilités sont proposées pour tester, pas choisies par le créateur ni validées par une partie.
Elles ne découlent pas de la géométrie du plateau.

## Résolution
Vérifier les fonds et les 50 emplacements ; débiter ; tirer le résultat ; figer son retour et ses bonus ; enregistrer la bille ; animer ; régler une seule fois.
Recharger conserve le résultat enregistré. Ne jamais retirer une mise avant de vérifier le plafond.

## Automatisation proposée
Doigt mécanique : une bille gratuite toutes les 2 secondes, base de production 1 pièce, mêmes probabilités.
Aucun débit et aucune utilisation gratuite de la mise choisie par le joueur.
Au plafond de 50 billes, attendre sans constituer de file d'attente.
Au lancement de l'application, l'automatisation reste arrêtée jusqu'au clic du joueur.

## Surchauffe
100 billes réglées chargent une Décharge, manuelles ou automatiques.
Une seule charge stockable. Le compteur reste à 100 tant qu'elle n'est pas utilisée.
Activation manuelle : retours x10 pendant 10 secondes de temps de jeu actif.
Bonus figé au lancement ; aucune recharge durant ces 10 secondes.
Pas d'empilement. Voir fichier 11 pour l'ordre de résolution.

## Usine proposée
Accessible même si le solde est compris entre 0 et 1 : le joueur doit pouvoir repartir dès qu'il ne peut plus payer la mise minimale.
Un service de 15 secondes actives rapporte 15 pièces garanties.
Pas de lancement pendant le service ; commencer uniquement lorsque toutes les billes sont réglées. Arrêter l'automatisation et laisser le joueur la relancer au retour.
Pas de mini-jeu complet, de calendrier ni de licenciement dans le développement initial.
L'usine ne contribue pas au seuil de panne.

## Statistiques
Séparer : mises payées, retours bruts, bénéfice des billes payantes, production gratuite, revenus d'usine et dépenses d'amélioration.
Le seuil de panne porte sur les retours bruts du Plinko, y compris les billes automatiques si disponibles ; jamais sur le bénéfice ou le solde.

## Sauvegarde et absence
Sauvegarde locale complète après chaque transaction, plus export/import JSON.
Les billes en cours sont réglées une seule fois à la reprise, avec leur résultat enregistré.
Aucun revenu hors ligne. Masquer l'onglet met en pause animation, cadence, usine et durée de bonus.
Détail des garanties et limites : fichiers 10 et 11.

## Interface
Direction finale : compteur sur la machine, atelier, porte, téléphone, carnet.
Développement initial : privilégier la machine et des panneaux HTML/CSS lisibles, même si certaines fonctions restent provisoirement à l'écran.
Ne pas sacrifier l'accès à l'usine, au solde ou à la mise pour respecter le décor.

## Navigation validée : positions de caméra fixes
Le chalet est une pièce 3D avec plusieurs cadrages prédéfinis. Cliquer sur un objet fait pivoter et déplacer la caméra vers sa vue. Pas de marche libre, de contrôleur de personnage ni de collision de déplacement dans le périmètre initial.

| Vue | Fonction | Périmètre |
| --- | --- | --- |
| Plinko | Billes, mise, automatisation et Décharge | À développer maintenant |
| Établi d'Azur | Réparation et achats | À développer maintenant |
| Coin de Marceau | Produits et recherches | Plus tard |
| Table de Matéo | Porte-bonheur | Plus tard |
| Porte | Choix de destination, dont l'usine | Action accessible dans le développement initial, sans troisième cadrage obligatoire |

- Deux vues Développement initial : Plinko et établi, dans une même scène.
- Objets cliquables, flèches discrètes et accès direct aux vues disponibles. Aucun passage obligatoire par plusieurs cadrages.
- Retour au Plinko avec une commande visible et la touche Échap, hors fenêtre modale prioritaire.
- Transition courte ; réglage initial proposé de 0,5 seconde. Option de mouvement réduit : changement instantané.
- La production automatique, le règlement des billes et les temps de bonus continuent pendant les achats et les transitions.
- Le lancement manuel et l'activation de Décharge se font depuis la vue Plinko stabilisée ; aucun clic traversant un panneau.
- Une notification de Décharge prête propose un retour direct à la machine depuis l'établi.
- Une nouvelle partie ou un chargement commence en vue Plinko.
- L'usine conserve ses règles de pause et d'arrêt du lanceur ; elle n'est pas un simple changement de caméra.

L'établi peut être observé dès le début ; ses achats restent verrouillés selon la progression. La réparation apparaît à la panne, puis ouvre les autres achats.
Les vues des futurs personnages se débloquent avec leur rencontre. Le déplacement libre ne sera reconsidéré que si une vraie mécanique d'exploration le justifie.

## Fonctionnalités futures
Trois plateaux Souple/Équilibré/Audacieux, Marceau, Matéo, résidus, recalibrage, cinématiques et chalet complet.
