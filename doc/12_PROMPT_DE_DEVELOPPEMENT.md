# MasterPlinko — prompt de développement

Copier le bloc suivant dans un assistant de code ouvert à la racine du projet.

---

Réalise le prototype jouable de MasterPlinko à partir du dossier doc.

Commence par lire les éventuelles instructions AGENTS.md du dépôt, puis :
1. doc/11_SPECIFICATION.md — règles prioritaires.
2. doc/10_ARCHITECTURE_EVOLUTIVE.md — organisation et sauvegarde.
3. doc/07_A_FAIRE_MAINTENANT.md — checklist.
4. doc/02_TON_ET_PERSONNAGES.md — ton.
5. doc/06_BACKLOG.md — périmètre et critères.

Les fichiers de conception décrivent également le jeu futur. Implémente uniquement le développement initial du fichier 11.
BRIEF_DE_DEPART.md reste le brief historique ; les décisions explicites de la spécification précisent ses ambiguïtés.

## Résultat attendu
Un projet Vite + TypeScript + Three.js + HTML/CSS, jouable sur ordinateur en localhost.
Code et 3D procédurale réalisés par toi, sans exiger du créateur une modélisation manuelle.
Une machine de Plinko et un établi stylisés dans un petit décor de cave, éclairage soigné, avec deux cadrages prédéfinis et des transitions courtes. Pas de déplacement libre.
Objets cliquables, flèches discrètes, accès directs et retour à la machine par Échap. Respecter les priorités des fenêtres modales et le mode de mouvement réduit.
La production et les billes continuent pendant les achats, transitions et menu des destinations. L’escalier à gauche ouvre le choix des sorties, sans déplacement ni service automatique. Les visites extérieures non implémentées sont explicitement indisponibles ; aucun troisième cadrage n’est imposé.
Les résultats sont prédéterminés ; les trajectoires doivent être crédibles et rejoindre la bonne sortie. Pas de Rapier obligatoire pour ce développement initial.

## Règles impératives
19 pièces initiales ; mises de 1 à 10 ; 50 billes maximum.
Multiplicateurs, probabilités, achats, panne, usine, Surchauffe et sauvegarde exactement selon le fichier 11.
Ne pas choisir de nouveaux prix ou changer les probabilités sans documenter la raison.
Ne pas conditionner secrètement les résultats au solde.
Séparer règles économiques et rendu.
Gains et mises en centièmes entiers ; règlement unique par identifiant.
Enregistrer le résultat au lancement et le conserver au chargement.
Aucun revenu hors ligne, compte, serveur ou base SQL.

## Exécution
- Examiner l'existant avant de créer ou modifier des fichiers.
- Ne pas écraser les fichiers utilisateur sans rapport avec la tâche.
- Réutiliser le dépôt s'il existe ; sinon préparer le projet local et son versionnement.
- L'absence de dépôt distant ne bloque pas le développement local.
- Écrire d'abord les règles testables et les contrats de sauvegarde.
- Construire ensuite le plateau, les achats, l'usine, l'automatisation et la Décharge.
- Ajouter sauvegarde, import/export et reprise complète.
- Choisir des versions de dépendances compatibles au moment de l'installation et conserver le lockfile.
- Utiliser des modules simples, des identifiants stables et une configuration centralisée.
- Prévoir des tests ciblés sur les transactions et les cas de reprise ; éviter les tests qui ne font que recopier le code.
- Lancer TypeScript, build et tests ; inspecter visuellement si les outils le permettent.
- Corriger les erreurs dans le périmètre et conserver une version jouable.

## Direction artistique
Lofi numérique, selon les références visuelles du créateur : vraie cave 3D en pierre irrégulière, plafond bas à poutres, sol ancien, tapis, rangements, outils, bûches, escalier en bois et établi. Fenêtre haute sur une nuit pluvieuse bleutée ; ampoule suspendue et lampe d’établi chaudes. Machine contre le mur de pierre : bois clair, plateau crème, sauge, rose poudré et lavande, écrans à pixels, compteur lumineux et gros bouton physique. Modules 3D indépendants selon les acquisitions ; les modèles des modules futurs restent cachés et n’ajoutent aucune mécanique.
Humour absurde joué sérieusement, descriptions courtes.
Pas de prénom pour Papy.
Éviter un habillage de site marketing, les cartes génériques envahissantes ou les effets qui cachent le plateau.
Les commandes doivent rester claires même si elles ne sont pas toutes intégrées au décor à ce stade.

## À livrer
- Projet fonctionnel et instructions exactes pour localhost.
- Scripts de développement, build et tests.
- README avec commandes et limites connues.
- Résumé des fonctionnalités, vérifications réalisées et problèmes restants.
- Checklist mise à jour uniquement pour les tâches réellement terminées.

Ne demande pas au créateur d'écrire lui-même les parties 2, 3 ou 4 de la checklist.
Les valeurs provisoires sont déjà autorisées comme configuration de test.
Ne réalise pas les systèmes futurs et ne publie rien sans consigne de publication.

---


## Gestion des fichiers
Modifier les fichiers existants directement. Ne pas créer de copies de sauvegarde, de documents datés ou de variantes V suivies d’un numéro. Utiliser Git/GitHub pour l’historique. Conserver les noms de référence du dossier doc.
