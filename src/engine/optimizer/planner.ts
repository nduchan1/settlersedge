/** Fastest-second-village planner v1.
 *  Reactive greedy builder over a live Simulation, parameterized and grid-searched.
 *  Phase A: economy (fields to target). Phase B: Residence 10 (prereqs auto). Phase C: settlers.
 *  Phase D: CP push — greedy loop choosing the action with the best projected settle time among
 *  CP buildings, crannies, Town-Hall celebrations, evaluated against the true simulated state. */
import { GID, building, levelData, raceMaxLevel, wallGid } from '../data/buildings';
import { taskTriggers } from '../sim/tasks';
import { tribes } from '../data/tribes';
import { cavalryRaiders, raidThroughputPerHour, unitThroughputPerHour } from '../data/raiders';
import { celebrationCpCap } from '../data/culture';
import { celebrationDuration, mbTimeFactor } from '../formulas';
import {
  CELEBRATION_COST, MAX_BUILDING_SLOTS, Simulation, addSlot, affordabilityWait, buildingSlotsUsed,
  cpPerSecond, goldLeft, ownedPerResource, productionPerSecond, settleGoal, storageCaps, type SimContext, type SimResult,
} from '../sim/simulate';
import type { Resources } from '../types';

export interface StrategyParams {
  /** Upgrade all resource fields to this level before the Residence push (0 = skip). */
  fieldTarget: number;
  /** Build the Town Hall path (Barracks 3 → Academy 10 → MB 10 → TH) to enable celebrations. */
  townHall: boolean;
  /** Build CP infrastructure EARLY (embassy to this level before the Residence push; 0 = skip).
   *  CP is an integral over time — early CP-rate investment compounds (research/09 wisdom). */
  cpEarly: number;
  /** Finish-Now policy: instant-complete builds ≥ this many minutes (2 gold each; Infinity = never). */
  finishMin: number;
  /** Train basic raiders for the oasis trickle (default true; false = hero-only, no troops). */
  raiders?: boolean;
  /** Use the tribe's researchable cavalry raider (Hun Steppe Riders) instead of basic infantry. */
  cavalry?: boolean;
  /** Order Residence 1→10 BEFORE the field/CP phases (critical-path-first). */
  residenceFirst?: boolean;
  /** Early-tempo cell (searched, not imposed): task arbitrage bursts, Town Hall right after the
   *  Residence order, and a party whenever affordable — record pace needs party 1 by ~6h. On some
   *  configs the extra early actions crowd the build lane instead; the grid decides. */
  partyEarly?: boolean;
}

export interface PlanOutcome {
  params: StrategyParams;
  settleTime: number | null;
  result: SimResult;
  error?: string;
}

const FIELD_ORDER: (keyof Resources)[] = ['wood', 'clay', 'iron', 'crop'];

/** Level the next order on this slot targets (current + queued). Uses the sim's own queue, so it
 *  is correct on light search clones that carry no event history. */
function currentTarget(sim: Simulation, slotIdx: number): number {
  return sim.orderedLevel(slotIdx) + 1;
}

function ensureBuilding(sim: Simulation, gid: number, level: number): void {
  for (const p of building(gid).prerequisites as { type: string; gid?: number[]; level?: number }[]) {
    if (p.type === 'Building' && p.gid) ensureBuilding(sim, p.gid[0], p.level ?? 1);
  }
  let idx = sim.state.slots.findIndex((s) => s.gid === gid);
  if (idx === -1) idx = addSlot(sim.state, gid);
  while (currentTarget(sim, idx) <= level) buildWithStorage(sim, idx);
}

/** During the build phases, fire a party opportunistically whenever the Town Hall is free and the
 *  celebration is affordable NOW — benchmark insight (Saesenthessi x2): record plans hold Party 1
 *  at 7–10h, DURING the residence push, because every hour of delay pushes the next party 1:1. */
let phasePartyThreshold: number | null = null;

