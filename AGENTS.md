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
- Multiplicateurs : x0,3 / x0,5 / x1 / x1,5 / x3 / x5 / x10 / x40. Poids respectifs sur 1 000 : 400 / 250 / 170 / 90 / 50 / 20 / 18 / 2.
- Tirer le résultat avant l'animation, indépendamment du solde et des pertes passées. Même distribution pour les billes manuelles et automatiques ; aucun gros gain garanti.
- Tirer la catégorie puis le côté à 50/50 lorsqu'elle a deux sorties. Ne pas doubler sa probabilité.
- Maximum 50 billes en cours, toutes origines confondues. Vérifier fonds, capacité, cadence et état du jeu avant tout débit ; un refus ne change pas le solde.
- Intervalle manuel minimum : 0,5 seconde. Chute visuelle cible : 3 à 4 secondes.
- Figer au lancement origine, mise débitée, base, multiplicateur, sortie, facteur de bonus et retour final. Régler une seule fois par identifiant.
- Panne prototype à 50 pièces de retours bruts cumulés du Plinko, une seule fois. Bloquer les nouveaux lancements, régler les billes restantes, puis permettre la réparation. Ne pas utiliser le solde, le bénéfice ou les salaires pour ce seuil.
- Achats uniques : `azur.initial_repair` à 25 pièces ; `azur.auto_launcher` à 40 ; `azur.accounting_tray` à 15. Les deux derniers nécessitent la réparation. Réparer nécessite zéro bille en cours.
- Doigt mécanique : une bille gratuite de base 100 centièmes toutes les 2 secondes, sans débit ni utilisation de la mise sélectionnée. Au plafond, attendre sans accumuler de file d'attente. Automatisation arrêtée au démarrage, au chargement, après import et au retour de l'usine.
- Bac comptable : consulter les 100 derniers résultats, conservés dès le début. Solde, mise et dernier résultat restent toujours visibles.
- Surchauffe : 100 règlements chargent une Décharge, une charge maximum ; activation manuelle x10 pendant 10 secondes actives. Aucun comptage pendant le bonus ou lorsqu'une charge est prête. Aucun effet rétroactif sur les billes déjà lancées.
- Usine : accessible même pendant la panne ou sous 1 pièce, avec zéro bille en cours. Arrêter l'automatisation lors de la demande. Un service de 15 secondes actives verse 15 pièces une seule fois ; aucun lancement, achat ou activation de Décharge pendant le service. Suspendre la durée de Surchauffe pendant ce service.
- Les valeurs narratives de panne à 1 234 pièces et de réparation envisagée à 1 000 pièces ne sont pas celles du prototype. Ne pas ajouter de sélecteur de profil dans l'interface de jeu.

## Architecture et persistance

- Séparer état sérialisable, économie, tirage, progression, Surchauffe, usine, rendu, interface et persistance. Centraliser constantes et identifiants stables.
- Garder les règles économiques indépendantes de Three.js et des callbacks d'animation. Injecter la source aléatoire pour les tests.
- Préférer de petits modules ; ajouter une abstraction seulement pour un besoin concret.
- Au lancement : valider, tirer et calculer, créer le prochain état complet, sauvegarder le snapshot, puis publier l'état et animer.
- Au règlement : vérifier la présence de l'identifiant, créditer et retirer la bille dans le même prochain état, mettre à jour statistiques, historique, compteur et panne, puis sauvegarder avant publication.
- Si l'écriture échoue, conserver l'ancien état, signaler le problème et suspendre les mutations économiques. Permettre l'export de l'état disponible ; ne pas annoncer une sauvegarde réussie.
- Snapshot JSON avec un numéro de format interne (`saveVersion = 1`, clé proposée `masterplinko.save`) : respecter le contrat du fichier 10. Ce numéro sert à la compatibilité des données, sans créer de fichiers ou dossiers supplémentaires. Ne pas sérialiser les objets Three.js ou les valeurs dérivées.
- Sauvegarder chaque transaction et changement de préférence ; checkpoint des durées actives environ chaque seconde, avec arrondi conservateur.
- Au chargement et après import : valider, régler les billes en attente par ordre de lancement avec leur retour figé, sauvegarder l'état réconcilié, puis autoriser le jeu. Ne jamais relancer le hasard ou repayer une bille.
- Valider type, version, entiers sûrs, bornes, identifiants, unicité et cohérence avant de remplacer une sauvegarde. Refuser une version future ou un import invalide sans altérer la partie actuelle. Prévenir du remplacement et proposer l'export de l'état actuel.
- Ne pas écraser automatiquement une sauvegarde inconnue ou invalide par une nouvelle partie.
- Le temps actif avance uniquement quand l'onglet est visible et la partie non suspendue. Aucun rattrapage massif, salaire instantané ou revenu hors ligne à la reprise.
- Un seul onglet peut écrire ; suspendre les autres. Ne pas présenter une sauvegarde locale comme protégée contre la modification volontaire.

## Rendu, interface et ton

- Plateau de 15 sorties : x40, x10, x5, x3, x1,5, x1, x0,5, x0,3, x0,5, x1, x1,5, x3, x5, x10, x40.
- Construire des chemins compatibles avec la sortie cible : 14 décisions gauche/droite, dont k à droite pour l'index k. Picots et trajectoires utilisent les mêmes coordonnées.
- Le rendu ne modifie jamais le résultat. Éviter téléportations finales, traversées visibles de picots et incohérences entre sortie et paiement.
- Machine stylisée : bois, métal usé, vis, câbles, bouton mécanique et compteurs ; lumière chaude, fond plus sombre et plateau lisible.
- Navigation dans une même scène par deux cadrages prédéfinis, Plinko et établi d’Azur ; aucun déplacement libre. Transitions de 0,5 seconde, instantanées en mouvement réduit ; dernière cible prioritaire, sans file d’attente.
- Accès directs, flèches, objets cliquables et retour par Échap (après fermeture de toute modale prioritaire). Lancement manuel et Décharge uniquement en vue Plinko stabilisée ; achats à l’établi stabilisé. Les billes, la production et le bonus continuent pendant achats et navigation. La porte ouvre le choix d’aller à l’usine. Voir fichier 11 pour les règles détaillées.
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
