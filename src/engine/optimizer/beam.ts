/** Organic plan search — beam search over RAW actions with zero strategy knowledge.
 *
 *  No phase skeleton, no party-ordering rules, no storage rules: the search must discover
 *  warehouses-before-big-builds, Town-Hall→parties, banking, cranny L3, field depth — or lose.
 *  Width is the exhaustiveness dial (a full exhaustive tree is ~10^300 nodes — physically
 *  impossible — but canonicalization + dedup + dominance make wide beams effectively thorough).
 *
 *  The only non-search knowledge is LEGALITY and DATA:
 *   - canonicalization: identical-level fields/crannies of a type are interchangeable
 *   - macro actions "upgrade until the next CP gain" derived from the official data tables
 *     (so dead levels like cranny L2 don't blind a single-step search)
 *   - admissible-ish time bounds from official training/build times for ranking. */
import { GID, building, buildings, levelData, raceMaxLevel , wallGid } from '../data/buildings';
import { tribes } from '../data/tribes';
import { cavalryRaiders, raidThroughputPerHour, raiders, unitThroughputPerHour } from '../data/raiders';
import { settlerTime } from '../formulas';
import { CELEBRATION_COST, Simulation, addSlot, cpPerSecond, ownedPerResource, reachable, settleGoal, storageCaps, type SimContext, type SimResult, type SimState } from '../sim/simulate';
import { celebrationCpCap } from '../data/culture';
import { greedyContinue, optimize, type PlanOutcome, type StrategyParams } from './planner';
import type { Tribe } from '../types';

export type BeamAction =
  | { kind: 'field'; gid: 1 | 2 | 3 | 4 }
  | { kind: 'up'; gid: number; levels: number }
  | { kind: 'new'; gid: number }
  | { kind: 'party' }
  | { kind: 'settlers' }
  | { kind: 'raiders'; count: number }
  | { kind: 'research' }
  | { kind: 'cavalry'; count: number }
  | { kind: 'book' };

export interface BeamResult {
  settleTime: number | null;
  actions: BeamAction[];
  result: SimResult;
  nodesExpanded: number;
}

/** Buildings a search may place (legality only: no tribe-mismatch, no WW/greats/port variants). */
function placeableGids(tribe: Tribe): number[] {
  const tribeOnly: Record<number, Tribe> = { 35: 'teutons', 36: 'gauls', 41: 'romans', 44: 'huns', 45: 'egyptians', 48: 'spartans' };
  const WALLS = [31, 32, 33, 42, 43, 47];
  return buildings
    .filter((b) => b.gid >= 5 && b.gid <= 48 && ![29, 30, 38, 39, 40, 46].includes(b.gid))
    .filter((b) => !(b.gid in tribeOnly) || tribeOnly[b.gid] === tribe)
    .filter((b) => !WALLS.includes(b.gid) || wallGid(tribe) === b.gid) // exactly the tribe's own wall
    .map((b) => b.gid);
}

/** Smallest target level > from whose CP/day exceeds CP at `from` (≤ maxAhead ahead); 0 if none. */
function nextCpGainLevel(gid: number, from: number, maxAhead = 4): number {
  const b = building(gid);
  const base = from > 0 ? levelData(gid, from).culturePoints : 0;
  for (let l = from + 1; l <= Math.min(from + maxAhead, b.maxLevel); l++) {
    if (levelData(gid, l).culturePoints > base) return l;
  }
  return 0;
}

