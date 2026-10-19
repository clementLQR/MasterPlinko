# MasterPlinko — checklist de démarrage

Le prototype est implémenté. L’essai du créateur et l’équilibrage restent à faire. Commandes de lancement dans le [README](../README.md).

## 1. Décisions minimales prises
- [x] Navigateur sur ordinateur.
- [x] Vite, TypeScript, Three.js et HTML/CSS.
- [x] Résultat prédéterminé ; trajectoires contrôlées. Rapier différé pour les billes.
- [x] Multiplicateurs : 0,3 / 0,5 / 1 / 1,5 / 3 / 5 / 10 / 40.
- [x] Probabilités initiales proposées et chiffrées au fichier 11.
- [x] 19 pièces initiales, mises entières de 1 à 10.
- [x] Travail à l'usine pour repartir.
- [x] Trois améliorations : Réparation initiale, Doigt mécanique, Bac comptable.
- [x] Sauvegarde locale et export/import ; résultat en cours conservé.
- [x] Plafond de 50 billes simultanées.
- [x] Dépôt GitHub souhaité, essais localhost.
- [x] Valeurs de test séparées des valeurs de l'histoire.
- [x] Navigation sans marche libre : vues Plinko et établi, escalier accessible pour les sorties.

Les valeurs complétées par l'assistant sont des réglages de départ modifiables, pas des tests déjà réussis.

## 2. À réaliser par l'assistant — structure
- [x] Lire la spécification 11 et le prompt 12.
- [x] Vérifier le dossier cible et préserver son contenu éventuel.
- [x] Créer le projet Vite/TypeScript.
- [x] Préparer le versionnement local ; réutiliser le dépôt fourni s'il existe.
- [x] Documenter installation, localhost, build et tests.
- [x] Séparer état, économie, résultats, trajectoires, progression, rendu et sauvegarde.
- [x] Centraliser valeurs et identifiants.
- [x] Réaliser une machine et un établi procéduraux avec cadrages principaux et vues de lecture des supports.
- [x] Ajouter objets cliquables, accès directs au clavier, retour par Échap et transitions désactivables.
- [x] Afficher solde, mise et dernier résultat sur la machine, dans une cave plein écran sans HUD.

## 3. À réaliser par l'assistant — boucle jouable
- [x] Tirer le résultat avant l'animation.
- [x] Faire arriver chaque bille dans la sortie correspondante.
- [x] Contrôler fonds, cadence et plafond avant débit.
- [x] Déclencher une seule panne de test.
- [x] Rendre achetables les trois améliorations aux conditions prévues.
- [x] Ajouter marche/arrêt du Doigt mécanique.
- [x] Ajouter la Décharge x2.
- [x] Ajouter le service d'usine.
- [x] MP-014 : tri 3D dans l’ancienne salle d’usine, flux continu pendant une minute ; grises (+) à 0,50 pièce au terme, rouges (×) = explosion et salaire nul, aucune grise = zéro. Clic/clavier, fiches physiques, pause et sauvegarde du score/billes ; reprise, versement unique et migration vérifiés. Les comptes rendus plus anciens ci-dessous décrivent les étapes précédentes.
- [x] Sauvegarder, charger, exporter et importer.
- [x] Supprimer la progression depuis le boîtier avec confirmation, annulation et export possible ; nouvelle partie atomique à 19 pièces, réglages conservés, ancienne sauvegarde intacte si l’écriture échoue.

## 4. À vérifier par l'assistant — logique et build
- [x] Une bille ne paie qu'une fois.
- [x] Un lancement refusé ne débite rien.
- [x] Une sortie x1 rembourse la mise hors Surchauffe.
- [x] Achat répété ou sans fonds impossible.
- [x] Les 50 billes et la 51e tentative respectent la règle.
- [x] Fermer en cours de chute conserve le résultat.
- [x] Le second chargement ne repaie pas ces billes.
- [x] L'usine fonctionne à 0 et avec un solde inférieur à 1.
- [x] Un bonus ne modifie pas rétroactivement une bille lancée.
- [x] L'onglet caché ne produit aucun revenu.
- [x] Une importation invalide ne détruit pas la partie.
- [x] La panne ne se répète pas.
- [x] Le build de production et les tests ciblés passent.
- [x] Les billes et la production continuent pendant les cadrages ordinaires et les achats.
- [x] Des clics rapides entre les vues ne lancent pas de bille accidentellement.
- [x] Le retour direct et le mode de mouvement réduit fonctionnent.

- [x] Rejouer toute la suite Chrome avec les nouvelles probabilités et contrôler le rendu après correction de compatibilité des ombres.

## 5. À faire par le créateur — essai
- [ ] Suivre les commandes fournies pour lancer localhost.
- [ ] Jouer 10 à 15 minutes.
- [ ] Vérifier que les gains et les boutons sont compréhensibles.
- [ ] Regarder si les rebonds et les arrivées semblent crédibles.
- [ ] Noter délai avant réparation et automatisation.
- [ ] Signaler attentes, répétitions, bugs et passages trop faciles.
- [ ] Décrire les changements visuels souhaités.
- [ ] Transmettre les retours pour la prochaine itération.

## Passe de rendu — rapprochement de la référence
- [x] Comparer une capture initiale à la référence : plateau peu dominant, grille triangulaire, inscriptions petites, pierres régulières et catalogue trop présent.
- [x] Rapprocher la caméra, incliner légèrement la machine, dégager l’entrée centrale et conserver escalier/établi repérables.
- [x] Construire la grille rectangulaire métallique en quinconce avec les coordonnées des trajectoires ; agrandir les billes et les quinze inscriptions, ajouter rebords et réactions des compartiments après règlement réussi.
- [x] Reprendre bois, pierres, reflets, éclairage et ombres de contact ; ajouter assemblages, conduit et fougères ; réduire le catalogue dans la vue d’ensemble.
- [x] Ajouter des contacts sonores discrets à hauteur des impacts, avec variations et limitation du mixage ; conserver le réglage son existant.
- [x] Échantillonner cinq chemins par sortie dans les deux modes de mouvement : distance aux picots, contacts proches, dégagement des rebords/cloisons et arrivée exacte.
- [x] Vérifier 50 vols répartis entre les quinze sorties, le refus de la 51e bille sans mutation et chaque crédit réel face au retour figé ; second passage sans nouveau paiement.
- [x] Exécuter les neuf parcours Chrome sur GPU réel : lancement/reprise, import/export, achats, usine, navigation, concurrence d’onglets, rayons 3D et 50 vols. Captures de cave à 1280×720, catalogue à 1440×1000, vols, réceptions et compartiments inspectées.
- [x] Mesurer le rendu de 50 billes sur AMD Radeon Graphics / ANGLE Direct3D11 à 1280×720, qualité normale : 80 intervalles après échauffement, médiane 11,1 ms, 95e percentile 15,9 ms, 676 appels de rendu et environ 515 000 triangles. Mesure courte du rendu, pas un benchmark de toute la session ni une garantie sur d’autres machines.

