# Instructions pour les agents — MasterPlinko

## Portée et sources

Ces instructions s'appliquent à tout le dépôt. Lire les documents concernés avant de modifier le projet et examiner l'existant avant de créer des fichiers.

Ordre de lecture pour le développement :
1. `doc/11_SPECIFICATION.md` : règles prioritaires, périmètre et critères de réception.
2. `doc/10_ARCHITECTURE_EVOLUTIVE.md` : responsabilités, transactions et sauvegarde.
3. `doc/12_PROMPT_DE_DEVELOPPEMENT.md` : méthode d'exécution et livrables.
4. `doc/07_A_FAIRE_MAINTENANT.md` : checklist de réalisation.
5. `doc/02_TON_ET_PERSONNAGES.md` : direction narrative.
6. `doc/06_BACKLOG.md` : tâches, dépendances et critères de réussite.

Consulter `doc/00_LIRE_EN_PREMIER.md` pour l'index, `doc/08_A_FAIRE_ET_A_EVITER.md` pour les règles de conception et `doc/09_A_DEFINIR.md` pour les décisions ouvertes. Les fichiers 01 à 05 décrivent également la vision à long terme.

Faire évoluer les fichiers et dossiers existants en place. Garder des noms stables, sans suffixes de version ni copies numérotées. Suivre la progression dans le backlog et l'historique Git.

En cas de divergence entre documents, la spécification 11 fait autorité pour le périmètre actuel. Distinguer choix confirmés, paramètres de test et décisions encore ouvertes. Les paramètres provisoires explicitement délégués sont utilisables sans redemander chaque prix. Ne pas trancher silencieusement une question ouverte nécessaire à la tâche ; les questions futures non bloquantes n'arrêtent pas le développement.

## Objectif et périmètre

MasterPlinko est un jeu solo idle narratif : Ewen découvre la machine de Papy dans la cave du chalet et l'améliore avec Azur. L'argent est une ressource fictive interne au jeu.

L'objectif actuel est une boucle jouable de 10 à 15 minutes sur navigateur d'ordinateur, en localhost : lancement manuel, panne unique, trois améliorations, automatisation, Surchauffe, usine et sauvegarde locale avec import/export.

Stack retenue : **Vite, TypeScript, Three.js et HTML/CSS**. Réaliser la machine, l’établi et le petit décor de cave en 3D procédurale ; ne pas exiger de modélisation manuelle du créateur. Rapier est différé pour les billes. Ne pas ajouter React, serveur, comptes ou SQL au périmètre actuel.

À développer plus tard : chalet complet, personnages 3D détaillés, prologue et longs chapitres, mini-jeux élaborés, Marceau, Matéo, résidus, consommables, grigris, trois plateaux, recalibrage, confrontation de Paul et revenu hors ligne.

## Règles économiques à préserver

Le détail exécutable reste dans la spécification 11. Toute modification de règle, de prix ou de probabilité doit être justifiée et documentée.

