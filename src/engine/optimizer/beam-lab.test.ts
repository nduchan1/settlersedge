/** Beam tuning lab — organic beam vs greedy on the record-pace x2 config. Prints; asserts nothing. */
import { it } from 'vitest';
import { beamSearch } from './beam';
import { greedyContinue, optimize, runStrategy } from './planner';
import { serverPresets } from '../data/servers';
import { Simulation, type SimContext } from '../sim/simulate';

export const RECORD_X2: SimContext = {
  config: serverPresets['regular-5tribe-x2'], tribe: 'gauls',
  mods: { goldProductionBonus: true, plus: false },
  hero: { enabled: false, target: 'all' }, tasks: true, // strength hero (raid meta), auto-respec
  gold: { budget: 600, npc: true, instantFinishMin: 1 },
  oasisRaids: { count: 15, firstAtH: 1, distance: 3, tricklePerHour: 2500 },
  adventures: true,
};

it('lab: greedyContinue from a fresh sim reproduces runStrategy', () => {
  const g = runStrategy({ fieldTarget: 3, townHall: true, cpEarly: 14, finishMin: 1 }, RECORD_X2);
  const sim = new Simulation({ ...RECORD_X2, gold: { ...RECORD_X2.gold!, instantFinishMin: 1 } });
  const c = greedyContinue(sim, { fieldTarget: 3, townHall: true, cpEarly: 14, finishMin: 1 });
  const cl = greedyContinue(new Simulation({ ...RECORD_X2, gold: { ...RECORD_X2.gold!, instantFinishMin: 1 } }).clone(), { fieldTarget: 3, townHall: true, cpEarly: 14, finishMin: 1 });
  console.log(`runStrategy ${(g.settleTime! / 3600).toFixed(2)}h | greedyContinue(fresh) ${c ? (c / 3600).toFixed(2) + 'h' : 'null'} | greedyContinue(clone) ${cl ? (cl / 3600).toFixed(2) + 'h' : 'null'}`);
  // state diff: same params, fresh vs clone
  const P = { fieldTarget: 3, townHall: true, cpEarly: 14, finishMin: 1 };
  const mk = () => new Simulation({ ...RECORD_X2, gold: { ...RECORD_X2.gold!, instantFinishMin: 1 } });
  const A = mk(); greedyContinue(A, P);
  const B = mk().clone(); greedyContinue(B, P);
  const dump = (s: Simulation) => `t=${(s.state.time / 3600).toFixed(1)}h cp=${s.state.cp.toFixed(0)} settlers=${s.state.settlers} gold=${s.state.goldSpent} slots=${s.state.slots.length} res=${Math.round(s.state.res.wood)}/${Math.round(s.state.res.clay)} bank=${s.state.taskBank.toFixed(0)} xp=${s.state.xp.toFixed(0)}`;
  console.log('FRESH:', dump(A));
  console.log('CLONE:', dump(B));
});

it('lab: RECORD HUNT x3 (record 17:08:02) — organic beam wide', () => {
  const c: SimContext = {
    ...RECORD_X2, config: serverPresets['regular-5tribe-x3'],
    gold: { budget: 1000, npc: true, instantFinishMin: 1 },
    oasisRaids: { count: 15, firstAtH: 1, distance: 3, tricklePerHour: 4800 },
  };
  const g = optimize(c)[0];
  const t0 = Date.now();
  const b = beamSearch(c, { width: 120, maxDepth: 150 });
  const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const parties = (r: { events: { type: string; time: number; cp?: number }[] }) =>
    r.events.filter((e) => e.type === 'celebration').map((e) => `${(e.time / 3600).toFixed(1)}h+${Math.round(e.cp!)}`).join(',');
  console.log(`X3 GREEDY ${fmt(g.settleTime!)} parties[${parties(g.result)}] gold ${g.result.state.goldSpent}`);
  console.log(`X3 BEAM   ${fmt(b.settleTime!)} (${((Date.now() - t0) / 1000).toFixed(0)}s) parties[${parties(b.result)}] gold ${b.result.state.goldSpent} | RECORD 17:08:02`);
  console.log('X3 BEAM opening:', b.actions.map((a) => a.kind === 'field' ? `f${a.gid}` : a.kind === 'up' ? `${a.gid}+${a.levels}` : a.kind === 'new' ? `new${a.gid}` : a.kind).join(' '));
}, 900000);

it('lab: advanced start x10 — greedy vs beam', () => {
  const c: SimContext = { ...RECORD_X2, config: serverPresets['local-6tribe-x10-advstart'] };
  const g = optimize(c);
  console.log('ADV greedy top3:', g.slice(0, 3).map((o) => `${JSON.stringify(o.params)} ${o.settleTime ? (o.settleTime / 3600).toFixed(1) + 'h' : 'null'} ${o.error ? 'ERR' : ''}`).join(' | '));
  const b = beamSearch(c, { width: 40, maxDepth: 80 });
  console.log('ADV beam:', b.settleTime ? (b.settleTime / 3600).toFixed(1) + 'h' : 'null', b.actions.map((a) => a.kind === 'up' ? `${a.gid}+${a.levels}` : a.kind === 'new' ? `new${a.gid}` : a.kind === 'field' ? `f${a.gid}` : a.kind).join(' '));
}, 600000);

it('lab: beam vs greedy on record x2', () => {
  const t0 = Date.now();
  const greedy = optimize(RECORD_X2)[0];
  const tg = Date.now() - t0;
  const t1 = Date.now();
  const beam = beamSearch(RECORD_X2, { width: 60, maxDepth: 200, onProgress: (d, best, s) => {
    if (d % 10 === 0 && s) console.log(`  d${d} best=${best ? (best / 3600).toFixed(1) + 'h' : '—'} front=${s.frontier} res=${s.maxRes} th=${s.maxTh} t=${s.maxTimeH.toFixed(1)}h`);
  } });
  const tb = Date.now() - t1;
  const parties = (r: { events: { type: string; time: number; cp?: number }[] }) =>
    r.events.filter((e) => e.type === 'celebration').map((e) => `${(e.time / 3600).toFixed(1)}h+${Math.round(e.cp!)}`).join(',');
  console.log(`GREEDY ${(greedy.settleTime! / 3600).toFixed(2)}h (${tg}ms) parties[${parties(greedy.result)}] gold ${greedy.result.state.goldSpent}`);
  console.log(`BEAM   ${beam.settleTime ? (beam.settleTime / 3600).toFixed(2) + 'h' : 'null'} (${tb}ms, ${beam.nodesExpanded} nodes) parties[${parties(beam.result)}] gold ${beam.result.state.goldSpent}`);
  console.log('BEAM actions:', beam.actions.map((a) => a.kind === 'field' ? `f${a.gid}` : a.kind === 'up' ? `${a.gid}+${a.levels}` : a.kind === 'new' ? `new${a.gid}` : a.kind).join(' '));
}, 600000);