function enumerate(sim: Simulation, thr: number): BeamAction[] {
  const s = sim.state;
  const out: BeamAction[] = [];
  for (const gid of [1, 2, 3, 4] as const) {
    if (s.slots.some((sl) => sl.gid === gid && sl.level < 10)) out.push({ kind: 'field', gid });
  }
  const present = new Set(s.slots.filter((sl) => sl.gid > 4).map((sl) => sl.gid));
  for (const gid of present) {
    const lvl = Math.min(...s.slots.filter((sl) => sl.gid === gid).map((sl) => sl.level));
    if (lvl < raceMaxLevel(gid)) {
      const gain = nextCpGainLevel(gid, lvl);
      // single-step upgrade — except a lone cranny L2 (a dead level; only reachable as part of L1→L3)
      if (!(gid === GID.cranny && lvl === 1)) out.push({ kind: 'up', gid, levels: 1 });
      if (gain > lvl + 1 && gain <= raceMaxLevel(gid)) out.push({ kind: 'up', gid, levels: gain - lvl }); // data-derived dead-level macro
    }
  }
  const slotsUsed = s.slots.filter((sl) => sl.gid > 4).length;
  if (slotsUsed < 20) {
    for (const gid of placeableGids(sim.ctx.tribe)) {
      if (!present.has(gid) || gid === GID.cranny || gid === GID.warehouse || gid === GID.granary) {
        // prereqs need NOT be met: 'new' is a data-driven macro that builds the prerequisite
        // chain (the game UI's "requires X" list) — otherwise dead chains blind the search.
        // But keep chains short: giant chains are reachable incrementally via their parts.
        if (chainLength(sim, gid, 1) <= MAX_CHAIN) out.push({ kind: 'new', gid });
      }
    }
  }
  const th = Math.max(0, ...s.slots.filter((sl) => sl.gid === GID.townHall).map((sl) => sl.level));
  if (th >= 1 && s.cp < thr && s.celebrationBusyUntil <= s.time) out.push({ kind: 'party' });
  const resLvl = Math.max(0, ...s.slots.filter((sl) => [GID.residence, GID.palace, GID.commandCenter].includes(sl.gid as never)).map((sl) => sl.level));
  if (resLvl >= 10 && s.settlers < settleGoal(sim.ctx.config).settlers && sim.laneFreeTime('training') <= s.time) out.push({ kind: 'settlers' });
  // raiders: only meaningful when there is oasis regen to farm and the raiders would add throughput
  const regen = sim.ctx.oasisRaids?.tricklePerHour ?? 0;
  if (regen > 0) {
    const rp = Math.max(0, ...s.slots.filter((sl) => sl.gid === GID.rallyPoint).map((sl) => sl.level));
    const br = Math.max(0, ...s.slots.filter((sl) => sl.gid === GID.barracks).map((sl) => sl.level));
    const dist = sim.ctx.oasisRaids?.distance ?? 3;
    const nowT = raidThroughputPerHour(sim.ctx.tribe, s.raiders, dist, sim.ctx.config.speed);
    const clearedFrac = s.oasisPacks.length ? s.oasisPacks.filter((v) => v <= 0).length / s.oasisPacks.length : 1;
    const unlocked = regen * Math.min(1, clearedFrac + 0.15); // train toward what CLEARED oases feed
    if (rp >= 1 && br >= 1 && nowT < unlocked) {
      for (const n of [5, 10, 20]) out.push({ kind: 'raiders', count: n });
    }
    // cavalry branch (Hun Steppe Riders): research is one action; training needs a Stable
    const cav = cavalryRaiders[sim.ctx.tribe];
    if (cav) {
      const ac = Math.max(0, ...s.slots.filter((sl) => sl.gid === GID.academy).map((sl) => sl.level));
      const stb = Math.max(0, ...s.slots.filter((sl) => sl.gid === GID.stable).map((sl) => sl.level));
      if (!s.cavalryResearched && ac >= 5 && stb >= cav.stableLevel) out.push({ kind: 'research' });
      if (s.cavalryResearched && rp >= 1 && stb >= 1 && nowT + unitThroughputPerHour(cav, s.cavalry, dist, sim.ctx.config.speed) < unlocked) {
        for (const n of [5, 10]) out.push({ kind: 'cavalry', count: n });
      }
    }
    // Book of Wisdom EARLY (real meta: Nitai's team booked at 7h with 15/33 cleared) — quitting the
    // clear phase is a searched choice, not a formula; offered once some clears exist and some remain
    if (!sim.ctx.hero.enabled && !s.heroRetired && s.oasisPacks.some((v) => v <= 0) && s.oasisPacks.some((v) => v > 0)) {
      out.push({ kind: 'book' });
    }
  }
  return out;
}

