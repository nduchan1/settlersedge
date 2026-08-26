import { describe, expect, it } from 'vitest';
import { addSlot, createInitialState, productionPerSecond, settleGoal, simulate, storageCaps, type SimContext } from './simulate';
import { serverPresets } from '../data/servers';
import { advancedStartCp, cpThreshold } from '../data/culture';
import { settlerTime } from '../formulas';
import { GID } from '../data/buildings';

const ctx = (over: Partial<SimContext> = {}): SimContext => ({
  config: serverPresets['regular-3tribe-x1'],
  tribe: 'gauls',
  mods: { allianceRecruitment: 0, goldProductionBonus: false, plus: true }, // model default: record chasers run Plus
  hero: { enabled: false, target: 'all' },
  tasks: false,
  ...over,
});

describe('initial state', () => {
  it('standard: 18 fields at L0 + a level-1 Main Building, 750 each, starting CP, no settlers', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    expect(s.slots).toHaveLength(19);
    expect(s.slots.filter((sl) => sl.gid <= 4)).toHaveLength(18);
    expect(s.slots.find((sl) => sl.gid === GID.mainBuilding)?.level).toBe(1); // villages spawn with MB1 (Nitai)
    expect(s.res.wood).toBe(750);
    expect(s.cp).toBe(500);
    expect(s.settlers).toBe(0);
  });
  it('advanced start: fields L5, MB1, 6 settlers', () => {
    const s = createInitialState(serverPresets['local-6tribe-x10-advstart']);
    expect(s.slots.filter((sl) => sl.gid <= 4).every((sl) => sl.level === 5)).toBe(true);
    expect(s.slots.find((sl) => sl.gid === GID.mainBuilding)?.level).toBe(1);
    expect(s.settlers).toBe(6);
  });
  it('the "Build Main Building level 1" task fires at spawn (MB1 is pre-built)', () => {
    const r = simulate([], ctx({ tasks: true }));
    expect(r.events.some((e) => e.type === 'task' && e.label === 'Build Main Building level 1' && e.time === 0)).toBe(true);
  });
});

describe('builds', () => {
  it('woodcutter L1: official 260s, production rises', () => {
    const { events, state } = simulate([{ kind: 'build', slot: 0 }], ctx());
    expect(events.find((e) => e.type === 'complete')?.time).toBe(260);
    expect(productionPerSecond(state, ctx()).wood * 3600).toBeCloseTo(7 + 3 * 3, 5);
  });
  it('x2 halves build time', () => {
    const { events } = simulate([{ kind: 'build', slot: 0 }], ctx({ config: serverPresets['regular-5tribe-x2'] }));
    expect(events.find((e) => e.type === 'complete')?.time).toBe(130);
  });
  it('non-Romans queue sequentially; Romans dual-queue', () => {
    const gaul = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }], ctx());
    expect(gaul.events.filter((e) => e.type === 'start')[1].time).toBe(260);
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mb = addSlot(s, GID.mainBuilding);
    const roman = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: mb }], ctx({ tribe: 'romans' }), s);
    expect(roman.events.filter((e) => e.type === 'start')[1].time).toBe(0);
  });
});

describe('tasks', () => {
  it('MB L1 fires "Build Main Building level 1": banked 150 base, +10 xp', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mb = addSlot(s, GID.mainBuilding);
    const { events, state } = simulate([{ kind: 'build', slot: mb }], ctx({ tasks: true }), s);
    const task = events.find((e) => e.type === 'task');
    expect(task?.label).toBe('Build Main Building level 1');
    expect(state.xp).toBe(10); // no clears pending -> XP claimed instantly
    expect(state.taskBank).toBe(150); // banked, not auto-collected
  });
  it('unclaimed rewards make a purchase instantly affordable; a task is claimed WHOLE into the hero bag', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    s.unclaimed = [500]; // one task worth 500/res
    s.res = { wood: 0, clay: 700, iron: 700, crop: 700 };
    const r = simulate([{ kind: 'build', slot: 0 }], ctx(), s); // woodcutter L1 needs 40 wood
    expect(r.events.find((e) => e.type === 'start')?.time).toBe(0);
    expect(r.state.unclaimed).toHaveLength(0);                 // claimed all-or-nothing
    expect(r.state.heroBag.wood).toBe(500 - 40);               // only the 40 needed moved to the warehouse
    expect(r.state.heroBag.clay).toBe(500);                    // untouched — moved per resource, not per task
  });
  it('hero bag is UNCAPPED; warehouse move respects storage cap', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    s.heroBag = { wood: 5000, clay: 5000, iron: 5000, crop: 5000 }; // far above the 800 base cap
    s.res = { wood: 0, clay: 0, iron: 0, crop: 0 };
    const r = simulate([{ kind: 'build', slot: 0 }], ctx(), s);      // 40/100/50/60
    expect(r.state.heroBag.wood).toBe(4960);
    expect(r.state.res.wood).toBeLessThanOrEqual(800);
  });
  it('oasis loot lands in the hero bag, not the warehouse', () => {
    const r = simulate([], ctx({ oasisRaids: { count: 1, packSupply: 5, firstAtH: 1, distance: 3, tricklePerHour: 0 } }), withRP());
    expect(r.state.heroBag.wood).toBeGreaterThan(0); // bounty = 40/supply killed, instant at the hit
    expect(r.state.res.wood).toBeLessThanOrEqual(800);
  });
});

