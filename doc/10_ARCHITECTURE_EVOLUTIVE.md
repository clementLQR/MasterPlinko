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
| ui | Canevas plein écran, écrans noirs hors cave, import natif, accessibilité et sons |
| persistence | Validation, snapshots, import/export et migrations |

Une petite arborescence suffit ; éviter un framework de systèmes génériques.
Pas de React, serveur, SQL ou moteur physique obligatoire pour le développement initial.

## Contrat d'une bille
Champs minimum : id unique, ordre de lancement, origine manual/auto, mise débitée, base de production, multiplicateur, sortie visuelle, facteur de Surchauffe et retour final en centièmes.
Une bille automatique a une mise débitée nulle et une base de 100 centièmes.
Toutes les valeurs économiques sont figées au lancement. Le rééquilibrage des chances à 60/24/10/3,5/1,5/0,6/0,3/0,1 % modifie seulement `OUTCOMES` pour les prochains tirages. La validation et la réconciliation utilisent le multiplicateur, la sortie et le retour figés de chaque bille ; ne pas rejouer le hasard ni convertir les anciens paiements. Aucun changement du format de sauvegarde.

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
- saveVersion = 3 et profil prototype ; migration des snapshots de formats 1 et 2 après validation de leurs règles historiques.
- walletCents, selectedBetCents et nextBallSequence.
- pendingBalls, limité à 50.
- Liste des améliorations possédées.
- repairTriggered et repairPurchased.
- Statistiques de l'économie.
- Compteur, charge et temps actif restant de Surchauffe.
- factoryRemainingMs et factory : status (idle/active/success/exploded), legacy, greyHits, nextId, spawnInMs, events (kind, startsAtMs) et balls (id, kind, lane, ageMs).
- Historique limité à 100 résultats.
- Préférences son, mouvement et qualité.
- Date de sauvegarde informative, sans calcul de revenu hors ligne.

Valeurs dérivées recalculées ; affichage et références Three.js jamais sérialisés.
Sauvegarder après chaque transaction et environ chaque seconde pour les temps actifs restants. Arrondir conservativement les checkpoints de durée afin de ne pas gagner du temps par rechargements répétés.
Automatisation toujours arrêtée au démarrage, au chargement et après import. Le facteur courant de Décharge est `CONFIG.bonusFactor = 2`. Le validateur accepte 1, 2 et le facteur historique 10, avec contrôle strict du retour figé. Les anciens gains ne sont pas convertis ; les lancements après reprise utilisent ×2, même si le bonus était déjà actif. La migration du format pour le tri d’usine ne recalcule pas ces gains.

## Import/export
Exporter le snapshot complet, y compris les billes en attente.
Valider type, version, entiers sûrs, bornes, identifiants, unicité et cohérence avant remplacement.
Une version future est refusée sans effacer la partie. Proposer d'exporter la partie actuelle avant de la remplacer.
Import réussi : réconcilier comme au chargement.
Importer volontairement une ancienne sauvegarde restaure cet ancien état : ce retour en arrière est accepté dans un jeu solo local.

## Boîtier et suppression de progression
`Game.resetProgress()` crée une nouvelle partie avec les préférences existantes, puis utilise la transaction habituelle pour écrire le snapshot complet avant publication. Les anciens résultats, achats, billes, bonus, service et statistiques sont effacés ensemble ; le Doigt est arrêté. Écriture refusée : état précédent conservé, erreur et suspension. Aucun effacement global de localStorage ni nouvelle version de format.
`main.ts` garde la demande de suppression transitoire. Confirmation sur la texture du boîtier, export/cancel possibles et Échap prioritaire ; bloquer autres actions et navigation. Vérifier le verrou avant l’exécution ; une sauvegarde inconnue ne peut être remplacée qu’après confirmation explicite. Au succès, nettoyer import/focus/pages et animations du précédent état, puis montrer le boîtier de la nouvelle partie ; aucune relance d’un ancien service. Les autres clés et exports restent intacts.
Le boîtier normal présente sept actions : son, mouvement, qualité, export, import, suppression et fermeture. Une récupération unique apparaît seulement en erreur ; relire n’est plus une commande permanente. `actionAvailable` filtre les zones de clic et de Tabulation selon le même état que la texture. Import et suppression montrent seulement les options de leur confirmation.

## Temps et onglets
Une horloge de jeu avance uniquement quand l'onglet est visible et la partie non suspendue.
Pas de rattrapage massif à la réactivation.
Détecter une seconde fenêtre du même jeu : un seul onglet peut écrire ; les autres restent suspendus pour éviter d'écraser les snapshots.

