# MasterPlinko — prompt de développement

Copier le bloc suivant dans un assistant de code ouvert à la racine du projet.

---

Réalise le prototype jouable de MasterPlinko à partir du dossier doc.

Parcours actuel des améliorations : aucun livre sur l’établi de la cave. Acheter la réparation sur le devis public d’Azur (25 pièces, zéro bille), installée dès le paiement, puis accéder à l’atelier privé dans la même visite. Son carnet feuilletable vend le Doigt (40), le Bac (15), les Aimants (200) et le Collecteur (120), installés dès l’achat ; plus de trappe de montage. Les études futures ne sont pas à vendre. Achats uniques, `repairPurchased` à l’achat de la réparation, plans payés des anciennes sauvegardes installés au chargement ; format 6 avec migration 1/2/3/4/5 conservant les modules installés et les retours figés. Prix et autres règles inchangés, aucun HUD.

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
Une machine de Plinko et un établi stylisés dans une cave 3D, éclairage soigné, cadrages principaux Plinko/établi et cadrages de lecture des supports. Pas de déplacement libre.
Suivre les deux dernières références pour densifier la cave : salon avec canapé et plaid, pouf, tapis persan, poêle, étagères d’anciens appareils, livres et bricolages, plantes et petits éclairages chauds. L’atelier garde ses outils et ses plans. Vrais volumes procéduraux, trois textures de surface locales documentées dans `src/assets/textures/README.md`, aucun fond de pièce en image. Les objets d’invention décoratifs n’ajoutent aucune mécanique future. Comparer les captures, corriger composition, matériaux et lumière, puis distinguer l’auto-évaluation subjective de l’assistant de la validation artistique du créateur.
Aucun HUD dans la cave : plein écran sans marge, bandeau, colonne ou commandes flottantes. Boutons et écrans sur les objets 3D ; améliorations vendues et installées depuis les supports d’Azur, boîtier mural pour réglages/export/import. Explications brèves uniquement au survol/focus, raccourcis et Échap. Confirmations d’import et de suppression prioritaires, mouvement réduit respecté. Boîtier simplifié : retirer Relire et ne montrer Réessayer qu’en erreur ; suppression après confirmation avec export et annulation possibles, remplacement atomique par une nouvelle partie à 19 pièces avec réglages conservés, aucun ancien vol ni revenu conservé.
Les billes et la production continuent pendant achats et cadrages ordinaires. L’escalier constitue le seul départ : attendre zéro bille, arrêter le Doigt au départ autorisé, bloquer les interactions puis animer approche et montée prédéfinies. Conserver la hauteur des yeux de la vue Plinko : approche à altitude constante et ligne de marche lissée au-dessus des marches, avec trémie dégagée et même stature au retour. Fondu complet avant les destinations. Visites masquées jusqu’à leur déblocage et leur implémentation, sans mécanique inventée.
Exception explicite hors cave : liste centrée sur noir, usine ou redescente sur sélection uniquement. Le service conserve l’ancienne salle d’usine 3D, avec tapis de tri et fiches physiques. Pendant une minute active, cliquer les grises (+) rapporte 0,50 pièce chacune, versée au terme. Les manquées et l’inactivité ne rapportent rien ; une rouge (×) fait exploser le joueur et annule tout le salaire du service. Souris ou clavier, aucun HUD. Conserver score, billes, cadence, durée et résultat au chargement/import ; format interne 6 avec migration des formats 1/2/3/4/5 et ancien contrat conservé pour les seuls services déjà commencés. Prévoir les événements temporaires Surcadence, Arrivage massif et Ralentissement, annoncés sur la fiche deux secondes avant : plan sauvegardé, effets réels sur vitesse/arrivées et positions continues ; réglages au fichier 11. Un ancien service du format 2 finit sans événement. Montée, liste et descente suspendent le jeu ; seul le travail avance dans un onglet visible, sans revenu hors ligne ni double versement. Fin ou explosion : retour aux destinations, aucune sélection automatique. Retour par trajet inverse/fondus ; Doigt laissé arrêté.
Les résultats sont prédéterminés ; les trajectoires doivent être crédibles et rejoindre la bonne sortie. Pas de Rapier obligatoire pour ce développement initial.
Extension demandée : boutique publique d’Azur selon la référence vue depuis l’entrée. Vitrine/baie gauche, comptoir central, rangements d’appareils au fond, coin réparation et vitrine à droite ; bois usé, appareils pastel et silhouettes variées, éclairages chauds/bleus. Aucun Plinko, prototype d’amélioration ou système d’achat d’appareils ordinaires dans cet espace public. Visite sur sélection depuis les destinations après la rencontre de la panne (`repairTriggered`), sans nouveau drapeau ni format ; horloges économiques suspendues. Vues entrée/comptoir à hauteur des yeux, transition courte ou réduite, objets interactifs au survol/focus et Échap, aucun HUD. La porte privée est le raccord de l’extension réserve/passage/atelier, autorisée après la réparation initiale achetée. Inspecter les vraies caméras et fournir captures, limites et note sur cinq critères de deux points ; corriger les défauts si la note honnête est inférieure à 9/10.

