/** Oasis economics for BP-era hero raiding (research/02 §117 — official 1x table; Nitai 2026-08-17).
 *
 *  The real bottleneck of hero income is NOT hero speed but the rate at which oases REGENERATE
 *  resources (and how contested they are). An unoccupied oasis produces, at 1x:
 *    Type 1 (+25% single res): 40/h main, 10/h each other, 11/h crop  ≈ 71/h total (cap 1,000/res)
 *    Type 2 (+25% res +25% crop): 40/h main, 10/h others, 41/h crop  ≈ 101/h  (cap 2,000/res)
 *    Type 3 (+50% crop): 10/h each res, 81/h crop                     ≈ 111/h  (cap 2,000/res)
 *  All ×server speed. A hero visiting an oasis before its storage caps takes everything accumulated,
 *  so sustained income per oasis = its regen rate ÷ (1 + contest), independent of hero cadence. */
import type { ServerSpeed } from '../types';

/** Average total regen per oasis-hour at 1x across a typical local mix (mostly Type 1). */
export const OASIS_REGEN_PER_HOUR_1X = 80;

export interface OasisPlan {
  /** Oases the hero clears AND keeps farming (needs to reach them: within a few fields). */
  oases: number;
  /** Average other raiders per oasis sharing its regen (0 = uncontested, 1 = split in half). */
  contest: number;
  /** Hour of the first clear (Rally Point + walk). */
  firstClearH: number;
}

/** Sustained total income/hour from the farmed oases at this speed. */
export function oasisTricklePerHour(plan: OasisPlan, speed: ServerSpeed): number {
  return Math.round((plan.oases * OASIS_REGEN_PER_HOUR_1X * speed) / (1 + plan.contest));
}

/** Record-pace defaults: HoF chasers farm ~10 oases in a lightly contested spawn (research/09 §5). */
export const RECORD_OASIS_PLAN: OasisPlan = { oases: 10, contest: 0.3, firstClearH: 1 };
