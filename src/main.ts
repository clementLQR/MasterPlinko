import './style.css';
import { CONFIG, VIEWS } from './config';
import { Game, reconcile } from './game/engine';
import { newGame } from './game/state';
import type { GameState } from './game/state';
import { parseSnapshot, writeSnapshot } from './persistence/snapshot';
import { claimWriter } from './persistence/ownership';
import { PlinkoScene } from './rendering/scene';
import { FactoryWork } from './rendering/factory';
import type { AzurShop } from './rendering/shop';
import { layout } from './ui/layout';
import { Sound } from './ui/sound';
import { Departure, Navigation } from './navigation/camera';
import type { View } from './navigation/camera';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = layout();
const element = document.getElementById('scene')!;
const input = document.getElementById('import-file')! as HTMLInputElement;
const status = document.getElementById('accessibility-status')!;
const money = (n: number) => (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Prêts d’essai DEV uniquement ; les modules réellement achetés fonctionnent aussi en production.
const gameOptions = { magnetsTrial: import.meta.env.DEV && import.meta.env.VITE_MAGNETS_TRIAL === '1', collectorTrial: import.meta.env.DEV && import.meta.env.VITE_COLLECTOR_TRIAL === '1' };
let game = new Game(newGame(), writeSnapshot, Math.random, gameOptions);
let scene: PlinkoScene | undefined;
let factory: FactoryWork | undefined;
let shop: AzurShop | undefined;
let shopLoading = false;
let outsidePhase = '';
let bootProblem = '', invalidRaw = '', renderingError = '', message = '';
let awaitingImport: GameState | undefined;
let awaitingDelete = false;
let importing = false, importGeneration = 0;
let acquired = false, waiting = false;
let loaded = false;
let historyPage = 0;
const sound = new Sound();
const navigation = new Navigation();
const departure = new Departure();
const fade = document.getElementById('departure-fade')!;
const outside = document.getElementById('outside')! as HTMLDialogElement;
const destinations = document.getElementById('destinations')!;
const service = document.getElementById('factory-service')!;
const outsideMessage = document.getElementById('outside-message')!;
outside.addEventListener('cancel', event => { event.preventDefault(); if (departure.phase === 'shop') shop?.back(); else returnToCave(); });
outside.addEventListener('click', event => {
  const command = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-destination]')?.dataset.destination;
  if (command === 'return') returnToCave();
  else if (command === 'azur' && game.writable && !game.error && !document.hidden && departure.visitAzur(game.state.repairTriggered)) {
    message = ''; shop?.reset(); render();
  }
  else if (command === 'work' && departure.phase === 'destinations') {
    message = '';
    if (game.startFactory()) { factory?.reset(); departure.work(); }
    render();
  } else if (command === 'retry') { game.retrySave(); render(); }
  else if (command === 'export') exportSave();
});

function leaveCave() {
  if (!departure.inCave || navigation.moving || awaitingImport || importing || awaitingDelete || !scene) return;
  if (navigation.target !== 'plinko') { navigate('plinko'); return; }
  if (!game.writable || game.error || bootProblem || document.hidden) return;
  // Le Doigt s’arrête de lui-même ; les billes en vol finissent leur chute pendant la montée.
  game.stopAuto();
  if (departure.begin(scene.cameraPose(), game.state.preferences.reducedMotion)) { message = ''; scene.clearFocus(); render(); }
}
function returnToCave() {
  if (departure.phase !== 'destinations' || !scene) return;
  game.stopAuto(); navigation.go('plinko', true); scene.setDeparture(false);
  departure.returnToCave(scene.cameraPose(), game.state.preferences.reducedMotion);
  message = ''; render();
}
function resumeLocation() {
  factory?.reset();
  shop?.reset();
  scene?.resetFlights();
  departure.reset(); scene?.setDeparture(true); navigation.go('plinko', true);
  if (game.state.factoryRemainingMs > 0) departure.resumeService();
}

