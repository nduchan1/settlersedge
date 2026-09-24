/** Hand-written build orders from the community, scripted over the public Simulation API.
 *  They are SEEDS for plan-space search (./plan.ts) — starting points the search is free to edit
 *  or discard — never rules. Each driver issues orders exactly as a player following the guide.
 *
 *  "Task tab v2" — alliance guide for fast settling on x3 (Huns/Gauls; Teutons swap horses for
 *  clubs). Google Sheet 1hF6WtBIe7IokBr8N31LFs5MFby-mqXyUTaJ697AqXbo, tab gid 884267800 (2026-09-17).
 *  Measured on Nitai's real Gaul x3 map: best variant 25:56 (2-party). */
import { CELEBRATION_COST, Simulation, addSlot } from '../sim/simulate';
import type { Resources } from '../types';
import { GID, levelData, wallGid } from '../data/buildings';
import { cavalryRaiders } from '../data/raiders';

const WORKSHOP = 21;

function raiseCaps(sim: Simulation, gid: number, level: number): void {
  for (let g = 0; g < 30; g++) {
    const c = levelData(gid, level).resourceCost;
    const caps = sim.orderedCaps();
    const needWh = Math.max(c.r1, c.r2, c.r3) > caps.warehouse;
    const needGr = c.r4 > caps.granary;
    if (!needWh && !needGr) return;
    const sg = needWh ? GID.warehouse : GID.granary;
    let i = sim.state.slots.findIndex((s) => s.gid === sg);
    if (i === -1) i = addSlot(sim.state, sg);
    sim.build(i);
  }
}
/** Raise storage until an arbitrary cost fits (research, parties — NPC cannot exceed caps). */
function fit(sim: Simulation, c: Resources): void {
  for (let g = 0; g < 30; g++) {
    const caps = sim.orderedCaps();
    const needWh = Math.max(c.wood, c.clay, c.iron) > caps.warehouse;
    if (!needWh && c.crop <= caps.granary) return;
    const sg = needWh ? GID.warehouse : GID.granary;
    let i = sim.state.slots.findIndex((s) => s.gid === sg);
    if (i === -1) i = addSlot(sim.state, sg);
    sim.build(i);
  }
}
function up(sim: Simulation, gid: number, level: number, slotIdx?: number): void {
  let idx = slotIdx ?? sim.state.slots.findIndex((s) => s.gid === gid);
  if (idx === -1) idx = addSlot(sim.state, gid);
  while (sim.orderedLevel(idx) < level) { raiseCaps(sim, gid, sim.orderedLevel(idx) + 1); sim.build(idx); }
}
/** ONE field of this type (the lowest) to `level`. */
function oneField(sim: Simulation, gid: number, level: number): void {
  let best = -1, bl = Infinity;
  sim.state.slots.forEach((s, i) => { if (s.gid === gid) { const l = sim.orderedLevel(i); if (l < bl) { bl = l; best = i; } } });
  up(sim, gid, level, best);
}
/** EVERY field to at least `level`, lowest first. */
function allFields(sim: Simulation, level: number): void {
  for (;;) {
    let best = -1, bl = Infinity;
    sim.state.slots.forEach((s, i) => { if (s.gid >= 1 && s.gid <= 4) { const l = sim.orderedLevel(i); if (l < level && l < bl) { bl = l; best = i; } } });
    if (best === -1) return;
    up(sim, sim.state.slots[best].gid, bl + 1, best);
  }
}
/** `n` crannies (a 2nd cranny needs a COMPLETED L10 one — wait for it like a player), each to `level`. */
function crannies(sim: Simulation, n: number, level: number): void {
  const idxs = sim.state.slots.map((s, i) => (s.gid === GID.cranny ? i : -1)).filter((i) => i >= 0);
  if (idxs.length < n) sim.awaitLevel(GID.cranny, 10);
  while (idxs.length < n) idxs.push(addSlot(sim.state, GID.cranny));
  for (const i of idxs) if (sim.orderedLevel(i) < level) up(sim, GID.cranny, level, i);
}

export interface GuideOptions { twoParty: boolean; /** raiding horses (guide: 12-20 by area) */ horses: number }

/** Drive `sim` through the "Task tab v2" x3 guide. Leaves the race finished (settlers + parties). */
export function allianceGuideX3(sim: Simulation, o: GuideOptions): void {
  const wall = wallGid(sim.ctx.tribe);
  up(sim, GID.rallyPoint, 1); // the guide opens with the hero's adventure (needs the Rally Point)
  up(sim, GID.warehouse, 1); up(sim, GID.granary, 1);
  up(sim, GID.warehouse, 2); up(sim, GID.granary, 2);
  up(sim, GID.warehouse, 3); up(sim, GID.granary, 3);
  up(sim, GID.mainBuilding, 3);
  oneField(sim, GID.clayPit, 2); oneField(sim, GID.ironMine, 2);
  up(sim, GID.embassy, 1);
  up(sim, wall, 3);
  up(sim, GID.marketplace, 3);
  up(sim, GID.cranny, 3);
  allFields(sim, 2);
  up(sim, GID.barracks, 3);
  up(sim, GID.mainBuilding, 7);
  oneField(sim, GID.clayPit, 4); oneField(sim, GID.woodcutter, 4); oneField(sim, GID.ironMine, 4); oneField(sim, GID.cropland, 4);
  allFields(sim, 3);
  up(sim, GID.marketplace, 7);
  up(sim, GID.academy, 3);
  up(sim, GID.smithy, 3);
  up(sim, GID.academy, 5);
  up(sim, GID.stable, 3);
  const cav = !!cavalryRaiders[sim.ctx.tribe] && !!sim.ctx.oasisRaids;
  let trained = 0;
  const batch = (n: number) => {
    if (!cav) return;
    const k = Math.min(n, o.horses - trained);
    if (k > 0) { sim.trainCavalry(k); trained += k; }
  };
  if (cav) { fit(sim, cavalryRaiders[sim.ctx.tribe]!.research); sim.researchCavalry(); }
  batch(4);
  up(sim, GID.cranny, 6); batch(2);
  up(sim, GID.mainBuilding, 10); batch(2);
  up(sim, GID.cranny, 10); batch(2);
  crannies(sim, 8, 1); batch(2); // "7 crannies to 1" on top of the L10 one
  up(sim, GID.academy, 10); batch(2);
  up(sim, WORKSHOP, 1);
  up(sim, GID.townHall, 1);
  up(sim, GID.residence, 1);
  up(sim, GID.granary, 7);
  up(sim, GID.warehouse, 8);
  batch(o.horses); // whatever is left
  if (o.twoParty) {
    fit(sim, CELEBRATION_COST.small); sim.celebration(false);
    up(sim, GID.residence, 10);
    sim.trainSettlers();
    fit(sim, CELEBRATION_COST.small); sim.celebration(false);
  } else {
    crannies(sim, 8, 3);
    up(sim, GID.residence, 10);
    sim.trainSettlers();
    fit(sim, CELEBRATION_COST.small); sim.celebration(false); // "after daily reset" — the sim's CP wait covers the timing
  }
}