function maybePhaseParty(sim: Simulation): void {
  if (phasePartyThreshold === null) return;
  const s = sim.state;
  if (s.cp >= phasePartyThreshold || s.celebrationBusyUntil > s.time) return;
  const thLvl = Math.max(0, ...s.slots.filter((x) => x.gid === GID.townHall).map((x) => x.level));
  if (thLvl < 1) return;
  if (Math.min(celebrationCpCap[sim.ctx.config.speed][0], cpPerSecond(s) * 86400) < 25) return;
  // party costs exceed build-driven storage (6,650 clay) — raise caps for it explicitly
  raiseCapsFor(sim, CELEBRATION_COST.small);
  // never stall waiting for the COOLDOWN — but waiting for affordability IS the "bank toward
  // the party" behavior records use (income accrues while the build lane pauses briefly)
  if (affordabilityWait(s, sim.ctx, CELEBRATION_COST.small) === Infinity) return;
  sim.celebration(false);
}

function buildWithStorage(sim: Simulation, slotIdx: number): void {
  const gid = sim.state.slots[slotIdx].gid;
  const target = currentTarget(sim, slotIdx);
  const ld = levelData(gid, target);
  raiseCapsFor(sim, { wood: ld.resourceCost.r1, clay: ld.resourceCost.r2, iron: ld.resourceCost.r3, crop: ld.resourceCost.r4 });
  sim.build(slotIdx);
  maybePhaseParty(sim);
}

function raiseCapsFor(sim: Simulation, cost: Resources): void {
  for (let guard = 0; guard < 40; guard++) {
    const caps = storageCaps(sim.state);
    // storage-ahead: also grow toward what is already OWNED (store + bag + unclaimed) so windfalls
    // don't sit idle above the cap (Hun x3 audit: 35k idle 9h). Capped at ~L8 WH / L6 GR growth per pass.
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
    ensureBuilding(sim, GID.mainBuilding, 1);
    let idx = sim.state.slots.findIndex((s) => s.gid === gid);
    if (idx === -1) idx = addSlot(sim.state, gid);
    sim.build(idx);
  }
}

function nextField(sim: Simulation, target: number): number | null {
  let best: number | null = null;
  let bestKey = Infinity;
  sim.state.slots.forEach((s, i) => {
    if (s.gid < 1 || s.gid > 4) return;
    const t = currentTarget(sim, i);
    if (t > target) return;
    const key = t * 1e9 + sim.state.res[FIELD_ORDER[s.gid - 1]];
    if (key < bestKey) { bestKey = key; best = i; }
  });
  return best;
}

/** Keep net crop above a small margin by upgrading the lowest cropland; true if it built. */
function ensureCropOk(sim: Simulation): boolean {
  const perHour = productionPerSecond(sim.state, sim.ctx).crop * 3600;
  if (perHour > 4 * sim.ctx.config.speed) return false;
  let best: number | null = null;
  let bl = Infinity;
  sim.state.slots.forEach((s, i) => {
    if (s.gid !== 4) return;
    const t = currentTarget(sim, i);
    if (t <= 10 && t < bl) { bl = t; best = i; }
  });
  if (best === null) return false;
  buildWithStorage(sim, best);
  return true;
}

// ---------- Phase D: CP push ----------

interface Candidate { est: number; rank: number; doneAt: number; costTotal: number; exec: () => void }

/** Seconds until `cost` is affordable (NPC-aware — pooled totals once a Marketplace exists). */
function affordWait(sim: Simulation, cost: Resources): number {
  return affordabilityWait(sim.state, sim.ctx, cost);
}

function settleEstimate(now: number, cp: number, rate: number, thr: number, settlersAt: number): number {
  const cpAt = cp >= thr ? now : rate > 0 ? now + (thr - cp) / rate : Infinity;
  return Math.max(cpAt, settlersAt);
}