- Stocker la monnaie en centièmes entiers, afficher deux décimales. Solde initial : 1 900 centièmes ; mise initiale : 100 ; choix de 100 à 1 000 par pas de 100.
- Le multiplicateur représente le retour total, pas le bénéfice. Mise 10, x0,3 : retour 3, net −7.
- Multiplicateurs : x0,3 / x0,5 / x1 / x1,5 / x3 / x5 / x10 / x40. Poids respectifs sur 1 000 : 600 / 240 / 100 / 35 / 15 / 6 / 3 / 1. Réglage plus sévère demandé par le créateur : 84 % de pertes, 10 % de remboursements, 6 % de gains nets hors Surchauffe ; retour moyen 59,75 %, perte nette moyenne 40,25 %. Nouveaux lancements seulement, résultats déjà figés préservés et mêmes poids pour le manuel/Doigt.
- Tirer le résultat avant l'animation, indépendamment du solde et des pertes passées. Même distribution pour les billes manuelles et automatiques ; aucun gros gain garanti.
- Tirer la catégorie puis le côté à 50/50 lorsqu'elle a deux sorties. Ne pas doubler sa probabilité.
- Maximum 50 billes en cours, toutes origines confondues. Vérifier fonds, capacité, cadence et état du jeu avant tout débit ; un refus ne change pas le solde.
- Intervalle manuel minimum : 0,5 seconde. Chute visuelle cible : 3 à 4 secondes.
- Figer au lancement origine, mise débitée, base, multiplicateur, sortie, facteur de bonus et retour final. Régler une seule fois par identifiant.
- Panne prototype à 50 pièces de retours bruts cumulés du Plinko, une seule fois. Bloquer les nouveaux lancements, régler les billes restantes, puis permettre la réparation. Ne pas utiliser le solde, le bénéfice ou les salaires pour ce seuil.
- Achats uniques : `azur.initial_repair` à 25 pièces ; `azur.auto_launcher` à 40 ; `azur.accounting_tray` à 15. Les deux derniers nécessitent la réparation. Réparer nécessite zéro bille en cours.
- Doigt mécanique : une bille gratuite de base 100 centièmes toutes les 2 secondes, sans débit ni utilisation de la mise sélectionnée. Au plafond, attendre sans accumuler de file d'attente. Automatisation arrêtée au démarrage, au chargement, après import et au retour de l'usine.
- Bac comptable : consulter les 100 derniers résultats, conservés dès le début. Solde, mise et dernier résultat restent toujours visibles.
- Surchauffe : 100 règlements chargent une Décharge, une charge maximum ; activation manuelle x2 pendant 10 secondes actives. Aucun comptage pendant le bonus ou lorsqu'une charge est prête. Aucun effet rétroactif sur les billes déjà lancées. Les anciennes billes au facteur 10 gardent leur retour figé ; seuls les nouveaux lancements emploient ×2. Les sorties ordinaires ×10 sont inchangées.
- Usine : départ à zéro bille, accessible même en panne ou sous 1 pièce. Tri dans la salle 3D d’origine : flux continu de billes, clic sur les grises (+) à 50 centièmes chacune, salaire versé une fois au bout de 60 secondes actives. Sans grise cliquée, aucun gain. Une rouge (×) provoque une explosion, termine le service et annule tout son salaire sans toucher au solde antérieur. Souris ou Tabulation/Entrée/Espace ; informations sur fiches physiques, aucun HUD. Réglages de test : arrivée toutes les 700 ms, 23 % de rouges, quatre couloirs, traversée 6,5 s. Sauvegarder score, billes/identifiants, cadence, durée et résultat ; clics atomiques et idempotents, reprise sans duplication. Seule cette horloge avance pendant le travail visible ; aucune contribution au Plinko/Surchauffe, aucun revenu hors ligne. Les anciens services déjà commencés migrent en conservant exceptionnellement leur durée et salaire antérieurs ; les suivants suivent le tri. Voir fichier 11.
- Événements d’usine : Surcadence (tapis/arrivées ×2), Arrivage massif (arrivées ×2, tapis normal), Ralentissement (tapis/arrivées ÷2). Réglage initial : un de chaque, ordre tiré au départ, vers 12/28/44 s ±2 s, durée 7 s, préavis 2 s. Pas de cumul ; retour normal. Plan persistant, pause masquée, positions continues ; fiches et voyant fixes dans le décor, aucun HUD. Prix, probabilité des rouges, minute et explosion inchangés. Ancien service du format 2 conservé sans événement jusqu’au suivant ; format 1 conserve son contrat historique.
- Sortie : cliquer sur l’escalier stable avec zéro bille arrête le Doigt et bloque les interactions. Approche et montée prédéfinies fluides, puis fondu complet avant destinations. Conserver la hauteur des yeux de la vue Plinko : approche à altitude constante, mêmes coordonnées que les marches, ligne de marche lissée et trémie dégagée ; même stature au retour. Arrondir le virage au pied ; au retour, relever le regard après la trémie pour découvrir l’atelier arrière aménagé, conserver cette orientation 0,6 s au sol puis retrouver le Plinko en 2,2 s. Garder ensuite la machine en vue jusqu’au cadrage jouable, sans rotation finale brusque. Clics répétés ignorés. Visites affichées seulement si débloquées et implémentées : boutique publique d’Azur après la rencontre de la panne ; Marceau et Matéo indisponibles. Usine sur sélection explicite uniquement. Redescendre ou Échap depuis la liste inverse les positions du trajet jusqu’à Plinko ; durées au fichier 11 ; mouvements réduits : courts fondus seuls. Montée, choix, boutique et descente suspendent tout le temps de jeu ; Doigt laissé arrêté au retour.
- Les valeurs narratives de panne à 1 234 pièces et de réparation envisagée à 1 000 pièces ne sont pas celles du prototype. Ne pas ajouter de sélecteur de profil dans l'interface de jeu.

