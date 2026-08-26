/** Basic (tier-1, no research) unit per tribe — the raider a settle-racer actually trains
 *  (nobody researches better raiders during a settle race — Nitai). Data: research/04, confirmed
 *  (kirilloid live + official). Speed in fields/h at 1x; carry per unit; upkeep 1 crop/h each. */
import type { Resources, Tribe } from '../types';

export interface RaiderUnit {
  name: string;
  cost: Resources;
  /** training seconds at 1x, Barracks L1 (÷speed; Barracks level speeds it up further — ignored v1) */
  time: number;
  carry: number;
  speed: number;
  upkeep: number;
}

export const raiders: Record<Tribe, RaiderUnit> = {
  romans:    { name: 'Legionnaire',   cost: { wood: 120, clay: 100, iron: 150, crop: 30 }, time: 1600, carry: 50, speed: 6, upkeep: 1 },
  gauls:     { name: 'Phalanx',       cost: { wood: 100, clay: 130, iron: 55,  crop: 30 }, time: 1040, carry: 35, speed: 7, upkeep: 1 },
  teutons:   { name: 'Clubswinger',   cost: { wood: 95,  clay: 75,  iron: 40,  crop: 40 }, time: 720,  carry: 60, speed: 7, upkeep: 1 },
  egyptians: { name: 'Slave Militia', cost: { wood: 45,  clay: 60,  iron: 30,  crop: 15 }, time: 530,  carry: 15, speed: 7, upkeep: 1 },
  huns:      { name: 'Mercenary',     cost: { wood: 130, clay: 80,  iron: 40,  crop: 40 }, time: 810,  carry: 50, speed: 6, upkeep: 1 },
  spartans:  { name: 'Hoplite',       cost: { wood: 110, clay: 185, iron: 110, crop: 35 }, time: 1700, carry: 60, speed: 6, upkeep: 1 },
};

/** Researchable cavalry raider per tribe — the BP trickle-farming meta where it pays (player-
 *  confirmed: Huns = Steppe Riders, Gauls = Theutates Thunders; Teutons stay on Clubswingers,
 *  Egyptians/Spartans/Romans usually skip cavalry in a race — the SEARCH decides organically).
 *  Research happens in the Academy (L5) and also needs the Stable at stableLevel (3 or 5).
 *  researchCost = unitCost×[6,4,8,6] + [100,100,200,160]; researchTime = 3×trainTime + 1800s (1x).
 *  Data: kirilloid live units.js cross-checked vs official art. 187 + fandom (research agent 2026-08-20). */
export const cavalryRaiders: Record<Tribe, RaiderUnit & { research: Resources; researchTime: number; stableLevel: number }> = {
  huns: {
    name: 'Steppe Rider', cost: { wood: 290, clay: 370, iron: 190, crop: 45 }, time: 2400, carry: 75, speed: 16, upkeep: 2,
    research: { wood: 1840, clay: 1580, iron: 1720, crop: 430 }, researchTime: 9000, stableLevel: 3,
  },
  gauls: {
    name: 'Theutates Thunder', cost: { wood: 350, clay: 450, iron: 230, crop: 60 }, time: 2480, carry: 75, speed: 19, upkeep: 2,
    research: { wood: 2200, clay: 1900, iron: 2040, crop: 520 }, researchTime: 9240, stableLevel: 3,
  },
  teutons: {
    name: 'Paladin', cost: { wood: 370, clay: 270, iron: 290, crop: 75 }, time: 2400, carry: 110, speed: 10, upkeep: 2,
    research: { wood: 2320, clay: 1180, iron: 2520, crop: 610 }, researchTime: 9000, stableLevel: 3,
  },
  romans: {
    name: 'Equites Imperatoris', cost: { wood: 550, clay: 440, iron: 320, crop: 100 }, time: 2640, carry: 100, speed: 14, upkeep: 3,
    research: { wood: 3400, clay: 1860, iron: 2760, crop: 760 }, researchTime: 9720, stableLevel: 5,
  },
  egyptians: {
    name: 'Anhur Guard', cost: { wood: 360, clay: 330, iron: 280, crop: 120 }, time: 2560, carry: 50, speed: 15, upkeep: 2,
    research: { wood: 2260, clay: 1420, iron: 2440, crop: 880 }, researchTime: 9480, stableLevel: 5,
  },
  spartans: {
    name: 'Elpida Rider', cost: { wood: 555, clay: 445, iron: 330, crop: 110 }, time: 2816, carry: 110, speed: 16, upkeep: 2,
    research: { wood: 3430, clay: 1880, iron: 2840, crop: 820 }, researchTime: 10248, stableLevel: 5,
  },
};

/** Troop movement scales ×2 on x2/x3/x5 and ×4 on x10 (official art. 20 — NOT linear). */
export function troopSpeedFactor(speed: number): number {
  return speed >= 10 ? 4 : speed >= 2 ? 2 : 1;
}

/** Generic per-unit throughput for any raider unit. */
export function unitThroughputPerHour(u: RaiderUnit, n: number, dist: number, serverSpeed: number): number {
  const tripH = (2 * dist) / (u.speed * troopSpeedFactor(serverSpeed));
  return tripH > 0 ? (n * u.carry) / tripH : 0;
}

/** Sustained raid THROUGHPUT of n raiders farming oases `dist` fields away: each raider carries
 *  `carry` per round trip (2·dist ÷ speed hours). Continuous raiding = one wave always out. */
export function raidThroughputPerHour(tribe: Tribe, n: number, dist: number, serverSpeed: number): number {
  const u = raiders[tribe];
  const tripH = (2 * dist) / (u.speed * troopSpeedFactor(serverSpeed));
  return tripH > 0 ? (n * u.carry) / tripH : 0;
}
