/** Oasis-clear combat, derived from first principles (T4.6).
 *  Sources: official combat formulas (kirilloid's officially-republished article; cross-checked vs
 *  his live engine source) + official KB 45/47/190 + Nitai's live x3 verification (2026-08-19/20):
 *  - Oases can only be RAIDed → both sides take partial losses; 2–4 hits to clear emerges naturally.
 *  - RAID losses: x = (O/D)^1.5 (K=1.5 at oasis army sizes); defender loses x/(1+x), attacker 1/(1+x).
 *  - Hero HP loss = attacker loss fraction × 100 (official KB 47: "estimate by % of troops killed").
 *  - Bounty = 40/res per crop-supply KILLED, credited instantly at the hit; XP = 1/supply.
 *  - Hero must walk home before re-dispatch ⇒ cadence = round trip at mounted hero speed.
 *  - Losses round per unit type ("escort survives any ≥50%-survival battle") — we model the pack as
 *    a supply pool with a typical defense-per-supply, so rounding applies at the pool level.
 *  - Morale vs nature and the +10 basic defense are modeled minimal/off (unverified in live game). */
import { troopSpeedFactor } from '../data/raiders';
import type { Tribe } from '../types';

/** Typical animal pack per oasis, in crop-supply points. Official examples are ~5 supply at spawn,
 *  but live-verified first hits (440–800/res killed at 50–70%) imply ~14–30 by raid time. */
export const DEFAULT_PACK_SUPPLY = 18;

/** Typical animal defense per supply point vs a MOUNTED hero (cavalry def):
 *  rat 20, spider 40, bat 50, boar 16.5, snake 60, bear 66.7 … mixed packs ≈ 40. */
export const DEF_PER_SUPPLY_TYPICAL = 40;

/** Deterministic pack-size spread around the mean (real oases vary; search must stay replayable). */
export function defaultPacks(count: number, meanSupply: number): number[] {
  const SPREAD = [0.4, 0.7, 1.0, 1.3, 1.6]; // real spawns vary widely - a few rat-dens make gentle first targets
  return Array.from({ length: count }, (_, i) => Math.max(1, Math.round(meanSupply * SPREAD[i % SPREAD.length])));
}

/** Hero fighting strength: base 100 + 80/point (Romans 100/point) [official KB 45].
 *  Raiding meta (production off): ALL points (4 + 4/level) go to strength.
 *  A production hero keeps points in resources ⇒ base strength only (can't really clear). */
export function heroFightingStrength(level: number, tribe: Tribe, productionHero: boolean): number {
  if (productionHero) return 100;
  const points = 4 + 4 * level;
  return 100 + points * (tribe === 'romans' ? 100 : 80);
}

/** Mounted hero speed, fields/h at 1x: Gelding 14; Gauls +5 mounted; Huns +3 (fully-mounted army).
 *  Adventure #1 always gives the horse (first ~30–60 min) — clears start mounted. */
/** Hero speed: 7 on foot; the FIRST adventure always rewards the horse (official fixed sequence,
 *  research/05 §36) → 14 mounted + tribe bonus (Gaul +5, Hun +3 — mounted only). Without the
 *  horse a strength hero is useless for clears (round trips ×2–2.7), so the adventure comes first. */
export function heroMountedSpeed(tribe: Tribe, mounted = true): number {
  if (!mounted) return 7;
  return 14 + (tribe === 'gauls' ? 5 : 0) + (tribe === 'huns' ? 3 : 0);
}

/** Hours per clear cycle: walk to the oasis and home again (no oasis-to-oasis chaining — Nitai).
 *  Bounty is credited at the HIT (halfway), but the next raid leaves only after the return. */
export function raidRoundTripH(tribe: Tribe, distance: number, serverSpeed: number, mounted = true): number {
  return (2 * distance) / (heroMountedSpeed(tribe, mounted) * troopSpeedFactor(serverSpeed));
}

/** One raid hit: offense points vs a pack of `supply` points ⇒ supply killed + hero HP lost. */
export function raidHit(offense: number, supply: number, defPerSupply: number): { killed: number; hpLoss: number } {
  const D = supply * defPerSupply + 10; // +10 basic defense (negligible, kirilloid engine)
  const x = Math.pow(offense / D, 1.5);
  const killFrac = x / (1 + x);
  return { killed: Math.min(supply, Math.round(supply * killFrac)), hpLoss: 100 / (1 + x) };
}

/** Distance of the i-th NEAREST farmed oasis (0-based) when the MEAN distance over `count` oases
 *  is `meanDist`: oases spread area-uniformly around spawn ⇒ d_i ∝ √((i+1)/n), scaled so the mean
 *  matches (mean of √-profile = ⅔ max ⇒ factor 1.5). The hero clears nearest-first (less contested
 *  near home is also the live experience — Nitai); the trickle raiders use the plain mean. */
export function oasisDistance(i: number, count: number, meanDist: number): number {
  return Math.max(1, 1.5 * meanDist * Math.sqrt((i + 1) / Math.max(1, count)));
}
