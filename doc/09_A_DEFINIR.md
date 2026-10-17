# MasterPlinko — décisions et questions restantes

## Décisions du créateur
| Sujet | Décision |
| --- | --- |
| Mode de réalisation | IA et prompts pour le code et la 3D |
| Support | Navigateur, ordinateur |
| Stack de base | Vite, TypeScript, Three.js, HTML/CSS |
| Résultat | Déterminé avant la chute, pas par la physique |
| Multiplicateurs | x0,3 / x0,5 / x1 / x1,5 / x3 / x5 / x10 / x40 |
| Solde | 19 pièces |
| Mises | 1 à 10 pièces |
| Sans argent | Travail à l'usine |
| Premières améliorations | Réparation initiale, Doigt mécanique, Bac comptable |
| Capacité | 50 billes simultanées |
| Développement | GitHub : https://github.com/clementLQR/MasterPlinko.git ; essai localhost ; aucun commit ni push sans demande explicite |
| Nom du grand-père d’Ewen | Papy |
| Gestion des fichiers | Modifier les fichiers et dossiers existants, sans variantes numérotées |
| Navigation | Positions de caméra fixes, transitions courtes, accès directs ; pas de déplacement libre |
| Vues initiales | Plinko et établi d'Azur ; porte accessible comme action |

## Compléments de travail délégués à l'assistant
Ces choix rendent le développement initial implémentable ; ils restent ajustables après essai.
| Sujet | Choix de départ |
| --- | --- |
| Probabilités | 40 / 25 / 17 / 9 / 5 / 2 / 1,8 / 0,2 % dans l'ordre des multiplicateurs |
| Argent | Centièmes entiers, affichage à deux décimales |
| Première panne de test | 50 pièces de retours bruts ; une seule fois |
| Réparation de test | 25 pièces |
| Doigt mécanique | 40 pièces ; une bille gratuite de base 1 toutes les 2 secondes |
| Bac comptable | 15 pièces ; 100 derniers résultats |
| Usine | Service actif de 15 secondes pour 15 pièces ; aucun mini-jeu complet |
| Manuel | Intervalle minimal 0,5 seconde ; vol cible de 3 à 4 secondes |
| Surchauffe | Charge à 100 billes réglées ; activation manuelle ; x10 pendant 10 secondes actives |
| Sauvegarde | Locale avec contrôle de compatibilité, export/import JSON, règlement des billes en cours à la reprise |
| Absence | Pause de l'onglet caché, aucun revenu hors ligne |
| Résolution visuelle | Trajectoires contrôlées ; Rapier différé |
| Présentation | Machine et établi procéduraux dans une cave suggérée |
| Durée de transition | 0,5 seconde, réglage initial ; instantané en mouvement réduit |
| Qualité initiale | Ordinateur, fenêtre minimale cible 1280×720 ; interface adaptable |

La bibliothèque physique Rapier était dans la stack envisagée. Le résultat prédéterminé justifie de différer son utilisation ; ce n'est pas un changement vers une physique réelle.

## Questions non bloquantes pour le développement initial
- Style visuel final précis et modèles de personnages.
- Prix narratif définitif de la réparation ; 1 000 reste envisagé pour l'histoire.
- Cadence et durée finales après observation.
- Présentation complète du prologue et des dialogues.
- Équilibrage à long terme et durées des chapitres.

## À définir pour les fonctionnalités futures
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
