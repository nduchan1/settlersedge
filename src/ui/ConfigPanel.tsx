import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select,
  Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography, keyframes,
} from '@mui/material';
import type { ServerSpeed, Tribe } from '../engine/types';
import { RECORD_OASIS_PLAN, oasisTricklePerHour } from '../engine/data/oases';
import { DEFAULT_PACK_SUPPLY } from '../engine/sim/oasisCombat';

export interface UiConfig {
  speed: ServerSpeed;
  tribe: Tribe;
  advancedStart: boolean;
  goldBonus: boolean;
  heroEnabled: boolean;
  heroTarget: 'all' | 'wood' | 'clay' | 'iron' | 'crop';
  tasks: boolean;
  /** Gold budget for the whole opening (NPC @3, instant finish @2 — optimizer decides the split). */
  goldBudget: number;
  /** NPC merchant: pooled-resource affordability once a Marketplace exists. */
  npc: boolean;
  /** BP oasis raiding, modeled on oasis REGENERATION (the real bottleneck — Nitai). */
  oasisCount: number;
  oasisContest: number;
  oasisFirstAtH: number;
  /** MEAN distance to the farmed oases (fields). The hero clears nearest-first — the i-th nearest of
   *  n sits at 1.5·mean·√(i/n) (nearest ≈ 0.47×mean at 10 oases, 0.29× at 26; farthest ≈ 1.5×mean);
   *  raider trickle uses the mean round trip. */
  oasisDistance: number;
  /** Hero does adventures (schedule & rewards are fully known — no knobs needed). */
  heroAdventures: boolean;
}

// ---- section defaults (per speed & tribe; today they don't vary, but the hook is here) ----
export const HERO_KEYS = ['goldBonus', 'heroEnabled', 'heroTarget', 'tasks', 'goldBudget', 'npc', 'heroAdventures'] as const;
export const OASIS_KEYS = ['oasisCount', 'oasisContest', 'oasisFirstAtH', 'oasisDistance'] as const;

export function heroDefaults(_speed: ServerSpeed, _tribe: Tribe): Pick<UiConfig, (typeof HERO_KEYS)[number]> {
  // heroEnabled=false is the RECORD default: points in strength → the hero can actually clear
  // oases (a production hero fights at base 100 and clears nothing). Auto Book-respec after clears.
  return { goldBonus: true, heroEnabled: false, heroTarget: 'all', tasks: true, goldBudget: 1000, npc: true, heroAdventures: true };
}
export function recordOasisDefaults(_speed: ServerSpeed, _tribe?: Tribe): Pick<UiConfig, (typeof OASIS_KEYS)[number]> {
  return { oasisCount: RECORD_OASIS_PLAN.oases, oasisContest: RECORD_OASIS_PLAN.contest, oasisFirstAtH: RECORD_OASIS_PLAN.firstClearH, oasisDistance: 3 };
}
export function defaultsFor(speed: ServerSpeed, tribe: Tribe): UiConfig {
  return { speed, tribe, advancedStart: false, ...heroDefaults(speed, tribe), ...recordOasisDefaults(speed, tribe) };
}
export const DEFAULT_CONFIG: UiConfig = defaultsFor(3, 'gauls');

const TRIBES: Tribe[] = ['romans', 'gauls', 'teutons', 'egyptians', 'huns', 'spartans'];
const SPEEDS: ServerSpeed[] = [1, 2, 3, 5, 10];

export type SearchMode = 'fast' | 'deep' | 'ultra';

/** Restore flash: brief highlight on fields whose value just snapped back to default. */
const flash = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(217,164,65,0.9); background: rgba(217,164,65,0.35); }
  100% { box-shadow: 0 0 0 8px rgba(217,164,65,0); background: transparent; }
