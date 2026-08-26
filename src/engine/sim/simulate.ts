/** Event-driven early-game simulator.
 *  Models (with research provenance): continuous resource & CP accrual (07), storage clamps,
 *  crop upkeep, per-tribe queue lanes incl. Roman dual queue (01), MB time reduction (01),
 *  hero production (141/07), task rewards with hero-level bonus (08), settler training with
 *  Residence ×0.9/level + alliance Recruitment (07/10), reworked celebrations: instant capped
 *  CP + cooldown (03/07), settle-readiness detection vs official CP thresholds (03/05). */
import { GID, fieldProduction, levelData, storageCapacity } from '../data/buildings';
import { tribes } from '../data/tribes';
import { cavalryRaiders, raidThroughputPerHour, raiders, troopSpeedFactor, unitThroughputPerHour } from '../data/raiders';
import { BASE_STORAGE, STARTING_RESOURCES } from '../data/servers';
import { advancedStartCp, celebrationCpCap, cpThreshold, startingCp } from '../data/culture';
import { celebrationDuration, mbTimeFactor, settlerTime } from '../formulas';
import { heroLevel, heroProductionVector, type HeroConfig } from './hero';
import { DEFAULT_PACK_SUPPLY, DEF_PER_SUPPLY_TYPICAL, defaultPacks, heroFightingStrength, oasisDistance, raidHit, raidRoundTripH } from './oasisCombat';
import { collectTriggered, taskIndex, type FiredTask, type TaskDef, type TaskWorldView } from './tasks';
import type { AccountModifiers, Resources, ServerConfig, Tribe } from '../types';

export interface Slot { gid: number; level: number }

export interface SimContext {
  config: ServerConfig;
  tribe: Tribe;
  mods: AccountModifiers;
  hero: HeroConfig;
  /** Model tasks? (default true) */
  tasks?: boolean;
  /** Flat extra income (adventure EV etc.), units per hour at server speed already applied. */
  extraIncomePerHour?: Partial<Resources>;
  /** Gold usage (mandatory modeling for record chasers — Nitai).
   *  npc: 3 gold/exchange, pooled totals once a Marketplace exists. */
  gold?: {
    budget: number;
    npc: boolean;
    /** Finish-Now policy: instantly complete builds whose duration ≥ this many minutes
     *  (always 2 gold — NO free tier, player-verified; Infinity = never). Optimizer-searched. */
    instantFinishMin: number;
  };
  /** BP oasis raiding: animals do NOT respawn during beginner's protection, so income is
   *  one-time hero-bag clears + a small trickle — not a flat rate (Nitai). */
  oasisRaids?: {
    /** Oases the hero will farm. Each is an animal pack (supply points) cleared over 2-4 raid hits
     *  DERIVED from the T4.6 raid combat formula (see sim/oasisCombat.ts) — not a loot schedule. */
    count: number;
    /** Mean animal supply per oasis (default DEFAULT_PACK_SUPPLY; live-verified ~14-30). */
    packSupply?: number;
    /** Animal defense per supply vs the mounted hero (default DEF_PER_SUPPLY_TYPICAL). */
    defPerSupply?: number;
    /** Hour the hero STARTS raiding (needs Rally Point + horse; retries each cadence until able). */
    firstAtH: number;
    /** Oasis REGEN available to farm, total/h across all types — an UPPER BOUND on trickle income.
     *  Actual trickle = min(this, troop carry throughput): the hero can't trickle-raid, only troops
     *  (basic unit per tribe) can, and they cost resources + upkeep (Nitai). */
    tricklePerHour: number;
    /** Average distance (fields) to the farmed oases — sets BOTH the hero clear cadence (round
     *  trip, no chaining — Nitai) and the troop trickle round-trip time. */
    distance: number;
  };
  /** Hero does adventures. No knobs — the schedule is known (official art. 46 + Nitai):
   *  3 adventures at server start; spawn rate 3/day on days 0–2 at 1x, declining after,
   *  scaled ×speed. First 10 rewards predetermined (only #2 & #7 pay resources — flat,
   *  NOT speed-scaled); later resource adventures modeled at a small flat EV. */
  adventures?: boolean;
}

export interface SimState {
  time: number;
  res: Resources;
  cp: number;
  xp: number;
  slots: Slot[];
  settlers: number;
  celebrationsHeld: number;
  celebrationBusyUntil: number;
  firedTasks: Set<string>;
  /** Gold spent (NPC @3, instant finish @2; the +25% bonus is priced in the UI, not per-sim). */
  goldSpent: number;
  npcExchanges: number;
  instantFinishes: number;
  /** Banked task rewards: BASE amount per resource (all four equal). Collected on demand —
   *  the hero-level bonus applies at draw time, and the bank ignores storage caps. */
  taskBank: number;
  /** Unclaimed task rewards, one entry per task (BASE per-resource amount). Claiming a task is
   *  all-or-nothing: the whole reward (× hero bonus at claim time) lands in the hero bag. */
  unclaimed: number[];
  /** Hero inventory resources: UNCAPPED. Receives claimed task rewards and oasis/adventure loot
   *  instantly; any amount can be moved to the warehouse (capped there). — Nitai */
  heroBag: Resources;
  /** Trained basic-unit raiders (the tribe's tier-1 unit). They farm the oasis trickle. */
  raiders: number;
  /** Remaining animal supply per farmed oasis (0 = cleared: it produces trickle). */
  oasisPacks: number[];
  /** Hero health 0-100. Raids cost HP (loss % = attacker loss fraction); level-up = full heal. */
  heroHP: number;
  /** SAVED task XP (record meta: hold task claims, level up exactly when HP is low = instant full
   *  heal — Saesenthessi / official KB 185). Spent by the raid loop on demand. */
  xpBank: number;
  /** Last time passive healing (ointments + natural regen) was credited. */
  heroHealT: number;
  /** Hero stopped clearing early (Book-of-Wisdom cutoff): the next oasis' bounty rate fell below
   *  what the hero's points produce as resources — remaining far oases are abandoned (Saesenthessi). */
  heroRetired: boolean;
  /** Trained cavalry raiders (researched unit, e.g. Hun Steppe Rider). */
  cavalry: number;
  cavalryResearched: boolean;
  /** Daily-quest progress (REAL 24h windows from server start — screenshot-verified point table,
   *  Nitai 2026-08-21). Chests: day 1 @25 pts → 50 hero XP; day 2 → +50 CP. Optional so
   *  hand-built test states stay valid; lazily initialized. */
  daily?: { day: number; pts: number; cnt: Record<string, number>; xpChest: boolean; cpChest: boolean };
}

export type PlanStep =
  | { kind: 'build'; slot: number }
  | { kind: 'trainSettlers' }
  | { kind: 'trainRaiders'; count: number }
  | { kind: 'researchCavalry' }
  | { kind: 'trainCavalry'; count: number }
  | { kind: 'celebration'; great?: boolean };

export interface SimEvent {
  time: number;
  type: 'start' | 'complete' | 'task' | 'settlers' | 'celebration' | 'npc' | 'adventure' | 'oasis' | 'finish' | 'collect' | 'raiders';
  label: string;
  slot?: number;
  gid?: number;
  level?: number;
  cp?: number;
  /** Resources paid by this action (orders/parties/settlers) — for the transparent build table. */
  cost?: Resources;
  /** Resources GAINED by this event (task reward, oasis loot, adventure, bank collection). */
  gain?: Resources;
  /** Gold spent by this event (npc / finish). */
  gold?: number;
  /** Finish-Now click id — buildings sharing an id were completed by the same click. */
  click?: number;
  /** Resource situation right AFTER this event: warehouse stock, hero bag, unclaimed tasks (per res). */
  snap?: {
    store: Resources; bag: Resources; unclaimed: number; caps: { warehouse: number; granary: number };
    /** culture points right after this event, the CP/day rate then, and the rate change it caused */
    cp: number; cpPerDay: number; cpRateDelta: number;
  };
}

export interface SimResult {
  events: SimEvent[];
  state: SimState;
  /** Earliest time all settle conditions hold (3 settlers + CP threshold for village 2), or null. */
  settleTime: number | null;
  /** CP trajectory samples for charting: one point per simulation event boundary. */
  series: { t: number; cp: number; settlers: number; econ?: { rates: EconRates; cum: EconCum } }[];
}

const FIELD_GIDS = [1, 2, 3, 4];
const settleGoalOf = (ctx: SimContext) => settleGoal(ctx.config);
const buildingLabel = (gid: number): string => (gid === GID.rallyPoint ? 'Rally Point' : gid === GID.barracks ? 'Barracks' : gid === GID.residence ? 'Residence' : gid === GID.stable ? 'Stable' : gid === GID.academy ? 'Academy' : `gid ${gid}`);
/** Administrative buildings — exempt from Finish Now (Nitai). */
export const ADMIN_GIDS = [GID.residence, GID.palace, GID.commandCenter];
const STANDARD_LAYOUT = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4];
/** Small celebration cost (measured in-game, research/07); great below. */
export const CELEBRATION_COST: Record<'small' | 'great', Resources> = {
  small: { wood: 6400, clay: 6650, iron: 5940, crop: 1340 },
  great: { wood: 29700, clay: 33250, iron: 32000, crop: 6700 },
};

/** What "settle" means for this server type. Advanced Start (official arts. 203/28): the account
 *  spawns with CP for villages 2 AND 3 plus 75% of the v3-to-v4 gap, and 6 trained settlers —
 *  villages 2/3 launch at t~0. The RACE is village FOUR: the remaining 25% CP gap + 3 NEW settlers
 *  (6 pre-trained + 3 trained = 9). Regular servers: village 2, 3 settlers. */
