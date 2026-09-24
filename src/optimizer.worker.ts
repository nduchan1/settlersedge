/// <reference lib="webworker" />
import type { PlanOutcome, StrategyParams } from './engine/optimizer/planner';
import { runPipeline } from './engine/optimizer/pipeline';
import { replanFrom } from './engine/optimizer/replan';
import type { PlanOrder, SimContext } from './engine/sim/simulate';
import type { Resources } from './engine/types';
import { buildingName } from './engine/data/buildings';
import { raiders, cavalryRaiders } from './engine/data/raiders';

export type WorkerRequest = {
  ctx: SimContext;
  mode: 'fast' | 'deep' | 'ultra';
  /** Mid-race re-plan (oet's follow-along): correct the followed plan with real numbers at hour X. */
  replan?: { atH: number; res?: Resources; bag?: Resources; cp?: number; cleared?: number; orders: PlanOrder[]; params: StrategyParams };
};
export type WorkerMessage =
  | { type: 'progress'; stage: 'grid' | 'beam' | 'polish'; depth: number; best: number | null; pct?: number }
  | { type: 'done'; outcomes: PlanOutcome[] }
  | { type: 'error'; message: string };

const WIDTHS = { fast: 0, deep: 60, ultra: 200 } as const;
/** Plan-space search budget (edits of the COMPLETE plan, each scored by a full replay). */
const POLISH = { fast: 1500, deep: 6000, ultra: 25000 } as const;

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { ctx, mode } = e.data;
  if (e.data.replan) {
    const r = replanFrom(ctx, e.data.replan, {
      width: Math.max(40, WIDTHS[mode]), maxDepth: mode === 'ultra' ? 200 : 120, iterations: POLISH[mode],
    });
    if (r.outcome) self.postMessage({ type: 'done', outcomes: [r.outcome] } satisfies WorkerMessage);
    else self.postMessage({ type: 'error', message: r.error ?? 'replan failed' } satisfies WorkerMessage);
    return;
  }
  self.postMessage({ type: 'progress', stage: 'grid', depth: 0, best: null } satisfies WorkerMessage);
  const { grid, search: pls } = runPipeline(ctx, POLISH[mode], {
    onProgress: (done, total, best) => self.postMessage({
      type: 'progress', stage: 'polish', depth: done, best: Number.isFinite(best) ? best : null, pct: Math.round((100 * done) / Math.max(1, total)),
    } satisfies WorkerMessage),
  });
  const greedy = grid.slice(0, 5);

  const fmtO = (o: PlanOrder): string => {
    switch (o.k) {
      case 'b': return `${buildingName(o.gid)}${o.lv ? ` ${o.lv}` : ''}`;
      case 'party': return 'Party';
      case 'settler': return 'Settler';
      case 'raid': return `${o.n}× ${raiders[ctx.tribe].name}`;
      case 'cav': return `${o.n}× ${cavalryRaiders[ctx.tribe].name}`;
      case 'research': return `Research ${cavalryRaiders[ctx.tribe]?.name ?? 'cavalry'}`;
      case 'book': return 'Book of Wisdom (respec)';
    }
  };
  if (!pls || pls.settleTime === null) { // the pipeline never hands back less than the greedy
    self.postMessage({ type: 'done', outcomes: greedy } satisfies WorkerMessage);
    return;
  }
  const organic: PlanOutcome = {
    params: {
      ...pls.params, organic: true,
      opening: pls.orders.slice(0, 10).map(fmtO).join(' → '),
      seed: pls.seedLabel,
    } as PlanOutcome['params'],
    settleTime: pls.settleTime,
    result: pls.result,
    orders: pls.orders, // the complete plan — consumed by mid-race re-planning
  };
  self.postMessage({ type: 'done', outcomes: [organic, ...greedy] } satisfies WorkerMessage);
};
