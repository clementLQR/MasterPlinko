# MasterPlinko — à faire et à éviter

## Conception
### À faire
- Valider le plaisir du Plinko avant de produire toute l'histoire.
- Montrer ce qu'un achat change.
- Conserver un moyen garanti de repartir sans argent.
- Donner un rôle distinct à Azur, Marceau et Matéo.
- Mesurer cadence, variance et rendement moyen.
- Prévoir un intérêt aux stratégies régulières.
- Distinguer revenu passif en session et revenu pendant l'absence.

### À éviter
- Concevoir cinquante améliorations avant d'en tester trois.
- Ajouter une monnaie pour chaque personnage sans nécessité.
- Rendre une étape narrative dépendante d'une rareté non garantie.
- Confondre gros multiplicateur et amélioration forcément intéressante.
- Laisser l'inflation rendre tous les prix insignifiants.
- Punir une absence réelle avec un licenciement ou une perte de ressources.
- Détruire des heures de progression pour une surprise scénaristique.

## Ton et narration
### À faire
- Jouer l'absurde avec sérieux.
- Utiliser les animations, objets et descriptions pour raconter.
- Faire évoluer les gags et le chalet.
- Garder des moments affectifs autour de Papy.
- Expliquer les conséquences de la destruction et de la reconstruction.

### À éviter
- Donner un prénom à Papy.
- Faire de tous les personnages la même voix sarcastique.
- Remplir chaque dialogue de références ou de mèmes.
- Expliquer pourquoi une plaisanterie est drôle.
- Transformer les croyances de Matéo en conseils de jeu d'argent réel.
- Changer brutalement de registre sans préparer la transition.

## Interface
### À faire
- Intégrer les actions au décor tout en gardant des repères.
- Rendre le solde, la mise et le résultat toujours accessibles.
- Indiquer clairement effets temporaires, coûts et conditions.
- Prévoir des raccourcis et la possibilité de passer les dialogues.

### À éviter
- Cacher un bouton indispensable dans un objet illisible.
- Dépendre uniquement d'une couleur ou d'un son.
- Faire expirer un consommable pendant une scène imposée.
- Multiplier les déplacements de caméra pour des actions répétitives.
- Saturer le plateau avec des effets qui masquent les billes.

## Développement
### À faire
- Séparer règles, données, rendu et sauvegarde.
- Garder une version jouable à chaque étape.
- Utiliser Git/GitHub pour l’historique du projet ; contrôler la compatibilité des sauvegardes du jeu.
- Écrire quelques vérifications utiles sur l'économie et les migrations.
- Ajouter une abstraction seulement lorsqu'un besoin concret la justifie.

### À éviter
- Écrire toute la logique dans les clics de l'interface.
- Récompenser directement le joueur dans plusieurs callbacks de collision.
- Réécrire tout le moteur à chaque module.
- Créer un système générique capable de tout avant la première bille.
- Ajouter une base SQL avant de savoir ce qui doit être partagé ou synchronisé.
- Présenter le prototype comme sécurisé contre la triche s'il repose sur un état local modifiable.

## Utilisation avec un assistant de code
Demander une tâche précise du backlog, ses limites et son critère de réussite.
Faire conserver les identifiants de données et le format des sauvegardes.
Ne pas demander de réaliser tout le dossier en une seule génération.
Ne pas laisser l'assistant décider silencieusement des questions marquées « À définir ».

## Règles supplémentaires
- La sortie prédéterminée prime sur l'animation ; ne pas retoucher le tirage selon le solde ou les pertes récentes.
- Ne pas relancer le hasard au chargement.
- Ne pas facturer la bille gratuite.
- Ne pas arrondir le solde à la pièce entière.
- Ne pas utiliser Rapier pour imposer une simulation qui contredirait la sortie choisie.
- Ne pas produire un chalet complet ou des personnages détaillés avant la boucle.
- Réaliser la 3D de base par code ; aucun téléchargement d'asset n'est indispensable au développement initial.
- Les paramètres provisoires explicitement délégués peuvent être implémentés sans redemander chaque prix.
- Documenter toute modification de règle ; ne pas présenter un essai non réalisé comme une validation.
