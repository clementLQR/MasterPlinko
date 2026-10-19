/** Dans la cave, seul le canevas est visible. Les écrans noirs sont réservés à la sortie. */
export function layout() {
  return `<main id="scene" aria-label="La cave de Papy"></main>
    <div id="departure-fade" hidden aria-hidden="true"></div>
    <dialog id="outside" aria-labelledby="outside-title">
      <div id="shop-visit" hidden>
        <div id="shop-scene"></div>
        <p id="shop-status" class="sr-only" role="status" aria-live="polite"></p>
        <p id="shop-help" class="sr-only">Chez Azur, Tabulation explore les objets ; Entrée ou Espace les active. La porte privée s’ouvre après la réparation initiale achetée. Dans la réserve, la radio commande l’étagère qui dissimule un passage. Sélectionner le passage ouvert pour entrer dans l’atelier. Plinko cassé et prototypes sont décoratifs et n’accordent aucun achat. Échap revient au cadrage précédent, à la réserve puis à la boutique ; depuis l’entrée, il quitte la visite. Les horloges de jeu restent suspendues pendant la visite.</p>
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