TypeScript et build de production réussis ; 23 tests de logique réussis. Le bundle JavaScript reste au-dessus du seuil d’avertissement Vite (environ 662 ko avant gzip). Aucune dépendance, règle économique, probabilité ou modification du format de sauvegarde ajoutée. Le signal « prêt » attend désormais la fin du chargement local pour éviter une première navigation réinitialisée par la reprise.

Les neuf parcours complets réussissent avec `PLINKO_GPU=1`. Le rendu logiciel SwiftShader a validé les scènes d’usine, les rayons et les 50 sorties, ainsi que le parcours lancement/reprise relancé après correction. Sa suite complète n’est pas déclarée réussie : une première passe a subi des rechargements de développement et des échecs de navigation/délai ; une relance partielle a été interrompue plusieurs heures et n’est pas exploitable comme validation complète. Le README indique les deux modes de lancement.

Les sons ont été implémentés mais pas évalués à l’écoute. L’appréciation artistique, le confort des chutes en jeu et l’essai de 10 à 15 minutes restent ouverts. Aucun commit, push ou déploiement effectué.

## 6. Après validation
Corriger la boucle avant d'ajouter chalet complet, prologue, autres personnages ou recalibrage.
Le dépôt distant est configuré sur https://github.com/clementLQR/MasterPlinko.git. Aucun commit ni push sans demande explicite.

## Vérifications exécutées — sortie de la cave
- `npm run build` : contrôle TypeScript et build de production réussis. Avertissement Vite existant : bloc JavaScript d’environ 656 ko (173 ko gzip), seuil 650 ko. Aucune dépendance ajoutée.
- `npm test` : 22 tests de logique réussis. Trajet unique, pause du trajet masqué, noir complet avant destinations, retour inverse, mode réduit, reprise d’un service, horloge réservée au travail et salaire unique. Transactions, panne, achats, tirage, 50 billes/51e refusée, import et trajectoires restent couverts.
- `$env:PLINKO_GPU='1'; npm run test:browser` : 10 parcours Chrome complets réussis. Plein écran sans HUD, lancement/reprise, boîtier/export/import, catalogue et achats, départ refusé pendant un vol, trajet unique, raccourcis bloqués, destinations après noir complet, Tabulation/Entrée et descente, Doigt arrêté au retour.
- Usine : aucune sélection automatique ; durée visible et salaire unique après rechargement ; service importé repris sur fond noir ; échec d’écriture du salaire sans crédit, export disponible et nouvelle tentative réussie sans double versement. Surchauffe figée pendant les destinations et le service.
- Visibilité : durée de service figée lorsque `document.hidden` est injecté dans le parcours, puis reprise sans rattrapage. Horloge inactive et trajet masqué vérifiés aussi en logique. Cette injection ne remplace pas l’observation d’une session réelle en arrière-plan.
- Trajet 3D échantillonné toutes les 20 ms dans la scène réelle : positions continues, mêmes positions au retour, dégagement proche vérifié par rayons dans les six directions. Trémie et palier éclairé en géométrie réelle. Contrôles de visibilité, occultation, pluie descendante et cinquante vols conservés.
- Captures inspectées : montée, descente, destinations noires et service noir ; captures et rapports temporaires dans `test-results/`, ignoré par Git. Aucun écran de destinations ni commande extérieure visible dans la cave sans survol/focus.
- Après ajustement du regard dans la pente : parcours ciblés du trajet et de l’aller-retour relancés ; contrôle TypeScript, build et 22 tests de logique relancés. Un onzième parcours ciblé vérifie aussi l’échec d’écriture au début du service : aucun service enregistré, descente toujours utilisable, boîtier accessible et sauvegarde récupérable. Le trajet visuel reste indépendant d’une suspension économique.
- Aucun prix, probabilité, salaire ou format JSON modifié. Le trajet, la liste et le focus ne sont pas sauvegardés ; un chargement hors service retrouve Plinko. Aucune nouvelle mesure de fluidité générale ; la mesure du plateau ci-dessus appartient à la passe précédente.
- L’appréciation artistique, le confort de la montée/descente, le rythme et la session de 10 à 15 minutes restent à évaluer par le créateur. Aucun commit, push ou déploiement effectué.

## Vérifications exécutées — Décharge ×2 et mini-jeu d’usine
- Décision du créateur : Surchauffe ×2 pendant les 10 secondes existantes, seuil 100 inchangé. Les sorties ordinaires ×10 restent identiques. Bouton, survol, jauge et dernier résultat reflètent le facteur appliqué.
- `npm test` : 27 tests de logique réussis. Nouveaux retours ×2, anciens retours ×10 acceptés et réglés une seule fois sans recalcul ; facteurs invalides refusés. Emballage : refus hors service, prises invalides, dépôt unique, raté/annulation/pause, cartons de six et réinitialisation. Salaire identique avec zéro ou plusieurs cartons, sans modification du Plinko ni de Surchauffe.
- `npm run build` : TypeScript et build de production réussis. Avertissement Vite sur le bloc JavaScript d’environ 668 ko (176 ko gzip), seuil 650 ko ; aucune dépendance ajoutée.
- `$env:PLINKO_GPU='1'; npm run test:browser` : 12 parcours Chrome complets réussis. Le nouveau parcours du poste vérifie le glisser-déposer, un lâcher raté, le clic, le clavier, le remplissage puis le carton suivant, Échap, pause et refus d’interaction hors service. Les clics rapides entre deux images utilisent désormais les matrices 3D actualisées.
- Dans l’application : une bille emballée au clavier, reprise après rechargement avec compteur remis à zéro, temps du service conservé, salaire unique et bonus figé. Service importé, échecs de sauvegarde, récupération, escalier, import/export, atelier, concurrence des onglets et 50 vols restent vérifiés.
- Captures du poste inspectées à 1280×720 et 1440×1000 : bac, billes, carton ouvert, rabats et fiche du service en géométrie réelle ; fond noir, aucune commande HTML visible pendant le travail normal. Rapports et captures dans `test-results/`, ignoré par Git.
- Durée, salaire, probabilités et champs de sauvegarde conservés. Emballages et sélection transitoires ; le format accepte le facteur courant 2 et l’ancien facteur 10. Le ressenti du mini-jeu et la session de 10 à 15 minutes restent à évaluer par le créateur. Aucun commit, push ou déploiement effectué.

