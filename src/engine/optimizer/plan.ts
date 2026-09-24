/** Plan-space local search (PLS) — the organic search's say over the WHOLE race.
 *
 *  Why: the beam scores every candidate as "its searched moves + the greedy phase script to the
 *  end", so a mid-game idea that needs several coordinated moves loses before it is complete — the
 *  measured winner was 2 searched moves followed by ~200 scripted ones. PLS instead edits the
 *  COMPLETE order list of a finished plan: move an order earlier/later, move a block, delete,
 *  insert, swap, change a batch size, the gold policy or the book hour — and replays the whole race
 *  to score every edit. Nothing is scripted except the endgame completion (greedy CP push) that
 *  guarantees every edited plan still reaches the settle.
 *
 *  Order lists come from RECORDED runs (Simulation.recorder): the greedy's best plan, the beam's
 *  plan and hand-written guides (./guides.ts) — seeds only; the search keeps whatever wins. */
import { GID, building, buildings, levelData, raceMaxLevel, wallGid } from '../data/buildings';
import { tribes } from '../data/tribes';
import { cavalryRaiders, raiders } from '../data/raiders';
import {
  CELEBRATION_COST, MAX_BUILDING_SLOTS, MULTI_BUILD_UNLOCK, OWN_SLOT_GIDS, Simulation, addSlot, buildingSlotsUsed, settleGoal,
  canAddBuilding, type PlanOrder, type SimContext, type SimResult,
} from '../sim/simulate';
import { greedyContinue, type StrategyParams } from './planner';
import type { Resources, Tribe } from '../types';

export type { PlanOrder };

export interface PlanSeed { orders: PlanOrder[]; params: StrategyParams; label: string }
export interface PlanSearchResult {
  orders: PlanOrder[];
  params: StrategyParams;
  settleTime: number | null;
  result: SimResult;
  seedLabel: string;
  evaluations: number;
  improvements: number;
}

type Prereq = { type: string; gid?: number[] | number; level?: number };

// ---------------------------------------------------------------------------------------------
// Replay layer: execute one recorded order, enforcing the game's legality rules
// ---------------------------------------------------------------------------------------------

class Illegal extends Error {}

function maxOrdered(sim: Simulation, gid: number): number {
  let m = 0;
  sim.state.slots.forEach((sl, i) => { if (sl.gid === gid) m = Math.max(m, sim.orderedLevel(i)); });
  return m;
}

/** Raise Warehouse / Granary only when this exact cost cannot be stored (the order list already
 *  carries the plan's own storage decisions — no speculative storage here). */
function fitFor(sim: Simulation, cost: Resources): void {
  for (let guard = 0; guard < 25; guard++) {
    const caps = sim.orderedCaps(); // queued storage counts
    const needWh = Math.max(cost.wood, cost.clay, cost.iron) > caps.warehouse;
    const needGr = cost.crop > caps.granary;
    if (!needWh && !needGr) return;
    const gid = needWh ? GID.warehouse : GID.granary;
    let idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
    if (idx === -1) {
      if (buildingSlotsUsed(sim.state) >= MAX_BUILDING_SLOTS) throw new Illegal('no slot for storage');
      idx = addSlot(sim.state, gid);
    }
    if (sim.orderedLevel(idx) >= building(gid).maxLevel) throw new Illegal('storage maxed');
    sim.build(idx);
  }
  throw new Illegal('storage loop');
}

const costOf = (gid: number, lvl: number): Resources => {
  const r = levelData(gid, lvl).resourceCost;
  return { wood: r.r1, clay: r.r2, iron: r.r3, crop: r.r4 };
};

/** Can a NEW instance of `gid` be placed now (ordered-level prerequisites, slot cap, multi-build)?
 *  Returns 'await' when the only blocker is an ordered-but-unfinished unlock level. */
