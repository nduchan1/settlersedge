/** Core engine types. Pure TS — no React/DOM dependencies anywhere in src/engine. */

export type Tribe = 'romans' | 'gauls' | 'teutons' | 'egyptians' | 'huns' | 'spartans';

export type Resources = { wood: number; clay: number; iron: number; crop: number };

export type ServerSpeed = 1 | 2 | 3 | 5 | 10;

/** Server configuration — drives ALL math. Presets provided in data/servers.ts. */
export interface ServerConfig {
  speed: ServerSpeed;
  tribes: Tribe[];
  /** Advanced Start (local servers): fields lvl 5, 6 pre-trained settlers,
   *  CP for 2 immediate settles, v4 CP bar pre-filled 75% of the v3→v4 difference. */
  advancedStart: boolean;
  /** Assumption flag (research 08): task rewards presumed NOT speed-scaled. */
  taskRewardSpeedScaling: boolean;
}

/** Player-level modifiers that affect the simulation. */
export interface AccountModifiers {
  /** Alliance Recruitment bonus level. The mechanic is real & verified (−2%/level, KB art. 88,
   *  research/07) but no one buys alliance bonuses at server start (Nitai) — simulation assumes 0.
   *  Kept optional for verification tests against measured accounts. */
  allianceRecruitment?: number;
  /** Gold: +25% production bonus active per resource type. */
  goldProductionBonus: boolean;
  /** Gold Plus: +1 build queue waiting slot. */
  plus: boolean;
}

export interface BuildingLevelData {
  level: number;
  resourceCost: { r1: number; r2: number; r3: number; r4: number };
  /** Base build time in seconds at 1x speed, Main Building level 1. */
  buildingTime: number;
  culturePoints: number;
  population: number;
  supply: number;
  effects?: Record<string, number>;
}

export interface BuildingData {
  gid: number;
  maxLevel: number;
  category: string;
  prerequisites: unknown[];
  levelData: Record<string, BuildingLevelData>;
}