/** A village with a Rally Point already built — the hero can leave (Nitai: RP gates all movement). */
const withRP = (preset = 'regular-3tribe-x1') => {
  const s = createInitialState(serverPresets[preset]);
  const rp = addSlot(s, GID.rallyPoint);
  s.slots[rp].level = 1;
  return s;
};

describe('adventures (official schedule, no knobs)', () => {
  it('3 starting adventures early; only #2 and #7 of the fixed ten pay resources', () => {
    const r = simulate([], ctx({ adventures: true }), withRP());
    const advs = r.events.filter((e) => e.label.startsWith('adventure'));
    expect(advs.length).toBeGreaterThan(15);
    expect(advs[0].time).toBeLessThan(2 * 3600); // starting adventures land early
    const paying = advs.slice(0, 10).filter((e) => e.label.includes('res'));
    expect(paying).toHaveLength(2); // #2 and #7 only
    expect(r.state.xp).toBeGreaterThan(100);
  });
  it('spawn rate scales with speed (more adventures by day 2 on x3)', () => {
    const x1 = simulate([], ctx({ adventures: true }), withRP()).events.filter((e) => e.label.startsWith('adventure') && e.time < 2 * 86400).length;
    const x3 = simulate([], ctx({ adventures: true, config: serverPresets['regular-5tribe-x3'] }), withRP('regular-5tribe-x3')).events.filter((e) => e.label.startsWith('adventure') && e.time < 2 * 86400).length;
    expect(x3).toBeGreaterThan(x1);
  });
  it('NO Rally Point → the hero cannot leave: adventures are held, then released when RP1 completes', () => {
    const none = simulate([], ctx({ adventures: true }));
    expect(none.events.filter((e) => e.type === 'adventure')).toHaveLength(0); // never left the village
    // build a Rally Point (RP L1: 110/160/90/70, official) — the backlog releases on completion
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const rp = addSlot(s, GID.rallyPoint);
    const r = simulate([{ kind: 'build', slot: rp }], ctx({ adventures: true }), s);
    const advs = r.events.filter((e) => e.type === 'adventure');
    expect(advs.length).toBeGreaterThan(0);
    const rpDone = r.events.find((e) => e.type === 'complete' && e.gid === GID.rallyPoint)!.time;
    expect(advs[0].time).toBeGreaterThanOrEqual(rpDone); // nothing before the RP exists
  });
});

describe('hero production', () => {
  it('4 points all-res adds 36/h each at x1', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const rate = productionPerSecond(s, ctx({ hero: { enabled: true, target: 'all' } }));
    expect(rate.wood * 3600).toBeCloseTo(3 * 4 + 36, 5);
  });
});

