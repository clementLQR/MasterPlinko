# MasterPlinko — améliorations et progression

## Ressources proposées
| Ressource | Utilisation |
| --- | --- |
| Pièces | Mises, réparation et améliorations ordinaires |
| Résidus | Recherches et produits de Marceau |
| Échos | Améliorations permanentes après recalibrage |

Les noms Résidus, Échos et Recalibrage sont des propositions de travail. Éviter d'ajouter d'autres monnaies avant d'avoir un besoin distinct.

## Azur : production et automatisation
### Acheter un plan, puis l’installer
Le livre de l’établi de la cave est retiré. Après la panne, sortir par l’escalier et rendre visite à Azur : le **devis au comptoir public** vend la réparation pour **25 pièces**, installée dès le paiement (zéro bille en cours). Décision du créateur du 19 octobre 2026 : la trappe de montage est supprimée, chaque achat installe directement l’amélioration.

La réparation ouvre l’atelier privé d’Azur, dès la même visite. Un clic sur la porte derrière le comptoir enchaîne automatiquement réserve, ouverture du passage et entrée ; depuis la vue principale, la plaque Maison ou Échap ramène directement à la cave, la plaque Boutique dans la boutique. Dans son carnet feuilletable, acheter les plans du **Doigt mécanique (40 pièces)**, du **Bac comptable (15 pièces)**, des **Aimants (200 pièces)** et du **Collecteur de ratés (120 pièces)** sur leurs doubles pages : ils sont installés dès l’achat. Consultation et feuilletage restent gratuits ; les études futures et essais DEV restent sans achat ni prix inventé. Aucun achat d’appareil ordinaire ajouté dans la boutique.

Chaque achat est atomique, unique et installe le module ; les plans payés non montés des anciennes sauvegardes sont installés au chargement sans nouveau débit. Les anciens modules restent installés, sans repayer. Le format actuel est **6**, migration des formats 1/2/3/4/5 ; détails de validation au fichier 10.

### Modules uniques
| Module | Effet |
| --- | --- |
| Réparation initiale | Remettre en service la machine après la panne |
| Doigt mécanique | Lancer automatiquement de petites billes gratuites |
| Bac comptable | Afficher résultats et bénéfices |
| Aimants | Attirer une bille automatique vers une case voisine plus avantageuse après une recharge de 5 secondes ; décalage d’une seule case, aucun effet sur ×40 ; plan achetable à 200 pièces, réparation et Doigt installés requis |
| Collecteur de ratés | Dix sorties sous ×1 de billes manuelles/Doigt offrent une bille gratuite de base 1 ; plan achetable à 120 pièces, réparation installée requise |
| Condensateur de poche | 150 pièces après réparation : jusqu’à deux charges de Décharge stockées ; implémenté (MP-041) |
| Boîte de vitesses | 100 pièces avec le Doigt : régulier (1 bille / 2 s) ou rafales (3 billes / 6 s), même production moyenne ; implémentée (MP-042) |
| Module numérique | Offert au premier recalibrage ; terminal de téléchargements permanents payés en pièces ; implémenté (MP-044) |
| Module de billes spéciales | Débloquer une famille de billes |
| Duplicateur | 300 pièces : une bille sur 20 finissant sur un gain est payée deux fois ; ouvre la faille du recalibrage ; résidus encore à venir |
| Compteur d'instabilité | Rendre lisible la préparation du recalibrage |

Le compteur d'instabilité remplace la proposition initiale de mesure d'addiction : il relie mieux le système au mystère.

### Aimants — effet demandé par le créateur
L’effet concerne uniquement les **billes automatiques** : attirer la bille vers une case immédiatement voisine portant un multiplicateur supérieur, avec un seul décalage d’une case. Les billes manuelles ne sont pas affectées. Une bille destinée à **×40 conserve sa sortie et son paiement**, sans attraction.

Le créateur propose une activation **toutes les 5 secondes**, cadence retenue comme réglage initial à tester ; elle remplace l’ancienne sélection d’une bille sur quatre. Il autorise l’interprétation proposée : recharge de 5 secondes de jeu actif, puis attraction disponible pour le prochain lancement automatique, sans cumuler plusieurs activations en attente. L’effet est décidé au lancement, jamais appliqué rétroactivement à une bille en cours. Avec le Doigt actuel lançant toutes les 2 secondes, l’activation se produit normalement toutes les **6 secondes**, en commençant au troisième lancement ; les billes ×40 peuvent repousser l’activation.

