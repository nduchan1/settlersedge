/** The full optimizer pipeline, shared by the web worker and the benchmarks:
 *  1. grid of greedy strategy cells (planner.optimize)
 *  2. seeds = complete recorded plans: the greedy's best + the community guide variants
 *  3. plan-space search (plan.ts) edits whole plans; never returns worse than the greedy. */
import { greedyContinue, optimize, type PlanOutcome, type StrategyParams } from './planner';
import { planSearch, recordPlan, type PlanSearchResult, type PlanSeed } from './plan';
import { allianceGuideX3 } from './guides';
import type { SimContext } from '../sim/simulate';

export interface PipelineResult { grid: PlanOutcome[]; search: PlanSearchResult | null }

export function planSeeds(ctx: SimContext, grid: PlanOutcome[]): PlanSeed[] {
  const seeds: PlanSeed[] = [];
  const gp = grid[0].params;
  const g = recordPlan(ctx, gp, (sim) => { greedyContinue(sim, gp); });
  if (g) seeds.push({ orders: g, params: gp, label: 'greedy' });
  // community guide — a starting point only; the search keeps it only if it wins
  for (const twoParty of [true, false]) {
    for (const fm of [15, 5]) {
      const p: StrategyParams = { ...gp, finishMin: fm, respecAtH: undefined };
      const o = recordPlan(ctx, p, (sim) => { allianceGuideX3(sim, { twoParty, horses: 14 }); sim.finish(); });
      if (o) seeds.push({ orders: o, params: p, label: `guide (${twoParty ? '2' : '1'} parties)` });
    }
  }
  return seeds;
}

/** Strategy cells the 'regen' move may use to re-finish a plan from any cut point. */
export function regenCells(grid: PlanOutcome[], max = 6): StrategyParams[] {
  const out: StrategyParams[] = [];
  const seen = new Set<string>();
  for (const o of grid) {
    if (o.settleTime === null) continue;
    const key = JSON.stringify([o.params.fieldTarget, o.params.townHall, o.params.cpEarly, o.params.cavalry, o.params.residenceFirst, o.params.partyEarly]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o.params);
    if (out.length >= max) break;
  }
  return out;
}

export function runPipeline(ctx: SimContext, iterations: number, opts: {
  grid?: PlanOutcome[]; seed?: number; onProgress?: (done: number, total: number, best: number) => void;
} = {}): PipelineResult {
  const grid = opts.grid ?? optimize(ctx);
  const search = planSearch(ctx, planSeeds(ctx, grid), {
    iterations,
    seed: opts.seed,
    regenParams: regenCells(grid),
    finishMins: [...new Set(grid.filter((o) => o.settleTime !== null).map((o) => o.params.finishMin))],
    onProgress: opts.onProgress,
  });
  // never hand back less than the best greedy plan
  if (search && (search.settleTime === null || (grid[0].settleTime !== null && search.settleTime > grid[0].settleTime))) {
    return { grid, search: null };
  }
  return { grid, search };
}
