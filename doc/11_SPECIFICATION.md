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
| Usine | 15 secondes actives pour 15 pièces |
| Charge de Surchauffe | 100 billes réglées |
| Bonus | Retours x10 durant 10 secondes actives |
| Charges stockables | 1 |
| Taille de fenêtre cible minimale | 1280×720 |

Les valeurs histoire (panne à 1 234, réparation envisagée à 1 000) restent documentées, mais ne sont pas actives dans ce profil prototype.
Ne pas créer de bascule de profil dans l'interface de jeu. Centraliser les constantes pour une évolution ultérieure.

## 3. Probabilités
| Multiplicateur | Poids sur 1 000 | Probabilité |
| --- | --- | --- |
| x0,3 | 400 | 40 % |
| x0,5 | 250 | 25 % |
| x1 | 170 | 17 % |
| x1,5 | 90 | 9 % |
| x3 | 50 | 5 % |
| x5 | 20 | 2 % |
| x10 | 18 | 1,8 % |
| x40 | 2 | 0,2 % |

Somme 1 000, retour moyen 1,06 hors Surchauffe.
Le tirage ne dépend pas du solde, des pertes passées, des achats ou d'une promesse de gain.
Un gros gain n'est jamais garanti.
Utiliser les mêmes poids pour le manuel et l'automatique.

## 4. Plateau et trajectoires
15 sorties de gauche à droite :
x40 ; x10 ; x5 ; x3 ; x1,5 ; x1 ; x0,5 ; x0,3 ; x0,5 ; x1 ; x1,5 ; x3 ; x5 ; x10 ; x40.
Tirer d'abord la catégorie de multiplicateur. Pour une catégorie présente deux fois, choisir gauche/droite à 50/50.
Ne pas appliquer la probabilité entière à chacune des deux sorties : cela doublerait la fréquence.

Chemin proposé : 14 décisions gauche/droite ; pour atteindre l'index k (0 à 14), utiliser k décisions droites et 14-k décisions gauches, dans un ordre aléatoire.
Adapter la position des picots et la trajectoire aux mêmes coordonnées ; ajouter des arcs courts et des rebonds crédibles.
Ne jamais téléporter la bille vers la sortie à la dernière seconde, traverser un picot visiblement ou afficher un multiplicateur différent du résultat payé.

## 5. Argent et lancement
Monnaie en centièmes entiers : solde initial 1 900.
Mises 100 à 1 000, par pas de 100.
Multiplicateurs représentables en centièmes : 30, 50, 100, 150, 300, 500, 1 000, 4 000.
Retour = base × multiplicateur / 100 × facteur de bonus, avec arrondi documenté au centième si nécessaire.
Les bases entières proposées produisent des retours exacts.

Manuel : base = mise, débit immédiat.
Automatique : base 100, débit nul.
Le facteur de Surchauffe (1 ou 10) est figé au lancement, comme le retour final.

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
5. Autoriser l'achat uniquement lorsque les billes restantes sont réglées.

Réparation payée : machine utilisable, atelier ouvert, cette panne désactivée définitivement.
L'usine reste accessible pendant la panne.
Aucun compte à rebours ne doit faire repayer une réparation.

## 7. Trois améliorations
| Identifiant | Achat | Condition | Effet |
| --- | --- | --- | --- |
| azur.initial_repair | 25 pièces | Panne déclenchée, zéro bille en cours | Réparer et ouvrir l'atelier |
| azur.auto_launcher | 40 pièces | Réparation achetée | Ajouter marche/arrêt automatique |
| azur.accounting_tray | 15 pièces | Réparation achetée | Consulter les 100 derniers résultats |

Chaque achat est unique. Achat refusé sans fonds.
Le dernier résultat, le solde et la mise sont toujours disponibles.
Historique conservé dès le début mais consultable seulement avec le Bac.
Historique : origine, mise débitée, base, multiplicateur, bonus, retour et net. Le net d'une bille gratuite égale son retour.

## 8. Surchauffe
À chaque règlement, compter une bille si le bonus n'est pas actuellement actif et qu'aucune charge n'est déjà prête.
À 100, bloquer le compteur à 100 et allumer DÉCHARGE.
Activation possible seulement hors panne/usine, sans bonus actif :
- Consommer la charge et remettre le compteur à zéro.
- Activer x10 pendant 10 secondes actives.
- Ne pas recharger pendant ce temps.
À expiration, reprendre le comptage des prochains règlements.
Une bille lancée avec bonus conserve son retour même si elle arrive après expiration.
Une bille lancée avant activation ne gagne pas rétroactivement le x10.
Afficher le temps restant et le facteur réellement appliqué au résultat.

## 9. Usine
Accessible à tout moment où zéro bille est en cours ; ne pas réserver l'accès au solde exactement nul.
Cliquer sur Aller travailler arrête l'automatisation. S'il reste des billes, indiquer d'attendre leur arrivée puis réessayer.
Service de 15 secondes actives, un seul à la fois, versement de 15 pièces une seule fois.
Pendant le service : aucun lancement, achat ou activation de Décharge. Le temps de Surchauffe est suspendu.
Au retour, l'automatisation reste arrêtée.
Un onglet masqué suspend le service. Recharger le reprend au dernier checkpoint enregistré ; aucun salaire instantané ou deuxième versement.
Pas de licenciement ni de calendrier dans le périmètre initial.

## 10. Sauvegarde
Clé proposée : masterplinko.save.
Snapshot JSON complet et saveVersion 1 : voir fichier 10 pour le contrat.
Enregistrer lancement, règlement, achat et salaire comme des transactions atomiques du snapshot.
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