describe('settlers & settle time', () => {
  it('requires Residence 10', () => {
    expect(() => simulate([{ kind: 'trainSettlers' }], ctx())).toThrow(/level 10/);
  });
  it('trains settlers ONE AT A TIME (queued); third finishes at 3× settlerTime; settle waits for CP', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const res = addSlot(s, GID.residence);
    s.slots[res].level = 10;
    s.res = { wood: 20000, clay: 20000, iron: 20000, crop: 20000 };
    const r = simulate([{ kind: 'trainSettlers' }], ctx(), s);
    const done = r.events.filter((e) => e.type === 'settlers');
    expect(done).toHaveLength(3); // three separate orders, three completions
    expect(done[2].time).toBe(3 * settlerTime('gauls', 10, 1, 0));
    expect(r.state.settlers).toBe(3);
    expect(r.settleTime).toBeGreaterThan(done[2].time); // CP 500 < 2000 → continuous CP wait
  });
  it('one-at-a-time: a single settler is affordable with far less stock/storage than three', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const res = addSlot(s, GID.residence);
    s.slots[res].level = 10;
    const wh = addSlot(s, GID.warehouse); s.slots[wh].level = 8;  // 7,200 cap: holds ONE settler (5600 clay), not three
    const gr = addSlot(s, GID.granary); s.slots[gr].level = 8;
    s.slots.forEach((sl) => { if (sl.gid <= 4) sl.level = 5; }); // real economy so settlers 2–3 can be refunded
    s.res = { wood: 6000, clay: 6000, iron: 6000, crop: 6000 };   // covers ONE Gaul settler (4400/5600/4200/3900)
    const r = simulate([{ kind: 'trainSettlers' }], ctx({ tasks: false }), s);
    expect(r.events.filter((e) => e.type === 'settlers')).toHaveLength(3); // no throw, all three eventually train
    expect(r.events.filter((e) => e.label === 'train settler')[0].time).toBe(0); // first order immediately
  });
  it('advanced start: spawns with v2+v3 CP (+75% toward v4); the RACE is village 4 (9 settlers)', () => {
    const cfg = serverPresets['local-6tribe-x10-advstart'];
    const s = createInitialState(cfg);
    expect(s.settlers).toBe(6);
    expect(s.cp).toBeCloseTo(advancedStartCp(10), 5); // official worked-example formula, was never wired
    const goal = settleGoal(cfg);
    expect(goal.settlers).toBe(9); // 6 pre-trained (v2+v3) + 3 NEW from the Residence
    expect(goal.threshold).toBe(cpThreshold(4, 10));
    // without training 3 new settlers there is NO settle, no matter the CP
    const r = simulate([], ctx({ config: cfg }));
    expect(r.settleTime).toBeNull();
  });
});

describe('celebrations', () => {
  it('grants capped instant CP and blocks the next by cooldown', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const th = addSlot(s, GID.townHall);
    s.slots[th].level = 1;
    // real storage — party #2 pays AFTER the cooldown wait, so the warehouse must legally hold it
    const wh = addSlot(s, GID.warehouse); s.slots[wh].level = 12;
    const gr = addSlot(s, GID.granary); s.slots[gr].level = 8;
    s.res = { wood: 20000, clay: 20000, iron: 20000, crop: 20000 };
    s.heroBag = { wood: 9000, clay: 9000, iron: 9000, crop: 9000 }; // bag refills the warehouse for party #2
    const r = simulate([{ kind: 'celebration' }, { kind: 'celebration' }], ctx(), s);
    const cele = r.events.filter((e) => e.type === 'celebration');
    expect(cele).toHaveLength(2);
    expect(cele[1].time - cele[0].time).toBeCloseTo(86400, 0); // TH1 cooldown = 24h at x1
    expect(cele[0].cp).toBeLessThanOrEqual(500);
  });
});

const GOLD = { budget: 1000, npc: true, instantFinishMin: Infinity };

describe('NPC merchant', () => {
  it('pools resources once a Marketplace exists; 3 gold per exchange', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mk = addSlot(s, GID.marketplace);
    s.slots[mk].level = 1;
    s.res = { wood: 0, clay: 700, iron: 700, crop: 700 }; // wood-broke but rich in total
    const r = simulate([{ kind: 'build', slot: 0 }], ctx({ gold: GOLD }), s); // woodcutter L1: 40/100/50/60
    expect(r.events.find((e) => e.type === 'start')?.time).toBe(0); // no wait — pooled affordability
    expect(r.events.some((e) => e.label.includes('NPC'))).toBe(true);
    expect(r.state.goldSpent).toBe(3);
    expect(r.state.npcExchanges).toBe(1);
  });
  it('exhausted budget disables NPC', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mk = addSlot(s, GID.marketplace);
    s.slots[mk].level = 1;
    s.res = { wood: 0, clay: 700, iron: 700, crop: 700 };
    const r = simulate([{ kind: 'build', slot: 0 }], ctx({ gold: { ...GOLD, budget: 2 } }), s);
    expect(r.events.find((e) => e.type === 'start')!.time).toBeGreaterThan(0); // must wait for wood
    expect(r.state.goldSpent).toBe(0);
  });
  it('without NPC the same build must wait for wood', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    s.res = { wood: 0, clay: 700, iron: 700, crop: 700 };
    const r = simulate([{ kind: 'build', slot: 0 }], ctx(), s);
    expect(r.events.find((e) => e.type === 'start')!.time).toBeGreaterThan(0);
    expect(r.state.goldSpent).toBe(0);
  });
});

