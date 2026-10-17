import './style.css';
import { CONFIG, OUTCOMES, UPGRADES } from './config';
import type { UpgradeId } from './config';
import { Game, reconcile } from './game/engine';
import { isBroken, newGame } from './game/state';
import type { GameState } from './game/state';
import { parseSnapshot, writeSnapshot } from './persistence/snapshot';
import { claimWriter } from './persistence/ownership';
import { PlinkoScene } from './rendering/scene';
import { icons, layout } from './ui/layout';
import { Sound } from './ui/sound';
import { Navigation } from './navigation/camera';
import type { View } from './navigation/camera';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = layout();
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const money = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const multiplier = (value: number) => `×${(value / 100).toLocaleString('fr-FR')}`;
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let game = new Game(newGame(), writeSnapshot);
let scene: PlinkoScene | undefined;
let bootProblem = '';
let invalidRaw = '';
let renderingError = '';
let awaitingImport: GameState | undefined;
let acquired = false;
let waiting = false;
const sound = new Sound();
const navigation = new Navigation();
const dialog = get<HTMLDialogElement>('menu');

try { scene = new PlinkoScene(get('scene'), navigation, action => {
  if (action === 'stairs') openDestinations();
  else if (action === 'launch') launch();
  else if (action === 'history') get('history').click();
  else navigate(action);
}); }
catch { renderingError = 'Le rendu 3D est indisponible. Activez l’accélération graphique du navigateur, puis rechargez la page.'; get('scene').insertAdjacentHTML('beforeend', `<p class="render-error">${renderingError}</p>`); }

function openMenu(content: string, blocking = true) {
  if (dialog.open) dialog.close();
  dialog.dataset.mode = blocking ? 'blocking' : 'destinations';
  get('menu-content').innerHTML = content;
  if (blocking) dialog.showModal(); else dialog.show();
  render();
}

async function load() {
  waiting = false;
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    invalidRaw = raw ?? '';
    const loaded = raw === null ? newGame() : parseSnapshot(raw);
    if (raw === null) loaded.preferences.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resume = reconcile(loaded);
    const next = new Game(resume.state, writeSnapshot);
    next.writable = true;
    if (!next.retrySave()) throw new Error(next.error);
    game = next; bootProblem = ''; invalidRaw = '';
    navigation.go('plinko', true);
    if (resume.count > 0) game.notice = `Reprise : ${resume.count} bille${resume.count > 1 ? 's' : ''} réglée${resume.count > 1 ? 's' : ''}, +${money(resume.total)} pièces. Aucun revenu pendant l’absence.`;
    else if (raw !== null) game.notice = 'De retour dans la cave. Le Doigt mécanique attend votre commande.';
  } catch (error) {
    bootProblem = error instanceof Error ? error.message : 'Lecture de la sauvegarde impossible.';
    game.writable = false;
    openMenu(`<h2>La partie attend à l’abri.</h2><p>${escape(bootProblem)}</p><p>La sauvegarde existante est conservée. Vous pouvez l’exporter, réessayer sa lecture ou importer un fichier valide.</p><div class="dialog-actions"><button data-action="export">Exporter les données disponibles</button><button data-action="import">Importer une sauvegarde</button><button data-action="reload">Réessayer la lecture</button></div>`);
  }
  render();
}

void claimWriter(async () => { acquired = true; await load(); }, () => { waiting = true; game.writable = false; render(); }).catch(error => { bootProblem = error.message; render(); });

