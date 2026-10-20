import { CONFIG } from '../config';
import type { DownloadId, UpgradeId } from '../config';
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
  /** Duplicateur : retour doublé, tiré au lancement avec le résultat. */
  duplicated?: true;
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
  /** Pièces retirées (ou ajoutées, si négatif) en ramenant le solde à 19 lors des recalibrages. */
  recalibrationWithdrawn: number;
  /** Prix des améliorations retirées par les recalibrages. */
  discardedUpgrades: number;
  downloadExpenses: number;
}
export interface Preferences { sound: boolean; reducedMotion: boolean; quality: 'normal' | 'low' }
export interface GameState {
  saveVersion: 8;
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
  /** Progression vers la prochaine charge (0 à 99) ; remise à 0 quand une charge se forme. */
  heatCount: number;
  /** Charges de Décharge prêtes : 1 au plus, 2 avec le Condensateur de poche. */
  charges: number;
  /** Boîte de vitesses : rythme du Doigt. */
  gearMode: 'steady' | 'burst';
  /** Recalibrages effectués ; le premier offre le module numérique. */
  recalibrations: number;
  /** Retours bruts au moment où la faille s’est ouverte (achat du Duplicateur). */
  instabilityBaseCents: number;
  /** Téléchargements du module numérique, permanents. */
  downloads: DownloadId[];
  /** Mise choisie par le joueur, rétablie par la Mémoire de mise. */
  preferredBetCents: number;
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
    saveVersion: 8, profile: 'prototype', walletCents: CONFIG.initialWallet,
    selectedBetCents: CONFIG.minBet, nextBallSequence: 1, pendingBalls: [], upgrades: [], plans: [],
    repairTriggered: false, repairPurchased: false,
    stats: { launched: 0, settled: 0, paidBets: 0, grossReturns: 0, paidProfit: 0, freeProduction: 0, factoryIncome: 0, upgradeExpenses: 0, recalibrationWithdrawn: 0, discardedUpgrades: 0, downloadExpenses: 0 },
    heatCount: 0, charges: 0, gearMode: 'steady', recalibrations: 0, instabilityBaseCents: 0, downloads: [], preferredBetCents: CONFIG.minBet, bonusRemainingMs: 0, factoryRemainingMs: 0, factory: newFactory(), manualCooldownMs: 0, magnetCooldownMs: CONFIG.magnetRecharge,
    collectorCharge: 0,
    history: [], preferences: { sound: false, reducedMotion: false, quality: 'normal' }, savedAt: new Date().toISOString(),
  };
}

export const isBroken = (state: GameState) => state.repairTriggered && !state.repairPurchased;
/** Nombre de charges de Décharge stockables. */
export const chargeCapacity = (state: Pick<GameState, 'upgrades'>) => state.upgrades.includes('azur.capacitor') ? CONFIG.capacitorCharges : 1;
export const hasDownload = (state: Pick<GameState, 'downloads'>, id: DownloadId) => state.downloads.includes(id);
/** Billes réglées pour une charge : 100, ou 80 avec Surchauffe rapide. */
export const heatThreshold = (state: Pick<GameState, 'downloads'>) => hasDownload(state, 'download.fast_heat') ? CONFIG.fastHeatCount : CONFIG.chargeCount;
export const magnetRecharge = (state: Pick<GameState, 'downloads'>) => hasDownload(state, 'download.magnets_v2') ? CONFIG.magnetRechargeFast : CONFIG.magnetRecharge;
/** Progression de la faille : retours bruts depuis l’achat du Duplicateur (0 sans lui). */
export const instabilityCents = (state: Pick<GameState, 'upgrades' | 'stats' | 'instabilityBaseCents'>) => state.upgrades.includes('azur.duplicator') ? Math.max(0, state.stats.grossReturns - state.instabilityBaseCents) : 0;
export const riftOpen = (state: Pick<GameState, 'upgrades' | 'stats' | 'instabilityBaseCents'>) => instabilityCents(state) >= CONFIG.instabilityThreshold;
/** Le premier recalibrage offre le module numérique. */
export const digitalModule = (state: Pick<GameState, 'recalibrations'>) => state.recalibrations > 0;