Exemple confirmé : une bille destinée à **×0,3** est attirée dans une des cases adjacentes **×0,5** ; son retour est calculé avec **×0,5**. Pour une bille automatique de base 1 pièce hors Surchauffe, le retour passe ainsi de 0,30 à 0,50 pièce. L’animation doit montrer cette attraction et rejoindre la case effectivement payée.

**Acquisition normale :** prix fixé par le créateur à **200 pièces**. Acheter le plan `azur.magnets` dans le carnet d’Azur, puis l’installer sur le Plinko ; réparation et Doigt déjà installés requis. Fonctionne en jeu normal et en production. Un prêt de développement facultatif reste disponible sans achat : Activer `VITE_MAGNETS_TRIAL=1` au démarrage du serveur Vite ; l’essai reste inactif dans le build de production, même avec cette variable. Nécessite la réparation initiale et le Doigt déjà achetés. Le prêt DEV ne crée aucune possession ; le prix normal reste 200 pièces. Commandes exactes dans le README.

**Règles du module :** au centre, choisir le voisin gauche ou droit à 50/50 ; ailleurs, seule la case extérieure immédiatement voisine porte un multiplicateur supérieur. Une bille ×40 ne consomme pas l’activation prête. La recharge commence à 5 secondes et repart de cette durée après une attraction enregistrée. Elle avance seulement quand le jeu et le Doigt sont actifs ; arrêt du Doigt, panne, onglet masqué, sorties, boutique, usine et pauses de jeu la suspendent. Au plafond de 50 billes, garder une seule activation prête ; un refus de lancement ne consomme rien.

**Prix confirmé : 200 pièces. Prérequis conservés : réparation et Doigt installés.** La cadence de 5 secondes est un point de départ, pas un équilibrage déjà validé par une session utilisateur.

Le résultat reste déterminé au lancement : tirer avec les poids existants, puis résoudre l’éventuelle attraction avant de figer la sortie, le multiplicateur et le retour final. Sauvegarder l’ancienne sortie dans `magnetFrom` uniquement si elle a changé, avec consommation de la recharge dans la même transaction. L’animation modifie le dernier des quatorze rebonds avant les séparateurs, sans téléportation ni paiement décidé par le rendu. Rail 3D avec commande, affichage de recharge et indication au survol/focus ; effet visuel limité à la bille concernée, sans trait lumineux en mouvement réduit.

Extension additive du format 3 : `magnetCooldownMs`, borné de 0 à 5 000, et `magnetFrom` optionnel dans les billes/historiques. Une ancienne sauvegarde sans recharge commence à 5 000 ; un résultat magnétique déjà figé reste payé une seule fois même après désactivation de l’essai. Le choix d’activation n’est pas enregistré dans la sauvegarde. Aucun rattrapage hors ligne ni nouveau tirage à la reprise ; Doigt toujours arrêté au chargement/import.

**Impact théorique de l’essai**, hors Surchauffe, avec le Doigt actuel, sans arrêt ni plafond : la production moyenne passe d’environ 0,5975 à **0,7618 pièce par bille gratuite**, soit environ +27,5 %. Ce calcul tient compte des deux billes ordinaires entre les activations et de l’activation conservée sur ×40. Ce n’est pas un taux de retour sur une mise payée ; les billes manuelles et leurs poids restent inchangés. Le rythme réel reste à évaluer en jouant.

### Trois améliorations supplémentaires retenues
Le créateur retient ces trois concepts ; le Collecteur, le Condensateur et la Boîte sont implémentés. Réglages du Condensateur et de la Boîte choisis par le créateur le 20 octobre 2026.

| Amélioration | Effet retenu | Support envisagé |
| --- | --- | --- |
| Collecteur de ratés | Les sorties au multiplicateur inférieur à ×1 remplissent progressivement un réservoir. Une fois plein, il offre une bille gratuite. | Petit bac avec réservoir et tube de remontée |
| Condensateur de poche | Stocker jusqu’à deux charges de Décharge, pour choisir le moment de leur utilisation. | Condensateur avec deux voyants de charge |
| Boîte de vitesses | Régler le Doigt sur un rythme régulier ou de petites rafales, sans augmenter sa production moyenne. | Levier mécanique de sélection du rythme |

Les supports appartiennent aux objets 3D sans HUD.