## Correction — hauteur du regard dans l’escalier
- [x] Supprimer l’abaissement pendant l’approche : altitude de la caméra identique à la vue Plinko jusqu’à la première marche.
- [x] Déduire la stature de la caméra de départ et du sol ; partager les coordonnées des marches et du palier entre trajet et décor. Raccorder la ligne de marche au sol et au palier, sans oscillation par marche ; conserver les mêmes positions au retour.
- [x] Adapter la trémie et le puits d’escalier au passage à hauteur d’homme ; fermer les contremarches et raccorder le sol du palier. Regard orienté vers les marches pendant la montée puis relevé à l’arrivée.
- `npm test` : 28 tests de logique réussis, dont conservation de l’altitude pendant l’approche et stature conservée sur le palier pour deux hauteurs de départ.
- `npm run build` : TypeScript et production réussis ; avertissement Vite existant pour le bundle d’environ 668 ko.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'trajet 3D|escalier : trajet'` : deux parcours ciblés réussis. Hauteur vérifiée par rayon vertical vers les surfaces 3D réellement rendues, absence d’obstacle proche dans six directions, positions continues et trajet inverse conservé. Départ unique, blocage des raccourcis et Doigt arrêté au retour restent vérifiés. Le mode réduit reste couvert par la logique ; pas de nouvelle suite complète navigateur pour cette correction visuelle.
- Captures de montée et descente inspectées. Les règles économiques, la sauvegarde et les cadrages de jeu ne changent pas. Aucun commit, push ou déploiement effectué. L’appréciation du confort du trajet reste à confirmer en jouant.

## Rétablissement du premier mini-jeu d’usine
- [x] Retrouver le premier code dans l’historique Git local (objet `6064d95acbe4e3da42245c6634430919d070b28b`) et réutiliser sa géométrie, ses éclairages, les emplacements du bac/carton et son cadrage.
- [x] Rétablir la salle, le sol, les murs, les étagères, les cartons rangés, l’établi et les arcs de dépôt de 220 ms ; dépôts immédiats en mouvement réduit. Durée et quantités sur les fiches du poste.
- [x] Conserver le trajet actuel de l’escalier, sa hauteur corrigée, la Surchauffe ×2, les destinations noires, les six billes par carton et les 15 pièces garanties pour 15 secondes actives.
- `npm run build` : TypeScript et production réussis ; avertissement Vite existant pour le bundle d’environ 670 ko. `npm test` : 28 tests de logique réussis.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'emballage 3D|départ refusé|service importé|début de service refusé'` : quatre parcours ciblés réussis. Glisser-déposer, raté, clic, clavier, carton suivant, pause/annulation, reprise, salaire unique et récupération après échec d’écriture. Pas de nouvelle suite complète navigateur pour ce rétablissement visuel.
- Captures à 1280×720 et 1440×1000 inspectées : premier décor et cadrage retrouvés, interactions lisibles et informations intégrées aux supports. Rapports dans `test-results/`. L’appréciation du rendu et du rythme reste au créateur. Aucun commit, push ou déploiement effectué.

## Tri d’usine — minute active et risque d’explosion
- [x] Remplacer les cartons de six sans enjeu par un flux continu de billes sur le poste de l’ancienne salle 3D. Nouveau service : 60 secondes actives, grises cliquées à 50 centièmes chacune, salaire seulement au terme ; grises manquées et inactivité sans gain.
- [x] Rouge cliquée : explosion stylisée, arrêt immédiat et aucun salaire pour le service, sans débit des pièces antérieures ; mode réduit sans particules. Retour aux destinations après une brève réaction, nouveau service sur sélection explicite.
- [x] Clic et Tabulation/Entrée/Espace ; symboles +/× lisibles, explications au survol/focus, temps et salaire en attente sur les fiches 3D, aucun HUD.
- [x] Sauvegarder chaque clic accepté avant publication, score et suppression/échec dans le même snapshot. Checkpoints du flux et de la durée, reprise avec mêmes billes et score, aucun double gain ou revenu hors ligne. Migration du format interne 1 vers 2 ; ancien service commencé conservé exceptionnellement selon son ancien contrat, nouveau service au tri.
- `npm test` : 31 tests de logique réussis, dont gain différé/idempotent, inactivité, grises expirées, rouge et reprise après explosion, échecs d’écriture du clic/de l’explosion/du salaire, pause, migration et états d’usine incohérents. Plinko, 50/51 billes, quinze sorties et Surchauffe inchangés.
- `npm run build` : TypeScript et build de production réussis. Avertissement de taille du bundle conservé (environ 674 ko avant gzip), sans erreur de compilation.
- `$env:PLINKO_GPU='1'; npm run test:browser` : 13 parcours Chrome complets réussis, dont service réel d’une minute avec grise au clavier, rechargement sans perte du score, versement unique, pause masquée, import de service et récupération après échec d’écriture. Explosion dans l’application : zéro salaire conservé au rechargement, aucun départ automatique.
- Après inspection visuelle, corriger les symboles +/× qui pénétraient la surface des billes. `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'tri 3D|rouge dans le jeu'` : deux parcours ciblés réussis après correction, puis nouveau build et 31 tests de logique réussis. Pas de nouvelle suite complète après ce détail visuel.
- Captures du poste sans survol à 1280×720 et 1440×1000, ainsi que de l’explosion, inspectées. Rapport temporaire dans `test-results/`, ignoré par Git. La session utilisateur de 10 à 15 minutes et l’équilibrage de la cadence restent à réaliser.

