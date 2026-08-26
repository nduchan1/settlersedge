/** Expected values = the official CP table verbatim (KB art. 51, captured in research/03 & /05). */
import { describe, expect, it } from 'vitest';
import { advancedStartCp, cpThreshold } from './culture';
import type { ServerSpeed } from '../types';

// village → [x1, x2, x3, x5, x10]
const official: Record<number, [number, number, number, number, number]> = {
  2: [2000, 800, 500, 300, 200],
  3: [8000, 3900, 2600, 1600, 800],
  4: [20000, 10000, 6700, 4000, 2000],
  5: [39000, 19400, 12900, 7800, 3900],
  6: [65000, 32400, 21600, 13000, 6500],
  7: [99000, 49300, 32900, 19700, 9900],
  8: [141000, 70300, 46900, 28100, 14100],
  9: [191000, 95500, 63700, 38200, 19100],
  10: [251000, 125300, 83500, 50100, 25100],
  11: [319000, 159600, 106400, 63800, 31900],
  12: [397000, 198700, 132500, 79500, 39700],
  13: [486000, 242800, 161900, 97100, 48600],
  14: [584000, 291800, 194600, 116700, 58400],
  15: [692000, 346100, 230700, 138400, 69200],
  16: [811000, 405600, 270400, 162200, 81100],
  17: [941000, 470500, 313700, 188200, 94100],
  18: [1082000, 540900, 360600, 216400, 108200],
  19: [1234000, 616900, 411300, 246800, 123400],
  20: [1397000, 698600, 465700, 279400, 139700],
  25: [2391000, 1195600, 797000, 478200, 239100],
  30: [3695000, 1847600, 1231700, 739000, 369500],
  40: [7304000, 3652100, 2434700, 1460800, 730400],
  50: [12347000, 6173600, 4115800, 2469500, 1234700],
};
const speeds: ServerSpeed[] = [1, 2, 3, 5, 10];

describe('cpThreshold reproduces the official table', () => {
  for (const [village, row] of Object.entries(official)) {
    it(`village ${village}`, () => {
      speeds.forEach((s, i) => expect(cpThreshold(Number(village), s)).toBe(row[i]));
    });
  }
  it('village 1 is free', () => speeds.forEach((s) => expect(cpThreshold(1, s)).toBe(0)));
});

describe('Advanced Start CP grant', () => {
  it('x2 worked example: 75% of v3→v4 difference ⇒ 1525 CP remaining for v4', () => {
    // official example (research/05): CP4−(CP3+grant beyond v3) = 1525 on x2
    expect(cpThreshold(4, 2) - advancedStartCp(2)).toBe(1525);
  });
});
