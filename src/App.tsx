import { useEffect, useRef, useState } from 'react';
import { AppBar, Box, Container, Grid, Toolbar, Typography } from '@mui/material';
import { ConfigPanel, DEFAULT_CONFIG, type UiConfig } from './ui/ConfigPanel';
import { ResultsView } from './ui/ResultsView';
import type { PlanOutcome } from './engine/optimizer/planner';
import type { SimContext } from './engine/sim/simulate';
import type { WorkerMessage, WorkerRequest } from './optimizer.worker';
import { oasisTricklePerHour } from './engine/data/oases';

export type SearchMode = WorkerRequest['mode'];

function toCtx(c: UiConfig): SimContext {
  return {
    config: {
      speed: c.speed,
      tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns', 'spartans'],
      advancedStart: c.advancedStart,
      taskRewardSpeedScaling: false, // refuted in-game (research/07 session 2)
    },
    tribe: c.tribe,
    mods: { goldProductionBonus: c.goldBonus, plus: true }, // record chasers run Plus (Nitai) — queue depth + click batching assume it
    // strength hero (production off) respecs to resources with the Book of Wisdom once the oasis
    // clears are done (record meta) — respec hour = last clear
    hero: {
      enabled: c.heroEnabled, target: c.heroTarget,
      // strength hero auto-respecs to resources (Book of Wisdom) when the last oasis is cleared
    },
    tasks: c.tasks,
    gold: c.goldBudget > 0
      ? { budget: c.goldBudget, npc: c.npc, instantFinishMin: Infinity } // optimizer searches the finish policy
      : undefined,
    // oasis income derived from the official regen table × speed (bottleneck = regen, not hero speed)
    oasisRaids: c.oasisCount > 0
      ? {
          count: c.oasisCount, firstAtH: c.oasisFirstAtH, distance: c.oasisDistance,
          tricklePerHour: oasisTricklePerHour({ oases: c.oasisCount, contest: c.oasisContest, firstClearH: c.oasisFirstAtH }, c.speed),
        }
      : undefined,
    adventures: c.heroAdventures || undefined,
  };
}

function configFromHash(): UiConfig | null {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    // only accept KNOWN keys — stale hashes from old app versions must not leak unknown fields
    const raw = JSON.parse(atob(h)) as Record<string, unknown>;
    const known = Object.fromEntries(Object.entries(raw).filter(([k]) => k in DEFAULT_CONFIG));
    return { ...DEFAULT_CONFIG, ...known };
  } catch {
    return null;
  }
}

export default function App() {
  const [config, setConfig] = useState<UiConfig>(() => configFromHash() ?? DEFAULT_CONFIG);
  const [outcomes, setOutcomes] = useState<PlanOutcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<SearchMode>('deep');
  const [progress, setProgress] = useState<{ depth: number; best: number | null } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const getWorker = (): Worker => {
    if (!workerRef.current) {
      const w = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'progress') { setProgress({ depth: e.data.depth, best: e.data.best }); return; }
        setOutcomes(e.data.outcomes);
        setBusy(false);
        setProgress(null);
      };
      // a thrown exception must never leave the button stuck on "Optimizing…" forever
      w.onerror = (err) => {
        console.error('optimizer worker failed:', err.message);
        setBusy(false);
        setProgress(null);
        workerRef.current = null; // rebuild the worker on the next run
      };
      workerRef.current = w;
    }
    return workerRef.current;
  };

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  // shareable URL: config lives in the hash; the plan is deterministic from it
  useEffect(() => {
    window.history.replaceState(null, '', '#' + btoa(JSON.stringify(config)));
  }, [config]);

  const run = () => {
    setBusy(true);
    setProgress(null);
    getWorker().postMessage({ ctx: toCtx(config), mode } satisfies WorkerRequest);
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #3a2f24' }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 700 }}>
            ⚔ Settler's Edge
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Travian: Legends second-village optimizer · all tribes · x1–x10 · Advanced Start
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ py: 2, px: { xs: 1.5, md: 2 } }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <ConfigPanel value={config} onChange={setConfig} onRun={run} busy={busy}
              mode={mode} onModeChange={setMode} progress={progress} />
          </Grid>
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <ResultsView outcomes={outcomes} speed={config.speed} advancedStart={config.advancedStart} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
