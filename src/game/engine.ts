import { CONFIG, EXITS, UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import { drawOutcome } from './outcomes';
import { magnetExit } from './magnets';
import { purchaseIssue, installationIssue } from './plans';
import type { Random } from './outcomes';
import { isBroken, newGame } from './state';
import { advanceFactory, factoryReward, newFactory, planFactoryEvents } from './packing';
import type { Ball, GameState, Preferences, Result } from './state';

export type Save = (state: GameState) => void;

export function settleInto(state: GameState, id: string): Result | undefined {
  const index = state.pendingBalls.findIndex(ball => ball.id === id);
  if (index === -1) return;
  const [ball] = state.pendingBalls.splice(index, 1);
  const result: Result = { ...ball, netCents: ball.returnCents - ball.betCents };
  state.walletCents += ball.returnCents;
  state.stats.settled++;
  state.stats.grossReturns += ball.returnCents;
  if (ball.origin !== 'manual') state.stats.freeProduction += ball.returnCents;
  else state.stats.paidProfit += result.netCents;
  state.history.unshift(result);
  state.history = state.history.slice(0, CONFIG.historyLimit);
  if (ball.collectorEligible && ball.origin !== 'collector' && ball.multiplier < 100) state.collectorCharge = Math.min(CONFIG.collectorThreshold, state.collectorCharge + 1);
  if (state.bonusRemainingMs === 0 && !state.chargeReady) {
    state.heatCount = Math.min(CONFIG.chargeCount, state.heatCount + 1);
    state.chargeReady = state.heatCount === CONFIG.chargeCount;
  }
  if (!state.repairTriggered && state.stats.grossReturns >= CONFIG.repairThreshold) state.repairTriggered = true;
  return result;
}

export function reconcile(state: GameState): { state: GameState; count: number; total: number } {
  const next = structuredClone(state);
  const balls = [...next.pendingBalls].sort((a, b) => a.sequence - b.sequence);
  for (const ball of balls) settleInto(next, ball.id);
  return { state: next, count: balls.length, total: balls.reduce((sum, ball) => sum + ball.returnCents, 0) };
}

export class Game {
  state: GameState;
  autoEnabled = false;
  error = '';
  notice = '';
  writable = false;
  private autoElapsed = 0;
  private checkpointElapsed = 0;
  private fractionalMs = 0;
  constructor(state: GameState, private save: Save, private random: Random = Math.random, private options: { magnetsTrial?: boolean; collectorTrial?: boolean } = {}) { this.state = structuredClone(state); }
  get magnetsAvailable() { return (this.state.upgrades.includes('azur.magnets') || !!this.options.magnetsTrial) && this.state.repairPurchased && this.state.upgrades.includes('azur.auto_launcher'); }
  get collectorAvailable() { return (this.state.upgrades.includes('azur.collector') || !!this.options.collectorTrial) && this.state.repairPurchased; }

  private available(): boolean { return this.writable && !this.error; }
  private commit(next: GameState): boolean {
    if (!this.available()) return false;
    try {
      if (!Number.isSafeInteger(next.walletCents) || next.walletCents < 0 || Object.values(next.stats).some(value => !Number.isSafeInteger(value))) throw new Error('Limite numérique atteinte.');
      next.savedAt = new Date().toISOString();
      this.save(next);
      this.state = next;
      this.checkpointElapsed = 0;
      return true;
    } catch {
      this.error = 'Sauvegarde impossible. La machine est suspendue. Exportez votre partie, puis réessayez.';
      this.autoEnabled = false;
      return false;
    }
  }

  retrySave(): boolean {
    if (!this.writable) return false;
    this.error = '';
    return this.commit(structuredClone(this.state));
  }

  /** Remplace la progression en une seule écriture ; les préférences restent conservées. */
  resetProgress(): boolean {
    if (!this.writable) return false;
    const next = newGame(); next.preferences = structuredClone(this.state.preferences);
    this.error = '';
    if (!this.commit(next)) return false;
    this.stopAuto(); this.fractionalMs = 0;
    this.notice = 'Sauvegarde supprimée. Nouvelle partie : 19,00 pièces. Réglages conservés.';
    return true;
  }

  launch(origin: Ball['origin'] = 'manual'): Ball | undefined {
    if (!this.available()) return;
    const s = this.state;
    if (isBroken(s)) { this.notice = 'Machine en panne. Azur peut la réparer dans l’atelier.'; return; }
    if (s.factoryRemainingMs > 0) { this.notice = 'Le service d’usine doit être terminé.'; return; }
    if (s.pendingBalls.length >= CONFIG.maxBalls) { this.notice = 'Le plateau est plein : 50 billes. Attendez une arrivée.'; return; }
    if (origin === 'manual' && s.manualCooldownMs > 0) return;
    if (origin === 'auto' && (!this.autoEnabled || !s.upgrades.includes('azur.auto_launcher'))) return;
    if (origin === 'collector' && (!this.collectorAvailable || s.collectorCharge !== CONFIG.collectorThreshold)) return;
    const betCents = origin === 'manual' ? s.selectedBetCents : 0;
    if (s.walletCents < betCents) { this.notice = 'Pas assez de pièces. Un service à l’usine permet de repartir.'; return; }
    const drawn = drawOutcome(this.random);
    const exit = origin === 'auto' && this.magnetsAvailable && s.magnetCooldownMs === 0 ? magnetExit(drawn.exit, this.random) : drawn.exit;
    const multiplier = EXITS[exit];
    const baseCents = origin === 'manual' ? betCents : 100;
    const bonus = s.bonusRemainingMs > 0 ? CONFIG.bonusFactor : 1;
    const ball: Ball = { id: `ball-${s.nextBallSequence}`, sequence: s.nextBallSequence, origin, betCents, baseCents, multiplier, exit, bonus, returnCents: Math.round(baseCents * multiplier / 100) * bonus };
    if (exit !== drawn.exit) ball.magnetFrom = drawn.exit;
    if (origin !== 'collector' && this.collectorAvailable) ball.collectorEligible = true;
    const next = structuredClone(s);
    next.walletCents -= betCents;
    next.nextBallSequence++;
    next.stats.launched++;
    next.stats.paidBets += betCents;
    next.pendingBalls.push(ball);
    if (ball.magnetFrom !== undefined) next.magnetCooldownMs = CONFIG.magnetRecharge;
    if (origin === 'collector') next.collectorCharge = 0;
    if (origin === 'manual') next.manualCooldownMs = CONFIG.manualInterval;
    if (!this.commit(next)) return;
    this.notice = '';
    return ball;
  }

  settle(id: string): Result | undefined {
    if (!this.available() || !this.state.pendingBalls.some(ball => ball.id === id)) return;
    const next = structuredClone(this.state);
    const result = settleInto(next, id);
    if (!this.commit(next)) return;
    if (isBroken(next)) this.autoEnabled = false;
    return result;
  }

  setBet(bet: number): boolean {
    if (!this.available() || !Number.isInteger(bet) || bet < CONFIG.minBet || bet > CONFIG.maxBet || bet % 100 !== 0) return false;
    return this.commit({ ...structuredClone(this.state), selectedBetCents: bet });
  }

  buyPlan(id: UpgradeId): boolean {
    const s = this.state;
    if (!this.available() || s.factoryRemainingMs > 0 || !Object.hasOwn(UPGRADES, id)) return false;
    const issue = purchaseIssue(s, id);
    if (issue) { this.notice = issue; return false; }
    const item = UPGRADES[id];
    if (s.walletCents < item.price) { this.notice = 'Il manque quelques pièces. L’usine reste ouverte.'; return false; }
    const next = structuredClone(s);
    next.walletCents -= item.price;
    next.stats.upgradeExpenses += item.price;
    next.plans.push(id);
    if (!this.commit(next)) return false;
    this.notice = `Plan ${item.name} acheté. De retour dans la cave, utilisez la trappe de montage du Plinko.`;
    return true;
  }

  installPlan(id: UpgradeId): boolean {
    if (!this.available() || !Object.hasOwn(UPGRADES, id)) return false;
    const issue = installationIssue(this.state, id);
    if (issue) { this.notice = issue; return false; }
    const next = structuredClone(this.state);
    next.plans = next.plans.filter(plan => plan !== id);
    next.upgrades.push(id);
    if (id === 'azur.initial_repair') next.repairPurchased = true;
    if (!this.commit(next)) return false;
    this.notice = id === 'azur.initial_repair' ? '« Normalement, ça tient. » — Azur. Machine réparée, atelier privé accessible.' : `${UPGRADES[id].name} installé. Plan utilisé, aucun nouveau débit.`;
    return true;
  }

  toggleAuto(): boolean {
    if (!this.available() || !this.state.upgrades.includes('azur.auto_launcher') || isBroken(this.state) || this.state.factoryRemainingMs > 0) return false;
    this.autoEnabled = !this.autoEnabled;
    this.autoElapsed = 0;
    return true;
  }

  stopAuto(): void { this.autoEnabled = false; this.autoElapsed = 0; }

  startFactory(): boolean {
    this.stopAuto();
    const s = this.state;
    if (!this.available() || s.factoryRemainingMs > 0) return false;
    if (s.pendingBalls.length > 0) { this.notice = 'Automatisation arrêtée. Attendez l’arrivée des billes, puis réessayez.'; return false; }
    const next = structuredClone(s);
    next.factoryRemainingMs = CONFIG.factoryDuration;
    next.factory = { ...newFactory(), status: 'active', events: planFactoryEvents(this.random) };
    if (!this.commit(next)) return false;
    this.notice = 'Une minute. Les grises rapportent ; les rouges font tout sauter.';
    return true;
  }

  hitFactoryBall(id: number): boolean {
    const s = this.state;
    if (!this.available() || s.factoryRemainingMs <= 0 || s.factory.status !== 'active' || s.factory.legacy) return false;
    const ball = s.factory.balls.find(ball => ball.id === id);
    if (!ball) return false;
    const next = structuredClone(s);
    if (ball.kind === 'red') {
      next.factory.status = 'exploded'; next.factoryRemainingMs = 0; next.factory.balls = [];
    } else {
      next.factory.greyHits++;
      next.factory.balls = next.factory.balls.filter(ball => ball.id !== id);
    }
    if (!this.commit(next)) return false;
    this.notice = ball.kind === 'red' ? 'Explosion ! Aucun salaire pour ce service.' : 'Bille grise validée : +0,50 pièce en attente.';
    return true;
  }

  activateBonus(): boolean {
    const s = this.state;
    if (!this.available() || !s.chargeReady || s.bonusRemainingMs > 0 || isBroken(s) || s.factoryRemainingMs > 0) return false;
    const next = structuredClone(s);
    next.chargeReady = false;
    next.heatCount = 0;
    next.bonusRemainingMs = CONFIG.bonusDuration;
    return this.commit(next);
  }

  setPreferences(preferences: Partial<Preferences>): boolean {
    return this.commit({ ...structuredClone(this.state), preferences: { ...this.state.preferences, ...preferences } });
  }

  advance(delta: number, active = true, clock: 'all' | 'factory' = 'all'): void {
    if (!active || !this.available() || delta <= 0 || (clock === 'factory' && this.state.factoryRemainingMs === 0)) return;
    const precise = delta + this.fractionalMs;
    const ms = Math.floor(precise);
    this.fractionalMs = precise - ms;
    const next = structuredClone(this.state);
    if (clock === 'all') next.manualCooldownMs = Math.max(0, next.manualCooldownMs - ms);
    if (next.factoryRemainingMs > 0) {
      advanceFactory(next.factory, Math.min(ms, next.factoryRemainingMs), CONFIG.factoryDuration - next.factoryRemainingMs, this.random);
      next.factoryRemainingMs = Math.max(0, next.factoryRemainingMs - ms);
      if (next.factoryRemainingMs === 0) {
        next.factory.status = 'success'; next.factory.balls = [];
        const reward = factoryReward(next.factory);
        next.walletCents += reward;
        next.stats.factoryIncome += reward;
        if (this.commit(next)) this.notice = reward ? `Service terminé. +${(reward / 100).toFixed(2).replace('.', ',')} pièces.` : 'Service terminé. Aucune bille grise : aucun salaire.';
        return;
      }
    } else {
      next.bonusRemainingMs = Math.max(0, next.bonusRemainingMs - ms);
      if (clock === 'all' && this.autoEnabled && this.magnetsAvailable && !isBroken(next)) next.magnetCooldownMs = Math.max(0, next.magnetCooldownMs - ms);
    }
    this.checkpointElapsed += ms;
    if (this.checkpointElapsed >= 1000 || (this.state.bonusRemainingMs > 0 && next.bonusRemainingMs === 0)) {
      if (!this.commit(next)) return;
    } else this.state = next;
    if (clock === 'all' && this.collectorAvailable && !isBroken(this.state) && this.state.factoryRemainingMs === 0 && this.state.collectorCharge === CONFIG.collectorThreshold && this.state.pendingBalls.length < CONFIG.maxBalls) {
      this.launch('collector');
      if (this.error) return;
    }
    if (clock === 'all' && this.autoEnabled && !isBroken(this.state) && this.state.factoryRemainingMs === 0) {
      this.autoElapsed += ms;
      if (this.autoElapsed >= CONFIG.autoInterval) { this.autoElapsed = 0; this.launch('auto'); }
    }
  }

  replace(state: GameState): boolean {
    if (!this.available()) return false;
    const next = reconcile(state).state;
    if (!this.commit(next)) return false;
    this.autoEnabled = false;
    this.autoElapsed = 0;
    this.notice = 'Partie importée. Les billes en cours ont été réglées ; l’automatisation est arrêtée.';
    return true;
  }
}
