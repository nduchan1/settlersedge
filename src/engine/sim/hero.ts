/** Hero model (research/06, /07, /10).
 *  XP → level: total XP for level L = 25·L·(L+1) (confirmed 3 independent sources).
 *  Attribute points: 4 at creation + 4 per level; v1 assumes all in resource production (settling meta).
 *  Production: 9/pt/h each-resource or 30/pt/h single (Egyptians 12/40), ×speed, gold +25%. */
import { heroProduction } from '../formulas';
import type { Resources, ServerConfig, Tribe } from '../types';

export type HeroTarget = 'all' | keyof Resources;

export interface HeroConfig {
  enabled: boolean;
  target: HeroTarget;
  /** Book of Wisdom respec (record meta): a full-STRENGTH hero (enabled=false) that clears oases
   *  switches ALL points to resources once the clears are done. Hour of the respec; undefined = never
   *  (automatic once every farmed oasis is cleared). */
  respecAtH?: number;
  /** Passive HP/hour. Default 0 — during a settle chase the auction market is locked (BP), so
   *  there are NO ointments; the level-up full heal is the only heal source (Nitai). */
  healPerHour?: number;
}

export function heroLevel(xp: number): number {
  let l = 0;
  while (25 * (l + 1) * (l + 2) <= xp) l++;
  return l;
}

export function heroPoints(level: number): number {
  return 4 + 4 * level;
}

/** Hero resource production in units/hour, as a Resources vector. */
export function heroProductionVector(xp: number, hero: HeroConfig, tribe: Tribe, config: ServerConfig, goldBonus: boolean): Resources {
  const zero: Resources = { wood: 0, clay: 0, iron: 0, crop: 0 };
  if (!hero.enabled) return zero;
  const points = heroPoints(heroLevel(xp));
  if (hero.target === 'all') {
    const each = heroProduction(points, { tribe, single: false, speed: config.speed, goldBonus });
    return { wood: each, clay: each, iron: each, crop: each };
  }
  const single = heroProduction(points, { tribe, single: true, speed: config.speed, goldBonus });
  return { ...zero, [hero.target]: single };
}
