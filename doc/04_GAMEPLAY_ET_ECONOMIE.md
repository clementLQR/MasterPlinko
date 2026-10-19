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

## Distribution actuelle
| Multiplicateur | Probabilité |
| --- | --- |
| x0,3 | 60 % |
| x0,5 | 24 % |
| x1 | 10 % |
| x1,5 | 3,5 % |
| x3 | 1,5 % |
| x5 | 0,6 % |
| x10 | 0,3 % |
| x40 | 0,1 % |

Total 100 %. Réglage plus sévère demandé par le créateur : 84 % de pertes, 10 % de remboursements et 6 % de gains nets hors bonus. Retour moyen théorique : 0,5975 fois la mise ; perte moyenne 40,25 % de la mise, sans garantie individuelle. Ces poids remplacent le retour moyen initial de 1,06. Les résultats déjà figés gardent leur paiement ; la nouvelle distribution concerne les prochains lancements seulement.
La direction plus sévère vient du créateur ; les valeurs exactes sont un réglage de départ proposé par l’assistant, encore à évaluer pendant une partie.
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
Activation manuelle : retours x2 pendant 10 secondes de temps de jeu actif.
Bonus figé au lancement ; aucune recharge durant ces 10 secondes.
Pas d'empilement. Voir fichier 11 pour l'ordre de résolution.

## Usine confirmée
Le créateur remplace le service garanti par 60 secondes actives de tri. Cliquer les grises (+) du flux continu rapporte 0,50 pièce chacune, payées une seule fois au terme. Une grise manquée ne rapporte rien ; zéro grise cliquée = zéro salaire. Une rouge (×) fait exploser le joueur et annule tout le salaire de ce service, sans débit du solde existant.
Accès par l’escalier et sélection explicite, même en panne ou sous une pièce, après vidage et arrêt du Doigt. Ancienne salle d’usine 3D conservée, tapis sur l’établi et carton ; temps, règles et gains en attente sur fiches physiques. Clic ou Tabulation/Entrée/Espace. Initialement : une bille toutes les 700 ms, 23 % de rouges, quatre couloirs, 6,5 s de traversée.
Seule l’horloge du travail et de ses billes avance dans un onglet visible. Reprise avec temps, grises et billes sauvegardés ; ni double gain ni revenu hors ligne. Fin ou explosion : destinations, sans démarrage automatique. Format interne 3, migration des formats 1 et 2 ; un ancien service déjà commencé conserve exceptionnellement son contrat de 15 pièces, puis suit le nouveau tri.
Événements temporaires : Surcadence (tapis et arrivées ×2), Arrivage massif (arrivées ×2), Ralentissement (tapis et arrivées ÷2). Préavis 2 s, effet 7 s, ordre et horaires sauvegardés. Ils modifient seulement le rythme ; prix des grises, probabilité des rouges et explosion restent identiques. Ancien service du format 2 conservé à cadence fixe jusqu’au suivant.
L’usine ne contribue ni aux résultats, ni à la panne, ni à la Surchauffe du Plinko. Règles détaillées au fichier 11.

## Statistiques
Séparer : mises payées, retours bruts, bénéfice des billes payantes, production gratuite, revenus d'usine et dépenses d'amélioration.
Le seuil de panne porte sur les retours bruts du Plinko, y compris les billes automatiques si disponibles ; jamais sur le bénéfice ou le solde.

## Sauvegarde et absence
Sauvegarde locale complète après chaque transaction, plus export/import JSON.
Les billes en cours sont réglées une seule fois à la reprise, avec leur résultat enregistré.
Aucun revenu hors ligne. Masquer l'onglet met en pause animation, cadence, usine et durée de bonus.
Détail des garanties et limites : fichiers 10 et 11.

## Interface
Choix confirmé : aucun HUD dans la cave, plein écran sans marge ni défilement. Solde, mise, résultat, boutons et Surchauffe sur la machine ; achats sur le catalogue ; réglages/export/import sur le boîtier mural ; historique sur le ticket du Bac. Explications uniquement au survol/focus près des objets.
Exception hors cave : destinations sur noir complet ; service avec poste 3D dans sa salle d’usine et fiche physique, sans compteur économique flottant ni navigation permanente. Accès exclusivement par la montée de l’escalier.
Ne pas sacrifier l'accès à l'usine, au solde ou à la mise pour respecter le décor.

## Navigation validée : positions de caméra fixes
Le chalet est une pièce 3D avec plusieurs cadrages prédéfinis. Cliquer sur un objet fait pivoter et déplacer la caméra vers sa vue. Pas de marche libre, de contrôleur de personnage ni de collision de déplacement dans le périmètre initial.

| Vue | Fonction | Périmètre |
| --- | --- | --- |
| Plinko | Billes, mise, automatisation et Décharge | À développer maintenant |
| Établi d'Azur | Réparation et achats | À développer maintenant |
| Coin de Marceau | Produits et recherches | Plus tard |
| Table de Matéo | Porte-bonheur | Plus tard |
| Escalier | Trajet de sortie puis destinations sur fond noir, dont l’usine | Objet cliquable et trajet prédéfini |

- Deux vues principales : Plinko et établi, avec cadrages de lecture des commandes, catalogue, réglages et ticket.
- Objets cliquables, exploration par Tabulation/Entrée et raccourcis directs vers les vues. Aucun passage obligatoire par plusieurs cadrages.
- Retour au Plinko avec les mentions imprimées dans les supports ou Échap, après annulation d’une éventuelle confirmation d’import.
- Transition courte ; réglage initial proposé de 0,5 seconde. Option de mouvement réduit : changement instantané.
- La production automatique, les règlements et le bonus continuent pendant les achats et transitions ordinaires dans la cave.
- Le lancement manuel et la Décharge se font depuis la vue Plinko ou commandes stabilisée ; aucun clic traversant les objets.
- La Décharge prête allume le bouton physique et les segments de la machine ; retour direct par M ou Échap.
- Nouvelle partie et chargement : Plinko ; si un service est chargé, poste du service dans sa salle d’usine.
- L'usine conserve ses règles de pause et d'arrêt du lanceur ; elle n'est pas un simple changement de caméra.
- Départ seulement avec zéro bille en cours ; le survol explique l’attente. Au départ autorisé, arrêter le Doigt et désactiver les autres interactions. Approche, montée fluide et fondu complet avant la liste des destinations. Clics répétés ignorés.
- Montée, choix et descente suspendent tout le temps de jeu. Pendant le travail, seule la durée du service avance dans un onglet visible. Aucun départ automatique : choisir explicitement usine ou redescente.
- Retour par révélation du haut, trajet inverse puis Plinko ; le mode réduit utilise de courts fondus. Doigt arrêté au retour. Les visites non débloquées ou non implémentées restent masquées.
