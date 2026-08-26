import { describe, expect, it } from 'vitest';
import { optimize, runStrategy } from './planner';
import { serverPresets } from '../data/servers';
import type { SimContext } from '../sim/simulate';

const ctx = (preset: string, tribe = 'gauls' as const): SimContext => ({
  config: serverPresets[preset],
  tribe,
  mods: { allianceRecruitment: 0, goldProductionBonus: false, plus: false },
  hero: { enabled: true, target: 'all' },
  tasks: true,
});

const h = (s: number) => s / 3600;

describe('runStrategy produces a valid settle plan', () => {
  it('x1 gauls: settles inside the no-raid/no-gold baseline window', () => {
    const o = runStrategy({ fieldTarget: 5, townHall: true, cpEarly: 14, finishMin: Infinity }, ctx('regular-3tribe-x1'));
    expect(o.error).toBeUndefined();
    expect(o.settleTime).not.toBeNull();
    expect(h(o.settleTime!)).toBeGreaterThan(76); // HoF record (raid+gold) is 76h — we must be slower
    expect(h(o.settleTime!)).toBeLessThan(15 * 24); // baseline sanity ceiling; tuning tracked separately
  });
});

describe('optimize', () => {
  it('x2: grid best beats the naive fields-0/no-TH/no-early-CP plan', () => {
    const outcomes = optimize(ctx('regular-5tribe-x2'), { fieldTargets: [0, 3, 5], cpEarly: [0, 8] });
    const best = outcomes[0];
    const naive = outcomes.find((o) => o.params.fieldTarget === 0 && !o.params.townHall && o.params.cpEarly === 0)!;
    expect(best.settleTime).not.toBeNull();
    expect(best.settleTime!).toBeLessThan(naive.settleTime ?? Infinity);
    expect(h(best.settleTime!)).toBeLessThan(24 * 8);
  });
  it('advanced-start x10: settle wait is short and CP-bound', () => {
    const outcomes = optimize(ctx('local-6tribe-x10-advstart'), { fieldTargets: [0], townHall: [false], cpEarly: [0, 8] });
    expect(outcomes[0].error).toBeUndefined();
    expect(outcomes[0].settleTime).not.toBeNull();
    expect(h(outcomes[0].settleTime!)).toBeLessThan(72);
  });
});

describe('cranny cap (Nitai): never past L3; L2 only en route to L3', () => {
  it('greedy plans never leave a cranny at L2 or push one past L3', () => {
    const c = ctx('regular-5tribe-x2');
    for (const o of optimize(c).slice(0, 5)) {
      const crannies = o.result.state.slots.filter((s) => s.gid === 23);
      expect(crannies.every((s) => s.level <= 3)).toBe(true);
      expect(crannies.every((s) => s.level !== 2)).toBe(true);
    }
  });
});
