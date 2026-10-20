# MasterPlinko — spécification du jeu

## Autorité et périmètre
Ce fichier fixe les règles implémentables du développement initial. Les choix du créateur sont fermes ; les paramètres proposés ci-dessous sont une première configuration à tester.
Objectif : une boucle de 10 à 15 minutes, jolie et jouable en localhost, réalisée par l'IA avec code et 3D procédurale.
Ce document ne prétend pas que la partie a déjà été testée.

## 1. Choix confirmés
- Navigateur sur ordinateur.
- Vite, TypeScript, Three.js, HTML/CSS.
- Résultat déterminé avant la chute.
- Solde initial 19 pièces, mise initiale 1, choix entiers de 1 à 10.
- Multiplicateurs x0,3 / x0,5 / x1 / x1,5 / x3 / x5 / x10 / x40.
- Maximum 50 billes en cours, tous types confondus.
- Usine pour récupérer de l'argent.
- Réparation initiale, Doigt mécanique, Bac comptable.
- Sauvegarde locale avec export/import.
- Développement versionné et essais localhost.
- Navigation par cadrages prédéfinis dans la pièce : Plinko et établi dans le développement initial ; pas de déplacement libre.
Rapier faisait partie des outils envisagés : il est différé pour le développement initial car la chute sera animée et contrôlée.

## 2. Configuration proposée
| Paramètre | Valeur de départ |
| --- | --- |
| Intervalle manuel minimum | 0,5 seconde |
| Durée visuelle d'une chute | 3 à 4 secondes |
| Première panne en mode prototype | 50 pièces de retours bruts du Plinko |
| Réparation initiale | 25 pièces |
| Doigt mécanique | 40 pièces |
| Cadence automatique | Une bille toutes les 2 secondes |
| Base d'une bille gratuite | 1 pièce |
| Bac comptable | 15 pièces |
| Historique | 100 résultats |
| Usine | 60 secondes actives ; 0,50 pièce par grise cliquée, tout perdu sur une rouge |
| Charge de Surchauffe | 100 billes réglées |
| Bonus | Retours x2 durant 10 secondes actives |
| Charges stockables | 1 |
| Taille de fenêtre cible minimale | 1280×720 |

Les valeurs histoire (panne à 1 234, réparation envisagée à 1 000) restent documentées, mais ne sont pas actives dans ce profil prototype.
Ne pas créer de bascule de profil dans l'interface de jeu. Centraliser les constantes pour une évolution ultérieure.

## 3. Probabilités
À la demande du créateur, renforcer nettement les pertes. Les valeurs ci-dessous remplacent la distribution initiale dont le retour moyen était de 1,06 fois la mise ; elles constituent le nouveau réglage de départ à évaluer en jouant.

| Multiplicateur | Poids sur 1 000 | Probabilité |
| --- | --- | --- |
| x0,3 | 600 | 60 % |
| x0,5 | 240 | 24 % |
| x1 | 100 | 10 % |
| x1,5 | 35 | 3,5 % |
| x3 | 15 | 1,5 % |
| x5 | 6 | 0,6 % |
| x10 | 3 | 0,3 % |
| x40 | 1 | 0,1 % |

Somme 1 000. Hors Surchauffe, 84 % de retours inférieurs à la mise, 10 % de remboursements et 6 % de gains nets. Retour moyen théorique : 0,5975 fois la mise (59,75 %) ; perte nette moyenne : 40,25 % de la mise. Pour 100 pièces misées au total, retour moyen théorique de 59,75 pièces, sans garantie pour une session donnée.
Le tirage ne dépend pas du solde, des pertes passées, des achats ou d’une promesse de gain. Aucun ajustement caché ni compensation après une série de pertes. Un gros gain n’est jamais garanti. Utiliser les mêmes poids pour le manuel et l’automatique ; pour ce dernier, la base reste 1 pièce sans débit.
Les multiplicateurs, les quinze sorties et le partage gauche/droite à 50/50 restent les mêmes. Appliquer les nouveaux poids aux prochains lancements uniquement : conserver tous les résultats et retours déjà figés dans les sauvegardes, sans changer le format ni réinitialiser la progression.

## 4. Plateau et trajectoires
15 sorties de gauche à droite :
x40 ; x10 ; x5 ; x3 ; x1,5 ; x1 ; x0,5 ; x0,3 ; x0,5 ; x1 ; x1,5 ; x3 ; x5 ; x10 ; x40.
Tirer d'abord la catégorie de multiplicateur. Pour une catégorie présente deux fois, choisir gauche/droite à 50/50.
Ne pas appliquer la probabilité entière à chacune des deux sorties : cela doublerait la fréquence.

Chemin proposé : 14 décisions gauche/droite ; pour atteindre l'index k (0 à 14), utiliser k décisions droites et 14-k décisions gauches, dans un ordre aléatoire.
Adapter la position des picots et la trajectoire aux mêmes coordonnées ; ajouter des arcs courts et des rebonds crédibles.
Le plateau remplit l'essentiel de la machine : grille rectangulaire de picots métalliques en quinconce, entrée centrale visible, rebords latéraux et quinze compartiments distincts. Le chemin utilise les picots compatibles avec ses 14 décisions ; les autres picots complètent visuellement la grille. Les billes doivent toucher visuellement les picots, dégager les cloisons et finir dans le compartiment payé. Son inscription et son éclairage réagissent brièvement après règlement réussi ; sons discrets de contacts et de réception, désactivables.
Ne jamais téléporter la bille vers la sortie à la dernière seconde, traverser un picot visiblement ou afficher un multiplicateur différent du résultat payé.

## 5. Argent et lancement
Monnaie en centièmes entiers : solde initial 1 900.
Mises 100 à 1 000, par pas de 100.
Multiplicateurs représentables en centièmes : 30, 50, 100, 150, 300, 500, 1 000, 4 000.
Retour = base × multiplicateur / 100 × facteur de bonus, avec arrondi documenté au centième si nécessaire.
Les bases entières proposées produisent des retours exacts.

Manuel : base = mise, débit immédiat.
Automatique : base 100, débit nul.
Le facteur de Surchauffe (1 ou 2) est figé au lancement, comme le retour final.

Refuser avant débit si :
- Fonds insuffisants pour le manuel.
- 50 billes déjà en attente.
- Machine en panne, service d'usine ou sauvegarde indisponible.
- Intervalle manuel non écoulé.
Aucun double clic ne doit contourner ces conditions.