function placement(sim: Simulation, gid: number): 'ok' | 'await' | 'no' {
  if (gid <= 4 || !placeableSet(sim.ctx.tribe).has(gid)) return 'no'; // own tribe only, no WW/greats
  const present = sim.state.slots.some((sl) => sl.gid === gid);
  if (!OWN_SLOT_GIDS.has(gid) && buildingSlotsUsed(sim.state) >= MAX_BUILDING_SLOTS) return 'no';
  for (const p of building(gid).prerequisites as Prereq[]) {
    if (p.type === 'Building' && p.gid) {
      const alts = Array.isArray(p.gid) ? p.gid : [p.gid];
      if (!alts.some((g) => maxOrdered(sim, g) >= (p.level ?? 1))) return 'no';
    } else if (p.type === 'NotBuilding' && p.gid !== undefined) {
      const alts = Array.isArray(p.gid) ? p.gid : [p.gid];
      if (alts.some((g) => sim.state.slots.some((sl) => sl.gid === g))) return 'no';
    }
  }
  if (!present) return 'ok';
  const need = MULTI_BUILD_UNLOCK[gid];
  if (need === undefined) return 'no';
  if (canAddBuilding(sim.state, gid)) return 'ok';
  return maxOrdered(sim, gid) >= need ? 'await' : 'no';
}

/** Execute one order. Throws Illegal (or a sim error) when the game would not allow it here. */
export function execOrder(sim: Simulation, o: PlanOrder): void {
  switch (o.k) {
    case 'b': {
      const idxs: number[] = [];
      sim.state.slots.forEach((sl, j) => { if (sl.gid === o.gid) idxs.push(j); });
      let idx: number;
      if (o.i < idxs.length) idx = idxs[o.i];
      else if (o.i === idxs.length) {
        const pl = placement(sim, o.gid);
        if (pl === 'no') throw new Illegal(`cannot place gid ${o.gid}`);
        if (pl === 'await') sim.awaitLevel(o.gid, MULTI_BUILD_UNLOCK[o.gid]); // like a player waiting for the L10 cranny
        idx = addSlot(sim.state, o.gid);
      } else throw new Illegal(`instance ${o.i} of gid ${o.gid} out of order`);
      const target = sim.orderedLevel(idx) + 1;
      if (target > raceMaxLevel(o.gid)) throw new Illegal('max level');
      fitFor(sim, costOf(o.gid, target));
      sim.build(idx);
      return;
    }
    case 'party': {
      if (maxOrdered(sim, GID.townHall) < 1) throw new Illegal('party without Town Hall');
      sim.awaitLevel(GID.townHall, 1);
      fitFor(sim, CELEBRATION_COST.small);
      sim.celebration(false);
      return;
    }
    case 'settler': fitFor(sim, tribes[sim.ctx.tribe].settlerCost); sim.trainSettlers(1); return;
    case 'raid': fitFor(sim, raiders[sim.ctx.tribe].cost); sim.trainRaiders(o.n); return;
    case 'cav': {
      const cav = cavalryRaiders[sim.ctx.tribe];
      if (!cav) throw new Illegal('no cavalry');
      fitFor(sim, cav.cost); sim.trainCavalry(o.n); return;
    }
    case 'research': {
      const cav = cavalryRaiders[sim.ctx.tribe];
      if (!cav) throw new Illegal('no cavalry');
      fitFor(sim, cav.research); sim.researchCavalry(); return;
    }
    case 'book': sim.bookRespec(); return;
  }
}

// ---------------------------------------------------------------------------------------------
// Contexts, starts, scoring
// ---------------------------------------------------------------------------------------------

function ctxFor(base: SimContext, p: StrategyParams): SimContext {
  let c: SimContext = base.gold ? { ...base, gold: { ...base.gold, instantFinishMin: p.finishMin } } : base;
  c = { ...c, hero: { ...c.hero, respecAtH: p.respecAtH } };
  return c;
}

interface Env {
  base: SimContext;
  startSim?: Simulation; // mid-race re-plan: every replay starts from a clone of this state
}

function freshStart(env: Env, p: StrategyParams, full: boolean): Simulation {
  if (env.startSim) {
    const s = env.startSim.clone();
    if (env.base.gold && s.ctx.gold) s.ctx = { ...s.ctx, gold: { ...s.ctx.gold, instantFinishMin: p.finishMin } };
    if (full) s.enableRecording();
    return s;
  }
  const s = new Simulation(ctxFor(env.base, p));
  return full ? s : s.clone();
}

const scoreOf = (t: number | null | undefined): number => (t === null || t === undefined || !Number.isFinite(t) ? Infinity : t);