describe('BP oasis raiding (derived combat)', () => {
  it('hero clears packs over repeated raids; bounty 40/supply + 1 XP/supply; no respawn', () => {
    const r = simulate([], ctx({
      oasisRaids: { count: 2, packSupply: 6, firstAtH: 1, distance: 3, tricklePerHour: 0 },
    }), withRP());
    const raids = r.events.filter((e) => e.type === 'oasis');
    expect(raids.length).toBeGreaterThanOrEqual(2); // partial clears force re-hits
    expect(raids[0].time).toBe(3600); // first raid exactly at firstAtH
    expect(r.state.oasisPacks.every((v) => v <= 0)).toBe(true); // small packs fully cleared
    const totalSupply = 2 + 4; // defaultPacks(2, 6) = [2, 4] (0.4x, 0.7x spread)
    expect(r.state.heroBag.wood).toBe(totalSupply * 40); // official bounty rate, per resource
    expect(r.state.xp).toBeGreaterThanOrEqual(totalSupply); // 1 XP/supply (+ task xp)
  });
  it('raids wait for the Rally Point (hero cannot leave the village)', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const r = simulate([], ctx({ oasisRaids: { count: 1, packSupply: 5, firstAtH: 1, distance: 3, tricklePerHour: 0 } }), s);
    expect(r.events.filter((e) => e.type === 'oasis')).toHaveLength(0);
    expect(r.state.oasisPacks[0]).toBeGreaterThan(0);
  });
});

