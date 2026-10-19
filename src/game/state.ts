import { CONFIG } from '../config';
import type { UpgradeId } from '../config';
import { newFactory } from './packing';
import type { FactoryState } from './packing';

export interface Ball {
  id: string;
  sequence: number;
  origin: 'manual' | 'auto' | 'collector';
  betCents: number;
  baseCents: number;
  multiplier: number;
  exit: number;
  /** Sortie tirée avant l'attraction ; absente sur les billes ordinaires. */
  magnetFrom?: number;
  /** Admissibilité figée au lancement ; une récompense du Collecteur n'y a jamais droit. */
  collectorEligible?: true;
  /** 10 reste accepté pour les retours déjà figés dans les anciennes sauvegardes. */
  bonus: 1 | 2 | 10;
  returnCents: number;
}

export interface Result extends Ball { netCents: number }
export interface Stats {
  launched: number;
  settled: number;
  paidBets: number;
  grossReturns: number;
  paidProfit: number;
  freeProduction: number;
  factoryIncome: number;
  upgradeExpenses: number;
}
export interface Preferences { sound: boolean; reducedMotion: boolean; quality: 'normal' | 'low' }
export interface GameState {
  saveVersion: 6;
  profile: 'prototype';
  walletCents: number;
  selectedBetCents: number;
  nextBallSequence: number;
  pendingBalls: Ball[];
  upgrades: UpgradeId[];
  /** Plans payés mais pas encore installés ; les anciens modules restent dans upgrades. */
  plans: UpgradeId[];
  repairTriggered: boolean;
  repairPurchased: boolean;
  stats: Stats;
  heatCount: number;
  chargeReady: boolean;
  bonusRemainingMs: number;
  factoryRemainingMs: number;
  factory: FactoryState;
  manualCooldownMs: number;
  magnetCooldownMs: number;
  collectorCharge: number;
  history: Result[];
  preferences: Preferences;
  savedAt: string;
}

export function newGame(): GameState {
  return {
    saveVersion: 6, profile: 'prototype', walletCents: CONFIG.initialWallet,
    selectedBetCents: CONFIG.minBet, nextBallSequence: 1, pendingBalls: [], upgrades: [], plans: [],
    repairTriggered: false, repairPurchased: false,
    stats: { launched: 0, settled: 0, paidBets: 0, grossReturns: 0, paidProfit: 0, freeProduction: 0, factoryIncome: 0, upgradeExpenses: 0 },
    heatCount: 0, chargeReady: false, bonusRemainingMs: 0, factoryRemainingMs: 0, factory: newFactory(), manualCooldownMs: 0, magnetCooldownMs: CONFIG.magnetRecharge,
    collectorCharge: 0,
    history: [], preferences: { sound: false, reducedMotion: false, quality: 'normal' }, savedAt: new Date().toISOString(),
  };
}

export const isBroken = (state: GameState) => state.repairTriggered && !state.repairPurchased;