/** Greedy CP push: act while some action improves the projected settle time. */
function cpPush(sim: Simulation, thr: number, settlersAt: number, allowTownHall: boolean, tick?: () => void): void {
  const CP_GIDS = [GID.embassy, GID.marketplace, GID.barracks, GID.academy, GID.mainBuilding, GID.warehouse, GID.granary];
  for (let iter = 0; iter < 300; iter++) {
    const s = sim.state;
    tick?.(); // e.g. top up raiders as more oases get cleared (the fleet used to freeze here)
    if (ensureCropOk(sim)) continue;
    const rate = cpPerSecond(s);
    const base = settleEstimate(s.time, s.cp, rate, thr, settlersAt);
    if (s.cp >= thr || base === s.time) return;
    const mbLvl = Math.max(1, ...s.slots.filter((x) => x.gid === GID.mainBuilding).map((x) => x.level));
    const speed = sim.ctx.config.speed;
    const candidates: Candidate[] = [];

    const addBuild = (gid: number, idx: number | null): void => {
      const slotIdx = idx ?? -1;
      if (idx === null && buildingSlotsUsed(s) >= MAX_BUILDING_SLOTS) return;
      const target = idx !== null ? currentTarget(sim, idx) : 1;
      if (target > raceMaxLevel(gid)) return;
      // prereqs must already hold for candidate evaluation (TH path handled separately)
      const prereqsOk = (building(gid).prerequisites as { type: string; gid?: number[]; level?: number }[])
        .every((p) => p.type !== 'Building' || !p.gid ||
          Math.max(0, ...s.slots.filter((x) => x.gid === p.gid![0]).map((x) => x.level)) >= (p.level ?? 1));
      if (!prereqsOk) return;
      const ld = levelData(gid, target);
      const cost: Resources = { wood: ld.resourceCost.r1, clay: ld.resourceCost.r2, iron: ld.resourceCost.r3, crop: ld.resourceCost.r4 };
      const caps = storageCaps(s);
      if (Math.max(cost.wood, cost.clay, cost.iron) > caps.warehouse || cost.crop > caps.granary) return;
      const wait = affordWait(sim, cost);
      if (wait === Infinity) return;
      const start = Math.max(s.time + wait, sim.laneFreeTime('building'));
      const duration = Math.round((ld.buildingTime * mbTimeFactor(mbLvl)) / speed);
      const g = sim.ctx.gold;
      const instant = !!g && duration >= g.instantFinishMin * 60 && goldLeft(s, sim.ctx) >= 2;
      const done = instant ? start : start + duration;
      const prevCp = idx !== null && s.slots[slotIdx].level > 0 ? levelData(gid, s.slots[slotIdx].level).culturePoints : 0;
      const dRate = (ld.culturePoints - prevCp) / 86400;
      const cpAtDone = s.cp + rate * (done - s.time);
      const est = settleEstimate(done, cpAtDone, rate + dRate, thr, settlersAt);
      if (est < base - 1 && dRate > 0) {
        // rank: CP-rate gained per second of build-lane occupancy (opportunity cost of the lane)
        const laneSeconds = done - Math.max(s.time, sim.laneFreeTime('building'));
        candidates.push({
          est, rank: dRate / Math.max(1, laneSeconds), doneAt: done,
          costTotal: cost.wood + cost.clay + cost.iron + cost.crop,
          exec: () => buildWithStorage(sim, slotIdx !== -1 ? slotIdx : addSlot(sim.state, gid)),
        });
      }
    };

    for (const gid of CP_GIDS) {
      const idx = s.slots.findIndex((x) => x.gid === gid);
      if (idx !== -1) addBuild(gid, idx);
      else addBuild(gid, null);
    }
    // crannies are slot FILLER: only spend free slots on them once the high-ceiling
    // CP buildings (embassy, marketplace) are placed
    const hasEmbassy = s.slots.some((x) => x.gid === GID.embassy);
    const hasMarket = s.slots.some((x) => x.gid === GID.marketplace);
    if (hasEmbassy && hasMarket) addBuild(GID.cranny, null);

    const addChain = (gid: number, idx: number, depth: number): void => {
      const startLvl = currentTarget(sim, idx);
      const endLvl = Math.min(startLvl + depth - 1, raceMaxLevel(gid));
      if (endLvl <= startLvl) return;
      let costW = 0, costC = 0, costI = 0, costCr = 0, dur = 0;
      for (let l = startLvl; l <= endLvl; l++) {
        const ld = levelData(gid, l);
        costW += ld.resourceCost.r1; costC += ld.resourceCost.r2; costI += ld.resourceCost.r3; costCr += ld.resourceCost.r4;
        dur += Math.round((ld.buildingTime * mbTimeFactor(mbLvl)) / speed);
      }
      const cost: Resources = { wood: costW, clay: costC, iron: costI, crop: costCr };
      const caps = storageCaps(s);
      if (Math.max(costW, costC, costI) > caps.warehouse || costCr > caps.granary) return;
      const wait = affordWait(sim, cost);
      if (wait === Infinity) return;
      const g = sim.ctx.gold;
      const perLevelInstant = !!g && goldLeft(s, sim.ctx) >= 2 * (endLvl - startLvl + 1);
      const start = Math.max(s.time + wait, sim.laneFreeTime('building'));
      const done = perLevelInstant && g!.instantFinishMin <= 1 ? start : start + dur;
      const prevCp = s.slots[idx].level > 0 ? levelData(gid, s.slots[idx].level).culturePoints : 0;
      const dRate = (levelData(gid, endLvl).culturePoints - prevCp) / 86400;
      if (dRate <= 0) return;
      const cpAtDone = s.cp + rate * (done - s.time);
      const est = settleEstimate(done, cpAtDone, rate + dRate, thr, settlersAt);
      if (est < base - 1) {
        candidates.push({
          est, rank: dRate / Math.max(1, done - Math.max(s.time, sim.laneFreeTime('building'))),
          doneAt: done, costTotal: costW + costC + costI + costCr,
          exec: () => { for (let l = startLvl; l <= endLvl; l++) buildWithStorage(sim, idx); },
        });
      }
    };

    // chain candidates: multi-level CP pushes (embassy 15→20 etc.) that single-step myopia
    // undervalues — evaluated as one macro (records milk the 500-CP party cap this way)
    for (const gid of CP_GIDS) {
      const idx = s.slots.findIndex((x) => x.gid === gid);
      if (idx !== -1) addChain(gid, idx, 5);
    }
    // cranny L3 trick (Nitai): L2 adds no CP (round(1.2²)=1) so single-step dRate>0 filters it out,
    // but L3 hits 2/day — evaluate L2→L3 as a chain on EVERY existing cranny
    s.slots.forEach((sl, i) => {
      if (sl.gid === GID.cranny) addChain(GID.cranny, i, 2);
    });

    // celebrations run on the Town Hall lane; compare by settle estimate against the best build
    const thIdx = s.slots.findIndex((x) => x.gid === GID.townHall);
    const thLvl = thIdx >= 0 ? s.slots[thIdx].level : 0;
    // Small celebrations only: greats grant account-wide daily CP (same as small with one village)
    // at ~5× the cost + warehouse pain — never worth it for settling (Nitai).
    let party: Candidate | null = null;
    if (thLvl >= 1) {
      const wait = affordWait(sim, CELEBRATION_COST.small);
      if (wait !== Infinity) {
        const start = Math.max(s.time + wait, s.celebrationBusyUntil);
        const grant = Math.min(celebrationCpCap[sim.ctx.config.speed][0], rate * 86400);
        const cpAtStart = s.cp + rate * (start - s.time);
        const est = settleEstimate(start, cpAtStart + grant, rate, thr, settlersAt);
        if (grant >= 25 && est < base - 1) party = { est, rank: 0, doneAt: start, costTotal: 0, exec: () => { raiseCapsFor(sim, CELEBRATION_COST.small); sim.celebration(false); } };
      }
    } else if (thIdx === -1 && allowTownHall) {
      // committing to the TH path is a macro-decision; take it once the economy can carry it
      // (only when no TH slot exists yet — a pending TH build must not re-trigger the macro)
      const mbNow = Math.max(0, ...s.slots.filter((x) => x.gid === GID.mainBuilding).map((x) => x.level));
      if (mbNow >= 5) { ensureBuilding(sim, GID.townHall, 1); continue; }
    }

    if (!candidates.length && !party) return;
    candidates.sort((a, b) => b.rank - a.rank);
    const bestBuild = candidates[0] ?? null;
    // Two-party meta (Nitai): if the race will outlast another full party cooldown, the party takes
    // priority over builds — delaying it delays the NEXT party one-for-one, and its CP-per-resource
    // dwarfs any building's.
    if (party) {
      // cheap CP builds (crannies etc.) completing within the party's wait go FIRST — they barely
      // delay it and raise the grant (meta: crannies before the party — Nitai)
      const cheapFirst = candidates
        .filter((c) => c.doneAt <= party!.doneAt + 1 && c.costTotal <= 1000)
        .sort((a, b) => b.rank - a.rank)[0];
      if (cheapFirst) { cheapFirst.exec(); continue; }
      const cooldown = celebrationDuration(thLvl, 'small', sim.ctx.config.speed);
      if (base > party.doneAt + cooldown) { party.exec(); continue; }
    }
    // Otherwise: raise CP buildings BEFORE partying — the grant equals the daily CP rate at party
    // start, so any build completing within the party's own wait is a free grant increase.
    if (party && bestBuild && bestBuild.doneAt <= party.doneAt + 1) { bestBuild.exec(); continue; }
    if (party && (!bestBuild || party.est < bestBuild.est)) party.exec();
    else bestBuild!.exec();
  }
}

