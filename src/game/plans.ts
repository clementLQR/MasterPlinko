import { UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import { isBroken } from './state';
import type { GameState } from './state';

/** Les mêmes conditions servent au moteur et aux supports physiques. Acheter installe directement. */
export function purchaseIssue(s: GameState, id: UpgradeId): string | undefined {
  if (s.upgrades.includes(id)) return 'Déjà installé';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
  if (id === 'azur.initial_repair' ? !isBroken(s) : !s.repairPurchased) return id === 'azur.initial_repair' ? 'Disponible après la panne' : 'Réparation initiale d’abord';
  if (id === 'azur.initial_repair' && s.pendingBalls.length) return 'Attendre l’arrivée des billes';
  if (id === 'azur.magnets' && !s.upgrades.includes('azur.auto_launcher')) return 'Doigt mécanique d’abord';
  if (s.walletCents < UPGRADES[id].price) return 'Solde insuffisant · l’usine reste ouverte';
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
