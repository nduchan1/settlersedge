/** TEMP diagnostic: Nitai reports Gaul x3 does BETTER with 20 oases than 30 in the UI.
 *  Sweep count with the UI's own trickle formula (cap grows with count) — settle time should
 *  monotonically improve with count if the model is sane. Log respec/fleet to see why not. */
import { it } from 'vitest';
import { optimize } from './planner';
import { beamSearch } from './beam';
import { serverPresets } from '../data/servers';
import { oasisTricklePerHour } from '../data/oases';
import type { SimContext } from '../sim/simulate';

const ctxFor = (count: number): SimContext => ({
  config: serverPresets['regular-5tribe-x3'], tribe: 'gauls',
  mods: { goldProductionBonus: true, plus: true },
  hero: { enabled: false, target: 'all' }, tasks: true,
  gold: { budget: 500, npc: true, instantFinishMin: Infinity },
  oasisRaids: { count, firstAtH: 1, distance: 5.42,
    tricklePerHour: oasisTricklePerHour({ oases: count, contest: 1.0, firstClearH: 1 }, 3) },
  adventures: true,
});
const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;

it('oasis count sweep', () => {
  for (const count of [15, 20, 25, 30, 33]) {
    const ctx = ctxFor(count);
    const g = optimize(ctx)[0];
    const ev = g.result.events;
    const st = g.result.state;
    const respec = ev.find((e) => e.label.startsWith('Book of Wisdom'));
    const clears = ev.filter((e) => e.type === 'oasis' && e.label.startsWith('oasis raid')).length;
    const clearedPacks = st.oasisPacks.filter((v) => v <= 0).length;
    console.log(`n=${count} cap=${ctx.oasisRaids!.tricklePerHour}/h GREEDY ${fmt(g.settleTime!)} | respec ${respec ? (respec.time / 3600).toFixed(1) + 'h' : '—'} | hits ${clears} cleared ${clearedPacks}/${count} | fleet inf ${st.raiders} cav ${st.cavalry} gold ${st.goldSpent}`);
  }
  for (const count of [20, 30]) {
    const ctx = ctxFor(count);
    const b = beamSearch(ctx, { width: 60, maxDepth: 120 });
    const st = b.result.state;
    const respec = b.result.events.find((e) => e.label.startsWith('Book of Wisdom'));
    const clearedPacks = st.oasisPacks.filter((v) => v <= 0).length;
    console.log(`n=${count} BEAM ${fmt(b.settleTime!)} | respec ${respec ? (respec.time / 3600).toFixed(1) + 'h' : '—'} | cleared ${clearedPacks}/${count} | fleet inf ${st.raiders} cav ${st.cavalry} gold ${st.goldSpent}`);
  }
}, 900000);