**Condensateur de poche** (`azur.capacitor`, **150 pièces**, réglage choisi par le créateur le 20 octobre 2026) : vendu chez Azur après la réparation, installé dès l’achat. La Surchauffe stocke jusqu’à **deux charges** de Décharge : une fois la première prête, le comptage continue vers la seconde (100 règlements par charge). Chaque activation consomme une charge pour ×2 pendant 10 s ; pendant un bonus, ni comptage ni seconde activation : aucun cumul, facteur inchangé. La progression vers la charge suivante est conservée à l’activation. Deux voyants sur un boîtier lavande à gauche du bouton de Décharge, aucun HUD.

**Boîte de vitesses** (`azur.gearbox`, **100 pièces**, réglage choisi par le créateur le 20 octobre 2026) : vendue chez Azur avec le Doigt installé, installée dès l’achat. Levier physique à deux positions sur la machine : **régulier** (une bille toutes les 2 s) ou **rafale** (3 billes à 0,25 s d’écart toutes les 6 s), soit 0,5 bille/s dans les deux cas. Première bille 2 s après la mise en marche ; le changement de mode fait repartir la cadence de zéro. Au plafond de 50, une bille de rafale refusée est sautée, jamais mise en file. Mode `gearMode` sauvegardé ; aimants, Collecteur et Décharge inchangés.

Impact : le Condensateur ne change pas le retour moyen ; il permet de garder une charge pour un moment choisi. La Boîte ne change pas la production moyenne. Suivi MP-040 à MP-042.

### Collecteur de ratés — règles et acquisition
Le créateur approuve : **10 billes terminant sous ×1 remplissent le réservoir**, puis une **bille gratuite de base 1 pièce** est offerte. Les manuelles et celles du Doigt contribuent ; les billes du Collecteur ne le rechargent jamais. Conserver **une seule récompense en attente** si les 50 places sont occupées. **Prix fixé par le créateur : 120 pièces.** Acheter le plan `azur.collector` dans le carnet d’Azur après réparation installée, puis le monter sur le Plinko sans nouveau débit ; Doigt facultatif. Actif aussi en production. Prêt DEV facultatif conservé via `VITE_COLLECTOR_TRIAL=1` avec garde DEV. Les deux essais Collecteur/aimants sont indépendants et peuvent coexister.

L’admissibilité est figée au lancement par `collectorEligible: true`. Au règlement, une sortie finale inférieure à ×1 ajoute un point dans la même transaction que le paiement. Une attraction des aimants est donc prise en compte avant ce critère ; le facteur de Décharge ne change pas le multiplicateur de sortie utilisé. Aucun effet rétroactif sur les billes lancées avant l’essai. Réservoir borné à 10 : les contributions supplémentaires pendant qu’une récompense attend ne s’accumulent pas.

Dès qu’une place est disponible pendant le jeu actif, lancer la récompense avant le prochain départ du Doigt, sans débit et sans utiliser la mise choisie. Consommer le réservoir dans la même transaction que le résultat figé de la nouvelle bille, origine `collector`. Même tirage de base et bonus figé au lancement ; elle contribue une seule fois à la Surchauffe, mais ni au réservoir ni aux aimants. Arrêt du Doigt sans incidence sur le Collecteur ; pauses, onglet masqué, usine et scènes bloquantes suspendent ses nouveaux lancements.

**Collecteur introduit au format 4**, repris au format actuel 6 ; migration des formats 1/2/3/4/5, charge initialisée à zéro seulement avant le format 4, sinon conservée sans recalculer les gains. `collectorCharge` de 0 à 10, origine `collector` et admissibilité optionnelle validées. Réconcilier les contributions déjà figées sans nouveau tirage ni lancement ; la récompense attend le retour au jeu actif avec Collecteur installé ou prêt DEV activé. Désactivation de l’essai : conserver le réservoir et régler les récompenses déjà lancées une seule fois. L’acquisition normale est enregistrée ; aucune activation d’essai persistée ni revenu hors ligne.

Réservoir 3D transparent avec dix billes témoins, boîtier crème/sauge, compteur physique et tube de remontée ; cadrage de lecture au clic/focus, retour physique ou Échap. Billes offertes lavande et mention « COLLECTEUR » dans le résultat et le ticket. La lecture du plan ne débloque rien. Collecteur seul, hors bonus, sans saturation : en moyenne 0,084 bille offerte par bille ordinaire et environ **0,05019 pièce supplémentaire** par bille ordinaire ; calcul théorique, sans garantie de revenu ni validation du rythme par le créateur.

### Billes spéciales — Ressort de deuxième chance
**Classement confirmé par le créateur :** le **Ressort de deuxième chance** devient un type de bille appartenant à la famille des billes spéciales, distinct des améliorations de machine ci-dessus.

