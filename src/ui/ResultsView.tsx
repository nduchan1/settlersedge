import { useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Chip, ListItemText, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { PlanOutcome } from '../engine/optimizer/planner';
import type { SimEvent } from '../engine/sim/simulate';
import { cpThreshold } from '../engine/data/culture';
import { buildingName } from '../engine/data/buildings';
import type { Resources, ServerSpeed } from '../engine/types';
import { fmtDuration } from './format';

/** Row presentation per event type: label, icon, chip color. */
const ROW: Record<string, { label: string; icon: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' }> = {
  start: { label: 'build', icon: '🔨', color: 'default' },
  finish: { label: 'finish now', icon: '⚡', color: 'warning' },
  task: { label: 'task', icon: '📜', color: 'secondary' },
  collect: { label: 'collect', icon: '🎁', color: 'secondary' },
  npc: { label: 'NPC', icon: '💰', color: 'warning' },
  adventure: { label: 'adventure', icon: '🐎', color: 'info' },
  oasis: { label: 'oasis raid', icon: '🐗', color: 'info' },
  celebration: { label: 'party', icon: '🎉', color: 'success' },
  settlers: { label: 'settler', icon: '🏕', color: 'success' },
  raiders: { label: 'raiders', icon: '⚔', color: 'info' },
  complete: { label: 'done', icon: '✓', color: 'primary' },
};
const RES_KEYS: (keyof Resources)[] = ['wood', 'clay', 'iron', 'crop'];

/** Filterable event categories — field upgrades are split out from buildings (Nitai). */
const CATEGORIES = [
  { key: 'field', label: '🌾 field upgrade' },
  { key: 'build', label: '🔨 building' },
  { key: 'finish', label: '⚡ finish now' },
  { key: 'task', label: '📜 task' },
  { key: 'collect', label: '🎁 collect' },
  { key: 'npc', label: '💰 NPC' },
  { key: 'adventure', label: '🐎 adventure' },
  { key: 'oasis', label: '🐗 oasis raid' },
  { key: 'respec', label: '📖 respec' },
  { key: 'celebration', label: '🎉 party' },
  { key: 'settlers', label: '🏕 settler' },
  { key: 'raiders', label: '⚔ troops' },
] as const;
const catOf = (e: SimEvent): string =>
  e.label.startsWith('Book of Wisdom') ? 'respec'
  : e.type === 'start'
    ? (e.label === 'train settler' ? 'settlers'
      : e.label.startsWith('train ') || e.label.startsWith('research ') ? 'raiders'
      : e.gid !== undefined && e.gid <= 4 ? 'field' : 'build')
  : e.type === 'settlers' ? 'settlers'
  : e.type;

/** Compact resource situation: three rows (store / hero bag / unclaimed), four columns (w c i cr).
 *  Store cells go amber when within 5% of the cap (about to waste production). */
function Situation({ snap }: { snap: NonNullable<SimEvent['snap']> }) {
  const cell = (n: number, hot = false) => (
    <Box component="span" sx={{ display: 'inline-block', width: 44, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: hot ? '#d9a441' : 'inherit' }}>
      {Math.round(n).toLocaleString()}
    </Box>
  );
  const capOf = (k: keyof Resources) => (k === 'crop' ? snap.caps.granary : snap.caps.warehouse);
  return (
    <Box sx={{ lineHeight: 1.15, whiteSpace: 'nowrap' }}>
      <div>🏚 {RES_KEYS.map((k) => <span key={k}>{cell(snap.store[k], snap.store[k] >= capOf(k) * 0.95)}</span>)}</div>
      <div style={{ opacity: 0.85 }}>🎒 {RES_KEYS.map((k) => <span key={k}>{cell(snap.bag[k])}</span>)}</div>
      <div style={{ opacity: 0.7 }}>📜 {cell(snap.unclaimed)}<Box component="span" sx={{ fontSize: 10, color: 'text.disabled', ml: 0.5 }}>each</Box></div>
    </Box>
  );
}

/** CP block: current / threshold, rate per day, and this row's rate change (green when it grew). */
function CpCell({ snap, thr }: { snap: NonNullable<SimEvent['snap']>; thr: number }) {
  const dRate = snap.cpRateDelta;
  const pct = Math.min(100, (snap.cp / thr) * 100);
  return (
    <Box sx={{ lineHeight: 1.15, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
      <div><Box component="span" sx={{ color: '#d9a441' }}>{Math.round(snap.cp).toLocaleString()}</Box> / {thr.toLocaleString()}</div>
      <Box sx={{ height: 3, bgcolor: '#3a2f24', borderRadius: 1, my: 0.25 }}>
        <Box sx={{ height: 3, width: `${pct}%`, bgcolor: '#d9a441', borderRadius: 1 }} />
      </Box>
      <div style={{ opacity: 0.85 }}>
        {snap.cpPerDay.toFixed(0)}/day
        {Math.abs(dRate) >= 0.5 && (
          <Box component="span" sx={{ color: dRate > 0 ? '#7fb069' : '#d98b5f', ml: 0.5 }}>{dRate > 0 ? '+' : ''}{dRate.toFixed(0)}</Box>
        )}
      </div>
    </Box>
  );
}

/** Present Finish-Now the way a player experiences it: place the orders, then ONE click that
 *  completes everything queued. The engine logs a 'finish' per building (paid or "same click");
 *  here each click becomes a single row AFTER the last order it completes, naming all of them. */
function collapseFinishClicks(events: SimEvent[]): SimEvent[] {
  // group per-building finish events by click id; emit ONE row per click, placed right after the
  // LAST building that click completed (the player places all those orders, then clicks once)
  const lastIndexOfClick = new Map<number, number>();
  const clickNames = new Map<number, string[]>();
  const clickDelta = new Map<number, number>(); // the click is where the CP rate actually changes
  events.forEach((e, i) => {
    if (e.type !== 'finish' || e.click === undefined) return;
    lastIndexOfClick.set(e.click, i);
    const arr = clickNames.get(e.click) ?? [];
    arr.push(e.level !== undefined ? `${safeBuildingName(e)} L${e.level}` : safeBuildingName(e)); // research rows carry no level
    clickNames.set(e.click, arr);
    clickDelta.set(e.click, (clickDelta.get(e.click) ?? 0) + (e.snap?.cpRateDelta ?? 0));
  });
  // Tasks (and their claims) triggered by a building inside a click are logged before the click
  // row would appear; in reality the reward only exists AFTER the click. Hold them while the click
  // is open and emit them right after the click row (Nitai).
  const out: SimEvent[] = [];
  let openClick: number | null = null;
  let held: SimEvent[] = [];
  events.forEach((e, i) => {
    if (e.type === 'finish') {
      if (e.click === undefined) return;
      openClick = e.click;
      if (lastIndexOfClick.get(e.click) === i) {
        out.push({
          time: e.time, type: 'finish', label: clickNames.get(e.click)!.join(' + '), gold: 2,
          snap: e.snap && { ...e.snap, cpRateDelta: clickDelta.get(e.click) ?? 0 },
        });
        out.push(...held);
        held = [];
        openClick = null;
      }
      return;
    }
    if (openClick !== null && (e.type === 'task' || e.type === 'collect')) { held.push(e); return; }
    if (openClick !== null && e.type !== 'start') { // anything else closes the click (e.g. an npc row)
      out.push(...held); held = []; openClick = null;
    }
    out.push(e);
  });
  out.push(...held);
  return out;
}
const RES_COLORS: Record<keyof Resources, string> = { wood: '#8fbf6b', clay: '#d98b5f', iron: '#9fb4c7', crop: '#e6c85c' };
const safeBuildingName = (e: SimEvent): string => (e.gid !== undefined ? buildingName(e.gid) : e.label.replace(/^Finish Now(?: \(same click\))?:?\s*/, ''));
const fmtRes = (n: number) => Math.round(n).toLocaleString();

export function ResultsView({ outcomes, speed, advancedStart }: { outcomes: PlanOutcome[]; speed: ServerSpeed; advancedStart: boolean }) {
  const [view, setView] = useState<'timeline' | 'chart' | 'economy' | 'strategies'>('timeline');
  const [evtFilter, setEvtFilter] = useState<string[]>(CATEGORIES.map((c) => c.key));
  const best = outcomes[0];
  // Advanced Start races village FOUR (CP for v2+v3 mostly pre-granted) — match the engine's goal
  const village = advancedStart ? 4 : 2;
  const thr = cpThreshold(village, speed);

  const chartData = useMemo(() => {
    if (!best) return [];
    const pts = best.result.series;
    const step = Math.max(1, Math.floor(pts.length / 400));
    const data = pts.filter((_, i) => i % step === 0).map((p) => ({ h: +(p.t / 3600).toFixed(2), cp: Math.round(p.cp) }));
    // extend the line through the post-build CP wait to the settle moment
    if (best.settleTime && data.length && best.settleTime / 3600 > data[data.length - 1].h) {
      data.push({ h: +(best.settleTime / 3600).toFixed(2), cp: thr });
    }
    return data;
  }, [best, thr]);

  const econData = useMemo(() => {
    if (!best?.settleTime) return [];
    const settleH = best.settleTime / 3600;
    const pts = best.result.series.filter((pt) => pt.econ && pt.t <= best.settleTime! + 600);
    const step = Math.max(1, Math.floor(pts.length / 500));
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((pt) => {
      const e = pt.econ!;
      const income = e.cum.fields + e.cum.hero + e.cum.trickle + e.cum.tasks + e.cum.oasis + e.cum.adventures;
      return {
        h: +(pt.t / 3600).toFixed(2),
        fields: Math.round(e.cum.fields), hero: Math.round(e.cum.hero), trickle: Math.round(e.cum.trickle),
        tasks: Math.round(e.cum.tasks), oasis: Math.round(e.cum.oasis), adventures: Math.round(e.cum.adventures),
        income: Math.round(income), spend: Math.round(e.cum.spend),
        rFields: Math.round(e.rates.fields), rHero: Math.round(e.rates.hero),
        rTrickle: Math.round(e.rates.trickle), rUpkeep: -Math.round(e.rates.upkeep),
        settleH,
      };
    });
  }, [best]);

  if (!best?.settleTime) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Configure your server and press <b>Find fastest settle</b> — the optimizer simulates dozens of
          strategies against the full game model and returns the fastest plan it finds.
        </Typography>
      </Paper>
    );
  }

  // the build order proper: orders (with costs), finishes, income & milestones — completions are
  // noise for a player following the plan; nothing after the settle moment matters (Nitai)
  const settleT = best.settleTime;
  const orders = collapseFinishClicks(
    best.result.events
      .filter((e) => e.type !== 'complete' && e.time <= settleT + 1)
      .sort((a, b) => a.time - b.time),
  );
  const shown = new Set(evtFilter);
  const visible = orders.filter((e) => shown.has(catOf(e)));
  const totals: Resources = { wood: 0, clay: 0, iron: 0, crop: 0 };
  let goldTotal = 0;
  for (const e of orders) {
    if (e.cost) for (const k of RES_KEYS) totals[k] += e.cost[k];
    if (e.gold) goldTotal += e.gold;
  }

  // ---- exports (filter-aware: what you see is what you export) ----
  const actionOf = (e: SimEvent): string =>
    (e.type === 'finish' ? `Finish Now → ${e.label}` : e.gid ? `${buildingName(e.gid)} ${e.label}` : e.label)
    + (e.cp !== undefined ? ` (+${Math.round(e.cp)} CP)` : '');
  const exportRows = (): (string | number)[][] => {
    const rows: (string | number)[][] = visible.map((e) => [
      fmtDuration(e.time), +(e.time / 3600).toFixed(2), catOf(e), actionOf(e),
      ...RES_KEYS.map((k) => (e.cost ? Math.round(e.cost[k]) : e.gain ? `+${Math.round(e.gain[k])}` : '')),
      e.gold ?? '',
      e.snap ? Math.round(e.snap.cp) : '', e.snap ? Math.round(e.snap.cpPerDay) : '',
    ]);
    rows.push([fmtDuration(settleT), +(settleT / 3600).toFixed(2), 'settle',
      'All conditions met — send settlers! (new village spawns with 750 of each)', '', '', '', '', '', thr, '']);
    rows.push(['', '', 'total', `Total spent (${orders.filter((e) => e.cost).length} paid actions)`,
      ...RES_KEYS.map((k) => Math.round(totals[k])), goldTotal, '', '']);
    return rows;
  };
  const EXPORT_HEAD = ['Time', 'Hours', 'Type', 'Action', 'Wood', 'Clay', 'Iron', 'Crop', 'Gold', 'CP after', 'CP/day'];
  const exportCsv = (): void => {
    const cell = (v: string | number): string => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [EXPORT_HEAD, ...exportRows()].map((r) => r.map(cell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM: Excel opens UTF-8 correctly
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `settlers-edge-plan-${fmtDuration(settleT).replace(/[: ]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportPdf = (): void => {
    // dependency-free PDF: a clean print window — the browser's "Save as PDF" does the rest
    const esc = (v: string | number): string => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank');
    if (!w) return; // popup blocked
    const body = exportRows().map((r) =>
      `<tr>${r.map((v, i) => `<td class="${i >= 4 && i <= 8 ? 'num' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Settler's Edge plan — ${esc(fmtDuration(settleT))}</title>
<style>
  body { font: 11px/1.4 system-ui, sans-serif; color: #222; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; } .sub { color: #666; margin: 0 0 14px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 3px 6px; text-align: left; }
  th { background: #f2ede3; } .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr:nth-child(even) td { background: #faf8f4; }
  .foot { color: #666; margin-top: 12px; font-size: 10px; }
  @media print { body { margin: 8mm; } }
</style></head><body>
<h1>⚔ Settler's Edge — settle plan</h1>
<p class="sub">Settle at <b>${esc(fmtDuration(settleT))}</b> · village #${village} · CP needed ${thr} · ${best.result.state.goldSpent} gold (${best.result.state.npcExchanges}× NPC, ${best.result.state.instantFinishes}× Finish Now)</p>
<table><thead><tr>${EXPORT_HEAD.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
<p class="foot">Generated by Settler's Edge (settlersedge.vercel.app) — costs are per action; "+" rows are income; CP shown after each action.</p>
<scr${''}ipt>window.onload = () => window.print()</scr${''}ipt>
</body></html>`);
    w.document.close();
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="h4" color="primary">{fmtDuration(best.settleTime)}</Typography>
          <Typography color="text.secondary">to village #{village} · CP needed: {thr}</Typography>
          {(best.params as { organic?: boolean }).organic ? (
            <>
              <Chip size="small" color="success" label="✦ organic search plan" />
              {(best.params as { opening?: string }).opening && (
                <Typography variant="caption" color="text.secondary">opening: {(best.params as { opening?: string }).opening}</Typography>
              )}
            </>
          ) : (
            <>
              <Chip size="small" label={`fields → L${best.params.fieldTarget}`} />
              <Chip size="small" label={best.params.townHall ? 'Town Hall + parties' : 'no parties'} />
              <Chip size="small" label={best.params.cpEarly ? `early embassy → L${best.params.cpEarly}` : 'no early CP'} />
            </>
          )}
          {best.result.state.goldSpent > 0 && (
            <Chip size="small" color="primary" variant="outlined"
              label={`${best.result.state.goldSpent} gold · ${best.result.state.npcExchanges}× NPC · ${best.result.state.instantFinishes}× ⚡`} />
          )}
          {/* the organic plan's tail re-rank may have won under a different gold policy than the
              greedy params it borrows — showing the greedy finishMin would be a lie */}
          {!(best.params as { organic?: boolean }).organic && Number.isFinite(best.params.finishMin) && (
            <Chip size="small" label={`instant-finish ≥ ${best.params.finishMin}min`} />
          )}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="timeline">Build order</ToggleButton>
          <ToggleButton value="chart">Culture points</ToggleButton>
          <ToggleButton value="economy">Economy</ToggleButton>
          <ToggleButton value="strategies">Strategies</ToggleButton>
        </ToggleButtonGroup>
        {view === 'timeline' && (
          <Select
            multiple size="small" value={evtFilter}
            onChange={(e) => setEvtFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            renderValue={(sel) => (sel.length === CATEGORIES.length ? 'All events' : `${sel.length} of ${CATEGORIES.length} event types`)}
            sx={{ minWidth: 190 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 420 } } } }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.key} value={c.key} dense>
                <Checkbox size="small" checked={evtFilter.includes(c.key)} sx={{ py: 0 }} />
                <ListItemText primary={c.label} />
              </MenuItem>
            ))}
          </Select>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={exportCsv}>⬇ CSV</Button>
          <Button size="small" variant="outlined" onClick={exportPdf}>⬇ PDF</Button>
        </Box>
      </Stack>

      {view === 'chart' && (
        <Paper sx={{ p: 2, height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a2f24" />
              <XAxis dataKey="h" type="number" unit="h" domain={[0, 'dataMax']} tickFormatter={(v: number) => String(Math.round(v))} stroke="#9c8a6e" />
              <YAxis stroke="#9c8a6e" />
              <Tooltip contentStyle={{ background: '#211b15', border: '1px solid #3a2f24' }} />
              <ReferenceLine y={thr} stroke="#d9a441" strokeDasharray="6 3" label={{ value: `CP for village ${village} (${thr})`, fill: '#d9a441' }} />
              <ReferenceLine x={+(best.settleTime / 3600).toFixed(1)} stroke="#7fb069" strokeDasharray="6 3" label={{ value: 'settle', fill: '#7fb069' }} />
              <Line type="monotone" dataKey="cp" stroke="#d9a441" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {view === 'economy' && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Cumulative economy (total resources) — income by source vs spending
            </Typography>
            <ResponsiveContainer height={300}>
              <ComposedChart data={econData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2f24" />
                <XAxis dataKey="h" type="number" unit="h" domain={[0, 'dataMax']} tickFormatter={(v: number) => String(Math.round(v))} stroke="#9c8a6e" />
                <YAxis stroke="#9c8a6e" tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip contentStyle={{ background: '#211b15', border: '1px solid #3a2f24' }} formatter={(v) => (typeof v === "number" ? v.toLocaleString() : String(v))} />
                <Legend />
                <Area stackId="inc" dataKey="fields" name="fields" fill="#7fb069" stroke="#7fb069" fillOpacity={0.5} />
                <Area stackId="inc" dataKey="hero" name="hero prod" fill="#b085c9" stroke="#b085c9" fillOpacity={0.5} />
                <Area stackId="inc" dataKey="trickle" name="oasis trickle" fill="#5fb3a1" stroke="#5fb3a1" fillOpacity={0.5} />
                <Area stackId="inc" dataKey="oasis" name="oasis bounty" fill="#d97b4f" stroke="#d97b4f" fillOpacity={0.5} />
                <Area stackId="inc" dataKey="tasks" name="tasks" fill="#6f9fd9" stroke="#6f9fd9" fillOpacity={0.5} />
                <Area stackId="inc" dataKey="adventures" name="adventures" fill="#c9b06a" stroke="#c9b06a" fillOpacity={0.5} />
                <Line dataKey="income" name="total income" stroke="#e8dcc8" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                <Line dataKey="spend" name="total spent" stroke="#e05c5c" dot={false} strokeWidth={2} />
                <ReferenceLine x={+(best.settleTime / 3600).toFixed(1)} stroke="#7fb069" strokeDasharray="6 3" label={{ value: 'settle', fill: '#7fb069' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Production rates (res/hour, all resources combined) — crop upkeep shown negative
            </Typography>
            <ResponsiveContainer height={260}>
              <LineChart data={econData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2f24" />
                <XAxis dataKey="h" type="number" unit="h" domain={[0, 'dataMax']} tickFormatter={(v: number) => String(Math.round(v))} stroke="#9c8a6e" />
                <YAxis stroke="#9c8a6e" tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip contentStyle={{ background: '#211b15', border: '1px solid #3a2f24' }} formatter={(v) => (typeof v === "number" ? v.toLocaleString() : String(v))} />
                <Legend />
                <Line type="stepAfter" dataKey="rFields" name="fields/h" stroke="#7fb069" dot={false} strokeWidth={2} />
                <Line type="stepAfter" dataKey="rHero" name="hero/h" stroke="#b085c9" dot={false} strokeWidth={2} />
                <Line type="stepAfter" dataKey="rTrickle" name="trickle/h" stroke="#5fb3a1" dot={false} strokeWidth={2} />
                <Line type="stepAfter" dataKey="rUpkeep" name="upkeep (crop)/h" stroke="#e05c5c" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                <ReferenceLine y={0} stroke="#3a2f24" />
                <ReferenceLine x={+(best.settleTime / 3600).toFixed(1)} stroke="#7fb069" strokeDasharray="6 3" label={{ value: 'settle', fill: '#7fb069' }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Stack>
      )}

      {view === 'timeline' && (
        <Paper sx={{ p: 1, maxHeight: 560, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1090, '& td, & th': { px: 0.75 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 100 }}>Time</TableCell>
                <TableCell sx={{ width: 118 }}>Type</TableCell>
                <TableCell>Action</TableCell>
                {RES_KEYS.map((k) => (
                  <TableCell key={k} align="right" sx={{ width: 72, color: RES_COLORS[k] }}>{k}</TableCell>
                ))}
                <TableCell align="right" sx={{ width: 56, color: '#d9a441' }}>gold</TableCell>
                <TableCell sx={{ width: 190, borderLeft: '1px solid #3a2f24' }}>
                  situation after
                  <Typography variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                    🏚 store · 🎒 hero bag · 📜 unclaimed
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: 110, borderLeft: '1px solid #3a2f24' }}>
                  culture
                  <Typography variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                    CP / need · rate Δ
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((e, i) => {
                const cat = catOf(e);
                const row = cat === 'respec' ? { label: 'respec', icon: '📖', color: 'success' as const }
                  : cat === 'field' ? { label: 'field', icon: '🌾', color: 'success' as const }
                  : (ROW[e.type] ?? ROW.start);
                const isGain = !!e.gain;
                return (
                  <TableRow key={i} hover sx={e.type === 'finish' ? { '& td': { color: '#d9a441' } } : undefined}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmtDuration(e.time)}</TableCell>
                    <TableCell><Chip size="small" color={row.color} label={`${row.icon} ${row.label}`} /></TableCell>
                    <TableCell>
                      {e.type === 'finish'
                        ? `Finish Now → ${e.label}`
                        : e.gid ? `${buildingName(e.gid)} ${e.label}` : e.label}
                      {e.cp !== undefined && ` (+${Math.round(e.cp)} CP)`}
                    </TableCell>
                    {RES_KEYS.map((k) => (
                      <TableCell key={k} align="right" sx={{
                        fontFamily: 'monospace',
                        color: e.cost ? 'inherit' : isGain ? '#7fb069' : 'text.disabled',
                      }}>
                        {e.cost ? fmtRes(e.cost[k]) : isGain ? `+${fmtRes(e.gain![k])}` : '·'}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: e.gold ? '#d9a441' : 'text.disabled' }}>
                      {e.gold ? `-${e.gold}` : '·'}
                    </TableCell>
                    <TableCell sx={{ borderLeft: '1px solid #3a2f24', py: 0.25 }}>
                      {e.snap && <Situation snap={e.snap} />}
                    </TableCell>
                    <TableCell sx={{ borderLeft: '1px solid #3a2f24', py: 0.25 }}>
                      {e.snap && <CpCell snap={e.snap} thr={thr} />}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', color: '#7fb069' }}>{fmtDuration(best.settleTime)}</TableCell>
                <TableCell><Chip size="small" color="success" label="🚀 SETTLE" /></TableCell>
                <TableCell>All conditions met — send settlers! (the NEW village spawns with 750 of each — granted, not paid)</TableCell>
                {RES_KEYS.map((k) => <TableCell key={k} align="right" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>—</TableCell>)}
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow sx={{ '& td': { borderTop: '2px solid #d9a441', fontWeight: 700 } }}>
                <TableCell colSpan={3}>Total spent ({orders.filter((e) => e.cost).length} paid actions{visible.length < orders.length ? ' — includes rows hidden by the filter' : ''})</TableCell>
                {RES_KEYS.map((k) => (
                  <TableCell key={k} align="right" sx={{ fontFamily: 'monospace', color: RES_COLORS[k] }}>{fmtRes(totals[k])}</TableCell>
                ))}
                <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#d9a441' }}>{goldTotal}</TableCell>
              </TableRow>
              <TableRow sx={{ '& td': { fontWeight: 700 } }}>
                <TableCell colSpan={3}>Grand total (all four resources)</TableCell>
                <TableCell colSpan={4} align="right" sx={{ fontFamily: 'monospace' }}>
                  {fmtRes(totals.wood + totals.clay + totals.iron + totals.crop)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      {view === 'strategies' && (
        <Paper sx={{ p: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Fields to</TableCell>
                <TableCell>Early embassy</TableCell>
                <TableCell>Parties</TableCell>
                <TableCell align="right">Settle time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outcomes.map((o, i) => (
                <TableRow key={i} selected={i === 0}>
                  <TableCell>{i + 1}</TableCell>
                  {(o.params as { organic?: boolean }).organic ? (
                    <TableCell colSpan={3}>✦ organic search plan — its own build order, not a greedy strategy</TableCell>
                  ) : (
                    <>
                      <TableCell>L{o.params.fieldTarget}</TableCell>
                      <TableCell>{o.params.cpEarly ? `L${o.params.cpEarly}` : '—'}</TableCell>
                      <TableCell>{o.params.townHall ? 'yes' : 'no'}</TableCell>
                    </>
                  )}
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {o.settleTime ? fmtDuration(o.settleTime) : 'failed'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Box>
        <Typography variant="caption" color="text.secondary">
          Model: verified T4.6 formulas & official data (see research/). NPC = pooled resources, 3 gold
          each; instant finish 2 gold each (never free); task rewards are banked and collected at the
          then-current hero level; settlers train one at a time; oasis income = one-time BP clears +
          trickle (no animal respawn during BP). Assumption flag: field L0 production 3/h.
        </Typography>
      </Box>
    </Stack>
  );
}