function navigate(view: View) {
  if (!departure.inCave) return;
  if (awaitingDelete && view !== 'reglages') { message = 'Confirmez ou annulez la suppression sur le boîtier.'; render(); return; }
  if ((awaitingImport || importing) && view !== 'reglages') { message = 'Terminez ou annulez l’import sur le boîtier.'; return; }
  if (view === 'historique' && !game.state.upgrades.includes('azur.accounting_tray')) { message = 'Le Bac comptable s’achète chez Azur ; il est installé dès l’achat.'; return; }
  if (view === 'collecteur' && !game.collectorAvailable) return;
  scene?.clearFocus();
  navigation.go(view, game.state.preferences.reducedMotion); render();
}
// Aucune image avant la préparation des shaders (scene.prepare après lecture de la sauvegarde).
try { scene = new PlinkoScene(element, navigation, action, variant => sound.contact(variant, game.state.preferences.sound), true); }
catch (error) {
  console.error(error);
  renderingError = 'Le rendu 3D est indisponible. Activez l’accélération graphique du navigateur, puis rechargez la page.';
  const explanation = document.createElement('p'); explanation.className = 'render-error'; explanation.textContent = renderingError; element.append(explanation);
}
async function load() {
  loaded = false;
  waiting = false; awaitingImport = undefined; importing = false; awaitingDelete = false; importGeneration++;
  try {
    const raw = localStorage.getItem(CONFIG.saveKey); invalidRaw = raw ?? '';
    const loaded = raw === null ? newGame() : parseSnapshot(raw);
    if (raw === null) loaded.preferences.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resume = reconcile(loaded), next = new Game(resume.state, writeSnapshot, Math.random, gameOptions);
    next.writable = true;
    if (!next.retrySave()) throw new Error(next.error);
    game = next; bootProblem = ''; invalidRaw = ''; message = '';
    scene?.prepare(game.state.preferences.quality);
    resumeLocation();
    if (resume.count) game.notice = `Reprise : ${resume.count} bille(s) réglée(s), +${money(resume.total)} pièces.`;
    else if (raw !== null) game.notice = 'Le Doigt mécanique attend votre commande.';
  } catch (error) {
    bootProblem = error instanceof Error ? error.message : 'Lecture de la sauvegarde impossible.';
    game.writable = false; navigation.go('reglages', true);
    scene?.prepare(game.state.preferences.quality);
  }
  loaded = true; render();
}
void claimWriter(async () => { acquired = true; await load(); }, () => {
  waiting = true; game.writable = false; navigation.go('reglages', true); scene?.prepare(game.state.preferences.quality); render();
}).catch(error => { bootProblem = error.message; navigation.go('reglages', true); scene?.prepare(game.state.preferences.quality); render(); });