## Événements temporaires à l’usine
- [x] Ajouter Surcadence (tapis et arrivées ×2), Arrivage massif (arrivées ×2) et Ralentissement (tapis et arrivées ÷2). Un de chaque par service neuf, ordre aléatoire et horaires vers 12/28/44 s ±2 s, préavis 2 s et durée 7 s. Réglages de départ documentés au fichier 11.
- [x] Annonce, effet et compte à rebours sur la fiche du poste ; voyant fixe et annonce accessible. Les stries suivent le tapis, sans animation décorative en mouvement réduit. Aucun HUD, flash ou changement du prix des grises, de la probabilité des rouges et de l’explosion.
- [x] Déplacements et arrivées suivent deux horloges intégrées ; aucun saut à une frontière ou effet dépendant du nombre d’images. Répartition entre couloirs pour éviter les superpositions lors des arrivages denses.
- [x] Sauvegarder le plan au départ et reprendre l’événement, ses billes, son score et sa durée sans nouveau tirage. Masquage et suspension figent le tout. Format interne 3 avec migration des formats 1 et 2 : contrat historique du 1 conservé, ancien tri du 2 terminé à cadence fixe, nouveaux services avec événements.
- `npm test` : 38 tests de logique réussis. Préavis, ×2 réel des déplacements et/ou des arrivées, ralentissement ÷2, fin et retour normal, simulation par petites/grandes étapes, absence de superposition en flux dense, pause/reprise et salaire unique, migration du tri antérieur et rejet des plans invalides.
- `npm run build` : TypeScript et production réussis ; avertissement de taille existant pour le bundle, environ 678 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser` : 14 parcours Chrome complets réussis, dont service réel d’une minute avec événements, reprise du salaire, import/export, escalier, usine, concurrence des onglets et 50 vols sur les quinze sorties.
- Après ajustement de la répartition en flux dense : `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'événements 3D|tri 3D|rouge dans le jeu|service importé'` : quatre parcours ciblés réussis ; nouveau build et 38 tests de logique réussis. Pas de deuxième suite complète après cet ajustement.
- Captures des trois événements et du préavis inspectées à 1280×720 et 1440×1000. La sensation de difficulté et les paramètres de cadence restent à évaluer par le créateur ; aucune session manuelle de 10 à 15 minutes annoncée.

## Boîtier de Papy — suppression et simplification
- [x] Ajouter « Supprimer la sauvegarde… » : confirmation sur la texture du boîtier, export avant confirmation, annulation par bouton ou Échap. Les raccourcis et autres commandes restent bloqués tant que la confirmation est ouverte.
- [x] Supprimer « Relire la sauvegarde » ; montrer « Réessayer après l’erreur » seulement en cas d’erreur de lecture/écriture. Conserver son, mouvements réduits, qualité, export/import et fermeture ; souris et focus filtrés selon les mêmes options que l’affichage.
- [x] Remplacer la progression par une nouvelle partie à 19 pièces dans une seule écriture avant publication ; préférences conservées, Doigt arrêté, statistiques/achats/résultats/billes/bonus/service effacés. Nettoyer les anciens vols et effets avant de réutiliser leurs identifiants. Autres clés du navigateur et exports intacts.
- [x] Annulation sans mutation ; écriture refusée sans perte ; sauvegarde inconnue conservée avant confirmation ; onglet secondaire sans accès à la suppression. Import et confirmation conservent leur priorité.
- `npm test` : 41 tests de logique réussis. Nouveaux cas : reset complet avec préférences conservées, ancien état intact en cas d’erreur, reprise explicite et refus sans droit d’écriture.
- `npm run build` : TypeScript et production réussis ; avertissement de taille existant pour le bundle, environ 680 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'boîtier|suppression|un seul onglet'` : cinq parcours ciblés réussis après correction du focus initial du test d’inventaire. Vérification des sept commandes normales, confirmation/export/annulation/clavier, suppression puis rechargement, erreur d’écriture et sauvegarde incompatible.
- Après nettoyage des anciens vols : `$env:PLINKO_GPU='1'; npm run test:browser` : 18 parcours Chrome complets réussis. Nouveau cas : ancien vol partiellement animé, nouvelle partie réutilisant le même identifiant avec une autre sortie ; nouvelle trajectoire et unique crédit corrects. Les parcours usine/événements, import/export, escalier, concurrence et 50 billes restent réussis.
- Captures du boîtier normal et de la confirmation inspectées à 1280×720 : texte et zones intégrés au support 3D, aucun panneau flottant. Documentation et décisions mises à jour. L’essai utilisateur de 10 à 15 minutes reste ouvert.