export function settleGoal(config: ServerConfig): { threshold: number; settlers: number } {
  return config.advancedStart
    ? { threshold: cpThreshold(4, config.speed), settlers: 9 }
    : { threshold: cpThreshold(2, config.speed), settlers: 3 };
}

export function createInitialState(config: ServerConfig): SimState {
  const fieldLevel = config.advancedStart ? 5 : 0;
  return {
    time: 0,
    res: { wood: STARTING_RESOURCES, clay: STARTING_RESOURCES, iron: STARTING_RESOURCES, crop: STARTING_RESOURCES },
    cp: config.advancedStart ? advancedStartCp(config.speed) : startingCp[config.speed],
    xp: 0,
    // 18 fields (4-4-4-6) + a level-1 Main Building: every village spawns with it (official,
    // research/02 §274; Nitai). Its "Build Main Building level 1" task therefore fires at spawn.
    slots: [...STANDARD_LAYOUT.map((gid) => ({ gid, level: fieldLevel })), { gid: GID.mainBuilding, level: 1 }],
    settlers: config.advancedStart ? 6 : 0,
    celebrationsHeld: 0,
    celebrationBusyUntil: 0,
    firedTasks: new Set(),
    goldSpent: 0,
    npcExchanges: 0,
    instantFinishes: 0,
    taskBank: 0,
    unclaimed: [],
    heroBag: { wood: 0, clay: 0, iron: 0, crop: 0 },
    raiders: 0,
    oasisPacks: [],
    heroHP: 100,
    xpBank: 0,
    heroHealT: 0,
    heroRetired: false,
    cavalry: 0,
    cavalryResearched: false,
  };
}

/** Actual oasis trickle income/hour: bounded by regen (ctx) AND by what the raiders can carry. */
export function trickleIncome(state: SimState, ctx: SimContext): number {
  const o = ctx.oasisRaids;
  const regenAll = o?.tricklePerHour ?? 0;
  if (!o || regenAll <= 0 || state.raiders <= 0) return 0;
  // an oasis only PRODUCES once its animals are cleared (official art. 190) — scale the available
  // regen by the fraction of packs the hero has emptied. (Empty packs array = direct
  // productionPerSecond callers without a Simulation: full regen — legacy/test path.)
  const packs = state.oasisPacks;
  const cleared = packs.length > 0 ? packs.filter((v) => v <= 0).length : o.count;
  const regen = o.count > 0 ? regenAll * (Math.min(cleared, o.count) / o.count) : regenAll;
  if (regen <= 0) return 0;
  const dist = o.distance ?? 3;
  const cav = cavalryRaiders[ctx.tribe];
  const cavT = cav && state.cavalry > 0 ? unitThroughputPerHour(cav, state.cavalry, dist, ctx.config.speed) : 0;
  return Math.min(regen, raidThroughputPerHour(ctx.tribe, state.raiders, dist, ctx.config.speed) + cavT);
}

/** Value of ALL unclaimed task rewards per resource if claimed now (hero bonus at claim time). */
export function bankValue(state: SimState): number {
  const bonus = 1 + 0.02 * Math.max(0, heroLevel(state.xp) - 1);
  return state.unclaimed.reduce((a, r) => a + Math.floor(r * bonus), 0);
}

/** Storage the village should have to hold what is ALREADY owned (store + hero bag + unclaimed).
 *  Resources sitting in the bag above the cap are unspendable on any single order bigger than the
 *  cap — the "idle bag" was the biggest sink in the Hun x3 audit (35k idle for 9h). Returns the
 *  per-resource cap needed; callers raise Warehouse/Granary toward it (a data rule, not strategy). */
export function ownedPerResource(state: SimState): { warehouseNeed: number; granaryNeed: number } {
  const b = bankValue(state);
  return {
    warehouseNeed: Math.max(
      state.res.wood + state.heroBag.wood + b,
      state.res.clay + state.heroBag.clay + b,
      state.res.iron + state.heroBag.iron + b,
    ),
    granaryNeed: state.res.crop + state.heroBag.crop + b,
  };
}

/** Resources reachable for a purchase = warehouse stock + hero bag + all unclaimed tasks. */
export function reachable(state: SimState): Resources {
  const b = bankValue(state);
  return {
    wood: state.res.wood + state.heroBag.wood + b,
    clay: state.res.clay + state.heroBag.clay + b,
    iron: state.res.iron + state.heroBag.iron + b,
    crop: state.res.crop + state.heroBag.crop + b,
  };
}

export function goldLeft(state: SimState, ctx: SimContext): number {
  return Math.max(0, (ctx.gold?.budget ?? 0) - state.goldSpent);
}

/** Village building slots (beyond the 18 resource fields): 20 in a standard T4.6 village
 *  (plus wall & rally point, which share the cap here for simplicity — v1). */
export const MAX_BUILDING_SLOTS = 20;

export function buildingSlotsUsed(state: SimState): number {
  return state.slots.filter((s) => s.gid > 4).length;
}

export function addSlot(state: SimState, gid: number): number {
  if (buildingSlotsUsed(state) >= MAX_BUILDING_SLOTS) throw new Error('No free building slots');
  state.slots.push({ gid, level: 0 });
  return state.slots.length - 1;
}

export function population(state: SimState): number {
  return state.slots.reduce((a, s) => a + (s.level > 0 ? levelData(s.gid, s.level).population : 0), 0);
}

function levelOf(state: SimState, gid: number): number {
  return Math.max(0, ...state.slots.filter((s) => s.gid === gid).map((s) => s.level));
}

export function productionPerSecond(state: SimState, ctx: SimContext): Resources {
  const perHour = { wood: 0, clay: 0, iron: 0, crop: 0 };
  const keys: (keyof Resources)[] = ['wood', 'clay', 'iron', 'crop'];
  for (const s of state.slots) {
    if (FIELD_GIDS.includes(s.gid)) perHour[keys[s.gid - 1]] += fieldProduction(s.gid, s.level);
  }
  // hero production: enabled from the start, OR after a Book-of-Wisdom respec (strength → resources)
  // hero production: enabled from the start, OR after the Book-of-Wisdom respec — automatic when
  // every farmed oasis is cleared (record meta: strength for the clears, then all points to res),
  // or at a manual respecAtH override.
  const clearsDone = state.heroRetired || (state.oasisPacks.length > 0 && state.oasisPacks.every((v) => v <= 0));
  const heroOn = ctx.hero.enabled || clearsDone || (ctx.hero.respecAtH !== undefined && state.time >= ctx.hero.respecAtH * 3600);
  const hero = heroProductionVector(state.xp, { ...ctx.hero, enabled: heroOn }, ctx.tribe, ctx.config, ctx.mods.goldProductionBonus);
  const extra = ctx.extraIncomePerHour ?? {};
  const trickle = trickleIncome(state, ctx) / 4;
  const pop = population(state) + state.raiders * raiders[ctx.tribe].upkeep + state.cavalry * (cavalryRaiders[ctx.tribe]?.upkeep ?? 0)
    + state.settlers; // settlers eat 1 crop/h each too (official)
  const speed = ctx.config.speed;
  return {
    wood: (perHour.wood * speed + hero.wood + (extra.wood ?? 0) + trickle) / 3600,
    clay: (perHour.clay * speed + hero.clay + (extra.clay ?? 0) + trickle) / 3600,
    iron: (perHour.iron * speed + hero.iron + (extra.iron ?? 0) + trickle) / 3600,
    crop: (perHour.crop * speed + hero.crop + (extra.crop ?? 0) + trickle - pop) / 3600,
  };
}

/** Per-source production rates, TOTAL res/hour (sum of all four resources) — for the economy chart. */
export interface EconRates { fields: number; hero: number; trickle: number; upkeep: number }
/** Cumulative income by source + total spending (total resources). */
export interface EconCum { fields: number; hero: number; trickle: number; tasks: number; oasis: number; adventures: number; spend: number }

export function productionBreakdown(state: SimState, ctx: SimContext): EconRates {
  let fields = 0;
  for (const sl of state.slots) if (FIELD_GIDS.includes(sl.gid)) fields += fieldProduction(sl.gid, sl.level);
  fields *= ctx.config.speed;
  const clearsDone = state.heroRetired || (state.oasisPacks.length > 0 && state.oasisPacks.every((v) => v <= 0));
  const heroOn = ctx.hero.enabled || clearsDone || (ctx.hero.respecAtH !== undefined && state.time >= ctx.hero.respecAtH * 3600);
  const hv = heroProductionVector(state.xp, { ...ctx.hero, enabled: heroOn }, ctx.tribe, ctx.config, ctx.mods.goldProductionBonus);
  const upkeep = population(state) + state.raiders * raiders[ctx.tribe].upkeep + state.cavalry * (cavalryRaiders[ctx.tribe]?.upkeep ?? 0) + state.settlers;
  return { fields, hero: hv.wood + hv.clay + hv.iron + hv.crop, trickle: trickleIncome(state, ctx), upkeep };
}

/** Is NPC trading active (gold budget covers it + a finished Marketplace)? */
export function npcActive(state: SimState, ctx: SimContext): boolean {
  return !!ctx.gold?.npc && goldLeft(state, ctx) >= 3 &&
    state.slots.some((s) => s.gid === GID.marketplace && s.level >= 1);
}

