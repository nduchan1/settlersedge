/** HEAD-TO-HEAD benchmark: the alliance guide ("Task tab v2", x3 Huns/Gauls) vs the organic
 *  pipeline (greedy grid → plan-space search over complete plans), on Nitai's real Gaul x3 map and
 *  the friend's Hun x3 map. Log-only (timings are machine-dependent); run on demand. */
import { it } from 'vitest';
import { Simulation, type SimContext } from '../sim/simulate';
import { serverPresets } from '../data/servers';
import { oasisTricklePerHour } from '../data/oases';
import { allianceGuideX3 } from './guides';
import { optimize } from './planner';
import { runPipeline } from './pipeline';

const mk = (tribe: 'gauls' | 'huns', count: number, distance: number, contest: number, budget: number): SimContext => ({
  config: serverPresets['regular-5tribe-x3'], tribe, mods: { goldProductionBonus: true, plus: true },
  hero: { enabled: false, target: 'all' }, tasks: true, gold: { budget, npc: true, instantFinishMin: Infinity },
  oasisRaids: { count, firstAtH: 1, distance, tricklePerHour: oasisTricklePerHour({ oases: count, contest, firstClearH: 1 }, 3) },
  adventures: true,
});
const fmt = (s: number | null | undefined) => (s == null || !Number.isFinite(s) ? 'fail' : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`);

it('alliance guide vs organic pipeline', () => {
  for (const [name, ctx] of [['gaul-real', mk('gauls', 33, 5.42, 1.0, 500)], ['hun-x3', mk('huns', 26, 10, 0.3, 600)]] as const) {
    let bestGuide = Infinity; let tag = '';
    for (const twoParty of [true, false]) for (const fm of [Infinity, 15, 5]) for (const book of [undefined, 7]) {
      try {
        const sim = new Simulation({ ...ctx, gold: { ...ctx.gold!, instantFinishMin: fm }, hero: { ...ctx.hero, respecAtH: book } });
        allianceGuideX3(sim, { twoParty, horses: 14 });
        const t = sim.finish().settleTime ?? Infinity;
        if (t < bestGuide) { bestGuide = t; tag = `${twoParty ? 2 : 1}-party fm=${fm} book=${book ?? 'auto'}`; }
      } catch { /* variant infeasible */ }
    }
    let t0 = performance.now();
    const grid = optimize(ctx);
    const gridS = (performance.now() - t0) / 1000;
    const line = [`${name}: GUIDE ${fmt(bestGuide)} (${tag}) | GREEDY ${fmt(grid[0].settleTime)}`];
    for (const [mode, iters] of [['fast', 1500], ['deep', 6000], ['ultra', 25000]] as const) {
      t0 = performance.now();
      const r = runPipeline(ctx, iters, { grid });
      line.push(`${mode} ${fmt(r.search?.settleTime ?? grid[0].settleTime)} (${(gridS + (performance.now() - t0) / 1000).toFixed(0)}s, from ${r.search?.seedLabel ?? 'greedy'})`);
    }
    console.log(line.join(' | '));
  }
}, 3600000);

it('more oases never hurts (deep budget)', () => {
  const out: string[] = [];
  for (const n of [20, 30]) {
    const r = runPipeline(mk('gauls', n, 5.42, 1.0, 500), 6000);
    out.push(`n=${n}: ${fmt(r.search?.settleTime ?? r.grid[0].settleTime)}`);
  }
  console.log('SWEEP ' + out.join(' | '));
}, 3600000);