## Probabilités — pertes plus fréquentes
- [x] À la demande du créateur, passer les poids à 600/240/100/35/15/6/3/1 sur 1 000 pour ×0,3/×0,5/×1/×1,5/×3/×5/×10/×40. Hors Surchauffe : 84 % de pertes, 10 % de remboursements, 6 % de gains nets ; retour théorique 59,75 % et perte nette moyenne 40,25 % de la mise. Les valeurs exactes restent un réglage de départ à évaluer en jouant.
- [x] Garder les mêmes poids en manuel et automatique, indépendamment du solde et des pertes passées. Multiplicateurs, quinze sorties et partage des côtés conservés. Les nouveaux poids concernent seulement les prochains lancements ; anciens retours/sauvegardes conservés sans nouveau format.
- `npm test` : 43 tests de logique réussis. Les 1 000 tickets vérifient les poids exacts et les agrégats 840 pertes/100 remboursements/60 gains, 59 750 centièmes rendus pour 100 000 misés. Égalité du tirage manuel/Doigt, selon fonds et historique de pertes, vérifiée sur tous les tickets. Résultat sous les anciens poids payé sans recalcul ni second versement. Les cas économiques à multiplicateur imposé utilisent désormais un ticket de la catégorie, indépendamment de sa fréquence.
- `npm run build` : TypeScript et production réussis ; avertissement de taille existant pour le bundle, environ 680 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'scène plein écran|catalogue 3D|plateau : 50|rayons 3D|boîtier physique'` : cinq parcours ciblés réussis. Lancement/reprise, import/export, catalogue avec nouvelles chances, survol/focus et 50 vols sur les quinze sorties avec crédits cohérents. Pas de nouvelle suite navigateur complète pour ce réglage de poids.
- Capture des notes du catalogue inspectée : les huit nouvelles probabilités sont lisibles sur le livre 3D. Documentation de l’économie, décisions et instructions actualisées. Aucun essai utilisateur de 10 à 15 minutes annoncé pour ce nouvel équilibrage.

## Validation consolidée — reprise des finitions techniques
- Audit de la checklist et du backlog : les fonctionnalités demandées du périmètre actuel sont implémentées. La validation globale après le dernier rééquilibrage était encore à reprendre ; les tâches de ressenti et la session MP-010 restent distinctes.
- `npm test` : 43 tests de logique réussis avec les poids actuels. `npm run build` : TypeScript et production réussis.
- `$env:PLINKO_GPU='1'; npm run test:browser` : 18 parcours Chrome complets réussis avec les nouvelles probabilités. Inclut boîtier et suppression, sauvegardes incompatibles et concurrence, achats, escalier, service réel d’une minute, reprise et salaire unique, événements d’usine, grises/rouges, quinze sorties et 50 billes.
- La passe a révélé l’ancien mode `PCFSoftShadowMap`, retiré de Three.js installé : le moteur le remplaçait déjà par `PCFShadowMap`. Utiliser directement ce dernier dans `src/rendering/scene.ts`, sans changement des règles ni des sauvegardes.
- Après cette correction : nouveau build/contrôle TypeScript réussis, puis `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'scène plein écran|rayons 3D|plateau : 50'` : trois parcours ciblés réussis. L’avertissement de mode d’ombres retiré n’apparaît plus dans cette passe ; pas de deuxième suite complète après cette modification de rendu.
- Captures du boîtier et du trajet inspectées pendant la passe complète, puis cave et cinquante vols inspectés après correction. Les données utilisateur sont préservées ; les parcours utilisent des contextes navigateur de test.
- Limites conservées : avertissement de taille du bundle (environ 680 ko avant gzip), appréciation des sons et confort artistique, session utilisateur de 10 à 15 minutes et rythme avec les nouveaux poids. Aucune de ces évaluations subjectives n’est annoncée comme réalisée ; MP-010 reste ouvert.

## Décor de cave — références atelier et salon du 18 octobre 2026
- [x] Reprendre la composition en vraie 3D : Plinko central, escalier latéral dégagé, canapé brun avec plaid et coussin, pouf, caisse/table et lampe ; poêle, bûches, étagères de livres, coffres, robots et appareils anciens, plantes, plans et fournitures d’atelier. Prototype décoratif distinct, sans achat ni mécanique supplémentaire.
- [x] Affiner la maçonnerie et les petits pavés, le sens des veines du bois, les luminaires à cage, la guirlande et les éclairages locaux. Ajouter ombres de contact et halo modéré en qualité normale ; garder les mêmes volumes et commandes en qualité basse, sans ces passes.
- [x] Générer et intégrer trois textures locales de surface pour tapis, bois et pierre, avec l’outil intégré imagegen. Réencodage WebP, provenance et prompts dans `src/assets/textures/README.md`. Les meubles, murs et sols restent des géométries, avec perspective et occultation ; aucune image de pièce en arrière-plan.
- [x] Élargir les cadrages pour rendre le salon et l’atelier visibles, conserver les vues de lecture. Déplacer géométrie et trajet de l’escalier ensemble. Corriger la vitesse d’approche révélée par le contrôle de continuité : durée répartie par distance, accélération/freinage progressifs, hauteur des yeux et retour inverse conservés.
- Autocritique et captures à plusieurs étapes : première passe à 6/10, avec escalier trop envahissant, matériaux réguliers et lumière plate. Corrections du placement, du mobilier, des surfaces, du tapis et des sources lumineuses ; dernière auto-évaluation **9/10 pour la direction artistique et la cohérence du décor**. Cette note est subjective, pas une validation artistique du créateur ni une mesure de reproduction exacte des images.
- `npm test` : **43 tests de logique réussis** ; `npm run build` : contrôle TypeScript et production réussis. Avertissement de taille du JavaScript conservé, environ **755 ko** avant gzip ; trois textures WebP locales totalisant environ 1,65 Mo, incluses dans le build.
- `$env:PLINKO_GPU='1'; npm run test:browser` : **18 parcours Chrome complets réussis** après les derniers changements de code, en 3,8 min. Couvre sauvegardes et suppression, achats, survol/focus et occultation, escalier, usine/événements, concurrence, plafond de billes et chemins des quinze sorties.
- `npm run preview -- --port 4173 --strictPort` : build de production inspecté à **1820×864 et 1280×720**, vues Plinko et établi ; trois textures servies en HTTP 200, aucune erreur JavaScript ou console enregistrée dans cette passe. Cave sans survol : canevas seul, aucun HUD. Captures finales temporaires : `test-results/cave-decor.png`, `atelier-decor.png` et `cave-decor-1280.png`.
- Mesure courte avec **50 billes**, Chrome headless, 1280×720, GPU AMD Radeon intégré via ANGLE Direct3D11 : environ **97 images/s en normal** et **130 en qualité basse**, 95e percentile d’intervalle entre images respectivement 12,6 et 9 ms. Mesure indicative sur cette machine, pas une garantie sur tous les ordinateurs.
- Les règles économiques, les probabilités et le contrat de sauvegarde sont conservés. Aucun commit, push ou déploiement. La session utilisateur de 10 à 15 minutes, le ressenti des sons et l’appréciation artistique du créateur restent ouverts.

## Corrections demandées — canapé, établi et fenêtre
- [x] Refaire les proportions du canapé : trois assises plus larges et profondes, dossier et accoudoirs ajustés, plaid et coussin repositionnés ; pouf dégagé de l’assise.
- [x] Adosser l’établi au mur latéral droit avec panneau, fournitures, rangements, lampe et catalogue dans un même repère. Orienter les cadrages établi/catalogue vers ce mur, conserver les transitions et raccourcis. Étendre les surfaces de la pièce visibles par ce nouveau cadrage pour éviter les bords ouverts.
- [x] Retirer l’affiche qui empiétait sur la fenêtre. Déplacer les rangements et le poêle qui chevauchaient l’établi ; faire rejoindre le conduit au jambage de pierre pour dégager la fenêtre et le catalogue.
- Le test de clic a révélé la reliure du livre prise comme obstacle sous certains angles. Rattacher couverture/reliure au même contrôle que le catalogue, sans désactiver l’occultation par les autres objets.
- `npm test` : **43 tests de logique réussis**. `npm run build` : **TypeScript et production réussis**, avertissement de taille du bundle conservé, environ 755 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'scène plein écran|catalogue 3D|établi mural|trajet 3D|rayons 3D|plateau : 50'` : **six parcours ciblés réussis** après le dernier déplacement du poêle. Nouveau parcours : ouverture réelle du livre depuis Plinko et l’établi, puis clics sur les trois zones d’achat en 1280×720 et 1920×911 ; caméra face au mur droit et pages tournées vers la pièce. Les autres parcours vérifient achats/clavier, plein écran, trajet et hauteur de l’escalier, occultation/survol et 50 vols sur les 15 sorties. Pas de nouvelle suite complète pour cette correction.
- Captures des vues Plinko et établi inspectées à 1920×911, et contrôle à 1280×720 ; dernière passe sans erreur JavaScript ni ressource HTTP manquante enregistrée. Fichiers temporaires stables dans `test-results/cave-decor.png`, `atelier-decor.png` et `cave-decor-1280.png`. Mesure courte pendant cette passe avec 50 billes : environ 61 images/s en qualité normale à 1280×720 sur le GPU de test ; valeur indicative, dépendante de la charge de la machine.
- Économie et sauvegardes inchangées. Serveur local préexistant conservé. Aucun commit ni push.