## 11. Visuel et interactions
- Machine en bois et métal, fixations, picots, bac, bouton et compteur.
- Un sol, un mur et une lumière de cave suggèrent le chalet.
- Deux positions de caméra fixes reliées par de courtes transitions : Plinko et établi d'Azur. Plateau entièrement lisible depuis sa vue.
- Matériaux, textures simples générées par code et éclairage soignés.
- Menus HTML/CSS français, lisibles, accessibles au clavier.
- Atelier et usine accessibles par commandes explicites.
- Son désactivable ; animations réduites ; limiter les flashs.
- États clairs : fonds insuffisants, plafond, panne, usine, bonus prêt.
- Nom de Papy sans prénom.
- Texte possible : « Normalement, ça tient. — Azur »
Ne pas faire du développement initial un dashboard générique sans machine 3D.

### Navigation dans la pièce — choix validé
Une seule scène 3D avec machine et établi visibles dans des cadrages distincts. Cliquer sur l'établi déplace et oriente la caméra vers lui ; cliquer sur la machine permet de revenir.
Ajouter des flèches discrètes et des commandes directes pour rejoindre toute vue disponible. Ne jamais imposer une traversée séquentielle de cadrages.
La porte reste accessible comme action ouvrant le choix d'aller à l'usine ; aucun troisième point de caméra n'est obligatoire dans le développement initial.

Paramètre de départ : transition de 0,5 seconde, interpolation douce de position et orientation. Réglage animations réduites : transition instantanée.
Pendant une transition, bloquer les interactions manuelles avec les objets et panneaux concernés. Une nouvelle demande de navigation remplace la cible précédente ; aucune file de mouvements.
Le lancement manuel et Décharge sont disponibles seulement en vue Plinko stabilisée.
Échap ramène à la machine ; si une fenêtre modale est ouverte, le premier Échap ferme cette fenêtre et le suivant revient au Plinko. Ignorer les raccourcis lorsqu'un champ de saisie les utilise.
Les commandes sont accessibles au clavier, avec un état de focus visible.

La caméra ne suspend pas le jeu : automatisation, billes, gains et durée de Surchauffe continuent pendant les achats et les transitions. Les règles particulières de l'usine, de l'onglet caché et des dialogues bloquants restent prioritaires.
Si Décharge devient prête à l'établi, afficher un indicateur discret et un retour direct, sans activation ou déplacement automatique.
L'établi est visitable au départ, avec des informations verrouillées. À la panne, la réparation devient achetable ; après réparation, les deux autres achats s'ouvrent.
Ne pas déplacer automatiquement la caméra lors d'une panne : afficher une notification avec accès à l'établi.
Repartir en vue Plinko après chargement. La vue courante et une transition partielle ne sont pas nécessaires dans la sauvegarde économique.

Fonctionnalités futures : cadrages Marceau et Matéo déverrouillés avec leurs rencontres. Pas d'implémentation anticipée de ces espaces ou d'un système de marche libre.

## 12. Tests de réception
- Nouvelle partie : 19,00 pièces, mise 1,00, aucune amélioration.
- Mise 10, x0,3 : débit 10, retour 3, net -7.
- Mise 1, x1 : solde inchangé après règlement hors bonus.
- Bille gratuite x3 : aucun débit, retour 3.
- Bonus : base 1, x0,5, facteur 10 → retour 5.
- 50 billes présentes : 51e refusée sans changement de solde.
- Même id réglé deux fois : un seul crédit.
- Panne à 50 de retours : une seule occurrence ; usine toujours possible.
- Achats uniques et refus si fonds insuffisants.
- Usine : salaire unique ; reprise de service sans duplication.
- Bonus actif : pas de nouvelle charge ; durée et snapshot cohérents.
- Rechargement pendant plusieurs vols : retours identiques, crédit unique.
- Import invalide ou futur : partie actuelle intacte.
- Onglet caché : aucune nouvelle bille et aucune durée active écoulée.
- Deux onglets : un seul peut modifier la partie.
- Distribution : somme exacte et bornes de tirage testées avec hasard injecté.
- Chemins vers les 15 sorties : endpoint et multiplicateur cohérents.
- Navigation Plinko/établi au clic et au clavier ; retour direct sans parcours imposé.
- Production et règlements inchangés pendant une transition ou un achat.
- Plusieurs demandes rapides de navigation : dernière cible atteinte, aucun clic de mise accidentel.
- Animations réduites : déplacement instantané ; fonctionnement identique du jeu.
- Notification de Décharge à l'établi ; panne et chargement cohérents avec les verrouillages de vue.
- Build production, vérification TypeScript et tests ciblés réussis.

La session manuelle finale relève le délai de réparation, d'automatisation, les blocages et la lisibilité des trajectoires.

## 13. Livrables attendus du développement
Projet source, lockfile, README de lancement, configuration centralisée, tests utiles et compte rendu des vérifications réellement faites.
Commandes visées : npm install (ou npm ci avec lockfile), npm run dev, npm run build, npm test.
Ne pas annoncer un déploiement, un dépôt distant ou une vérification visuelle non effectués.

## 14. Hors périmètre
Chalet complet, personnages 3D détaillés, longs chapitres, Rapier pour les billes, mini-jeux élaborés, Marceau, Matéo, produits, grigris, résidus, trois plateaux, recalibrage, Paul, revenu hors ligne, comptes et SQL.
