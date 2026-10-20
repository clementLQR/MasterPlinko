/** Dans la cave, seul le canevas est visible. Les écrans noirs sont réservés à la sortie. */
export function layout() {
  return `<main id="scene" aria-label="La cave de Papy"></main>
    <div id="departure-fade" hidden aria-hidden="true"></div>
    <dialog id="outside" aria-labelledby="outside-title">
      <div id="shop-visit" hidden>
        <div id="shop-scene"></div>
        <p id="shop-status" class="sr-only" role="status" aria-live="polite"></p>
        <p id="shop-help" class="sr-only">Chez Azur, Tabulation explore les objets ; Entrée ou Espace les active. Le devis du comptoir vend la réparation à 25 pièces, installée dès le paiement ; la porte privée s’ouvre ensuite. Un clic sur la porte privée lance le trajet automatique : réserve, déverrouillage du passage et entrée dans l’atelier, sans autre action. Le carnet sur le bureau comporte douze doubles pages ; les pages Doigt mécanique, Bac comptable, Aimants et Collecteur de ratés vendent leurs améliorations à 40, 15, 200 et 120 pièces, installées dès l’achat. Les Aimants nécessitent le Doigt. Coins ou flèches gauche/droite pour feuilleter, signet ou Échap pour revenir. Les pages changent immédiatement en mouvement réduit. Les études futures, le Plinko cassé et les prototypes ne débloquent rien. La plaque Maison ou Échap depuis la vue d’ensemble de l’atelier ramène directement à la cave ; la plaque Boutique ramène dans la boutique ; depuis un détail, Échap revient d’abord à la vue d’ensemble. Depuis l’entrée, il quitte la visite. Les horloges de jeu restent suspendues pendant la visite.</p>
      </div>
      <div id="factory-service" hidden>
        <div id="factory-scene"></div>
        <p id="factory-time" class="sr-only" role="timer" aria-label="Temps de travail restant"></p>
        <p id="factory-status" class="sr-only" role="status" aria-live="polite"></p>
        <p id="factory-help" class="sr-only">Service d’une minute. Cliquer les billes grises marquées plus : 0,50 pièce chacune, versée à la fin. Les rouges marquées croix provoquent une explosion et annulent tous les gains du service. Sans grise cliquée, aucun salaire. Des événements annoncés deux secondes avant modifient temporairement le rythme : surcadence, arrivage massif ou ralentissement. Tabulation choisit une bille ; Entrée ou Espace la valide. Le temps et les billes s’arrêtent lorsque l’onglet est masqué.</p>
      </div>
      <div class="outside-content">
        <h1 id="outside-title">Où aller ?</h1>
        <p id="outside-message" role="status"></p>
        <div id="destinations">
          <button type="button" data-destination="work">Aller travailler à l’usine</button>
          <button type="button" data-destination="azur" hidden>Rendre visite à Azur</button>
          <button type="button" data-destination="return">Redescendre dans la cave</button>
        </div>
        <div id="outside-recovery" hidden>
          <button type="button" data-destination="retry">Réessayer la sauvegarde</button>
          <button type="button" data-destination="export">Exporter la partie</button>
        </div>
      </div>
    </dialog>
    <input id="import-file" type="file" accept="application/json,.json" hidden>
    <p id="accessibility-status" class="sr-only" role="status" aria-live="polite"></p>
    <p id="keyboard-help" class="sr-only">Tabulation explore les objets. Entrée active l’objet. M : machine, C : commandes, A : établi, S : sortir depuis la vue Plinko, R : réglages, H : ticket. Échap revient à la machine ou redescend depuis les destinations. Espace lance une bille depuis la machine. Plus et moins modifient la mise.</p>`;
}
