# MasterPlinko — backlog

Le prototype est implémenté. Les statuts ci-dessous reposent sur les tests exécutés et l’inspection des captures ; l’essai utilisateur reste à réaliser. Ne pas marquer les fonctionnalités terminées sur la seule base de ce dossier.
P0 : prototype indispensable. P1 : première expérience complète. P2 : enrichissement. P3 : fin de jeu.
Les identifiants restent stables lorsque les tâches changent de statut.

## État du développement
- **MP-038 : réserve, passage secret et atelier caché d’Azur réalisés et vérifiés.** Porte privée après réparation initiale achetée, trajet autour du comptoir, réserve ordinaire, radio commandant verrou et étagère coulissante, couloir réel puis atelier. Plinko cassé avec câbles et panneau démonté, prototypes distincts sans acquisition, gros plans et retours souris/clavier sans HUD. Boutique publique conservée, mécanismes transitoires et sauvegardes inchangées. 49 tests de logique, TypeScript/build et suite complète de 24 parcours Chrome réussis ; production inspectée en 1820×864 et 1280×720. Auto-évaluation subjective de 9/10, interprétation du passage et limites détaillées au fichier 07.
- **MP-037 : boutique publique d’Azur réalisée et vérifiée.** Composition de la référence : baie/entrée à gauche, comptoir central, appareils variés, coin réparation et vitrine à droite, porte privée en volumes. Deux cadrages à hauteur des yeux et interactions souris/clavier sans HUD. Visite depuis les destinations après la rencontre de la panne, horloges suspendues, sauvegardes et économie conservées ; aucun Plinko ni achat d’appareil dans l’espace public. Validation initiale : 45 tests de logique, TypeScript/build et neuf parcours Chrome ciblés réussis, dont trois régressions usine ; inspection du build de production et auto-évaluation subjective de 9/10 au fichier 07. L’extension privée est suivie séparément par MP-038.
- **MP-034 / MP-035 : arrière de la cave réalisé et vérifié le 19 octobre.** Pièce fermée et atelier scientifique en volumes 3D d’après la référence : tableau noir, établi/verrerie, rangements et objets anciens, fenêtre pluvieuse, télescope, prototype vert, aquarium, dirigeable, table de cartes et fauteuil/plaid. Découverte pendant la descente, puis retour progressif au Plinko ; règles et sauvegardes conservées. Itérations visuelles de 6,5 puis 8 jusqu’à une auto-évaluation finale de 9/10, distincte de l’appréciation du créateur. 44 tests, TypeScript/build et six parcours Chrome ciblés réussis ; captures et mesure de fluidité au fichier 07.
- **MP-034 : enseigne renommée « MASTER PLINKO ».** Style et étoiles conservés ; taille ajustée pour éviter que la lampe masque la fin du nom. Contrôle TypeScript/build et capture à 1280×720 vérifiés ; compte rendu au fichier 07.
- **MP-035 / MP-036 : surbrillance de l’escalier vérifiée.** Marches, contremarches, rampes, supports et palier réagissent ensemble au survol/focus ; effet retiré en quittant l’objet ou au départ, mobilier voisin préservé. Contrôle visuel en 1920×911 et 1280×720, build/TypeScript, 44 tests de logique et parcours navigateur ciblés ; détails au fichier 07.
- **MP-034 / MP-033 / MP-036 : corrections du mobilier et de l’établi vérifiées.** Canapé reproportionné, établi et catalogue sur le mur latéral droit, cadrages tournés vers ce mur, affiche retirée de la fenêtre. Ouverture du livre et trois zones d’achat vérifiées à la souris en 1280×720 et 1920×911 ; achats au clavier, escalier et cinquante vols conservés. 43 tests de logique, TypeScript/build et six parcours Chrome ciblés réussis. Compte rendu au fichier 07 ; pas de nouvelle suite navigateur complète pour cette correction.
- **Validation consolidée actuelle : réussie.** 49 tests de logique, contrôle TypeScript/build et 24 parcours Chrome complets après l’extension privée d’Azur. Régressions économie, sauvegardes, usine, cave, escalier, survol/focus, plafond de 50 billes et quinze sorties incluses. Voir le dernier compte rendu du fichier 07 ; MP-010 reste à réaliser par le créateur.
- **MP-034 : nouvelle passe artistique réalisée et vérifiée.** Cave enrichie d’après les deux images d’atelier/salon : mobilier, étagères, poêle, plantes, appareils, plans, tapis et matériaux locaux, éclairages et cadrages repris. Plusieurs inspections de captures et corrections ; auto-évaluation finale de l’assistant 9/10, distincte de l’appréciation du créateur. 43 tests de logique, build et 18 parcours Chrome complets réussis après cette passe ; inspection du build de production à 1280×720 et 1820×864. Voir le dernier compte rendu du fichier 07.