function disabled(id: string, value: boolean) { get<HTMLButtonElement>(id).disabled = value; }
function render() {
  const s = game.state;
  const blocked = !game.writable || !!game.error || !!bootProblem || !!renderingError;
  const broken = isBroken(s), factory = s.factoryRemainingMs > 0;
  const manualBlocked = blocked || !navigation.atMachine || dialog.open;
  get('app').dataset.view = navigation.target;
  get('app').dataset.moving = String(navigation.moving);
  get('view-plinko').setAttribute('aria-pressed', String(navigation.target === 'plinko'));
  get('view-azur').setAttribute('aria-pressed', String(navigation.target === 'azur'));
  get('wallet').textContent = money(s.walletCents);
  get('bet-value').textContent = money(s.selectedBetCents);
  disabled('bet-down', manualBlocked || factory || s.selectedBetCents === CONFIG.minBet);
  disabled('bet-up', manualBlocked || factory || s.selectedBetCents === CONFIG.maxBet);
  disabled('launch', manualBlocked || broken || factory || s.walletCents < s.selectedBetCents || s.pendingBalls.length >= CONFIG.maxBalls || s.manualCooldownMs > 0);
  get('ball-count').textContent = String(s.pendingBalls.length);
  const status = blocked ? 'EN PAUSE' : factory ? 'SERVICE EN COURS' : broken ? 'EN PANNE' : s.bonusRemainingMs > 0 ? 'DÉCHARGE ACTIVE' : 'EN SERVICE';
  get('machine-status').innerHTML = `<i class="${broken ? 'warning' : ''}"></i> ${status}`;
  get('atelier-badge').textContent = s.repairPurchased ? `${s.upgrades.length} / 3 INSTALLÉS` : broken ? 'AZUR EST LÀ' : 'À DÉCOUVRIR';
  get('azur-text').textContent = broken ? '« C’est réparable. Le prix inclut mon optimisme. » — Azur' : s.repairPurchased ? '« Chaque pièce a son utilité. Même celle qui reste. » — Azur' : 'On ne répare pas ce qui fonctionne. Pour l’instant, ça fonctionne.';
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    const owned = s.upgrades.includes(id), item = UPGRADES[id];
    const condition = id === 'azur.initial_repair' ? broken && s.pendingBalls.length === 0 : s.repairPurchased;
    const button = document.querySelector<HTMLButtonElement>(`[data-buy="${id}"]`)!;
    button.disabled = blocked || navigation.target !== 'azur' || navigation.moving || factory || owned || !condition || s.walletCents < item.price;
    button.textContent = owned ? 'Installé ✓' : !condition ? 'À débloquer' : `${money(item.price)} pièces`;
    button.closest('.upgrade')!.classList.toggle('owned', owned);
  }
  get('auto').hidden = !s.upgrades.includes('azur.auto_launcher');
  get('auto').textContent = game.autoEnabled ? '■ Arrêter le Doigt mécanique' : '▶ Activer le Doigt mécanique';
  get('auto').classList.toggle('running', game.autoEnabled); disabled('auto', blocked || broken || factory);
  get('heat-fill').style.width = `${s.bonusRemainingMs > 0 ? s.bonusRemainingMs / CONFIG.bonusDuration * 100 : s.heatCount}%`;
  get('heat-label').textContent = s.bonusRemainingMs > 0 ? `${(s.bonusRemainingMs / 1000).toFixed(1)} s restantes` : `${s.heatCount} / 100 billes`;
  get('bonus-label').textContent = s.bonusRemainingMs > 0 ? 'RETOURS ×10' : '×10 · 10 s';
  get('discharge').textContent = s.bonusRemainingMs > 0 ? 'Décharge en cours' : s.chargeReady ? 'Activer la Décharge ×10' : 'Décharge en préparation';
  disabled('discharge', manualBlocked || factory || broken || !s.chargeReady || s.bonusRemainingMs > 0);
  get('charge-back').hidden = navigation.target !== 'azur' || !s.chargeReady;
  get('discharge').classList.toggle('ready', s.chargeReady);
  get('factory').innerHTML = factory ? `Service en cours · ${Math.ceil(s.factoryRemainingMs / 1000)} s` : `Choisir une destination <span>↗</span>`;
  disabled('factory', blocked || factory);
  get('factory-note').textContent = factory ? 'Le salaire sera versé à la fin du service.' : s.pendingBalls.length ? 'Arrête le Doigt. Attendez les billes, puis réessayez.' : 'Le salaire tombe, même quand les billes non.';
  get('factory-fill').parentElement!.hidden = !factory;
  get('factory-fill').style.width = `${(1 - s.factoryRemainingMs / CONFIG.factoryDuration) * 100}%`;
  get('history-condition').textContent = s.upgrades.includes('azur.accounting_tray') ? `${s.history.length} résultats conservés` : 'Nécessite le Bac comptable';
  const last = s.history[0];
  get('last-multiplier').textContent = last ? `${multiplier(last.multiplier)}${last.bonus === 10 ? ' · Décharge ×10' : ''}` : 'À vous de jouer.';
  get('last-origin').textContent = last ? `${last.origin === 'manual' ? 'Manuelle' : 'Gratuite'} · Base ${money(last.baseCents)} · Mise ${money(last.betCents)}` : 'Le bac est encore vide.';
  get('last-return').textContent = last ? `${money(last.returnCents)} pièces` : '—';
  get('last-net').textContent = last ? `${last.netCents > 0 ? '+' : ''}${money(last.netCents)}` : '—';
  get('last-net').className = last ? last.netCents >= 0 ? 'positive' : 'negative' : '';
  const objective = !s.stats.launched ? ['Essayer la machine', 'Une bille, juste pour voir. Papy ne le saura probablement pas.'] : !s.repairTriggered ? ['Voir ce qu’elle a dans le ventre', 'Faites tourner la machine. Les bruits sont probablement normaux.'] : !s.repairPurchased ? ['Appeler quelqu’un de compétent', 'Azur demande 25 pièces. L’usine peut financer la réparation.'] : !s.upgrades.includes('azur.auto_launcher') ? ['Se faire remplacer par un doigt', '40 pièces pour automatiser les lancers gratuits. Un investissement très manuel.'] : ['Laisser travailler la mécanique', 'Activez le Doigt, consultez les résultats et préparez une Décharge.'];
  get('objective-title').textContent = objective[0]; get('objective-description').textContent = objective[1];
  get('notice').textContent = renderingError || (waiting ? 'Cette cave est déjà ouverte ailleurs. Cet onglet attend la fermeture de l’autre pour reprendre la partie.' : '') || bootProblem || game.error || game.notice || (s.walletCents < s.selectedBetCents ? 'Fonds insuffisants pour cette mise. Réduisez-la ou faites un service à l’usine.' : 'La machine vous attend. La prudence aussi.');
  get('notice').classList.toggle('notice-warning', blocked || broken);
  get('save-status').textContent = waiting ? 'Onglet en attente' : blocked ? 'Partie suspendue' : '● Sauvegarde locale';
  const work = dialog.querySelector<HTMLButtonElement>('[data-action="work"]');
  if (work) work.disabled = blocked || factory;
}