/** Seconds until `cost` is affordable at current constant rates (Infinity if capped/starved).
 *  With NPC active, resources pool: only the TOTAL matters (each cost still must fit its cap). */
export function affordabilityWait(state: SimState, ctx: SimContext, cost: Resources, rateHint?: Resources): number {
  const rate = rateHint ?? productionPerSecond(state, ctx);
  const caps = storageCaps(state);
  const have = reachable(state); // warehouse + hero bag + unclaimed tasks (bag & tasks are cap-free)
  if (npcActive(state, ctx)) {
    const totalCost = cost.wood + cost.clay + cost.iron + cost.crop;
    const totalStock = have.wood + have.clay + have.iron + have.crop;
    if (totalStock >= totalCost) return 0;
    // accumulating beyond stock: each resource must be storable up to its share
    if (Math.max(cost.wood, cost.clay, cost.iron) > caps.warehouse || cost.crop > caps.granary) return Infinity;
    const totalRate = rate.wood + rate.clay + rate.iron + rate.crop;
    return totalRate > 0 ? (totalCost - totalStock) / totalRate : Infinity;
  }
  // A payment routes bag/task wealth THROUGH the warehouse, so a component the warehouse does not
  // already hold can never exceed the cap (audit: the old cap+buf rule let pay() under-collect —
  // resources were silently created). Directly-held stock is payable regardless.
  const need = (n: number, direct: number, h: number, r: number, cap: number): number =>
    direct >= n ? 0 : n > cap ? Infinity : h >= n ? 0 : r <= 0 ? Infinity : (n - h) / r;
  return Math.max(
    need(cost.wood, state.res.wood, have.wood, rate.wood, caps.warehouse),
    need(cost.clay, state.res.clay, have.clay, rate.clay, caps.warehouse),
    need(cost.iron, state.res.iron, have.iron, rate.iron, caps.warehouse),
    need(cost.crop, state.res.crop, have.crop, rate.crop, caps.granary),
  );
}

export function storageCaps(state: SimState): { warehouse: number; granary: number } {
  let wh = 0, gr = 0;
  for (const s of state.slots) {
    if (s.gid === GID.warehouse) wh += storageCapacity(s.gid, s.level);
    if (s.gid === GID.granary) gr += storageCapacity(s.gid, s.level);
  }
  return { warehouse: wh || BASE_STORAGE, granary: gr || BASE_STORAGE };
}

export function cpPerSecond(state: SimState): number {
  const daily = state.slots.reduce((a, s) => a + (s.level > 0 ? levelData(s.gid, s.level).culturePoints : 0), 0);
  return daily / 86400;
}

function worldView(state: SimState): TaskWorldView {
  // one O(slots) pass builds gid→level maps; the 202-task trigger scan then runs O(1) per task
  const maxL = new Map<number, number>();
  const minL = new Map<number, number>();
  for (const s of state.slots) {
    maxL.set(s.gid, Math.max(maxL.get(s.gid) ?? 0, s.level));
    minL.set(s.gid, Math.min(minL.get(s.gid) ?? Infinity, s.level));
  }
  let pop: number | null = null;
  let cpd: number | null = null;
  return {
    maxLevel: (gid) => maxL.get(gid) ?? 0,
    minLevel: (gid) => minL.get(gid) ?? Infinity,
    countAtLeast: (gid, level) => state.slots.filter((s) => s.gid === gid && s.level >= level).length,
    population: () => (pop ??= population(state)),
    cpPerDay: () => (cpd ??= cpPerSecond(state) * 86400),
    celebrationsHeld: () => state.celebrationsHeld,
  };
}

/** Scheduled event — PURE DATA (no closures) so Simulation states can be cloned for search. */
type PendingEvent =
  | { t: number; kind: 'build'; slot: number; target: number }
  | { t: number; kind: 'income'; perRes: number; xp: number; label: string }
  | { t: number; kind: 'settlers'; count: number }
  | { t: number; kind: 'raiders'; count: number }
  | { t: number; kind: 'cavalry'; count: number }
  | { t: number; kind: 'research' }
  | { t: number; kind: 'heroRaid' };

export class Simulation {
  state: SimState;
  events: SimEvent[] = [];
  private pending: PendingEvent[] = [];
  private pendingDirty = false;
  /** Bumped whenever any slot level changes — invalidates the cached production rate. */
  private levelsVersion = 0;
  private rateCache: { version: number; heroLvl: number; respec: boolean; cleared: number; value: Resources; breakdown: EconRates } | null = null;
  /** Sim time of the last paid Finish-Now click (orders at the same instant ride it for free). */
  private lastFinishAt = -1;
  /** Categories (isField) of the orders riding the current click — bounded by queue depth. */
  private clickBatch: boolean[] = [];
  /** Monotonic id of the current click — lets presentation group buildings per click. */
  private clickId = 0;
  /** Adventures/oasis clears that came due before a Rally Point existed (hero can't leave). */
  private heldIncome: Extract<PendingEvent, { kind: 'income' }>[] = [];
  /** Time windows when the hero walks adventures (one hero — raids must yield). Immutable. */
  private heroBusy: { a: number; b: number }[] = [];

  /** XP gain; a level-up fully heals the hero instantly (official). The real meta times task
   *  claims for this; our tasks grant XP at fire time, so heals are automatic approximations. */
  private addXp(xp: number): void {
    if (xp <= 0) return;
    const before = heroLevel(this.state.xp);
    this.state.xp += xp;
    if (heroLevel(this.state.xp) > before) { this.state.heroHP = 100; this.rateCache = null; }
  }

  /** One hero raid cycle (derived combat). Retries next cadence when blocked (no RP / too hurt /
   *  too weak) — the hero waits for task-XP level-ups. Stops for good when every pack is empty. */
  private heroRaidStep(t: number): void {
    if (!this.ctx.oasisRaids) return; // pure accrual-boundary tick (e.g. respecAtH)
    const o = this.ctx.oasisRaids;
    // one hero: if an adventure is in flight at this moment, resume raiding when it returns
    const busy = this.heroBusy.find((w) => t >= w.a && t < w.b);
    if (busy) { this.pendingDirty = true; this.pending.push({ t: busy.b, kind: 'heroRaid' }); return; }
    const packs = this.state.oasisPacks;
    // passive healing: NONE during a settle chase (Nitai: the auction market is still locked in
    // BP — no ointments; level-up full heals are the only way to keep going). Knob kept for
    // other scenarios.
    const heal = this.ctx.hero.healPerHour ?? 0;
    this.state.heroHP = Math.min(100, this.state.heroHP + (heal * (t - this.state.heroHealT)) / 3600);
    this.state.heroHealT = t;
    if (this.state.heroRetired || !packs.some((v) => v > 0) || t > 21 * 86400) {
      // clears finished: claim any remaining saved XP (levels boost the respec production points)
      if (this.state.xpBank > 0) { this.addXp(this.state.xpBank); this.state.xpBank = 0; }
      if (!this.state.heroRetired && !this.ctx.hero.enabled && packs.length > 0 && !packs.some((v) => v > 0)) {
        this.state.heroRetired = true; // marks the respec as announced; production was already on via clearsDone
        this.rateCache = null;
        this.evt({ time: t, type: 'oasis', label: 'Book of Wisdom: respec to production (all oases cleared)' });
      }
      return;
    }
    // blocked retries are cheap (the hero is home) — poll every 10 min for heals/level-ups
    const retry = () => { this.pendingDirty = true; this.pending.push({ t: t + 600, kind: 'heroRaid' }); };
    if (levelOf(this.state, GID.rallyPoint) < 1) { retry(); return; } // hero can't leave the village
    // record meta (Nitai): claim banked task XP for level-ups PROACTIVELY — right after a risky
    // hit (HP low → level-up = instant full heal) and before the first slams (never raid at L0-1)
    for (let guard = 0; guard < 30; guard++) {
      const lvl = heroLevel(this.state.xp);
      if (!(this.state.heroHP < 50 || lvl < 2)) break;
      const needXp = 25 * (lvl + 1) * (lvl + 2) - this.state.xp;
      if (needXp > 0 && this.state.xpBank >= needXp) { this.state.xpBank -= needXp; this.addXp(needXp); }
      else break;
    }
    const dps = o.defPerSupply ?? DEF_PER_SUPPLY_TYPICAL;
    const pick = (): { i: number; hit: { killed: number; hpLoss: number } } | null => {
      const fstr = heroFightingStrength(heroLevel(this.state.xp), this.ctx.tribe, this.ctx.hero.enabled);
      // packs are indexed nearest-first: prefer the NEAREST affordable target (shortest round trip,
      // least contested); among equal distances the bigger kill wins
      let bi = -1; let bh: { killed: number; hpLoss: number } | null = null;
      for (let i = 0; i < packs.length; i++) {
        if (packs[i] <= 0) continue;
        const h = raidHit(fstr, packs[i], dps);
        if (h.killed < 1 || this.state.heroHP - h.hpLoss < 10) continue;
        bi = i; bh = h; break; // first hit-able = nearest remaining
      }
      return bi === -1 || bh === null ? null : { i: bi, hit: bh };
    };
    let sel = pick();
    // nothing affordable? spend SAVED task XP on level-ups — each is an instant full heal (the
    // real meta), and a stronger hero kills more / loses less
    while (!sel) {
      const lvl = heroLevel(this.state.xp);
      const need = 25 * (lvl + 1) * (lvl + 2) - this.state.xp;
      if (need > 0 && this.state.xpBank >= need) {
        this.state.xpBank -= need;
        this.addXp(need); // level-up → HP 100
        sel = pick();
      } else break;
    }
    if (!sel) { retry(); return; } // heal up passively first
    const best = sel.i; const hit = sel.hit;
    const cad = Math.max(60, raidRoundTripH(this.ctx.tribe, oasisDistance(best, packs.length, o.distance), this.ctx.config.speed) * 3600);
    // Book-of-Wisdom cutoff (Saesenthessi): if this raid's bounty rate is below what the hero's
    // points would produce as resources, retire — respec to production and abandon the far tail
    if (!this.ctx.hero.enabled) {
      // marginal value of this raid = bounty + the trickle share this clear UNLOCKS for the rest of
      // the race (an uncleared oasis produces nothing) — vs the production the points would yield.
      // DELIBERATELY permissive (face-value unlock): this cutoff is only the "obviously done" late
      // fallback. Quitting EARLIER is a searched beam action ('book'), not a formula — the honest
      // carry-charged cutoff was tried (Nitai's count sweep) and fixed monotonicity but regressed
      // both calibration benchmarks (hun-x3 35:41→36:58, gaul-real 28:01→29:33): when-to-book is a
      // global planning decision, so the search owns it.
      // payback window for unlocked trickle = time until the projected settle (endogenous — the
      // audit measured ±10h swing from the old hardwired 36h/speed constant)
      const proj = this.projectSettle(settleGoalOf(this.ctx).threshold);
      const horizonH = Math.max(2 / this.ctx.config.speed, ((proj ?? t + (36 / this.ctx.config.speed) * 3600) - t) / 3600);
      const unlockValue = (o.tricklePerHour / Math.max(1, o.count)) * horizonH * (hit.killed / packs[best]);
      const bountyPerH = (hit.killed * 160 + unlockValue) / (cad / 3600);
      const pv = heroProductionVector(this.state.xp, { ...this.ctx.hero, enabled: true }, this.ctx.tribe, this.ctx.config, this.ctx.mods.goldProductionBonus);
      const prodAltPerH = pv.wood + pv.clay + pv.iron + pv.crop;
      if (bountyPerH < prodAltPerH) {
        this.state.heroRetired = true;
        this.rateCache = null; // production switches on
        if (this.state.xpBank > 0) { this.addXp(this.state.xpBank); this.state.xpBank = 0; }
        this.evt({ time: t, type: 'oasis', label: `Book of Wisdom: respec to production (next raid ${Math.round(bountyPerH)}/h < hero production ${Math.round(prodAltPerH)}/h)` });
        return;
      }
    }
    packs[best] -= hit.killed;
    this.state.heroHP -= hit.hpLoss;
    if (packs[best] <= 0) this.rateCache = null; // one more oasis now produces (trickle share)
    const perRes = hit.killed * 40; // official: 40 of EACH resource per supply, instant at the hit
    if (!this.light) this.econCum.oasis += perRes * 4;
    const b = this.state.heroBag;
    b.wood += perRes; b.clay += perRes; b.iron += perRes; b.crop += perRes;
    this.addXp(hit.killed); // 1 XP per supply — may level up and heal
    this.evt({
      time: t, type: 'oasis',
      label: `oasis raid: ${hit.killed} supply (+${perRes * 4} res, hero ${Math.max(0, Math.round(this.state.heroHP))}%)`,
      gain: { wood: perRes, clay: perRes, iron: perRes, crop: perRes },
    });
    this.dailyQuest('oasis');
    this.pendingDirty = true; this.pending.push({ t: t + cad, kind: 'heroRaid' }); // next hit after the round trip
  }