## 6. Panne et atelier
À partir de 5 000 centièmes de retours bruts cumulés :
1. Enregistrer repairTriggered une seule fois.
2. Bloquer les nouveaux lancements.
3. Laisser les billes déjà en cours se régler.
4. Montrer le court message d'Azur et la réparation disponible.
5. Acheter la réparation au comptoir public d’Azur, une fois les billes restantes réglées : elle est installée dès le paiement.

Réparation achetée : installée dans la même transaction, machine utilisable, atelier privé ouvert pendant la même visite, cette panne désactivée définitivement. `repairPurchased` désigne la réparation payée et installée (décision du créateur du 19 octobre 2026 : plus d’étape de montage).
L'usine reste accessible pendant la panne.
Aucun compte à rebours ne doit faire repayer une réparation.

## 7. Cinq améliorations
| Identifiant | Achat | Condition | Effet |
| --- | --- | --- | --- |
| azur.initial_repair | 25 pièces | Panne déclenchée ; zéro bille en cours | Réparer et ouvrir l'atelier dès l’achat |
| azur.auto_launcher | 40 pièces | Réparation installée | Ajouter marche/arrêt dès l’achat |
| azur.accounting_tray | 15 pièces | Réparation installée | Consulter les 100 derniers résultats dès l’achat |
| azur.magnets | 200 pièces | Réparation et Doigt installés | Attirer périodiquement une bille automatique vers une case voisine supérieure |
| azur.collector | 120 pièces | Réparation installée | Dix sorties sous ×1 donnent une bille gratuite de base 1 |

Le livre de l’établi de la cave est supprimé, ainsi que sa vue et ses interactions d’achat. Acheter les plans exclusivement chez Azur : devis physique sur le comptoir public pour la réparation, puis zones d’achat dans les cinq premières doubles pages du carnet de l’atelier privé. Les autres pages restent des études sans achat, prix inventé ou activation des essais DEV. Consulter ou feuilleter n’achète rien.

L’achat débite une fois le prix existant et ajoute directement l’identifiant à `upgrades` dans la même transaction sauvegardée : le module fonctionne dès le retour dans la cave. La **trappe de montage est supprimée** (décision du créateur du 19 octobre 2026, étape jugée de trop) ; `plans` reste vide. Un module installé ne peut être racheté. La réparation exige zéro bille en cours. La visite d’Azur suspend les horloges comme avant. Les anciens modules restent installés après migration ; un plan payé mais non monté d’une sauvegarde 5 ou 6 est validé puis installé au chargement, sans nouveau débit ni changement de format.

Chaque achat est unique. Achat refusé sans fonds.
Le dernier résultat, le solde et la mise sont toujours disponibles.
Les Aimants/Collecteur ne sont visibles et actifs qu’après leur achat, hors prêts de développement explicitement activés.
Historique conservé dès le début mais consultable seulement avec le Bac.
Historique : origine, mise débitée, base, multiplicateur, bonus, retour et net. Le net d'une bille gratuite égale son retour.

### Aimants : amélioration achetable
Mécanique demandée et implémentée pour les essais : attraction des **billes automatiques uniquement**, vers une case immédiatement voisine au multiplicateur supérieur, avec **un seul décalage d’une case**. Exemple : sortie prévue **×0,3 → sortie payée ×0,5**. Aucun effet sur les billes destinées à **×40**, ni sur les billes manuelles. Le prix du plan est fixé par le créateur à **200 pièces**. La recharge de **5 secondes** remplace la sélection d’une bille sur quatre ; après ce délai, agir sur le prochain lancement automatique. Une seule activation disponible, sans accumulation. Avec le Doigt actuel, première attraction à 6 secondes et normalement une toutes les 6 secondes ensuite.

Acheter `azur.magnets` chez Azur pour **20 000 centièmes** : réparation et Doigt installés requis, installation immédiate. Le module est visible et actif en jeu normal et en production dès l’achat. Le prêt d’essai DEV reste facultatif via `import.meta.env.DEV && VITE_MAGNETS_TRIAL=1`, sans possession ajoutée. Les anciens essais ne donnent aucun module gratuit. Suivi MP-039/MP-047.

Au centre, gauche/droite à 50/50 ; une bille ×40 conserve la sortie et l’activation prête. Recharge initiale de 5 secondes, redémarrée uniquement après une attraction sauvegardée ; elle avance seulement avec le Doigt et le temps de jeu actifs, hors panne/usine. Conserver son temps restant lors des pauses et à la reprise ; au plafond, attendre sans empiler les activations. Le refus ou l’échec de sauvegarde d’un lancement ne consomme pas la recharge. Automatisation toujours arrêtée au chargement/import/retour de l’usine.

Conserver les poids du tirage, puis appliquer l’éventuelle attraction avant de figer la sortie, le multiplicateur, le bonus et le retour. `magnetFrom` optionnel conserve la sortie tirée ; le dernier rebond montre la déviation avant les séparateurs sur la même grille. Le rail 3D affiche la recharge, avec survol/focus sans HUD. Mouvement réduit : trajectoire cohérente sans trait lumineux. Historique et dernier résultat marquent les billes attirées. Extension additive au format 3 : `magnetCooldownMs` entre 0 et 5 000, valeur initiale 5 000 pour les anciens snapshots ; valider le déplacement d’une case vers un multiplicateur supérieur et l’origine automatique. Aucune activation d’essai sérialisée ; les paiements déjà figés sont conservés même sans essai. Impact théorique et limites au fichier 05 ; valider le rythme en session utilisateur.

### Collecteur de ratés : amélioration achetable
Réglages approuvés par le créateur : dix sorties finales sous ×1 de billes manuelles ou du Doigt remplissent le réservoir ; une bille gratuite de base 100 centièmes, sans débit ni utilisation de la mise sélectionnée. Ses propres billes ne rechargent pas le Collecteur. Une seule récompense en attente au plafond de 50 billes, réservoir saturé à 10 sans file supplémentaire. Le créateur fixe le plan `azur.collector` à **120 pièces (12 000 centièmes)** : achat dans le carnet après réparation installée, installé dès le paiement. Doigt facultatif ; module actif en production dès l’achat. Le prêt DEV facultatif via `VITE_COLLECTOR_TRIAL=1` reste indépendant des Aimants et n’est pas un achat.