/** Run `orders[from..]` on `sim`, then complete the race. Orders once the settle is reached are
 *  dead and skipped (so the canonical list drops them). The completion owns NO troop decisions
 *  (raiders:false) — the list does; otherwise it re-buys deleted troops and the list keeps growing. */
export function runFrom(sim: Simulation, orders: PlanOrder[], from: number, params: StrategyParams, ckpt?: Simulation[]): number {
  for (let j = from; j < orders.length; j++) {
    if (sim.hasSettled()) break;
    if (ckpt) ckpt[j] = sim.clone();
    execOrder(sim, orders[j]);
  }
  // once every settler is ordered the LIST owns the plan (a guide scores as the guide, not guide +
  // greedy endgame); only an unfinished list is completed by the greedy (CP push, no troops)
  const goal = settleGoal(sim.ctx.config).settlers;
  if (sim.state.settlers + sim.queuedSettlers() < goal) {
    const t = greedyContinue(sim, { ...params, raiders: false });
    if (t === null && sim.deadline !== undefined && sim.state.time > sim.deadline && !sim.hasSettled()) return Infinity;
    if (t !== null) return scoreOf(t);
  }
  if (sim.deadline !== undefined && sim.state.time > sim.deadline && !sim.hasSettled()) return Infinity;
  return scoreOf(sim.finish().settleTime);
}

interface Incumbent { orders: PlanOrder[]; params: StrategyParams; score: number; ckpt: Simulation[]; label: string }

/** Replay a plan (from its first change `p0`, reusing `prev`'s checkpoints before it), record the
 *  canonical order list (storage auto-raises and the completion's own orders included) and index
 *  a checkpoint before every order. */
function materialize(env: Env, orders: PlanOrder[], params: StrategyParams, label: string, prev?: Incumbent, p0 = 0): Incumbent | null {
  try {
    const reuse = !!prev && p0 > 0 && p0 < prev.ckpt.length && prev.params.finishMin === params.finishMin && prev.params.respecAtH === params.respecAtH;
    const start = (): Simulation => {
      if (reuse) return prev!.ckpt[p0].clone(); // carries the recorded prefix
      const s = freshStart(env, params, false);
      s.recorder = [];
      return s;
    };
    const from = reuse ? p0 : 0;
    const ckpt: Simulation[] = reuse ? prev!.ckpt.slice(0, p0) : [];
    const sim = start();
    let score = runFrom(sim, orders, from, params, ckpt);
    const canon = sim.recorder!.slice();
    // checkpoints index the canonical list directly unless a storage order was inserted mid-list
    let aligned = true;
    for (let j = from; j < Math.min(orders.length, ckpt.length) && aligned; j++) if (!canon[j] || !same(canon[j], orders[j])) aligned = false;
    let list = canon;
    if (!aligned) {
      ckpt.length = from;
      const sim2 = start();
      score = runFrom(sim2, canon, from, params, ckpt);
      list = sim2.recorder!.slice(); // the run that was scored
    }
    if (!Number.isFinite(score)) return null;
    return { orders: list, params, score, ckpt: ckpt.slice(0, Math.min(ckpt.length, list.length + 1)), label };
  } catch {
    return null;
  }
}

/** Score an edited plan whose first change is at `p0`, from the incumbent's checkpoint there.
 *  `bound`: stop as soon as the replay provably cannot beat it (sim deadline). */
function evaluate(env: Env, inc: Incumbent, orders: PlanOrder[], params: StrategyParams, p0: number, bound: number): number {
  try {
    const sameParams = params.finishMin === inc.params.finishMin && params.respecAtH === inc.params.respecAtH;
    const from = sameParams && p0 > 0 && p0 < inc.ckpt.length ? p0 : 0;
    const sim = from > 0 ? inc.ckpt[from].clone() : freshStart(env, params, false);
    sim.recorder = undefined;
    sim.deadline = bound;
    return runFrom(sim, orders, from, params);
  } catch {
    return Infinity; // illegal edit, or pruned by the deadline
  }
}