export function runStrategy(params: StrategyParams, ctx: SimContext): PlanOutcome {
  const simCtx: SimContext = ctx.gold
    ? { ...ctx, gold: { ...ctx.gold, instantFinishMin: params.finishMin } }
    : ctx;
  const sim = new Simulation(simCtx);
  const settleTime = greedyContinue(sim, params);
  const result = sim.finish();
  return { params, settleTime: settleTime ?? result.settleTime, result, error: lastGreedyError ?? undefined };
}

let lastGreedyError: string | null = null;

/** The greedy policy, continuing an EXISTING simulation to settle (no restart). Also the organic
 *  beam's rollout: score = how fast a competent default player finishes from this state.
 *  Returns the settle time or null. Mutates `sim`; search callers pass a clone. */
/** Order buildings whose TRIGGERED TASK pays for them — pure arbitrage, data-derived (record
 *  players "instabuild" cheap buildings in hour 0-1 exactly for the task bursts). For a strength
 *  hero with clears pending, task XP is additionally priced (banked XP = level-up heals = more
 *  raids), at half a supply's bounty per XP. Managed gids (expansion/TH) are left to the phases. */
const HARVEST_SKIP = new Set<number>([GID.residence, GID.palace, GID.commandCenter, GID.townHall]);
function harvestProfitableTasks(sim: Simulation, ctx: SimContext): void {
  if (ctx.tasks === false) return;
  // STRICT arbitrage only: the resource reward must cover the cost by itself. Pricing XP in
  // (tried at 80/XP) buys XP early but front-loads spending and delays the Residence — net loss.
  const xpPrice = 0;
  for (let guard = 0; guard < 20; guard++) {
    let ordered = false;
    for (const [t, trig] of taskTriggers) {
      if (sim.state.firedTasks.has(t.key)) continue;
      if (trig.type !== 'max' && trig.type !== 'one') continue;
      let gid = trig.gid;
      if (trig.gids) {
        if (trig.gids.some((g) => HARVEST_SKIP.has(g))) continue; // Residence/Palace/CC: phase-managed
        // alias tasks (walls): use the slot that exists, else the tribe's own wall
        gid = trig.gids.find((g) => sim.state.slots.some((sl) => sl.gid === g)) ?? wallGid(ctx.tribe);
        if (!trig.gids.includes(gid)) continue;
      }
      if (gid <= 4 || HARVEST_SKIP.has(gid)) continue;
      let maxLvl: number;
      try { maxLvl = raceMaxLevel(gid); } catch { continue; }
      if (trig.lvl > maxLvl) continue;
      let idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
      const from = idx === -1 ? 0 : sim.orderedLevel(idx);
      if (from >= trig.lvl) continue; // already on its way — will fire by itself
      if (trig.lvl - from > 3) continue; // deep chains are a strategy, not arbitrage
      if (idx === -1) {
        // only place new buildings whose prerequisites are already satisfied (no hidden costs)
        const missing = (building(gid).prerequisites as { type: string; gid?: number[]; level?: number }[])
          .some((pr) => pr.type === 'Building' && pr.gid && orderedGidLevel(sim, pr.gid[0]) < (pr.level ?? 1));
        if (missing) continue;
      }
      let cost = 0;
      for (let l = from + 1; l <= trig.lvl; l++) {
        const ld = levelData(gid, l);
        cost += ld.resourceCost.r1 + ld.resourceCost.r2 + ld.resourceCost.r3 + ld.resourceCost.r4;
      }
      const reward = t.res[0] + t.res[1] + t.res[2] + t.res[3] + t.xp * xpPrice;
      if (reward < cost) continue;
      if (idx === -1) idx = addSlot(sim.state, gid);
      while (sim.orderedLevel(idx) < trig.lvl) buildWithStorage(sim, idx);
      ordered = true;
    }
    if (!ordered) return;
  }
}
function orderedGidLevel(sim: Simulation, gid: number): number {
  const idx = sim.state.slots.findIndex((sl) => sl.gid === gid);
  return idx === -1 ? 0 : sim.orderedLevel(idx);
}