Figer `collectorEligible: true` au lancement des manuelles/Doigt admissibles ; créditer un point au règlement avec le paiement, seulement si le multiplicateur final est inférieur à 100. Les aimants peuvent modifier ce critère, la Décharge ne le modifie pas. Réconcilier les contributions déjà figées même après désactivation, sans nouveau tirage ni lancement. Dès qu’une place se libère en jeu actif, lancer la récompense avant le Doigt et remettre le compteur à zéro dans cette même transaction sauvegardée. Un refus ou un échec d’écriture ne consomme rien. Origine `collector`, même distribution, bonus figé et règlement unique ; pas d’attraction ni de contribution à son propre réservoir, contribution ordinaire à la Surchauffe. Les pauses, sorties, scènes bloquantes et service d’usine suspendent ce lancement ; l’arrêt du Doigt seul ne le suspend pas.

Collecteur introduit au format 4, conservé au format actuel 6 avec migration des formats 1/2/3/4/5 : réservoir initialement nul pour les formats antérieurs à 4, résultats antérieurs préservés ; `collectorCharge` entier de 0 à 10, nouvelles origines et contributions validées. Une récompense déjà lancée est réglée une fois, même sans essai ; une récompense en réserve reste en attente sans module installé ni prêt DEV. Module 3D et cadrage `collecteur` pour lire le compteur, survol/focus et retour physique/Échap sans HUD ; billes lavande, origine lisible dans historique et dernier résultat. Détail et impact théorique au fichier 05, suivi MP-040.

### Autres concepts futurs retenus
Le créateur retient **Condensateur de poche**, stockage d’une deuxième charge de Décharge, et **Boîte de vitesses**, rythme régulier ou rafales du Doigt avec la même production moyenne. Suivi MP-041 à MP-042. Seuls ces principes sont retenus : prix, déblocages, seuils, rythmes, interactions et persistance restent à définir aux fichiers 05 et 09. Le facteur ×2 n’est pas augmenté et aucun cumul de bonus n’est décidé.

Le **Ressort de deuxième chance** est classé dans la famille des **billes spéciales** (MP-020). Il permet un second passage possible ; le premier passage ne paie pas, seul le résultat final est crédité. Il ne constitue pas une quatrième amélioration de machine dans cette sélection. Obtention, fréquence, déclenchement du second passage et articulation avec capacité/Surchauffe/modules restent ouverts. Préserver le résultat déterminé au lancement et un paiement final unique, sans nouveau tirage à la reprise.

Le créateur demande également un **module numérique** permettant d’accéder aux **améliorations téléchargeables** du Plinko (MP-044). Le module et sa branche logicielle sont à prévoir pour plus tard ; catalogue, effets, prix, déblocage, installation et cumuls restent à définir aux fichiers 05 et 09. La consultation devra appartenir au support 3D, sans HUD. Cette intention n’ajoute pas de serveur ni de compte au périmètre local.

Ces autres concepts restent documentaires. Aimants et Collecteur sont désormais achetables aux prix confirmés, avec essais DEV facultatifs conservés.

## 8. Surchauffe
À chaque règlement, compter une bille si le bonus n'est pas actuellement actif et qu'aucune charge n'est déjà prête.
À 100, bloquer le compteur à 100 et allumer DÉCHARGE.
Activation possible seulement hors panne/usine, sans bonus actif :
- Consommer la charge et remettre le compteur à zéro.
- Activer x2 pendant 10 secondes actives.
- Ne pas recharger pendant ce temps.
À expiration, reprendre le comptage des prochains règlements.
Une bille lancée avec bonus conserve son retour même si elle arrive après expiration.
Une bille lancée avant activation ne gagne pas rétroactivement le x2.
Afficher le temps restant et le facteur réellement appliqué au résultat. Le créateur a remplacé le bonus ×10 par ×2 ; durée et seuil restent inchangés. Les multiplicateurs ordinaires du plateau restent identiques ; leurs fréquences actuelles sont définies à la section 3. Accepter dans les anciennes sauvegardes les billes et historiques au facteur 10 avec leur retour déjà figé : ne pas les recalculer. Un bonus encore actif à la reprise utilise ×2 pour les nouveaux lancements.

## 9. Usine
Accessible même pendant la panne ou avec moins d’une pièce, avec zéro bille en cours au départ de la cave. L’automatisation est arrêtée au début du départ autorisé. Après la montée et le fondu complet, sélectionner explicitement « Aller travailler à l’usine ». Ouvrir les destinations ne commence aucun service.
Décision du créateur : remplacer l’emballage sans enjeu par un tri d’une minute active. Des billes arrivent continuellement sur le tapis de l’ancien poste 3D. Cliquer une bille grise marquée « + » ajoute 50 centièmes au salaire en attente ; ce prix a été confirmé par le créateur. Une grise laissée passer ne rapporte rien ; aucune grise cliquée donne zéro salaire. Cliquer une rouge marquée « × » fait exploser le joueur, termine immédiatement le service et annule tous les gains de ce service, sans débiter son solde antérieur. Explosion stylisée en vue subjective, sans flashes ni secousse ; mouvement réduit : résultat sur la fiche, sans particules.
Le salaire des grises est versé une seule fois à la fin des 60 secondes, si aucune rouge n’a été cliquée. Pas de salaire garanti ni de limite de six billes. Réglages initiaux ajustables : une arrivée toutes les 700 ms, 23 % de rouges, quatre couloirs et traversée de 6,5 s. Ces paramètres n’affectent jamais le tirage du Plinko. Pas de rattrapage hors ligne.
Conserver la salle d’usine d’origine (murs, sol, étagères, cartons, poste et éclairage), rendue plus industrielle à la demande du créateur (20 octobre 2026) : sol béton et allées peintes, parpaings, bardage ondulé et verrières, poteaux et poutre en I, tuyauteries, rayonnages à palettes, suspensions et ombres portées. Le poste est un convoyeur à bande à tasseaux qui défile à la vitesse des billes, sur châssis acier, rouleaux et tambours, alimenté par une machine à rideau de lanières et trémie ; la colonne lumineuse porte le voyant des événements. Décor seulement : couloirs, trajectoires, carton, fiches et règles inchangés, aucun objet ne bloque les clics sur les billes, bande fixe en mouvement réduit. Les grises validées rejoignent visuellement le carton ; les autres traversent le poste. Fiches physiques : temps restant, grises validées, salaire en attente et règles « grise +0,50 / rouge explosion ». Aucun HUD, commande HTML ou navigation permanente pendant le travail normal. Survol/focus bref près des billes ; Tabulation sélectionne, Entrée/Espace clique. Le signe + ou × distingue aussi les types sans dépendre uniquement de leur couleur.
Seule l’horloge du service et de ses billes avance pendant le travail, quand l’onglet est visible et l’écriture autorisée. Surchauffe, cadence manuelle et production restent suspendues. Aucun lancement, achat ou activation de Décharge. Clics hors service, billes expirées et clics répétés sur un même identifiant sont refusés. À la fin ou après l’explosion, retour aux destinations ; aucun nouveau service ni descente automatique.
Durée restante, nombre de grises validées, identifiants et positions des billes, cadence et résultat du service sont sauvegardés. Un clic est enregistré avant son effet visuel : suppression de la bille et incrément du score, ou échec et durée nulle, dans une transaction. Aucun crédit intermédiaire au solde. Rechargement/import d’un service actif : reprendre le poste et son score, sans nouveau tirage des billes présentes ; un service terminé ou perdu ne repaie jamais. En cas d’erreur d’écriture, conserver l’état précédent, suspendre et proposer nouvelle tentative et export.
Compatibilité : format interne 6, migration validée des formats 1/2/3/4/5 sans changer solde, achats, bonus ou résultats figés. Un ancien service déjà commencé conserve exceptionnellement sa durée restante (au plus 15 s) et ses 15 pièces garanties, avec mention sur la fiche ; le service suivant applique les nouvelles règles. Ne pas fabriquer cette exception depuis une nouvelle partie.

