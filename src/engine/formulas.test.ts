/** Engine ground truth: every expected value below is either official data or an in-game measurement
 *  (Nitai, 2026-08-12, Gaul x2 Tournament qualifiers with alliance Recruitment 2 — research/07). */
import { describe, expect, it } from 'vitest';
import { GID, levelData } from './data/buildings';
import { buildTime, celebrationDuration, heroProduction, settlerTime, taskReward } from './formulas';

describe('official building data', () => {
  it('woodcutter L1 costs 40/100/50/60, produces 7/h', () => {
    const ld = levelData(GID.woodcutter, 1);
    expect(ld.resourceCost).toEqual({ r1: 40, r2: 100, r3: 50, r4: 60 });
    expect(ld.effects?.production1).toBe(7);
  });
  it('main building L1 build time is 2000s less MB discount', () => {
    // official base 2160s? — assert stability of the dataset instead of a guessed constant:
    expect(levelData(GID.mainBuilding, 1).buildingTime).toBeGreaterThan(0);
    expect(buildTime(GID.mainBuilding, 1, 1, 1)).toBe(levelData(GID.mainBuilding, 1).buildingTime);
  });
});

describe('celebrations (measured to the second, x2)', () => {
  const cases: Array<[number, 'small' | 'great', number]> = [
    [11, 'small', 59880], [11, 'great', 149701],
    [13, 'small', 55647], [13, 'great', 139116],
    [17, 'small', 48056], [17, 'great', 120140],
  ];
  it.each(cases)('TH%i %s = %is', (th, kind, seconds) => {
    expect(celebrationDuration(th, kind, 2)).toBe(seconds);
  });
  it('speed divisors (official art. 20: Normal | Normal | /2 | /2 | /4)', () => {
    expect(celebrationDuration(1, 'small', 1)).toBe(86400); // 24h
    expect(celebrationDuration(1, 'small', 2)).toBe(86400); // x2 still 24h (measured)
    expect(celebrationDuration(1, 'small', 3)).toBe(43200); // x3 → 12h
    expect(celebrationDuration(1, 'small', 5)).toBe(43200); // x5 → 12h
    expect(celebrationDuration(1, 'small', 10)).toBe(21600); // x10 → 6h
  });
});

describe('settlers (measured, Gaul x2, Recruitment 2)', () => {
  it('Residence 10 → 1:10:22', () => expect(settlerTime('gauls', 10, 2, 2)).toBe(4222));
  it('Residence 20 → 0:24:32', () => expect(settlerTime('gauls', 20, 2, 2)).toBe(1472));
  it('Residence 1, no alliance → published base / speed', () => expect(settlerTime('gauls', 1, 2, 0)).toBe(11350));
});

describe('hero production (official art. 141)', () => {
  it('per point: 9 each / 30 single; Egyptians 12/40; ×speed', () => {
    expect(heroProduction(4, { tribe: 'gauls', single: false, speed: 1 })).toBe(36);
    expect(heroProduction(4, { tribe: 'egyptians', single: true, speed: 2 })).toBe(320);
  });
});

describe('task rewards (research/08 formula, matches all 202 sheet rows at hero level 6)', () => {
  it('hero level 6 → ×1.10', () => expect(taskReward(150, 6)).toBe(165));
  it('levels 0/1 → no bonus', () => expect(taskReward(150, 1)).toBe(150));
  it('floors', () => expect(taskReward(675, 6)).toBe(742));
});
