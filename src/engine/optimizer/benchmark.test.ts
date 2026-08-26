import { it } from 'vitest';
import { optimize } from './planner';
import { serverPresets } from '../data/servers';
import type { SimContext } from '../sim/simulate';

const base = (preset: string): Omit<SimContext, 'oasisRaids' | 'gold'> => ({
  config: serverPresets[preset], tribe: 'gauls',
  mods: { allianceRecruitment: 0, goldProductionBonus: true, plus: false },
  hero: { enabled: false, target: 'all' }, tasks: true, // strength hero (raid meta), auto-respec
});

const CASES: { name: string; ctx: SimContext; benchmark: string }[] = [
  {
    name: 'x3 defaults (600g, casual raiding)',
    ctx: { ...base('regular-5tribe-x3'), gold: { budget: 600, npc: true, instantFinishMin: Infinity },
      oasisRaids: { count: 6, firstAtH: 3, distance: 3, tricklePerHour: 50 } },
    benchmark: 'record 17:08 / community fast ~17-18h',
  },
  {
    name: 'x3 RECORD config (1000g, hero-loop+steppes ~3.2k/h, 12 clears, adventures)',
    ctx: { ...base('regular-5tribe-x3'), gold: { budget: 1000, npc: true, instantFinishMin: Infinity },
      // front-loaded, x3-scaled income: oasis regen runs at server speed; Saesenthessi's x2 curve
      // (50-55k by 7-10h) scaled ×1.5 → ~15 clears × 3600 in the first ~9h, then sustained loop
      oasisRaids: { count: 15, firstAtH: 1, distance: 3, tricklePerHour: 4800 },
      adventures: true },
    benchmark: 'record 17:08 / community fast ~17-18h',
  },
  {
    name: 'x2 RECORD config (same, Saesenthessi-grade income, adventures)',
    ctx: { ...base('regular-5tribe-x2'), gold: { budget: 1000, npc: true, instantFinishMin: Infinity },
      // documented shape: 50-55k robbed by 7-10h (burst clears), 110-120k total by ~34h (trickle)
      oasisRaids: { count: 15, firstAtH: 1, distance: 3, tricklePerHour: 2500 },
      adventures: true },
    benchmark: 'record 27:57 / Saesenthessi plan ~32-36h (110-120k robbed by then)',
  },
  // NOTE: the "task rewards scale ×speed" hypothesis was REFUTED in-game (Nitai, x2 qualifiers,
  // 2026-08-13): MB L1 paid 261/17 and RP L1 paid 130/8 — exactly base × 1.74 (hero-level-38
  // bonus), no ×2 anywhere. The remaining x2 record gap is income scale + micro, not a hidden rule.
  {
    name: 'x1 Caim-grade sim (600g, moderate hero raiding ~800/h, adventures)',
    ctx: { ...base('regular-3tribe-x1'), gold: { budget: 600, npc: true, instantFinishMin: Infinity },
      oasisRaids: { count: 8, firstAtH: 4, distance: 4, tricklePerHour: 800 },
      adventures: true },
    benchmark: 'Caim envelope <95-130h / record 76:41',
  },
];

it('benchmark matrix vs community plans', () => {
  for (const c of CASES) {
    const best = optimize(c.ctx)[0];
    const ev = best.result.events;
    const parties = ev.filter((e) => e.type === 'celebration').map((p) => `${(p.time / 3600).toFixed(1)}h+${Math.round(p.cp!)}`);
    const st = best.result.state;
    console.log(`${c.name}
    → settle ${(best.settleTime! / 3600).toFixed(1)}h | ${c.benchmark}
    params ${JSON.stringify(best.params)} | gold ${st.goldSpent} (${st.npcExchanges}npc/${st.instantFinishes}inst) | parties [${parties.join(', ')}]`);
  }
}, 240000);

