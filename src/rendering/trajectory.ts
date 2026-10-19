import { randomUnit } from '../game/outcomes';
import type { Random } from '../game/outcomes';

export const BOARD = {
  spacingX: 0.66, spacingY: 0.61, startY: 4.65, ballZ: 0.45, rows: 14,
  ballRadius: 0.137, pinRadius: 0.075, contactHeight: 0.216,
  halfWidth: 5.08, dividerTop: -3.78, entryY: 5.05, exitY: -4.43,
};
export type Point = { x: number; y: number; z: number };

/** Grille rectangulaire en quinconce, partagée par la géométrie et les vérifications. */
export function pinPositions(): Point[] {
  const pins: Point[] = [];
  for (let row = 0; row < BOARD.rows; row++) {
    for (let col = -7; col <= 7; col++) {
      const x = (col + (row % 2 ? 0.5 : 0)) * BOARD.spacingX;
      if (Math.abs(x) < BOARD.halfWidth - BOARD.ballRadius) pins.push({ x, y: BOARD.startY - row * BOARD.spacingY, z: BOARD.ballZ });
    }
  }
  return pins;
}

/** Une impulsion sonore par contact réellement franchi, jamais une règle de paiement. */
export function contactStep(progress: number): number {
  return Math.min(BOARD.rows, Math.max(0, Math.floor(Math.min(1, progress) * 16)));
}

export function pathToExit(exit: number, random: Random = Math.random): Point[] {
  if (!Number.isInteger(exit) || exit < 0 || exit > 14) throw new Error('Sortie invalide.');
  const moves: number[] = Array.from({ length: 14 }, (_, i) => i < exit ? 1 : -1);
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(randomUnit(random) * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  const points: Point[] = [{ x: 0, y: BOARD.entryY, z: BOARD.ballZ }, { x: 0, y: BOARD.startY + BOARD.contactHeight, z: BOARD.ballZ }];
  let x = 0;
  for (let row = 0; row < 14; row++) {
    // Le centre touche presque la couronne du picot, puis s'écarte avant d'accélérer vers le suivant.
    x += moves[row] * BOARD.spacingX / 2;
    points.push({ x, y: BOARD.startY - (row + 1) * BOARD.spacingY + BOARD.contactHeight, z: BOARD.ballZ });
  }
  points.push({ x, y: BOARD.exitY, z: BOARD.ballZ });
  return points;
}

export function samplePath(points: Point[], progress: number, reduced = false): Point {
  const t = Math.min(1, Math.max(0, progress)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(t));
  const fraction = Math.min(1, t - index);
  const a = points[index], b = points[index + 1];
  const rebound = index > 0 && index <= BOARD.rows;
  const horizontal = rebound ? 1 - (1 - fraction) ** 2 : fraction;
  const vertical = rebound ? fraction ** 2 : fraction;
  return {
    x: a.x + (b.x - a.x) * horizontal,
    y: a.y + (b.y - a.y) * vertical + (rebound && !reduced ? Math.sin(fraction * Math.PI) * (0.035 + 0.018 * Math.sin(index * 2.4 + a.x * 4)) : 0),
    z: a.z,
  };
}