- **MP-001 à MP-009 et MP-033 : implémentés et vérifiés techniquement.** Build et contrôle TypeScript réussis ; tests de logique et parcours Chrome. Machine et établi procéduraux, économie, achats, Surchauffe, usine et import/export fonctionnent. Voir le compte rendu du fichier 07.
- **MP-010 : à faire.** Session de 10 à 15 minutes et retours du créateur sur le rythme et la lisibilité. Les parcours automatisés ne remplacent pas cette session.
- **MP-034 et MP-035 : implémentés et vérifiés techniquement.** Cave lofi et modules conditionnels ; escalier, approche/montée prédéfinies, fondu complet puis destinations ; retour inverse ou fondus réduits. Départ à zéro bille, Doigt arrêté et horloges de cave suspendues hors cave. Visites non disponibles masquées.
- **MP-036 : implémenté et vérifié techniquement.** Cave plein écran sans HUD ; commandes et supports 3D, survol/focus, catalogue, ticket et boîtier. Exception hors cave pour destinations sur fond noir et service dans sa salle 3D ; souris, clavier et sauvegardes conservés. Boîtier simplifié avec suppression confirmée et export préalable, annulation prioritaire, récupération uniquement en erreur ; remplacement atomique sans perte en cas d’échec. 41 tests de logique et 18 parcours Chrome réussis. Validation perceptive du créateur encore attendue.
- **MP-002, MP-004, MP-016 et MP-034 : passe de lisibilité et de rendu réalisée.** Cadrage rapproché, grille métallique rectangulaire, entrée dégagée, billes agrandies, quinze compartiments et inscriptions réactives, contacts sonores discrets. Bois veiné, maçonnerie irrégulière, éclairage chaud/bleu et ombres de contact. Chemins et paiements vérifiés sur les quinze sorties, y compris 50 vols simultanés ; détails et limites dans le fichier 07. MP-016 reste ouvert aux futurs retours audiovisuels.
- **MP-014 : tri implémenté et vérifié techniquement.** 60 secondes, flux de grises/rouges, +0,50 pièce par grise au terme, explosion sur rouge et salaire nul. Salle d’origine et fiches physiques conservées. Clic/clavier, pause, score et billes à la reprise, salaire unique, échecs d’écriture et migration vérifiés. Événements Surcadence, Arrivage massif et Ralentissement avec préavis, effets réels, reprise du plan et répartition des billes sans superposition. 38 tests de logique ; suite Chrome de 14 parcours, puis quatre parcours ciblés après ajustement du flux dense. Rythme à évaluer par le créateur.
- **MP-003 et MP-004 : rééquilibrage des probabilités vérifié.** Nouveau réglage demandé pour perdre davantage : 84 % de pertes, 10 % de remboursements et 6 % de gains nets hors Surchauffe ; retour moyen théorique 59,75 %. Catalogue mis à jour par la configuration, résultats déjà figés préservés. 43 tests de logique et 18 parcours Chrome complets réussis lors de la validation consolidée ; rythme de cette distribution à évaluer en jouant.
- Les autres systèmes futurs P1 à P3 restent à développer ; certains éléments simples du chalet et retours audiovisuels sont présents dans le prototype.