get('upgrades').innerHTML = (Object.keys(UPGRADES) as UpgradeId[]).map((id, i) => `<article class="upgrade"><div class="upgrade-icon">${[icons.tool, icons.bolt, icons.book][i]}</div><div class="upgrade-info"><h3>${UPGRADES[id].name}</h3><p>${UPGRADES[id].description}</p><button data-buy="${id}" disabled>À débloquer</button></div></article>`).join('');

function navigate(view: View) {
  if (dialog.open) { if (dialog.dataset.mode === 'destinations') dialog.close(); else return; }
  navigation.go(view, game.state.preferences.reducedMotion);
  render();
  scene?.frame(game.state, 0, false, () => false);
}
get('view-plinko').addEventListener('click', () => navigate('plinko'));
get('view-azur').addEventListener('click', () => navigate('azur'));
get('visit-azur').addEventListener('click', () => navigate('azur'));
get('bench-back').addEventListener('click', () => navigate('plinko'));
get('charge-back').addEventListener('click', () => navigate('plinko'));
function openDestinations() {
  if (navigation.moving) return;
  const azur = game.state.repairTriggered ? 'Azur est rencontré. Les visites extérieures ne sont pas encore disponibles.' : 'Disponible après la rencontre d’Azur ; visite extérieure à venir.';
  openMenu(`<span class="eyebrow">AU PIED DE L’ESCALIER</span><h2>Sortir de la cave.</h2><p>La pluie n’a pas l’air pressée de s’arrêter. Où aller ?</p><div class="destinations"><button data-action="work"><strong>Aller travailler à l’usine <span>↗</span></strong><small>15 secondes actives · 15 pièces garanties</small></button><button disabled><strong>Rendre visite à Azur</strong><small>${azur}</small></button><button disabled><strong>Rendre visite à Marceau</strong><small>Rencontre à venir · destination indisponible.</small></button><button disabled><strong>Rendre visite à Matéo</strong><small>Rencontre à venir · destination indisponible.</small></button><button data-action="stay"><strong>Rester dans la cave <span>↙</span></strong><small>On est bien, ici.</small></button></div><p id="destinations-status" role="status">La machine continue de tourner. Seul le choix de l’usine arrête le lanceur ; attendez ensuite les billes avant de partir.</p>`, false);
}
get('stairs').addEventListener('click', openDestinations);
function launch() { if (!navigation.atMachine || dialog.open) return; sound.unlock(); if (game.launch()) sound.play('launch', game.state.preferences.sound); render(); }
get('launch').addEventListener('click', launch);
get('bet-down').addEventListener('click', () => { game.setBet(game.state.selectedBetCents - 100); render(); });
get('bet-up').addEventListener('click', () => { game.setBet(game.state.selectedBetCents + 100); render(); });
get('upgrades').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy]');
  if (!button || navigation.moving || navigation.target !== 'azur') return;
  sound.unlock();
  if (game.buy(button.dataset.buy as UpgradeId)) sound.play('purchase', game.state.preferences.sound);
  render();
});
get('auto').addEventListener('click', () => { game.toggleAuto(); render(); });
get('factory').addEventListener('click', openDestinations);
get('discharge').addEventListener('click', () => { if (navigation.atMachine) game.activateBonus(); render(); });
document.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (event.key === 'Escape' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
    event.preventDefault();
    if (dialog.open) dialog.close(); else navigate('plinko');
    render(); return;
  }
  if (event.code === 'Space' && !event.repeat && !dialog.open && !document.hidden && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SUMMARY', 'A'].includes(target.tagName)) { event.preventDefault(); if (!get<HTMLButtonElement>('launch').disabled) launch(); }
});

