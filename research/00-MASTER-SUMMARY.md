# Travian Legends T4.6 — Research Master Summary

*Research sweep completed 2026-08-12. Six domain reports, all facts tagged [CONFIRMED] / [DISPUTED] / [UNVERIFIED] with source URLs. This file is the index + the consolidated verification checklist. When a domain file and this summary disagree, the domain file (with its sources) wins.*

| # | Domain file | Covers |
|---|---|---|
| 1 | [01-buildings-construction.md](01-buildings-construction.md) | All 49 buildings, cost/time/CP/pop formulas, Main Building reduction, queues, demolition |
| 2 | [02-resources-economy.md](02-resources-economy.md) | Field production, layouts, oases, storage, cranny, merchants, hero production, tribe economy |
| 3 | [03-culture-points-expansion.md](03-culture-points-expansion.md) | CP per building, CP thresholds per speed, celebrations (reworked!), expansion slots, settlers |
| 4 | [04-tribes-settlers-heroes.md](04-tribes-settlers-heroes.md) | All 6 tribes' current bonuses, special buildings, settler costs/times, hero system |
| 5 | [05-servers-speeds-configs.md](05-servers-speeds-configs.md) | Speed multiplier matrix, server types, Advanced Start, beginner protection |
| 6 | [06-tasks-hero-earlygame.md](06-tasks-hero-earlygame.md) | Task system, daily quests, adventures, artwork CP, starting state |
| — | `data/kb-buildings.json` | **Official Travian dataset** extracted from the knowledge-base app bundle: every building, every level — cost, time, CP, population, effects. Primary data source for the engine. |

## Confirmed pillars (safe to build the engine on)

**Construction** — Cost = `round5(base × factor^(lvl−1))`; factor is per-building (1.28 standard, **1.67 resource fields**, 1.31 Waterworks, 1.22 Command Center…). Time = `(base+P)·1.16^(n−1) − P` at MB1; Main Building multiplies by `0.964^(MB−1)`. CP/day = `round(base × 1.2^lvl)`. Population and storage formulas verified against all 995 official level rows. Romans build one building + one field simultaneously; all other tribes one order at a time.

**Speeds** (official KB art. 20): build/training times ÷speed, production ×speed; troop travel ×2 on x2–x5, ×4 on x10 (NOT linear); beginner protection 5+3 / 3+3 / 3+3 / 2+2 / 1+1 days.

**Culture points** (official KB art. 51): thresholds per village per speed — full official table captured (villages 1–50 × five speeds); ≈ `1600·n^2.3` with per-speed rounding. Village 2 = 2000/800/500/300/200 CP (x1/x2/x3/x5/x10). Starting CP 500/250/167/100/50. CP is a threshold, never spent; checked at settler send AND arrival.

**Celebrations (REWORKED — old guides are wrong)**: grant CP **instantly** = daily CP production, capped per speed (small 500/500/250/250/125; great 2000/2000/1000/1000/500), then a cooldown of `24h·0.964^(TH−1)` (great ×2.5), ÷2 on x3/x5, ÷4 on x10.

**Expansion**: Residence 10/20 → 1/2 slots; Palace & Command Center 10/15/20 → 1/2/3. Settlers: 3 + 750 each resource; per-tribe costs/times confirmed (Gauls cheapest/fastest 18,100 total / 6:18:20; Spartans slowest 9:28:20). Official data: settler training ×0.9 per Residence level (anchor needs verification, see P0-4).

