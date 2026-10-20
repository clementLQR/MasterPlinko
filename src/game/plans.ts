import { DOWNLOADS, UPGRADES } from '../config';
import type { DownloadId, UpgradeId } from '../config';
import { digitalModule, instabilityCents, isBroken, riftOpen } from './state';
import { CONFIG } from '../config';
import type { GameState } from './state';

/** Les mêmes conditions servent au moteur et aux supports physiques. Acheter installe directement. */
export function purchaseIssue(s: GameState, id: UpgradeId): string | undefined {
  if (s.upgrades.includes(id)) return 'Déjà installé';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
  if (id === 'azur.initial_repair' ? !isBroken(s) : !s.repairPurchased) return id === 'azur.initial_repair' ? 'Disponible après la panne' : 'Réparation initiale d’abord';
  if (id === 'azur.initial_repair' && s.pendingBalls.length) return 'Attendre l’arrivée des billes';
  if ((id === 'azur.magnets' || id === 'azur.gearbox') && !s.upgrades.includes('azur.auto_launcher')) return 'Doigt mécanique d’abord';
  if (s.walletCents < UPGRADES[id].price) return 'Solde insuffisant · l’usine reste ouverte';
}

/** Téléchargement depuis l’écran du module numérique (seule vente autorisée dans la cave). */
export function downloadIssue(s: GameState, id: DownloadId): string | undefined {
  if (!digitalModule(s)) return 'Module numérique requis (premier recalibrage)';
  if (s.downloads.includes(id)) return 'Déjà téléchargé';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
  if (id === 'download.magnets_v2' && !s.upgrades.includes('azur.magnets')) return 'Aimants installés d’abord';
  if (s.walletCents < DOWNLOADS[id].price) return 'Solde insuffisant';
}

/** Conditions du recalibrage : faille ouverte et machine au repos. */
export function recalibrationIssue(s: GameState): string | undefined {
  if (!s.upgrades.includes('azur.duplicator')) return 'Le Duplicateur ouvre la faille : à acheter chez Azur';
  if (!riftOpen(s)) return `Faille instable : ${Math.floor(instabilityCents(s) * 100 / CONFIG.instabilityThreshold)} %`;
  if (s.pendingBalls.length) return 'Attendre l’arrivée des billes';
  if (s.bonusRemainingMs) return 'Attendre la fin de la Décharge';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
}

/**
 * Anciennes sauvegardes : un plan déjà payé mais pas encore monté est installé sans nouveau débit.
 * Les dépenses restent inchangées ; le champ `plans` du format 6 reste vide ensuite.
 */
export function installPaidPlans(s: GameState): void {
  for (const id of s.plans) {
    if (!s.upgrades.includes(id)) s.upgrades.push(id);
    if (id === 'azur.initial_repair') s.repairPurchased = true;
  }
  s.plans = [];
}
