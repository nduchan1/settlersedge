/** CALIBRATION: reproduction of Nitai's OWN live x3 run (Gauls) from the farm-list screenshots:
 *  33 oases, mean dist 5.42 (nearest 1–1.4, farthest 9.2), contest ≈1 (their 4,000/h estimate),
 *  hero full strength → real team respeced at 7h, settled at 24:33 with 105k total raided. */
import { it } from 'vitest';
import { beamSearch } from './beam';
import { optimize } from './planner';
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

it('gaul real-run reproduction', () => {
  const g = optimize(CTX)[0];
  const b = beamSearch(CTX, { width: 60, maxDepth: 120 });
  const st = b.result.state;
  const ev = b.result.events;
  const income = (t: string) => ev.filter((e) => e.type === t && e.gain).reduce((a, e) => a + e.gain!.wood * 4, 0);
  const respec = ev.find((e) => e.label.startsWith('Book of Wisdom'));
  console.log(`REAL 24:33 (105k raided, respec 7h) | GREEDY ${fmt(g.settleTime!)} | BEAM ${fmt(b.settleTime!)} | trickle cap ${CTX.oasisRaids!.tricklePerHour}/h`);
  console.log(`beam: gold ${st.goldSpent} raiders ${st.raiders} cav ${st.cavalry} respec ${respec ? (respec.time / 3600).toFixed(1) + 'h' : '—'}`);
  console.log(`income: oasis-clears ${income('oasis')} tasks ${income('task')} adventures ${income('adventure')}`);
}, 600000);
