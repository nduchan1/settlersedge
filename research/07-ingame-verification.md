# In-game verification log

*Measurements by Nitai (account owner), analysis verified programmatically (`scratchpad/verify-math.mjs`). This file resolves items from [00-MASTER-SUMMARY.md](00-MASTER-SUMMARY.md) §Consolidated verification checklist.*

## Session 1 — 2026-08-12, Travian Tournament qualifiers, x2 speed, Gaul account

### P0-3 CP accrual timing — ✅ RESOLVED: CONTINUOUS
Player-confirmed: CP generation starts immediately upon build completion and accrues continuously — no daily tick. Engine models CP as a continuous rate.

### P0-5 Celebration costs & durations — ✅ RESOLVED
Costs measured in-game (identical to the community values, so costs do NOT scale x1→x2):

| | wood | clay | iron | crop |
|---|---|---|---|---|
| Small celebration | 6,400 | 6,650 | 5,940 | 1,340 |
| Great celebration | 29,700 | 33,250 | 32,000 | 6,700 |

Durations measured at Town Hall 11/13/17 (small + great = 6 data points). **All six match `86400 × 0.964^(TH−1)` s (great = ×2.5) to the second**, with NO speed division on x2:

| TH | small measured | small predicted | great measured | great predicted |
|---|---|---|---|---|
| 11 | 16:38:00 | 16:38:00 | 41:35:01 | 41:35:01 |
| 13 | 15:27:27 | 15:27:27 | 38:38:36 | 38:38:36 |
| 17 | 13:20:56 | 13:20:56 | 33:22:20 | 33:22:20 |

**ENGINE**: `celebrationDuration(TH, kind, speed) = 86400 × 0.964^(TH−1) × (kind==='great' ? 2.5 : 1) / speedDivisor`, where speedDivisor = 1 (x1/x2), 2 (x3/x5), 4 (x10) — the ÷2/÷4 part is from the official KB, now consistent with the measured ÷1 at x2. Rounding: nearest second matches all points.
Open sliver: whether costs also stay flat on x3/x5/x10 (confirmed flat x1→x2).

### P0-4 Settler training time — ✅ curve resolved, ⚠ base anomaly found
Measured (Gaul, x2): Residence 10 → **1:10:22** (4,222 s); Residence 20 → **0:24:32** (1,472 s). Reported hypothetical Residence 1 → 3:09:10 (11,350 s = exactly 22,700/2, the published base).

Analysis:
- Res20/Res10 = 0.34865 = 0.9^10 exactly ⇒ **×0.9 per Residence level confirmed**.
- Both measurements fit `floor(base × 0.9^(L−1) / speed)` **only** for base ∈ [21,796..21,800] — the published 22,700 predicts 1:13:17 / 0:25:33 (both ≈4% too high) and CANNOT fit (no per-level factor fits both points with base 22,700).
- Cleanest candidate: **base = 21,800 s (6:03:20) with floor rounding** — reproduces both measurements exactly.

**RESOLVED (2026-08-13, see [10-p1-mechanics.md](10-p1-mechanics.md))**: the ~4% gap is the **alliance Recruitment bonus level 2** (−2%/level training time, applies to Residence per official KB art. 88). `ceil(22700 × 0.9^(L−1) × 0.96 / 2)` reproduces both measurements to the second — unique exact fit, requires ceiling rounding. Published base 22,700 stands; no rebalance, no qualifier modifier. ×0.9/level officially confirmed for Residence, Palace AND Command Center from level 1 (kb-buildings.json `trainingTimeResidence` effects). Remaining 30-second check: confirm Recruitment = 2 in the alliance Bonuses tab.
**ENGINE**: `settlerTime(L, speed, recruitLvl) = ceil(base × 0.9^(L−1) × (1 − 0.02×recruitLvl) / speed)` — alliance Recruitment becomes a first-class input.

### P0-6 Starting resources — ✅ RESOLVED
750 of each resource, all speeds and server types (player-confirmed).

### P0-1 / P0-7 Hero production & Egyptian bonus — ✅ values confirmed, unit one check away
Official KB art. 141 + player: **9 per point each-resource / 30 single-resource; Egyptians 12/40; scales exactly ×speed** (x2→×2 … x10→×10). The "+25%" in official prose = the **gold production bonus** (+25% purchasable), which also applies to hero production — NOT an Egyptian-specific figure. Egyptian advantage = 12/40 vs 9/30 (×4/3).
**OPEN sliver**: time unit (per hour assumed). One check: production overview on the x2 account — with P points in resources, hero contribution should show 18×P/hr per resource (9 × 2 speed).

## Session 2 — 2026-08-13, same x2 Tournament-qualifier Gaul account

### Task-reward speed scaling — ✅ REFUTED (rewards do NOT scale with speed)
Measured on x2: "Build Main Building level 1" → **261 res each + 17 XP**; "Build Rally Point
level 1" (settled-village list) → **130 res each + 8 XP**. Analysis: bases are 150/10 (MB, both
lists) and 75/5 (RP, every-village list); all four values = `floor(base × 1.74)` = the hero-level
bonus at level 38 (1 + 0.02×37). One consistent multiplier, no ×2 anywhere ⇒ **no speed scaling**,
AND the +2%/level formula validated at high hero level, AND both task lists' base values confirmed
live. (Caveat: measured on a qualifier server; regular-server check would be belt-and-braces.)

### Adventures — first 10 predetermined (player-confirmed)
The first 10 adventures always give the exact same rewards (fixed sequence; only #2 and #7 pay
resources). Engine models the fixed ten deterministically; EV applies from #11.

### P0-2 Task rewards — ⏳ IN PROGRESS
Community spreadsheet "TASK OVERVIEW TRAVIAN V4.6" acquired (reddit r/travian, u/[author], Oct 2021): equal rewards ×4 resources + hero XP per task, base values + hero-level bonus column (level 6 ⇒ ×1.1 in our export). Raw first tab: `data/task-rewards-sheet0.csv`. Validation + formula extraction + speed-scaling check delegated to research agent → [08-task-rewards.md](08-task-rewards.md).