  private applyIncome(c: Extract<PendingEvent, { kind: 'income' }>): void {
    // hero-bag loot (oasis kills, adventures) lands in the UNCAPPED hero inventory, not the warehouse
    if (c.perRes > 0) {
      const b = this.state.heroBag;
      b.wood += c.perRes; b.clay += c.perRes; b.iron += c.perRes; b.crop += c.perRes;
      if (!this.light) {
        if (c.label.startsWith('adventure')) this.econCum.adventures += c.perRes * 4;
        else this.econCum.oasis += c.perRes * 4;
      }
    }
    this.addXp(c.xp); // XP/resources trigger no tasks — skip the task scan entirely
    this.evt({
      time: this.state.time, type: c.label.startsWith('adventure') ? 'adventure' : 'oasis', label: c.label,
      gain: c.perRes > 0 ? { wood: c.perRes, clay: c.perRes, iron: c.perRes, crop: c.perRes } : undefined,
    });
    if (c.label.startsWith('adventure')) this.dailyQuest('adventure');
  }

  /** Rally Point just completed: the hero can finally leave — release the backlog (as one burst;
   *  the real hero would chain them, but the backlog is small and the cadence already priced). */
  private releaseHeldIncome(): void {
    if (!this.heldIncome.length) return;
    const held = this.heldIncome;
    this.heldIncome = [];
    for (const c of held) this.applyIncome(c);
    this.rateCache = null; // hero level may have jumped
  }

  /** Can one more order of this category join the current Finish-Now click? Lane model (Nitai):
   *  Plus gives ONE waiting slot per account (not per lane), placed behind a running order.
   *  Non-Romans: one lane ⇒ running + waiting = 2 orders max.
   *  Romans: a field lane and a building lane run in parallel (two heads), and the single waiting
   *  slot can sit behind either — so max 3 (F+F+B, B+B+F …), never F+F+F / B+B+B (two waiting)
   *  and never 4 (would need a waiting slot on both lanes). */
  private clickFits(isField: boolean): boolean {
    const b = this.clickBatch;
    if (!this.ctx.mods.plus) {
      // no Plus = no waiting slot: one order per lane. Romans can pair one field + one building.
      if (!tribes[this.ctx.tribe].dualQueue) return b.length < 1;
      return b.length < 2 && !b.some((f) => f === isField);
    }
    if (!tribes[this.ctx.tribe].dualQueue) return b.length < 2;
    if (b.length >= 3) return false;
    const sameLane = b.filter((f) => f === isField).length;
    const waitingUsed = b.length === 2 && b[0] === b[1]; // two of one category ⇒ waiting slot taken
    if (sameLane >= 2) return false;               // this lane already has head + waiting
    if (sameLane === 1 && waitingUsed) return false; // waiting slot is on the other lane
    return true;
  }
  private laneFreeAt = { field: 0, building: 0, training: 0, barracks: 0, stable: 0, academy: 0 };
  private cpLog: { t: number; cp: number; settlers: number; econ?: { rates: EconRates; cum: EconCum } }[] = [];
  /** Cumulative economy by source (full sims only — light clones skip). */
  private econCum: EconCum = { fields: 0, hero: 0, trickle: 0, tasks: 0, oasis: 0, adventures: 0, spend: 0 };
  /** Search-clone mode: skip event history & CP-log growth (score on state; replay for output). */
  private light = false;

  ctx: SimContext;

  constructor(ctx: SimContext, initial?: SimState) {
    this.ctx = ctx;
    this.state = initial ?? createInitialState(ctx.config);
    // BP oasis raiding: hero-raid cycles DERIVED from combat (oasisCombat.ts). Each cycle the hero
    // hits the NEAREST pack its HP affords; bounty (40/res per supply killed) lands instantly; the
    // next raid leaves after the round trip home. No respawn during BP — packs only shrink.
    const raids = ctx.oasisRaids;
    if (raids && raids.count > 0) {
      if (this.state.oasisPacks.length === 0) {
        this.state.oasisPacks = defaultPacks(raids.count, raids.packSupply ?? DEFAULT_PACK_SUPPLY);
      }
      this.pendingDirty = true; this.pending.push({ t: raids.firstAtH * 3600, kind: 'heroRaid' });
    }
    // a manual respec hour must break the accrual segment or the whole interval uses the old rate
    if (ctx.hero.respecAtH !== undefined) {
      this.pendingDirty = true; this.pending.push({ t: ctx.hero.respecAtH * 3600, kind: 'heroRaid' });
    }
    // adventures (official art. 46 + Nitai): the first 3 SPAWN at t=0 (available immediately);
    // then 3/day on days 0–2 and 2/day on days 3–16 (at 1x), ×speed. First 10 predetermined:
    // only #2 and #7 pay resources (~2300 total, FLAT — amounts do NOT scale with speed);
    // post-#10 mostly items/silver — small flat EV. Each adventure = walk there & back, so the
    // hero's real cadence bounds how fast the backlog clears; we assume ~1h round-trip at 1x.
    // NOTE: the events below are AVAILABILITY times; the hero cannot leave without a Rally
    // Point (Nitai) — see holdUntilRallyPoint in applyDue.
    if (ctx.adventures) {
      const speed = ctx.config.speed;
      const FIXED_RES = 2300;
      const POST10_EV = 550;
      // ~1h round trip at 1x; movement scales by the TROOP-SPEED factor (×2 x2-x5, ×4 x10),
      // NOT linearly with server speed (audit: 1/speed overstated early adventure tempo)
      const tripH = 1 / troopSpeedFactor(speed);
      let spawnT = 0;
      let heroFreeT = 0;
      this.heroBusy = [];
      for (let i = 0; i < 50 && spawnT * speed < 16 * 86400; i++) {
        const res = i < 10 ? (i === 1 || i === 6 ? FIXED_RES : 0) : POST10_EV;
        const start = Math.max(spawnT, heroFreeT);
        const done = start + tripH * 3600;
        heroFreeT = done;
        this.heroBusy.push({ a: start, b: done }); // hero is away — no oasis raids in this window
        this.pendingDirty = true; this.pending.push({
          t: done, kind: 'income', perRes: res / 4, xp: 8 + 1.5 * i,
          label: `adventure #${i + 1}${res ? ` (+${Math.round(res)} res)` : ''}`,
        });
        // adventure #3 reward: 3 of the tribe's basic troops (official) — they carry trickle too
        if (i === 2) { this.pending.push({ t: done, kind: 'raiders', count: 3 }); }
        if (i >= 2) { // the 3 starting adventures already exist at t=0; later ones spawn on the curve
          // official: frequency ×speed AND phase boundaries ÷speed (audit) — think in SERVER days
          const serverDay = (spawnT / 86400) * speed;
          const perDay = (serverDay < 3 ? 3 : 2) * speed;
          spawnT += 86400 / perDay;
        }
      }
    }
    this.lastLoggedRate = cpPerSecond(this.state) * 86400; // spawn state's rate (MB1 = 2/day)
    this.collectTasks();
    this.snapshot();
  }