## Rendu
14 étapes gauche/droite vers 15 sorties symétriques. Construire un chemin compatible avec l'index cible, puis varier les rebonds visuels.
Le chemin et la durée sont purement visuels.
Three.js n'a pas le droit de changer un multiplicateur pour suivre une collision.
Rapier peut être étudié plus tard pour des objets de décor.

`rendering/decor.ts` construit le salon, les étagères, le poêle, les accessoires et l’invention décorative sans état économique. Les petites pièces statiques sont regroupées par matériau et par zone spatiale pour limiter le coût du rendu tout en gardant des bornes utiles aux rayons d’occultation. Les trois textures de surface locales dans `assets/textures/` sont incluses dans le build, avec une surface de repli procédurale pendant le chargement. Ce sont des matériaux de volumes, jamais un fond de pièce.
`CAVE.rearZ` partage la limite arrière entre maçonnerie et décor. Le sol, les retours de murs et le plafond couvrent ce volume ; le mur arrière possède une vraie baie. `rearWorkshop` place les objets dans un repère tourné vers l’intérieur, avec les mêmes matériaux, regroupements statiques et règles d’occultation. Tableau noir, cartes et étiquettes sont des textures de leurs supports ; les meubles, appareils, aquarium, télescope et modèles suspendus restent des volumes. Les prototypes décoratifs n’ajoutent ni interaction ni donnée de sauvegarde.
En qualité normale, `scene.ts` compose rendu 3D, ombrage de contact, léger halo des luminaires et sortie colorimétrique. La qualité basse conserve les mêmes volumes et interactions avec rendu direct sans ces passes supplémentaires. Les textures et effets ne touchent ni résultat ni sauvegarde.
L’établi sur le mur latéral droit utilise le repère `WORKBENCH` partagé dans la configuration. Table, accessoires et catalogue héritent de cette transformation ; `atWorkbench` déduit les cibles de lecture. Les poses prédéfinies incluent un angle horizontal interpolé pour orienter les caméras face à ce mur, sans déplacement libre. La couverture et la reliure du catalogue sont reconnues comme parties du même objet interactif, afin de ne pas bloquer son ouverture aux angles obliques.

## Navigation et caméra
`navigation/camera.ts` conserve les cadrages stables Plinko, établi, commandes, catalogue, réglages et historique. Clics 3D et raccourcis ; transition 0,5 seconde, immédiate en mouvement réduit. Dernière cible prioritaire, sans file. Lancement et Décharge seulement depuis la machine stabilisée ; achats dans le catalogue stabilisé. Les cadrages ordinaires n’arrêtent ni billes ni production. Boîtier, confirmation d’import et ticket suspendent le temps actif.
`Departure` gère séparément les phases transitoires cave, montée, destinations, travail, boutique (`shop`), descente. Aucune donnée économique ni objet Three.js n’est sérialisé dans ce contrôleur. Départ accepté seulement depuis Plinko stabilisé, avec zéro bille et écriture disponible ; arrêter alors le Doigt. Les autres interactions, raccourcis et nouveaux départs restent neutralisés jusqu’au retour.
Le trajet place d’abord la caméra devant les objets, dans l’axe des marches et à l’altitude de Plinko, puis la monte jusqu’à la trémie réelle. `CAVE`, `STAIRS` et `STAIR_LANDING` partagent les coordonnées du sol et des marches entre géométrie et trajet. Déduire la hauteur des yeux de la pose de départ par rapport au sol ; ne pas imposer une autre stature dans l’escalier. Une ligne de marche continue passe par les nez de marches et se raccorde au sol et au palier sans à-coup ; garder le même décalage de regard au-dessus de cette ligne. Le puits d’escalier et sa trémie sont dimensionnés pour cette hauteur. Le cadrage d’ensemble élargi conserve la hauteur des yeux de Plinko. L’approche répartit sa durée selon la longueur des segments avec accélération et freinage progressifs, pour rejoindre l’escalier latéral sans à-coup ; aucune oscillation de marche. Le fondu clôt la montée ; le dialogue natif de destinations apparaît seulement au noir complet. Retour par révélation du haut puis positions inverses jusqu’à Plinko. Le mode réduit emploie seulement un court fondu. L’onglet masqué arrête également les animations de trajet.
Le raccord au sol suit deux segments reliés par une courbe arrondie, avec une table de longueurs calculée au départ pour conserver la vitesse dans le virage. Le retour parcourt les mêmes positions mais dispose de 5,2 s au sol, contre 2,6 s au départ. Après la trémie, le regard découvre l’atelier arrière fermé ; il conserve cette orientation pendant les 0,6 premières secondes au sol, puis interpole ses angles pendant 2,2 s par le chemin le plus court pour viser le Plinko jusqu’à l’arrêt. Ne pas interpoler deux cibles mondiales éloignées en faisant passer la cible près de la caméra. Position et orientation rejoignent exactement le cadrage jouable, sans rotation brusque ni demi-tour final. Les durées et la pose restent transitoires.
La liste noire dispose du focus modal natif : Tabulation, Entrée/Espace, Échap pour redescendre. La visite publique d’Azur est proposée après la rencontre à la panne (`repairTriggered`) ; `Departure.visitAzur` refuse une visite avant rencontre ou hors destinations. Marceau et Matéo restent masqués. Aucun service n’est lancé par l’ouverture de la liste ou d’une visite. La sélection de l’usine appelle `Game.startFactory()` ; salaire et sauvegarde restent dans le moteur.

