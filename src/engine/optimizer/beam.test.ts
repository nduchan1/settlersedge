import { describe, expect, it } from 'vitest';
import { beamSearch } from './beam';
import { optimize } from './planner';
import { serverPresets } from '../data/servers';
import type { SimContext } from '../sim/simulate';

const ctx = (preset: string): SimContext => ({
  config: serverPresets[preset], tribe: 'gauls',
  mods: { allianceRecruitment: 0, goldProductionBonus: true, plus: false },
  hero: { enabled: false, target: 'all' }, tasks: true, // strength hero (raid meta), auto-respec
  gold: { budget: 600, npc: true, instantFinishMin: 5 },
  oasisRaids: { count: 6, firstAtH: 3, distance: 3, tricklePerHour: 50 },
  adventures: true,
});

describe('organic beam search (no strategy rules)', () => {
  it('x10 advanced start: finds a valid settle without any skeleton', () => {
    const r = beamSearch(ctx('local-6tribe-x10-advstart'), { width: 40, maxDepth: 80 });
    expect(r.settleTime).not.toBeNull();
    expect(r.settleTime! / 3600).toBeLessThan(72);
  }, 240000);

  it('x2: beam (organic, greedy-rollout ranked) matches or BEATS the greedy grid', () => {
    const c = ctx('regular-5tribe-x2');
    const greedy = optimize(c)[0].settleTime!;
    const beam = beamSearch(c, { width: 40, maxDepth: 120 });
    expect(beam.settleTime).not.toBeNull();
    // the empty prefix scores exactly the greedy, so the beam can never be worse
    expect(beam.settleTime!).toBeLessThanOrEqual(greedy + 1);
  }, 600000);
});


describe('cranny cap (Nitai) — organic search', () => {
  it('never past L3, never a lone L2', () => {
    const r = beamSearch(ctx('regular-5tribe-x2'), { width: 30, maxDepth: 100 });
    const crannies = r.result.state.slots.filter((s) => s.gid === 23);
    expect(crannies.every((s) => s.level <= 3 && s.level !== 2)).toBe(true);
  }, 300000);
});