// ---------------------------------------------------------------------------------------------
// Neighborhood
// ---------------------------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Buildings a plan may place (legality only: own tribe's wall/specials, no WW/greats/ports). */
export function placeableGids(tribe: Tribe): number[] {
  const tribeOnly: Record<number, Tribe> = { 35: 'teutons', 36: 'gauls', 41: 'romans', 44: 'huns', 45: 'egyptians', 48: 'spartans' };
  const WALLS = [31, 32, 33, 42, 43, 47];
  return buildings
    .filter((b) => b.gid >= 5 && b.gid <= 48 && ![29, 30, 38, 39, 40, 46].includes(b.gid))
    .filter((b) => !(b.gid in tribeOnly) || tribeOnly[b.gid] === tribe)
    .filter((b) => !WALLS.includes(b.gid) || wallGid(tribe) === b.gid)
    .map((b) => b.gid);
}
const placeableCache = new Map<Tribe, Set<number>>();
function placeableSet(tribe: Tribe): Set<number> {
  let s = placeableCache.get(tribe);
  if (!s) { s = new Set(placeableGids(tribe)); placeableCache.set(tribe, s); }
  return s;
}

function same(a: PlanOrder, b: PlanOrder): boolean {
  if (a.k !== b.k) return false;
  if (a.k === 'b' && b.k === 'b') return a.gid === b.gid && a.i === b.i;
  if ((a.k === 'raid' || a.k === 'cav') && (b.k === 'raid' || b.k === 'cav')) return a.n === b.n;
  return true;
}

/** Smallest level above `from` that raises the building's CP/day (data-derived; 0 if none soon). */
function nextCpGain(gid: number, from: number): number {
  const base = from > 0 ? levelData(gid, from).culturePoints : 0;
  for (let l = from + 1; l <= Math.min(from + 5, raceMaxLevel(gid)); l++) if (levelData(gid, l).culturePoints > base) return l;
  return 0;
}

interface Edit { orders: PlanOrder[]; params: StrategyParams; p0: number; kind: string; score?: number }

interface NbrCtx {
  rng: () => number;
  env: Env;
  placeable: number[];
  finishMins: number[];
  bookHours: (number | undefined)[];
  paramMoves: boolean;
  regenParams: StrategyParams[];
}

function pick<T>(rng: () => number, arr: readonly T[]): T { return arr[Math.floor(rng() * arr.length)]; }

/** Instances present at a checkpoint, as (gid, instance) with their ORDERED level. */
function instancesAt(sim: Simulation): { gid: number; i: number; lvl: number }[] {
  const out: { gid: number; i: number; lvl: number }[] = [];
  const count = new Map<number, number>();
  sim.state.slots.forEach((sl, j) => {
    const i = count.get(sl.gid) ?? 0;
    count.set(sl.gid, i + 1);
    out.push({ gid: sl.gid, i, lvl: sim.orderedLevel(j) });
  });
  return out;
}

/** Orders that build `gid` from scratch including its missing prerequisite closure, in dependency
 *  order (the game's "requires X" list) — one coherent macro instead of 3-6 unlikely single inserts. */
function withPrereqs(sim: Simulation, gid: number): PlanOrder[] | null {
  const out: PlanOrder[] = [];
  const planned = new Map<number, number>(); // gid → ordered level after `out`
  const lvlOf = (g: number) => planned.get(g) ?? maxOrdered(sim, g);
  const countOf = (g: number) => sim.state.slots.filter((sl) => sl.gid === g).length;
  const need = (g: number, level: number, depth: number): boolean => {
    if (depth > 6) return false;
    if (lvlOf(g) >= level) return true;
    for (const p of building(g).prerequisites as Prereq[]) {
      if (p.type !== 'Building' || p.gid === undefined) continue;
      const alts = Array.isArray(p.gid) ? p.gid : [p.gid];
      if (alts.some((a) => lvlOf(a) >= (p.level ?? 1))) continue;
      if (!need(alts[0], p.level ?? 1, depth + 1)) return false;
    }
    if (g <= 4 || !placeableSet(sim.ctx.tribe).has(g)) return false;
    for (let l = lvlOf(g) + 1; l <= level; l++) out.push({ k: 'b', gid: g, i: 0 });
    if (countOf(g) > 1) return false; // multi-instance prerequisites are out of scope for the macro
    planned.set(g, level);
    return true;
  };
  return need(gid, 1, 0) && out.length ? out : null;
}

