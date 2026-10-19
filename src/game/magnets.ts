import { randomUnit } from './outcomes';
import type { Random } from './outcomes';

/** Une case vers l'extérieur ; au centre, deux voisins équivalents. Aucun tirage sur ×40. */
export function magnetExit(exit: number, random: Random): number {
  if (!Number.isInteger(exit) || exit < 0 || exit > 14) throw new Error('Sortie invalide.');
  if (exit === 0 || exit === 14) return exit;
  if (exit === 7) return randomUnit(random) < 0.5 ? 6 : 8;
  return exit < 7 ? exit - 1 : exit + 1;
}
