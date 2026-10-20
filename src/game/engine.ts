import { CONFIG, DOWNLOADS, EXITS, UPGRADES } from '../config';
import type { DownloadId, UpgradeId } from '../config';
import { drawOutcome, randomUnit } from './outcomes';
import { magnetExit } from './magnets';
import { downloadIssue, purchaseIssue, recalibrationIssue } from './plans';
import type { Random } from './outcomes';
import { chargeCapacity, hasDownload, heatThreshold, isBroken, magnetRecharge, newGame } from './state';
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
  // Surchauffe : aucun comptage pendant le bonus ni lorsque toutes les charges sont prêtes.
  if (state.bonusRemainingMs === 0 && state.charges < chargeCapacity(state)) {
    state.heatCount++;
    if (state.heatCount >= heatThreshold(state)) { state.charges++; state.heatCount = 0; }
  }
  if (!state.repairTriggered && state.stats.grossReturns >= CONFIG.repairThreshold) state.repairTriggered = true;
  return result;
}

/** Mémoire de mise : la mise suit le solde vers le bas, puis revient à la mise choisie. */
export function applyBetMemory(state: GameState): void {
  if (!hasDownload(state, 'download.bet_memory')) return;
  const affordable = Math.floor(state.walletCents / 100) * 100;
  state.selectedBetCents = Math.max(CONFIG.minBet, Math.min(state.preferredBetCents, affordable));
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
  /** Rang du prochain lancement du Doigt dans le cycle de rafale. */
  private autoStep = 0;
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
      applyBetMemory(next);
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
    // Duplicateur : tiré au lancement avec le résultat, seulement pour une sortie sur un gain.
    const duplicated = s.upgrades.includes('azur.duplicator') && multiplier >= CONFIG.duplicateMinMultiplier && randomUnit(this.random) < CONFIG.duplicateChance;
    const ball: Ball = { id: `ball-${s.nextBallSequence}`, sequence: s.nextBallSequence, origin, betCents, baseCents, multiplier, exit, bonus, returnCents: Math.round(baseCents * multiplier / 100) * bonus * (duplicated ? 2 : 1) };
    if (exit !== drawn.exit) ball.magnetFrom = drawn.exit;
    if (duplicated) ball.duplicated = true;
    if (origin !== 'collector' && this.collectorAvailable) ball.collectorEligible = true;
    const next = structuredClone(s);
    next.walletCents -= betCents;
    next.nextBallSequence++;
    next.stats.launched++;
    next.stats.paidBets += betCents;
    next.pendingBalls.push(ball);
    if (ball.magnetFrom !== undefined) next.magnetCooldownMs = magnetRecharge(s);
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
    return this.commit({ ...structuredClone(this.state), selectedBetCents: bet, preferredBetCents: bet });
  }

  buyPlan(id: UpgradeId): boolean {
    const s = this.state;
    if (!this.available() || !Object.hasOwn(UPGRADES, id)) return false;
    const issue = purchaseIssue(s, id);
    if (issue) { this.notice = issue; return false; }
    const item = UPGRADES[id];
    // Achat et installation forment une seule transaction : aucun plan en attente.
    const next = structuredClone(s);
    next.walletCents -= item.price;
    next.stats.upgradeExpenses += item.price;
    next.upgrades.push(id);
    if (id === 'azur.initial_repair') next.repairPurchased = true;
    // Le Duplicateur ouvre la faille : le Compteur d’instabilité part de zéro.
    if (id === 'azur.duplicator') next.instabilityBaseCents = next.stats.grossReturns;
    if (!this.commit(next)) return false;
    this.notice = id === 'azur.initial_repair' ? '« Normalement, ça tient. » — Azur. Machine réparée, atelier privé accessible.' : `${item.name} installé par Azur. Il fonctionne dès le retour dans la cave.`;
    return true;
  }

  /** Achat instantané sur l’écran du module numérique ; permanent, recalibrages compris. */
  buyDownload(id: DownloadId): boolean {
    const s = this.state;
    if (!this.available() || !Object.hasOwn(DOWNLOADS, id)) return false;
    const issue = downloadIssue(s, id);
    if (issue) { this.notice = issue; return false; }
    const item = DOWNLOADS[id], next = structuredClone(s);
    next.walletCents -= item.price; next.stats.downloadExpenses += item.price; next.downloads.push(id);
    // Effets immédiats et cohérents : jauge déjà au-delà de 80, recharge des aimants raccourcie.
    if (id === 'download.fast_heat' && next.heatCount >= CONFIG.fastHeatCount) { if (next.charges < chargeCapacity(next) && next.bonusRemainingMs === 0) next.charges++; next.heatCount = 0; }
    if (id === 'download.magnets_v2') next.magnetCooldownMs = Math.min(next.magnetCooldownMs, CONFIG.magnetRechargeFast);
    if (!this.commit(next)) return false;
    this.notice = `${item.name} téléchargé et installé.`;
    return true;
  }

  /**
   * Recalibrage : solde ramené à 19 pièces, améliorations retirées sauf la réparation, Surchauffe,
   * Collecteur et réglages du Doigt remis à zéro. Conservés : historique, statistiques cumulées,
   * réglages et téléchargements. Le premier offre le module numérique.
   */
  recalibrate(): boolean {
    const s = this.state;
    if (!this.available()) return false;
    const issue = recalibrationIssue(s);
    if (issue) { this.notice = issue; return false; }
    const next = structuredClone(s), removed = s.upgrades.filter(id => id !== 'azur.initial_repair');
    next.stats.recalibrationWithdrawn += s.walletCents - CONFIG.initialWallet;
    next.stats.discardedUpgrades += removed.reduce((sum, id) => sum + UPGRADES[id].price, 0);
    next.walletCents = CONFIG.initialWallet;
    next.upgrades = ['azur.initial_repair']; next.plans = [];
    next.charges = 0; next.heatCount = 0; next.bonusRemainingMs = 0; next.collectorCharge = 0;
    next.magnetCooldownMs = CONFIG.magnetRecharge; next.gearMode = 'steady'; next.manualCooldownMs = 0;
    next.selectedBetCents = CONFIG.minBet; next.preferredBetCents = CONFIG.minBet;
    next.recalibrations++; next.instabilityBaseCents = next.stats.grossReturns;
    if (!this.commit(next)) return false;
    this.stopAuto();
    this.notice = next.recalibrations === 1
      ? 'Recalibrage effectué. La faille s’est refermée en laissant un module numérique sur la machine.'
      : 'Recalibrage effectué. 19,00 pièces, réparation et téléchargements conservés.';
    return true;
  }

  /** Règle en une écriture les billes encore en vol, avec leur retour figé (départ par l'escalier). */
  settleAll(): boolean {
    if (!this.available()) return false;
    if (!this.state.pendingBalls.length) return true;
    const next = reconcile(this.state).state;
    if (!this.commit(next)) return false;
    if (isBroken(next)) this.autoEnabled = false;
    return true;
  }

  toggleAuto(): boolean {
    if (!this.available() || !this.state.upgrades.includes('azur.auto_launcher') || isBroken(this.state) || this.state.factoryRemainingMs > 0) return false;
    this.autoEnabled = !this.autoEnabled;
    this.autoElapsed = 0; this.autoStep = 0;
    return true;
  }

  stopAuto(): void { this.autoEnabled = false; this.autoElapsed = 0; this.autoStep = 0; }

  /** Délai avant le prochain lancement du Doigt : 2 s, ou rafales de 3 billes toutes les 6 s. */
  private autoInterval(): number {
    if (this.state.gearMode !== 'burst' || !this.state.upgrades.includes('azur.gearbox')) return CONFIG.autoInterval;
    if (this.autoStep % CONFIG.burstSize !== 0) return CONFIG.burstSpacing;
    return this.autoStep === 0 ? CONFIG.autoInterval : CONFIG.burstCycle - (CONFIG.burstSize - 1) * CONFIG.burstSpacing;
  }

  /** Levier de la Boîte de vitesses ; le rythme repart de zéro au changement. */
  setGear(mode: GameState['gearMode']): boolean {
    const s = this.state;
    if (!this.available() || !s.upgrades.includes('azur.gearbox') || s.factoryRemainingMs > 0 || s.gearMode === mode) return false;
    if (!this.commit({ ...structuredClone(s), gearMode: mode })) return false;
    this.autoElapsed = 0; this.autoStep = 0;
    return true;
  }

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
    // Une charge par activation, jamais pendant un bonus en cours : ×2 sans cumul.
    if (!this.available() || s.charges < 1 || s.bonusRemainingMs > 0 || isBroken(s) || s.factoryRemainingMs > 0) return false;
    const next = structuredClone(s);
    next.charges--;
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
    // Décharge auto : déclenchée dès qu’une charge est prête, tant que le Doigt tourne.
    if (clock === 'all' && this.autoEnabled && hasDownload(this.state, 'download.auto_discharge') && this.state.charges > 0 && this.state.bonusRemainingMs === 0 && !isBroken(this.state) && this.state.factoryRemainingMs === 0) {
      this.activateBonus();
      if (this.error) return;
    }
    if (clock === 'all' && this.autoEnabled && !isBroken(this.state) && this.state.factoryRemainingMs === 0) {
      this.autoElapsed += ms;
      // Reporter l'excédent garde la cadence de 2 s ; un refus (plafond) repart de zéro, sans file.
      const interval = this.autoInterval();
      if (this.autoElapsed >= interval) {
        const overrun = Math.min(this.autoElapsed - interval, interval - 1);
        // Un refus (plafond) saute ce lancement sans le mettre en file.
        this.autoElapsed = this.launch('auto') ? overrun : 0;
        this.autoStep++;
      }
    }
  }

  replace(state: GameState): boolean {
    if (!this.available()) return false;
    const next = reconcile(state).state;
    if (!this.commit(next)) return false;
    this.autoEnabled = false;
    this.autoElapsed = 0; this.autoStep = 0;
    this.fractionalMs = 0;
    this.notice = 'Partie importée. Les billes en cours ont été réglées ; l’automatisation est arrêtée.';
    return true;
  }
}
