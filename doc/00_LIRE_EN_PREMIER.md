# MasterPlinko — dossier de conception

Ce dossier rassemble le concept initial, les idées développées ensemble et une méthode pour construire le jeu progressivement. Le prototype jouable est maintenant implémenté ; son état vérifié et les essais restants sont indiqués dans les fichiers 06 et 07.

## Statut des éléments
- **Direction retenue** : intention du projet ou idée accueillie favorablement dans la discussion.
- **Proposition de travail** : traduction concrète de cette direction ; modifiable après les essais.
- **À définir** : décision encore ouverte.
- Une valeur comme un prix, une durée ou un taux reste provisoire sauf indication explicite.
- Le grand-père d’Ewen s’appelle **Papy**. Utiliser uniquement ce nom pour le personnage.

## Documents
| Fichier | Contenu |
| --- | --- |
| [01_IDEE_DE_BASE.md](01_IDEE_DE_BASE.md) | Promesse, piliers, périmètre et méthode |
| [02_TON_ET_PERSONNAGES.md](02_TON_ET_PERSONNAGES.md) | Humour, voix et rôles des personnages |
| [03_SCENARIO_ET_CINEMATIQUES.md](03_SCENARIO_ET_CINEMATIQUES.md) | Mystère, huit chapitres, déclencheurs et scènes |
| [04_GAMEPLAY_ET_ECONOMIE.md](04_GAMEPLAY_ET_ECONOMIE.md) | Boucle, mises, automatisation, usine et interface |
| [05_AMELIORATIONS_ET_PROGRESSION.md](05_AMELIORATIONS_ET_PROGRESSION.md) | Azur, Marceau, Matéo et recalibrages |
| [06_BACKLOG.md](06_BACKLOG.md) | Fonctionnalités ordonnées et critères de réussite |
| [07_A_FAIRE_MAINTENANT.md](07_A_FAIRE_MAINTENANT.md) | Checklist de démarrage et validation du prototype |
| [08_A_FAIRE_ET_A_EVITER.md](08_A_FAIRE_ET_A_EVITER.md) | Règles de conception, narration et développement |
| [09_A_DEFINIR.md](09_A_DEFINIR.md) | Décisions ouvertes, priorités et recommandations |
| [10_ARCHITECTURE_EVOLUTIVE.md](10_ARCHITECTURE_EVOLUTIVE.md) | Responsabilités, données et sauvegardes |

## Ordre conseillé
1. Lire le concept et le gameplay.
2. Trancher uniquement les décisions bloquantes du fichier 09.
3. Suivre la checklist du fichier 07.
4. Utiliser le backlog pour choisir la prochaine fonctionnalité.
5. Revenir au scénario et aux systèmes avancés lorsque la boucle fonctionne.

## Entretien du dossier
Après un choix, mettre à jour sa décision dans le fichier 09 et les documents concernés.
Après une fonctionnalité réellement vérifiée, mettre à jour son statut dans le backlog.
Ne pas transformer tout le contenu futur en exigences du prototype jouable.

## Développement prêt à lancer
- [11_SPECIFICATION.md](11_SPECIFICATION.md) : règles complètes et valeurs de départ.
- [12_PROMPT_DE_DEVELOPPEMENT.md](12_PROMPT_DE_DEVELOPPEMENT.md) : consigne directement utilisable avec un assistant de code.

Pour commencer le développement, le fichier 11 fait autorité sur les propositions générales des autres documents.
Les choix explicites du créateur sont distingués des valeurs de réglage proposées.
Les fichiers historiques décrivent aussi des systèmes futurs : ne pas tout implémenter.

## Répartition du travail
L'assistant réalise le code et la 3D procédurale, documente le lancement et vérifie les règles.
Le créateur essaie le jeu, évalue le rendu et le rythme, puis formule ses retours.
Le jeu se lance en localhost avec les commandes du [README](../README.md). L’essai de 10 à 15 minutes par le créateur reste à faire.

## Navigation validée
Positions de caméra fixes dans la pièce, sans marche libre. Plinko et établi, escalier cliquable pour les destinations extérieures, transitions courtes et retour direct. La production continue pendant achats et cadrages ordinaires. La sortie anime approche et montée, puis destinations sur noir complet ; trajet, choix et descente suspendent le jeu. Pendant le travail, seule la durée du service avance dans un onglet visible. Cave en pierre lofi numérique et machine crème/pastel selon les références du créateur. Règles détaillées dans les fichiers 04 et 11.


## Gestion des documents
La boutique publique d’Azur est une visite distincte, accessible depuis les destinations après sa rencontre à la première panne. Après la réparation initiale achetée, la porte privée mène à une réserve, puis un passage dissimulé par une étagère et commandé par une radio révèle l’atelier du Plinko cassé et de ses prototypes. Aucun HUD, acquisition ou nouveau système économique ; horloges suspendues pendant toute la visite. Périmètre et interactions au fichier 11.

Modifier directement les fichiers de référence. Ne pas créer de copies datées, de fichiers de backup ou de variantes numérotées. Git/GitHub conserve l’historique des modifications. Les fonctionnalités restent distinguées entre travail immédiat et ajouts futurs.
