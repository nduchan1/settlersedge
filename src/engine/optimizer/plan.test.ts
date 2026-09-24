/** Plan-space search: recorded plans must replay EXACTLY, and search can only improve on its seeds. */
import { expect, it } from 'vitest';
import { greedyContinue, optimize } from './planner';
import { execOrder, planSearch, recordPlan } from './plan';
import { allianceGuideX3 } from './guides';
import { Simulation, type SimContext } from '../sim/simulate';
import { serverPresets } from '../data/servers';
import { oasisTricklePerHour } from '../data/oases';
import { GID } from '../data/buildings';

const CTX: SimContext = {
  config: serverPresets['regular-5tribe-x3'], tribe: 'gauls',
  mods: { goldProductionBonus: true, plus: true },
  hero: { enabled: false, target: 'all' }, tasks: true,
  gold: { budget: 500, npc: true, instantFinishMin: Infinity },
  oasisRaids: { count: 33, firstAtH: 1, distance: 5.42,
    tricklePerHour: oasisTricklePerHour({ oases: 33, contest: 1.0, firstClearH: 1 }, 3) },
  adventures: true,
};

it('recorded greedy and guide plans replay to the identical settle time', () => {
  const grid = optimize(CTX, { fieldTargets: [3], townHall: [true], cpEarly: [0], finishMin: [15] });
  const gp = grid[0].params;
  const gOrders = recordPlan(CTX, gp, (sim) => { greedyContinue(sim, gp); })!;
  const g = planSearch(CTX, [{ orders: gOrders, params: gp, label: 'greedy' }], { iterations: 0 })!;
  expect(g.settleTime).toBeCloseTo(grid[0].settleTime!, 0);

  const guideP = { ...gp, finishMin: 15, respecAtH: undefined };
  const direct = new Simulation({ ...CTX, gold: { ...CTX.gold!, instantFinishMin: 15 } });
  allianceGuideX3(direct, { twoParty: true, horses: 14 });
  const directT = direct.finish().settleTime!;
  const guideOrders = recordPlan(CTX, guideP, (sim) => { allianceGuideX3(sim, { twoParty: true, horses: 14 }); sim.finish(); })!;
  const r = planSearch(CTX, [{ orders: guideOrders, params: guideP, label: 'guide' }], { iterations: 0 })!;
  expect(r.settleTime).toBeCloseTo(directT, 0);
}, 300000);

it('search never returns worse than its best seed, and its plan replays exactly', () => {
  const grid = optimize(CTX, { fieldTargets: [3], townHall: [true], cpEarly: [0], finishMin: [15] });
  const gp = grid[0].params;
  const gOrders = recordPlan(CTX, gp, (sim) => { greedyContinue(sim, gp); })!;
  const r = planSearch(CTX, [{ orders: gOrders, params: gp, label: 'greedy' }], { iterations: 300, seed: 7 })!;
  expect(r.settleTime!).toBeLessThanOrEqual(grid[0].settleTime! + 1);
  const again = planSearch(CTX, [{ orders: r.orders, params: r.params, label: 'result' }], { iterations: 0 })!;
  expect(again.settleTime).toBeCloseTo(r.settleTime!, 0);
}, 300000);

it('replay enforces the official multi-build rule (2nd cranny needs a completed L10 one)', () => {
  const sim = new Simulation(CTX);
  execOrder(sim, { k: 'b', gid: GID.cranny, i: 0 });
  expect(() => execOrder(sim, { k: 'b', gid: GID.cranny, i: 1 })).toThrow();
});