/** Hold a small party NOW if the Town Hall is up, the cooldown is over and the bank affords it —
 *  never blocks (waiting happens in cpPush at the end). Early parties = more grants per race. */
function holdPartyIfAffordable(sim: Simulation): void {
  const s = sim.state;
  if (s.time < s.celebrationBusyUntil) return;
  if (Math.max(0, ...s.slots.filter((x) => x.gid === GID.townHall).map((x) => x.level)) < 1) return;
  if (Math.min(celebrationCpCap[sim.ctx.config.speed][0], cpPerSecond(s) * 86400) < 25) return;
  raiseCapsFor(sim, CELEBRATION_COST.small);
  if (affordabilityWait(s, sim.ctx, CELEBRATION_COST.small) !== 0) return; // affordable NOW only
  sim.celebration(false);
}

/** Train raiders/cavalry toward the trickle the CLEARED oases currently support (+15% lookahead).
 *  Idempotent and cheap — called at every greedy phase boundary so the fleet grows with the clears
 *  instead of arriving as one early lump. Data-derived sizing, not a strategy rule. */
function topUpRaiders(sim: Simulation, params: StrategyParams, ctx: SimContext): void {
  const o = ctx.oasisRaids;
  if (!o || params.raiders === false) return;
  const regenAll = o.tricklePerHour ?? 0;
  if (regenAll <= 0) return;
  const packs = sim.state.oasisPacks;
  const clearedFrac = packs.length ? packs.filter((v) => v <= 0).length / packs.length : 1;
  const target = regenAll * Math.min(1, clearedFrac + 0.15);
  if (target <= 0) return;
  ensureBuilding(sim, GID.rallyPoint, 1);
  const dist = o.distance ?? 3;
  const cav = cavalryRaiders[ctx.tribe];
  if (params.cavalry && cav) {
    // hybrid staging (Saesenthessi): a few cheap infantry carry the first cleared oases; the
    // Stable chain starts only once the Residence is ORDERED (the settle path is already rolling)
    const resOrdered = sim.state.slots.some((sl) => sl.gid === GID.residence || sl.gid === GID.palace || sl.gid === GID.commandCenter);
    if (!resOrdered && !sim.state.cavalryResearched) {
      ensureBuilding(sim, GID.barracks, 1);
      const perInf = raidThroughputPerHour(ctx.tribe, 1, dist, ctx.config.speed);
      const needInf = Math.ceil(Math.max(0, target - sim.state.raiders * perInf) / Math.max(1e-6, perInf));
      if (needInf > 0) sim.trainRaiders(Math.min(needInf, 15));
      return;
    }
    ensureBuilding(sim, GID.stable, cav.stableLevel);
    sim.researchCavalry();
    const perUnit = unitThroughputPerHour(cav, 1, dist, ctx.config.speed);
    const infT = raidThroughputPerHour(ctx.tribe, sim.state.raiders, dist, ctx.config.speed);
    const need = Math.ceil(Math.max(0, target - infT - sim.state.cavalry * perUnit) / Math.max(1e-6, perUnit));
    if (need > 0) sim.trainCavalry(Math.min(need, 20));
  } else {
    ensureBuilding(sim, GID.barracks, 1);
    const perUnit = raidThroughputPerHour(ctx.tribe, 1, dist, ctx.config.speed);
    const need = Math.ceil(Math.max(0, target - sim.state.raiders * perUnit) / Math.max(1e-6, perUnit));
    if (need > 0) sim.trainRaiders(Math.min(need, 40));
  }
}

