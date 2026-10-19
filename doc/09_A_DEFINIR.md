# MasterPlinko — décisions et questions restantes

## Décisions du créateur
| Sujet | Décision |
| --- | --- |
| Mode de réalisation | IA et prompts pour le code et la 3D |
| Support | Navigateur, ordinateur |
| Stack de base | Vite, TypeScript, Three.js, HTML/CSS |
| Résultat | Déterminé avant la chute, pas par la physique |
| Multiplicateurs | x0,3 / x0,5 / x1 / x1,5 / x3 / x5 / x10 / x40 |
| Difficulté du Plinko | Baisser les probabilités de gain pour perdre beaucoup plus ; ajuster les poids des nouveaux lancements, sans tirage dépendant du solde ou des pertes passées |
| Solde | 19 pièces |
| Mises | 1 à 10 pièces |
| Sans argent | Travail à l'usine |
| Premières améliorations | Réparation initiale, Doigt mécanique, Bac comptable |
| Capacité | 50 billes simultanées |
| Développement | GitHub : https://github.com/clementLQR/MasterPlinko.git ; essai localhost ; aucun commit ni push sans demande explicite |
| Nom du grand-père d’Ewen | Papy |
| Gestion des fichiers | Modifier les fichiers et dossiers existants, sans variantes numérotées |
| Navigation | Positions de caméra fixes, transitions courtes, accès directs ; pas de déplacement libre |
| Hauteur du regard dans l’escalier | Même stature que devant le Plinko ; approche à altitude constante, hauteur au-dessus des marches conservée, même trajet au retour et trémie adaptée |
| Vues initiales | Plinko et établi d’Azur, avec cadrages de lecture pour commandes, catalogue, boîtier et ticket |
| Direction artistique | Lofi numérique ; cave en pierre sous le chalet, bois clair, crème et pastels ; lumières intérieure chaude et extérieure bleutée |
| Décor précisé par les nouvelles images | Cave dense et accueillante : canapé/plaid/pouf, poêle, tapis persan, étagères d’objets anciens et de bricolages, plantes, guirlande et atelier chargé. Vrais volumes 3D et textures locales ; itérations avec captures et autocritique de l’assistant, appréciation finale du créateur conservée |
| Corrections du mobilier et de la fenêtre | Revoir les proportions du canapé ; déplacer l’établi sur le mur latéral droit avec son catalogue et ses cadrages ; retirer l’affiche qui empiétait sur la fenêtre |
| Lisibilité du Plinko | Vue d’ensemble presque frontale incluant le décor, commandes rapprochées pour leur lecture ; grille rectangulaire de picots métalliques en quinconce, entrée centrale et quinze compartiments marqués. Les 14 décisions du chemin gardent le résultat prédéterminé. Aucun ajout de billes décoratives sur le plateau |
| Modules visuels | Objets 3D indépendants ; afficher seulement les acquisitions existantes, sans développer les mécaniques futures |
| Enseigne au-dessus de la machine | « MASTER PLINKO », en conservant les étoiles et le style de l’enseigne existante |
| Arrière de la cave | Référence du 19 octobre : atelier scientifique en vraie 3D, tableau noir, verrerie, rangements, fenêtre pluvieuse, télescope, prototype vert, aquarium et modèles suspendus ; fauteuil/plaid et table de cartes au premier plan. Décor sans nouvelle mécanique, découvert lors de la descente |
| Destinations | Escalier : toute la structure en bois en surbrillance au survol/focus d’une marche, rampe ou support ; départ à zéro bille, arrêt du Doigt, montée puis fondu ; liste centrée sur noir complet, aucune sélection automatique ; visites masquées tant que non débloquées et implémentées |
| Boutique publique d’Azur | Référence « boutique, vue depuis l’entrée » : baie à gauche, comptoir central, réparation et vitrine à droite, appareils ordinaires variés. Visite depuis les destinations après la rencontre de la panne (`repairTriggered`). Deux cadrages à hauteur des yeux, aucun HUD ni achat d’appareils ; apparence publique conservée lors de l’extension privée |
| Accès privé d’Azur | Après la réparation initiale achetée (`repairPurchased`), décision explicite du créateur. Réserve ordinaire, radio discrète, étagère coulissante sur rails puis couloir réel vers l’atelier ; entrée explicite après découverte, retour physique ou Échap. Le dispositif masquant le passage est une interprétation, car l’image fournie montre surtout l’atelier. Aucun nouveau drapeau de sauvegarde |
| Atelier caché d’Azur | Plinko cassé avec capot et câblage ouverts, panneau déposé ; Doigt, Bac ouvert et Duplicateur identifiables sur les bancs latéraux. Prototypes uniquement décoratifs, sans don ni déblocage ; cadrages prédéfinis, horloges suspendues pendant la visite, mécanismes réinitialisés à la visite suivante |
| Interface | Aucun HUD : cave plein écran sans cadre ni défilement ; commandes, informations et pages sur les objets 3D ; explications au survol ou au focus clavier uniquement |
| Boîtier de Papy | Supprimer la sauvegarde avec confirmation sur l’objet, export préalable et annulation par Échap ; nouvelle partie à 19 pièces, réglages conservés. Retirer Relire, afficher Réessayer seulement en erreur ; conserver son/mouvement/qualité/import/export/fermer |
| Supports | Machine : solde, mise, boutons, résultat et Surchauffe ; catalogue : achats ; boîtier mural : réglages et sauvegardes ; Bac : ticket ; destinations : écran noir hors cave ; service : poste 3D et fiches dans sa salle d’usine |