/** A legal-looking insertion at position p, drawn from the incumbent's state there. */
function proposeInsert(inc: Incumbent, p: number, nc: NbrCtx): PlanOrder[] | null {
  const sim = inc.ckpt[p];
  if (!sim) return null;
  const s = sim.state;
  const ctx = sim.ctx;
  const rng = nc.rng;
  const r = rng();
  if (r < 0.3) { // one more level on an existing instance
    const opts = instancesAt(sim).filter((x) => x.lvl < raceMaxLevel(x.gid));
    if (!opts.length) return null;
    const o = pick(rng, opts);
    return [{ k: 'b', gid: o.gid, i: o.i }];
  }
  if (r < 0.45) { // CHAIN: an instance straight up to its next CP-gaining level (or 2-4 levels)
    const opts = instancesAt(sim).filter((x) => x.lvl < raceMaxLevel(x.gid));
    if (!opts.length) return null;
    const o = pick(rng, opts);
    const to = o.gid > 4 ? nextCpGain(o.gid, o.lvl) : 0;
    const k = to > o.lvl + 1 ? to - o.lvl : 2 + Math.floor(rng() * 3);
    const n = Math.min(k, raceMaxLevel(o.gid) - o.lvl);
    return n > 0 ? Array.from({ length: n }, () => ({ k: 'b' as const, gid: o.gid, i: o.i })) : null;
  }
  if (r < 0.6) { // NEW building, with its missing prerequisite chain as one macro
    const cands = nc.placeable.filter((g) => !s.slots.some((sl) => sl.gid === g));
    if (!cands.length) return null;
    return withPrereqs(sim, pick(rng, cands));
  }
  if (r < 0.67) { // FAN-OUT: a cranny to L10, then extra crannies (the official multi-build unlock)
    const cr = instancesAt(sim).filter((x) => x.gid === GID.cranny);
    const free = MAX_BUILDING_SLOTS - buildingSlotsUsed(s);
    const base = cr.length ? cr.reduce((a, b) => (b.lvl > a.lvl ? b : a)) : null;
    const up = base ? Math.max(0, 10 - base.lvl) : 10;
    if (free < (base ? 1 : 2)) return null;
    const extra = 1 + Math.floor(rng() * Math.min(7, free - (base ? 0 : 1)));
    const out: PlanOrder[] = [];
    const baseI = base ? base.i : 0;
    for (let l = 0; l < up; l++) out.push({ k: 'b', gid: GID.cranny, i: baseI });
    const n0 = cr.length || 1;
    for (let j = 0; j < extra; j++) out.push({ k: 'b', gid: GID.cranny, i: n0 + j });
    return out;
  }
  if (r < 0.75) return maxOrdered(sim, GID.townHall) >= 1 ? [{ k: 'party' }] : withPrereqs(sim, GID.townHall);
  if (r < 0.9) {
    if (!ctx.oasisRaids) return null;
    const cav = cavalryRaiders[ctx.tribe];
    if (cav && (s.cavalryResearched || maxOrdered(sim, GID.stable) >= 1) && rng() < 0.5) return [{ k: 'cav', n: pick(rng, [1, 2, 3, 5]) }];
    return maxOrdered(sim, GID.barracks) >= 1 ? [{ k: 'raid', n: pick(rng, [2, 3, 5, 10]) }] : null;
  }
  if (!ctx.hero.enabled && ctx.oasisRaids && !s.heroRetired) return [{ k: 'book' }];
  const cav = cavalryRaiders[ctx.tribe];
  if (cav && !s.cavalryResearched) return [{ k: 'research' }];
  return null;
}

