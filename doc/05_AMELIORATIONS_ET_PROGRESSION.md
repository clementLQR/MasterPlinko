# MasterPlinko — améliorations et progression

## Ressources proposées
| Ressource | Utilisation |
| --- | --- |
| Pièces | Mises, réparation et améliorations ordinaires |
| Résidus | Recherches et produits de Marceau |
| Échos | Améliorations permanentes après recalibrage |

Les noms Résidus, Échos et Recalibrage sont des propositions de travail. Éviter d'ajouter d'autres monnaies avant d'avoir un besoin distinct.

## Azur : production et automatisation
### Modules uniques
| Module | Effet |
| --- | --- |
| Réparation initiale | Remettre en service la machine après la panne |
| Doigt mécanique | Lancer automatiquement de petites billes gratuites |
| Bac comptable | Afficher résultats et bénéfices |
| Module de billes spéciales | Débloquer une famille de billes |
| Duplicateur à restitution incertaine | Dupliquer certains gains et faire apparaître des résidus |
| Compteur d'instabilité | Rendre lisible la préparation du recalibrage |

Le compteur d'instabilité remplace la proposition initiale de mesure d'addiction : il relie mieux le système au mystère.

### Améliorations à niveaux
- Graisse ambitieuse : cadence de lancement.
- Limiteur délimité : mise maximale.
- Ventilation financière : durée de Surchauffe.
- Modules de rendement : production et multiplicateurs.
- Modules de rareté : fréquence des billes spéciales.

Définir des limites pour éviter un nombre ingérable de billes et d'effets.

### Mises à jour
Achat sur un vieil ordinateur relié au Plinko.
Texte possible : « Mise à jour 1.0.1 : le bouton Quitter ne commande plus de pièces détachées. »
Séparer l'habillage de mise à jour des fonctions réelles. Une mise à jour ne doit pas prétendre corriger un faux bug nécessaire à la jouabilité.

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
Les trois améliorations sont uniques, sans niveaux :
| ID | Nom | Prix de test | Condition et effet |
| --- | --- | --- | --- |
| azur.initial_repair | Réparation initiale | 25 pièces | À la panne de test (50 pièces de retours cumulés), remet en marche et ouvre l'atelier |
| azur.auto_launcher | Doigt mécanique | 40 pièces | Après réparation ; produit une bille gratuite de base 1 toutes les 2 secondes |
| azur.accounting_tray | Bac comptable | 15 pièces | Après réparation ; ouvre les 100 derniers résultats avec origine, mise/base, multiplicateurs, retour et net |

Le solde, la mise et le dernier résultat restent visibles avant l'achat du Bac comptable.
Panne unique et aucune perte de bille. L'usine reste accessible pendant la panne.
Ces prix accélèrent l'évaluation du prototype ; ils ne remplacent pas le prix narratif envisagé de 1 000 pièces.
Ne pas implémenter les autres améliorations ou monnaies dans le développement initial.