export function greedyContinue(sim: Simulation, params: StrategyParams): number | null {
  const ctx = sim.ctx;
  lastGreedyError = null;
  try {
    phasePartyThreshold = params.townHall ? settleGoal(ctx.config).threshold : null;
    let settlersAt = sim.laneFreeTime('training');
    if (sim.state.settlers < settleGoal(ctx.config).settlers && settlersAt <= sim.state.time) {
      // record chasers rush the Marketplace: NPC makes every later wait a pooled-total wait
      if (ctx.oasisRaids || ctx.adventures) ensureBuilding(sim, GID.rallyPoint, 1); // hero gate first
      if (ctx.gold?.npc) ensureBuilding(sim, GID.marketplace, 1);
      // oasis trickle needs troops (hero can't trickle-raid — Nitai). STAGED: train only what the
      // currently-CLEARED oases can feed (+1 batch lookahead) and top up again at each later phase —
      // the old one-shot fleet (sized to the final cap) starved the Residence path (real players
      // train 10-15 early, more after party 1 — Saesenthessi).
      topUpRaiders(sim, params, ctx);
      if (params.partyEarly) harvestProfitableTasks(sim, ctx);
      // ordering variants (grid): fields-first (economy) or residence-first (critical path — record
      // plans start Residence 1 by ~5-6h; on speed servers the Residence timer is the binding path)
      const fields = () => { for (;;) { const f = nextField(sim, params.fieldTarget); if (f === null) break; buildWithStorage(sim, f); } };
      const cpAndTh = () => {
        if (params.cpEarly > 0) {
          ensureBuilding(sim, GID.embassy, Math.min(params.cpEarly, building(GID.embassy).maxLevel));
          ensureBuilding(sim, GID.marketplace, 1);
        }
        if (params.townHall) ensureBuilding(sim, GID.townHall, 1);
      };
      if (params.residenceFirst) {
        // Residence to 10 as early as possible; fields/CP/TH interleave AFTER each Residence order
        // (they build in the queue behind it — the Residence lane is what matters)
        ensureBuilding(sim, GID.residence, 10);
        if (params.partyEarly && params.townHall) ensureBuilding(sim, GID.townHall, 1);
        if (params.partyEarly) holdPartyIfAffordable(sim);
        topUpRaiders(sim, params, ctx);
        fields();
        if (params.partyEarly) holdPartyIfAffordable(sim);
        topUpRaiders(sim, params, ctx);
        cpAndTh();
      } else {
        fields();
        topUpRaiders(sim, params, ctx);
        if (params.partyEarly && params.townHall) ensureBuilding(sim, GID.townHall, 1);
        if (params.partyEarly) holdPartyIfAffordable(sim);
        cpAndTh();
        topUpRaiders(sim, params, ctx);
        ensureBuilding(sim, GID.residence, 10);
      }
      if (params.partyEarly) holdPartyIfAffordable(sim);
      topUpRaiders(sim, params, ctx);
      if (params.partyEarly) harvestProfitableTasks(sim, ctx);
      raiseCapsFor(sim, tribes[ctx.tribe].settlerCost);
      sim.trainSettlers();
      settlersAt = sim.laneFreeTime('training');
    }
    phasePartyThreshold = null;
    cpPush(sim, settleGoal(ctx.config).threshold, settlersAt, params.townHall, () => topUpRaiders(sim, params, ctx));
    return sim.finish().settleTime;
  } catch (e) {
    phasePartyThreshold = null;
    lastGreedyError = (e as Error).stack ?? (e as Error).message;
    return null;
  }
}