/** Raise Warehouse/Granary until `cost` is storable — a DATA requirement of any cost (the game
 *  itself grays out unstorable amounts), same class as prerequisite chains, not strategy. */
function fitCaps(sim: Simulation, cost: { wood: number; clay: number; iron: number; crop: number }): void {
  for (let guard = 0; guard < 40; guard++) {
    const caps = storageCaps(sim.state);
    const own = ownedPerResource(sim.state);
    // storage-ahead only for MEANINGFUL idle amounts (> 25% over cap) and never past L20 / a sane
    // early ceiling — otherwise the rule over-invests in storage on slow economies
    const whIdx = sim.state.slots.findIndex((sl) => sl.gid === GID.warehouse);
    const grIdx = sim.state.slots.findIndex((sl) => sl.gid === GID.granary);
    const whLvl = whIdx === -1 ? 0 : sim.orderedLevel(whIdx);
    const grLvl = grIdx === -1 ? 0 : sim.orderedLevel(grIdx);
    const aheadWh = own.warehouseNeed > caps.warehouse * 1.25 && whLvl < 12;
    const aheadGr = own.granaryNeed > caps.granary * 1.25 && grLvl < 10;
    const needWh = Math.max(cost.wood, cost.clay, cost.iron) > caps.warehouse || aheadWh;
    const needGr = cost.crop > caps.granary || aheadGr;
    if (!needWh && !needGr) return;
    const gid = needWh ? GID.warehouse : GID.granary;
    let idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
    if (idx === -1) {
      ensureWithPrereqs(sim, gid, 1);
      continue;
    }
    sim.build(idx);
  }
}

/** Order one level on a slot, first making its cost storable. */
function buildFit(sim: Simulation, idx: number): void {
  const gid = sim.state.slots[idx].gid;
  const target = sim.orderedLevel(idx) + 1;
  const ld = levelData(gid, target);
  fitCaps(sim, { wood: ld.resourceCost.r1, clay: ld.resourceCost.r2, iron: ld.resourceCost.r3, crop: ld.resourceCost.r4 });
  sim.build(idx);
}

/** Build gid to `level`, first satisfying its prerequisite chain (official prereq data). */
function ensureWithPrereqs(sim: Simulation, gid: number, level: number): void {
  for (const p of building(gid).prerequisites as { type: string; gid?: number[]; level?: number }[]) {
    if (p.type === 'Building' && p.gid) ensureWithPrereqs(sim, p.gid[0], p.level ?? 1);
  }
  let idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
  if (idx === -1) idx = addSlot(sim.state, gid);
  while (sim.orderedLevel(idx) < level) buildFit(sim, idx);
}

/** Total levels a 'new gid' action would order (its unmet prerequisite chain + itself). Chains that
 *  order more than MAX_CHAIN levels are too coarse for one search step — the search must reach them
 *  incrementally (which it can, since every intermediate building is itself a 'new' action). */
const MAX_CHAIN = 6;
function chainLength(sim: Simulation, gid: number, level: number, seen = new Set<number>()): number {
  let n = 0;
  for (const p of building(gid).prerequisites as { type: string; gid?: number[]; level?: number }[]) {
    if (p.type === 'Building' && p.gid && !seen.has(p.gid[0])) {
      seen.add(p.gid[0]);
      n += chainLength(sim, p.gid[0], p.level ?? 1, seen);
    }
  }
  const idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
  const have = idx === -1 ? 0 : sim.orderedLevel(idx);
  return n + Math.max(0, level - have);
}

