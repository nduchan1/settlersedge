/** Verified game formulas. Every formula here traces to research/ (file § noted per function).
 *  Data beats formulas: per-level building values come from data/buildings.ts, not curves. */
import { levelData } from './data/buildings';
import { tribes } from './data/tribes';
import type { Tribe } from './types';

/** Main Building time multiplier: 0.964^(MB−1). Verified vs all 995 official rows (research/01).
 *  Applies to resource fields too (research/10 §2). */
export function mbTimeFactor(mbLevel: number): number {
  return Math.pow(0.964, mbLevel - 1);
}

/** Actual build time in seconds for gid→level, given Main Building level and server speed. */
export function buildTime(gid: number, level: number, mbLevel: number, speed: number): number {
  return Math.round((levelData(gid, level).buildingTime * mbTimeFactor(mbLevel)) / speed);
}

/** Celebration duration in seconds. Verified to the second at TH 11/13/17 small+great on x2 (research/07).
 *  Speed divisor: 1 (x1/x2), 2 (x3/x5), 4 (x10) — official KB (research/05). */
export function celebrationDuration(thLevel: number, kind: 'small' | 'great', speed: number): number {
  const divisor = speed >= 10 ? 4 : speed >= 3 ? 2 : 1;
  const base = 86400 * Math.pow(0.964, thLevel - 1) * (kind === 'great' ? 2.5 : 1);
  return Math.round(base / divisor);
}

/** Settler training seconds. ×0.9 per Residence/Palace/CC level from level 1 (official effects data,
 *  research/10); alliance Recruitment −2%/level incl. Residence (official KB art. 88); ceil rounding.
 *  Reproduces both in-game measurements exactly (research/07 §P0-4). */
export function settlerTime(tribe: Tribe, residenceLevel: number, speed: number, allianceRecruitment = 0): number {
  const base = tribes[tribe].settlerTimeBase;
  return Math.ceil((base * Math.pow(0.9, residenceLevel - 1) * (1 - 0.02 * allianceRecruitment)) / speed);
}

/** Hero resource production per hour (unit per-hour pending final in-game check — research/07 §P0-1).
 *  9/pt each-resource or 30/pt single (Egyptians 12/40), ×speed; gold +25% applies (official art. 141). */
export function heroProduction(points: number, opts: { tribe: Tribe; single: boolean; speed: number; goldBonus?: boolean }): number {
  const egyptian = opts.tribe === 'egyptians';
  const perPoint = opts.single ? (egyptian ? 40 : 30) : (egyptian ? 12 : 9);
  return points * perPoint * opts.speed * (opts.goldBonus ? 1.25 : 1);
}

/** Task reward hero bonus: floor(base × (1 + 0.02·(heroLevel−1))), 0 below level 1.
 *  Recovered from spreadsheet cell formulas, reproduces all 202 rows (research/08). */
export function taskReward(base: number, heroLevel: number): number {
  return Math.floor(base * (1 + 0.02 * Math.max(0, heroLevel - 1)));
}