### Événements temporaires du tapis

À la demande du créateur, ajouter des variations de rythme dans le service. Réglage initial délégué : trois événements distincts par service neuf, dans un ordre aléatoire tiré une seule fois au départ. Débuts autour de 12, 28 et 44 secondes actives, avec variation de ±2 s ; durée de 7 s chacun, sans chevauchement. Préavis de 2 s avant l’effet, puis retour automatique à la cadence normale.

- Surcadence : vitesse du tapis et fréquence d’arrivée multipliées par deux.
- Arrivage massif : fréquence d’arrivée multipliée par deux, vitesse inchangée.
- Ralentissement : vitesse et fréquence divisées par deux.

La vitesse s’applique aussi aux billes déjà sur le tapis, sans saut de position ni changement de type. Répartir les arrivées entre les quatre couloirs lorsqu’une bille occupe déjà la place, pour éviter les superpositions en arrivage massif sans modifier les types tirés. Les stries du tapis suivent son déplacement ; en mouvement réduit, désactiver seulement ce mouvement décoratif et conserver le déplacement nécessaire au jeu. Nom, effet, préavis et durée restante sur la fiche physique du poste, avec voyant fixe ; annonce accessible, sans HUD ni flash. Ne pas modifier le prix de 0,50 pièce, les 23 % de rouges, le salaire en attente, la durée d’une minute ou la règle d’explosion.
Plan, cadence et positions sont sauvegardés ensemble. Pauses et onglets masqués figent également les événements ; un rechargement/import reprend au même stade sans nouveau tirage du plan. Anciens services du format 2 : terminer avec cadence fixe et billes/score conservés ; seul le service suivant reçoit des événements. L’exception historique du format 1 reste inchangée.

Aucun résultat d’usine ne contribue aux statistiques, à la panne ou à la Surchauffe du Plinko. Au retour dans la cave, l’automatisation attend une activation explicite.

## 10. Sauvegarde
Clé proposée : masterplinko.save.
Snapshot JSON complet et saveVersion 6, avec migration des formats 1/2/3/4/5 : voir fichier 10 pour le contrat. Les anciens modules sont déjà installés ; `plans` est initialisé à vide avant le format 5, tandis que ses plans payés sont conservés. Les plans achetés non installés persistent dans les nouvelles parties sans perdre ni doubler les paiements.
Enregistrer lancement, règlement, achat, clic d’usine et salaire comme des transactions atomiques du snapshot.
Enregistrer aussi charge/activation de bonus et changements de préférences. Checkpoint des durées actives environ chaque seconde.

Au retour :
1. Valider les données.
2. Régler par ordre de lancement les billes en attente avec leur retour figé.
3. Mettre à jour historique, statistiques, compteur et panne sans avancer le temps actif.
4. Sauvegarder l'état réconcilié.
5. Afficher un résumé de reprise.
Automatisation arrêtée. Aucune production hors ligne.

Si localStorage est indisponible ou saturé, ne pas prétendre que la partie est sauvegardée ; suspendre les mutations économiques et permettre un export de l'état encore disponible.
Ne pas écraser une sauvegarde inconnue ou invalide par une nouvelle partie automatique.

Import : validation complète avant remplacement, avertissement et possibilité d'exporter l'état actuel. Refuser une version future.
Un seul onglet écrit : les autres sont suspendus.
Le protocole évite les duplications accidentelles ; il n'empêche pas un utilisateur de modifier sa sauvegarde ou d'en restaurer volontairement une ancienne.

### Suppression explicite depuis le boîtier

À la demande du créateur, ajouter « Supprimer la sauvegarde… » au boîtier de Papy. Le premier clic ouvre une confirmation sur ce support 3D, avec export possible avant de confirmer, annulation et Échap prioritaires. Indiquer clairement l’effacement des pièces, améliorations et résultats et le retour à 19,00 pièces ; préférences conservées. Aucune suppression dès l’ouverture de la demande, aucune sortie ou mutation annexe pendant cette confirmation.
Après confirmation, remplacer atomiquement le snapshot de progression par une nouvelle partie (mise 1, aucun achat/résultat/bille/bonus/service) avant publication. Arrêter le Doigt et vider les animations de la partie précédente. Si l’écriture échoue, garder l’ancienne partie en mémoire et en stockage, suspendre et permettre annulation, export et nouvelle tentative. Le remplacement nécessite le verrou d’écriture ; un onglet secondaire ne peut pas le déclencher. Une sauvegarde illisible ou future reste conservée jusqu’à cette confirmation explicite. Ne toucher à aucune autre clé du navigateur ni fichier exporté ; aucun changement du format de sauvegarde.
Simplifier le boîtier : conserver son, mouvement réduit, qualité, export, import, suppression et fermeture. Retirer « Relire la sauvegarde ». Afficher « Réessayer après l’erreur » uniquement lorsqu’une erreur de lecture/écriture existe ; ce bouton unique relit en cas d’erreur de lecture ou retente l’écriture disponible. En confirmation, montrer seulement confirmer, annuler et exporter, avec zones de souris/focus correspondantes.