function neighbor(inc: Incumbent, nc: NbrCtx): Edit | null {
  const n = inc.orders.length;
  if (n < 2) return null;
  const rng = nc.rng;
  const r = rng();
  const orders = inc.orders.slice();
  const SHIFTS = [1, 2, 3, 5, 8, 13, 21, 34, 55];
  if (r < 0.24) { // move one order earlier/later
    const a = Math.floor(rng() * n);
    const d = pick(rng, SHIFTS) * (rng() < 0.5 ? -1 : 1);
    const b = Math.max(0, Math.min(n - 1, a + d));
    if (a === b) return null;
    const [o] = orders.splice(a, 1);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    let allSame = true; // a no-op move across identical orders
    for (let j = lo; j <= hi && allSame; j++) if (j !== a && !same(inc.orders[j], o)) allSame = false;
    if (allSame) return null;
    orders.splice(b, 0, o);
    return { orders, params: inc.params, p0: lo, kind: 'move' };
  }
  if (r < 0.36) { // move a block
    const len = 2 + Math.floor(rng() * 7);
    const a = Math.floor(rng() * Math.max(1, n - len + 1));
    const block = orders.splice(a, len);
    const d = pick(rng, SHIFTS) * (rng() < 0.5 ? -1 : 1);
    const b = Math.max(0, Math.min(orders.length, a + d));
    if (b === a) return null;
    orders.splice(b, 0, ...block);
    return { orders, params: inc.params, p0: Math.min(a, b), kind: 'block' };
  }
  if (r < 0.4) { // move a whole instance's orders together, keeping their relative order
    const a = Math.floor(rng() * n);
    const o = orders[a];
    if (o.k !== 'b') return null;
    const idx: number[] = [];
    orders.forEach((q, j) => { if (q.k === 'b' && q.gid === o.gid && q.i === o.i) idx.push(j); });
    if (idx.length < 2) return null;
    const d = pick(rng, SHIFTS) * (rng() < 0.5 ? -1 : 1);
    // shift every order of the instance by d, keeping the gaps between them (stable sort by key)
    const keyed = orders.map((q, j) => ({ q, key: idx.includes(j) ? j + d + (d < 0 ? -0.5 : 0.5) : j }));
    keyed.sort((x, y) => x.key - y.key);
    const out = keyed.map((x) => x.q);
    return { orders: out, params: inc.params, p0: Math.max(0, Math.min(idx[0], idx[0] + d)), kind: 'chainMove' };
  }
  if (r < 0.47) { // delete one order (settlers are the goal — only ever moved)
    const a = Math.floor(rng() * n);
    if (orders[a].k === 'settler') return null;
    orders.splice(a, 1);
    return { orders, params: inc.params, p0: a, kind: 'delete' };
  }
  if (r < 0.53) { // trim: drop up to 4 of one instance's LAST levels (or a whole side building)
    const a = Math.floor(rng() * n);
    const o = orders[a];
    if (o.k !== 'b') return null;
    let removed = 0, first = n;
    for (let j = orders.length - 1; j >= 0 && removed < 4; j--) {
      const q = orders[j];
      if (q.k === 'b' && q.gid === o.gid && q.i === o.i) { orders.splice(j, 1); removed++; first = j; }
    }
    return removed ? { orders, params: inc.params, p0: first, kind: 'trim' } : null;
  }
  if (r < 0.75) { // insert (single order or a coherent macro)
    const p = Math.floor(rng() * n);
    const ins = proposeInsert(inc, p, nc);
    if (!ins || !ins.length) return null;
    orders.splice(p, 0, ...ins);
    return { orders, params: inc.params, p0: p, kind: 'insert' };
  }
  if (r < 0.8) { // local swap
    const a = Math.floor(rng() * n);
    const b = Math.max(0, Math.min(n - 1, a + (1 + Math.floor(rng() * 5)) * (rng() < 0.5 ? -1 : 1)));
    if (a === b || same(orders[a], orders[b])) return null;
    [orders[a], orders[b]] = [orders[b], orders[a]];
    return { orders, params: inc.params, p0: Math.min(a, b), kind: 'swap' };
  }
  if (r < 0.87) { // troops: a run of unit orders (one unit per order) — shrink, grow or split it
    const idx: number[] = [];
    orders.forEach((o, j) => { if (o.k === 'raid' || o.k === 'cav') idx.push(j); });
    if (!idx.length) return null;
    const j = pick(rng, idx);
    const kind = orders[j].k as 'raid' | 'cav';
    let lo = j, hi = j; // the contiguous run of this kind around j
    while (lo > 0 && orders[lo - 1].k === kind) lo--;
    while (hi < orders.length - 1 && orders[hi + 1].k === kind) hi++;
    const len = hi - lo + 1;
    const m = rng();
    if (m < 0.35) { // fewer units
      const k = Math.min(len, 1 + Math.floor(rng() * 3));
      orders.splice(hi - k + 1, k);
      return { orders, params: inc.params, p0: hi - k + 1, kind: 'troops-' };
    }
    if (m < 0.7) { // more units
      const k = 1 + Math.floor(rng() * 3);
      const one = orders[j];
      orders.splice(hi + 1, 0, ...Array.from({ length: k }, () => ({ ...one })));
      return { orders, params: inc.params, p0: hi + 1, kind: 'troops+' };
    }
    if (len < 2) return null; // split: the tail of the run trains later
    const k = 1 + Math.floor(rng() * (len - 1));
    const tail = orders.splice(hi - k + 1, k);
    const to = Math.min(orders.length, hi - k + 1 + pick(rng, SHIFTS));
    orders.splice(to, 0, ...tail);
    return { orders, params: inc.params, p0: hi - k + 1, kind: 'troops~' };
  }
  if (r < 0.93 && nc.regenParams.length) { // REGEN: keep a prefix, let a greedy cell finish the race
    const q = 1 + Math.floor(rng() * Math.max(1, Math.min(n, inc.ckpt.length) - 1));
    const sim = inc.ckpt[q]?.clone();
    if (!sim) return null;
    const gp = pick(rng, nc.regenParams);
    const ps: StrategyParams = { ...gp, finishMin: inc.params.finishMin, respecAtH: inc.params.respecAtH };
    try {
      const t = greedyContinue(sim, ps);
      const sc = scoreOf(t ?? sim.finish().settleTime);
      if (!Number.isFinite(sc) || !sim.recorder) return null;
      return { orders: sim.recorder.slice(), params: inc.params, p0: q, kind: 'regen', score: sc }; // score re-checked on materialize
    } catch {
      return null;
    }
  }
  if (!nc.paramMoves) return null;
  const canBook = nc.bookHours.length > 1;
  if (nc.finishMins.length > 1 && (!canBook || rng() < 0.5)) { // gold policy
    const fm = pick(rng, nc.finishMins);
    if (fm === inc.params.finishMin) return null;
    return { orders, params: { ...inc.params, finishMin: fm }, p0: 0, kind: 'gold' };
  }
  if (!canBook) return null;
  const h = pick(rng, nc.bookHours);
  if (h === inc.params.respecAtH) return null;
  return { orders, params: { ...inc.params, respecAtH: h }, p0: 0, kind: 'bookHour' };
}