## Règles impératives
19 pièces initiales ; mises de 1 à 10 ; 50 billes maximum.
Multiplicateurs, probabilités, achats, panne, usine, Surchauffe et sauvegarde exactement selon le fichier 11. Le créateur a fixé la Décharge à ×2 pendant 10 secondes ; les sorties ×10 et les gains anciens déjà figés restent inchangés.
Ne pas choisir de nouveaux prix ou changer les probabilités sans documenter la raison.
Nouveau réglage plus sévère demandé : 60/24/10/3,5/1,5/0,6/0,3/0,1 % dans l’ordre des huit multiplicateurs. Hors bonus : 84 % de pertes et retour moyen de 59,75 %. Préserver les retours déjà figés et appliquer les nouveaux poids aux prochains lancements seulement, en manuel comme en automatique.
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
L’arrière de la cave suit la référence du 19 octobre : pièce réellement fermée, atelier scientifique, tableau noir chargé, fenêtre bleue pluvieuse, verrerie et rangements, télescope, prototype vert, aquarium et modèles suspendus, table de cartes et fauteuil avec plaid. Le regard le découvre pendant la descente puis revient progressivement au Plinko ; durées et contraintes au fichier 11. Aucun nouveau système de jeu ni interface ajouté pour ces objets décoratifs.
Chez Azur, conserver la boutique publique et raccorder sa porte privée à une réserve, un passage secret et l’atelier caché. Accès après la réparation initiale installée, confirmé par le créateur. Radio décorative et étagère coulissante avec course dégagée : un clic sur la porte privée enchaîne automatiquement réserve, déverrouillage, découverte et entrée sans autre clic. Plaque Maison ou Échap depuis l’atelier pour rentrer directement à la cave, plaque Boutique pour le retour inverse ; caméras prédéfinies à hauteur des yeux et retour physique/clavier. Plinko réellement cassé et prototypes distincts sans nouvelle mécanique ni acquisition. Interprétation de la dissimulation et critères de vérification au fichier 11 ; aucune modification du format de sauvegarde.
Le bureau privé porte un véritable carnet 3D de douze doubles pages de plans et notes, incluant le module numérique et les billes spéciales. Feuilletage recto-verso par les coins physiques ou les flèches du clavier, animation de 560 ms sans file d’attente, immédiate en mouvement réduit ; retour par signet ou Échap. Consulter les études ne débloque aucune amélioration. Conserver la page pendant la visite, revenir au début à la visite suivante ; aucun HUD ni changement de sauvegarde.
Aimants achetables : plan à 200 pièces, réparation et Doigt installés requis ; achat chez Azur, installé immédiatement. Recharge de 5 secondes actives avec Doigt, prochaine bille automatique vers le voisin supérieur ; ×40 conserve sa sortie et l’activation, centre à 50/50, manuelles inchangées. Résultats figés et recharge persistés sans hors ligne. Module normal actif aussi en production ; ancien prêt DEV conservé via VITE_MAGNETS_TRIAL=1, sans possession inventée ni option d’essai persistée. Rail/commande 3D sans HUD, détails au fichier 11.
Pas de prénom pour Papy.
Collecteur de ratés achetable : plan à 120 pièces après réparation installée, sans obligation de Doigt. Dix sorties sous ×1 des manuelles/Doigt donnent une bille gratuite de base 1, exclue de son propre remplissage et des aimants. Réserve unique au plafond, lancement prioritaire dès qu’une place est libre en jeu actif. Achat atomique installant le module, fonctionnement normal en production ; prêt DEV facultatif conservé. Format 6, migration 1/2/3/4/5 sans perte ni module offert, résultats figés payés une fois. Réservoir/écran/tube sans HUD. Autres améliorations futures encore à concevoir.
Éviter un habillage de site marketing, les cartes génériques envahissantes ou les effets qui cachent le plateau.
Les commandes doivent rester claires et intégrées aux objets 3D, avec explications au survol ou au focus clavier.

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
