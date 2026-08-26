/** Reproduction of Nitai's friend's config: Huns x3, 26 oases, 0.3 contest, first clear 1h,
 *  distance 10, hero NOT producing (full strength). Record: ~18h. Ultra gives ~35.5h. */
import { it } from 'vitest';
import { beamSearch } from './beam';
import { optimize } from './planner';
import { serverPresets } from '../data/servers';
import { oasisTricklePerHour } from '../data/oases';
import type { SimContext } from '../sim/simulate';

export const HUN_X3: SimContext = {
  config: serverPresets['regular-5tribe-x3'], tribe: 'huns',
  mods: { goldProductionBonus: true, plus: false },
  hero: { enabled: false, target: 'all' }, tasks: true, // strength hero; auto Book-respec after last clear
  gold: { budget: 600, npc: true, instantFinishMin: Infinity },
  oasisRaids: { count: 26, firstAtH: 1, distance: 10,
    tricklePerHour: oasisTricklePerHour({ oases: 26, contest: 0.3, firstClearH: 1 }, 3) },
  adventures: true,
};
const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;

it('hun x3 baseline', () => {
  const g = optimize(HUN_X3)[0];
  const b = beamSearch(HUN_X3, { width: 60, maxDepth: 120 });
  const st = b.result.state;
  const ev = b.result.events;
  const income = (t: string) => ev.filter((e) => e.type === t && e.gain).reduce((a, e) => a + e.gain!.wood * 4, 0);
  console.log(`GREEDY ${fmt(g.settleTime!)} | BEAM ${fmt(b.settleTime!)} | trickle cap ${HUN_X3.oasisRaids!.tricklePerHour}/h`);
  console.log(`beam: gold ${st.goldSpent} raiders ${st.raiders} parties ${ev.filter((e) => e.type === 'celebration').map((e) => (e.time / 3600).toFixed(1) + 'h').join(',')}`);
  console.log(`income by source (total res): tasks ${income('task')} oasis-clears ${income('oasis')} adventures ${income('adventure')}`);
  const set = ev.filter((e) => e.type === 'settlers').map((e) => (e.time / 3600).toFixed(1) + 'h');
  const res10 = ev.find((e) => e.type === 'complete' && e.gid === 25 && e.level === 10);
  console.log(`residence10 at ${res10 ? (res10.time / 3600).toFixed(1) + 'h' : '—'} settlers ready ${set.join(',')} cp at end ${st.cp.toFixed(0)}`);
  console.log('opening:', b.actions.slice(0, 14).map((a) => a.kind === 'field' ? `f${a.gid}` : a.kind === 'up' ? `${a.gid}+${a.levels}` : a.kind === 'new' ? `new${a.gid}` : a.kind === 'raiders' ? `raid${a.count}` : a.kind).join(' '));
}, 600000);
