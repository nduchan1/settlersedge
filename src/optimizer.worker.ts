/// <reference lib="webworker" />
import { optimize, type PlanOutcome } from './engine/optimizer/planner';
import { beamSearch, type BeamAction } from './engine/optimizer/beam';
import type { SimContext } from './engine/sim/simulate';
import { buildingName } from './engine/data/buildings';
import { raiders, cavalryRaiders } from './engine/data/raiders';

export type WorkerRequest = { ctx: SimContext; mode: 'fast' | 'deep' | 'ultra' };
export type WorkerMessage =
  | { type: 'progress'; depth: number; best: number | null }
  | { type: 'done'; outcomes: PlanOutcome[] };

const WIDTHS = { fast: 0, deep: 60, ultra: 200 } as const;

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { ctx, mode } = e.data;
  const grid = optimize(ctx); // computed ONCE — also handed to the beam (it used to rerun the grid)
  const greedy = grid.slice(0, 5);
  if (mode === 'fast') {
    self.postMessage({ type: 'done', outcomes: greedy } satisfies WorkerMessage);
    return;
  }
  const beam = beamSearch(ctx, {
    width: WIDTHS[mode],
    greedyGrid: grid,
    maxDepth: mode === 'ultra' ? 200 : 120,
    onProgress: (depth, best) => self.postMessage({ type: 'progress', depth, best } satisfies WorkerMessage),
  });
  // present the organic plan as the top outcome, greedy strategies below for comparison
  const fmtA = (a: BeamAction): string => {
    switch (a.kind) {
      case 'field': return buildingName(a.gid); // Woodcutter / Clay Pit / Iron Mine / Cropland
      case 'up': return `${buildingName(a.gid)} +${a.levels}`;
      case 'new': return buildingName(a.gid);
      case 'party': return 'Party';
      case 'settlers': return 'Settlers';
      case 'raiders': return `${a.count}× ${raiders[ctx.tribe].name}`;
      case 'cavalry': return `${a.count}× ${cavalryRaiders[ctx.tribe].name}`;
      case 'research': return `Research ${cavalryRaiders[ctx.tribe]?.name ?? 'cavalry'}`;
      case 'book': return 'Book of Wisdom (respec)';
    }
  };
  const organic: PlanOutcome = {
    params: {
      ...greedy[0].params, organic: true,
      opening: beam.actions.slice(0, 10).map(fmtA).join(' → ') || '(greedy plan — the beam found nothing better)',
    } as PlanOutcome['params'],
    settleTime: beam.settleTime,
    result: beam.result,
  };
  self.postMessage({ type: 'done', outcomes: [organic, ...greedy] } satisfies WorkerMessage);
};