`;
/** Changed-from-default tint. */
const DIRTY_BG = 'rgba(217,164,65,0.10)';

export function ConfigPanel({ value, onChange, onRun, busy, mode, onModeChange, progress }: {
  value: UiConfig;
  onChange: (c: UiConfig) => void;
  onRun: () => void;
  busy: boolean;
  mode: SearchMode;
  onModeChange: (m: SearchMode) => void;
  progress: { stage: string; depth: number; best: number | null; pct?: number } | null;
}) {
  const set = <K extends keyof UiConfig>(k: K, v: UiConfig[K]) => onChange({ ...value, [k]: v });
  const defaults = defaultsFor(value.speed, value.tribe);
  const isDirty = (k: keyof UiConfig) => value[k] !== defaults[k];

  // fields flashing after a restore
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const restore = (keys: readonly (keyof UiConfig)[]) => {
    const changed = keys.filter((k) => value[k] !== defaults[k]);
    if (!changed.length) return;
    onChange({ ...value, ...Object.fromEntries(changed.map((k) => [k, defaults[k]])) });
    setFlashing(new Set(changed));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashing(new Set()), 900);
  };
  /** sx for any field: dirty tint, or restore flash. */
  const mark = (k: keyof UiConfig) => ({
    borderRadius: 1,
    ...(flashing.has(k) ? { animation: `${flash} 0.9s ease-out` } : isDirty(k) ? { background: DIRTY_BG } : {}),
  });

  const SectionHeader = ({ title, keys }: { title: string; keys: readonly (keyof UiConfig)[] }) => {
    const anyDirty = keys.some(isDirty);
    return (
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title}</Typography>
        <Button size="small" variant="text" onClick={() => restore(keys)} disabled={!anyDirty}
          sx={{ textTransform: 'none', opacity: anyDirty ? 1 : 0.4 }}>
          ↺ Restore defaults
        </Button>
      </Stack>
    );
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" gutterBottom>Server & account</Typography>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <Stack direction="row" spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Speed</InputLabel>
            {/* changing speed must NOT silently clobber the user's oasis fields (audit 3.2) */}
            <Select label="Speed" value={value.speed} onChange={(e) => set('speed', e.target.value as ServerSpeed)}>
              {SPEEDS.map((s) => <MenuItem key={s} value={s}>x{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Tribe</InputLabel>
            <Select label="Tribe" value={value.tribe} onChange={(e) => set('tribe', e.target.value as Tribe)}>
              {TRIBES.map((t) => <MenuItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Box sx={mark('advancedStart')}>
          <FormControlLabel
            control={<Switch checked={value.advancedStart} onChange={(e) => set('advancedStart', e.target.checked)} />}
            label="Advanced Start (local servers): fields L5, 6 settlers, CP for villages 2+3 (+75% toward v4) — the race is village FOUR (3 new settlers)"
          />
        </Box>
        <Divider />
        <SectionHeader title="Hero & economy" keys={HERO_KEYS} />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={mark('heroEnabled')}>
            <FormControlLabel
              control={<Switch checked={value.heroEnabled} onChange={(e) => set('heroEnabled', e.target.checked)} />}
              label="Hero produces resources from the start (OFF = fighting strength: clears oases, then auto-respecs to production)"
            />
          </Box>
          <FormControl size="small" sx={{ minWidth: 110, ...mark('heroTarget') }}>
            <InputLabel>Focus</InputLabel>
            <Select label="Focus" value={value.heroTarget} onChange={(e) => set('heroTarget', e.target.value as UiConfig['heroTarget'])}>
              {(['all', 'wood', 'clay', 'iron', 'crop'] as const).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Box sx={mark('goldBonus')}>
          <FormControlLabel
            control={<Switch checked={value.goldBonus} onChange={(e) => set('goldBonus', e.target.checked)} />}
            label="Gold +25% production bonus"
          />
        </Box>
        <Box sx={mark('tasks')}>
          <FormControlLabel
            control={<Switch checked={value.tasks} onChange={(e) => set('tasks', e.target.checked)} />}
            label="Task rewards & daily quests (~150 tasks banked + daily chests: 50 XP day 1, +50 CP day 2)"
          />
        </Box>
        <Box sx={mark('heroAdventures')}>
          <FormControlLabel
            control={<Switch checked={value.heroAdventures} onChange={(e) => set('heroAdventures', e.target.checked)} />}
            label="Hero does adventures (official schedule: 3 at start, 3×speed/day early; first 10 predetermined)"
          />
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField size="small" type="number" label="Gold budget" value={value.goldBudget}
            onChange={(e) => set('goldBudget', Math.max(0, Number(e.target.value)))}
            slotProps={{ htmlInput: { min: 0, step: 50 } }} sx={{ width: 140, ...mark('goldBudget') }} />
          <Typography variant="caption" color="text.secondary">
            NPC (3g) + instant finish (2g) — the optimizer decides how to spend it
          </Typography>
        </Stack>
        <Box sx={mark('npc')}>
          <FormControlLabel
            control={<Switch checked={value.npc} onChange={(e) => set('npc', e.target.checked)} disabled={value.goldBudget < 3} />}
            label="NPC merchant"
          />
        </Box>
        <Divider />
        <SectionHeader title="Oasis raiding (during BP)" keys={OASIS_KEYS} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
          Income is bounded by how fast oases <b>regenerate</b> (typical ≈80 res/h per oasis (official per-type: 71/101/111) at x1,
          × server speed), shared with whoever else raids them — not by hero speed. Each oasis is also
          a one-time hero-bag clear (~{160 * DEFAULT_PACK_SUPPLY} res on average — 40/res per supply killed). Animals don't respawn during BP.
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField size="small" type="number" label="Oases farmed" value={value.oasisCount}
            onChange={(e) => set('oasisCount', Math.max(0, Math.min(30, Number(e.target.value))))}
            slotProps={{ htmlInput: { min: 0, max: 30 } }} fullWidth sx={mark('oasisCount')} />
          <TextField size="small" type="number" label="Contest (raiders/oasis)" value={value.oasisContest}
            onChange={(e) => set('oasisContest', Math.max(0, Number(e.target.value)))}
            slotProps={{ htmlInput: { min: 0, step: 0.1 } }} fullWidth sx={mark('oasisContest')} />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField size="small" type="number" label="First clear at (h)" value={value.oasisFirstAtH}
            onChange={(e) => set('oasisFirstAtH', Math.max(0, Number(e.target.value)))}
            slotProps={{ htmlInput: { min: 0, step: 0.5 } }} fullWidth sx={mark('oasisFirstAtH')} />
          <TextField size="small" type="number" label="Mean distance (fields)" value={value.oasisDistance}
            onChange={(e) => set('oasisDistance', Math.max(1, Number(e.target.value)))}
            slotProps={{ htmlInput: { min: 1, step: 1 } }} fullWidth sx={mark('oasisDistance')} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
          ⇒ regen available to farm ≈ <b>{oasisTricklePerHour({ oases: value.oasisCount, contest: value.oasisContest, firstClearH: value.oasisFirstAtH }, value.speed).toLocaleString()} res/h</b> on x{value.speed}
          {' '}— the CAP; trickle needs troops to carry it and flows only from CLEARED oases.
          {' '}Clears are simulated: hero strength vs animal packs, nearest oasis first, XP level-up heals.
        </Typography>
        <Divider />
        <Typography variant="h6">Search depth</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" value={mode} onChange={(_, m) => m && onModeChange(m)} disabled={busy}>
          <ToggleButton value="fast">Fast · ~5-10s</ToggleButton>
          <ToggleButton value="deep">Deep · ~15-25s</ToggleButton>
          <ToggleButton value="ultra">Ultra · ~40-60s</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
          Every mode scores the strategy grid, then edits whole plans (the best strategy and the
          alliance guide as starting points) — every order can move, go or be added. More time =
          more edits tried. Never worse than the best strategy.
        </Typography>
        <Button variant="contained" size="large" onClick={onRun} disabled={busy}>
          {busy
            ? progress
              ? `${progress.stage === 'polish' ? `Polishing the full plan… ${progress.pct ?? 0}%` : progress.stage === 'grid' ? 'Scoring strategies…' : `Searching… depth ${progress.depth}`}${progress.best ? ` · best ${(progress.best / 3600).toFixed(1)}h` : ''}`
              : 'Optimizing…'
            : 'Find fastest settle'}
        </Button>
      </Stack>
    </Paper>
  );
}
