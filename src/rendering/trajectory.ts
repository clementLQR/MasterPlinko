import { randomUnit } from '../game/outcomes';
import type { Random } from '../game/outcomes';

export const BOARD = { spacingX: 0.66, spacingY: 0.61, startY: 4.65, ballZ: 0.45, rows: 14 };
export type Point = { x: number; y: number; z: number };

export function pathToExit(exit: number, random: Random = Math.random): Point[] {
  if (!Number.isInteger(exit) || exit < 0 || exit > 14) throw new Error('Sortie invalide.');
  const moves: number[] = Array.from({ length: 14 }, (_, i) => i < exit ? 1 : -1);
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(randomUnit(random) * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  const points: Point[] = [{ x: 0, y: BOARD.startY + 0.5, z: BOARD.ballZ }, { x: 0, y: BOARD.startY + 0.2, z: BOARD.ballZ }];
  let x = 0;
  for (let row = 0; row < 14; row++) {
    // Le picot est placé 0,20 sous chaque point de contact ; la courbe passe au-dessus puis à côté.
    x += moves[row] * BOARD.spacingX / 2;
    points.push({ x, y: BOARD.startY - (row + 1) * BOARD.spacingY + 0.2, z: BOARD.ballZ });
  }
  points.push({ x, y: BOARD.startY - 14 * BOARD.spacingY - 0.48, z: BOARD.ballZ });
  return points;
}

export function samplePath(points: Point[], progress: number, reduced = false): Point {
  const t = Math.min(1, Math.max(0, progress)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(t));
  const fraction = Math.min(1, t - index);
  const a = points[index], b = points[index + 1];
  const rebound = index > 0 && index < points.length - 2;
  const horizontal = rebound ? 1 - (1 - fraction) ** 2 : fraction;
  const vertical = rebound ? fraction ** 2 : fraction;
  return {
    x: a.x + (b.x - a.x) * horizontal,
    y: a.y + (b.y - a.y) * vertical + (rebound && !reduced ? Math.sin(fraction * Math.PI) * 0.06 : 0),
    z: a.z,
  };
}