## Compléments de travail délégués à l'assistant
Ces choix rendent le développement initial implémentable. Les règles de tri et le prix de 0,50 pièce ont été confirmés par le créateur ; la cadence initiale reste ajustable après essai.
| Sujet | Choix de départ |
| --- | --- |
| Probabilités | 60 / 24 / 10 / 3,5 / 1,5 / 0,6 / 0,3 / 0,1 % dans l’ordre des multiplicateurs ; nouveau réglage après demande de pertes nettement plus fréquentes. Hors bonus : 84 % de pertes, retour moyen 59,75 % ; aucun changement des résultats déjà figés |
| Argent | Centièmes entiers, affichage à deux décimales |
| Première panne de test | 50 pièces de retours bruts ; une seule fois |
| Réparation de test | 25 pièces |
| Doigt mécanique | 40 pièces ; une bille gratuite de base 1 toutes les 2 secondes |
| Bac comptable | 15 pièces ; 100 derniers résultats |
| Usine | Choix confirmé du créateur : 60 secondes actives, flux continu ; cliquer les grises (+) rapporte 0,50 pièce chacune au terme ; rouges (×) = explosion et perte de tout le salaire du service ; sans grise, zéro gain ; salle 3D d’origine conservée, clic ou clavier |
| Événements d’usine | Demande du créateur : variations temporaires, notamment Surcadence. Réglages initiaux : Surcadence (tapis/arrivées ×2), Arrivage massif (arrivées ×2), Ralentissement (tapis/arrivées ÷2) ; 7 s chacun, préavis 2 s, un de chaque dans un ordre aléatoire vers 12/28/44 s ±2 s. Annonces sur fiches, plan conservé à la reprise |
| Flux d’usine (réglage initial) | Une arrivée toutes les 700 ms, 23 % de rouges, quatre couloirs, traversée de 6,5 s |
| Horloges hors cave | Montée, destinations, visite de boutique et descente : temps de jeu suspendu ; travail : seule la durée du service avance dans un onglet visible |
| Rendu de l’usine | Ancienne salle, étagères, établi et carton conservés ; tapis de tri, fiches physiques et explosion stylisée sans flashes ; mouvement réduit sans particules |
| Reprise de l’usine | Score, billes, cadence, durée et résultat persistés ; reprise sans double salaire ni annulation d’explosion ; format interne 3 avec migration des formats 1 et 2 et conservation exceptionnelle du contrat des anciens services déjà commencés |
| Manuel | Intervalle minimal 0,5 seconde ; vol cible de 3 à 4 secondes |
| Surchauffe | Charge à 100 billes réglées ; activation manuelle ; x2 pendant 10 secondes actives, remplace le bonus x10 sur demande du créateur ; anciens retours figés préservés |
| Sauvegarde | Locale avec contrôle de compatibilité, export/import JSON, règlement des billes en cours à la reprise |
| Absence | Pause de l'onglet caché, aucun revenu hors ligne |
| Résolution visuelle | Trajectoires contrôlées ; Rapier différé |
| Présentation | Cave 3D sans HUD ; exception explicite : destinations sur noir complet après la sortie, poste 3D dans sa salle d’usine d’origine |
| Trajet de sortie | Départ : approche 2,6 s, montée 3,4 s, fondu 0,4 s ; retour : mêmes positions inverses, descente 3,4 s puis retour au sol 5,2 s et virage arrondi. Découvrir l’atelier arrière après la trémie, conserver le regard 0,6 s au sol puis retrouver le Plinko en 2,2 s sans demi-tour final ; mode réduit : fondu de 0,3 s seul ; aucune animation empilée |
| Qualité initiale | Ordinateur, fenêtre minimale cible 1280×720 ; interface adaptable |

La bibliothèque physique Rapier était dans la stack envisagée. Le résultat prédéterminé justifie de différer son utilisation ; ce n'est pas un changement vers une physique réelle.

## Questions non bloquantes pour le développement initial
- Modèles détaillés des personnages ; le décor de cave suit désormais les deux références d’atelier et de salon transmises par le créateur.
- Prix narratif définitif de la réparation ; 1 000 reste envisagé pour l'histoire.
- Cadence et durée finales après observation.
- Présentation complète du prologue et des dialogues.
- Équilibrage à long terme et durées des chapitres.

## À définir pour les fonctionnalités futures
- Dialogues et futurs systèmes associés aux prototypes privés d’Azur ; la visite des lieux ne les acquiert pas et n’ajoute aucune mécanique.
- Duplicateur, résidus et fréquence des objets.
- Produits, cumuls et interactions.
- Porte-bonheur et nombre d'emplacements.
- Trois plateaux et profils de rendement.
- Déclencheur du chapitre 4.
- Destruction, reconstruction et compensations.
- Recalibrage : pertes, conservation et formule d'Échos.
- Très grands nombres.
- Production hors ligne éventuelle.
- Combat de Paul et option simplifiée.
- Après-épilogue, comptes et synchronisation éventuelle.