## Architecture et persistance

- Séparer état sérialisable, économie, tirage, progression, Surchauffe, usine, rendu, interface et persistance. Centraliser constantes et identifiants stables.
- Garder les règles économiques indépendantes de Three.js et des callbacks d'animation. Injecter la source aléatoire pour les tests.
- Préférer de petits modules ; ajouter une abstraction seulement pour un besoin concret.
- Au lancement : valider, tirer et calculer, créer le prochain état complet, sauvegarder le snapshot, puis publier l'état et animer.
- Au règlement : vérifier la présence de l'identifiant, créditer et retirer la bille dans le même prochain état, mettre à jour statistiques, historique, compteur et panne, puis sauvegarder avant publication.
- Si l'écriture échoue, conserver l'ancien état, signaler le problème et suspendre les mutations économiques. Permettre l'export de l'état disponible ; ne pas annoncer une sauvegarde réussie.
- Snapshot JSON avec un numéro de format interne (`saveVersion = 3`, migration des formats 1 et 2, clé proposée `masterplinko.save`) : respecter le contrat du fichier 10. Ce numéro sert à la compatibilité des données, sans créer de fichiers ou dossiers supplémentaires. Ne pas sérialiser les objets Three.js ou les valeurs dérivées.
- Sauvegarder chaque transaction et changement de préférence ; checkpoint des durées actives environ chaque seconde, avec arrondi conservateur.
- Au chargement et après import : valider, régler les billes en attente par ordre de lancement avec leur retour figé, sauvegarder l'état réconcilié, puis autoriser le jeu. Ne jamais relancer le hasard ou repayer une bille.
- Valider type, version, entiers sûrs, bornes, identifiants, unicité et cohérence avant de remplacer une sauvegarde. Refuser une version future ou un import invalide sans altérer la partie actuelle. Prévenir du remplacement et proposer l'export de l'état actuel.
- Ne pas écraser automatiquement une sauvegarde inconnue ou invalide par une nouvelle partie.
- Le temps actif avance uniquement quand l'onglet est visible et la partie non suspendue. Aucun rattrapage massif, salaire instantané ou revenu hors ligne à la reprise.
- Boîtier simplifié : son, mouvement réduit, qualité, export, import, suppression et fermeture ; Relire retiré, Réessayer uniquement en erreur. Supprimer demande une confirmation sur le boîtier avec export et annulation/Échap prioritaires. Remplacer atomiquement la progression par une nouvelle partie à 19 pièces, préférences conservées et Doigt arrêté ; vider les animations précédentes. En cas d’écriture refusée, conserver l’ancienne partie et suspendre. Verrou d’écriture obligatoire ; aucun effacement automatique d’une sauvegarde incompatible ni des autres données du navigateur.
- Un seul onglet peut écrire ; suspendre les autres. Ne pas présenter une sauvegarde locale comme protégée contre la modification volontaire.

## Rendu, interface et ton

