import { CONFIG } from '../config';
import type { UpgradeId } from '../config';

export interface Ball {
  id: string;
  sequence: number;
  origin: 'manual' | 'auto';
  betCents: number;
  baseCents: number;
  multiplier: number;
  exit: number;
  bonus: 1 | 10;
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
  saveVersion: 1;
  profile: 'prototype';
  walletCents: number;
  selectedBetCents: number;
  nextBallSequence: number;
  pendingBalls: Ball[];
  upgrades: UpgradeId[];
  repairTriggered: boolean;
  repairPurchased: boolean;
  stats: Stats;
  heatCount: number;
  chargeReady: boolean;
  bonusRemainingMs: number;
  factoryRemainingMs: number;
  manualCooldownMs: number;
  history: Result[];
  preferences: Preferences;
  savedAt: string;
}

export function newGame(): GameState {
  return {
    saveVersion: 1, profile: 'prototype', walletCents: CONFIG.initialWallet,
    selectedBetCents: CONFIG.minBet, nextBallSequence: 1, pendingBalls: [], upgrades: [],
    repairTriggered: false, repairPurchased: false,
    stats: { launched: 0, settled: 0, paidBets: 0, grossReturns: 0, paidProfit: 0, freeProduction: 0, factoryIncome: 0, upgradeExpenses: 0 },
    heatCount: 0, chargeReady: false, bonusRemainingMs: 0, factoryRemainingMs: 0, manualCooldownMs: 0,
    history: [], preferences: { sound: false, reducedMotion: false, quality: 'normal' }, savedAt: new Date().toISOString(),
  };
}

export const isBroken = (state: GameState) => state.repairTriggered && !state.repairPurchased;