## Retour de l’escalier au Plinko — mouvement de caméra
- [x] Remplacer le raccord anguleux au pied par une courbe arrondie parcourue sans arrêt intermédiaire, avec accélération et freinage progressifs. Conserver les mêmes positions à l’aller et au retour ainsi que la hauteur des yeux ; allonger le retour au sol de 2,6 à 5,2 s.
- [x] Relever et tourner progressivement le regard vers la machine pendant la dernière partie de la descente, puis conserver ce repère jusqu’au cadrage jouable. Supprimer l’interpolation entre cibles éloignées qui faisait pivoter la vue pendant le déplacement. Position et orientation se raccordent sans saut à la fin.
- Le contrôle visuel d’un premier essai orienté dans le sens du déplacement révélait l’arrière ouvert du décor. Cet essai a été remplacé par le regard vers le Plinko dès le bas des marches ; aucun demi-tour à l’arrivée. Le contrôle de rotation réelle Three.js a ensuite conduit à étaler davantage ce mouvement pendant la descente.
- `npm test` : **44 tests de logique réussis** après le dernier ajustement. `npm run build` : **TypeScript et production réussis** ; avertissement de taille existant, environ 756 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'trajet 3D|escalier : trajet|départ refusé'` : les deux parcours d’application réussissent (départ unique, clavier bloqué, Doigt arrêté au retour, refus avec billes, fondus réduits, horloges et salaire). Le parcours 3D détecte d’abord une rotation trop rapide ; après correction, `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'trajet 3D'` réussit : dégagement et hauteur sur les vrais volumes, positions inverses, rotation continue et raccord final à la caméra de jeu. Pas de nouvelle suite navigateur complète pour cette correction.
- Captures de montée, descente, pied des marches et retour vers la pièce inspectées à 1440×1000. La cave et le Plinko restent visibles pendant le retour au sol. Fichiers temporaires dans `test-results/`, dont `escalier-retour-pied.png` et `escalier-retour-piece.png`. Le ressenti en jouant reste à évaluer ; aucune session manuelle annoncée.
- Règles économiques et format de sauvegarde conservés. Mode réduit, pause hors cave et Doigt arrêté au retour inchangés. Serveur local préexistant conservé ; aucun commit, push ni déploiement.

## Surbrillance de l’escalier entier
- [x] Partager un matériau de bois dédié entre les 33 éléments de l’escalier : marches, contremarches, rampes, supports et palier. Tous se mettent en évidence ensemble avec une teinte chaude au survol ou au focus clavier, sans éclairer les murs ni les meubles voisins.
- [x] Rendre aussi les rampes et supports cliquables pour la même sortie. Retirer la surbrillance au départ, au changement de vue, à la sortie du pointeur ou à la perte du focus. Remplacer le petit cadre d’une marche par la mise en évidence de toute la structure ; conserver « Sortir de la cave » à un repère commun près de la rampe, ainsi que les indications d’attente des billes.
- `npm test` : **44 tests de logique réussis**. `npm run build` : **TypeScript et production réussis** ; avertissement de taille existant, environ 757 ko avant gzip.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'rayons 3D|scène plein écran|escalier : trajet'` : **trois parcours réussis**. Après atténuation de la teinte et placement commun du libellé, nouveau build et `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'rayons 3D|scène plein écran'` : **deux parcours réussis**. Pas de nouvelle suite complète pour cet effet visuel.
- Contrôle ponctuel dans Chrome à **1920×911 et 1280×720** : survol réel des marches et rampes, 33 éléments mis en évidence, focus Tabulation identique, extinction à la sortie/au flou/au départ, mobilier voisin préservé et libellé non occulté. Captures inspectées, dont `test-results/escalier-survol.png` et `escalier-survol-compact.png` ; aucune erreur JavaScript enregistrée dans ce contrôle.
- Économie, destinations, trajet et sauvegardes conservés. Serveur local existant préservé ; aucun commit ni push.

## Enseigne de la machine
- [x] Remplacer « PLINKO » par « MASTER PLINKO » au-dessus du plateau, en conservant les étoiles et le style. Ajuster la taille des lettres pour que la lampe ne masque pas la fin du nom.
- `npm test` : 44 tests réussis ; parcours Chrome `scène plein écran` réussi. Après le dernier ajustement de taille : nouveau `npm run build` (TypeScript et production) réussi et capture ciblée inspectée à 1280×720, sans erreur JavaScript enregistrée. Avertissement de taille du bundle existant conservé ; aucune nouvelle suite complète pour ce texte décoratif.
- Capture temporaire : `test-results/enseigne-master-plinko.png`. Aucun commit ni push.

