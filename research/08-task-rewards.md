# Travian: Legends T4.6 — Task Reward Dataset (Research Note 08)

## 1. Source & methodology

- Source: community spreadsheet "TASK OVERVIEW TRAVIAN V4.6", Google Sheets ID `16u0A1Z7OJBX8yyf4gi4CusIhyjhHWt9xGgR2nrgfG-I`, watermark "F L A W L E S S".
- Provenance [CONFIRMED — r/travian thread `pygn8b`, retrieved 2026-08-12 via Arctic-Shift archive after reddit.com blocked anonymous access]:
  - 2021-09-30: u/Kouluammunta ASKS for a task-system spreadsheet (the post itself contains no data).
  - 2021-10-01: u/GaulishGirl links the ORIGINAL spreadsheet (`1qgtWvvhel7uaeFHfgZ_YOwc8J9Mj6o2btHinsRzvYbk`) — "In the first sheet, you can edit the hero level, and you get the reward with the correct hero bonus." That sheet is now deleted (Google returns HTTP 410 Gone).
  - 2022-01-04: u/Phi0294 links OUR spreadsheet: "New sheet, due to changes in the task system and new language changer implemented." **So the dataset's effective date is January 2022, not October 2021, and it already incorporates the late-2021 task-system changes.**
  - 2026-04-08: a comment quotes Travian support on conquered-village task behavior (matches current KB), showing the thread is still the community reference.
  - No comment in the thread disputes any value; no comment discusses server-speed scaling.
- Method: downloaded the full workbook as `.xlsx` (Google export endpoint), parsed with SheetJS including cell formulas, extracted base values (stored as numeric literals) and reverse-engineered the hero-bonus computation from the stored formulas.

### Workbook structure (all 5 tabs enumerated) [CONFIRMED — direct extraction]

| Sheet | State | Content |
|---|---|---|
| `Translations` | hidden | Localization table (EN / DE / partial FR) keyed by task IDs such as `TASK_GID15_1` |
| `Herobonus` | hidden | Hero level → bonus % lookup table (levels 0–200) |
| `Tasks&Rewards(Startvillage)` | visible | 129 tasks, 29 categories — the spawn/first village |
| `Tasks&Rewards(EveryVillage)` | visible | 53 tasks — new (settled) villages; includes a "Reach Loyalty of 100%" task for chiefed villages |
| `QuestRewards(GeneralTasks)` | visible | 20 tasks — account-wide (account population, account culture points) |

Total: 202 individual tasks.

## 2. Extracted data files

- `research/data/task-rewards.csv` — Startvillage tab (129 tasks). Columns: `category, task, wood, clay, iron, crop, xp, key`. Values are BASE rewards (no hero bonus).
- `research/data/task-rewards-every-village.csv` — EveryVillage tab (53 tasks), same columns.
- `research/data/task-rewards-general.csv` — GeneralTasks tab (20 tasks), same columns.
- `key` is the spreadsheet's internal translation key; `GID` numbers match Travian building GIDs (e.g. GID1 Woodcutter, GID15 Main Building), useful for programmatic mapping.
- Category header rows and aggregate rows ("Ressource fields combined" = "Even growth" + "Complete economy" group sums) were excluded; only leaf tasks are in the CSVs.

## 3. Hero-bonus formula [CONFIRMED — recovered from cell formulas]

Every "with hero bonus" cell has the formula:

```
=ROUNDDOWN((base/100)*(100 + INDEX(Herobonus!$B:$B, MATCH(heroLevel, Herobonus!$A:$A, 1), 1)), 0)
```

The hidden `Herobonus` table maps hero level → bonus percent, identically for resources (col B) and XP (col C):

| Hero level | Bonus % |
|---|---|
| 0 | 0 |
| 1 | 0 |
| 2 | 2 |
| 3 | 4 |
| L ≥ 1 | 2 × (L − 1) |
| 200 (table max) | 398 |

Closed form:

```
reward(level) = floor( base × (1 + 0.02 × max(0, level − 1)) )
```