## 11. Visuel et interactions
- Direction artistique : lofi numérique dans une cave aménagée sous le chalet de Papy, selon les images de référence du créateur. Décor intégralement 3D : pierres irrégulières, plafond bas à poutres, sol ancien, tapis usé, escalier en bois à gauche, établi et rangements à droite, outils, boîtes et bûches.
- Fenêtre haute sur une nuit pluvieuse avec lumière extérieure bleutée ; ampoule suspendue et lampe d’établi chaudes. Formes adoucies, matériaux stylisés, ambiance accueillante et légèrement poussiéreuse. Préserver la lisibilité des commandes et du plateau.
- Les deux dernières images du créateur précisent le décor : coin salon avec canapé brun, plaid à carreaux, coussin sauge, pouf et caisse servant de table ; tapis persan rouge usé ; poêle et bûches ; étagères en bois et métal remplies de livres, coffres, robots, anciens appareils et plantes. Ajouter les petits luminaires chauds, cadres, photos et plans qui donnent l’aspect d’un atelier habité. Le prototype à chambre électrique est un objet décoratif distinct du Plinko, sans acquisition ni règle supplémentaire.
- Référence du 19 octobre 2026 pour l’arrière, découvert en descendant : fermer réellement la pièce et prolonger pierres, pavés, plafond et poutres. Atelier scientifique de Papy avec tableau noir couvert d’équations et croquis, établi et verrerie, rangements d’appareils anciens, fenêtre bleue pluvieuse, télescope, prototype vert à manomètre, aquarium, dirigeable et planètes suspendus. Ajouter table de cartes et casque audio, fauteuil en toile avec plaid, plantes, coffres, lanternes et poêle. Ces volumes et leurs surfaces appartiennent à la même cave 3D ; aucun fond de pièce projeté, nouveau module économique ou commande ajouté.
- Vue principale plus large pour montrer cette pièce, avec cadrage commandes pour lire et jouer de près. Escalier sur le bord gauche, coin salon dégagé et atelier à droite ; même hauteur des yeux pendant le départ. Les matériaux bois/pierre/tapis utilisent trois textures locales générées, documentées dans `src/assets/textures/README.md` ; aucune image de cave projetée en arrière-plan. Qualité normale : ombres de contact et halos modérés ; qualité basse : rendu direct allégé. Les deux modes conservent tous les objets et interactions.
- Correction du créateur : canapé à trois places avec proportions cohérentes entre largeur, assise, profondeur, dossier et accoudoirs. L’établi est adossé au mur latéral droit ; son panneau d’outils, ses accessoires et leurs cadrages suivent la même rotation. Réorganiser le rangement et le poêle pour éviter les chevauchements. Retirer l’affiche qui empiétait sur la fenêtre ; conserver la vue sur la nuit pluvieuse.
- Plinko contre le mur de pierre, près de l’établi : bois clair, plateau crème, vert sauge, rose poudré, lavande, petits écrans à pixels, compteur lumineux et gros bouton physique.
- Modules en objets 3D indépendants attachés à des emplacements définis. Doigt mécanique et Bac comptable apparaissent après leur achat, y compris au chargement d’une sauvegarde existante. Duplicateur, compteur d’instabilité et ventilation restent cachés tant que leurs acquisitions ne sont pas implémentées ; leurs modèles préparés n’ajoutent aucune mécanique future.
- Cave plein écran, sans cadre, marge ni défilement. Aucun HUD : bandeau, solde flottant, colonne, panneau inférieur, navigation et légendes superposées sont interdits.
- Dans la cave, tous les écrans, boutons et pages sont des maillages ou surfaces attachés aux objets, avec leur perspective et leur visibilité. Exception explicite hors cave : destinations sur fond entièrement noir ; pendant le service, poste 3D dans sa salle d’usine avec ses informations sur une fiche physique. Aucun HUD dans la cave, compteur économique flottant ou barre de navigation.

| Fonction | Support physique |
| --- | --- |
| Solde | Compteur numérique de la machine |
| Mise | Afficheur et boutons physiques −/+ |
| Lancement | Gros bouton de la machine |
| Automatisation | Interrupteur et voyant du Doigt acquis |
| Surchauffe / Décharge | Segments, écran et bouton physique lumineux de la machine |
| Dernier résultat | Écran sur la façade ; retour et net distincts |
| Historique | Imprimante du Bac acquis et ticket consultable par pages |
| Améliorations | Catalogue d’Azur posé sur l’établi ; prix, conditions et achats imprimés dans ses pages |
| Sorties | Escalier cliquable puis liste centrée sur fond noir après la montée |
| Usine | Poste 3D dans la salle d’usine d’origine : tapis de tri, billes grises/rouges, carton et fiches du service |
| Réglages, sauvegarde, export/import/suppression | Boîtier mural, confirmation d’import ou de suppression sur son écran |

Les nombres doivent être lisibles depuis le cadrage d’utilisation. Rapprocher la caméra plutôt que dupliquer les données à l’écran. Textes français, son désactivable, mouvement réduit, flashs limités ; Papy sans prénom inventé.

### Survol et clavier
Au survol, légère mise en évidence et courte indication près de l’objet, par exemple « Lancer — mise : 2 pièces » ou « Sortir de la cave ». Elle disparaît lorsque le pointeur quitte l’objet. Aucun texte d’aide permanent ni bulle suivant la souris.
Pour l’escalier, le survol d’une marche, d’une contremarche, de la rampe ou d’un support éclaire toute la structure en bois, palier inclus, avec une teinte chaude commune. Ces éléments partagent la même action de sortie ; la surbrillance disparaît en quittant l’escalier, en changeant de vue ou au départ. Ne pas éclairer les murs ni le mobilier voisin. Le focus clavier produit le même effet ; conserver le libellé et les restrictions de départ existants.
Tabulation explore les objets et offre la même indication, Entrée/Espace active l’objet. Les descriptions invisibles destinées aux lecteurs d’écran restent autorisées. Les raccourcis utiles ne sont pas listés en permanence à l’écran.