function applyAction(sim: Simulation, a: BeamAction): boolean {
  try {
    if (a.kind === 'field') {
      let best = -1, bl = Infinity;
      sim.state.slots.forEach((sl, i) => { if (sl.gid === a.gid && sl.level < bl) { bl = sl.level; best = i; } });
      if (best < 0) return false;
      buildFit(sim, best);
    } else if (a.kind === 'up') {
      let best = -1, bl = Infinity;
      sim.state.slots.forEach((sl, i) => { if (sl.gid === a.gid && sl.level < bl) { bl = sl.level; best = i; } });
      if (best < 0) return false;
      for (let k = 0; k < a.levels; k++) buildFit(sim, best);
    } else if (a.kind === 'new') {
      ensureWithPrereqs(sim, a.gid, 1);
    } else if (a.kind === 'party') {
      fitCaps(sim, CELEBRATION_COST.small);
      sim.celebration(false);
    } else if (a.kind === 'raiders') {
      fitCaps(sim, raiders[sim.ctx.tribe].cost);
      sim.trainRaiders(a.count);
    } else if (a.kind === 'research') {
      fitCaps(sim, cavalryRaiders[sim.ctx.tribe]!.research);
      sim.researchCavalry();
    } else if (a.kind === 'cavalry') {
      fitCaps(sim, cavalryRaiders[sim.ctx.tribe]!.cost);
      sim.trainCavalry(a.count);
    } else if (a.kind === 'book') {
      sim.bookRespec();
    } else {
      fitCaps(sim, tribes[sim.ctx.tribe].settlerCost); // one settler at a time
      sim.trainSettlers();
    }
    return true;
  } catch {
    return false;
  }
}

/** Completion-time RANKING heuristic — a resource-and-CP-aware estimate of when this node settles.
 *
 *  Both remaining constraints are priced against the node's OWN economy:
 *   • settlers: remaining Residence levels + 3 settlers, paid from stock + total income;
 *   • CP: shortfall covered by (a) natural accrual at the current+pending rate and (b) the CHEAPEST
 *     CP the node could still buy — the party (if a Town Hall exists: rate-sized grant per cooldown)
 *     and cheap CP buildings priced at the data-derived marginal cost of CP (see cpMarginal).
 *  Neither side knows any strategy; both are just "what would this cost me from here". */
function boundH(sim: Simulation, thr: number): number {
  const s = sim.state;
  const speed = sim.ctx.config.speed;
  const inc = sim.cachedRate();
  const income = Math.max(1e-6, inc.wood + inc.clay + inc.iron + inc.crop); // res/sec total
  const rch = reachable(s); // warehouse + hero bag + unclaimed — the audit showed +80k bag moved boundH by 0
  const stock = rch.wood + rch.clay + rch.iron + rch.crop;

  // ---- settler side ----
  let settlerCost = 0;
  let settlerEta = s.time;
  const trainingBusy = sim.laneFreeTime('training');
  const t = tribes[sim.ctx.tribe];
  const perSettler = t.settlerCost.wood + t.settlerCost.clay + t.settlerCost.iron + t.settlerCost.crop;
  if (s.settlers < settleGoal(sim.ctx.config).settlers) {
    const queued = trainingBusy > s.time ? Math.round((trainingBusy - s.time) / settlerTime(sim.ctx.tribe, 10, speed, 0)) : 0;
    const missing = Math.max(0, settleGoal(sim.ctx.config).settlers - s.settlers - queued);
    let resLvl = 0;
    for (let i = 0; i < s.slots.length; i++) {
      const sl = s.slots[i];
      if (sl.gid === GID.residence || sl.gid === GID.palace || sl.gid === GID.commandCenter) {
        const ord = sim.orderedLevel(i); // ORDERED level — queued Residence levels are already paid
        if (ord > resLvl) resLvl = ord;
      }
    }
    for (let l = resLvl + 1; l <= 10; l++) {
      const ld = levelData(GID.residence, l);
      settlerCost += ld.resourceCost.r1 + ld.resourceCost.r2 + ld.resourceCost.r3 + ld.resourceCost.r4;
    }
    settlerCost += missing * perSettler;
    const train = missing * settlerTime(sim.ctx.tribe, 10, speed, 0);
    settlerEta = Math.max(trainingBusy, s.time) + train;
  }

  // ---- CP side ----
  const rate = cpPerSecond(s) + sim.pendingCpPerDay() / 86400; // per sec
  const cpShort = Math.max(0, thr - s.cp);
  let cpEta = cpShort === 0 ? s.time : rate > 0 ? s.time + cpShort / rate : Infinity;
  let cpCost = 0;
  if (cpShort > 0) {
    // option: buy CP at the marginal data price and/or party. Take the cheaper-in-time of
    // "wait for accrual" vs "buy the shortfall now" — the search only needs a fair ranking.
    let th = 0;
    for (const sl of s.slots) if (sl.gid === GID.townHall && sl.level > th) th = sl.level;
    const partyGrant = th > 0 ? Math.min(celebrationCpCap[speed][0], rate * 86400) : 0;
    const buyableCp = Math.max(0, cpShort - partyGrant);
    const buyCost = buyableCp * cpMarginalCost(s) + (partyGrant > 0 ? 20330 : 0);
    const buyEta = s.time + Math.max(0, buyCost - Math.max(0, stock - settlerCost)) / income;
    if (buyEta < cpEta) { cpEta = buyEta; cpCost = buyCost; }
  }

  // ---- combine: total remaining resource need must be produced by THIS economy ----
  const need = settlerCost + cpCost;
  const resEta = s.time + Math.max(0, need - stock) / income;
  return Math.max(settlerEta, cpEta, resEta);
}