- Plateau de 15 sorties : x40, x10, x5, x3, x1,5, x1, x0,5, x0,3, x0,5, x1, x1,5, x3, x5, x10, x40.
- Construire des chemins compatibles avec la sortie cible : 14 décisions gauche/droite, dont k à droite pour l'index k. Picots et trajectoires utilisent les mêmes coordonnées.
- Le rendu ne modifie jamais le résultat. Éviter téléportations finales, traversées visibles de picots et incohérences entre sortie et paiement.
- Direction artistique : lofi numérique dans une vraie cave 3D en pierre irrégulière sous le chalet de Papy, plafond bas à poutres, sol ancien, tapis, rangements, bûches, établi et outils. Fenêtre haute sur une nuit pluvieuse bleutée ; ampoule suspendue et lampe d’établi chaudes. Formes adoucies et ambiance accueillante.
- Les deux nouvelles références précisent une cave dense et habitée : canapé brun et plaid, pouf, tapis persan usé, poêle, étagères avec livres, robots et anciens appareils, plantes retombantes, guirlande chaude et plans d’atelier. Cadrage d’ensemble Plinko et vue établi ; rapprocher les supports pour leur lecture. Les inventions décoratives n’ajoutent aucune mécanique. Textures locales du bois, de la pierre et du tapis dans `src/assets/textures/`, provenance et prompts dans son README ; conserver de vrais volumes 3D.
- Corrections du créateur : canapé à trois places avec assise, profondeur et accoudoirs proportionnés ; établi adossé au mur latéral droit, avec catalogue, fournitures, éclairage et cadrages dans le même repère. Garder la fenêtre dégagée, sans l’affiche qui la recouvrait. Réorganiser les meubles qui gênent le nouvel emplacement sans masquer les interactions.
- Arrière de la cave selon la référence du 19 octobre : vraie pièce fermée en pierre et bois, atelier scientifique de Papy, tableau noir et croquis, verrerie, anciens appareils, fenêtre pluvieuse, télescope, prototype vert, aquarium et modèles suspendus. Premiers plans avec table de cartes, fauteuil/plaid, coffres, plantes, lanternes et poêle. Découverte pendant la descente, sans image de pièce projetée, nouveau système ni commande supplémentaire. Réutiliser les matériaux et le regroupement spatial des géométries.
- Machine contre le mur de pierre, près de l’établi : bois clair, plateau crème, sauge, rose poudré, lavande, écrans à pixels, compteur lumineux et gros bouton physique. Modules 3D indépendants montés à des emplacements prévus ; seuls les achats existants sont visibles. Les modèles des futurs modules ne créent aucune mécanique ni modification du contrat de sauvegarde.
- Boutique publique d’Azur selon la référence : entrée vitrée à gauche sur une rue bleue pluvieuse, comptoir central, appareils ordinaires variés et pastel, réparation et vitrine à droite ; bois usé, outils, composants et éclairages chauds. Aucun Plinko, prototype d’amélioration ni achat d’appareils ordinaires dans l’espace public. Visite explicitement choisie depuis les destinations après sa rencontre à la panne (`repairTriggered`). Caméras entrée/comptoir à 1,68 m, 0,5 s ou mouvement réduit immédiat ; interactions 3D au survol/focus, aucun HUD ; horloges économiques suspendues.
- Accès privé d’Azur autorisé après la réparation initiale achetée (`repairPurchased`), décision du créateur. Porte réelle derrière le comptoir, réserve utilitaire, étagère coulissante commandée par la radio, couloir puis atelier caché dans le même repère 3D. Déverrouillage, translation et découverte successifs ; entrée sur sélection explicite, clics répétés ignorés. Trajets prédéfinis à 1,68 m, sans traverser les meubles, instantanés en mouvement réduit. Retour par les repères physiques ou Échap : cadrage principal, réserve, boutique puis destinations. Mécanismes et cadrages transitoires, remis à zéro à chaque visite ; aucune modification du format de sauvegarde.
- Atelier privé : MasterPlinko réellement hors service, capot ouvert, panneau démonté, câbles débranchés, erreur statique ; prototypes distincts du Doigt, du Bac ouvert et du Duplicateur, instruments, circuits et schémas. Bois/crème/sauge/lavande/pêche, lumière chaude avec touches menthe. Objets décoratifs consultables sans déblocage automatique, don ni nouveau système économique. L’étagère mobile est une interprétation du dispositif secret, non précisé dans l’image d’atelier ; conserver son dégagement latéral et le couloir réel. Aucun contenu privé visible depuis les cadrages publics.
- Navigation ordinaire par cadrages prédéfinis : Plinko/établi, commandes, catalogue, boîtier et ticket ; pas de déplacement libre. Transitions de 0,5 seconde, immédiates en mouvement réduit ; dernière cible prioritaire, sans file. Le trajet de sortie distinct est défini dans le fichier 11.
- Aucun HUD dans la cave : plein écran sans marge ni défilement. Solde/mise/résultat et commandes sur la machine, achats sur catalogue, réglages/sauvegarde sur boîtier, historique sur ticket. Surfaces attachées aux objets 3D, explications au survol/focus uniquement. Exception explicite hors cave : destinations centrées sur noir complet ; service avec poste 3D dans sa salle d’usine et fiche physique, sans compteur économique flottant ni navigation ajoutée.
- Objets cliquables, Tabulation/Entrée, raccourcis directs et retour par Échap (après annulation de toute confirmation prioritaire). Lancement manuel et Décharge uniquement en vue Plinko ou commandes stabilisée ; achats dans le catalogue stabilisé. Les billes, la production et le bonus continuent pendant achats et navigation.
- L’escalier est le seul accès aux destinations. Survol/focus d’une marche, rampe ou support : toute la structure en bois se met en surbrillance, sans éclairer le mobilier voisin ; retirer l’effet en quittant l’objet ou au départ. Libellé : « Sortir de la cave » ; si des billes restent, indiquer d’attendre leur arrivée et d’arrêter le Doigt s’il est actif. Départ refusé sans mise en attente. Aucun travail ni visite à l’ouverture ; Tabulation/Entrée/Espace sur la liste noire ; raccourcis de cave bloqués hors cave. Voir fichier 11.
- Menus et textes en français, commandes explicites, navigation au clavier, son désactivable et mouvements réduits. Cible minimale : 1280×720.
- Garder solde, mise, résultat, coûts, conditions et états de blocage compréhensibles. Ne pas dépendre uniquement d'une couleur ou d'un son ; limiter flashs et effets masquant les billes.
- Éviter l'habillage marketing et les panneaux génériques envahissants ; conserver la machine 3D comme élément central.
- Humour absurde joué sérieusement, répliques courtes, voix distinctes et chaleur autour du chalet. Le grand-père d'Ewen s'appelle **Papy** ; utiliser uniquement ce nom pour le personnage.