  /** Cheap state branch for search. The clone shares ctx, drops event history & CP log
   *  (search nodes score on state; replay the winning action sequence for full output). */
  clone(): Simulation {
    const c = Object.create(Simulation.prototype) as Simulation;
    c.ctx = this.ctx;
    c.state = {
      ...this.state,
      res: { ...this.state.res },
      slots: this.state.slots.map((s) => ({ ...s })),
      firedTasks: new Set(this.state.firedTasks),
      unclaimed: this.state.unclaimed.slice(),
      heroBag: { ...this.state.heroBag },
      oasisPacks: this.state.oasisPacks.slice(),
      daily: this.state.daily ? { ...this.state.daily, cnt: { ...this.state.daily.cnt } } : undefined,
      // raiders is a number: copied by the spread
    };
    c.events = [];
    c.pending = this.pending.slice(); // events are immutable data — shallow copy suffices
    c.pendingDirty = this.pendingDirty;
    c.laneFreeAt = { ...this.laneFreeAt };
    c.cpLog = [{ t: this.state.time, cp: this.state.cp, settlers: this.state.settlers }];
    c.light = true;
    c.levelsVersion = 0;
    c.rateCache = null;
    c.settledAt = this.settledAt;
    c.heldIncome = this.heldIncome.slice();
    c.heroBusy = this.heroBusy; // immutable after construction — safe to share
    c.lastFinishAt = this.lastFinishAt;
    c.clickBatch = this.clickBatch.slice();
    c.clickId = this.clickId;
    return c;
  }

  /** Cached production rate — recomputed only when slot levels or the hero level change. */
  cachedRate(): Resources {
    const heroLvl = heroLevel(this.state.xp);
    const respec = this.state.heroRetired || (this.ctx.hero.respecAtH !== undefined && this.state.time >= this.ctx.hero.respecAtH * 3600);
    // trickle also depends on how many oases are cleared so far (time-based) — part of the key
    const cleared = this.state.oasisPacks.length > 0 ? this.state.oasisPacks.filter((v) => v <= 0).length : 0;
    const c = this.rateCache;
    if (!c || c.version !== this.levelsVersion || c.heroLvl !== heroLvl || c.respec !== respec || c.cleared !== cleared) {
      this.rateCache = {
        version: this.levelsVersion, heroLvl, respec, cleared,
        value: productionPerSecond(this.state, this.ctx),
        breakdown: this.light ? { fields: 0, hero: 0, trickle: 0, upkeep: 0 } : productionBreakdown(this.state, this.ctx),
      };
    }
    return this.rateCache!.value;
  }

  laneFreeTime(lane: 'field' | 'building' | 'training' | 'barracks' | 'stable' | 'academy'): number {
    return this.laneFreeAt[lane];
  }

  /** EXACT settle projection without mutating: walks pending events analytically. Valid because
   *  the CP rate changes ONLY at build completions (tasks/income affect resources, never CP). */
  projectSettle(thr: number): number | null {
    if (this.settledAt !== null) return this.settledAt;
    const s = this.state;
    const evs = [...this.pending].sort((a, b) => a.t - b.t);
    const levelNow = new Map<number, number>();
    let cp = s.cp, t = s.time, rate = cpPerSecond(s);
    const goalSettlers = settleGoalOf(this.ctx).settlers;
    let settlers = s.settlers;
    let settlersAt = settlers >= goalSettlers ? t : Infinity;
    let crossing = cp >= thr ? t : Infinity;
    for (const e of evs) {
      if (crossing === Infinity && rate > 0 && cp + rate * (e.t - t) >= thr) crossing = t + (thr - cp) / rate;
      cp += rate * (e.t - t);
      t = e.t;
      if (e.kind === 'build') {
        const slot = s.slots[e.slot];
        const prevLvl = levelNow.get(e.slot) ?? slot.level;
        const prevCp = prevLvl > 0 ? levelData(slot.gid, prevLvl).culturePoints : 0;
        rate += (levelData(slot.gid, e.target).culturePoints - prevCp) / 86400;
        levelNow.set(e.slot, e.target);
      } else if (e.kind === 'settlers') {
        settlers += e.count;
        if (settlers >= goalSettlers && settlersAt === Infinity) settlersAt = e.t;
      }
    }
    if (crossing === Infinity) {
      if (rate <= 0) return null;
      crossing = t + (thr - cp) / rate;
    }
    if (settlersAt === Infinity) return null;
    return Math.max(crossing, settlersAt);
  }

  /** Current level plus queued (not yet completed) build orders on a slot. */
  orderedLevel(slotIdx: number): number {
    return this.state.slots[slotIdx].level +
      this.pending.filter((p) => p.kind === 'build' && p.slot === slotIdx).length;
  }

  /** Extra CP/day that in-flight builds will add once complete (for optimistic search bounds). */
  pendingCpPerDay(): number {
    // chain-aware: multiple queued levels on one slot must chain prev→target, not each re-base
    // on the COMPLETED level (audit: inflated CP rate for up+N macro nodes)
    let extra = 0;
    const baseLvl = new Map<number, number>();
    const byT = [...this.pending].filter((p) => p.kind === 'build').sort((a, b) => a.t - b.t) as Extract<PendingEvent, { kind: 'build' }>[];
    for (const p of byT) {
      const cur = this.state.slots[p.slot];
      const from = baseLvl.get(p.slot) ?? cur.level;
      const prev = from > 0 ? levelData(cur.gid, from).culturePoints : 0;
      extra += Math.max(0, levelData(cur.gid, p.target).culturePoints - prev);
      baseLvl.set(p.slot, Math.max(from, p.target));
    }
    return extra;
  }

  /** Event-history push, skipped in light (search-clone) mode. Attaches a resource snapshot. */
  private evt(e: SimEvent): void {
    if (this.light) return;
    const s = this.state;
    const cpPerDay = cpPerSecond(s) * 86400;
    e.snap = {
      store: { ...s.res }, bag: { ...s.heroBag }, unclaimed: bankValue(s), caps: storageCaps(s),
      cp: s.cp, cpPerDay,
      // rate change caused by THIS event (vs the previous logged event) — computed at the source
      // so presentation reordering can never distort it
      cpRateDelta: cpPerDay - this.lastLoggedRate,
    };
    this.lastLoggedRate = cpPerDay;
    this.events.push(e);
  }
  private lastLoggedRate = 0;

  private sortPending(): void {
    if (this.pendingDirty) {
      this.pending.sort((a, b) => a.t - b.t);
      this.pendingDirty = false;
    }
  }

  /** Earliest moment settle conditions were met, recorded as it happens (so light clones — which
   *  keep no CP log — can still report a settle that lies in their past). */
  private settledAt: number | null = null;

  private snapshot(): void {
    const s = this.state;
    const goal = settleGoalOf(this.ctx);
    if (this.settledAt === null && s.settlers >= goal.settlers) {
      const thr = goal.threshold;
      if (s.cp >= thr) {
        // interpolate back to the exact crossing within the last accrual segment
        const prev = this.cpLog[this.cpLog.length - 1];
        this.settledAt = prev && prev.settlers >= goal.settlers && prev.cp < thr && s.time > prev.t
          ? prev.t + ((thr - prev.cp) / (s.cp - prev.cp)) * (s.time - prev.t)
          : s.time;
      }
    }
    if (this.light) {
      this.cpLog[0] = { t: s.time, cp: s.cp, settlers: s.settlers };
      return;
    }
    this.cachedRate(); // refresh the cache key first — a build completion may have bumped levels
    this.cpLog.push({
      t: s.time, cp: s.cp, settlers: s.settlers,
      econ: { rates: this.rateCache!.breakdown, cum: { ...this.econCum } },
    });
  }

  private accrue(dt: number): void {
    if (dt <= 0) return;
    const s = this.state;
    const rate = this.cachedRate();
    const caps = storageCaps(s);
    s.res.wood = Math.min(caps.warehouse, s.res.wood + rate.wood * dt);
    s.res.clay = Math.min(caps.warehouse, s.res.clay + rate.clay * dt);
    s.res.iron = Math.min(caps.warehouse, s.res.iron + rate.iron * dt);
    s.res.crop = Math.max(0, Math.min(caps.granary, s.res.crop + rate.crop * dt));
    if (!this.light) {
      const b = this.rateCache!.breakdown;
      const h = dt / 3600;
      this.econCum.fields += b.fields * h;
      this.econCum.hero += b.hero * h;
      this.econCum.trickle += b.trickle * h;
    }
    s.cp += cpPerSecond(s) * dt;
    s.time += dt;
    this.snapshot();
  }

