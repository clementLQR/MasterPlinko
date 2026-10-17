import { CONFIG, EXITS, UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import type { Ball, GameState } from '../game/state';

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Sauvegarde invalide : ${message}`);
}
const integer = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateBall(value: unknown, nextSequence: number, history: boolean): asserts value is Ball {
  requireValid(object(value), 'bille manquante.');
  requireValid(integer(value.sequence, 1, nextSequence - 1) && value.id === `ball-${value.sequence}`, 'identifiant de bille.');
  requireValid(value.origin === 'manual' || value.origin === 'auto', 'origine de bille.');
  requireValid(integer(value.betCents, 0, CONFIG.maxBet) && integer(value.baseCents, 100, CONFIG.maxBet), 'mise ou base.');
  requireValid(value.origin === 'auto' ? value.betCents === 0 && value.baseCents === 100 : value.betCents >= 100 && value.betCents % 100 === 0 && value.baseCents === value.betCents, 'cohérence de la mise.');
  requireValid(integer(value.exit, 0, 14) && value.multiplier === EXITS[value.exit], 'sortie et multiplicateur.');
  requireValid(value.bonus === 1 || value.bonus === 10, 'facteur de Décharge.');
  requireValid(integer(value.returnCents) && value.returnCents === Math.round(value.baseCents * (value.multiplier as number) / 100) * value.bonus, 'retour figé.');
  if (history) requireValid(value.netCents === value.returnCents - value.betCents, 'bénéfice net.');
}

export function parseSnapshot(raw: string): GameState {
  requireValid(raw.length <= 2_000_000, 'fichier trop volumineux.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Le fichier ne contient pas un JSON valide.'); }
  requireValid(object(value), 'snapshot manquant.');
  requireValid(value.saveVersion === 1, 'format non pris en charge. Votre partie actuelle est conservée.');
  requireValid(value.profile === 'prototype', 'configuration inconnue.');
  requireValid(integer(value.walletCents), 'solde.');
  requireValid(integer(value.selectedBetCents, 100, 1000) && value.selectedBetCents % 100 === 0, 'mise sélectionnée.');
  requireValid(integer(value.nextBallSequence, 1), 'séquence.');
  requireValid(Array.isArray(value.pendingBalls) && value.pendingBalls.length <= CONFIG.maxBalls, 'nombre de billes.');
  requireValid(Array.isArray(value.history) && value.history.length <= CONFIG.historyLimit, 'historique.');
  for (const ball of value.pendingBalls) validateBall(ball, value.nextBallSequence, false);
  for (const ball of value.history) validateBall(ball, value.nextBallSequence, true);
  const balls = [...value.pendingBalls, ...value.history] as Ball[];
  requireValid(new Set(balls.map(ball => ball.id)).size === balls.length, 'bille dupliquée.');
  requireValid(Array.isArray(value.upgrades) && value.upgrades.every(id => typeof id === 'string' && Object.hasOwn(UPGRADES, id)) && new Set(value.upgrades).size === value.upgrades.length, 'améliorations.');
  requireValid(typeof value.repairTriggered === 'boolean' && typeof value.repairPurchased === 'boolean', 'état de réparation.');
  requireValid(value.repairPurchased === value.upgrades.includes('azur.initial_repair') && (!value.repairPurchased || value.repairTriggered), 'réparation incohérente.');
  requireValid(value.repairPurchased || value.upgrades.length === 0, 'atelier verrouillé.');
  requireValid(!balls.some(ball => ball.origin === 'auto') || value.upgrades.includes('azur.auto_launcher'), 'automatisation non achetée.');
  requireValid(integer(value.heatCount, 0, CONFIG.chargeCount) && typeof value.chargeReady === 'boolean' && value.chargeReady === (value.heatCount === CONFIG.chargeCount), 'charge.');
  requireValid(integer(value.bonusRemainingMs, 0, CONFIG.bonusDuration) && integer(value.factoryRemainingMs, 0, CONFIG.factoryDuration) && integer(value.manualCooldownMs, 0, CONFIG.manualInterval), 'durées actives.');
  requireValid(value.bonusRemainingMs === 0 || (!value.chargeReady && value.heatCount === 0), 'charge pendant Décharge.');
  requireValid(value.factoryRemainingMs === 0 || value.pendingBalls.length === 0, 'billes pendant le service.');
  requireValid(object(value.stats), 'statistiques.');
  const stats = value.stats;
  for (const key of ['launched', 'settled', 'paidBets', 'grossReturns', 'freeProduction', 'factoryIncome', 'upgradeExpenses']) requireValid(integer(stats[key]), `statistique ${key}.`);
  requireValid(integer(stats.paidProfit, -Number.MAX_SAFE_INTEGER), 'bénéfice cumulé.');
  const s = value as unknown as GameState;
  requireValid(s.stats.launched === s.nextBallSequence - 1 && s.stats.settled === s.stats.launched - s.pendingBalls.length, 'compteurs de billes.');
  requireValid(s.history.length === Math.min(CONFIG.historyLimit, s.stats.settled), 'taille de l’historique.');
  requireValid(s.walletCents === CONFIG.initialWallet + s.stats.grossReturns + s.stats.factoryIncome - s.stats.paidBets - s.stats.upgradeExpenses, 'bilan du solde.');
  const pendingBets = s.pendingBalls.reduce((sum, ball) => sum + ball.betCents, 0);
  requireValid(s.stats.paidBets >= pendingBets && s.stats.freeProduction <= s.stats.grossReturns && s.stats.paidProfit === s.stats.grossReturns - s.stats.freeProduction - (s.stats.paidBets - pendingBets), 'bilan des retours.');
  requireValid(s.stats.upgradeExpenses === s.upgrades.reduce((sum, id: UpgradeId) => sum + UPGRADES[id].price, 0), 'dépenses d’atelier.');
  requireValid(s.repairTriggered === (s.stats.grossReturns >= CONFIG.repairThreshold), 'seuil de panne.');
  requireValid(s.stats.factoryIncome % CONFIG.factorySalary === 0, 'salaires.');
  requireValid(s.history.reduce((sum, ball) => sum + ball.returnCents, 0) <= s.stats.grossReturns, 'retours de l’historique.');
  requireValid(object(value.preferences) && typeof value.preferences.sound === 'boolean' && typeof value.preferences.reducedMotion === 'boolean' && ['normal', 'low'].includes(value.preferences.quality as string), 'préférences.');
  requireValid(typeof value.savedAt === 'string' && value.savedAt.length <= 40 && Number.isFinite(Date.parse(value.savedAt)), 'date.');
  return structuredClone(s);
}

export function writeSnapshot(state: GameState): void {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
}
