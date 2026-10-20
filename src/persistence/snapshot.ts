import { CONFIG, DOWNLOADS, EXITS, UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import type { Ball, GameState } from '../game/state';
import { factoryClock, factorySpawnTime, newFactory } from '../game/packing';
import type { FactoryEvent } from '../game/packing';
import { installPaidPlans } from '../game/plans';
import { FACTORY_EVENTS } from '../config';

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Sauvegarde invalide : ${message}`);
}
const integer = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateBall(value: unknown, nextSequence: number, history: boolean): asserts value is Ball {
  requireValid(object(value), 'bille manquante.');
  requireValid(integer(value.sequence, 1, nextSequence - 1) && value.id === `ball-${value.sequence}`, 'identifiant de bille.');
  requireValid(value.origin === 'manual' || value.origin === 'auto' || value.origin === 'collector', 'origine de bille.');
  requireValid(integer(value.betCents, 0, CONFIG.maxBet) && integer(value.baseCents, 100, CONFIG.maxBet), 'mise ou base.');
  requireValid(value.origin !== 'manual' ? value.betCents === 0 && value.baseCents === 100 : value.betCents >= 100 && value.betCents % 100 === 0 && value.baseCents === value.betCents, 'cohérence de la mise.');
  if (Object.hasOwn(value, 'collectorEligible')) requireValid(value.collectorEligible === true && value.origin !== 'collector', 'contribution au Collecteur.');
  requireValid(integer(value.exit, 0, 14) && value.multiplier === EXITS[value.exit], 'sortie et multiplicateur.');
  if (Object.hasOwn(value, 'magnetFrom')) requireValid(value.origin === 'auto' && integer(value.magnetFrom, 1, 13) && Math.abs((value.exit as number) - value.magnetFrom) === 1 && (value.multiplier as number) > EXITS[value.magnetFrom], 'attraction magnétique.');
  requireValid(value.bonus === 1 || value.bonus === CONFIG.bonusFactor || value.bonus === 10, 'facteur de Décharge.');
  if (Object.hasOwn(value, 'duplicated')) requireValid(value.duplicated === true && (value.multiplier as number) >= CONFIG.duplicateMinMultiplier, 'duplication.');
  requireValid(integer(value.returnCents) && value.returnCents === Math.round(value.baseCents * (value.multiplier as number) / 100) * value.bonus * (value.duplicated ? 2 : 1), 'retour figé.');
  if (history) requireValid(value.netCents === value.returnCents - value.betCents, 'bénéfice net.');
}

export function parseSnapshot(raw: string): GameState {
  requireValid(raw.length <= 2_000_000, 'fichier trop volumineux.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Le fichier ne contient pas un JSON valide.'); }
  requireValid(object(value), 'snapshot manquant.');
  requireValid([1, 2, 3, 4, 5, 6, 7, 8].includes(value.saveVersion as number), 'format non pris en charge. Votre partie actuelle est conservée.');
  const legacy = value.saveVersion === 1;
  const classic = value.saveVersion === 1 || value.saveVersion === 2;
  const preCollector = (value.saveVersion as number) < 4;
  const beforeModules = (value.saveVersion as number) < 6;
  const beforeCharges = (value.saveVersion as number) < 7;
  const beforeRift = (value.saveVersion as number) < 8;
  if ((value.saveVersion as number) < 5) {
    requireValid(!Object.hasOwn(value, 'plans') || Array.isArray(value.plans) && value.plans.length === 0, 'plans dans un ancien format.');
    value.plans = [];
  }
  requireValid(value.profile === 'prototype', 'configuration inconnue.');
  requireValid(integer(value.walletCents), 'solde.');
  requireValid(integer(value.selectedBetCents, 100, 1000) && value.selectedBetCents % 100 === 0, 'mise sélectionnée.');
  requireValid(integer(value.nextBallSequence, 1), 'séquence.');
  requireValid(Array.isArray(value.pendingBalls) && value.pendingBalls.length <= CONFIG.maxBalls, 'nombre de billes.');
  requireValid(Array.isArray(value.history) && value.history.length <= CONFIG.historyLimit, 'historique.');
  for (const ball of value.pendingBalls) validateBall(ball, value.nextBallSequence, false);
  for (const ball of value.history) validateBall(ball, value.nextBallSequence, true);
  const balls = [...value.pendingBalls, ...value.history] as Ball[];
  if (preCollector) {
    requireValid(balls.every(ball => ball.origin !== 'collector' && !Object.hasOwn(ball, 'collectorEligible')) && (!Object.hasOwn(value, 'collectorCharge') || value.collectorCharge === 0), 'Collecteur dans un ancien format.');
    value.collectorCharge = 0;
  }
  requireValid(integer(value.collectorCharge, 0, CONFIG.collectorThreshold), 'réservoir du Collecteur.');
  requireValid(new Set(balls.map(ball => ball.id)).size === balls.length, 'bille dupliquée.');
  requireValid(Array.isArray(value.upgrades) && value.upgrades.every(id => typeof id === 'string' && Object.hasOwn(UPGRADES, id)) && new Set(value.upgrades).size === value.upgrades.length, 'améliorations.');
  requireValid(Array.isArray(value.plans) && value.plans.every(id => typeof id === 'string' && Object.hasOwn(UPGRADES, id) && !(value.upgrades as string[]).includes(id)) && new Set(value.plans).size === value.plans.length, 'plans.');
  const owned = [...value.upgrades, ...value.plans];
  if (beforeModules) requireValid(!owned.some(id => id === 'azur.magnets' || id === 'azur.collector'), 'nouveaux modules dans un ancien format.');
  if (beforeCharges) requireValid(!owned.some(id => id === 'azur.capacitor' || id === 'azur.gearbox'), 'Condensateur ou Boîte de vitesses dans un ancien format.');
  // Formats 1 à 7 : ni Duplicateur, ni recalibrage, ni téléchargement ; la mise choisie devient la mise mémorisée.
  const riftStats = ['recalibrationWithdrawn', 'discardedUpgrades', 'downloadExpenses'];
  if (beforeRift) {
    requireValid(!owned.includes('azur.duplicator') && !balls.some(ball => Object.hasOwn(ball, 'duplicated')), 'Duplicateur dans un ancien format.');
    requireValid(!['recalibrations', 'instabilityBaseCents', 'downloads', 'preferredBetCents'].some(key => Object.hasOwn(value, key)), 'recalibrage dans un ancien format.');
    value.recalibrations = 0; value.instabilityBaseCents = 0; value.downloads = []; value.preferredBetCents = value.selectedBetCents;
    if (object(value.stats)) { const old = value.stats; requireValid(!riftStats.some(key => Object.hasOwn(old, key)), 'recalibrage dans un ancien format.'); for (const key of riftStats) old[key] = 0; }
  }
  requireValid(integer(value.recalibrations), 'recalibrages.');
  requireValid(Array.isArray(value.downloads) && value.downloads.every(id => typeof id === 'string' && Object.hasOwn(DOWNLOADS, id)) && new Set(value.downloads).size === value.downloads.length && (value.downloads.length === 0 || value.recalibrations > 0), 'téléchargements.');
  requireValid(integer(value.preferredBetCents, CONFIG.minBet, CONFIG.maxBet) && value.preferredBetCents % 100 === 0, 'mise mémorisée.');
  requireValid(!owned.includes('azur.magnets') || value.upgrades.includes('azur.auto_launcher'), 'aimants sans Doigt installé.');
  requireValid(!owned.includes('azur.gearbox') || value.upgrades.includes('azur.auto_launcher'), 'Boîte de vitesses sans Doigt installé.');
  requireValid(typeof value.repairTriggered === 'boolean' && typeof value.repairPurchased === 'boolean', 'état de réparation.');
  requireValid(value.repairPurchased === value.upgrades.includes('azur.initial_repair') && (!value.repairPurchased || value.repairTriggered), 'réparation incohérente.');
  requireValid(value.repairPurchased || value.upgrades.length === 0, 'atelier verrouillé.');
  requireValid((value.repairPurchased || value.plans.every(id => id === 'azur.initial_repair')) && (value.repairTriggered || value.plans.length === 0), 'plans avant déblocage.');
  requireValid(value.repairPurchased || (value.collectorCharge === 0 && !balls.some(ball => ball.origin === 'collector' || ball.collectorEligible)), 'Collecteur avant réparation.');
  requireValid(!balls.some(ball => ball.origin === 'auto') || value.upgrades.includes('azur.auto_launcher'), 'automatisation non achetée.');
  // Formats 1 à 6 : une charge au plus, `chargeReady` vrai exactement quand la jauge est pleine.
  if (beforeCharges) {
    requireValid(integer(value.heatCount, 0, CONFIG.chargeCount) && typeof value.chargeReady === 'boolean' && value.chargeReady === (value.heatCount === CONFIG.chargeCount), 'charge.');
    requireValid(value.bonusRemainingMs === 0 || (!value.chargeReady && value.heatCount === 0), 'charge pendant Décharge.');
    requireValid(!Object.hasOwn(value, 'charges') && !Object.hasOwn(value, 'gearMode'), 'Condensateur ou Boîte de vitesses dans un ancien format.');
    value.charges = value.chargeReady ? 1 : 0;
    if (value.chargeReady) value.heatCount = 0;
    delete value.chargeReady; value.gearMode = 'steady';
  }
  requireValid(!Object.hasOwn(value, 'chargeReady'), 'ancien champ de charge.');
  const capacity = (value.upgrades as string[]).includes('azur.capacitor') ? CONFIG.capacitorCharges : 1;
  const heatMax = ((value.downloads as string[]).includes('download.fast_heat') ? CONFIG.fastHeatCount : CONFIG.chargeCount) - 1;
  requireValid(integer(value.heatCount, 0, heatMax) && integer(value.charges, 0, capacity) && (value.charges < capacity || value.heatCount === 0), 'charge.');
  requireValid(value.gearMode === 'steady' || (value.gearMode === 'burst' && (value.upgrades as string[]).includes('azur.gearbox')), 'rythme du Doigt.');
  requireValid(integer(value.bonusRemainingMs, 0, CONFIG.bonusDuration) && integer(value.factoryRemainingMs, 0, legacy ? 15000 : CONFIG.factoryDuration) && integer(value.manualCooldownMs, 0, CONFIG.manualInterval), 'durées actives.');
  // Extension additive : les anciens formats 1/2/3 commencent avec une recharge complète.
  if (!Object.hasOwn(value, 'magnetCooldownMs')) value.magnetCooldownMs = CONFIG.magnetRecharge;
  requireValid(integer(value.magnetCooldownMs, 0, CONFIG.magnetRecharge), 'recharge des aimants.');
  // Pendant un bonus, la charge utilisée laisse toujours une place ; sans Condensateur, jauge à zéro.
  requireValid(value.bonusRemainingMs === 0 || (value.charges < capacity && (capacity > 1 || value.heatCount === 0)), 'charge pendant Décharge.');
  requireValid(value.factoryRemainingMs === 0 || value.pendingBalls.length === 0, 'billes pendant le service.');
  requireValid(object(value.stats), 'statistiques.');
  const stats = value.stats;
  for (const key of ['launched', 'settled', 'paidBets', 'grossReturns', 'freeProduction', 'factoryIncome', 'upgradeExpenses', 'discardedUpgrades', 'downloadExpenses']) requireValid(integer(stats[key]), `statistique ${key}.`);
  requireValid(integer(stats.recalibrationWithdrawn, -Number.MAX_SAFE_INTEGER), 'solde des recalibrages.');
  requireValid(value.recalibrations > 0 || (stats.recalibrationWithdrawn === 0 && stats.discardedUpgrades === 0), 'recalibrage sans trace.');
  requireValid(integer(value.instabilityBaseCents, 0, stats.grossReturns as number), 'faille.');
  requireValid(integer(stats.paidProfit, -Number.MAX_SAFE_INTEGER), 'bénéfice cumulé.');
  if (legacy) {
    requireValid((stats.factoryIncome as number) % 1500 === 0, 'anciens salaires.');
    value.factory = { ...newFactory(), status: value.factoryRemainingMs > 0 ? 'active' : 'idle', legacy: value.factoryRemainingMs > 0 };
  }
  requireValid(object(value.factory), 'service d’usine manquant.');
  const f = value.factory;
  if (classic && !legacy) {
    requireValid(!Object.hasOwn(f, 'events'), 'événements dans un ancien format.');
    f.events = [];
  }
  value.saveVersion = 8;
  requireValid(Array.isArray(f.events) && (f.events.length === 0 || f.events.length === 3), 'programme des événements.');
  for (let index = 0; index < f.events.length; index++) {
    const event = f.events[index];
    requireValid(object(event) && typeof event.kind === 'string' && Object.hasOwn(FACTORY_EVENTS, event.kind) && integer(event.startsAtMs, 10000 + index * 16000, 14000 + index * 16000), 'événement d’usine.');
  }
  const events = f.events as FactoryEvent[];
  requireValid(new Set(events.map(event => event.kind)).size === events.length, 'événement dupliqué.');
  requireValid(['idle', 'active', 'success', 'exploded'].includes(f.status as string) && typeof f.legacy === 'boolean', 'état du service.');
  const maxArrivals = Math.floor(CONFIG.factoryDuration * (classic ? 1 : 2) / CONFIG.factorySpawnInterval) + 1;
  requireValid(integer(f.nextId, 1, maxArrivals + 1) && integer(f.greyHits, 0, f.nextId - 1) && typeof f.spawnInMs === 'number' && integer(f.spawnInMs * 2, 0, CONFIG.factorySpawnInterval * 2), 'compteurs du service.');
  requireValid(Array.isArray(f.balls) && f.balls.length <= Math.ceil(CONFIG.factoryTravelDuration / CONFIG.factorySpawnInterval * (classic ? 1 : 2)), 'billes d’usine.');
  requireValid((f.status === 'active') === (value.factoryRemainingMs > 0), 'durée et état du service.');
  const elapsed = CONFIG.factoryDuration - value.factoryRemainingMs;
  const produced = factoryClock(events, elapsed, 'supply');
  if (f.legacy) requireValid(events.length === 0 && value.factoryRemainingMs <= 15000 && f.greyHits === 0 && f.nextId === 1 && f.spawnInMs === 0 && f.balls.length === 0 && ['active', 'success'].includes(f.status as string), 'ancien service.');
  else if (f.status === 'active') {
    requireValid(f.nextId === (elapsed === 0 ? 1 : Math.floor(produced / CONFIG.factorySpawnInterval) + 2), 'séquence d’usine.');
    requireValid(f.spawnInMs === (elapsed === 0 ? 0 : (f.nextId - 1) * CONFIG.factorySpawnInterval - produced), 'cadence d’usine.');
  }
  if (f.status !== 'active') requireValid(f.balls.length === 0, 'billes après service.');
  if (f.status === 'idle') requireValid(events.length === 0 && !f.legacy && f.greyHits === 0 && f.nextId === 1 && f.spawnInMs === 0, 'poste au repos.');
  for (const ball of f.balls) {
    requireValid(object(ball) && integer(ball.id, 1, f.nextId - 1) && ['grey', 'red'].includes(ball.kind as string) && integer(ball.lane, 0, 3) && typeof ball.ageMs === 'number' && integer(ball.ageMs * 2, 0, CONFIG.factoryTravelDuration * 2 - 1), 'bille d’usine invalide.');
    requireValid(ball.ageMs === factoryClock(events, elapsed, 'belt') - factoryClock(events, factorySpawnTime(events, ball.id), 'belt'), 'position d’usine.');
  }
  requireValid(new Set(f.balls.map(ball => ball.id)).size === f.balls.length && f.greyHits + f.balls.length <= f.nextId - 1, 'bille d’usine dupliquée.');
  const s = value as unknown as GameState;
  requireValid(s.stats.launched === s.nextBallSequence - 1 && s.stats.settled === s.stats.launched - s.pendingBalls.length, 'compteurs de billes.');
  requireValid(s.history.length === Math.min(CONFIG.historyLimit, s.stats.settled), 'taille de l’historique.');
  requireValid(s.walletCents === CONFIG.initialWallet + s.stats.grossReturns + s.stats.factoryIncome - s.stats.paidBets - s.stats.upgradeExpenses - s.stats.downloadExpenses - s.stats.recalibrationWithdrawn, 'bilan du solde.');
  const pendingBets = s.pendingBalls.reduce((sum, ball) => sum + ball.betCents, 0);
  requireValid(s.stats.paidBets >= pendingBets && s.stats.freeProduction <= s.stats.grossReturns && s.stats.paidProfit === s.stats.grossReturns - s.stats.freeProduction - (s.stats.paidBets - pendingBets), 'bilan des retours.');
  requireValid(s.stats.upgradeExpenses === [...s.upgrades, ...s.plans].reduce((sum, id: UpgradeId) => sum + UPGRADES[id].price, 0) + s.stats.discardedUpgrades, 'dépenses d’atelier.');
  requireValid(s.stats.downloadExpenses === s.downloads.reduce((sum, id) => sum + DOWNLOADS[id].price, 0), 'dépenses de téléchargement.');
  requireValid(s.repairTriggered === (s.stats.grossReturns >= CONFIG.repairThreshold), 'seuil de panne.');
  requireValid(s.stats.factoryIncome % CONFIG.factoryGreyReward === 0, 'salaires.');
  requireValid(s.history.reduce((sum, ball) => sum + ball.returnCents, 0) <= s.stats.grossReturns, 'retours de l’historique.');
  requireValid(object(value.preferences) && typeof value.preferences.sound === 'boolean' && typeof value.preferences.reducedMotion === 'boolean' && ['normal', 'low'].includes(value.preferences.quality as string), 'préférences.');
  requireValid(typeof value.savedAt === 'string' && value.savedAt.length <= 40 && Number.isFinite(Date.parse(value.savedAt)), 'date.');
  const migrated = structuredClone(s);
  installPaidPlans(migrated);
  return migrated;
}

export function writeSnapshot(state: GameState): void {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
}