## Arrière de la cave — référence du 19 octobre 2026
- [x] Fermer réellement l’arrière et prolonger les murs latéraux, la maçonnerie, les pavés, les planches et les poutres. Ouvrir une vraie baie dans le mur opposé ; conserver les mêmes matériaux locaux et le passage de l’escalier. Aucun fond de pièce projeté.
- [x] Construire l’atelier scientifique de Papy : tableau noir à équations/croquis et plan d’essais, établi à tiroirs, verrerie, instruments en cuivre, anciens appareils et livres, fenêtre bleue pluvieuse et conifères, télescope sur trépied, réfrigérateur couvert de notes, coffres et caisses marquées, prototype vert à manomètre et aquarium avec poissons/plantes. Ajouter dirigeable et planètes suspendus, plantes retombantes, lanternes, poêle, table de cartes/casque audio, fauteuil en toile et plaid, peluche dans son siège suspendu. Accessoires sans nouvelle mécanique ni commande.
- [x] Montrer cet arrière après le passage de la trémie : regard relevé vers la pièce, maintien de 0,6 s au sol, retour progressif au Plinko en 2,2 s à l’intérieur du trajet existant. Positions et hauteur des yeux conservées ; durées globales, pauses, départ unique, fondus réduits et Doigt arrêté inchangés.
- Autocritiques et affinages sur captures : **6,5/10** au premier passage (murs latéraux vides, tableau trop rangé, éclairage plat et fauteuil masquant le prototype), puis **8/10** après ajout des rangements latéraux, chaleur et détails. Derniers ajustements : premiers plans, verrerie, instruments, manomètre, plaids, notes et coffres, ombres de contact, petites imperfections et temps de découverte. **Auto-évaluation finale : 9/10 pour la direction artistique et l’intégration dans le jeu** ; jugement subjectif de l’assistant, sans prétendre à une reproduction pixel par pixel ou à l’approbation artistique du créateur.
- `npm test` : **44 tests de logique réussis**. `npm run build` : **TypeScript et production réussis** ; avertissement de taille existant, environ **779 ko** de JavaScript avant gzip, sans nouvelle dépendance ni nouvel asset externe.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'trajet 3D|escalier : trajet|rayons 3D|scène plein écran|établi mural|plateau : 50'` : **six parcours Chrome réussis** après les derniers changements de code. Contrôles : scène sans HUD et reprise, catalogue/achats à la souris, départ unique et horloges figées, marche dégagée et hauteur réelle, positions inverses et rotation continue, neuf rayons vers la pièce arrière sans trou avec cible centrale distante, survol/focus et occultation, cinquante billes et quinze sorties. Pas de nouvelle suite navigateur complète pour ce décor.
- Captures finales inspectées en qualité normale à **1820×864 et 1280×720**, depuis les marches et face à l’arrière ; vue Plinko également contrôlée. Fichiers temporaires : `test-results/cave-arriere.png`, `cave-descente.png`, `cave-descente-compact.png` et `cave-plinko.png`. Aucune erreur JavaScript dans cette passe ; le pilote ANGLE émet des avertissements d’arrondi de shader, sans échec de rendu.
- Mesure courte Chrome headless à 1280×720, **50 billes** : environ **55 images/s en normal**, intervalle au 95e percentile 29 ms ; **89 images/s en qualité basse**, 95e percentile 15,8 ms. Valeurs indicatives sur la machine de test, pas une garantie sur tous les ordinateurs.
- Économie, probabilités, progression et format de sauvegarde conservés. Aucune session manuelle de 10 à 15 minutes annoncée ; MP-010 reste ouvert. Aucun commit, push ni déploiement.
- Le serveur démarré pour ces vérifications a été arrêté en fin de tâche ; port 5173 libéré. Relancer le jeu avec `npm run dev`.

## Boutique publique d’Azur — référence du 19 octobre 2026
- [x] Construire uniquement l’espace public selon les repères de la référence : baie/entrée vitrée à gauche sur une rue pluvieuse en volumes, comptoir central en bois, rangements d’appareils au fond, réparation sur le mur droit et vitrine éclairée à droite. Poutres, suspensions, tapis, plantes et matériaux patinés ; appareils crème, sauge, lavande et pêche.
- [x] Varier radios, réveils, lecteurs de cassettes, télévisions à tube, ventilateurs, lampes, appareils photo, casques et accessoires. Caisse, radio à cinq antennes « Fonctionne normalement », appareil ouvert et circuit, outils, tasse et documents au comptoir. Tiroirs à composants, outils suspendus, fiches, lampes articulées et tabourets au poste de réparation. Aucun Plinko ni prototype d’amélioration public, aucun nouveau système d’achat.
- [x] Brancher la visite explicite depuis les destinations, après la rencontre à la panne (`repairTriggered`) ; refuser le contournement avant rencontre. Deux caméras à 1,68 m, approche de 500 ms ou immédiate en mouvement réduit. Comptoir, porte privée et entrée accessibles par rayons/focus avec occultation ; indications 3D uniquement au survol/focus, retirées après mouvement de caméra et à la sortie du pointeur. Aucun HUD. Échap revient à l’entrée puis aux destinations ; rechargement en cave, Doigt arrêté et progression conservée.
- [x] Préparer une vraie porte privée, son cadre et une ouverture architecturale derrière le comptoir, avec raccord nommé pour une extension ultérieure. Indiquer explicitement l’accès indisponible ; aucun déblocage narratif inventé, aucune arrière-boutique, passage secret ou laboratoire construit.
- Autocritique initiale : **6,5/10** (vitrine coupée, enseigne masquée par une tablette, rangements trop clairsemés, bois orangé). Corrections de cadrage et de proportions, enseigne avancée, accessoires et patine ajoutés. Inspections suivantes : vitrine affinée pour dégager la réparation, contraste et ombres de contact, halo excessif fortement réduit. Le test à 1280×720 a révélé une entrée hors de la zone de focus : cadrage et point de sélection corrigés. Corriger aussi un survol résiduel après changement de vue/redimensionnement ; vérifier son extinction sur la capture compacte.

Auto-évaluation finale subjective, sur les captures du jeu et du build de production :

| Critère | Note | Appréciation et limites |
| --- | --- | --- |
| Fidélité à la référence | 1,7/2 | Disposition et repères repris ; rue et petites silhouettes simplifiées, sans prétendre à une copie exacte de l’illustration |
| Composition et proportions | 1,8/2 | Comptoir central, circulation et porte lisibles ; vitrine affinée, réparation dégagée ; profondeur plus régulière que la référence |
| Matériaux et éclairage | 1,8/2 | Bois usé, patine, tapis, sources chaudes et baie bleue, ombres douces ; certains plastiques et détails extérieurs restent simples |
| Objets et détails | 1,8/2 | Silhouettes variées, accessoires de réparation et humour d’Azur ; moins de petits objets uniques que dans l’image |
| Caméra, interactions et défauts | 1,9/2 | Vraies caméras entrée/comptoir, hauteur constante, clavier/souris, occultation et aucun HUD ; contrôle limité aux deux cadrages et résolutions testés |
| **Total** | **9/10** | Auto-évaluation de l’assistant, distincte de l’appréciation artistique du créateur |

- `npm test` : **45 tests de logique réussis**. `npm run build` : **TypeScript et production réussis**. Module boutique chargé à la demande, environ **32 ko** avant gzip ; bundle principal environ **783 ko**, avertissement de taille existant conservé. Aucune dépendance ni nouvelle texture externe.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'boutique|scène plein écran|escalier : trajet|catalogue 3D'` : **six parcours Chrome ciblés réussis** après les derniers changements. Visite masquée et refusée avant rencontre ; sélection explicite, sauvegarde/bonus/horloges figés, porte indisponible, caméras entrée/comptoir, interactions souris et clavier, occultation par les appareils, mouvement réduit, aucun HUD ni survol résiduel ; rechargement sans changement de format ni perte. Régressions : cave, reprise d’un vol, catalogue/achats et trajet de sortie. Pas de nouvelle suite navigateur complète annoncée.
- `npm run preview -- --port 4173 --strictPort` : parcours réel du build de production jusqu’à la boutique et captures inspectées à **1820×864 et 1280×720**, depuis les deux caméras. Module et textures servis sans erreur HTTP ; aucune erreur JavaScript enregistrée dans cette passe. Captures temporaires : `test-results/azur-boutique.png`, `azur-comptoir.png`, `azur-boutique-compact.png` et `azur-porte.png`.
- Mesure courte Chrome headless à **1280×720**, GPU AMD Radeon intégré via ANGLE Direct3D11, sans autre parcours simultané : environ **56 images/s en normal**, intervalle au 95e percentile **33,6 ms** ; **85 images/s en qualité basse**, 95e percentile **16,3 ms**. Mesure indicative sur cette machine, sans garantie sur tous les ordinateurs.
- Régression usine complémentaire : `$env:PLINKO_GPU='1'; npm run test:browser -- --grep 'départ refusé|rouge dans le jeu|début de service refusé' --output test-results/usine-regression` : **trois parcours supplémentaires réussis** (neuf parcours distincts au total). Vérifie la sélection explicite, les horloges, la reprise de service et le salaire unique, l’explosion sans gain et le départ refusé par le stockage avec récupération. Dernier ajustement de clavier : Maj+Tab part du dernier objet, sans intercepter les combinaisons système ; nouveau build/TypeScript et parcours `boutique publique` **réussis**. Aucun changement visuel après les captures de production.
- Le serveur de prévisualisation lancé pour cette tâche sur le port 4173 a été arrêté ; le serveur de développement préexistant sur 5173 est conservé. Pour une prochaine session sans serveur : `npm run dev`.
- Limites : arrière-boutique, passage secret, laboratoire et leur déblocage restent entièrement à réaliser ; appareils publics décoratifs. Économie, probabilités et sauvegardes au format 3 conservées. La session de jeu de 10 à 15 minutes du créateur reste ouverte. Aucun commit, push ou déploiement.