Effet retenu : cette bille peut effectuer un second passage dans le plateau. Le premier passage ne rapporte rien ; seul le résultat final est payé. Le taux d’activation du second passage, son déclenchement et l’obtention de cette bille restent à définir. Une rampe de retour et un ressort compressé sont des pistes visuelles pour rendre cet effet compréhensible, sans imposer un nouveau module à acheter.

Le futur contrat devra conserver un résultat déterminé au lancement, les passages nécessaires à son animation et un paiement final unique, y compris au chargement ou après import. Aucun hasard économique ne sera décidé par une collision visuelle. Les règles de mise, base, capacité, Surchauffe et interactions avec les autres modules restent à préciser avant développement. Suivi dans MP-020 ; aucune bille spéciale ni modification de sauvegarde ajoutée pour cette décision documentaire.

### Améliorations à niveaux
- Graisse ambitieuse : cadence de lancement.
- Limiteur délimité : mise maximale.
- Ventilation financière : durée de Surchauffe.
- Modules de rendement : production et multiplicateurs.
- Modules de rareté : fréquence des billes spéciales.

Définir des limites pour éviter un nombre ingérable de billes et d'effets.

### Module numérique et améliorations téléchargeables
**Module numérique** (MP-044) : offert par le premier recalibrage, terminal mural à droite de la machine avec cadrage `numerique`. On y feuillette le catalogue et on télécharge instantanément en payant en pièces : **seule exception** validée par le créateur à la règle « aucune vente dans la cave ». Téléchargements permanents, conservés aux recalibrages : **Mémoire de mise** (30 pièces : la mise descend au plus haut possible quand le solde manque, puis revient à la mise choisie), **Décharge auto** (60 : activation dès qu’une charge est prête, tant que le Doigt tourne), **Aimants 2.0** (120 : recharge 4 s au lieu de 5, Aimants installés requis à l’achat), **Surchauffe rapide** (150 : une charge en 80 billes au lieu de 100, ×2 et durée inchangés).

Support envisagé : boîtier électronique avec petit écran à pixels et boutons physiques, dans le style crème/pastel d’Azur. Le catalogue des téléchargements appartient à ce support 3D, avec indications au survol/focus, sans HUD. Forme et emplacement définitifs restent à préciser.

**À définir :** prix et déblocage du module ; améliorations proposées, effets, coûts et prérequis ; installation, niveaux éventuels, limites et cumuls avec les modules physiques ; présentation du téléchargement et contrat de sauvegarde. L’habillage de téléchargement ne suppose pas de serveur ni de compte : le périmètre actuel reste local.

Texte possible : « Mise à jour : le bouton Quitter ne commande plus de pièces détachées. » Séparer cet habillage des effets réels, qui devront être explicités avant chaque installation. Une mise à jour ne doit pas prétendre corriger un faux bug nécessaire à la jouabilité.

**Statut :** module et branche logicielle documentés pour plus tard, suivi MP-044 ; aucun téléchargement, achat ou effet implémenté et aucun changement des règles ou sauvegardes actuelles.

## Marceau : effets temporaires
| Produit | Effet proposé |
| --- | --- |
| Télékinésine | Sauver les prochaines billes destinées à une sortie perdante |
| Jus de demain | Accélérer temporairement la production |
| Stabilisateur approximatif | Réduire la variance |
| Concentré de presque | Récompenser les résultats proches d'un jackpot selon une règle à définir |

Préférer parfois une durée en nombre de billes à une durée en secondes.
Documenter les règles de cumul, les exclusions et la consommation.
Effets secondaires surtout visuels, sans rendre le résultat illisible.

## Matéo : porte-bonheur
Objets équipables avec un nombre d'emplacements limité.
Exemples de pistes :
- Bouchon de compétition : rendement régulier.
- Caillou statistique : avantage sur un type de résultat.
- Chaussette officielle : protection limitée contre certaines pertes.
- Trèfle administratif : interaction avec les gros gains.

Ces effets sont à concevoir : les noms ne constituent pas des règles finalisées.
Créer des compromis pour éviter que tous les objets soient de simples multiplicateurs cumulables.

## Recalibrage
**Duplicateur** (`azur.duplicator`, **300 pièces**, décision du créateur du 20 octobre 2026) : vendu chez Azur après la réparation (page 9 du carnet), installé dès l’achat, armoire au pied gauche de la machine. Une bille sur 20 finissant sur ×1,5 ou plus est **payée deux fois** ; le tirage est fait au lancement avec le résultat (champ `duplicated`, retour figé doublé), jamais après. Il **ouvre une faille spatio-temporelle** : le Compteur d’instabilité apparaît et se remplit avec **1 000 pièces de retours bruts du Plinko** depuis l’achat.