### Navigation dans la pièce — choix validé
Une même scène et des cadrages prédéfinis : Plinko, établi, ainsi que commandes, boîtier et ticket pour leur lecture. Aucun déplacement libre. Accès directs au clavier, objets cliquables et retour à la machine avec Échap. Une confirmation d’import ou de suppression est annulée au premier Échap ; le suivant revient à la machine.
Transition initiale de 0,5 seconde, instantanée en mouvement réduit. Bloquer les interactions manuelles pendant la transition. Une nouvelle navigation remplace la cible, sans file de mouvements. Lancement manuel et Décharge depuis Plinko ou commandes stabilisés ; achats depuis les supports d’Azur stabilisés.

L’établi de la cave conserve son décor et son cadrage, sans livre ni achat. Cliquer sur le devis ou le carnet chez Azur rapproche la caméra ; l’achat installe le module. Une panne ne déplace pas automatiquement la caméra ; l’écran de la machine indique de consulter Azur. Une Décharge prête allume ses objets physiques, sans notification flottante ni activation automatique.

L’escalier est l’unique point de sortie. Au survol/focus autorisé : « Sortir de la cave ». Décision du créateur du 19 octobre 2026 : le départ est accepté même avec le Doigt en marche et des billes en vol, le joueur ne sachant pas forcément qu’il faut l’arrêter. Le survol indique que le Doigt s’arrêtera et que les billes finiront leur chute. Le départ arrête immédiatement le lanceur automatique et désactive les autres interactions ; aucun nouveau lancement (manuel, Doigt ou Collecteur) n’a lieu. Les billes déjà lancées poursuivent leur chute pendant la montée et sont réglées normalement ; celles encore en vol à l’arrivée sur les destinations (cas du mouvement réduit) sont réglées en une seule écriture, par ordre de lancement, avec leur retour figé, sans nouveau hasard. Un échec d’écriture conserve les billes, suspend et propose réessai/export ; l’usine reste refusée tant qu’elles ne sont pas réglées.
Trajet prédéfini : approche dans l’axe de l’escalier à altitude constante, montée fluide sans secousses ni traversée des objets, puis fondu au noir. La hauteur des yeux au-dessus du sol est celle de la vue Plinko ; conserver cette stature au-dessus de la ligne de marche jusqu’au palier et au retour. Marches et caméra partagent leurs coordonnées ; raccorder doucement le sol, la pente et le palier, sans oscillation sur chaque marche. Trémie et palier laissent le dégagement nécessaire à cette hauteur. Le regard montre les marches pendant la montée puis se relève à l’arrivée. Au retour, il se relève après la trémie pour découvrir l’atelier arrière désormais aménagé ; il conserve cette orientation pendant les 0,6 premières secondes au sol puis retrouve progressivement le Plinko en 2,2 s. La machine reste ensuite en vue jusqu’au cadrage jouable, sans demi-tour final. Arrondir le virage au pied, sans arrêt intermédiaire ; retour au sol ralenti et rotations continues. Pas de déplacement libre. Un clic répété ne redémarre ni n’empile le trajet. Réglages : approche de départ 2,6 s, montée/descente 3,4 s, retour au sol 5,2 s, fondu 0,4 s. En mouvement réduit : seul un fondu de 0,3 s remplace le trajet.
Afficher les destinations uniquement lorsque le fond est entièrement noir : Aller travailler à l’usine ; Rendre visite à Azur après sa rencontre lors de la première panne (`repairTriggered`) ; Redescendre dans la cave. La visite publique d’Azur est maintenant implémentée. Marceau et Matéo restent masqués, leurs visites n’étant pas disponibles. Réutiliser le jalon de rencontre existant, sans ajouter de drapeau ni changer le format de sauvegarde.
Liste sobre, centrée et accessible à la souris, Tabulation/Entrée/Espace. Échap correspond à Redescendre dans la cave depuis cette liste. Aucun travail ni visite sans sélection explicite. Redescendre révèle le haut des marches par fondu, inverse le trajet puis retrouve Plinko ; en mouvement réduit, un court fondu révèle directement Plinko.
Billes, production et bonus continuent pendant les achats et cadrages ordinaires de cave. Montée, destinations, visite de boutique et descente suspendent tout le temps de jeu ; seule la chute des billes déjà lancées se termine pendant la montée. Seule l’horloge du service avance pendant le travail et dans un onglet visible. Boîtier, confirmation d’import, ticket et onglets masqués conservent leurs pauses. Les raccourcis de cave sont neutralisés hors cave ; aucune sortie du service avant son terme. Au retour, le Doigt reste arrêté.
Chargement réussi : Plinko, ou poste dans sa salle d’usine si un service reste en cours. Chargement incompatible : boîtier, données conservées. Trajet, écran courant et focus sont transitoires ; le trajet reste indépendant du format économique ; les données du tri sont décrites au fichier 10. Les futurs espaces de Marceau et Matéo restent hors périmètre.

### Boutique publique d’Azur
La boutique de vente et réparation d’électronique suit la partie « boutique, vue depuis l’entrée » de la référence. Vitrine/entrée vitrée à gauche sur une rue bleutée pluvieuse, comptoir en bois au centre, appareils et rangements au fond, coin réparation sur le mur droit et vitrine de présentation à droite. Poutres, suspensions chaudes, bois légèrement usé, tapis, plantes et appareils arrondis crème/sauge/lavande/pêche. Radios, réveils, cassettes, télévisions à tube, ventilateurs, lampes, casques et petits accessoires doivent varier de silhouette et de taille. Caisse, appareil ouvert, outils, tasse et documents au comptoir ; tiroirs de composants, panneau d’outils, tabourets et lampe articulée au poste de réparation. Quelques anomalies d’Azur restent décoratives : radio à cinq antennes, réveil à heure impossible et ventilateur à pale de bois.

Aucun Plinko, prototype d’amélioration ou système d’achat d’appareils ordinaires dans cet espace. Seul le plan de réparation est vendu au comptoir public, sur un devis ; vue rapprochée `devis` à 1,68 m, retour au comptoir par Échap ou repère physique. Les plans du Doigt et du Bac sont vendus dans le carnet privé après réparation installée. Aucun dialogue bloquant ou personnage 3D détaillé demandé.

