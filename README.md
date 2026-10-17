# MasterPlinko

La machine de Papy, dans la cave du chalet. Un jeu solo de Plinko avec achats, automatisation et argent fictif, développé avec Vite, TypeScript et Three.js. La machine, l’établi, les matériaux et les sons sont générés par code.

## Lancer le jeu

Prérequis : Node.js 24 ou plus récent, npm et un navigateur de bureau récent avec WebGL et Web Locks (Chrome, Edge, Firefox). Utiliser localhost ; ouvrir directement `index.html` ne suffit pas.

```powershell
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:5173**. Le port est fixe : les sauvegardes du navigateur sont rattachées à cette adresse. `localhost` et `127.0.0.1` ont des espaces de stockage distincts.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

Le build produit `dist/`. L’aperçu de production utilise l’adresse indiquée dans le terminal (habituellement le port 4173, avec sa propre sauvegarde locale).

## Jouer

- Départ : **19,00 pièces** et mise de **1,00**. Les boutons −/+ règlent la mise entière entre 1 et 10.
- **Lancer une bille**, ou **Espace** en vue Plinko, débite la mise. Un intervalle de 0,5 seconde sépare les lancers ; 50 billes simultanées maximum.
- La sortie indique le **retour total** : ×1 rembourse la mise ; ×0,3 rend 30 %. Le bénéfice net est affiché séparément.
- **L’établi d’Azur** se visite avec sa commande directe ou en cliquant sur l’objet 3D. **Échap** revient à la machine ; lorsqu’un dialogue est ouvert, le premier Échap ferme ce dialogue. Une transition dure 0,5 seconde et devient instantanée en mouvement réduit.
- Une panne unique arrive à **50 pièces de retours cumulés du Plinko**. L’établi propose une réparation à **25 pièces** une fois les billes réglées. Il ouvre ensuite le **Doigt mécanique** (40 pièces) et le **Bac comptable** (15 pièces).
- Le Doigt, activé manuellement, produit une bille gratuite de base 1 toutes les 2 secondes. Il continue à l’établi ; la mise sélectionnée n’affecte pas les billes gratuites.
- Après 100 règlements, une **Décharge** peut être activée en vue Plinko : retours ×10 sur les billes lancées pendant 10 secondes actives. Une notification à l’établi permet de revenir directement.
- **Aller travailler** ou la **porte** donne accès à un service de 15 secondes actives pour 15 pièces garanties. Il arrête le Doigt et nécessite zéro bille en cours. L’usine reste disponible pendant la panne.
- La roue des **réglages** permet de couper le son, réduire les animations, alléger le rendu et exporter/importer une partie. Les sons sont désactivés au départ.

La caméra et les achats ne suspendent pas la production. Les dialogues bloquants et les onglets masqués suspendent le jeu. Il n’y a aucun revenu hors ligne. Le Doigt attend toujours une activation explicite après chargement ou import.

## Sauvegarde

Une sauvegarde JSON complète est écrite dans `localStorage` sous `masterplinko.save`, après chaque transaction et environ chaque seconde pour les chronomètres. Les durées sont enregistrées sans anticiper leur progression.

Le résultat et le bonus de chaque bille sont enregistrés au lancement. Après rechargement, les vols sont réglés dans l’ordre avec leur gain enregistré, une seule fois. Un résumé indique le total de reprise. Les 100 derniers résultats sont conservés dès le départ et deviennent consultables après achat du Bac.

L’import valide les données avant de proposer le remplacement. Vous pouvez exporter l’état courant avant de confirmer. Une sauvegarde illisible ou de format incompatible n’est jamais écrasée automatiquement. En cas de stockage indisponible, le jeu est suspendu et propose export et nouvelle tentative. Restaurer volontairement un ancien export restaure cette ancienne progression.

Un seul onglet peut écrire : les autres attendent, puis relisent la partie après fermeture de l’onglet propriétaire. Cette protection évite les duplications accidentelles ; le jeu solo local n’est pas un système anti-triche.

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/config.ts` | Prix, probabilités, délais et cadrages |
| `src/game/` | État sérialisable et transactions indépendantes du rendu |
| `src/navigation/` | Vues et transitions, sans effet économique |
| `src/persistence/` | Validation, sauvegarde et verrouillage entre onglets |
| `src/rendering/` | Cave procédurale et trajectoires compatibles avec les sorties |
| `src/ui/` | Structure de l’interface et sons synthétisés |
| `tests/` | Vérifications de logique et parcours Chrome |
| `doc/` | Conception et spécification prioritaire du jeu |

Les fontes DM Sans et Libre Caslon Display sont fournies localement dans `public/fonts/`, avec leurs licences SIL Open Font License. Aucun service externe n’est requis pour jouer une fois les dépendances installées.

## Vérifications navigateur

```powershell
npm run test:browser
```

Les tests utilisent Google Chrome installé et démarrent temporairement le serveur local s’il est absent. Ils vérifient notamment rechargement pendant un vol, import/export, atelier, usine, concurrence d’onglets, navigation et rendu simultané de 50 billes. Les captures et résultats temporaires se trouvent dans `test-results/`, ignoré par Git. Le rendu logiciel du navigateur de test ne mesure pas les performances d’un GPU réel.

## État et limites

La boucle prévue est implémentée. Le compte rendu des vérifications et les essais restant à réaliser sont dans `doc/07_A_FAIRE_MAINTENANT.md`. L’équilibrage des prix et probabilités reste à évaluer pendant une partie de 10 à 15 minutes par le créateur. Chalet complet, autres personnages, longues cinématiques, recalibrage et synchronisation sont hors du périmètre actuel.

Le dépôt distant est configuré sur https://github.com/clementLQR/MasterPlinko.git. Aucun commit, push ou déploiement n’est effectué sans demande explicite.