/** Data-derived marginal resource cost of +1 CP/day at this village's current levels: the cheapest
 *  next-level upgrade among present CP buildings and a fresh cranny. Time value ignored (ranking). */
function cpMarginalCost(s: SimState): number {
  let best = Infinity;
  const consider = (gid: number, from: number): void => {
    const to = nextCpGainLevel(gid, from);
    if (!to) return;
    let cost = 0;
    for (let l = from + 1; l <= to; l++) {
      const ld = levelData(gid, l);
      cost += ld.resourceCost.r1 + ld.resourceCost.r2 + ld.resourceCost.r3 + ld.resourceCost.r4;
    }
    const gain = levelData(gid, to).culturePoints - (from > 0 ? levelData(gid, from).culturePoints : 0);
    if (gain > 0) best = Math.min(best, cost / gain);
  };
  const seen = new Set<number>();
  for (const sl of s.slots) {
    if (sl.gid <= 4 || seen.has(sl.gid)) continue;
    seen.add(sl.gid);
    consider(sl.gid, sl.level);
  }
  consider(GID.cranny, 0);
  // CP/day → the shortfall is in CP-days-until-settle terms; approximate a horizon of ~1 day
  return Number.isFinite(best) ? best : 2000;
}

/** ROLLOUT evaluator: from this node, play out a trivial default policy to an actual settle and
 *  return that real time. Ranking on rollouts (instead of a closed-form guess) is what lets the
 *  search value INVESTMENT (a field now → cheaper everything later) without any strategy rule.
 *  The policy is deliberately dumb and data-only: repeatedly take the single action that most
 *  reduces boundH; stop when settlers are ordered and CP is projectable. */
/** Rollout = "how fast does a competent default player finish from here?" — the greedy planner
 *  continues the cloned state to settle. The organic beam therefore explores DEVIATIONS from a
 *  strong baseline, and any node that beats the greedy's own opening is a genuine discovery. */
function rollout(sim: Simulation, thr: number, params: StrategyParams): number {
  // the continuation can only improve on the bare projection; take the better of the two
  const bare = sim.projectSettle(thr);
  const r = sim.clone();
  const t = greedyContinue(r, params);
  if (t !== null && bare !== null) return Math.min(t, bare);
  return t ?? bare ?? boundH(sim, thr) * 1.5;
}

function signature(sim: Simulation): string {
  const s = sim.state;
  const lv = s.slots.map((sl) => sl.gid * 100 + sl.level).sort((a, b) => a - b).join(',');
  return `${lv}|${s.settlers}|${s.celebrationsHeld}|${Math.floor(s.cp / 20)}|${Math.floor(s.time / 900)}|${s.raiders}|${s.cavalry}|${s.cavalryResearched ? 1 : 0}|${s.heroRetired ? 1 : 0}`;
}