Trois positions publiques fixes, à 1,68 m du sol : entrée, rapprochement au comptoir et lecture du devis. Transition de 0,5 seconde, instantanée avec mouvement réduit ; pas de marche libre. Clic sur le comptoir pour se rapprocher/revenir ; entrée physique pour quitter la boutique. Tabulation explore les objets visibles et non occultés ; Entrée/Espace les active. Survol/focus : une courte indication ancrée en 3D et une légère mise en évidence, retirées au départ du pointeur ou au flou. Aucun HUD, bouton DOM visible ou compteur de solde flottant. Échap ferme d’abord le devis s’il est ouvert, retourne à l’entrée, puis à la liste des destinations. La sélection ultérieure de Redescendre conserve le trajet existant. La visite ne lance aucun service ; aucun temps de Plinko/Surchauffe/usine n’y avance. Rechargement : cave, avec progression conservée et Doigt arrêté.

### Réserve, passage et atelier caché d’Azur
L’accès privé derrière le comptoir est autorisé après l’achat de `azur.initial_repair` (`repairPurchased`), y compris pendant la même visite, choix confirmé par le créateur. Avant cela, la porte explique la condition sans déplacer le joueur. La visite publique conserve son apparence et sa condition de rencontre (`repairTriggered`).

Trois espaces réellement raccordés dans un même bâtiment : porte battante, réserve ordinaire, puis atelier caché par une étagère mobile et un couloir. Réserve utilitaire : appareils en attente, table, cartons, pièces détachées et câbles, éclairage modeste. À la demande du créateur, **un seul clic sur la porte privée** déclenche le trajet complet : approche, ouverture de la porte, entrée dans la réserve, déverrouillage de l’étagère (0,35 s), translation sur rails (1,6 s, course 2,25 m), découverte (1,8 s) puis entrée dans l’atelier. La radio reste un objet du décor, sans clic obligatoire ; retirer sa commande et celle de sélection du passage. La lumière de l’atelier apparaît progressivement par l’ouverture. Aucune visite, entrée ou dépense ne démarre avant la sélection explicite de la porte. Les clics répétés sont ignorés pendant le mécanisme et les trajets. Le meuble dispose d’une zone de stationnement libre ; aucun mur ni meuble ne coupe sa course. L’image fournie montre surtout l’atelier et une porte à hublot : le meuble coulissant est l’interprétation retenue pour la dissimulation, la porte à hublot est reprise comme porte technique décorative dans l’atelier.

L’atelier contient un MasterPlinko cassé, crème/bois/sauge et détails pêche/lavande : capot relevé, panneau démonté, câbles débranchés, écran d’erreur statique et pièces déposées. Plateau, picots et compartiments restent reconnaissables, sans animation de fonctionnement. Doigt avec réservoir, Bac comptable ouvert et Duplicateur sous cloche ont chacun leur place sur les bancs latéraux. Instruments, circuits incomplets, cartouches, schémas, chariots et rangements complètent la pièce. Lumière chaude et quelques accents menthe ; aucune nouvelle mécanique, acquisition ou récompense en consultant les prototypes. Le contenu privé reste caché depuis les vues publiques, même lorsque l’accès est ouvert.

Bureau des plans à droite près de l’entrée de l’atelier : vrai meuble en bois avec tiroirs sauge, tabouret, lampe articulée, crayon/règle et documents. À la demande du créateur, les plans se consultent dans un **carnet 3D feuilletable posé sur le bureau**, avec couverture, reliure, épaisseur de papier et feuilles recto verso. Douze doubles pages : réparation initiale ; Doigt mécanique ; Bac comptable ; aimants ; Collecteur de ratés ; Condensateur de poche ; Boîte de vitesses ; module numérique et améliorations téléchargeables ; Duplicateur ; Compteur d’instabilité ; famille des billes spéciales avec le Ressort de deuxième chance ; autres réglages envisagés. Schéma à gauche, effet et annotations à droite. Les cinq premières pages portent les commandes d’achat des plans existants. Les projets futurs sont marqués comme études, sans achat, don, déblocage ou activation de leurs mécaniques par la lecture. Le bureau et le carnet restent cachés depuis la boutique publique.

Feuilleter par les coins physiques des pages, ou avec gauche/droite ; Tabulation puis Entrée/Espace offrent les mêmes actions. La feuille tourne sur la reliure, se courbe et montre son recto/verso pendant 0,56 s ; les clics répétés sont ignorés pendant ce mouvement. Avec mouvement réduit, la page change immédiatement. Les commandes précédent/suivant sont absentes à la première/dernière double page correspondante, sans boucle. Lire ou cliquer le milieu d’une page ne quitte pas le carnet. Le signet physique ↶ ou Échap ramène à l’atelier ; une sortie pendant le feuilletage termine la page sans empiler d’animation. La double page consultée reste disponible pendant la visite et revient au début à chaque nouvelle visite. Seuls les plans achetés et les modules installés persistent ; les pages restent transitoires.

Navigation par cadrages réserve, découverte, atelier, machine, prototypes et plans. Hauteur des yeux constante à 1,68 m ; parcours arrondis contournant le comptoir et le bureau, passage des portes seulement après ouverture, couloir véritable de 2 m de largeur et 3 m de profondeur. Approche depuis la boutique 5,2 s, porte 0,6 s, entrée en réserve 1,5 s ; traversée vers l’atelier 3,5 à 5,5 s selon le point de départ. Gros plans raccordés par la vue principale, durée proportionnelle à la distance. En mouvement réduit, transitions et mécanismes sont immédiats. Cliquer le carnet ou le sélectionner par Tabulation puis Entrée/Espace rapproche la caméra pour sa lecture. Décision du créateur du 19 octobre 2026 : depuis le cadrage principal, la plaque physique « MAISON » ou Échap termine la visite et ramène directement à la cave par la descente habituelle de l’escalier, sans trajet vers la boutique ni passage par la liste des destinations. La plaque « BOUTIQUE » conserve le retour complet à la boutique en une action, en traversant le passage et la réserve sans arrêt interactif, puis en refermant la porte. Les shaders des quatre configurations de lumière (boutique, réserve, atelier qui apparaît, atelier éclairé) sont compilés après une demi-seconde à l’entrée, puis de nouveau à l’arrivée des textures de bois ; le trajet n’attend plus ces compilations. Les mécanismes et la caméra avancent par pas d’au plus 50 ms : une image lente ralentit l’animation sans sauter l’ouverture de la porte ou le glissement de l’étagère. Depuis un détail, Échap revient d’abord au cadrage principal ; depuis l’entrée publique, il quitte la visite vers les destinations ; activer à nouveau le prototype observé revient aussi au cadrage principal. Aucune interface permanente. Les horloges de jeu restent suspendues pendant toute la visite. Positions, portes, étagère et pages du carnet sont transitoires ; le chargement revient dans la cave selon les règles existantes, sans nouveau champ de sauvegarde.

