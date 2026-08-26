# ⚔ Settler's Edge

**The Travian: Legends second-village optimizer.** Give it your server settings and it computes the
fastest possible path to your second village — simulating the full early game against verified T4.6
mechanics and searching build-order strategies to find the quickest settle.

Built by **Nitai Duchan** with a research-first approach: every constant in the engine traces to the
official Travian knowledge base, in-game measurements, or cross-checked community data.

## What it does

- **Fastest-settle optimizer** — grid-searches strategy space (field development depth, early CP
  infrastructure, Town Hall celebrations) with a greedy CP-push planner over a full simulation, in a
  Web Worker. Returns the best plans with a minute-by-minute build order.
- **Full early-game simulation** — resources (with storage caps and crop upkeep), construction
  queues (including the Roman dual queue), Main Building speed-up, the complete 202-task reward
  system with its hero-level bonus formula, hero resource production, culture points as a continuous
  rate, reworked celebrations (instant capped CP + Town-Hall cooldown), settler training with
  Residence scaling and alliance Recruitment bonus.
- **Every configuration** — all 6 tribes (Romans, Gauls, Teutons, Egyptians, Huns, Spartans), all
  speeds (x1/x2/x3/x5/x10), regular and local servers including **Advanced Start** (fields L5,
  6 settlers, CP for two settles, 75% of the village-4 bar).
- **Shareable** — the config lives in the URL hash; a link reproduces the whole plan.

## Data provenance

The `research/` folder contains the full research base (12 documents + machine-readable datasets):
official building data extracted from Travian's own knowledge-base bundle (all 49 buildings, every
level), the official CP-threshold tables per speed, in-game verified celebration & settler formulas
(matched to the second), the community task-reward spreadsheet validated against the official task
list, and a documented list of kirilloid errors found along the way. Facts are tagged
CONFIRMED / DISPUTED / UNVERIFIED with sources; disputed constants are flagged in the engine.

**Modeled** (player-verified mechanics): NPC merchant (3g, pooled resources), Finish-Now instant
completion (2g, never free), gold-budget allocation searched by the optimizer, BP oasis raiding as
one-time hero-bag clears (40 res + 1 XP per animal supply; no respawn during BP),
CP-buildings-before-parties ordering, great celebrations. Resource pushes are correctly absent —
they're blocked during beginner's protection.
**Known gaps:** held-task collection timing; task rewards assumed not speed-scaled (unverified
anywhere); oasis competition is a user-set knob.

## Tech

React 19 · TypeScript · MUI · Recharts · Vite · Vitest — pure-TypeScript game engine
(`src/engine/`, zero React dependencies, 55 tests including in-game measured ground truths).

```bash
npm install
npm run dev      # dev server
npm test         # engine test suite
npm run build    # type-check + production build
node scripts/drive-app.mjs <shot-dir>   # headless smoke test (needs Edge)
```

## Disclaimer

Fan-made tool for the Travian: Legends community. Not affiliated with Travian Games GmbH.
Game data belongs to its owners; verify plans on your own server — local configs vary.