get('settings').addEventListener('click', () => {
  const p = game.state.preferences;
  openMenu(`<h2>Les petits réglages.</h2><p>La cave reste à votre goût.</p><label class="setting"><span>Sons de la machine</span><input type="checkbox" id="sound" ${p.sound ? 'checked' : ''}></label><label class="setting"><span>Animations réduites</span><input type="checkbox" id="motion" ${p.reducedMotion ? 'checked' : ''}></label><label class="setting"><span>Qualité légère (sans ombres)</span><input type="checkbox" id="quality" ${p.quality === 'low' ? 'checked' : ''}></label><h3>Votre partie</h3><p>La partie est enregistrée sur ce navigateur. Exportez-la pour la conserver ailleurs. Aucun revenu ne s’accumule pendant l’absence.</p><div class="dialog-actions"><button data-action="export">Exporter la partie</button><button data-action="import">Importer une partie</button>${game.error ? '<button data-action="retry">Réessayer la sauvegarde</button>' : ''}${bootProblem ? '<button data-action="reload">Réessayer la lecture</button>' : ''}</div>`);
});
get('history').addEventListener('click', () => {
  if (!game.state.upgrades.includes('azur.accounting_tray')) {
    openMenu('<h2>Le Bac comptable.</h2><p>Installez le Bac dans l’atelier d’Azur pour consulter les 100 derniers résultats. Ils sont conservés dès votre première bille.</p>'); return;
  }
  const rows = game.state.history.map(r => `<tr><td>${r.origin === 'manual' ? 'Manuelle' : 'Gratuite'}</td><td>${money(r.betCents)}</td><td>${money(r.baseCents)}</td><td>${multiplier(r.multiplier)}</td><td>×${r.bonus}</td><td>${money(r.returnCents)}</td><td class="${r.netCents >= 0 ? 'positive' : 'negative'}">${r.netCents > 0 ? '+' : ''}${money(r.netCents)}</td></tr>`).join('');
  openMenu(`<h2>Le carnet des résultats.</h2><p>Du plus récent au plus ancien. Montants en pièces ; le retour comprend la mise.</p><div class="table-scroll"><table><thead><tr><th>Origine</th><th>Mise</th><th>Base</th><th>Sortie</th><th>Bonus</th><th>Retour</th><th>Net</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Aucune bille réglée.</td></tr>'}</tbody></table></div>`);
});
get('probabilities').addEventListener('click', () => openMenu(`<h2>Un peu de mécanique.</h2><p>La catégorie est tirée au lancement, puis la bille rejoint sa sortie. Pour les sorties doubles, chaque côté a la moitié de la probabilité de sa catégorie.</p><table><thead><tr><th>Retour total</th><th>Probabilité</th></tr></thead><tbody>${OUTCOMES.map(o => `<tr><td>${multiplier(o.multiplier)}</td><td>${(o.weight / 10).toLocaleString('fr-FR')} %</td></tr>`).join('')}</tbody></table><p>Retour moyen théorique hors bonus : 1,06 fois la base. Ce calcul ne garantit aucun gain individuel. Les résultats ne dépendent ni du solde ni des pertes passées.</p>`));
get('close-menu').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => render());
document.addEventListener('pointerdown', event => {
  if (dialog.open && dialog.dataset.mode === 'destinations' && !dialog.contains(event.target as Node)) dialog.close();
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
dialog.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (input.id === 'sound') { sound.unlock(); game.setPreferences({ sound: input.checked }); }
  if (input.id === 'motion') game.setPreferences({ reducedMotion: input.checked });
  if (input.id === 'quality') game.setPreferences({ quality: input.checked ? 'low' : 'normal' });
  render();
});
function exportSave() {
  const raw = invalidRaw || JSON.stringify(game.state, null, 2);
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'masterplinko-sauvegarde.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
dialog.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (action === 'export') exportSave();
  if (action === 'stay') dialog.close();
  if (action === 'work') {
    if (game.startFactory()) dialog.close();
    else { const status = get('destinations-status'); if (status) status.textContent = game.notice || game.error; }
    render();
  }
  if (action === 'import') get<HTMLInputElement>('import-file').click();
  if (action === 'reload' && acquired) { dialog.close(); void load(); }
  if (action === 'retry') { if (game.retrySave()) dialog.close(); render(); }
  if (action === 'confirm-import' && awaitingImport && acquired) {
    const oldError = game.error;
    game.error = ''; game.writable = true;
    if (game.replace(awaitingImport)) { bootProblem = ''; invalidRaw = ''; awaitingImport = undefined; navigation.go('plinko', true); dialog.close(); }
    else game.error ||= oldError;
    render();
  }
});
get<HTMLInputElement>('import-file').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  if (!acquired) { openMenu('<h2>Un onglet à la fois.</h2><p>Fermez l’autre onglet avant d’importer une partie.</p>'); return; }
  try {
    if (file.size > 2_000_000) throw new Error('Le fichier est trop volumineux.');
    awaitingImport = parseSnapshot(await file.text());
    openMenu(`<h2>Remplacer votre partie ?</h2><p>Le fichier est valide. L’import remplacera votre progression par un solde de <strong>${money(awaitingImport.walletCents)} pièces</strong>, puis réglera ses éventuelles billes en cours.</p><p>Vous pouvez d’abord exporter votre partie actuelle. Restaurer une ancienne sauvegarde revient volontairement en arrière.</p><div class="dialog-actions"><button data-action="export">Exporter la partie actuelle</button><button data-action="confirm-import" class="confirm-button">Remplacer et importer</button></div>`);
  } catch (error) {
    awaitingImport = undefined;
    openMenu(`<h2>Import refusé.</h2><p>${escape(error instanceof Error ? error.message : 'Fichier invalide.')}</p><p>Votre partie actuelle est intacte.</p><div class="dialog-actions"><button data-action="import">Choisir un autre fichier</button></div>`);
  }
});

let lastTime = performance.now(), lastRender = 0;
function frame(now: number) {
  const delta = Math.min(1000, Math.max(0, now - lastTime)); lastTime = now;
  const active = !document.hidden && (!dialog.open || dialog.dataset.mode === 'destinations') && game.writable && !game.error && !bootProblem && !renderingError;
  game.advance(delta, active);
  if (!document.hidden) scene?.frame(game.state, delta, active, id => {
    const result = game.settle(id);
    if (result) sound.play('result', game.state.preferences.sound);
    return !!result;
  });
  if (now - lastRender > 100) { render(); lastRender = now; }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
render(); requestAnimationFrame(frame);