`rendering/shop.ts` conserve la boutique publique, son renderer chargé à la demande et réutilisé, et raccorde `rendering/shopWorkshop.ts` à sa porte existante. Le dialogue opaque contient le seul canevas visible ; cave et usine ne sont pas rendues. `navigation/shop.ts` gère uniquement les poses, trajets arrondis et phases de porte/verrou/étagère, sans dépendance Three.js ni économie. L’application transmet `repairPurchased` pour l’autorisation privée ; aucune modification des règles d’achat. La visite publique dépend toujours de `repairTriggered`.

Les groupes nommés réserve, passage et atelier occupent le même repère 3D, sans téléportation entre des scènes indépendantes. La porte pivote dans son dégagement ; l’étagère opaque coulisse dans sa poche latérale ; l’atelier n’est rendu que lorsque la porte et le passage sont ouverts. L’occultation géométrique protège également les vues publiques. Grouper les géométries statiques par matériau dans le repère local, en excluant les ancêtres interactifs et dynamiques ; roues, verrou et meuble gardent leurs transformations. Matériaux et primitives partagés, textures locales bois/tapis, patine procédurale ; ombres/occlusion et halo en qualité normale, rendu direct en qualité basse.

Caméras à 1,68 m, orientation par angles courts, vitesse lissée et trajet calculé par table de longueurs. Révélation séquentielle, entrée explicite et absence de file d’animations ; transitions immédiates en mouvement réduit. Rayons avec occultation et filtrage par vue, focus/survol identiques, indications attachées aux objets. Repères physiques et Échap ramènent au cadrage principal puis à la réserve, à la boutique et aux destinations. Mécanisme, vues et visite ne sont pas persistés : réinitialisation à chaque visite, reprise en cave selon le contrat existant. Toutes les horloges économiques restent suspendues, sans nouveau drapeau, format ou transaction. Les prototypes privés sont décoratifs et ne déclenchent aucun achat.
Dans la boucle principale, les horloges de cave avancent uniquement en phase cave autorisée. En phase travail, `Game.advance(..., 'factory')` avance uniquement la durée du service, sans consommer cadence manuelle ni Surchauffe. Montée, destinations et descente n’avancent aucune horloge économique. Service chargé : poste de travail 3D dans sa salle d’usine avec durée restante, score et billes conservés. Service terminé : destinations, jamais un nouveau service automatique. Retour : Doigt arrêté.
Les surfaces de `rendering/interfaces.ts` restent des maillages CanvasTexture avec zones de clic partageant leur transformation. Rayons soumis au cadrage, à la visibilité et à l’occultation ; Tabulation et survol offrent la même indication près de l’objet. Le DOM visible est limité au canevas dans la cave ; hors cave, un fondu plein écran et un dialogue noir présentent les destinations. Pendant le travail, ce dialogue contient uniquement le canevas du poste 3D, les descriptions invisibles et, en cas d’erreur, les commandes de récupération. Aucun panneau superposé à la cave.
Les modules 3D affichent seulement les achats existants. Aucune acquisition future ni modification du contrat de sauvegarde. Les pages, cadrages, focus et trajets restent transitoires ; les données de tri qui déterminent le salaire ont aussi une persistance économique.

