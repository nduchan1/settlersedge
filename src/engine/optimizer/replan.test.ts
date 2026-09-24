/** Mid-race re-plan (oet's follow-along): capture the plan's state at hour X, override with the
 *  player's real numbers, re-optimize. Uses the Gaul live-run calibration config. */
import { expect, it } from 'vitest';
import { beamSearch } from './beam';
import { optimize } from './planner';
import { replanFrom } from './replan';
import { serverPresets } from '../data/servers';
import { oasisTricklePerHour } from '../data/oases';
import type { SimContext } from '../sim/simulate';

const CTX: SimContext = {
  config: serverPresets['regular-5tribe-x3'], tribe: 'gauls',
  mods: { goldProductionBonus: true, plus: true },
  hero: { enabled: false, target: 'all' }, tasks: true,
  gold: { budget: 500, npc: true, instantFinishMin: Infinity },
  oasisRaids: { count: 33, firstAtH: 1, distance: 5.42,
    tricklePerHour: oasisTricklePerHour({ oases: 33, contest: 1.0, firstClearH: 1 }, 3) },
  adventures: true,
};
const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;

it('replan from hour 10 with worse real numbers', () => {
  const grid = optimize(CTX);
  const beam = beamSearch(CTX, { width: 40, maxDepth: 120, greedyGrid: grid });
  expect(beam.settleTime).not.toBeNull();

  // reality drifted: at 10h the player has LESS of everything than planned
  const r = replanFrom(CTX, {
    atH: 10,
    res: { wood: 300, clay: 300, iron: 200, crop: 400 },
    cp: 180,
    cleared: 6,
    orders: beam.orders,
    params: beam.params,
  }, { width: 40, maxDepth: 100, iterations: 600 });

  expect(r.error).toBeUndefined();
  expect(r.outcome?.settleTime).not.toBeNull();
  // settle must be AFTER the report hour and plausibly later than the undisturbed plan
  expect(r.outcome!.settleTime!).toBeGreaterThan(10 * 3600);
  // the corrected build table starts at (or after) the report hour — no pre-10h rows
  const first = r.outcome!.result.events.find((e) => e.type !== 'complete');
  expect(first!.time).toBeGreaterThanOrEqual(10 * 3600 - 1);
  console.log(`plan ${fmt(beam.settleTime!)} → replanned-from-10h (worse reality) ${fmt(r.outcome!.settleTime!)}; first row ${(first!.time / 3600).toFixed(2)}h`);

  // an hour past the plan's settle must refuse cleanly
  const late = replanFrom(CTX, { atH: 200, res: { wood: 1, clay: 1, iron: 1, crop: 1 }, orders: beam.orders, params: beam.params }, { width: 10, maxDepth: 20, iterations: 50 });
  expect(late.error).toBeTruthy();
}, 900000);