export interface OptimizeOptions {
  fieldTargets?: number[];
  townHall?: boolean[];
  cpEarly?: number[];
  finishMin?: number[];
}

export function optimize(ctx: SimContext, opts: OptimizeOptions = {}): PlanOutcome[] {
  const fieldTargets = opts.fieldTargets ?? [0, 2, 3, 4, 5, 6];
  const townHalls = opts.townHall ?? [false, true];
  const cpEarlies = opts.cpEarly ?? [0, 8, 14, 20];
  const finishMins = opts.finishMin ?? (ctx.gold ? [Infinity, 15, 5, 1, 0] : [Infinity]);
  const outcomes: PlanOutcome[] = [];
  const cavOptions = cavalryRaiders[ctx.tribe] && (ctx.oasisRaids?.tricklePerHour ?? 0) > 0 ? [false, true] : [false];
  for (const fieldTarget of fieldTargets) {
    for (const townHall of townHalls) {
      for (const cpEarly of cpEarlies) {
        for (const finishMin of finishMins) {
          for (const cavalry of cavOptions) {
            for (const residenceFirst of [false, true]) {
              for (const partyEarly of townHall ? [false, true] : [false]) {
                outcomes.push(runStrategy({ fieldTarget, townHall, cpEarly, finishMin, cavalry, residenceFirst, partyEarly }, ctx));
              }
            }
          }
        }
      }
    }
  }
  return outcomes.sort((a, b) => (a.settleTime ?? Infinity) - (b.settleTime ?? Infinity));
}