function render() {
  const info = awaitingDelete ? game.error || message || 'Supprimer la sauvegarde ? La progression sera effacée. Confirmez ou annulez sur le boîtier.' : awaitingImport ? `Fichier validé : ${money(awaitingImport.walletCents)} pièces. Remplacer la partie ? Confirmer ou annuler sur le boîtier.` : waiting ? 'Partie déjà ouverte ailleurs. Fermez l’autre onglet pour jouer ici.' : bootProblem ? message || `${bootProblem} Données conservées. Exportez-les ou importez un fichier valide.` : game.error || message || game.notice;
  scene?.setInterface({ canWrite: game.writable && !game.error && !bootProblem && !renderingError, canManageSave: acquired && !waiting, recovery: !!(bootProblem || game.error), confirmDelete: awaitingDelete, importing, autoEnabled: game.autoEnabled, magnetsAvailable: game.magnetsAvailable, collectorAvailable: game.collectorAvailable, message: info, historyPage, importWallet: awaitingImport?.walletCents });
  document.getElementById('app')!.dataset.view = navigation.target;
  document.getElementById('app')!.dataset.moving = String(navigation.moving);
  document.getElementById('app')!.dataset.departure = departure.phase;
  scene?.setDeparture(departure.inCave, departure.camera);
  element.inert = !departure.inCave;
  fade.hidden = departure.inCave; fade.style.opacity = String(departure.opacity);
  const working = departure.phase === 'working';
  const shopping = departure.phase === 'shop';
  const changed = outsidePhase !== departure.phase; outsidePhase = departure.phase;
  destinations.hidden = working || shopping; service.hidden = !working;
  document.getElementById('shop-visit')!.hidden = !shopping;
  outside.querySelector<HTMLButtonElement>('[data-destination="azur"]')!.hidden = !game.state.repairTriggered;
  outside.dataset.working = String(working);
  outside.dataset.shop = String(shopping);
  document.getElementById('outside-title')!.classList.toggle('sr-only', working || shopping);
  document.getElementById('outside-title')!.textContent = working ? 'À l’usine' : shopping ? 'Boutique d’Azur' : 'Où aller ?';
  const outsideInfo = game.error || message;
  if (outsideMessage.textContent !== outsideInfo) outsideMessage.textContent = outsideInfo;
  document.getElementById('factory-time')!.textContent = `${Math.ceil(game.state.factoryRemainingMs / 1000)} s restantes`;
  document.getElementById('outside-recovery')!.hidden = !game.error;
  if (departure.opaque && !outside.open) outside.showModal();
  else if (!departure.opaque && outside.open) outside.close();
  if (working && !factory) factory = new FactoryWork(document.getElementById('factory-scene')!, text => { document.getElementById('factory-status')!.textContent = text; }, id => {
    if (departure.phase !== 'working' || document.hidden) return false;
    return game.hitFactoryBall(id);
  });
  factory?.setActive(working && game.state.factoryRemainingMs > 0 && !document.hidden && game.writable && !game.error && !bootProblem && !renderingError);
  if (shopping && !shop && !shopLoading) {
    shopLoading = true;
    void import('./rendering/shop').then(({ AzurShop }) => {
      shop = new AzurShop(document.getElementById('shop-scene')!, text => { document.getElementById('shop-status')!.textContent = text; }, home => {
        departure.finishVisit(); message = '';
        // Depuis l’atelier : retour direct à la cave, sans repasser par la boutique ni la liste.
        if (home) returnToCave(); else render();
      }, id => {
        if (departure.phase !== 'shop' || document.hidden || bootProblem) return false;
        const bought = game.buyPlan(id);
        if (bought) { sound.unlock(game.state.preferences.sound); sound.play('purchase', game.state.preferences.sound); }
        render(); return bought;
      });
      shop.reset();
      if (departure.phase === 'shop') shop.focusCanvas();
    }).catch(error => {
      message = `Boutique indisponible : ${error instanceof Error ? error.message : 'erreur de rendu'}. Partie conservée.`;
      departure.finishVisit(); render();
    }).finally(() => { shopLoading = false; });
  }
  shop?.setPrivateAccess(game.state.repairPurchased);
  shop?.setPurchaseState(game.state, game.writable && !game.error && !bootProblem);
  shop?.setActive(shopping && !document.hidden, game.state.preferences);
  if (departure.opaque && changed) {
    if (working) factory?.focusCanvas();
    else if (shopping) shop?.focusCanvas();
    else destinations.querySelector('button')?.focus();
  }
  element.dataset.state = waiting ? 'waiting' : bootProblem || game.error ? 'suspended' : loaded ? 'ready' : 'loading';
  if (!element.dataset.focusedAction && status.textContent !== info) status.textContent = info;
}
function exportSave() {
  const raw = invalidRaw || JSON.stringify(game.state, null, 2);
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'masterplinko-sauvegarde.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message = 'Export téléchargé. La partie locale reste conservée.';
}
function action(command: string) {
  if (!departure.inCave) return;
  if (awaitingDelete && !['confirm-delete', 'cancel-delete', 'export'].includes(command)) return;
  if (command === 'sorties') { leaveCave(); return; }
  if (command === 'magnets-inspect' && game.magnetsAvailable) { navigate('commandes'); return; }
  if (Object.hasOwn(VIEWS, command)) { navigate(command as View); return; }
  message = '';
  if (command === 'history-prev') historyPage = Math.max(0, historyPage - 1);
  else if (command === 'history-next') historyPage = Math.min(Math.max(0, Math.ceil(game.state.history.length / 7) - 1), historyPage + 1);
  else if (command === 'export') exportSave();
  else if (command === 'delete-save' && acquired && !waiting && !importing && !awaitingImport && !navigation.moving && navigation.target === 'reglages') awaitingDelete = true;
  else if (command === 'cancel-delete') { awaitingDelete = false; message = 'Suppression annulée. Partie actuelle conservée.'; }
  else if (command === 'confirm-delete' && awaitingDelete && acquired && !waiting && !document.hidden) {
    game.writable = true;
    if (game.resetProgress()) {
      awaitingDelete = false; bootProblem = ''; invalidRaw = ''; awaitingImport = undefined;
      importing = false; importGeneration++; input.value = ''; historyPage = 0;
      resumeLocation(); navigation.go('reglages', true); message = game.notice;
    }
  }
  else if (command === 'import') { navigate('reglages'); input.value = ''; input.click(); }
  else if (command === 'cancel-import') { awaitingImport = undefined; importing = false; importGeneration++; input.value = ''; message = 'Import annulé. Partie actuelle conservée.'; }
  else if (command === 'confirm-import' && awaitingImport && acquired) {
    game.error = ''; game.writable = true;
    if (game.replace(awaitingImport)) {
      bootProblem = ''; invalidRaw = ''; awaitingImport = undefined; historyPage = 0;
      message = 'Partie importée. Doigt mécanique arrêté.'; resumeLocation();
    } else { awaitingImport = undefined; message = game.error; }
  } else if (command === 'retry' && acquired && (bootProblem || game.error)) { if (bootProblem) void load(); else if (game.retrySave()) message = 'Sauvegarde écrite. Vous pouvez reprendre.'; }
  else if (!bootProblem && game.writable && !game.error && !awaitingImport) {
    const s = game.state;
    if (command === 'sound') { game.setPreferences({ sound: !s.preferences.sound }); sound.unlock(game.state.preferences.sound); }
    else if (command === 'motion') game.setPreferences({ reducedMotion: !s.preferences.reducedMotion });
    else if (command === 'quality') game.setPreferences({ quality: s.preferences.quality === 'normal' ? 'low' : 'normal' });
    else if (command === 'launch' && navigation.atMachine) {
      sound.unlock(s.preferences.sound); if (game.launch()) sound.play('launch', s.preferences.sound);
    } else if (command === 'bet-down' || command === 'bet-up') {
      if (navigation.atMachine && !s.factoryRemainingMs) game.setBet(s.selectedBetCents + (command === 'bet-up' ? 100 : -100));
    } else if (command === 'auto' && navigation.atMachine) game.toggleAuto();
    else if (command === 'discharge' && navigation.atMachine) game.activateBonus();
  }
  scene?.clearFocus();
  render();
}
input.addEventListener('change', async () => {
  const file = input.files?.[0];
  if (!file) return;
  if (awaitingDelete) { input.value = ''; message = 'Terminez ou annulez la suppression avant un import.'; render(); return; }
  navigate('reglages');
  if (!acquired) { input.value = ''; message = 'Fermez l’autre onglet avant d’importer une partie.'; render(); return; }
  const generation = ++importGeneration;
  importing = true; awaitingImport = undefined; message = 'Lecture du fichier… Échap pour annuler.'; scene?.clearFocus(); render();
  try {
    if (file.size > 2_000_000) throw new Error('Le fichier est trop volumineux.');
    const candidate = parseSnapshot(await file.text());
    if (generation !== importGeneration) return;
    awaitingImport = candidate; message = '';
  } catch (error) {
    if (generation !== importGeneration) return;
    awaitingImport = undefined;
    message = `Import refusé : ${error instanceof Error ? error.message : 'Fichier invalide.'} Partie actuelle intacte.`;
  } finally {
    if (generation === importGeneration) { importing = false; input.value = ''; scene?.clearFocus(); render(); }
  }
});
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if (!departure.inCave) {
    if (event.key === 'Escape') { event.preventDefault(); if (departure.phase === 'shop') shop?.back(); else returnToCave(); }
    // Tabulation et activation restent natives dans le dialogue ; aucun raccourci de cave.
    return;
  }
  const shortcuts: Record<string, View> = { m: 'plinko', c: 'commandes', a: 'azur', r: 'reglages', h: 'historique' };
  if (event.key === 'Escape') {
    event.preventDefault(); if (awaitingDelete) action('cancel-delete'); else if (awaitingImport || importing) action('cancel-import'); else navigate('plinko');
  } else if (key === 's') { event.preventDefault(); leaveCave(); }
  else if (shortcuts[key]) { event.preventDefault(); navigate(shortcuts[key]); }
  else if (event.code === 'Space' && navigation.atMachine) { event.preventDefault(); action('launch'); }
  else if (key === '+' || key === '=') { event.preventDefault(); action('bet-up'); }
  else if (key === '-') { event.preventDefault(); action('bet-down'); }
});