describe('instant finish (Finish Now)', () => {
  it('completes long builds immediately for 2 gold — never free', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mb = addSlot(s, GID.mainBuilding);
    const r = simulate([{ kind: 'build', slot: mb }], ctx({ gold: { budget: 10, npc: false, instantFinishMin: 1 } }), s);
    const done = r.events.find((e) => e.type === 'finish')!;
    expect(done.time).toBe(0); // instant
    expect(done.gold).toBe(2);
    expect(r.state.goldSpent).toBe(2);
    expect(r.state.instantFinishes).toBe(1);
  });
  // Queue depth rule (Nitai): Plus = 2 orders per Finish-Now click; Romans 3 only if mixed categories.
  const G = { budget: 100, npc: false, instantFinishMin: 1 };
  const rich = (preset = 'regular-3tribe-x1') => {
    const s = createInitialState(serverPresets[preset]);
    s.res = { wood: 750, clay: 750, iron: 750, crop: 750 };
    return s;
  };
  it('NO Plus: no waiting slot — each same-instant order needs its own click', () => {
    const s = rich();
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 1 }],
      ctx({ gold: G, mods: { allianceRecruitment: 0, goldProductionBonus: false, plus: false } }), s);
    expect(r.state.goldSpent).toBe(4); // two separate 2-gold clicks
  });
  it('Plus: two same-instant orders share ONE click (2 gold)', () => {
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }], ctx({ gold: G }), rich());
    expect(r.state.goldSpent).toBe(2);
    expect(r.state.instantFinishes).toBe(1);
  });
  it('Plus: a THIRD same-instant order needs a second click (4 gold) — non-Romans', () => {
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }, { kind: 'build', slot: 8 }], ctx({ gold: G }), rich());
    expect(r.state.goldSpent).toBe(4);
    expect(r.state.instantFinishes).toBe(2);
  });
  it('Romans: field + field + building = 3 in ONE click (2 gold)', () => {
    const s = rich();
    const mb = addSlot(s, GID.mainBuilding);
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }, { kind: 'build', slot: mb }], ctx({ tribe: 'romans', gold: G }), s);
    expect(r.state.goldSpent).toBe(2);
    expect(r.state.instantFinishes).toBe(1);
  });
  it('Romans: F+F+B+B needs TWO clicks — Plus gives one waiting slot per account, not per lane', () => {
    const s = rich();
    const a = addSlot(s, GID.mainBuilding), b = addSlot(s, GID.cranny);
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }, { kind: 'build', slot: a }, { kind: 'build', slot: b }], ctx({ tribe: 'romans', gold: G }), s);
    expect(r.state.goldSpent).toBe(4);
    expect(r.state.instantFinishes).toBe(2);
  });
  it('Romans: B+B+F+F needs TWO clicks (mirror case — one waiting slot only)', () => {
    const s = rich();
    const a = addSlot(s, GID.mainBuilding), b = addSlot(s, GID.cranny);
    const r = simulate([{ kind: 'build', slot: a }, { kind: 'build', slot: b }, { kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }], ctx({ tribe: 'romans', gold: G }), s);
    expect(r.state.goldSpent).toBe(4);
    expect(r.state.instantFinishes).toBe(2);
  });
  it('administrative buildings (Residence/Palace/CC) can NEVER be instant-finished', () => {
    const s = rich();
    const mb = addSlot(s, GID.mainBuilding); s.slots[mb].level = 5; // Residence prereq
    const res = addSlot(s, GID.residence);
    const r = simulate([{ kind: 'build', slot: res }], ctx({ gold: G }), s);
    expect(r.state.instantFinishes).toBe(0);
    expect(r.state.goldSpent).toBe(0);
    expect(r.events.find((e) => e.type === 'complete' && e.gid === GID.residence)!.time).toBeGreaterThan(0); // ran its timer
  });
  it('a click completes only the NON-administrative building in a mixed queue', () => {
    const s = rich();
    const mb = addSlot(s, GID.mainBuilding); s.slots[mb].level = 5;
    const res = addSlot(s, GID.residence);
    // Residence L1 (admin) + a cranny at the same instant: the click finishes the cranny only
    const cr = addSlot(s, GID.cranny);
    const r = simulate([{ kind: 'build', slot: res }, { kind: 'build', slot: cr }], ctx({ gold: G }), s);
    expect(r.state.instantFinishes).toBe(1);
    expect(r.events.filter((e) => e.type === 'finish')).toHaveLength(1);
    expect(r.events.find((e) => e.type === 'finish')!.gid).toBe(GID.cranny);
  });
  it('Romans: B+B+F = 3 in ONE click (waiting slot on the building lane, field lane free)', () => {
    const s = rich();
    const a = addSlot(s, GID.mainBuilding), b = addSlot(s, GID.cranny);
    const r = simulate([{ kind: 'build', slot: a }, { kind: 'build', slot: b }, { kind: 'build', slot: 0 }], ctx({ tribe: 'romans', gold: G }), s);
    expect(r.state.goldSpent).toBe(2);
    expect(r.state.instantFinishes).toBe(1);
  });
  it('Romans: field + field + FIELD = 2 clicks (4 gold) — three of one category is not allowed', () => {
    const r = simulate([{ kind: 'build', slot: 0 }, { kind: 'build', slot: 4 }, { kind: 'build', slot: 8 }], ctx({ tribe: 'romans', gold: G }), rich());
    expect(r.state.goldSpent).toBe(4);
    expect(r.state.instantFinishes).toBe(2);
  });
  it('Romans: building + building + building = 2 clicks (4 gold)', () => {
    const s = rich();
    const a = addSlot(s, GID.mainBuilding), b = addSlot(s, GID.cranny), c = addSlot(s, GID.cranny);
    const r = simulate([{ kind: 'build', slot: a }, { kind: 'build', slot: b }, { kind: 'build', slot: c }], ctx({ tribe: 'romans', gold: G }), s);
    expect(r.state.goldSpent).toBe(4);
    expect(r.state.instantFinishes).toBe(2);
  });
  it('threshold Infinity never spends gold on finishes', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mb = addSlot(s, GID.mainBuilding);
    const r = simulate([{ kind: 'build', slot: mb }], ctx({ gold: { budget: 10, npc: false, instantFinishMin: Infinity } }), s);
    expect(r.state.instantFinishes).toBe(0);
    expect(r.events.find((e) => e.type === 'complete')!.time).toBeGreaterThan(0);
  });
});

describe('storage', () => {
  it('caps at 800 base', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    expect(storageCaps(s)).toEqual({ warehouse: 800, granary: 800 });
  });
});