## Méthode, validation et livraison

- Préserver les fichiers utilisateur sans rapport avec la tâche. Réutiliser le dépôt existant ; l'absence de dépôt distant ne bloque pas le développement local. Ne rien publier sans consigne de publication.
- Ne faire aucun commit ni push sans demande explicite du créateur. Dépôt distant fourni : `https://github.com/clementLQR/MasterPlinko.git`.
- Suivre de petites étapes du backlog en conservant leurs identifiants et un jeu jouable. Prévoir les contrats de sauvegarde dès les premières règles économiques.
- Ordre conseillé : structure et économie testable ; plateau et résultats ; usine, panne et atelier ; automatisation et Décharge ; persistance complète ; session de validation.
- Choisir des dépendances compatibles et conserver le lockfile. Documenter les commandes exactes dans le README : installation, localhost, build, vérification TypeScript et tests.
- Tester les transactions, refus sans débit, règlements idempotents, achats uniques, panne unique, usine et bonus, bornes du tirage injecté, reprise, imports et concurrence entre onglets. Utiliser les critères du fichier 11 ; éviter les tests qui recopient simplement l'implémentation.
- Vérifier explicitement 50 billes et le refus de la 51e, ainsi que la cohérence des chemins vers les 15 sorties. Mesurer la fluidité réelle lorsque les outils le permettent.
- Lancer les vérifications TypeScript, le build de production et les tests ciblés pour les changements de code concernés. Inspecter visuellement si possible et signaler toute vérification non effectuée.
- L'assistant réalise code, 3D procédurale et vérifications techniques ; le créateur évalue le rendu et le rythme lors d'une session de 10 à 15 minutes. Ne pas lui déléguer les parties techniques 2 à 4 de la checklist.
- Mettre à jour le backlog et la checklist uniquement après réalisation et vérification effectives. La présence d'une spécification ou d'un écran ne suffit pas.
- Après une décision, mettre à jour `doc/09_A_DEFINIR.md` et les documents concernés. Maintenir cet AGENTS.md cohérent si les règles changent.
- Livrer les instructions de lancement, les changements réalisés, les vérifications effectivement exécutées et les limites restantes. Ne pas annoncer un test manuel, une inspection visuelle, un dépôt distant ou un déploiement non réalisés.
