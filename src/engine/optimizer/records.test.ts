/** Record matrix — organic beam vs official HoF records. Income = official oasis REGEN × speed
 *  (research/02 §117; Nitai: regen, not hero speed, is the bottleneck), same map for all speeds. */
import { it } from 'vitest';
import { beamSearch } from './beam';
import { optimize } from './planner';
import { serverPresets } from '../data/servers';
import { RECORD_OASIS_PLAN, oasisTricklePerHour } from '../data/oases';
import type { SimContext } from '../sim/simulate';
import type { ServerSpeed } from '../types';

const RECORDS: Record<number, string> = { 1: '76:41:03', 2: '27:57:20', 3: '17:08:02', 5: '10:10:09', 10: '5:40:24' };
const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function recordCtx(speed: ServerSpeed, plan = RECORD_OASIS_PLAN): SimContext {
  const preset = speed === 1 ? 'regular-3tribe-x1' : speed === 2 ? 'regular-5tribe-x2' : speed === 3 ? 'regular-5tribe-x3' : speed === 5 ? 'local-6tribe-x5-advstart' : 'local-6tribe-x10-advstart';
  return {
    config: { ...serverPresets[preset], advancedStart: false }, // HoF excludes Advanced Start
    tribe: 'gauls', mods: { goldProductionBonus: true, plus: false },
    hero: { enabled: false, target: 'all' }, tasks: true, // strength hero (raid meta), auto-respec
    gold: { budget: 1000, npc: true, instantFinishMin: 1 },
    oasisRaids: { count: plan.oases, firstAtH: plan.firstClearH, distance: 3, tricklePerHour: oasisTricklePerHour(plan, speed) },
    adventures: true,
  };
}

it('record matrix', () => {
  for (const speed of [1, 2, 3, 5, 10] as ServerSpeed[]) {
    const c = recordCtx(speed);
    const g = optimize(c)[0];
    const t0 = Date.now();
    const b = beamSearch(c, { width: 80, maxDepth: 150 });
    console.log(`x${speed}: greedy ${fmt(g.settleTime!)} | organic ${fmt(b.settleTime!)} (${((Date.now() - t0) / 1000).toFixed(0)}s, gold ${b.result.state.goldSpent}, trickle ${c.oasisRaids!.tricklePerHour}/h) | RECORD ${RECORDS[speed]}`);
  }
}, 1800000);