## Réserve, passage secret et atelier d’Azur — 19 octobre 2026
- [x] Conserver l’apparence de la boutique publique et raccorder sa porte derrière le comptoir. Accès privé après **réparation initiale achetée**, décision explicite du créateur : réutilisation de `repairPurchased`, sans nouveau drapeau ni format. Avant réparation, indication explicite et aucun déplacement.
- [x] Construire une réserve utilitaire réelle : table et appareils en attente, cartons/emballages, étagères de composants, câbles, ventilateur, radio à antennes et éclairage modeste. Porte battante et parcours autour du comptoir ; ouverture complète avant franchissement.
- [x] Réaliser le verrou, les rails, roulettes, étagère opaque coulissante et son stationnement latéral. Radio → déverrouillage de 0,35 s → translation de 1,6 s → découverte de 1,8 s. Le couloir de 3 m existe derrière la baie ; la lumière et l’atelier apparaissent par l’ouverture. Entrée sur sélection explicite ; clics répétés ignorés. Le dispositif secret n’est pas clairement montré par l’image jointe : le meuble coulissant est une **interprétation**, la porte à hublot de la référence est reprise au fond de l’atelier comme porte technique décorative.
- [x] Construire le MasterPlinko hors service au centre : capot relevé, écran statique E-07, panneau démonté avec circuits, câblage et cartes débranchés, pièces déposées, picots et compartiments reconnaissables. Doigt avec réservoir/commande, Bac ouvert avec rouleau/ticket et Duplicateur sous cloche sur des bancs distincts ; instruments, cartouches, circuits incomplets, notes contradictoires, rangements et chariots. Aucun fonctionnement normal, don, achat ou déblocage en consultant ces objets.
- [x] Cadrages réserve/découverte/atelier et rapprochements machine/prototypes/Duplicateur, à 1,68 m, courbes arrondies et orientations progressives. Retour par repères physiques ou Échap ; activer à nouveau l’objet observé revient à la vue principale. Survol/focus ancrés en 3D, occultation et aucun HUD. Mode réduit immédiat, temps de jeu suspendu pendant la visite, mécanismes transitoires réinitialisés à chaque visite ; reprise en cave et sauvegarde inchangée.

Autocritiques sur captures : première passe environ **6/10**, réserve trop sombre, prototypes hors cadre et capot coupé. Après éclairage, cadrages et accès, environ **8/10** ; rangements encore répétitifs et câblage trop propre. Dernière passe : instruments et cartes variés sur les étagères, circuits et prises exposés, faisceaux détendus, pistes du panneau déposé, vis et notes. Correction de la radio partiellement hors du cadrage de réserve et rapprochement du poste de prototypes pour dégager le chariot. Réinspection des éléments modifiés dans le build réel, mécanisme fermé, en mouvement et ouvert.

Auto-évaluation finale subjective après inspection :

| Critère | Note | Constat et limite |
| --- | --- | --- |
| Fidélité aux références | 1,6/2 | Plinko central ouvert, bancs latéraux, câbles, instruments, chariots et porte à hublot reconnaissables ; illustration plus dense et plus irrégulière que les modèles procéduraux |
| Continuité spatiale | 1,9/2 | Trois espaces dans le même repère, ouvertures et dégagements réels, trajet autour du comptoir et couloir ; parcours prédéfinis uniquement |
| Matériaux et éclairage | 1,7/2 | Bois local, patine, crème/sauge/lavande/pêche, sources chaudes et accents menthe ; certains plastiques et sols restent simples |
| Mécanisme et transitions | 1,9/2 | Verrou puis translation sur rails et découverte, sans empilement ni collision détectée, porte ouverte avant passage et retour continu ; mécanisme de dissimulation interprété |
| Lisibilité et interactions | 1,9/2 | Panne visible, prototypes distincts et lisibles de près, souris/clavier et retours, aucune interface permanente ; bords du mobilier coupés dans certains cadrages rapprochés |
| **Total** | **9/10** | Appréciation de l’assistant sur les captures réellement inspectées, distincte de celle du créateur |

- `npm test` : **49 tests de logique réussis**. `npm run build` : **TypeScript et production réussis**, module boutique environ **62 ko** et bundle principal **783 ko** avant gzip. Avertissement de taille du bundle principal conservé. Aucune dépendance ni texture externe nouvelle.
- `$env:PLINKO_GPU='1'; npm run test:browser -- --output test-results/validation` : **24 parcours Chrome réussis**, suite complète après les derniers changements de code. Inclut autorisation après achat réel, radio au clavier, prototypes sans modification de sauvegarde, retours, remise à zéro de la visite et rechargement. Échantillonnage du trajet contre les maillages réels : pas d’intersection tête/torse détectée, dégagements du seuil et du meuble supérieurs à 30 cm ; même en forçant les pièces privées visibles et les ouvertures ouvertes, les prototypes sont occultés depuis les vues publiques. Régressions cave, catalogue, escalier, usine/événements, stockage/import/suppression/concurrence, 50 vols et quinze sorties réussies.
- Build de production lancé avec `npm run preview -- --port 4173 --strictPort` : parcours complet avec animations actives, activation réelle de la radio à la souris, entrée et gros plans au clavier, retours par Échap et repères physiques. **Aucune erreur JavaScript ni réponse HTTP en échec** ; solde, améliorations et historique conservés. Inspection en qualité normale à **1820×864 et 1280×720**. Captures temporaires dans `test-results/` : `azur-public-production.png`, `azur-arriere-production.png`, `azur-mecanisme-production.png`, `azur-passage-production.png`, `azur-atelier-production.png`, `azur-plinko-casse.png`, `azur-prototypes-production.png`, `azur-duplicateur-production.png` et `azur-atelier-compact.png`. Une capture déterministe du mécanisme à mi-course est aussi disponible : `azur-passage-mi-ouvert.png`.
- Mesure courte Chrome headless en qualité normale à 1280×720 : environ **68 images/s**, intervalle au 95e percentile **28,2 ms**. Valeur indicative sur la machine de test, sans garantie sur tous les appareils. Construction initiale du bâtiment mesurée à environ **4,7 s** dans la fixture ; le renderer est ensuite réutilisé. Les tests attendent explicitement ce chargement.
- Limites : fidélité stylisée, détails plus simples que l’illustration, dissimulation interprétée ; prototypes décoratifs, futurs dialogues et systèmes non développés. Aucun changement économique dans cette extension et format de sauvegarde 3 conservé. La session de jeu de 10 à 15 minutes du créateur reste à faire.
- Prévisualisation de cette tâche arrêtée sur 4173 ; serveur de développement préexistant conservé sur 5173. Commande de lancement hors serveur existant : `npm run dev`. Publication GitHub demandée explicitement par le créateur après la réalisation ; compte rendu et modifications du projet inclus dans le commit, captures temporaires ignorées par Git.