let lastTime = performance.now();
function frame(now: number) {
  const delta = Math.min(1000, Math.max(0, now - lastTime)); lastTime = now;
  const blocking = navigation.target === 'reglages' || navigation.target === 'historique' || !!awaitingImport || importing || awaitingDelete;
  const available = !document.hidden && game.writable && !game.error && !bootProblem && !renderingError;
  const active = available && !blocking && departure.inCave;
  game.advance(delta, departure.phase === 'working' ? available : active, departure.phase === 'working' ? 'factory' : 'all');
  const before = departure.phase;
  if (before === 'working' && game.state.factoryRemainingMs === 0 && (game.state.factory.status !== 'exploded' || factory?.explosionFinished)) {
    departure.finishWork(); message = game.notice;
  }
  // Les trajets restent utilisables pour rejoindre le boîtier après une erreur d’écriture.
  departure.advance(delta, !document.hidden && !renderingError);
  // Arrivée en haut : les billes encore en vol sont réglées avec leur retour figé, sans nouveau hasard.
  if (before === 'ascending' && departure.phase === 'destinations' && game.state.pendingBalls.length) {
    if (game.settleAll()) scene?.resetFlights(); else message = game.error;
  }
  render();
  if (before === 'descending' && departure.inCave) element.querySelector('canvas')?.focus({ preventScroll: true });
  if (!document.hidden && departure.phase === 'working') factory?.frame(game.state, delta, game.state.preferences.reducedMotion, available);
  // Une image lente ne doit jamais sauter une étape visible (porte, étagère, page) : pas plafonné.
  if (!document.hidden && departure.phase === 'shop') shop?.frame(Math.min(delta, 50));
  // Pendant la montée, seules les billes déjà lancées continuent leur chute ; aucun lancement n’a lieu.
  const flying = active || (available && departure.phase === 'ascending');
  if (!document.hidden && !departure.opaque) scene?.frame(game.state, delta, flying, id => {
    const result = game.settle(id); if (result) sound.play('result', game.state.preferences.sound); return !!result;
  });
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { lastTime = performance.now(); if (document.hidden) factory?.setActive(false); });
render(); requestAnimationFrame(frame);