i.e. +2% per hero level starting at level 2, rounded DOWN to integer, applied independently to each resource and to XP. At hero level 6 (the workbook's saved input) the multiplier is 1.10, which reproduces every displayed with-bonus value in all three tabs exactly (verified programmatically for all 202 rows, including floor cases like 1125 → 1237 and 75 → 82).

## 4. Internal consistency checks [CONFIRMED — verified programmatically, all 202 rows]

- All four resource rewards are always equal (wood = clay = iron = crop).
- XP = resources / 15 exactly, every row (150→10, 225→15, 675→45, 1125→75, 3600→240, ...).
- Every base resource value is a multiple of 75. Observed value set: 75, 150, 225, 300, 375, 450, 600, 675, 750, 900, 1050, 1125, 1200, 1350, 1500, 1800, 1875, 2250, 2400, 2625, 3000, 3600.
- Category totals in the sheet are SUM formulas over their task rows (no hidden extra values).
- Base totals per resource: Startvillage 81,900; EveryVillage 44,700; General 16,500.

## 5. Cross-validation against independent sources

### 5a. Task LIST vs official KB (https://support.travian.com/en/articles/17-task-system, fetched 2026-08-12)

[CONFIRMED] The current official KB task list matches the spreadsheet's structure almost 1:1:

| Category | Official KB levels | Spreadsheet levels | Match |
|---|---|---|---|
| Main Building (start) | 1, 3, 7, 12, 20 | 1, 3, 7, 12, 20 | YES |
| Warehouse / Granary / Barracks / Stable (start) | 1, 3, 7, 12, 20 | 1, 3, 7, 12, 20 | YES |
| Academy / Smithy / Town Hall / Rally Point (start) | 1, 10, 20 | 1, 10, 20 | YES |
| Workshop / Embassy (start) | 1 | 1 | YES |
| Cranny (start) | 1, 3, 6, 10 | 1, 3, 6, 10 | YES |
| Marketplace / Wall (start) | 1, 3, 7, 12, 20 | 1, 3, 7, 12, 20 | YES |
| Residence (start) | 1, 3, 7, 10, 20 | 1, 3, 7, 10, 20 | YES |
| Palace / Command Center (start) | 1, 3, 7, **12**, 20 | merged with Residence: 1, 3, 7, **10**, 20 | MINOR MISMATCH (see §8) |
| Sawmill / Brickyard / Iron Foundry / Grain Mill / Bakery | 1, 5 | 1, 5 | YES |
| Single resource field | 2, 4, 7, 10 | "One X to level" 2, 4, 7, 10 | YES |
| All resource fields ("Complete economy") | 2, 4, 7, 8, 9, 10 | 2, 4, 7, 8, 9, 10 | YES |
| Settled village buildings | 1, 10, 20 (Barracks & Academy: 1 only) | EveryVillage tab: identical | YES |
| Conquered-village resets | Residence/Palace/CC 1/10/20, Wall 1/10/20, Loyalty 100 | EveryVillage tab has exactly these incl. "Reach Loyalty of 100%" | YES |
| Account population / CP | 500, 1000, 1500, 2500, 5000, 10000, 20000… | GeneralTasks tab: same, up to 160,000 | YES |

The KB also states, matching the spreadsheet's model exactly: rewards are "resources (same amount of each type of resource) and hero experience", "every new task of the same type grants a larger reward", and "Your hero's level provides an additional bonus to all rewards".

### 5b. Reward VALUES

- [UNVERIFIED] No independent source publishes the numeric values. The official KB, the Unofficial Travian Community fansite article (Oct 2025, https://unofficialtravian.com/2025/10/task-system/), and forum/blog material all describe the structure but give no numbers. The spreadsheet remains the only numeric source found.
- [CONFIRMED] Internal consistency is perfect (see §4): equal 4-resource payouts, XP = resources/15 on all 202 rows, all values multiples of 75, clean 1×/2×/3×… progressions per task type — consistent with a generated game table rather than hand-collected noise.
- [CONFIRMED] The hero-bonus mechanic (bonus exists and applies to all rewards) is official KB fact; the exact 2%/level table is community-sourced (spreadsheet's hidden `Herobonus` tab) [UNVERIFIED against official numbers, but reproduced every displayed value exactly].

## 6. Speed scaling — verdict: NO EVIDENCE FOUND EITHER WAY [UNVERIFIED]

- The official "Game Versions and Speed" article (https://support.travian.com/en/articles/20-game-versions-and-speed) enumerates what scales with speed (production, build/training times, CP requirements, etc.) and does NOT mention task/quest rewards at all.
- The r/travian source thread and archived r/travian comment searches (Arctic-Shift, queries "task rewards", "task rewards speed", "quest rewards speed", "rewards scale") produced no statement about task rewards on speed servers.
- Search summaries repeatedly claimed "server speed does not affect rewards" but that traces to the DAILY QUESTS article (a different system — daily-quest reward cycling), not the task system; treat as suggestive only [UNVERIFIED].
- Related official data point: hero resource production DOES increase with game speed (https://support.travian.com/en/articles/141-hero-in-the-early-game) — so "nothing early-game scales" is not a safe assumption.
- **Recommendation for the calculator:** default to NO speed scaling (no source claims scaling; the spreadsheet gives one table with no speed selector, and its author designed for correctness via the hero-level input), but expose it as an assumption flag and verify in-game on a 2x/3x world (a single "Build Cranny level 1 = 75 each?" check settles it).

## 7. Currency (2022 data vs 2026 game)

- The dataset's effective date is Jan 2022 (revision issued explicitly "due to changes in the task system") — see §1.
- [CONFIRMED] The 2026 official KB task list still matches the spreadsheet's task structure (§5a), and the Oct 2025 fansite article describes the same system with the same thresholds.
- [UNVERIFIED] No changelog entry 2022–2026 mentioning task-REWARD changes was found (blog.travian.com changelogs surfaced only a Dec 2022 taskmaster-notification bugfix). Absence of evidence, not proof — values could have been rebalanced silently, but nothing suggests it.
- Tag for the app: task STRUCTURE = current [CONFIRMED]; numeric VALUES = best available, believed current [UNVERIFIED].

## 8. Open questions

1. Residence vs Palace/Command Center 4th task level: KB says Residence 10 but Palace/CC 12; the spreadsheet merges them at level 10. Affects one task's trigger level (reward value 1200 base unaffected). Verify in-game if the calculator distinguishes administration buildings.
2. "Celebration" task (600 base, Startvillage tab) was not visible in the KB fetch — likely present in the full article but unconfirmed in this pass.
3. Exact hero-bonus table beyond the reproduced range: spreadsheet caps at level 200 (+398%); real cap unknown.
4. Speed scaling (see §6) — needs one in-game observation on a speed world.
5. The original Oct-2021 spreadsheet is deleted (410 Gone), so the pre-change values cannot be diffed to characterize what the late-2021 "changes in the task system" altered.
