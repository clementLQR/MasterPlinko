import { OUTCOMES } from '../config';

export type Random = () => number;
export function randomUnit(random: Random): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Source aléatoire invalide.');
  return value;
}

export function drawOutcome(random: Random) {
  const ticket = Math.floor(randomUnit(random) * 1000);
  let cumulative = 0;
  for (const category of OUTCOMES) {
    cumulative += category.weight;
    if (ticket < cumulative) {
      return { multiplier: category.multiplier, exit: category.exits.length === 1 ? category.exits[0] : category.exits[Math.floor(randomUnit(random) * 2)] };
    }
  }
  throw new Error('Distribution incomplète.');
}
