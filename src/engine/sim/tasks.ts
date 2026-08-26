/** Task-reward engine. Data: research/08 extraction (202 tasks, base values).
 *  Reward = floor(base × (1 + 0.02·(heroLevel−1))) per resource AND for XP — recovered formula,
 *  reproduces all 202 sheet rows. Speed scaling: assumed NONE (flagged assumption, research/08). */
import raw from '../data/official/tasks.json';
import { taskReward } from '../formulas';

export interface TaskDef {
  category: string;
  name: string;
  res: [number, number, number, number];
  xp: number;
  key: string;
}

const data = raw as { start: TaskDef[]; every: TaskDef[]; general: TaskDef[] };

/** Tasks active for the spawn village in a single-village sim: start-village + account-wide lists. */
export const activeTasks: TaskDef[] = [...data.start, ...data.general];
export const everyVillageTasks: TaskDef[] = data.every;

export interface TaskWorldView {
  /** highest level among slots with this gid (0 if none) */
  maxLevel(gid: number): number;
  /** lowest level among slots with this gid; Infinity if none exist */
  minLevel(gid: number): number;
  countAtLeast(gid: number, level: number): number;
  population(): number;
  cpPerDay(): number;
  celebrationsHeld(): number;
}

const num = (s: string): number => Number(/\d+/.exec(s)?.[0] ?? NaN);

type Trigger =
  | { type: 'one' | 'all' | 'max'; gid: number; lvl: number; gids?: number[] }
  | { type: 'orf' | 'arf'; lvl: number }
  | { type: 'pop' | 'cpd'; n: number }
  | { type: 'celebration' }
  | { type: 'never' };

/** Combined-requirement task keys ("Residence OR Palace OR CC", "any wall") concatenate their gids
 *  — parsed as one bogus gid they silently NEVER fire (audit 2026-08-21: 450 XP + 27k res dead). */
const GID_ALIASES: Record<string, number[]> = {
  '252644': [25, 26, 44],                 // Residence / Palace / Command Center
  '3132334243': [31, 32, 33, 42, 43, 47], // all wall types (incl. Spartan 47, absent from the key)
};

function parseTrigger(t: TaskDef): Trigger {
  const m = /^TASK_GID(\d+)_(One|All)?(\d+)$/.exec(t.key);
  if (m) {
    const type = m[2] === 'One' ? 'one' as const : m[2] === 'All' ? 'all' as const : 'max' as const;
    const alias = GID_ALIASES[m[1]];
    if (alias) return { type, gid: alias[0], gids: alias, lvl: +m[3] };
    return { type, gid: +m[1], lvl: +m[3] };
  }
  if (t.key.startsWith('TASK_ORF_')) return { type: 'orf', lvl: num(t.key) };
  if (t.key.startsWith('TASK_ARF_')) return { type: 'arf', lvl: num(t.key) };
  if (t.key.startsWith('TASK_VPOP_') || t.key.startsWith('TASK_APOP_')) return { type: 'pop', n: num(t.name) };
  if (t.key.startsWith('TASK_VCP_') || t.key.startsWith('TASK_ACP_')) return { type: 'cpd', n: num(t.name) };
  if (t.key === 'TASK_Celebration') return { type: 'celebration' };
  return { type: 'never' }; // troops/adventures/etc. — not modeled in v1
}

/** Precompiled triggers — parsed once; the trigger check runs hot inside search. */
const triggers = new Map<TaskDef, Trigger>(activeTasks.map((t) => [t, parseTrigger(t)]));
/** Public view of the precompiled task triggers — used by the planner for task arbitrage. */
export const taskTriggers: ReadonlyMap<TaskDef, Trigger> = triggers;
export type { Trigger };

/** Tasks indexed by what can trigger them, so events only recheck the affected subset:
 *  building completions → byGid[gid] + meta (pop/CP-rate change with levels);
 *  celebrations → celebration; income events (adventures/oasis) trigger NOTHING. */
export const taskIndex = (() => {
  const byGid = new Map<number, TaskDef[]>();
  const meta: TaskDef[] = [];
  const celebration: TaskDef[] = [];
  for (const t of activeTasks) {
    const tr = triggers.get(t)!;
    if (tr.type === 'one' || tr.type === 'all' || tr.type === 'max') {
      for (const g of tr.gids ?? [tr.gid]) {
        const arr = byGid.get(g) ?? [];
        arr.push(t);
        byGid.set(g, arr);
      }
    } else if (tr.type === 'orf' || tr.type === 'arf') {
      for (const g of [1, 2, 3, 4]) {
        const arr = byGid.get(g) ?? [];
        arr.push(t);
        byGid.set(g, arr);
      }
    } else if (tr.type === 'pop' || tr.type === 'cpd') meta.push(t);
    else if (tr.type === 'celebration') celebration.push(t);
  }
  return { byGid, meta, celebration };
})();

export function taskTriggered(t: TaskDef, w: TaskWorldView): boolean {
  const tr = triggers.get(t) ?? parseTrigger(t);
  switch (tr.type) {
    case 'one': case 'max': {
      const gids = tr.gids ?? [tr.gid];
      return gids.some((g) => w.maxLevel(g) >= tr.lvl);
    }
    case 'all': { const m = w.minLevel(tr.gid); return m !== Infinity && m >= tr.lvl; }
    case 'orf': return [1, 2, 3, 4].every((g) => w.maxLevel(g) >= tr.lvl);
    case 'arf': return [1, 2, 3, 4].every((g) => w.minLevel(g) >= tr.lvl);
    case 'pop': return w.population() >= tr.n;
    case 'cpd': return w.cpPerDay() >= tr.n;
    case 'celebration': return w.celebrationsHeld() >= 1;
    default: return false;
  }
}

export interface FiredTask { key: string; name: string; resBase: number; xp: number }

/** Evaluate all not-yet-fired tasks. Resource rewards are returned as BASE values (all four
 *  resources are always equal) — the hero-level bonus applies at COLLECTION time, so banking
 *  rewards and drawing them later at a higher hero level pays more (community meta, research/09).
 *  XP is granted at trigger time (approximation of eager XP-task collection). */
export function collectTriggered(fired: Set<string>, w: TaskWorldView, heroLevelNow: () => number, subset?: TaskDef[]): FiredTask[] {
  const out: FiredTask[] = [];
  for (const t of subset ?? activeTasks) {
    if (fired.has(t.key + t.name)) continue;
    if (taskTriggered(t, w)) {
      fired.add(t.key + t.name);
      out.push({ key: t.key, name: t.name, resBase: t.res[0], xp: taskReward(t.xp, heroLevelNow()) });
    }
  }
  return out;
}
