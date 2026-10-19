import { UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import { isBroken } from './state';
import type { GameState } from './state';

/** Les mêmes conditions servent au moteur et aux supports physiques. */
export function purchaseIssue(s: GameState, id: UpgradeId): string | undefined {
  if (s.upgrades.includes(id)) return 'Déjà installé';
  if (s.plans.includes(id)) return 'Plan acheté · à installer sur le Plinko';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
  if (id === 'azur.initial_repair' ? !isBroken(s) : !s.repairPurchased) return id === 'azur.initial_repair' ? 'Disponible après la panne' : 'Installer la réparation initiale d’abord';
  if (id === 'azur.magnets' && !s.upgrades.includes('azur.auto_launcher')) return 'Installer le Doigt mécanique d’abord';
  if (s.walletCents < UPGRADES[id].price) return 'Solde insuffisant · l’usine reste ouverte';
}

export function installationIssue(s: GameState, id: UpgradeId): string | undefined {
  if (s.upgrades.includes(id)) return 'Déjà installé';
  if (!s.plans.includes(id)) return 'Acheter le plan chez Azur';
  if (s.factoryRemainingMs) return 'Indisponible pendant le service';
  if (id === 'azur.initial_repair') {
    if (!isBroken(s)) return 'La machine fonctionne déjà';
    if (s.pendingBalls.length) return 'Attendre l’arrivée des billes';
  } else if (!s.repairPurchased) return 'Installer la réparation initiale d’abord';
  if (id === 'azur.magnets' && !s.upgrades.includes('azur.auto_launcher')) return 'Installer le Doigt mécanique d’abord';
}