describe('oasis trickle needs troops (Nitai)', () => {
  const RAIDS = { count: 0, firstAtH: 1, tricklePerHour: 1000, distance: 3 };
  it('no raiders → zero trickle even with regen available', () => {
    const s = withRP();
    const rate = productionPerSecond(s, ctx({ oasisRaids: RAIDS }));
    expect(rate.wood * 3600).toBeCloseTo(3 * 4, 3); // fields only (L0 = 3/h each ×4)
  });
  it('raiders bound trickle by carry throughput, then by regen; and eat crop', () => {
    const s = withRP();
    s.raiders = 4; // 4 Phalanx × 35 carry / (2·3 fields ÷ 7 f/h) = 163/h < 1000 regen
    const r = productionPerSecond(s, ctx({ oasisRaids: RAIDS }));
    expect((r.wood * 3600) - 12).toBeCloseTo(163.3 / 4, 0);
    const c = productionPerSecond(withRP(), ctx({ oasisRaids: RAIDS })).crop * 3600;
    expect(r.crop * 3600).toBeLessThan(c + 163.3 / 4); // upkeep 4 crop/h subtracted
    s.raiders = 100; // throughput 4083/h > regen 1000 → capped at regen
    expect((productionPerSecond(s, ctx({ oasisRaids: RAIDS })).wood * 3600) - 12).toBeCloseTo(250, 0);
  });
  it('trainRaiders needs Rally Point + Barracks; trains sequentially in the Barracks', () => {
    expect(() => simulate([{ kind: 'trainRaiders', count: 1 }], ctx(), withRP())).toThrow(/Barracks/);
    const s = withRP();
    const b = addSlot(s, GID.barracks); s.slots[b].level = 1;
    s.res = { wood: 2000, clay: 2000, iron: 2000, crop: 2000 };
    const r = simulate([{ kind: 'trainRaiders', count: 2 }], ctx(), s);
    const done = r.events.filter((e) => e.type === 'raiders');
    expect(done).toHaveLength(2);
    expect(done[1].time).toBe(2 * 1040); // Phalanx 1040s each at 1x, sequential
    expect(r.state.raiders).toBe(2);
  });
});

describe('Hun x3 audit fixes', () => {
  it('trickle is gated on CLEARED packs (production starts only after the animals are removed)', () => {
    const s = withRP(); s.raiders = 200;
    const o = { count: 10, firstAtH: 2, tricklePerHour: 1000, distance: 3 };
    const at = () => productionPerSecond(s, ctx({ oasisRaids: o })).wood * 3600 - 12;
    s.oasisPacks = Array(10).fill(5);
    expect(at()).toBeCloseTo(0, 3);          // nothing cleared yet
    s.oasisPacks[0] = 0;
    expect(at()).toBeCloseTo(100 / 4, 0);    // 1 of 10 cleared → 10% of regen
    s.oasisPacks = Array(10).fill(0);
    expect(at()).toBeCloseTo(1000 / 4 + 36, 0); // all cleared → full regen + auto-respec hero (4 pts × 9/h)
  });
  it('Barracks level speeds raider training (0.9^(L-1))', () => {
    const s = withRP();
    const b = addSlot(s, GID.barracks); s.slots[b].level = 5;
    s.res = { wood: 2000, clay: 2000, iron: 2000, crop: 2000 };
    const r = simulate([{ kind: 'trainRaiders', count: 1 }], ctx(), s);
    expect(r.events.find((e) => e.type === 'raiders')!.time).toBe(Math.round(1040 * Math.pow(0.9, 4)));
  });
  it('NPC path never drives warehouse stock negative', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const mk = addSlot(s, GID.marketplace); s.slots[mk].level = 1;
    s.heroBag = { wood: 3000, clay: 3000, iron: 3000, crop: 3000 }; // big bag, tiny cap (800)
    s.res = { wood: 0, clay: 0, iron: 0, crop: 0 };
    const res = addSlot(s, GID.residence); const mb = addSlot(s, GID.mainBuilding); s.slots[mb].level = 5;
    const r = simulate([{ kind: 'build', slot: res }], ctx({ gold: { budget: 100, npc: true, instantFinishMin: Infinity } }), s);
    for (const e of r.events) if (e.snap) for (const k of ['wood', 'clay', 'iron', 'crop'] as const) expect(e.snap.store[k]).toBeGreaterThanOrEqual(0);
  });
  it('training waits for a QUEUED Barracks instead of throwing', () => {
    const s = withRP();
    s.res = { wood: 3000, clay: 3000, iron: 3000, crop: 3000 };
    const b = addSlot(s, GID.barracks);
    const r = simulate([{ kind: 'build', slot: b }, { kind: 'trainRaiders', count: 1 }], ctx(), s);
    const done = r.events.find((e) => e.type === 'complete' && e.gid === GID.barracks)!.time;
    expect(r.events.find((e) => e.label === 'train Phalanx')!.time).toBeGreaterThanOrEqual(done);
  });
  it('hero respec turns production on at respecAtH', () => {
    const s = createInitialState(serverPresets['regular-3tribe-x1']);
    const c = ctx({ hero: { enabled: false, target: 'all', respecAtH: 5 } });
    s.time = 4 * 3600; const before = productionPerSecond(s, c).wood * 3600;
    s.time = 6 * 3600; const after = productionPerSecond(s, c).wood * 3600;
    expect(after - before).toBeCloseTo(36, 3); // 4 points × 9/h at x1
  });
  it('Huns can research and train Steppe Riders (research: Academy 5 + Stable 3)', () => {
    const s = withRP('regular-5tribe-x3');
    const ac = addSlot(s, GID.academy); s.slots[ac].level = 5;
    const sm = addSlot(s, GID.smithy); s.slots[sm].level = 3;
    const st = addSlot(s, GID.stable); s.slots[st].level = 3; // Steppe research needs Stable 3
    s.res = { wood: 9000, clay: 9000, iron: 9000, crop: 9000 };
    const r = simulate([{ kind: 'researchCavalry' }, { kind: 'trainCavalry', count: 2 }], ctx({ tribe: 'huns', config: serverPresets['regular-5tribe-x3'] }), s);
    expect(r.state.cavalryResearched).toBe(true);
    expect(r.state.cavalry).toBe(2);
    expect(r.events.find((e) => e.label.includes('researched'))!.time).toBe(3000); // 9000s ÷ 3
  });
});