## Tri d’usine et transactions
`game/packing.ts` contient désormais l’état sérialisable du tri, la création du poste, le calcul du salaire et l’avancée du flux, sans dépendance à Three.js. Un service neuf dure 60 000 ms. Arrivées toutes les 700 ms, durée de traversée 6 500 ms, quatre couloirs, hasard injecté et 23 % de rouges. L’horloge du service détermine les positions ; aucune animation ne décide du paiement.
`Game.hitFactoryBall(id)` vérifie écriture, service actif et identifiant encore présent. Grise : retire la bille et incrémente greyHits dans le même snapshot, sauvegardé avant publication. Rouge : status exploded, durée nulle et flux vide, sans crédit. Les gains en attente sont dérivés du score (50 centièmes par grise), jamais ajoutés progressivement au portefeuille. L’expiration passe à success, vide le flux et crédite solde et revenu d’usine dans une seule transaction ; tout nouvel appel est sans effet. Échec de sauvegarde : ancien état conservé et mutations suspendues.
Les checkpoints conservent ensemble temps restant, cadence et âge des billes. Un clic sauvegarde également ces valeurs exactes. Reprise/import : mêmes billes, score et durée, aucun revenu durant l’absence. Valider les entiers, bornes, types/couloirs, unicité et cohérence des âges/identifiants avec le temps actif ; les salaires cumulés sont des multiples de 50 centièmes. Les résultats du Plinko restent séparés.
Migration : accepter uniquement les formats 1, 2 et 3. Valider d’abord les contraintes historiques du 1 (service au plus 15 s, salaires multiples de 1 500), puis ajouter factory avec events vide et passer le numéro interne à 3. Un ancien service actif reçoit legacy=true : durée conservée et versement unique de 1 500 centièmes, mention explicite sur sa fiche. À sa fin, tous les services suivants sont du tri. Aucun nouveau service ne crée legacy ; aucune perte de solde, de résultat figé ou de préférence. Version future ou incohérence : refus sans écraser les données.
Événements : `planFactoryEvents` tire une fois l’ordre des trois variations et leurs horaires ; `Game.startFactory` sauvegarde ce plan avant publication. Aucun nouveau tirage au chargement. Les anciens snapshots du format 2 sont validés puis reçoivent events=[] : terminer ce service à cadence fixe, sans modifier son score ou ses billes, puis planifier les suivants.
`factoryClock` intègre les facteurs de tapis et de production sur la ligne du temps active ; `factorySpawnTime` inverse l’horloge de production pour retrouver la naissance d’un identifiant. `advanceFactory` utilise ces deux horloges pour les positions et arrivées, même si une image traverse le début ou la fin d’un événement. `ageMs` représente le temps de déplacement équivalent à vitesse normale, avec précision de 0,5 ms ; `spawnInMs` est le budget de production restant avant l’arrivée suivante, avec la même précision. Aucune téléportation ni dépendance à la fréquence d’image. Le service reste limité à 60 secondes réelles actives. Le tirage propose un couloir ; si une bille se trouve à moins de 600 ms de déplacement équivalent dans ce couloir, choisir le prochain libre parmi les quatre. Cela évite les superpositions en flux dense, sans changer le type, le nombre d’arrivées ou leur instant.
Le validateur contrôle les trois types distincts, les fenêtres d’apparition sans chevauchement, les demi-millisecondes, les âges et séquences cohérents avec le plan et l’horloge. Bornes conservatrices de séquence/occupation adaptées aux facteurs maximaux ×2. `factoryEventAt` dérive préavis/effet/temps restant depuis le plan et le temps sauvegardés : aucun compteur d’événement concurrent. Pauses, erreurs d’écriture et concurrence d’onglets conservent les mêmes règles transactionnelles.
`rendering/factory.ts` conserve la salle d’origine, son cadrage, les étagères, l’établi et le carton. Les maillages des billes suivent l’état économique, y compris après chargement ; les grises acceptées rejoignent le carton par un arc transitoire. Une rouge acceptée déclenche une explosion en vue subjective, courte et sans flash ; mouvement réduit : fiche de résultat sans particules. Les règles, le temps et le salaire en attente figurent sur les fiches CanvasTexture. Souris et Tabulation/Entrée/Espace appellent la même transaction ; refus des clics cachés, expirés ou répétés. Survol et focus montrent la même indication ancrée, seulement tant que l’objet est ciblé.
Seul le poste actif, visible et autorisé à écrire reçoit les clics et avance. Les particules/arcs sont transitoires, sans accès économique, et se figent en pause. Le canevas est créé au premier service puis réutilisé ; la cave n’est pas rendue sous le dialogue opaque. Fin du service : destinations ; explosion : brève réaction puis destinations. Rechargement d’une partie déjà terminée/perdue : cave, sans second paiement.

## Vérifications
Tester le tirage avec un générateur injecté, les transactions, les 50 billes, les bonus, l'usine, la reprise, la panne unique et l'import.
Mesurer la fluidité réelle de 50 billes ; une limite d'images par seconde n'est pas un modèle économique.
