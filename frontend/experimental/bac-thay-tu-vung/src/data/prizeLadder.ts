/**
 * Prize ladder mirrors the "Ai La Trieu Phu" structure but uses points (not
 * VND) so the prototype reads as an educational game rather than a money show.
 * Two safe-haven checkpoints at levels 5 and 10 — clearing them banks the
 * payout even if the player misses a later question.
 */
export interface LadderRung {
  level: number;
  points: number;
  safeHaven: boolean;
  label: string; // formatted display value
}

const RAW: ReadonlyArray<readonly [number, number, boolean]> = [
  [1, 100, false],
  [2, 200, false],
  [3, 300, false],
  [4, 500, false],
  [5, 1_000, true],
  [6, 2_000, false],
  [7, 4_000, false],
  [8, 8_000, false],
  [9, 16_000, false],
  [10, 32_000, true],
  [11, 64_000, false],
  [12, 125_000, false],
  [13, 250_000, false],
  [14, 500_000, false],
  [15, 1_000_000, false],
];

const formatPoints = (n: number): string => n.toLocaleString('en-US');

export const PRIZE_LADDER: ReadonlyArray<LadderRung> = RAW.map(([level, points, safeHaven]) => ({
  level,
  points,
  safeHaven,
  label: level === 15 ? '1,000,000 ★' : formatPoints(points),
}));

export const TOP_LEVEL = PRIZE_LADDER[PRIZE_LADDER.length - 1].level;

/**
 * Banked payout: the highest cleared safe-haven, or 0 if the player has
 * cleared none. Pass the index of the *next* question (i.e. the one the
 * player is about to attempt or just failed) — everything before that index
 * has been answered correctly.
 */
export function bankedPointsFor(clearedLevel: number): number {
  let banked = 0;
  for (const rung of PRIZE_LADDER) {
    if (rung.level > clearedLevel) break;
    if (rung.safeHaven) banked = rung.points;
  }
  return banked;
}

export function pointsAtLevel(level: number): number {
  const rung = PRIZE_LADDER.find((r) => r.level === level);
  return rung ? rung.points : 0;
}