  private collectTasks(subset?: TaskDef[]): void {
    if (this.ctx.tasks === false) return;
    // single pass: rewards are BANKED (resources/XP), which cannot trigger further tasks
    const fired: FiredTask[] = collectTriggered(this.state.firedTasks, worldView(this.state), () => heroLevel(this.state.xp), subset);
    if (!fired.length) return;
    const speedScale = this.ctx.config.taskRewardSpeedScaling ? this.ctx.config.speed : 1;
    for (const f of fired) {
      this.state.taskBank += f.resBase * speedScale; // legacy aggregate (kept for tests/metrics)
      this.state.unclaimed.push(f.resBase * speedScale); // claimable whole, at the then-current hero level
      // XP is SAVED for heal-timing only while a STRENGTH hero still has oases to clear (record
      // meta); otherwise claim instantly (levels feed production points and task bonuses)
      if (!this.ctx.hero.enabled && this.ctx.oasisRaids && this.state.oasisPacks.some((v) => v > 0)) this.state.xpBank += f.xp;
      else this.addXp(f.xp);
      const v = f.resBase * speedScale;
      this.evt({ time: this.state.time, type: 'task', label: f.name, gain: { wood: v, clay: v, iron: v, crop: v } });
    }
  }

  /** Daily quests (screenshot-verified, Nitai 2026-08-21): actions earn points, capped per category
   *  per REAL 24h day (daily windows do NOT scale with server speed). Modeled point sources:
   *  building upgrade 4×3, field upgrade 5×3, oasis raid 3×3, gain/spend gold 2×3, adventure 5×1,
   *  celebration 5×3, 20+ infantry/cavalry in one order 3×3. Unmodeled sources (videos, alliance
   *  contribution, Natars, auctions) only make thresholds EASIER — the model is conservative.
   *  Chests worth modeling in a settle race:
   *    day 1 @25 pts → 50 hero XP (banked like task XP for heal-timing on a strength hero);
   *    day 2 @25 pts → +50 CP (claimable only after the 24h reset, from day-2 points).
   *  Day-1 50/75/100-pt chests are junk for us (temp wood bonus / tablets / unreachable 20k).
   *  [ASSUMPTION: the day-2 CP chest sits at the 25-pt tier — pending Nitai's confirmation.] */
  private dailyQuest(cat: 'building' | 'field' | 'oasis' | 'gold' | 'adventure' | 'party' | 'inf20' | 'cav20'): void {
    if (this.ctx.tasks === false) return; // same master switch as the task/quest system
    const RULES = { building: [4, 3], field: [5, 3], oasis: [3, 3], gold: [2, 3], adventure: [5, 1], party: [5, 3], inf20: [3, 3], cav20: [3, 3] } as const;
    const d = (this.state.daily ??= { day: 0, pts: 0, cnt: {}, xpChest: false, cpChest: false });
    const day = Math.floor(this.state.time / 86400);
    if (day !== d.day) { d.day = day; d.pts = 0; d.cnt = {}; } // daily reset — points do NOT carry over
    const [per, max] = RULES[cat];
    if ((d.cnt[cat] ?? 0) >= max) return;
    d.cnt[cat] = (d.cnt[cat] ?? 0) + 1;
    d.pts += per;
    if (day === 0 && !d.xpChest && d.pts >= 25) {
      d.xpChest = true;
      if (!this.ctx.hero.enabled && this.ctx.oasisRaids && this.state.oasisPacks.some((v) => v > 0)) this.state.xpBank += 50;
      else this.addXp(50);
      this.evt({ time: this.state.time, type: 'task', label: 'daily quests: 25-point chest (+50 hero XP)' });
    }
    if (day === 1 && !d.cpChest && d.pts >= 25) {
      d.cpChest = true;
      this.state.cp += 50;
      this.evt({ time: this.state.time, type: 'task', label: 'daily quests: day-2 chest (+50 CP)', cp: 50 });
    }
  }

  /** If `gid` is ordered but not yet at `level`, advance time until it completes (the player would
   *  simply wait for the building). Throws only if it is not even ordered. */
  private awaitBuilding(gid: number, level: number, what: string): void {
    for (let guard = 0; guard < 200 && levelOf(this.state, gid) < level; guard++) {
      const idx = this.state.slots.findIndex((sl) => sl.gid === gid);
      if (idx === -1 || this.orderedLevel(idx) < level) throw new Error(`${what} requires ${buildingLabel(gid)} level ${level}`);
      const next = this.pending.filter((p) => p.kind === "build" && p.slot === idx).sort((a, b) => a.t - b.t)[0];
      if (!next) throw new Error(`${what} requires ${buildingLabel(gid)} level ${level}`);
      this.applyDue(next.t);
    }
  }

  private applyDue(until: number): void {
    this.sortPending();
    while (this.pending.length && (this.sortPending(), this.pending[0].t <= until)) {
      const c = this.pending.shift()!;
      this.accrue(c.t - this.state.time);
      if (c.kind === 'build') {
        this.state.slots[c.slot].level = c.target;
        this.levelsVersion++;
        this.evt({ time: c.t, type: 'complete', label: `L${c.target}`, slot: c.slot, gid: this.state.slots[c.slot].gid, level: c.target });
        // only building completions can trigger tasks (levels / pop / CP-rate all derive from them)
        this.collectTasks([...(taskIndex.byGid.get(this.state.slots[c.slot].gid) ?? []), ...taskIndex.meta]);
        this.dailyQuest(this.state.slots[c.slot].gid <= 4 ? 'field' : 'building');
        if (this.state.slots[c.slot].gid === GID.rallyPoint) this.releaseHeldIncome();
      } else if (c.kind === 'income') {
        // The hero cannot leave the village without a Rally Point (Nitai): adventures and oasis
        // raids that come due before RP L1 exists are HELD and released the moment it completes.
        if (levelOf(this.state, GID.rallyPoint) < 1) { this.heldIncome.push(c); continue; }
        this.applyIncome(c);
      } else if (c.kind === 'heroRaid') {
        this.heroRaidStep(c.t);
      } else if (c.kind === 'research') {
        this.state.cavalryResearched = true;
        this.evt({ time: c.t, type: 'raiders', label: `${cavalryRaiders[this.ctx.tribe]?.name ?? 'cavalry'} researched` });
      } else if (c.kind === 'cavalry') {
        this.state.cavalry += c.count;
        this.rateCache = null;
        this.evt({ time: c.t, type: 'raiders', label: `${c.count} ${cavalryRaiders[this.ctx.tribe]?.name} ready (${this.state.cavalry} total)` });
      } else if (c.kind === 'raiders') {
        this.state.raiders += c.count;
        this.rateCache = null; // trickle throughput & upkeep changed
        this.evt({ time: c.t, type: 'raiders', label: `${c.count} ${raiders[this.ctx.tribe].name} ready (${this.state.raiders} total)` });
      } else {
        this.state.settlers += c.count;
        this.evt({ time: c.t, type: 'settlers', label: `${c.count} settlers ready` });
      }
      this.snapshot();
    }
  }

  /** Book of Wisdom NOW (a SEARCHED beam action): retire the strength hero to full-resource
   *  production, abandoning the remaining uncleared oases. The in-sim cutoff only handles the
   *  "obviously done" case — quitting earlier is the search's call (Nitai's real team booked at 7h
   *  with 15/33 cleared; no local formula got that right on every map). */
  bookRespec(): void {
    if (this.state.heroRetired || this.ctx.hero.enabled) return;
    this.state.heroRetired = true;
    this.rateCache = null; // production switches on
    if (this.state.xpBank > 0) { this.addXp(this.state.xpBank); this.state.xpBank = 0; }
    this.evt({ time: this.state.time, type: 'oasis', label: 'Book of Wisdom: respec to production (searched: stop clearing now)' });
    this.snapshot();
  }

  /** Research the tribe's cavalry raider: Academy 5 + Stable at the unit's stableLevel (3 or 5). */
  researchCavalry(): void {
    const cav = cavalryRaiders[this.ctx.tribe];
    if (!cav) throw new Error('no cavalry raider for this tribe');
    if (this.state.cavalryResearched) return;
    this.awaitBuilding(GID.academy, 5, 'researchCavalry');
    this.awaitBuilding(GID.stable, cav.stableLevel, 'researchCavalry');
    this.waitFor(cav.research, this.laneFreeAt.academy);
    this.pay(cav.research);
    const duration = Math.round(cav.researchTime / this.ctx.config.speed);
    this.evt({ time: this.state.time, type: 'start', label: `research ${cav.name}`, cost: cav.research, gold: 0 });
    // Academy research is Finish-Now-able (Nitai): one 2-gold click completes the research AND any
    // queued non-admin buildings. Research holds no build-queue slot, so it rides a same-instant
    // click for free, or opens a fresh click that queued builds then join.
    const g = this.ctx.gold;
    const sameInstant = this.lastFinishAt === this.state.time;
    if (g && duration >= g.instantFinishMin * 60 && (sameInstant || goldLeft(this.state, this.ctx) >= 2)) {
      this.state.cavalryResearched = true;
      if (!sameInstant) {
        this.state.goldSpent += 2;
        this.state.instantFinishes += 1;
        this.lastFinishAt = this.state.time;
        this.clickBatch = []; // fresh click — queued builds placed this instant may join it
        this.clickId += 1;
        this.dailyQuest('gold');
      }
      this.evt({ time: this.state.time, type: 'finish', label: sameInstant ? `Finish Now (same click): ${cav.name} research` : `Finish Now: ${cav.name} research`, gold: sameInstant ? 0 : 2, click: this.clickId });
      return;
    }
    const done = this.state.time + duration;
    this.pendingDirty = true; this.pending.push({ t: done, kind: 'research' });
    this.laneFreeAt.academy = done;
  }

