# MasterPlinko — architecture évolutive

## Principes
État et économie indépendants de Three.js. Le rendu ne décide jamais des gains.
Les probabilités, prix et durées vivent dans la configuration.
Le résultat est déterminé au lancement, pas à la collision ou à l'arrivée.

## Organisation suggérée
| Partie | Responsabilité |
| --- | --- |
| config | Profil prototype, probabilités, améliorations et constantes |
| game/state | État sérialisable et statistiques |
| game/economy | Débits, achats et règlements idempotents |
| game/outcomes | Tirage pondéré et choix de sortie |
| game/progression | Panne unique et atelier |
| game/overheat | Compteur et bonus en temps actif |
| game/factory | Service d'usine et rémunération |
| rendering | Scène Three.js, machine procédurale, trajectoires et effets |
| navigation | Vues disponibles, caméra cible, transitions et commandes directes |
| ui | Panneaux HTML/CSS, actions et dialogues |
| persistence | Validation, snapshots, import/export et migrations |

Une petite arborescence suffit ; éviter un framework de systèmes génériques.
Pas de React, serveur, SQL ou moteur physique obligatoire pour le développement initial.

## Contrat d'une bille
Champs minimum : id unique, ordre de lancement, origine manual/auto, mise débitée, base de production, multiplicateur, sortie visuelle, facteur de Surchauffe et retour final en centièmes.
Une bille automatique a une mise débitée nulle et une base de 100 centièmes.
Toutes les valeurs économiques sont figées au lancement.

## Transaction de lancement
1. Vérifier panne, usine, fonds, intervalle manuel et capacité.
2. Tirer un résultat avec une source aléatoire injectable pour les tests.
3. Calculer la sortie et le retour.
4. Créer une copie du prochain état : débit + bille en attente + statistiques de lancement.
5. Sauvegarder cette copie en un snapshot.
6. Publier l'état puis commencer l'animation.

Si l'écriture échoue, conserver l'ancien état, signaler le problème et suspendre les mutations économiques jusqu'à résolution.
Ne pas animer un résultat que l'on n'a pas pu enregistrer.

## Transaction de règlement
- Chercher l'id dans les billes en attente.
- S'il n'existe plus, ne rien payer.
- Dans un même prochain état : créditer, mettre à jour statistiques et compteur, retirer la bille et ajouter l'historique.
- Vérifier les conditions de panne, puis sauvegarder avant publication.
- Le visuel disparaît après règlement réussi.

## Chargement
Valider le snapshot. Régler toutes les billes en attente par ordre de lancement, avec leurs retours figés ; ne pas relancer le hasard.
La reprise ne fait pas avancer le temps actif : aucun nouveau lancement, service d'usine ou bonus expiré à cause de l'absence.
Enregistrer l'état réconcilié avant d'afficher le résumé et d'autoriser le jeu.
Le rechargement suivant ne trouve plus ces billes.
Une application locale peut être modifiée par son utilisateur : aucune promesse d'anti-triche serveur.

## Format de sauvegarde du jeu
Un snapshot JSON complet contient :
- saveVersion = 1 et profil prototype.
- walletCents, selectedBetCents et nextBallSequence.
- pendingBalls, limité à 50.
- Liste des améliorations possédées.
- repairTriggered et repairPurchased.
- Statistiques de l'économie.
- Compteur, charge et temps actif restant de Surchauffe.
- Éventuel service d'usine et temps actif restant.
- Historique limité à 100 résultats.
- Préférences son, mouvement et qualité.
- Date de sauvegarde informative, sans calcul de revenu hors ligne.

Valeurs dérivées recalculées ; affichage et références Three.js jamais sérialisés.
Sauvegarder après chaque transaction et environ chaque seconde pour les temps actifs restants. Arrondir conservativement les checkpoints de durée afin de ne pas gagner du temps par rechargements répétés.
Automatisation toujours arrêtée au démarrage, au chargement et après import.

## Import/export
Exporter le snapshot complet, y compris les billes en attente.
Valider type, version, entiers sûrs, bornes, identifiants, unicité et cohérence avant remplacement.
Une version future est refusée sans effacer la partie. Proposer d'exporter la partie actuelle avant de la remplacer.
Import réussi : réconcilier comme au chargement.
Importer volontairement une ancienne sauvegarde restaure cet ancien état : ce retour en arrière est accepté dans un jeu solo local.

## Temps et onglets
Une horloge de jeu avance uniquement quand l'onglet est visible et la partie non suspendue.
Pas de rattrapage massif à la réactivation.
Détecter une seconde fenêtre du même jeu : un seul onglet peut écrire ; les autres restent suspendus pour éviter d'écraser les snapshots.

## Rendu
14 étapes gauche/droite vers 15 sorties symétriques. Construire un chemin compatible avec l'index cible, puis varier les rebonds visuels.
Le chemin et la durée sont purement visuels.
Three.js n'a pas le droit de changer un multiplicateur pour suivre une collision.
Rapier peut être étudié plus tard pour des objets de décor.

## Navigation et caméra
Définir des vues stables plinko et azur, avec position, cible de regard et condition d'accès. Prévoir l'ajout ultérieur de marceau et mateo sans les implémenter dans le développement initial.
Un petit contrôleur de caméra gère vue actuelle, vue cible et transition ; il ne gère pas l'économie.
Navigation au clic via les objets 3D, flèches et commandes HTML accessibles au clavier.
Les définitions de cadrage et la durée de transition sont des données de configuration.
Une nouvelle demande remplace la cible ; aucune file d'animations. En mouvement réduit, appliquer la transformation finale immédiatement.
Éviter les clics traversants et désactiver lancement manuel/Décharge hors vue Plinko stabilisée.
L'horloge économique continue pendant la navigation et les achats ; changer de vue ne recrée ni la simulation ni les billes en cours.
À la reprise, cadrage Plinko ; aucune nécessité de sauvegarder une interpolation de caméra.

## Vérifications
Tester le tirage avec un générateur injecté, les transactions, les 50 billes, les bonus, l'usine, la reprise, la panne unique et l'import.
Mesurer la fluidité réelle de 50 billes ; une limite d'images par seconde n'est pas un modèle économique.
