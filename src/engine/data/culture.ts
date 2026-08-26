/** Culture point thresholds & related constants.
 *  Formula reproduces the official per-speed table (KB art. 51) — proven in culture.test.ts
 *  against every published row (research/03, research/05). CP accrues CONTINUOUSLY (research/07). */
import type { ServerSpeed } from '../types';

/** CP required to found/conquer village number `village` (village 1 = 0). */
export function cpThreshold(village: number, speed: ServerSpeed): number {
  if (village <= 1) return 0;
  const raw = 1600 * Math.pow(village - 1, 2.3);
  if (speed === 1) return Math.round(raw / 1000) * 1000;
  return Math.round(raw / speed / 100) * 100;
}

/** Starting CP on account creation (official table, research/03). */
export const startingCp: Record<ServerSpeed, number> = { 1: 500, 2: 250, 3: 167, 5: 100, 10: 50 };

/** Celebration instant-CP caps (official KB, research/05): [small, great] per speed. */
export const celebrationCpCap: Record<ServerSpeed, [number, number]> = {
  1: [500, 2000], 2: [500, 2000], 3: [250, 1000], 5: [250, 1000], 10: [125, 500],
};

/** Artwork CP: grants daily account CP × factor, capped; cooldown hours (official, research/06). */
export const artwork: Record<ServerSpeed, { factor: number; cap: number; cooldownH: number }> = {
  1: { factor: 1, cap: 2000, cooldownH: 24 },
  2: { factor: 2 / 3, cap: 1300, cooldownH: 24 },
  3: { factor: 1 / 2, cap: 1000, cooldownH: 12 },
  5: { factor: 1 / 3, cap: 700, cooldownH: 12 },
  10: { factor: 1 / 6, cap: 400, cooldownH: 6 },
};

/** Advanced Start CP grant beyond the first two free settles: 75% of the v3→v4 threshold
 *  difference, pre-filled (official arts. 28 & 203; "difference" reading confirmed by the
 *  official x2 worked example — research/05). */
export function advancedStartCp(speed: ServerSpeed): number {
  return cpThreshold(3, speed) + 0.75 * (cpThreshold(4, speed) - cpThreshold(3, speed));
}