  /** Train `count` cavalry raiders in the Stable (sequential; Stable level speeds ×0.9/level). */
  trainCavalry(count = 1): void {
    const cav = cavalryRaiders[this.ctx.tribe];
    if (!cav) throw new Error('no cavalry raider for this tribe');
    this.awaitBuilding(GID.rallyPoint, 1, 'trainCavalry');
    this.awaitBuilding(GID.stable, 1, 'trainCavalry');
    // research must be complete
    for (let g = 0; g < 200 && !this.state.cavalryResearched; g++) {
      const r = this.pending.find((p) => p.kind === 'research');
      if (!r) throw new Error('trainCavalry requires the cavalry unit to be researched');
      this.applyDue(r.t);
    }
    if (count >= 20) this.dailyQuest('cav20'); // "build 20 cavalry units of one type at once"
    const stLvl = Math.max(1, levelOf(this.state, GID.stable));
    const per = Math.round((cav.time * Math.pow(0.9, stLvl - 1)) / this.ctx.config.speed);
    for (let i = 0; i < count; i++) {
      this.waitFor(cav.cost, 0);
      this.pay(cav.cost);
      const start = Math.max(this.state.time, this.laneFreeAt.stable);
      const done = start + per;
      this.evt({ time: this.state.time, type: 'start', label: `train ${cav.name}`, cost: cav.cost, gold: 0 });
      this.pendingDirty = true; this.pending.push({ t: done, kind: 'cavalry', count: 1 });
      this.laneFreeAt.stable = done;
    }
  }

  /** Train `count` basic raiders in the Barracks (needs Rally Point L1 + Barracks L1). Each is a
   *  separate order paid when affordable; training is sequential in the Barracks (÷speed). */
  trainRaiders(count = 1): void {
    this.awaitBuilding(GID.rallyPoint, 1, 'trainRaiders');
    this.awaitBuilding(GID.barracks, 1, 'trainRaiders');
    if (count >= 20) this.dailyQuest('inf20'); // "build 20 infantry units of one type at once"
    const u = raiders[this.ctx.tribe];
    const brLvl = Math.max(1, levelOf(this.state, GID.barracks));
    const per = Math.round((u.time * Math.pow(0.9, brLvl - 1)) / this.ctx.config.speed); // official trainingTimeBarracks 0.9^(L-1)
    for (let i = 0; i < count; i++) {
      this.waitFor(u.cost, 0);
      this.pay(u.cost);
      const start = Math.max(this.state.time, this.laneFreeAt.barracks);
      const done = start + per;
      this.evt({ time: this.state.time, type: 'start', label: `train ${u.name}`, cost: u.cost, gold: 0 });
      this.pendingDirty = true; this.pending.push({ t: done, kind: 'raiders', count: 1 });
      this.laneFreeAt.barracks = done;
    }
  }

  private waitFor(cost: Resources, laneT: number): number {
    // returns absolute start time; processes due completions while waiting
    for (;;) {
      this.sortPending();
      const s = this.state;
      const wait = affordabilityWait(s, this.ctx, cost, this.cachedRate());
      if (wait === Infinity) {
        if (this.pending.length) { this.applyDue(this.pending[0].t); continue; }
        throw new Error(`Unaffordable: needs ${JSON.stringify(cost)}, caps ${JSON.stringify(storageCaps(s))}`);
      }
      const startT = Math.max(s.time + wait, laneT);
      // apply completions due AT OR BEFORE the start, so tasks/levels land before the next order
      if (this.pending.length && this.pending[0].t <= startT) { this.applyDue(this.pending[0].t); continue; }
      this.accrue(startT - s.time);
      return startT;
    }
  }

  /** Move resources from the hero bag into the warehouse (any amount, capped by storage). */
  private bagToWarehouse(want: Resources): void {
    const s = this.state;
    const caps = storageCaps(s);
    const moved: Resources = { wood: 0, clay: 0, iron: 0, crop: 0 };
    for (const k of ['wood', 'clay', 'iron', 'crop'] as const) {
      const cap = k === 'crop' ? caps.granary : caps.warehouse;
      const take = Math.max(0, Math.min(want[k], s.heroBag[k], cap - s.res[k]));
      if (take > 0) { s.heroBag[k] -= take; s.res[k] += take; moved[k] = take; }
    }
    if (moved.wood + moved.clay + moved.iron + moved.crop > 0) {
      this.evt({ time: s.time, type: 'collect', label: 'move from hero inventory', gain: moved });
    }
  }

  /** Claim whole task rewards — SMALLEST first (Nitai) — into the hero bag until it holds ≥ needPerRes.
   *  Small ones cover small gaps; big ones stay unclaimed and keep growing with hero level. */
  private claimTasksInto(needPerRes: number): void {
    const s = this.state;
    const bonus = 1 + 0.02 * Math.max(0, heroLevel(s.xp) - 1);
    let claimed = 0;
    s.unclaimed.sort((a, b) => a - b);
    while (s.unclaimed.length && Math.min(s.heroBag.wood, s.heroBag.clay, s.heroBag.iron, s.heroBag.crop) < needPerRes) {
      const v = Math.floor(s.unclaimed.shift()! * bonus);
      s.heroBag.wood += v; s.heroBag.clay += v; s.heroBag.iron += v; s.heroBag.crop += v;
      claimed += v;
    }
    if (claimed > 0) {
      if (!this.light) this.econCum.tasks += claimed * 4;
      this.evt({ time: s.time, type: 'task', label: 'claim task rewards → hero inventory', gain: { wood: claimed, clay: claimed, iron: claimed, crop: claimed } });
    }
  }

  private pay(cost: Resources): void {
    const s = this.state;
    if (!this.light) this.econCum.spend += cost.wood + cost.clay + cost.iron + cost.crop;
    // Two-stage buffer (Nitai): unclaimed tasks → (claim whole task) → hero bag → (any amount) →
    // warehouse. Cover the shortfall from the bag; claim whole tasks first if the bag is short.
    const shortOf = (k: keyof Resources) => Math.max(0, cost[k] - s.res[k]);
    const npc = npcActive(s, this.ctx);
    const totalShort = npc
      ? Math.max(0, cost.wood + cost.clay + cost.iron + cost.crop - (s.res.wood + s.res.clay + s.res.iron + s.res.crop))
      : 0;
    const needPerRes = npc ? Math.ceil(totalShort / 4) : Math.max(shortOf('wood'), shortOf('clay'), shortOf('iron'), shortOf('crop'));
    if (needPerRes > 0) {
      this.claimTasksInto(needPerRes);
      this.bagToWarehouse(npc
        ? { wood: needPerRes, clay: needPerRes, iron: needPerRes, crop: needPerRes }
        : { wood: shortOf('wood'), clay: shortOf('clay'), iron: shortOf('iron'), crop: shortOf('crop') });
    }
    const short =
      s.res.wood < cost.wood || s.res.clay < cost.clay || s.res.iron < cost.iron || s.res.crop < cost.crop;
    if (short && npcActive(s, this.ctx)) {
      // NPC exchange (3 gold): pool everything IN THE WAREHOUSE, pay the total, split the remainder
      // evenly. The pooled total can be short when the bag couldn't move enough in (cap-limited) —
      // that shortfall must never become negative stock (audit: 199 negative-stock events, crop debt
      // then forgiven). Cover it by pulling more from the bag AFTER the exchange (bag is per-resource
      // and cap-free), which is what a player does: NPC, then top up from the inventory.
      const totalCost = cost.wood + cost.clay + cost.iron + cost.crop;
      const totalStock = s.res.wood + s.res.clay + s.res.iron + s.res.crop;
      const caps = storageCaps(s);
      s.goldSpent += 3;
      s.npcExchanges += 1;
      this.evt({ time: s.time, type: 'npc', label: 'NPC merchant exchange', gold: 3 });
      this.dailyQuest('gold');
      if (totalStock >= totalCost) {
        // the player CHOOSES the NPC distribution: split the remainder evenly, but reallocate any
        // share above a cap to resources with headroom (audit: plain clamping destroyed resources)
        let pool = totalStock - totalCost;
        const vals = { wood: 0, clay: 0, iron: 0, crop: 0 };
        const capOf = (k: keyof Resources) => (k === 'crop' ? caps.granary : caps.warehouse);
        for (let guard = 0; guard < 8 && pool > 0.5; guard++) {
          const open = (['wood', 'clay', 'iron', 'crop'] as const).filter((k) => vals[k] < capOf(k) - 0.5);
          if (!open.length) break; // every store full — genuinely unstorable
          const share = pool / open.length;
          for (const k of open) {
            const add = Math.min(share, capOf(k) - vals[k]);
            vals[k] += add; pool -= add;
          }
        }
        s.res.wood = vals.wood; s.res.clay = vals.clay; s.res.iron = vals.iron; s.res.crop = vals.crop;
        return;
      }
      // short even after pooling: spend the warehouse, then draw the remainder from the bag by
      // TOTAL (NPC pools anyway) — the per-resource draw under-paid when the bag was unbalanced
      let remaining = totalCost - totalStock;
      s.res.wood = 0; s.res.clay = 0; s.res.iron = 0; s.res.crop = 0;
      this.claimTasksInto(Math.ceil(remaining / 4));
      for (const k of ['wood', 'clay', 'iron', 'crop'] as const) {
        const take = Math.min(s.heroBag[k], remaining);
        s.heroBag[k] -= take; remaining -= take;
      }
      if (remaining > 1) throw new Error(`pay(): NPC underfunded by ${Math.round(remaining)} — affordability invariant broken`);
      return;
    }
    s.res.wood -= cost.wood; s.res.clay -= cost.clay; s.res.iron -= cost.iron; s.res.crop -= cost.crop;
    // invariant: waitFor + the cap-aware affordability rule guarantee full funding — a deficit
    // here means resources would be silently created (the audit's 17k/event bug); fail loudly
    const deficit = -Math.min(0, s.res.wood, s.res.clay, s.res.iron, s.res.crop);
    if (deficit > 1) throw new Error(`pay(): underfunded by ${Math.round(deficit)} — caps/wait invariant broken`);
    s.res.wood = Math.max(0, s.res.wood); s.res.clay = Math.max(0, s.res.clay);
    s.res.iron = Math.max(0, s.res.iron); s.res.crop = Math.max(0, s.res.crop);
  }