**Hero**: production per point 9/hr each resource or 30/hr single; **Egyptians 12/40 (hero-only — kirilloid's ×2 is a stale 2016–2021 value)**; ×server speed. Artwork: daily account CP, capped 2000/1300/1000/700/400, cooldown 24/24/12/12/6h.

**Advanced Start** (official KB arts. 28 & 203): fields lvl 5, **6 pre-trained settlers**, CP for 2 immediate settles, 4th-village CP bar pre-filled 75% (of the v3→v4 *difference* — worked example confirms), villages 2–3 can't be croppers; first two settled villages also get lvl-5 fields.

**Tasks/daily quests**: task rewards = equal resources ×4 + hero XP, scaled by task type × step × hero level (exact values unpublished — see P0-2). Daily-quest rewards are officially NOT speed-scaled; deterministic chest cycles captured. Adventures: first 10 rewards are a fixed sequence; frequency ×speed, amounts not.

## Kirilloid errors caught (why we cross-check everything)

1. Egyptian hero production ×2 (`t4.fs/hero.ts`) — stale 2016–2021 value; current is 12/40 vs 9/30.
2. GitHub repo's `t5/culture.ts` is **Travian Kingdoms**, not Legends — its CP table (1000 for v2) must never be used.
3. Stale Egyptian settler cost (pre-Dec-2021 rebalance; current 5040/6510/4830/4620).
4. Waterworks CP base wrong (kirilloid 1, official 2).
5. `t4/hero.ts` hero production ×6/point — inconsistent with current official 9/30.
6. Old cranny curve (~100/lvl) vs current official 200/lvl (×1.5 Gaul).
Also: the GitHub repo is stale overall — the **live** site (`travian.kirilloid.ru/js/units.js`) is more current and agreed with official sources where checkable.

## Consolidated verification checklist

### P0 — engine constants *(statuses updated 2026-08-12 — details in [07-ingame-verification.md](07-ingame-verification.md))*
1. ✅ **Hero production per point** — 9/30 (Egyptian 12/40), ×speed exactly. Sliver open: per-hour unit (one production-overview check). *(02 §OQ1, 05 §OQ3)*
2. ⏳ **Task system exact rewards** — community spreadsheet "TASK OVERVIEW TRAVIAN V4.6" acquired; validation in progress → [08-task-rewards.md](08-task-rewards.md). *(06 §OQ1)*
3. ✅ **CP accrual timing** — CONTINUOUS (player-confirmed in-game). *(03 §OQ1)*
4. ✅⚠ **Settler time** — ×0.9/Residence-level + floor + ÷speed confirmed by measurement; BUT measured Gaul base ≈21,800s, not published 22,700s (qualifier modifier or quiet rebalance — one regular-server check open). *(03 §OQ2, 04 §OQ1)*
5. ✅ **Celebration costs & durations** — costs measured (= community values, flat across x1→x2); durations match `86400×0.964^(TH−1)` (great ×2.5) to the second. *(03 §OQ3)*
6. ✅ **Starting resources** — 750 each, all speeds/types (player-confirmed). *(02 §OQ12, 06 §OQ6)*
7. ✅ **Egyptian hero bonus** — 12/40 confirmed; official "+25%" prose refers to the purchasable gold production bonus (which also applies to hero production). *(02 §OQ2, 04 §OQ4)*

### P1 — accuracy refinements *(statuses updated 2026-08-13 — details in [10-p1-mechanics.md](10-p1-mechanics.md))*
8. ✅ Field production: L2 = 13 settled (kirilloid ×1.4 table exactly reproduces official kb-buildings values); L0 (3 vs 6/hr) still open — one glance at a fresh village. *(02 §OQ3–5)*
9. ✅~ Merchants: capacity AND speed ×speed linearly (community consensus; trivial in-game check: Gaul 1500 capacity on x2). *(05 §OQ1)*
10. ✅ MB reduction applies to fields (identical code path in kirilloid live; no exclusion anywhere). *(01 §OQ3–5)*
11. ✅ Stacking: `base × (1 + factory% + oasis%×(1 + 0.05×WW)) `, gold +25% multiplicative on top, hero flat add. *(02 §OQ7)*
12. ✅ Command Center full table is OFFICIAL (kb-buildings.json gid 44); Waterworks: official L1 = 910/945/910/340 — Fandom right, kirilloid stale. *(04 §OQ5, 02 §OQ15)*
13. Egyptian/Spartan settler times — kirilloid-live values match our tables; still no official source. *(04 §OQ2–3)*
14. ✅~ Daily-quest activities + points (full 11-activity table, sums to exactly 100; chest values match official cycle) and adventure EV formulas (resources ≈ `rand(450,700)/type × speed × (1+15·progress)`; XP `8+rand(n,2n)`; silver bands) — sourced from the Travium fan-server codebase, corroborated where possible; post-#10 outcome distribution stays a two-preset knob → [11-earlygame-income.md](11-earlygame-income.md). *(06 §OQ2–4)*
15. ✅~ Hero XP `25·L·(L+1)` confirmed in kirilloid live (still no official statement). *(06 §OQ5)*
16. **NEW — alliance Recruitment bonus** (−2%/level training incl. settlers, official art. 88) solved the settler anomaly and must be an engine input; capital fields officially cap at 25 (13+ capital-only); HDT has BOTH effects (official art. 81); hero +80 FS/point (Romans +100), mounts 14/17/20; gold: NPC 3, +25% bonus 5, Gold Club 200/round.

### P2 — edge cases / deferred
Demolition time/refund details; capital field hard cap (25?); Horse Drinking Trough upkeep dispute; Hospital/Asclepeion availability per world; Trapper per-level traps; Gold prices (Plus 10 / NPC 3 / instant ~2); tutorial micro-quests; left-hand hero items; Philosophy alliance bonus; 18-cropper layouts; whether x10 rounds always couple with Advanced Start; Vikings tribe availability; celebration queue depth.

## Engine decisions (defaults until verified)
- Source of truth for buildings: `data/kb-buildings.json` (official), not transcriptions.
- CP thresholds: official lookup table (art. 51), NOT a formula, NOT kirilloid GitHub.
- Celebrations: reworked model (instant capped CP + cooldown).
- Hero: 9/30 per point/hr, Egyptian 12/40, ×speed — pending P0-1/P0-7.
- Settlers: base time = Residence-1 anchor with ×0.9/level — pending P0-4; flag prominently.
- Tasks: model as a data-driven reward script with placeholder values + a UI disclaimer until P0-2 measurements land. Adventures/raiding: expected-value "extra income/hr" knobs.
- Every disputed constant lives in one typed `disputed.ts` module with the dispute documented, so in-game verification results drop in without hunting through the engine.