## P0 — Prototype
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-001 | Initialiser la stack choisie | Vite + TypeScript + Three.js fonctionne en localhost ; résultat prédéterminé ; voir fichier 11 |
| MP-002 | Plateau et lancement manuel | Trajectoire compatible avec le résultat prédéterminé ; maximum 50 ; pas de débit au plafond |
| MP-003 | Mise et solde | Fonds insuffisants bloqués ; un débit et un crédit maximum par bille |
| MP-004 | Résultats lisibles | Retour total et bénéfice net sont compréhensibles |
| MP-005 | Réparation, Doigt et Bac | Prix 25/40/15 ; panne test à 50 de retours bruts ; achat unique et effet observable |
| MP-006 | Lanceur automatique | Marche/arrêt fonctionne ; aucune mise payante cachée |
| MP-007 | Surchauffe | 100 règlements, activation manuelle ×2 pendant 10 secondes ; anciens retours figés conservés, aucune modification des sorties ×10 |
| MP-008 | Service d’usine | Minute active, 0,50 pièce par grise cliquée versée une fois au terme ; zéro sans grise ou sur rouge ; accessible pendant la panne et sous 1 pièce |
| MP-009 | Sauvegarde, export/import et suppression | Résultats en vol conservés et réglés une fois ; version validée ; suppression confirmée et atomique, annulation/export, onglet secondaire refusé et erreur sans perte ; pas de production hors ligne |
| MP-010 | Session de test | Une partie de 10–15 min et ses principaux problèmes sont consignés |
| MP-033 | Navigation par vues fixes | Plinko/établi, clic et clavier, retours directs, transitions réduites et aucun arrêt de production |
| MP-034 | Direction artistique lofi et modules 3D | Cave en pierre aménagée selon les références atelier/salon, canapé/plaid, poêle, étagères et objets, plantes, tapis usé, nuit pluvieuse et éclairages chaud/bleu, Plinko crème/pastel ; vraies géométries et matériaux locaux, modules selon les achats, aucun système futur ajouté |
| MP-035 | Sorties par l’escalier | Zéro bille au départ, Doigt arrêté, trajet unique et positions inverses sans traversée, même hauteur des yeux que Plinko et approche à altitude constante ; virage arrondi, retour au sol plus lent et regard progressif vers la machine sans rotation brusque à l’arrivée ; destinations seulement au noir complet, accessibles clavier/souris ; mode réduit par fondus ; horloges suspendues hors service |
| MP-036 | Interface entièrement intégrée aux objets | Cave plein écran sans HUD ni défilement ; commandes et écrans 3D ; catalogue, boîtier et ticket lisibles ; exception hors cave pour destinations sur fond noir et service dans sa salle 3D ; survol/focus identiques et sauvegardes conservées |
| MP-037 | Boutique publique d’Azur | Référence reconnaissable, comptoir/appareils/réparation/porte privée identifiables ; vue entrée et rapprochement à hauteur des yeux, souris/clavier sans HUD ; visite seulement après rencontre, pause et sauvegardes conservées. Aucun Plinko, achat d’appareil, arrière-boutique, passage secret ou laboratoire |
| MP-038 | Réserve, passage secret et atelier caché d’Azur | Boutique conservée ; porte autorisée après réparation achetée, réserve crédible, radio et étagère coulissante sans collision, découverte puis entrée explicite ; vrais volumes raccordés, Plinko cassé et prototypes distincts sans acquisition, cadrages et retours souris/clavier sans HUD ; horloges et sauvegardes préservées, inspection fermé/ouvert et note honnête détaillée |

## P1 — Première expérience complète
| ID | Fonctionnalité | Terminé quand… |
| --- | --- | --- |
| MP-011 | Chalet simple et interactions | Chaque action essentielle est trouvable et accessible |
| MP-012 | Prologue et fin secrète | Les deux choix fonctionnent ; retour au choix disponible |
| MP-013 | Panne et rencontre d'Azur | Seuil cumulé ; événement unique ; réparation accessible |
| MP-014 | Mini-jeu de tri à l’usine | Flux 3D continu, clic/clavier sur grises (+), rouges (×) = explosion sans salaire, informations et événements de rythme sur fiches ; préavis, effets continus et retour normal, pause masquée, reprise du plan/score/billes, gain unique et migration, retour aux destinations |
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