export interface BeamOptions {
  width?: number;
  maxDepth?: number;
  /** Known settle time (e.g. from the greedy) used as an upper-bound pruning seed. */
  upperBound?: number;
  /** Rollout horizon (default policy steps) used to score frontier candidates. */
  rolloutSteps?: number;
  /** Precomputed greedy grid (same ctx) — avoids running the grid twice (worker dedupe). */
  greedyGrid?: PlanOutcome[];
  onProgress?: (depth: number, best: number | null, stats?: { frontier: number; maxRes: number; maxTh: number; maxTimeH: number }) => void;
}

export function beamSearch(ctx: SimContext, opts: BeamOptions = {}): BeamResult {
  const width = opts.width ?? 200;
  const maxDepth = opts.maxDepth ?? 400;
  const thr = settleGoal(ctx.config).threshold;
  // the rollout yardstick = the greedy's best params for THIS config (found once by its grid);
  // depth-0 (empty prefix) therefore scores exactly the greedy — the beam can only improve on it.
  // The caller may pass its own grid run (the worker used to run the identical grid TWICE).
  const greedyGrid = opts.greedyGrid ?? optimize(ctx);
  const greedyBest = greedyGrid[0];
  const rolloutParams: StrategyParams = greedyBest.params;
  let bestSettle = Math.min(opts.upperBound ?? Infinity, greedyBest.settleTime ?? Infinity);
  let bestActions: BeamAction[] | null = bestSettle < Infinity ? [] : null;
  let expanded = 0;

  interface Node { sim: Simulation; actions: BeamAction[]; h: number }
  // search sims share the yardstick's instant-finish policy so prefix and continuation agree
  const searchCtx: SimContext = ctx.gold ? { ...ctx, gold: { ...ctx.gold, instantFinishMin: rolloutParams.finishMin } } : ctx;
  let frontier: Node[] = [{ sim: new Simulation(searchCtx), actions: [], h: 0 }];
  let sinceImproved = 0;

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const bestBefore = bestSettle;
    const nextMap = new Map<string, Node>();
    for (const node of frontier) {
      for (const a of enumerate(node.sim, thr)) {
        const sim = node.sim.clone();
        if (!applyAction(sim, a)) continue;
        expanded++;
        if (sim.state.time >= bestSettle) continue; // SOUND prune: already past the best settle
        const h = boundH(sim, thr);
        const actions = [...node.actions, a];
        // exact settle via analytic projection (cheap, O(pending)) — no strategy, no cloning
        const exact = sim.projectSettle(thr);
        if (exact !== null && exact < bestSettle) { bestSettle = exact; bestActions = actions; }
        const sig = signature(sim);
        const prev = nextMap.get(sig);
        if (!prev || h < prev.h) nextMap.set(sig, { sim, actions, h });
      }
    }
    // rank by ROLLOUT (real simulated settle under the greedy continuation), computed for the top
    // candidates by the cheap bound — rollouts are what let the search value investment
    const cands = [...nextMap.values()].sort((a, b) => a.h - b.h).slice(0, width * 3);
    for (const n of cands) {
      // per-node rollout params: a node that invested in a Stable/research must be finished by a
      // cavalry-aware greedy, or the investment scores as pure waste and the branch dies unseen
      const nodeParams = n.sim.state.cavalryResearched || n.sim.state.slots.some((sl) => sl.gid === GID.stable)
        ? { ...rolloutParams, cavalry: true }
        : rolloutParams;
      n.h = rollout(n.sim, thr, nodeParams);
      // a rollout IS a complete plan (prefix + greedy continuation) — record it if best
      if (n.h < bestSettle) { bestSettle = n.h; bestActions = n.actions; }
    }
    // stratified selection: reserve beam slots per settler-progress stage so the Residence line
    // is never starved while CP-heavy nodes dominate the heuristic (search diversity, not strategy)
    const all = cands.sort((a, b) => a.h - b.h);
    const strata = new Map<string, Node[]>();
    for (const n of all) {
      const s = n.sim.state;
      let resLvl = 0, th = 0;
      for (const sl of s.slots) {
        if ((sl.gid === 25 || sl.gid === 26 || sl.gid === 44) && sl.level > resLvl) resLvl = sl.level;
        if (sl.gid === 24 && sl.level > th) th = sl.level;
      }
      const stage = s.settlers >= 3 ? 12 : n.sim.laneFreeTime('training') > s.time ? 11 : Math.min(resLvl, 10);
      // diversity across BOTH progress dimensions: settler line × party line (TH present?)
      const key = `${stage}|${th > 0 ? 1 : 0}`;
      const arr = strata.get(key) ?? [];
      arr.push(n);
      strata.set(key, arr);
    }
    const perStratum = Math.max(4, Math.ceil(width / Math.max(1, strata.size)));
    const picked: Node[] = [];
    for (const arr of strata.values()) picked.push(...arr.slice(0, perStratum));
    frontier = picked.sort((a, b) => a.h - b.h).slice(0, width);
    if (opts.onProgress) {
      let maxRes = 0, maxTh = 0, maxTimeH = 0;
      for (const n of frontier) {
        for (const sl of n.sim.state.slots) {
          if (sl.gid === GID.residence && sl.level > maxRes) maxRes = sl.level;
          if (sl.gid === GID.townHall && sl.level > maxTh) maxTh = sl.level;
        }
        maxTimeH = Math.max(maxTimeH, n.sim.state.time / 3600);
      }
      opts.onProgress(depth, Number.isFinite(bestSettle) ? bestSettle : null, { frontier: frontier.length, maxRes, maxTh, maxTimeH });
    }
    sinceImproved = bestSettle < bestBefore ? 0 : sinceImproved + 1;
    if (Number.isFinite(bestSettle) && sinceImproved >= 25) break; // converged
  }

  // replay the winning prefix, then the same greedy continuation the rollout used, for a
  // full-fidelity result (events, costs, chart)
  if (!bestActions) {
    const empty = new Simulation(ctx).finish();
    return { settleTime: null, actions: [], result: empty, nodesExpanded: expanded };
  }
  // tail re-rank (audit: rollout gold policy was frozen — the same prefix under the #2 grid cell's
  // finishMin/partyEarly settled 44 min earlier): replay the winning prefix under the top-K grid
  // param sets, EACH with its own gold ctx, and keep the best finished plan.
  const paramSets: StrategyParams[] = [];
  const seen = new Set<string>();
  for (const o of greedyGrid.slice(0, 6)) {
    if (!o.settleTime) continue;
    const key = JSON.stringify([o.params.finishMin, o.params.partyEarly, o.params.cavalry, o.params.residenceFirst, o.params.fieldTarget, o.params.cpEarly]);
    if (seen.has(key)) continue;
    seen.add(key);
    paramSets.push(o.params);
    if (paramSets.length >= 3) break;
  }
  if (!paramSets.length) paramSets.push(rolloutParams);
  let best: { settleTime: number | null; result: ReturnType<Simulation['finish']> } | null = null;
  for (const ps of paramSets) {
    const replayCtx: SimContext = ctx.gold ? { ...ctx, gold: { ...ctx.gold, instantFinishMin: ps.finishMin } } : ctx;
    try {
      const replay = new Simulation(replayCtx);
      for (const a of bestActions) applyAction(replay, a);
      greedyContinue(replay, ps);
      const result = replay.finish();
      if (result.settleTime !== null && (best === null || best.settleTime === null || result.settleTime < best.settleTime)) {
        best = { settleTime: result.settleTime, result };
      }
    } catch { /* a param set can be infeasible for this prefix — skip it */ }
  }
  if (!best) { // fall back to the plain rollout params
    const replay = new Simulation(ctx.gold ? { ...ctx, gold: { ...ctx.gold, instantFinishMin: rolloutParams.finishMin } } : ctx);
    for (const a of bestActions) applyAction(replay, a);
    greedyContinue(replay, rolloutParams);
    best = { settleTime: null, result: replay.finish() };
  }
  return { settleTime: best.result.settleTime ?? bestSettle, actions: bestActions, result: best.result, nodesExpanded: expanded };
}