  build(slotIdx: number): void {
    const slot = this.state.slots[slotIdx];
    if (!slot) throw new Error(`Missing slot ${slotIdx}`);
    const dual = tribes[this.ctx.tribe].dualQueue;
    const lane: 'field' | 'building' = dual && FIELD_GIDS.includes(slot.gid) ? 'field' : 'building';
    const target = slot.level + 1 + this.pending.filter((p) => p.kind === 'build' && p.slot === slotIdx).length;
    const ld = levelData(slot.gid, target);
    const cost: Resources = { wood: ld.resourceCost.r1, clay: ld.resourceCost.r2, iron: ld.resourceCost.r3, crop: ld.resourceCost.r4 };
    this.waitFor(cost, this.laneFreeAt[lane]);
    this.pay(cost);
    const mb = Math.max(1, levelOf(this.state, GID.mainBuilding));
    const duration = Math.round((ld.buildingTime * mbTimeFactor(mb)) / this.ctx.config.speed);
    this.evt({ time: this.state.time, type: 'start', label: `→ L${target}`, slot: slotIdx, gid: slot.gid, level: target, cost, gold: 0 });
    // Finish Now (2 gold, never free — player-verified) completes the WHOLE queue. Orders placed at
    // the same moment (no resource wait between them) can share one click — but only as many as
    // the queue holds (Nitai): with Plus, 2 orders; Romans 3, and only if the 3 are NOT all the
    // same category (field vs building). A 3rd/4th order at the same instant needs a new click.
    const g = this.ctx.gold;
    const isField = FIELD_GIDS.includes(slot.gid);
    const sameInstant = this.lastFinishAt === this.state.time;
    const clickHasRoom = sameInstant && this.clickFits(isField);
    // Administrative buildings (Residence / Palace / Command Center) can NEVER be instant-finished
    // (Nitai): a click completes only the non-administrative orders; if only administrative ones
    // are queued, no click is possible. They always run their full timer.
    const administrative = (ADMIN_GIDS as number[]).includes(slot.gid);
    if (!administrative && g && duration >= g.instantFinishMin * 60 && (clickHasRoom || goldLeft(this.state, this.ctx) >= 2)) {
      slot.level = target;
      this.levelsVersion++;
      if (clickHasRoom) {
        this.clickBatch.push(isField);
      } else {
        this.state.goldSpent += 2;
        this.state.instantFinishes += 1;
        this.lastFinishAt = this.state.time;
        this.clickBatch = [isField];
        this.clickId += 1;
      }
      this.evt({ time: this.state.time, type: 'finish', label: clickHasRoom ? 'Finish Now (same click)' : 'Finish Now', slot: slotIdx, gid: slot.gid, level: target, gold: clickHasRoom ? 0 : 2, click: this.clickId });
      if (!clickHasRoom) this.dailyQuest('gold'); // a paid click = "gain or spend gold"
      this.collectTasks([...(taskIndex.byGid.get(slot.gid) ?? []), ...taskIndex.meta]);
      this.dailyQuest(isField ? 'field' : 'building');
      if (slot.gid === GID.rallyPoint) this.releaseHeldIncome();
      this.snapshot();
      return;
    }
    const done = this.state.time + duration;
    this.pendingDirty = true; this.pending.push({ t: done, kind: 'build', slot: slotIdx, target });
    this.laneFreeAt[lane] = done;
  }

  /** Train settlers ONE AT A TIME (Nitai): each is a separate order, paid when affordable, and
   *  queues behind the previous one in the Residence — no need to bank 3× the cost or oversize
   *  storage. `count` orders are placed sequentially; each waits for its own affordability. */
  trainSettlers(count = 3): void {
    // wait for whichever expansion building is on its way to 10 (order placed but not complete)
    for (const g of [GID.residence, GID.palace, GID.commandCenter]) {
      const idx = this.state.slots.findIndex((sl) => sl.gid === g);
      if (idx !== -1 && this.orderedLevel(idx) >= 10) { this.awaitBuilding(g, 10, 'trainSettlers'); break; }
    }
    const resLvl = Math.max(levelOf(this.state, GID.residence), levelOf(this.state, GID.palace), levelOf(this.state, GID.commandCenter));
    if (resLvl < 10) throw new Error('trainSettlers requires Residence/Palace/Command Center level 10');
    const t = tribes[this.ctx.tribe];
    const per = settlerTime(this.ctx.tribe, resLvl, this.ctx.config.speed, this.ctx.mods.allianceRecruitment ?? 0);
    for (let i = 0; i < count; i++) {
      // an order can be placed while the previous settler trains (queue), so only affordability gates it
      this.waitFor(t.settlerCost, 0);
      this.pay(t.settlerCost);
      const start = Math.max(this.state.time, this.laneFreeAt.training);
      const done = start + per;
      this.evt({ time: this.state.time, type: 'start', label: 'train settler', cost: t.settlerCost });
      this.pendingDirty = true; this.pending.push({ t: done, kind: 'settlers', count: 1 });
      this.laneFreeAt.training = done;
    }
  }

  celebration(great = false): void {
    const th = levelOf(this.state, GID.townHall);
    if (th < 1) throw new Error('Celebration requires a Town Hall');
    if (great && th < 10) throw new Error('Great celebration requires Town Hall 10');
    const cost = CELEBRATION_COST[great ? 'great' : 'small'];
    this.waitFor(cost, this.state.celebrationBusyUntil);
    this.pay(cost);
    // reworked celebrations: instant CP = daily CP production, capped per speed (research/03, /07)
    const [smallCap, greatCap] = celebrationCpCap[this.ctx.config.speed];
    const grant = Math.min(great ? greatCap : smallCap, cpPerSecond(this.state) * 86400);
    this.state.cp += grant;
    this.state.celebrationsHeld += 1;
    this.state.celebrationBusyUntil = this.state.time + celebrationDuration(th, great ? 'great' : 'small', this.ctx.config.speed);
    this.evt({ time: this.state.time, type: 'celebration', label: `${great ? 'great' : 'small'} celebration`, cp: grant, cost });
    this.dailyQuest('party');
    this.collectTasks(taskIndex.celebration);
    this.snapshot();
  }

  finish(): SimResult {
    this.applyDue(Infinity);
    return { events: this.events, state: this.state, settleTime: this.settleTime(), series: this.cpLog };
  }

  /** Earliest time when settlers ≥ 3 AND cp ≥ threshold for village 2 (piecewise-linear CP). */
  private settleTime(): number | null {
    const thr = settleGoalOf(this.ctx).threshold;
    if (this.settledAt !== null) return this.settledAt; // recorded live (works for light clones too)
    if (this.light) return this.projectSettle(thr);      // not yet settled: analytic projection
    const g = settleGoalOf(this.ctx);
    let prev: { t: number; cp: number; settlers: number } | null = null;
    for (const p of this.cpLog) {
      if (p.settlers >= g.settlers && p.cp >= thr) {
        if (prev && prev.settlers >= g.settlers && prev.cp < thr && p.t > prev.t) {
          return prev.t + ((thr - prev.cp) / (p.cp - prev.cp)) * (p.t - prev.t);
        }
        return p.t;
      }
      prev = p;
    }
    // conditions not reached during logged events: project forward at final rates
    const s = this.state;
    if (s.settlers >= g.settlers) {
      const rate = cpPerSecond(s);
      if (s.cp >= thr) return s.time;
      if (rate > 0) return s.time + (thr - s.cp) / rate;
    }
    return null;
  }
}

/** Convenience wrapper: run a full plan. */
export function simulate(plan: PlanStep[], ctx: SimContext, initial?: SimState): SimResult {
  const sim = new Simulation(ctx, initial);
  for (const step of plan) {
    if (step.kind === 'build') sim.build(step.slot);
    else if (step.kind === 'trainSettlers') sim.trainSettlers();
    else if (step.kind === 'trainRaiders') sim.trainRaiders(step.count);
    else if (step.kind === 'researchCavalry') sim.researchCavalry();
    else if (step.kind === 'trainCavalry') sim.trainCavalry(step.count);
    else sim.celebration(step.great);
  }
  return sim.finish();
}
