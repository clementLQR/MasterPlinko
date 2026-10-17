# MasterPlinko — idée de base

## Pitch
Ewen, un jeune ouvrier, hérite du chalet de son grand-père. Dans la cave, il découvre un vieux Plinko sous un drap, accompagné d'une pancarte : « Ne pas appuyer sur Jouer. Même pour voir. »

La machine exige de l'argent, puis en distribue beaucoup trop. Ewen la répare, l'améliore et l'automatise avec l'aide d'Azur, ancien ami de Papy. Les bénéfices augmentent, des objets impossibles apparaissent et Paul, troisième inventeur du système, commence à réclamer sa part.

## Promesse
Faire tomber des billes. Gagner beaucoup trop d'argent. Acheter des améliorations qui auraient dû rester des idées.

## Genre et expérience
- Jeu solo idle narratif autour du Plinko.
- Départ manuel, puis automatisation et choix de synergies.
- Décor principal : un chalet progressivement transformé en atelier habité.
- Ton : humour bête, logique absurde et personnages très sérieux.
- Progression : du petit bricolage aux anomalies économiques et physiques.
- Argent envisagé comme une ressource fictive interne au jeu. Aucune mécanique d'argent réel n'est prévue dans ce concept.

## Les cinq piliers
1. **Plaisir immédiat** : lancer une bille, suivre sa chute et comprendre son résultat.
2. **Progression visible** : chaque achat change le rendement, les possibilités ou l'apparence.
3. **Automatisation satisfaisante** : passer de l'action répétée à l'organisation d'une machine.
4. **Personnages utiles** : chaque rencontre apporte une mécanique identifiable.
5. **Escalade absurde** : la machine devient plus rentable et plus difficile à expliquer à un assureur.

## Objectif du joueur
Au départ, payer ses factures et découvrir l'héritage. Ensuite, faire prospérer le chalet, comprendre la machine et affronter Paul. Après l'histoire, poursuivre les optimisations et les recalibrages.

## Ce que le projet ne doit pas perdre
Le chalet, l'héritage de Papy, les inventions poussiéreuses, la pancarte, les trois anciens associés, l'usine, les compagnons et les billes doivent rester liés entre eux.

## Méthode de développement
Définir la direction générale, construire une boucle jouable, la tester, puis ajouter les systèmes progressivement.

Première cible : une session d'environ 10 à 15 minutes qui donne envie d'acheter la prochaine amélioration. Cette durée est une cible de test, pas un équilibrage définitif.

Le chalet détaillé, les longues cinématiques, les trois plateaux et le combat final peuvent attendre que cette boucle fonctionne.

## Cible technique et artistique
Jeu navigateur sur ordinateur, développé par prompts et code généré : Vite, TypeScript, Three.js et HTML/CSS.
3D procédurale stylisée, éclairage chaleureux et machine bricolée. Navigation validée par positions de caméra fixes dans une même pièce : Plinko et établi dans le développement initial, transitions courtes et accès directs. Pas de marche libre. Le plateau, l'établi et quelques éléments de cave suffisent au prototype ; pas de personnages 3D détaillés.
Résultat déterminé avant animation. Rapier, envisagé initialement, n'est pas nécessaire à la logique des billes du développement initial.
Voir la spécification 11 pour les paramètres exécutables.
