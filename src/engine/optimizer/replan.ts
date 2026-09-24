/** Mid-race re-planning (oet's follow-along idea, 2026-10-09): the player runs the plan, reality
 *  drifts (missed clears, empty bags, slow fingers), and instead of restarting they enter the
 *  SERVER HOUR plus their REAL numbers. We rebuild the plan's own state at that hour (exact replay
 *  of its recorded order list — no 40-field "describe your village" form), overwrite what the
 *  player corrected, and re-optimize the rest of the race from there: the plan's own remaining
 *  orders and a fresh beam are both seeds for plan-space search. If sub-24h is no longer reachable
 *  the search simply returns the best route that IS (e.g. a one-party finish) — no special casing. */
import { Simulation, storageCaps, type PlanOrder } from '../sim/simulate';
import type { SimContext } from '../sim/simulate';
import type { Resources } from '../types';
import { defaultPacks, DEFAULT_PACK_SUPPLY } from '../sim/oasisCombat';
import { greedyContinue, type PlanOutcome, type StrategyParams } from './planner';
import { beamSearch } from './beam';
import { planSearch, runFrom, type PlanSeed } from './plan';

export interface ReplanInput {
  /** Server hour the player is reporting from. */
  atH: number;
  /** REAL warehouse readings (the in-game resource bar). Clamped to the plan's storage caps. */
  res?: Resources;
  /** REAL hero inventory resources (uncapped; spendable like the warehouse via the bag). */
  bag?: Resources;
  /** REAL culture points (the game shows this in the Residence culture tab). */
  cp?: number;
  /** REAL total oases fully cleared so far (fewer or more than planned). */
  cleared?: number;
  /** The plan being followed: its complete recorded order list + the params it was scored with. */
  orders: PlanOrder[];
  params: StrategyParams;
}

export interface ReplanResult {
  outcome?: PlanOutcome;
  error?: string;
}

export function replanFrom(ctx: SimContext, input: ReplanInput, opts: { width: number; maxDepth: number; iterations: number }): ReplanResult {
  // 1. rebuild the followed plan's context (its searched gold + book-hour policy)
  let planCtx: SimContext = ctx.gold ? { ...ctx, gold: { ...ctx.gold, instantFinishMin: input.params.finishMin } } : ctx;
  planCtx = { ...planCtx, hero: { ...planCtx.hero, respecAtH: input.params.respecAtH } };

  // 2. exact replay with a capture at the reported hour
  const sim = new Simulation(planCtx);
  sim.recorder = [];
  sim.captureAtT = input.atH * 3600;
  try {
    runFrom(sim, input.orders, 0, input.params); // the exact replay contract the plan was scored with
  } catch { /* a stale plan may not replay to the end — the capture is what matters */ }
  sim.finish();
  const cap = sim.captured;
  if (!cap) return { error: `the current plan is already finished before hour ${input.atH} — nothing to re-plan` };
  // orders the plan had NOT yet committed at the reported hour = its own continuation
  for (let j = cap.state.slots.length - 1; j >= 0; j--) {
    const sl = cap.state.slots[j];
    if (sl.level > 0 || cap.orderedLevel(j) > 0) break;
    cap.state.slots.pop(); // placed but never ordered (the capture interrupted that order's wait)
  }
  const committed = (cap.recorder ?? []).slice();
  const remaining = (sim.recorder ?? []).slice(committed.length);
  cap.recorder = undefined;

  // 3. overwrite the plan's guesses with the player's REAL numbers
  const s = cap.state;
  if (input.res) {
    // clamp to the plan's storage caps — the sim's conservation invariants assume res ≤ cap
    const caps = storageCaps(s);
    s.res = {
      wood: Math.min(input.res.wood, caps.warehouse),
      clay: Math.min(input.res.clay, caps.warehouse),
      iron: Math.min(input.res.iron, caps.warehouse),
      crop: Math.min(input.res.crop, caps.granary),
    };
  }
  if (input.bag) s.heroBag = { ...input.bag };
  if (input.cp !== undefined) s.cp = input.cp;
  if (input.cleared !== undefined && ctx.oasisRaids) {
    const packs = defaultPacks(ctx.oasisRaids.count, DEFAULT_PACK_SUPPLY);
    s.oasisPacks = packs.map((v, i) => (i < input.cleared! ? 0 : v));
  }
  cap.rebaseLog();

  // 4. seeds: the plan's own remaining orders, and a fresh beam from the corrected state
  const seeds: PlanSeed[] = [{ orders: remaining, params: input.params, label: 'plan remainder' }];
  const c = cap.clone();
  const settleTime = greedyContinue(c, input.params);
  const fin = c.finish();
  const grid: PlanOutcome[] = [{ params: input.params, settleTime: settleTime ?? fin.settleTime, result: fin }];
  const beam = beamSearch(planCtx, { width: opts.width, maxDepth: opts.maxDepth, greedyGrid: grid, startSim: cap });
  // a live sim cannot re-schedule its Book hour — pin the seed to the followed plan's
  if (beam.orders.length) seeds.push({ orders: beam.orders, params: { ...beam.params, respecAtH: input.params.respecAtH }, label: 'beam' });

  // 5. plan-space search over the rest of the race
  const pls = planSearch(planCtx, seeds, { iterations: opts.iterations, startSim: cap });
  if (!pls || pls.settleTime === null) {
    return { error: 'no route to settle found from that state — check the numbers (resources/CP)' };
  }
  return {
    outcome: {
      params: { ...pls.params, organic: true, replannedFromH: input.atH, opening: undefined, seed: pls.seedLabel } as PlanOutcome['params'],
      settleTime: pls.settleTime,
      result: pls.result,
      // chainable: what was built before hour X + the re-optimized rest — a later re-plan replays
      // this (the player's real numbers are re-entered then anyway)
      orders: [...committed, ...pls.orders],
    },
  };
}
