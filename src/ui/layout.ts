export const icons = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m9 3-1 3-3 1-2 4 2 3 1 3 4 2 3-2 3-1 2-4-2-3-1-3-4-2Z"/><circle cx="11.5" cy="11.5" r="3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m14 2-9 12h6l-1 8 9-12h-6Z"/></svg>',
  tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 7a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 6-6l-3 3-3-3 3-3Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h14v18H5zM9 3v18m3-13h4m-4 4h4"/></svg>',
  factory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21V11l6-4v5l6-4v13Zm12 0h6V3h-4v8M6 16h1m4 0h1m5 0h1"/></svg>',
};

export function layout() {
  return `<header class="topbar">
    <a class="brand" href="./" aria-label="MasterPlinko, accueil"><span class="brand-mark" aria-hidden="true">M<span>•</span>P</span><span class="brand-name">MASTERPLINKO<small>LA MACHINE DE PAPY</small></span></a>
    <span class="location"><span class="location-dot"></span> LE CHALET <span>/</span> SOUS-SOL</span>
    <div class="top-actions"><div class="wallet"><span class="eyebrow">VOTRE PETITE FORTUNE</span><strong><span class="coin" aria-hidden="true">P</span> <span id="wallet" data-testid="wallet">19,00</span><span class="unit">pièces</span></strong></div><button id="settings" class="icon-button" aria-label="Réglages et sauvegarde" title="Réglages et sauvegarde">${icons.gear}</button></div>
  </header>
  <main class="workshop">
    <aside class="journal"><div class="eyebrow">LE CARNET D’EWEN <span class="hairline"></span></div>
      <h1>L’héritage a<br>un bouton.</h1><p class="intro">Un chalet. Une cave.<br>Et une très mauvaise idée.</p>
      <div class="paper"><span class="tape" aria-hidden="true"></span><span class="eyebrow">NOTE TROUVÉE SUR LA MACHINE</span><blockquote>« Ne pas appuyer sur Jouer.<br>Même pour voir. »</blockquote><span class="signature">— Papy</span></div>
      <section class="objective"><span class="eyebrow">LA SUITE DES OPÉRATIONS</span><span class="objective-index" aria-hidden="true">↳</span><h2 id="objective-title">Essayer la machine</h2><p id="objective-description">Une bille, juste pour voir. Papy ne le saura probablement pas.</p></section>
      <details class="help"><summary>Le petit mode d’emploi <span>+</span></summary><p>Choisissez une mise et lancez une bille. La sortie indique son retour total : ×1 rembourse la mise, ×0,3 en rend 30 %.</p><p>Sans pièces ? L’usine verse un salaire garanti. Les achats de l’atelier sont uniques.</p><p><kbd>Espace</kbd> lance une bille lorsque vous êtes devant la machine.</p></details>
      <p class="journal-footer">État des lieux :<br><em>« Normalement, ça tient. »</em></p>
    </aside>
    <section class="machine-area" aria-label="Machine de Plinko">
      <div class="machine-heading"><span class="eyebrow">PIÈCE MAÎTRESSE DE LA CAVE</span><span id="machine-status" class="status"><i></i> EN SERVICE</span></div>
      <nav class="view-navigation" aria-label="Vues de la cave"><button id="view-plinko" aria-pressed="true">← La machine</button><button id="view-azur" aria-pressed="false">L’établi d’Azur →</button><button id="stairs">Sortir de la cave ↗</button></nav>
      <div id="scene" class="scene"><div class="scene-vignette"></div><div id="scene-hint" class="scene-hint" hidden></div><div class="plate-stamp">SOUS LE CHALET DE PAPY<br><strong>QUELQUES PIÈCES AU CHAUD.</strong></div><div class="inflight"><span id="ball-count">0</span> / 50 <span>BILLES</span></div></div>
      <div class="controls"><div class="bet-control"><label for="bet-value" class="eyebrow">MISE PAR BILLE</label><div class="stepper"><button id="bet-down" aria-label="Diminuer la mise">−</button><output id="bet-value">1,00</output><button id="bet-up" aria-label="Augmenter la mise">+</button></div></div><button id="launch" class="launch-button">Lancer une bille ${icons.arrow}</button><div class="shortcut"><kbd>ESPACE</kbd><span>ou juste un clic</span></div></div>
      <div class="bench-caption"><span>Les achats se font dans l’atelier. La machine continue son travail.</span><button id="bench-back">← Revenir au Plinko <kbd>ÉCHAP</kbd></button></div>
      <div id="notice" class="notice" role="status" aria-live="polite">La machine vous attend. La prudence aussi.</div>
    </section>
    <aside class="right-column">
      <section class="azur"><div class="section-heading"><div><span class="eyebrow">LE COIN D’AZUR</span><h2>Atelier</h2></div><span id="atelier-badge" class="badge">À DÉCOUVRIR</span></div>
        <p id="azur-text" class="section-intro">On ne répare pas ce qui fonctionne.<br>Pour l’instant, ça fonctionne.</p>
        <button id="visit-azur" class="outline-button">Voir l’établi d’Azur →</button>
        <div id="upgrades"></div>
        <button id="auto" class="auto-button" hidden>Activer le Doigt mécanique</button>
      </section>
      <button id="charge-back" class="outline-button charge-back" hidden>Décharge prête · Revenir au Plinko ←</button>
      <section class="heat"><div class="section-heading"><div><span class="eyebrow">SURCHAUFFE</span><h2>Un peu trop d’énergie.</h2></div><span class="heat-icon">${icons.bolt}</span></div><div class="meter"><span id="heat-fill"></span></div><div class="meter-label"><span id="heat-label">0 / 100 billes</span><span id="bonus-label">×10 · 10 s</span></div><button id="discharge" class="outline-button" disabled>Décharge en préparation</button></section>
      <section class="factory"><div class="factory-title">${icons.factory}<div><h2>Un tour à l’usine</h2><p>15 secondes. 15 pièces. Du concret.</p></div></div><div class="factory-progress" hidden><span id="factory-fill"></span></div><button id="factory" class="outline-button">Aller travailler <span>↗</span></button><p class="factory-note" id="factory-note">Le salaire tombe, même quand les billes non.</p></section>
    </aside>
  </main>
  <footer class="result-bar"><div class="result-title"><span class="eyebrow">DERNIÈRE BILLE</span><strong id="last-multiplier">À vous de jouer.</strong><span id="last-origin">Le bac est encore vide.</span></div><div class="result-number"><span class="eyebrow">RETOUR TOTAL</span><strong id="last-return">—</strong></div><div class="result-number"><span class="eyebrow">BÉNÉFICE NET</span><strong id="last-net">—</strong></div><button id="history" class="history-button">${icons.book}<span>Le carnet des résultats<small id="history-condition">Nécessite le Bac comptable</small></span><span>↗</span></button></footer>
  <div class="bottom-line"><span>LES PIÈCES SONT FICTIVES. LES BRUITS SUSPECTS AUSSI.</span><button id="probabilities">Probabilités & fonctionnement</button><span id="save-status">Sauvegarde locale</span></div>
  <dialog id="menu"><div class="dialog-top"><span class="eyebrow">MASTERPLINKO · LE CARNET</span><button id="close-menu" class="icon-button" aria-label="Fermer">×</button></div><div id="menu-content"></div></dialog>
  <input id="import-file" type="file" accept=".json,application/json" hidden />`;
}