describe('Academy research Finish Now (Nitai)', () => {
  it('research completes instantly for 2 gold like a building', () => {
    const s = withRP('regular-5tribe-x3');
    const ac = addSlot(s, GID.academy); s.slots[ac].level = 5;
    const sm = addSlot(s, GID.smithy); s.slots[sm].level = 3;
    const st = addSlot(s, GID.stable); s.slots[st].level = 3;
    s.res = { wood: 9000, clay: 9000, iron: 9000, crop: 9000 };
    const r = simulate([{ kind: 'researchCavalry' }, { kind: 'trainCavalry', count: 1 }],
      ctx({ tribe: 'huns', config: serverPresets['regular-5tribe-x3'], gold: { budget: 100, npc: false, instantFinishMin: 5 } }), s);
    expect(r.state.cavalryResearched).toBe(true);
    const fin = r.events.find((e) => e.type === 'finish' && e.label.includes('research'))!;
    expect(fin.time).toBe(0);
    expect(fin.gold).toBe(2);
    expect(r.events.find((e) => e.label.includes('Steppe Rider ready'))!.time).toBe(648); // training NOT goldable (2400×0.9²÷3)
  });
});

describe('Book of Wisdom cutoff (organic respec)', () => {
  it('hero retires when the next raid pays worse than production, abandoning the far tail', () => {
    const s = withRP('regular-5tribe-x3');
    s.xp = 12000; // high level → big production alternative
    s.oasisPacks = [0, 0, 4]; // two cleared, one tiny far pack left
    const r = simulate([], ctx({
      tribe: 'huns', config: serverPresets['regular-5tribe-x3'],
      oasisRaids: { count: 3, firstAtH: 0.5, distance: 40, tricklePerHour: 900 }, // far tail
    }), s);
    expect(r.state.heroRetired).toBe(true);
    expect(r.state.oasisPacks[2]).toBe(4); // abandoned, NOT cleared
    expect(r.events.some((e) => e.label.startsWith('Book of Wisdom'))).toBe(true);
    // production is ON after retirement despite uncleared pack
    const rate = productionPerSecond(r.state, ctx({ tribe: 'huns', config: serverPresets['regular-5tribe-x3'], oasisRaids: { count: 3, firstAtH: 0.5, distance: 40, tricklePerHour: 900 } }));
    expect(rate.wood * 3600).toBeGreaterThan(1000); // hero production flowing
  });
});
