# MasterPlinko — backlog

Le prototype est implémenté. Les statuts ci-dessous reposent sur les tests exécutés et l’inspection des captures ; l’essai utilisateur reste à réaliser. Ne pas marquer les fonctionnalités terminées sur la seule base de ce dossier.
P0 : prototype indispensable. P1 : première expérience complète. P2 : enrichissement. P3 : fin de jeu.
Les identifiants restent stables lorsque les tâches changent de statut.

## État du développement
- **MP-001 à MP-009 et MP-033 : implémentés et vérifiés techniquement.** Build et contrôle TypeScript réussis ; tests de logique et parcours Chrome. Machine et établi procéduraux, économie, achats, Surchauffe, usine et import/export fonctionnent. Voir le compte rendu du fichier 07.
- **MP-010 : à faire.** Session de 10 à 15 minutes et retours du créateur sur le rythme et la lisibilité. Les parcours automatisés ne remplacent pas cette session.
- Les systèmes futurs P1 à P3 restent à développer ; certains éléments simples du chalet et retours audiovisuels sont présents dans le prototype.

## P0 — Prototype
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-001 | Initialiser la stack choisie | Vite + TypeScript + Three.js fonctionne en localhost ; résultat prédéterminé ; voir fichier 11 |
| MP-002 | Plateau et lancement manuel | Trajectoire compatible avec le résultat prédéterminé ; maximum 50 ; pas de débit au plafond |
| MP-003 | Mise et solde | Fonds insuffisants bloqués ; un débit et un crédit maximum par bille |
| MP-004 | Résultats lisibles | Retour total et bénéfice net sont compréhensibles |
| MP-005 | Réparation, Doigt et Bac | Prix 25/40/15 ; panne test à 50 de retours bruts ; achat unique et effet observable |
| MP-006 | Lanceur automatique | Marche/arrêt fonctionne ; aucune mise payante cachée |
| MP-007 | Surchauffe | Compteur, charge et bonus suivent la règle retenue |
| MP-008 | Service d'usine | 15 secondes actives pour 15 pièces, accessible pendant la panne et sous 1 pièce |
| MP-009 | Sauvegarde et export/import | Résultats en vol conservés et réglés une fois ; version validée ; pas de production hors ligne |
| MP-010 | Session de test | Une partie de 10–15 min et ses principaux problèmes sont consignés |
| MP-033 | Navigation par vues fixes | Plinko/établi, clic et clavier, retours directs, transitions réduites et aucun arrêt de production |

## P1 — Première expérience complète
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-011 | Chalet simple et interactions | Chaque action essentielle est trouvable et accessible |
| MP-012 | Prologue et fin secrète | Les deux choix fonctionnent ; retour au choix disponible |
| MP-013 | Panne et rencontre d'Azur | Seuil cumulé ; événement unique ; réparation accessible |
| MP-014 | Premier mini-jeu d'usine | Service jouable et rémunération garantie |
| MP-015 | Historique enrichi à enrichir plus tard | Le développement initial fournit déjà 100 résultats via Bac ; enrichissements à décider |
| MP-016 | Premiers retours audiovisuels | Résultats et achats sont perceptibles ; réglage du son disponible |
| MP-017 | Passer et relire les dialogues | Informations conservées même si une scène est passée |

## P2 — Systèmes et narration intermédiaire
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-018 | Duplicateur et résidus | Première anomalie garantie ; production réglable |
| MP-019 | Marceau et produits | Coût, effet, durée et cumul sont lisibles |
| MP-020 | Billes spéciales | Chaque type a un effet distinct et identifiable |
| MP-021 | Révélation des trois associés | Chapitre 4 cohérent avec les scènes précédentes |
| MP-022 | Saisie et destruction | Progression conservée selon les règles annoncées |
| MP-023 | Matéo et grigris | Équiper, retirer et respecter les emplacements fonctionne |
| MP-024 | Reconstruction et trois plateaux | Chacun a un profil mesurable et une utilité |
| MP-025 | Recalibrage | Aperçu des pertes/gains ; conservation correcte de l'histoire |
| MP-026 | Chalet évolutif | Les déblocages changent le décor sans gêner l'accès aux actions |
| MP-027 | Revenu hors ligne éventuel | Uniquement si retenu ; calcul plafonné et résumé à la reprise |

## P3 — Fin de jeu et finition
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-028 | Confrontation de Paul | Combat terminé en mode normal et option simplifiée |
| MP-029 | Épilogue et poursuite idle | L'histoire se clôt sans supprimer la partie |
| MP-030 | Équilibrage global | Aucun blocage identifié ; chaque système conserve un rôle |
| MP-031 | Performance et accessibilité | Lisible et fluide sur la cible définie ; mouvements/son réglables |
| MP-032 | Versions de sauvegarde | Une ancienne sauvegarde compatible migre sans perte imprévue |

## Dépendances principales
- MP-001 précède l'implémentation du plateau définitif.
- MP-003 précède automatisation, bonus et sauvegarde économique.
- MP-010 précède la production des systèmes avancés.
- MP-018 précède Marceau.
- MP-022 précède Matéo et la reconstruction dans l'histoire.
- MP-024 précède le recalibrage dans la progression proposée.
- Le combat final attend que le jeu principal soit stable.

## Règle d'utilisation
Prendre une petite tâche, la terminer, vérifier son critère puis avancer.
Découper chaque ligne si elle devient trop large.
Ne pas assimiler un écran dessiné à une fonctionnalité terminée.

## Ordre concret pour le développement initial
1. MP-001 : initialisation et documentation de lancement.
2. MP-003 : économie pure et vérifications déterministes.
3. MP-002 et MP-004 : plateau procédural et résultats.
   Ajouter MP-033 : établi simple, cadrages et navigation avant de relier les achats.
4. MP-008 puis MP-005 : sortie de blocage, panne et atelier.
5. MP-006 et MP-007 : automatisation et Décharge.
6. MP-009 : sauvegarde, reprise et export/import.
7. MP-010 : build, session manuelle, retours.

Prévoir les contrats de sauvegarde dès l'étape 2, même si les écrans viennent plus tard.
Le plafond 50 doit être vérifié par un scénario de charge ; la cadence initiale ne l'atteint pas nécessairement en partie normale.
