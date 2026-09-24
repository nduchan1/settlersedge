/** Typed access to the official Travian building dataset
 *  (extracted from the official knowledge-base app bundle — research/01, data provenance in research/00). */
import type { BuildingData, BuildingLevelData } from '../types';
import raw from './official/kb-buildings.json';
import names from './official/kb-names.json';

export const buildings: readonly BuildingData[] = raw as unknown as BuildingData[];

const byGid = new Map<number, BuildingData>(buildings.map((b) => [b.gid, b]));

export const GID = {
  woodcutter: 1, clayPit: 2, ironMine: 3, cropland: 4,
  sawmill: 5, brickyard: 6, ironFoundry: 7, grainMill: 8, bakery: 9,
  warehouse: 10, granary: 11, mainBuilding: 15, rallyPoint: 16, marketplace: 17, embassy: 18,
  barracks: 19, stable: 20, smithy: 13, academy: 22, cranny: 23, townHall: 24, residence: 25, palace: 26,
  heroMansion: 37, commandCenter: 44, waterworks: 45,
  cityWall: 31, earthWall: 32, palisade: 33, stoneWall: 42, makeshiftWall: 43, defensiveWall: 47,
} as const;

/** The tribe's wall building (official gids; each tribe has exactly one wall type). */
export function wallGid(tribe: string): number {
  switch (tribe) {
    case 'romans': return 31;
    case 'teutons': return 32;
    case 'gauls': return 33;
    case 'egyptians': return 42;
    case 'huns': return 43;
    default: return 47; // spartans — Defensive Wall
  }
}

/** Effective max level for the SETTLE-RACE action space = the building's own max. (Crannies used
 *  to be capped at L3 as a search shortcut; the official multi-build rule — a second cranny needs
 *  one at L10 — makes L10 a real, searchable investment, so the cap is gone.) */
export function raceMaxLevel(gid: number): number {
  return building(gid).maxLevel;
}

export function building(gid: number): BuildingData {
  const b = byGid.get(gid);
  if (!b) throw new Error(`Unknown building gid ${gid}`);
  return b;
}

export function levelData(gid: number, level: number): BuildingLevelData {
  const ld = building(gid).levelData[String(level)];
  if (!ld) throw new Error(`Building gid ${gid} has no level ${level}`);
  return ld;
}

/** Field production per hour at 1x (official effects: production1..4 by resource gid). */
export function fieldProduction(gid: number, level: number): number {
  if (level === 0) return 3; // DISPUTED 3 vs 6 (research/02 §OQ3) — flagged constant
  return levelData(gid, level).effects?.[`production${gid}`] ?? 0;
}

/** Warehouse (wood/clay/iron) or Granary (crop) capacity at a level; Great variants ×3. */
export function storageCapacity(gid: number, level: number): number {
  if (level === 0) return 0;
  const e = levelData(gid, level).effects ?? {};
  return e.storageWarehouse ?? e.storageGranary ?? 0;
}

export function buildingName(gid: number): string {
  return ((names as Record<string, string>)[String(gid)] ?? `gid${gid}`).replace('&#39;', "'");
}