// ---------------------------------------------------------------------------------------------
// Search driver: late-acceptance hill climbing, multi-start with successive halving
// ---------------------------------------------------------------------------------------------

export interface PlanSearchOptions {
  iterations: number;
  seed?: number;
  /** Mid-race re-plan: replays start from this state; book-hour moves are disabled. */
  startSim?: Simulation;
  finishMins?: number[];
  /** Strategy cells the 'regen' move may use to re-finish a plan from any cut point. */
  regenParams?: StrategyParams[];
  onProgress?: (done: number, total: number, best: number) => void;
}

/** Record a plan by running `drive` on a recording sim (greedy, beam replay, guide script …). */
export function recordPlan(base: SimContext, params: StrategyParams, drive: (sim: Simulation) => void, startSim?: Simulation): PlanOrder[] | null {
  try {
    const sim = freshStart({ base, startSim }, params, false);
    sim.recorder = [];
    drive(sim);
    return sim.recorder;
  } catch {
    return null;
  }
}

interface Chain { cur: Incumbent; top: Incumbent; hist: number[]; it: number }

export function planSearch(base: SimContext, seeds: PlanSeed[], opts: PlanSearchOptions): PlanSearchResult | null {
  const env: Env = { base, startSim: opts.startSim };
  // score every seed; drop near-duplicates (same score within a second)
  const scored = seeds.map((s) => materialize(env, s.orders, s.params, s.label)).filter((x): x is Incumbent => x !== null)
    .sort((a, b) => a.score - b.score);
  const incs: Incumbent[] = [];
  for (const inc of scored) {
    if (incs.some((x) => Math.abs(x.score - inc.score) < 1)) continue; // near-duplicate
    const fam = (l: string) => l.split(' ')[0];
    const firstOfFamily = !incs.some((x) => fam(x.label) === fam(inc.label));
    // >5% behind the best seed: dropped, unless it is its family's best (the greedy lineage finds
    // very different plans from the guide's — measured 24:30 from a 30:54 greedy seed)
    if (incs.length && !firstOfFamily && inc.score > scored[0].score * 1.05) continue;
    incs.push(inc);
  }
  if (!incs.length) return null;
  const speed = base.config.speed;
  const u = 6 / speed; // book-hour rung (x3 → 2h)
  const bookHours: (number | undefined)[] = [undefined];
  if (!base.hero.enabled && base.oasisRaids && !opts.startSim) for (let h = 3 * u; h <= 12 * u + 1e-9; h += u / 2) bookHours.push(h);
  const nc: NbrCtx = {
    rng: mulberry32(opts.seed ?? 0x5e771e),
    env,
    placeable: placeableGids(base.tribe),
    finishMins: opts.finishMins?.length ? opts.finishMins : base.gold ? [Infinity, 15, 5, 1, 0] : [Infinity],
    bookHours,
    paramMoves: !opts.startSim,
    regenParams: opts.regenParams ?? [],
  };
  let evaluations = 0, improvements = 0, steps = 0;
  const total = Math.max(0, opts.iterations);
  let best = incs[0];
  const L = 40;
  const chains: Chain[] = incs.map((inc) => ({ cur: inc, top: inc, hist: new Array<number>(L).fill(inc.score), it: 0 }));
  const step = (ch: Chain): void => {
    const e = neighbor(ch.cur, nc);
    ch.it++;
    steps++;
    if (opts.onProgress && steps % 200 === 0) opts.onProgress(Math.min(steps, total), total, best.score);
    if (!e) return;
    evaluations++;
    const v = ch.it % L;
    const bound = Math.max(ch.cur.score + 0.5, ch.hist[v]);
    const sc = e.score ?? evaluate(env, ch.cur, e.orders, e.params, e.p0, bound);
    const improves = sc < ch.cur.score - 0.5;
    const plateau = !improves && Math.abs(sc - ch.cur.score) <= 0.5;
    const lateOk = !improves && !plateau && sc <= ch.hist[v];
    if (improves || lateOk || (plateau && nc.rng() < 0.15)) {
      const m = materialize(env, e.orders, e.params, ch.cur.label, ch.cur, e.p0);
      const ok = m && Number.isFinite(m.score) && (m.score < ch.cur.score - 0.5 || m.score <= ch.hist[v] || (plateau && Math.abs(m.score - ch.cur.score) <= 0.5));
      if (m && ok) {
        ch.cur = m;
        if (m.score < ch.top.score - 0.5) { ch.top = m; improvements++; }
        if (m.score < best.score) best = m;
      }
    }
    ch.hist[v] = ch.cur.score;
  };
  const run = (ch: Chain, iters: number): void => { for (let k = 0; k < iters; k++) step(ch); };
  // successive halving: a short trial for every seed family, then the two best get more, the
  // leader gets the rest (the seeds' own quality, not their count, decides where effort goes)
  let spent = 0;
  if (chains.length > 1) {
    const r1 = Math.floor(total * Math.min(0.08, 0.4 / chains.length));
    for (const ch of chains) { run(ch, r1); spent += r1; }
    chains.sort((a, b) => a.top.score - b.top.score);
    const keep = chains.slice(0, 2);
    const r2 = Math.floor(total * 0.2);
    for (const ch of keep) { run(ch, r2); spent += r2; }
    keep.sort((a, b) => a.top.score - b.top.score);
    run(keep[0], Math.max(0, total - spent));
  } else {
    run(chains[0], total);
  }
  // full-fidelity replay of the winner (events, series, economy) — the plan the user follows
  const sim = freshStart(env, best.params, true);
  sim.recorder = [];
  let settle: number | null = null;
  try { settle = runFrom(sim, best.orders, 0, best.params); } catch { settle = null; }
  const result = sim.finish();
  return {
    orders: sim.recorder ?? best.orders,
    params: best.params,
    settleTime: result.settleTime ?? (Number.isFinite(settle ?? Infinity) ? settle : null),
    result,
    seedLabel: best.label,
    evaluations,
    improvements,
  };
}