Comparer les caméras réellement utilisées à la référence et livrer les captures disponibles, mécanisme fermé et ouvert. Auto-évaluation subjective sur cinq critères de deux points : fidélité, continuité spatiale, matériaux/éclairage, mécanisme/transitions, lisibilité du Plinko et des prototypes/interactions. En dessous de 9/10, identifier et corriger les défauts puis inspecter à nouveau ; ne pas augmenter artificiellement la note. Distinguer inspection visuelle, tests techniques et appréciation artistique du créateur.

## 12. Tests de réception
- Nouvelle partie : 19,00 pièces, mise 1,00, aucune amélioration.
- Mise 10, x0,3 : débit 10, retour 3, net -7.
- Mise 1, x1 : solde inchangé après règlement hors bonus.
- Bille gratuite x3 : aucun débit, retour 3.
- Bonus : base 1, x0,5, facteur 2 → retour 1.
- 50 billes présentes : 51e refusée sans changement de solde.
- Même id réglé deux fois : un seul crédit.
- Panne à 50 de retours : une seule occurrence ; usine toujours possible.
- Achats uniques et refus si fonds insuffisants.
- Usine : minute active complète, grises à 0,50 pièce versées une fois au terme, aucune grise = zéro ; rouge = explosion et perte de tout le salaire du service. Flux/clic/clavier/pause, identifiants uniques, reprise avec score et billes, sauvegarde en échec sans mutation, migration des anciens services ; aucun effet sur le Plinko.
- Usine et événements : préavis, effets réels sur vitesse/arrivées, positions continues aux frontières, retour normal, pause et reprise du plan ; même simulation à petites/grandes étapes, programmes invalides refusés et anciens services conservés.
- Bonus actif : pas de nouvelle charge ; durée et snapshot cohérents.
- Rechargement pendant plusieurs vols : retours identiques, crédit unique.
- Import invalide ou futur : partie actuelle intacte.
- Suppression : annulation sans changement, export préalable, remise à 19 pièces avec réglages conservés et sans ancien vol, reprise saine ; erreur d’écriture sans perte et onglet secondaire refusé. Réessayer absent hors erreur, relire retiré, confirmations accessibles uniquement sur le boîtier.
- Onglet caché : aucune nouvelle bille et aucune durée active écoulée.
- Deux onglets : un seul peut modifier la partie.
- Distribution : somme exacte et bornes de tirage testées avec hasard injecté.
- Chemins vers les 15 sorties : endpoint et multiplicateur cohérents.
- Navigation Plinko/établi au clic et au clavier ; retour direct sans parcours imposé.
- Production et règlements inchangés pendant une transition ou un achat.
- Plusieurs demandes rapides de navigation : dernière cible atteinte, aucun clic de mise accidentel.
- Animations réduites : cadrages ordinaires instantanés ; sortie/retour par court fondu sans montée ni descente animée.
- Bouton de Décharge et segments physiques allumés quand prêts ; panne et chargement cohérents avec les verrouillages de vue.
- Plein écran à 1280×720 sans défilement, HUD ou texte visible hors objets lorsque rien n’est survolé.
- Clic et focus clavier sur boutons/pages en perspective ; indications effacées hors survol/focus ; aucune interaction à travers un objet occultant.
- Catalogue, ticket et boîtier lisibles depuis leur cadrage.
- Escalier : départ accepté avec Doigt actif et billes en vol, Doigt arrêté, billes réglées une seule fois au retour figé, trajet unique même après clics répétés, autres interactions bloquées.
- Destinations absentes avant noir complet ; ouverture sans service ; visites verrouillées masquées ; clavier et souris ; positions inverses jusqu’à Plinko, virage arrondi, découverte de l’atelier arrière fermé puis regard continu vers la machine, sans saut au retour au jeu.
- Boutique publique d’Azur masquée avant sa rencontre, accessible sur sélection après la panne ; entrée/comptoir à hauteur des yeux, souris/clavier et mouvement réduit, porte privée refusée avant réparation installée, achat de plan seulement au devis, aucun HUD. Consultation sans modification des pièces, améliorations, historique ou horloges ; seuls les achats explicites débitent leur prix ; retour aux destinations, reprise en cave après rechargement sans nouveau format de sauvegarde.
- Après réparation installée : un clic sur la porte déclenche tout le trajet, porte réellement ouverte avant franchissement, réserve puis révélation séquentielle automatique sans autre commande. Course de l’étagère libre, couloir dégagé, entrée automatique après ouverture et aucun empilement d’animations. Vérifier les caméras et l’occultation depuis les vrais volumes, mécanisme fermé puis ouvert, ainsi que l’invisibilité des prototypes depuis les vues publiques.
- Atelier : Plinko visiblement hors service et trois prototypes distincts, gros plans et retour utilisables à la souris et au clavier, hauteur constante et mouvements réduits ; consultation sans achat, don, changement de sauvegarde ou temps de jeu. Réinitialisation transitoire à la visite suivante.
- Montée, destinations et descente : horloges figées ; usine : seule sa durée avance, salaire unique, reprise après chargement/import et arrêt du Doigt au retour.
- Build production, vérification TypeScript et tests ciblés réussis.

La session manuelle finale relève le délai de réparation, d'automatisation, les blocages et la lisibilité des trajectoires.

## 13. Livrables attendus du développement
Projet source, lockfile, README de lancement, configuration centralisée, tests utiles et compte rendu des vérifications réellement faites.
Commandes visées : npm install (ou npm ci avec lockfile), npm run dev, npm run build, npm test.
Ne pas annoncer un déploiement, un dépôt distant ou une vérification visuelle non effectués.

## 14. Hors périmètre
Chalet complet, personnages 3D détaillés, longs chapitres, Rapier pour les billes, mini-jeux élaborés, Marceau, Matéo, produits, grigris, résidus, trois plateaux, recalibrage, Paul, revenu hors ligne, comptes et SQL.
