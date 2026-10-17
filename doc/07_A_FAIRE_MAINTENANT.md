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
- [x] Navigation sans marche libre : vues Plinko et établi, porte accessible.

Les valeurs complétées par l'assistant sont des réglages de départ modifiables, pas des tests déjà réussis.

## 2. À réaliser par l'assistant — structure
- [x] Lire la spécification 11 et le prompt 12.
- [x] Vérifier le dossier cible et préserver son contenu éventuel.
- [x] Créer le projet Vite/TypeScript.
- [x] Préparer le versionnement local ; réutiliser le dépôt fourni s'il existe.
- [x] Documenter installation, localhost, build et tests.
- [x] Séparer état, économie, résultats, trajectoires, progression, rendu et sauvegarde.
- [x] Centraliser valeurs et identifiants.
- [x] Réaliser une machine et un établi procéduraux avec deux cadrages fixes.
- [x] Ajouter navigation directe, flèches, retour clavier et transitions désactivables.
- [x] Afficher solde, mise et dernier résultat.

## 3. À réaliser par l'assistant — boucle jouable
- [x] Tirer le résultat avant l'animation.
- [x] Faire arriver chaque bille dans la sortie correspondante.
- [x] Contrôler fonds, cadence et plafond avant débit.
- [x] Déclencher une seule panne de test.
- [x] Rendre achetables les trois améliorations aux conditions prévues.
- [x] Ajouter marche/arrêt du Doigt mécanique.
- [x] Ajouter la Décharge x10.
- [x] Ajouter le service d'usine.
- [x] Sauvegarder, charger, exporter et importer.

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
- [x] Les billes et la production continuent pendant la navigation et les achats.
- [x] Des clics rapides entre les vues ne lancent pas de bille accidentellement.
- [x] Le retour direct et le mode de mouvement réduit fonctionnent.

## 5. À faire par le créateur — essai
- [ ] Suivre les commandes fournies pour lancer localhost.
- [ ] Jouer 10 à 15 minutes.
- [ ] Vérifier que les gains et les boutons sont compréhensibles.
- [ ] Regarder si les rebonds et les arrivées semblent crédibles.
- [ ] Noter délai avant réparation et automatisation.
- [ ] Signaler attentes, répétitions, bugs et passages trop faciles.
- [ ] Décrire les changements visuels souhaités.
- [ ] Transmettre les retours pour la prochaine itération.

## 6. Après validation
Corriger la boucle avant d'ajouter chalet complet, prologue, autres personnages ou recalibrage.
Le dépôt distant est configuré sur https://github.com/clementLQR/MasterPlinko.git. Aucun commit ni push sans demande explicite.

## Vérifications exécutées
- `npm run build` : contrôle TypeScript et build de production réussis.
- `npm test` : 19 tests de logique réussis (économie, transactions, refus, temps actif, sauvegarde, imports, tirage, trajectoires et navigation).
- `npm run test:browser` : 8 parcours Chrome réussis, dont reprise d’un vol sans second paiement, import confirmé, atelier, salaire unique, concurrence entre onglets, navigation, mouvement réduit et échec de stockage sans débit.
- Les 15 sorties sont vérifiées par échantillonnage des trajectoires, avec une distance aux picots supérieure au rayon cumulé bille/picot.
- Captures inspectées pour la machine à 1280 × 720 et l’établi ; correction du chevauchement des panneaux et amélioration des étiquettes de sortie.
- Scénario de 50 billes réellement rendues et réglées : réussi. La mesure brute était d’environ 2 images/s avec rendu logiciel forcé sur une surface de 1440 × 1000, incluant le démarrage du rendu. Cette mesure ne valide pas la fluidité sur GPU réel ; le réglage de qualité légère est disponible et l’essai sur la machine du créateur reste nécessaire.
- Pause en onglet inactif : logique vérifiée par horloge inactive injectée ; une session réelle d’onglet masqué et la partie utilisateur de 10 à 15 minutes restent à observer.
- Les captures et rapports sont dans `test-results/`, ignoré par Git. Aucun commit, push ou déploiement effectué.