**Recalibrage, première version** (décision du créateur du 20 octobre 2026) : possible quand la faille est pleine, sans bille en vol, bonus en cours ni service. Le bouton RECALIBRER du compteur affiche d’abord sur son écran ce qui est **perdu** (solde ramené à 19 pièces, améliorations sauf la réparation, Surchauffe, réservoir du Collecteur, mise et rythme du Doigt), **conservé** (réparation et accès à Azur, historique du Bac, statistiques cumulées, réglages, téléchargements) et **gagné** (au premier recalibrage, le module numérique offert). Confirmer ou annuler (Échap) ; le temps de jeu est suspendu pendant la décision. Le Duplicateur est perdu : il faut le racheter pour rouvrir la faille. Pas d’Échos pour l’instant.

La suite (Échos, permanents, lien avec l’histoire) reste la vision ci-dessous.

La machine est réinitialisée mais conserve des Échos des événements possibles.

**Réinitialisé, proposition :** pièces, niveaux ordinaires, production de la session.
**Conservé :** histoire, personnages, collections, options, Échos et achats permanents.
**À définir :** consommables, résidus, équipements et contenu du chalet.

L'histoire ne recommence pas à chaque cycle.
Afficher avant validation ce qui sera perdu, conservé et gagné.

### Permanents possibles
- Démarrage plus rapide.
- Emplacement de grigri supplémentaire.
- Automatisation avancée.
- Nouvelles familles d'améliorations.
- Souplesse de gestion de la Surchauffe.

La formule de gain d'Échos reste ouverte. Éviter une réinitialisation rentable toutes les quelques secondes.

## Exemple de synergie, à tester
Plateau Audacieux + protection limitée de Télékinésine + objet améliorant les gros gains.
Vérifier que la protection ne supprime pas entièrement le coût du risque.

## Paramètres actuels du prototype
Les plans sont rassemblés dans un **carnet 3D feuilletable posé sur le bureau** de l’atelier caché d’Azur, choix confirmé par le créateur. Douze doubles pages présentent réparation, Doigt mécanique, Bac comptable, aimants, Collecteur de ratés, Condensateur de poche, Boîte de vitesses, module numérique, Duplicateur, Compteur d’instabilité, billes spéciales et autres réglages envisagés (graisse, limiteur, ventilation, rendement et rareté). Chaque double page comporte un schéma à gauche et ses effets/annotations à droite ; le Ressort de deuxième chance est présenté dans la famille « Billes spéciales ».

Cliquer le carnet rapproche la caméra. Ses coins permettent de tourner les pages, comme les flèches gauche/droite ou Tabulation/Entrée/Espace ; le signet de retour ou Échap ramène à l’ensemble de l’atelier. La feuille tourne en 3D, recto verso ; mouvement réduit : changement immédiat. La page reste consultée pendant cette visite et revient au début à la suivante. Aucun achat, effet économique ou déblocage des projets futurs par la lecture.

Les trois améliorations sont uniques, sans niveaux :
| ID | Nom | Prix de test | Condition et effet |
| --- | --- | --- | --- |
| azur.initial_repair | Réparation initiale | 25 pièces | À la panne de test (50 pièces de retours cumulés), remet en marche et ouvre l'atelier |
| azur.auto_launcher | Doigt mécanique | 40 pièces | Après réparation ; produit une bille gratuite de base 1 toutes les 2 secondes |
| azur.accounting_tray | Bac comptable | 15 pièces | Après réparation ; ouvre les 100 derniers résultats avec origine, mise/base, multiplicateurs, retour et net |
| azur.magnets | Aimants | 200 pièces | Réparation et Doigt installés ; achat chez Azur, installé immédiatement |
| azur.collector | Collecteur de ratés | 120 pièces | Réparation installée ; achat chez Azur, installé immédiatement, Doigt facultatif |

Le solde, la mise et le dernier résultat restent visibles avant l'achat du Bac comptable.
Panne unique et aucune perte de bille. L'usine reste accessible pendant la panne.
Ces prix accélèrent l'évaluation du prototype ; ils ne remplacent pas le prix narratif envisagé de 1 000 pièces.
Les autres améliorations et monnaies restent à développer. Aimants et Collecteur sont désormais des modules achetables aux prix confirmés par le créateur ; les prêts DEV restent facultatifs pour les essais.
