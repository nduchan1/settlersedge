# Travian: Legends (T4.6) — Buildings & Construction Mechanics

Research date: 2026-08-12. Game version: current Travian: Legends (T4.6 family, includes Spartans and Vikings/Shores-of-War content).

## Executive summary

The single best machine-readable source turned out to be the **official in-game knowledge base** at `https://knowledgebase.legends.travian.com` (a React SPA; its JS bundle `https://knowledgebase.legends.travian.com/main.js` embeds the complete per-level dataset for all 49 buildings: costs, build times, population, culture points, effects, prerequisites, tribe restrictions, and the generating formula parameters). This dataset was extracted in full and every formula below was verified against **all 995 level rows** programmatically. Kirilloid's open-source model (github.com/kirilloid/travian, `src/model/base/buildings.ts`) was then compared and **agrees with the official data on every formula** (cost, time, CP, population, Main Building reduction, training-time reduction). Raw extracted data is saved alongside this document in `data/kb-buildings.json` (per-level data, official) and `data/kb-names.json` (gid → English name, official).

Confirmed headline results:

- **Cost formula**: `cost_i(level) = round_to_nearest_5(baseCost_i × costFactor^(level−1))`, with `costFactor = 1.28` for almost all village buildings (exceptions listed below). Verified exactly on 3,975/3,980 values; the only 5 mismatches are Wonder of the World levels 98–100 where per-resource cost is **capped at 1,000,000**. [CONFIRMED]
- **Time formula** (1x speed, Main Building level 1): `t(level) = (timeBase + P) × timeFactor^(level−1) − P`, where `P = timePadding / (timeFactor − 1)`. For standard buildings `timeFactor = 1.16`, `timePadding = 300` → `P = 1875`. Verified exactly on 995/995 rows. Equivalent recursion: `t(1) = timeBase`, `t(n) = t(n−1) × 1.16 + 300`. [CONFIRMED]
- **Main Building reduction**: construction time multiplier `0.964^(MB_level − 1)` (MB 1 → ×1.000, MB 20 → ×0.4983, i.e. ~50% faster). [CONFIRMED]
- **Culture points**: `CP(level) = round(cpBase × 1.2^level)` (total CP produced per day by that building at that level). [CONFIRMED]
- **Population**: cumulative; per-level increment is `popBase` at level 1, then `round((5 × popBase + level − 1) / 10)` for levels 2+. Verified on all 995 rows. [CONFIRMED]
- **Build queues**: Romans build 2 things simultaneously (1 village building + 1 resource field); other tribes 1. Plus account adds one *waiting* queue slot (it starts only when an active slot frees). [CONFIRMED for Romans/Plus from official article; non-Roman "1 slot" confirmed from 2 community sources, official article only implies it]
- **Demolition**: requires Main Building ≥ 10; removes one level at a time; takes time; Gold can instantly finish one level or the whole demolition. Exact demolition-time formula could NOT be verified (open question). [Partially CONFIRMED]

Everything tagged [CONFIRMED] below is backed by the official knowledgebase dataset (KB) and/or official support articles, cross-checked against kirilloid where applicable.

## Sources

- **[KB]** Official in-game knowledge base data: https://knowledgebase.legends.travian.com (dataset extracted from its main.js bundle, 2026-08-12). This is Travian Games' own data — treated as primary/official.
- **[S-stats]** Official buildings overview / statistics tool: https://support.travian.com/en/support/solutions/articles/7000090158-buildings-and-resource-fields-statistics
- **[S-quick]** Quick Summary: Buildings and Construction: https://support.travian.com/en/articles/221-quick-summary-buildings-and-construction
- **[S-demo]** Demolishing Buildings: https://support.travian.com/en/articles/39-demolishing-buildings
- **[S-adm]** Guide: The Palace, Residence and Command Center: https://support.travian.com/en/articles/216-guide-the-palace-residence-and-command-center
- **[S-exp]** Expansion Slots: https://support.travian.com/en/articles/52-expansion-slots
- **[S-gold]** Travian Plus / Gold features: https://support.travian.com/en/articles/126-travian-plus-gold-features-gold-club
- **[S-sparta]** 5 things to consider about Spartans: https://support.travian.com/en/articles/145-5-things-to-consider-about-spartans
- **[S-speed]** Game versions and speed: https://support.travian.com/en/support/solutions/articles/7000068688-game-versions-and-speed
- **[U-hosp]** Hospital and Asclepeion (mirror of official KB article): https://unofficialtravian.com/2025/10/hospital-and-asclepeion/ (official original: https://support.travian.com/en/support/solutions/articles/7000065344, EN variant 404s — indexed copy used)
- **[U-demo]** Demolishing Buildings (mirror): https://unofficialtravian.com/2025/10/demolishing-buildings/
- **[KIR]** Kirilloid open-source model: https://github.com/kirilloid/travian — `src/model/base/buildings.ts`, `src/model/t4/buildings.ts` (cross-check only, never sole source)

## 1. Formulas (all verified against the official dataset)

### 1.1 Resource cost per level [CONFIRMED — KB, verified 3,975/3,980 values; KIR agrees (`round5(c * k ** (lvl-1))`)]

```
cost_i(level) = round( baseCost_i × costFactor^(level−1) / 5 ) × 5     (nearest 5, standard rounding)
```

- The widely-quoted "base × 1.28^(level−1) rounded to nearest 5" is **exactly right** for standard buildings, but `costFactor` is **not 1.28 for every building**:

| costFactor | Buildings |
|---|---|
| 1.28 | all standard village buildings (default) |
| 1.67 | resource fields (Woodcutter, Clay Pit, Iron Mine, Cropland) |
| 1.80 | resource boosters (Sawmill, Brickyard, Iron Foundry, Grain Mill, Bakery) |
| 1.33 | Hero's Mansion |
| 1.31 | Waterworks |
| 1.30 | Harbor |
| 1.26 | Treasury |
| 1.24 | Brewery |
| 1.22 | Command Center |
| 1.0275 | Wonder of the World (per-resource cost capped at 1,000,000; cap hits at levels ~98–100) |

- Rounding is **to the nearest multiple of 5** (not floor, not ceil): floor-to-5 matched only 2,042/3,980 values and ceil-to-5 only 2,166/3,980; nearest-5 matched all but the WW cap rows. [CONFIRMED]

### 1.2 Construction time per level [CONFIRMED — KB, verified 995/995 rows; KIR agrees (`time(a, k, b) = a·k^(lvl−1) − b`)]

At 1x server speed, with Main Building level 1 (no reduction):

```
P = timePadding / (timeFactor − 1)
time_seconds(level) = (timeBase + P) × timeFactor^(level−1) − P
```

equivalently `t(1) = timeBase; t(n) = t(n−1) × timeFactor + timePadding`.

| Building group | timeFactor | timePadding | P | Notes |
|---|---|---|---|---|
| Standard village buildings | 1.16 | 300 | 1875 | e.g. Main Building/Warehouse: timeBase 2000s → lvl 20 = 63,134s ≈ 17:32:14 |
| Resource fields | 1.6 | 200 | 333.33 | timeBase: wood 260, clay 220, iron 450, crop 150 |
| Resource boosters | 1.5 | 1200 | 2400 | |
| Trapper, Hero's Mansion | 1.16 | 0 | 0 | pure geometric: `timeBase × 1.16^(level−1)` |
| Stonemason, Horse Drinking Trough | 1.16 | 600 | 3750 | |
| Brewery | 1.13 | 900 | 6923.08 | |
| Wonder of the World | 1.014 | 600 | 42857.14 | |

Kirilloid's identical formula for e.g. Cranny is `time(2175, 1.16, 1875)` = `2175 × 1.16^(lvl−1) − 1875`, which equals the KB's `(300 + 1875) × 1.16^(lvl−1) − 1875`. Exact numerical agreement. [CONFIRMED]

- The KB dataset stores times as floats (e.g. 63,134.00248…); how the game engine rounds to whole seconds (floor vs round) is **not documented**. [UNVERIFIED — open question]

### 1.3 Main Building time reduction [CONFIRMED — KB per-level effect values; KIR agrees (`mb_like = 0.964 ** (lvl - 1)`)]

```
construction_time = base_time × 0.964^(MB_level − 1) / server_speed
```

Exact multipliers from official data: MB1 = 1.0, MB2 = 0.964, MB5 = 0.8636, MB10 = 0.7189, MB15 = 0.5985, MB20 = 0.4983 (~50% reduction). There is **no separate lookup table** — it is exactly `0.964^(level−1)`. [CONFIRMED]

- Whether the MB reduction applies to resource-field construction as well as village buildings: kirilloid applies it to everything, and the official statistics tool [S-stats] lets you set MB level for all constructions, implying yes. [CONFIRMED, weakly — verify in game]

### 1.4 Server speed [CONFIRMED direction, exact division UNVERIFIED]

Official statement: speed worlds (x2, x3, x5, x10) "accelerate … building construction" [S-speed]. The official statistics tool [S-stats] and kirilloid both compute `time / speed`. No official formula text found stating plain division; treat as `time /= speed` with possible per-server minimums. [DISPUTED-none / UNVERIFIED detail]

- Scenario modifier example: Northern Legends servers reduce construction time of MB, Warehouse/Granary (incl. Great), and all resource fields by 25% (https://support.travian.com/en/support/solutions/articles/7000089640-northern-legends-game-mechanics). [CONFIRMED, scenario-specific]
- Watching an ad: −25% build time for that specific upgrade (mobile/ad-enabled servers). [S-quick] [CONFIRMED]

### 1.5 Culture points [CONFIRMED — KB, 995/995; KIR agrees (`Math.round(cp * 1.2 ** lvl)`)]

```
CP_per_day(level) = round( cpBase × 1.2^level )
```

cpBase per building is in the master table below (column "CP base"). Note the exponent is `level`, not `level−1`.

### 1.6 Population (crop upkeep) [CONFIRMED — KB, 995/995; KIR agrees]

Population shown in-game is cumulative. Increment when upgrading to level n:

```
Δpop(1) = popBase
Δpop(n≥2) = round( (5 × popBase + n − 1) / 10 )
```

(JS `Math.round`, i.e. .5 rounds up.) Cumulative totals for key buildings are in the per-level tables below.

### 1.7 Storage capacity [CONFIRMED — KB; KIR agrees (`roundP(100)(2120 * 1.2**lvl - 1320)`)]

```
Warehouse/Granary capacity(level) = round_to_100( 2120 × 1.2^level − 1320 )
```

Level 1 = 1,200; level 10 = 11,800; level 20 = 80,000. **Great Warehouse / Great Granary hold exactly 3× the normal capacity at every level** (lvl 1 = 3,600; lvl 20 = 240,000). Initial village storage (no warehouse) is 800 per resource [UNVERIFIED, community consensus].

### 1.8 Troop-training / healing time reduction (for completeness) [CONFIRMED — KB; KIR agrees (`train = 0.9 ** (lvl-1)`)]

Barracks/Stable/Workshop/Great variants/Residence(settler-chief training)/Hospital healing all use multiplier `0.9^(level−1)` (lvl 20 → ×0.1351). Horse Drinking Trough is different: linear, `×(1 − 0.01 × level)` on stable training time (lvl 20 → ×0.80).

## 2. Complete building list (official dataset, all 49 buildings)

Legend: GID = internal building type id (gid 12, the old Blacksmith, no longer exists — armour/weapon smithing merged into the Smithy). "Base time" shows `timeBase` seconds plus the padding/factor that feed the time formula of §1.2. Base cost order is Wood/Clay/Iron/Crop (r1/r2/r3/r4). Pop lvl1 = population increment at level 1 (`popBase`). All rows [CONFIRMED — KB].

| GID | Building | Category | Max lvl | Cost factor | Base cost (W/C/I/Cr) | Base time (s) | CP base | Pop lvl1 | Prerequisites / restrictions |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Woodcutter | Resources | 25 | 1.67 | 40/100/50/60 | 260 (pad 200, factor 1.6) | 1 | 2 | Levels 11-12: capital or city only; Levels 13+: capital only |
| 2 | Clay Pit | Resources | 25 | 1.67 | 80/40/80/50 | 220 (pad 200, factor 1.6) | 1 | 2 | Levels 11-12: capital or city only; Levels 13+: capital only |
| 3 | Iron Mine | Resources | 25 | 1.67 | 100/80/30/60 | 450 (pad 200, factor 1.6) | 1 | 3 | Levels 11-12: capital or city only; Levels 13+: capital only |
| 4 | Cropland | Resources | 25 | 1.67 | 70/90/70/20 | 150 (pad 200, factor 1.6) | 1 | 0 | Levels 11-12: capital or city only; Levels 13+: capital only |
| 5 | Sawmill | Resources | 5 | 1.8 | 520/380/290/90 | 3000 (pad 1200, factor 1.5) | 1 | 4 | Woodcutter lvl 10; Main Building lvl 5 |
| 6 | Brickyard | Resources | 5 | 1.8 | 440/480/320/50 | 2240 (pad 1200, factor 1.5) | 1 | 3 | Clay Pit lvl 10; Main Building lvl 5 |
| 7 | Iron Foundry | Resources | 5 | 1.8 | 200/450/510/120 | 4080 (pad 1200, factor 1.5) | 1 | 6 | Iron Mine lvl 10; Main Building lvl 5 |
| 8 | Grain Mill | Resources | 5 | 1.8 | 500/440/380/1240 | 1840 (pad 1200, factor 1.5) | 1 | 3 | Cropland lvl 5 |
| 9 | Bakery | Resources | 5 | 1.8 | 1200/1480/870/1600 | 3680 (pad 1200, factor 1.5) | 1 | 4 | Cropland lvl 10; Main Building lvl 5; Grain Mill lvl 5 |
| 10 | Warehouse | Infrastructure | 20 | 1.28 | 130/160/90/40 | 2000 (pad 300, factor 1.16) | 1 | 1 | Main Building lvl 1 |
| 11 | Granary | Infrastructure | 20 | 1.28 | 80/100/70/20 | 1600 (pad 300, factor 1.16) | 1 | 1 | Main Building lvl 1 |
| 13 | Smithy | Military | 20 | 1.28 | 180/250/500/160 | 2000 (pad 300, factor 1.16) | 2 | 4 | Main Building lvl 3; Academy lvl 1 |
| 14 | Tournament Square | Military | 20 | 1.28 | 1750/2250/1530/240 | 3500 (pad 300, factor 1.16) | 1 | 1 | Rally Point lvl 15 |
| 15 | Main Building | Infrastructure | 20 | 1.28 | 70/40/60/20 | 2000 (pad 300, factor 1.16) | 2 | 2 | — |
| 16 | Rally Point | Military | 20 | 1.28 | 110/160/90/70 | 2000 (pad 300, factor 1.16) | 1 | 1 | — |
| 17 | Marketplace | Infrastructure | 20 | 1.28 | 80/70/120/70 | 1800 (pad 300, factor 1.16) | 3 | 4 | Main Building lvl 3; Warehouse or Great Warehouse lvl 1; Granary or Great Granary lvl 1 |
| 18 | Embassy | Infrastructure | 20 | 1.28 | 180/130/150/80 | 2000 (pad 300, factor 1.16) | 4 | 3 | Main Building lvl 1 |
| 19 | Barracks | Military | 20 | 1.28 | 210/140/260/120 | 2000 (pad 300, factor 1.16) | 1 | 4 | Rally Point lvl 1; Main Building lvl 3 |
| 20 | Stable | Military | 20 | 1.28 | 260/140/220/100 | 2200 (pad 300, factor 1.16) | 2 | 5 | Smithy lvl 3; Academy lvl 5 |
| 21 | Workshop | Military | 20 | 1.28 | 460/510/600/320 | 3000 (pad 300, factor 1.16) | 3 | 3 | Academy lvl 10; Main Building lvl 5 |
| 22 | Academy | Military | 20 | 1.28 | 220/160/90/40 | 2000 (pad 300, factor 1.16) | 4 | 4 | Barracks lvl 3; Main Building lvl 3 |
| 23 | Cranny | Infrastructure | 10 | 1.28 | 40/50/30/10 | 300 (pad 300, factor 1.16) | 1 | 0 | — |
| 24 | Town Hall | Infrastructure | 20 | 1.28 | 1250/1110/1260/600 | 12500 (pad 300, factor 1.16) | 5 | 4 | Main Building lvl 10; Academy lvl 10 |
| 25 | Residence | Infrastructure | 20 | 1.28 | 580/460/350/180 | 2000 (pad 300, factor 1.16) | 2 | 1 | Main Building lvl 5; No Palace in village; No Command Center in village |
| 26 | Palace | Infrastructure | 20 | 1.28 | 550/800/750/250 | 5000 (pad 300, factor 1.16) | 5 | 1 | Embassy lvl 1; Main Building lvl 5; No Residence in village; No Command Center in village; Only one per account |
| 27 | Treasury | Infrastructure | 20 | 1.26 | 2880/2740/2580/990 | 8000 (pad 300, factor 1.16) | 6 | 4 | Main Building lvl 10; No Wonder Of The World in village |
| 28 | Trade Office | Infrastructure | 20 | 1.28 | 1400/1330/1200/400 | 3000 (pad 300, factor 1.16) | 3 | 3 | Marketplace lvl 20; Stable lvl 10 |
| 29 | Great Barracks | Military | 20 | 1.28 | 630/420/780/360 | 2000 (pad 300, factor 1.16) | 1 | 4 | Barracks lvl 20; Non-capital only |
| 30 | Great Stable | Military | 20 | 1.28 | 780/420/660/300 | 2200 (pad 300, factor 1.16) | 2 | 5 | Stable lvl 20; Non-capital only |
| 31 | City Wall | Military | 20 | 1.28 | 70/90/170/70 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Romans |
| 32 | Earth Wall | Military | 20 | 1.28 | 120/200/0/80 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Teutons |
| 33 | Palisade | Military | 20 | 1.28 | 160/100/80/60 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Gauls |
| 34 | Stonemason's Lodge | Infrastructure | 20 | 1.28 | 155/130/125/70 | 2200 (pad 600, factor 1.16) | 1 | 2 | Main Building lvl 5; Capital only |
| 35 | Brewery | Infrastructure | 20 | 1.24 | 3210/2050/2750/3830 | 8000 (pad 900, factor 1.13) | 4 | 6 | Granary or Great Granary lvl 20; Rally Point lvl 10; Tribe: Teutons; Capital only |
| 36 | Trapper | Military | 20 | 1.28 | 80/120/70/90 | 2000 (pad 0, factor 1.16) | 1 | 4 | Rally Point lvl 1; Tribe: Gauls |
| 37 | Hero's Mansion | Military | 20 | 1.33 | 700/670/700/240 | 2300 (pad 0, factor 1.16) | 1 | 2 | Main Building lvl 3; Rally Point lvl 1 |
| 38 | Great Warehouse | Infrastructure | 20 | 1.28 | 650/800/450/200 | 9000 (pad 300, factor 1.16) | 1 | 1 | Main Building lvl 10; Storage artifact (Great Storage plan) required |
| 39 | Great Granary | Infrastructure | 20 | 1.28 | 400/500/350/100 | 7000 (pad 300, factor 1.16) | 1 | 1 | Main Building lvl 10; Storage artifact (Great Storage plan) required |
| 40 | Wonder Of The World | Infrastructure | 100 | 1.0275 | 66700/69050/72200/13200 | 18000 (pad 600, factor 1.014) | 0 | 1 | WW village only |
| 41 | Horse Drinking Trough | Infrastructure | 20 | 1.28 | 780/420/660/540 | 2200 (pad 600, factor 1.16) | 3 | 5 | Stable lvl 20; Rally Point lvl 10; Tribe: Romans |
| 42 | Stone Wall | Military | 20 | 1.28 | 110/160/70/60 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Egyptians |
| 43 | Makeshift Wall | Military | 20 | 1.28 | 50/80/40/30 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Huns |
| 44 | Command Center | Infrastructure | 20 | 1.22 | 1600/1250/1050/200 | 2500 (pad 300, factor 1.16) | 2 | 1 | Main Building lvl 5; No Residence in village; No Palace in village; Tribe: Huns |
| 45 | Waterworks | Infrastructure | 20 | 1.31 | 910/945/910/340 | 2000 (pad 300, factor 1.16) | 2 | 1 | Hero&#39;s Mansion lvl 10; Tribe: Egyptians |
| 46 | Hospital | Military | 20 | 1.28 | 320/280/420/360 | 3000 (pad 300, factor 1.16) | 4 | 4 | Main Building lvl 10; Academy lvl 15; Tribe: Romans/Teutons/Gauls/Egyptians/Huns/Vikings |
| 47 | Defensive Wall | Military | 20 | 1.28 | 160/100/80/60 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Spartans |
| 48 | Asclepeion | Military | 20 | 1.28 | 320/280/420/360 | 3000 (pad 300, factor 1.16) | 5 | 4 | Main Building lvl 5; Academy lvl 10; Tribe: Spartans |
| 49 | Harbor | Infrastructure | 20 | 1.3 | 1440/1370/1290/495 | 4000 (pad 300, factor 1.16) | 4 | 3 | Shore village only (Shores of War scenario) |
| 50 | Barricade | Military | 20 | 1.28 | 110/170/70/50 | 2000 (pad 300, factor 1.16) | 1 | 0 | Tribe: Vikings |
Notes on the master table:

- Tribe ids in the official data: 1 Romans, 2 Teutons, 3 Gauls, 4 Nature, 5 Natars, 6 Egyptians, 7 Huns, 8 Spartans, 9 Vikings. [CONFIRMED — enum extracted from official KB bundle]
- Resource fields (gid 1–4): the KB dataset carries levels up to 25, with prerequisites "levels 11–12: capital or city only" and "levels 13+: capital only". The support quick summary states normal villages cap fields at 10 and cities at 12. Whether 25 is a real in-game hard cap for capitals is not stated anywhere official. [CONFIRMED for the 10/12/capital rules; level-25 cap UNVERIFIED]
- Wonder of the World: max level 100; per-resource cost capped at 1,000,000. [CONFIRMED — KB]

## 3. Tribe-specific buildings [CONFIRMED — KB prerequisites + official articles]

| Building (gid) | Tribe | Requirements | Effect |
|---|---|---|---|
| City Wall (31) | Romans | — | def bonus ×1.03^lvl (lvl20 +80.6%), flat def 10/lvl (lvl20 = 200) |
| Earth Wall (32) | Teutons | — | ×1.02^lvl (lvl20 +48.6%), flat 6/lvl |
| Palisade (33) | Gauls | — | ×1.025^lvl (lvl20 +63.9%), flat 8/lvl |
| Stone Wall (42) | Egyptians | — | ×1.025^lvl (lvl20 +63.9%), flat 8/lvl |
| Makeshift Wall (43) | Huns | — | ×1.015^lvl (lvl20 +34.7%), flat 6/lvl |
| Defensive Wall (47) | Spartans | — | ×1.02^lvl (lvl20 +48.6%), flat 10/lvl |
| Barricade (50) | Vikings | — | ×1.015^lvl (lvl20 +34.7%), flat 6/lvl |
| Horse Drinking Trough (41) | Romans | Stable 20, Rally Point 10 | stable training time ×(1−0.01·lvl); (community sources also claim cavalry upkeep reductions at lvl 10/15/20 — NOT in official KB effect data) |
| Brewery (35) | Teutons | capital only; Granary (or Great Granary) 20, Rally Point 10 | +1% attack per level (max +20% at lvl 20); enables Brewery celebration (duration 259,200s = 72h at 1x per KB data); costFactor 1.24, timeFactor 1.13 |
| Trapper (36) | Gauls | Rally Point 1 | traps: lvl1 = 10, lvl10 = 154, lvl20 = 400 (full per-level list in data JSON) |
| Waterworks (45) | Egyptians | Hero's Mansion 10 | +5% oasis bonus per level (lvl 20 = +100%, i.e. doubles oasis production bonus); costFactor 1.31 |
| Command Center (44) | Huns | MB 5; village has no Residence and no Palace | expansion slots at lvl 10/15/20 (3 total, like Palace) but cannot make village capital; costFactor 1.22; cheaper than Palace |
| Asclepeion (48) | Spartans | MB 5, Academy 10 | replaces Hospital; 60% of battle losses become wounded (vs 40% for Hospital); healing time factor 0.9^(lvl−1); CP base 5 (vs Hospital 4) |
| Hospital (46) | Romans, Teutons, Gauls, Egyptians, Huns, Vikings (all except Spartans) | MB 10, Academy 15 | 40% of losses become wounded; heal cost = training cost; heal time = half of same-level barracks/stable training; unhealed wounded die 10%/day |
| Harbor (49) | any tribe, shore villages only (Shores of War scenario servers) | shore village | ships: lvl1 = 1, lvl10 = 55, lvl20 = 210 |

Sources: KB dataset; [S-adm]; [S-exp]; [U-hosp]; [S-sparta]. Hospital/Asclepeion wounded percentages: [U-hosp] mirror of official article + official Indonesian-language support article — [CONFIRMED].

Other notable restrictions from the official dataset [CONFIRMED — KB]:

- **Palace (26)**: requires Embassy 1 + MB 5; village must have no Residence and no Command Center; **only one Palace per account**; expansion slots at 10/15/20; only building that lets you declare the village capital.
- **Residence (25)**: MB 5; no Palace/Command Center in village; slots at 10 and 20.
- **Stonemason's Lodge (34)**: capital only, MB 5. Durability bonus per level.
- **Great Barracks (29) / Great Stable (30)**: Barracks/Stable 20, **non-capital villages only**. (The 3× training-cost multiplier is well known but is not part of the KB building data — [UNVERIFIED here].)
- **Great Warehouse (38) / Great Granary (39)**: MB 10 + **storage artifact** ("StorageArtefact" prerequisite in official data — i.e. the Great Storage construction plan artifacts); 3× capacity of the normal building.
- **Treasury (27)**: MB 10, not in WW village. **Tournament Square (14)**: Rally Point 15. **Town Hall (24)**: MB 10 + Academy 10. **Smithy (13)**: MB 3 + Academy 1. **Workshop (21)**: Academy 10, MB 5. **Stable (20)**: Smithy 3 + Academy 5. **Trade Office (28)**: Marketplace 20, Stable 10. **Marketplace (17)**: MB 3, Warehouse 1 (or Great Warehouse), Granary 1 (or Great Granary).
- **Wonder of the World (40)**: WW villages only (Natar-conquered).

## 4. Build queue rules (T4.6)

- **Romans: "can build two things simultaneously by default: one in the village center and one in the resource fields."** Direct official quote. [CONFIRMED — S-quick]
- **All other tribes (Teutons, Gauls, Egyptians, Huns, Spartans, Vikings): 1 construction at a time** (either a building or a field). Official article states it only for Romans by implication; explicitly confirmed by community references (wikitravian building-queue page; Fandom). [CONFIRMED — 2+ non-kirilloid sources, but official text only implies it]
- **Plus account: +1 waiting queue slot.** "With a Plus Account a third order can be queued, but this third order only begins processing once one of the first two is complete" (Roman wording; for other tribes it is a second, waiting, order). [CONFIRMED — S-quick, S-gold]
- **Gold Club "Master Builder": lets you queue constructions even when resources are missing** (a wish-list queue that auto-starts orders when resources arrive). [CONFIRMED — S-gold]. Queue capacity commonly reported as 5 orders. [UNVERIFIED]
- **Gold instant finish**: "Complete construction or research instantly" for Gold. [CONFIRMED — S-gold]. The commonly-reported rules (2 Gold for whole queue; free if remaining time < 5 min) — [UNVERIFIED].
- There is no tribe other than Romans with any queue-width bonus in T4.6. [CONFIRMED by omission in official material]

## 5. Demolition (Main Building 10+)

- Requires **Main Building level ≥ 10**. [CONFIRMED — S-demo]
- Demolition removes **one level at a time** until level 0 (building destroyed). [CONFIRMED — S-demo/U-demo]
- Options: (a) level-by-level with "the respective destruction time"; (b) Gold instant completion of the current level's demolition; (c) Gold "instant complete destruction" of the whole building at once. [CONFIRMED — S-demo, U-demo]
- Demolition, like construction, "takes time based on the Main Building's level" (i.e. higher MB demolishes faster). The **exact demolition-time formula is not published** — commonly assumed equal to the construction time of the level being removed (with MB reduction), but no official or reliable secondary source states this. [UNVERIFIED — open question]
- No resources are refunded. [UNVERIFIED — official article silent; community consensus is no refund]
- Effects of a demolished building end immediately, BUT "any started and ongoing orders usually continue until finished, even after the building was demolished" (troop training, Academy research, Smithy upgrades), and order duration is unaffected by building level changes after start. [CONFIRMED — S-quick]
- Alternative: catapulting your own village (or asking an ally) is officially suggested as a faster/cheaper way to clear buildings. [CONFIRMED — S-demo]
- You can demolish a Palace to rebuild it elsewhere (one-per-account rule works this way). [CONFIRMED — S-adm]

## 6. Per-level tables for key buildings

All values from the official knowledgebase dataset [CONFIRMED — KB]. Costs are Wood/Clay/Iron/Crop; Pop is cumulative; CP is per-day total at that level; Time is at **1x speed with Main Building level 1** (apply ×0.964^(MB−1) and ÷speed). Times shown rounded to the nearest second. The complete dataset for **all** buildings incl. every level is in `data/kb-buildings.json`.

### Warehouse (gid 10)

Base cost 130/160/90/40, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: Main Building lvl 1.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | storageWarehouse |
|---|---|---|---|---|---|---|---|---|
| 1 | 130 | 160 | 90 | 40 | 1 | 1 | 0:33:20 | 1200 |
| 2 | 165 | 205 | 115 | 50 | 2 | 1 | 0:43:40 | 1700 |
| 3 | 215 | 260 | 145 | 65 | 3 | 2 | 0:55:39 | 2300 |
| 4 | 275 | 335 | 190 | 85 | 4 | 2 | 1:09:33 | 3100 |
| 5 | 350 | 430 | 240 | 105 | 5 | 2 | 1:25:41 | 4000 |
| 6 | 445 | 550 | 310 | 135 | 6 | 3 | 1:44:24 | 5000 |
| 7 | 570 | 705 | 395 | 175 | 7 | 4 | 2:06:06 | 6300 |
| 8 | 730 | 900 | 505 | 225 | 8 | 4 | 2:31:17 | 7800 |
| 9 | 935 | 1155 | 650 | 290 | 9 | 5 | 3:00:29 | 9600 |
| 10 | 1200 | 1475 | 830 | 370 | 10 | 6 | 3:34:21 | 11800 |
| 11 | 1535 | 1890 | 1065 | 470 | 12 | 7 | 4:13:39 | 14400 |
| 12 | 1965 | 2420 | 1360 | 605 | 14 | 9 | 4:59:14 | 17600 |
| 13 | 2515 | 3095 | 1740 | 775 | 16 | 11 | 5:52:07 | 21400 |
| 14 | 3220 | 3960 | 2230 | 990 | 18 | 13 | 6:53:27 | 25900 |
| 15 | 4120 | 5070 | 2850 | 1270 | 20 | 15 | 8:04:37 | 31300 |
| 16 | 5275 | 6490 | 3650 | 1625 | 22 | 18 | 9:27:09 | 37900 |
| 17 | 6750 | 8310 | 4675 | 2075 | 24 | 22 | 11:02:54 | 45700 |
| 18 | 8640 | 10635 | 5980 | 2660 | 26 | 27 | 12:53:57 | 55100 |
| 19 | 11060 | 13610 | 7655 | 3405 | 28 | 32 | 15:02:47 | 66400 |
| 20 | 14155 | 17420 | 9800 | 4355 | 30 | 38 | 17:32:14 | 80000 |

### Granary (gid 11)

Base cost 80/100/70/20, cost factor 1.28; time base 1600s, factor 1.16, padding 300. Prereqs: Main Building lvl 1.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | storageGranary |
|---|---|---|---|---|---|---|---|---|
| 1 | 80 | 100 | 70 | 20 | 1 | 1 | 0:26:40 | 1200 |
| 2 | 100 | 130 | 90 | 25 | 2 | 1 | 0:35:56 | 1700 |
| 3 | 130 | 165 | 115 | 35 | 3 | 2 | 0:46:41 | 2300 |
| 4 | 170 | 210 | 145 | 40 | 4 | 2 | 0:59:09 | 3100 |
| 5 | 215 | 270 | 190 | 55 | 5 | 2 | 1:13:37 | 4000 |
| 6 | 275 | 345 | 240 | 70 | 6 | 3 | 1:30:24 | 5000 |
| 7 | 350 | 440 | 310 | 90 | 7 | 4 | 1:49:51 | 6300 |
| 8 | 450 | 565 | 395 | 115 | 8 | 4 | 2:12:26 | 7800 |
| 9 | 575 | 720 | 505 | 145 | 9 | 5 | 2:38:37 | 9600 |
| 10 | 740 | 920 | 645 | 185 | 10 | 6 | 3:09:00 | 11800 |
| 11 | 945 | 1180 | 825 | 235 | 12 | 7 | 3:44:15 | 14400 |
| 12 | 1210 | 1510 | 1060 | 300 | 14 | 9 | 4:25:07 | 17600 |
| 13 | 1545 | 1935 | 1355 | 385 | 16 | 11 | 5:12:33 | 21400 |
| 14 | 1980 | 2475 | 1735 | 495 | 18 | 13 | 6:07:33 | 25900 |
| 15 | 2535 | 3170 | 2220 | 635 | 20 | 15 | 7:11:22 | 31300 |
| 16 | 3245 | 4055 | 2840 | 810 | 22 | 18 | 8:25:23 | 37900 |
| 17 | 4155 | 5190 | 3635 | 1040 | 24 | 22 | 9:51:14 | 45700 |
| 18 | 5315 | 6645 | 4650 | 1330 | 26 | 27 | 11:30:50 | 55100 |
| 19 | 6805 | 8505 | 5955 | 1700 | 28 | 32 | 13:26:22 | 66400 |
| 20 | 8710 | 10890 | 7620 | 2180 | 30 | 38 | 15:40:23 | 80000 |

### Main Building (gid 15)

Base cost 70/40/60/20, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: none.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | buildingTime |
|---|---|---|---|---|---|---|---|---|
| 1 | 70 | 40 | 60 | 20 | 2 | 2 | 0:33:20 | 1 |
| 2 | 90 | 50 | 75 | 25 | 3 | 3 | 0:43:40 | 0.964 |
| 3 | 115 | 65 | 100 | 35 | 4 | 3 | 0:55:39 | 0.9293 |
| 4 | 145 | 85 | 125 | 40 | 5 | 4 | 1:09:33 | 0.8958 |
| 5 | 190 | 105 | 160 | 55 | 6 | 5 | 1:25:41 | 0.8636 |
| 6 | 240 | 135 | 205 | 70 | 8 | 6 | 1:44:24 | 0.8325 |
| 7 | 310 | 175 | 265 | 90 | 10 | 7 | 2:06:06 | 0.8025 |
| 8 | 395 | 225 | 340 | 115 | 12 | 9 | 2:31:17 | 0.7736 |
| 9 | 505 | 290 | 430 | 145 | 14 | 10 | 3:00:29 | 0.7458 |
| 10 | 645 | 370 | 555 | 185 | 16 | 12 | 3:34:21 | 0.7189 |
| 11 | 825 | 470 | 710 | 235 | 18 | 15 | 4:13:39 | 0.6931 |
| 12 | 1060 | 605 | 905 | 300 | 20 | 18 | 4:59:14 | 0.6681 |
| 13 | 1355 | 775 | 1160 | 385 | 22 | 21 | 5:52:07 | 0.6441 |
| 14 | 1735 | 990 | 1485 | 495 | 24 | 26 | 6:53:27 | 0.6209 |
| 15 | 2220 | 1270 | 1900 | 635 | 26 | 31 | 8:04:37 | 0.5985 |
| 16 | 2840 | 1625 | 2435 | 810 | 29 | 37 | 9:27:09 | 0.577 |
| 17 | 3635 | 2075 | 3115 | 1040 | 32 | 44 | 11:02:54 | 0.5562 |
| 18 | 4650 | 2660 | 3990 | 1330 | 35 | 53 | 12:53:57 | 0.5362 |
| 19 | 5955 | 3405 | 5105 | 1700 | 38 | 64 | 15:02:47 | 0.5169 |
| 20 | 7620 | 4355 | 6535 | 2180 | 41 | 77 | 17:32:14 | 0.4983 |

### Marketplace (gid 17)

Base cost 80/70/120/70, cost factor 1.28; time base 1800s, factor 1.16, padding 300. Prereqs: Main Building lvl 3; Warehouse or Great Warehouse lvl 1; Granary or Great Granary lvl 1.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | merchants |
|---|---|---|---|---|---|---|---|---|
| 1 | 80 | 70 | 120 | 70 | 4 | 4 | 0:30:00 | 1 |
| 2 | 100 | 90 | 155 | 90 | 6 | 4 | 0:39:48 | 2 |
| 3 | 130 | 115 | 195 | 115 | 8 | 5 | 0:51:10 | 3 |
| 4 | 170 | 145 | 250 | 145 | 10 | 6 | 1:04:21 | 4 |
| 5 | 215 | 190 | 320 | 190 | 12 | 7 | 1:19:39 | 5 |
| 6 | 275 | 240 | 410 | 240 | 15 | 9 | 1:37:24 | 6 |
| 7 | 350 | 310 | 530 | 310 | 18 | 11 | 1:57:59 | 7 |
| 8 | 450 | 395 | 675 | 395 | 21 | 13 | 2:21:51 | 8 |
| 9 | 575 | 505 | 865 | 505 | 24 | 15 | 2:49:33 | 9 |
| 10 | 740 | 645 | 1105 | 645 | 27 | 19 | 3:21:41 | 10 |
| 11 | 945 | 825 | 1415 | 825 | 30 | 22 | 3:58:57 | 11 |
| 12 | 1210 | 1060 | 1815 | 1060 | 33 | 27 | 4:42:11 | 12 |
| 13 | 1545 | 1355 | 2320 | 1355 | 36 | 32 | 5:32:20 | 13 |
| 14 | 1980 | 1735 | 2970 | 1735 | 39 | 39 | 6:30:30 | 14 |
| 15 | 2535 | 2220 | 3805 | 2220 | 42 | 46 | 7:37:59 | 15 |
| 16 | 3245 | 2840 | 4870 | 2840 | 46 | 55 | 8:56:16 | 16 |
| 17 | 4155 | 3635 | 6230 | 3635 | 50 | 67 | 10:27:04 | 17 |
| 18 | 5315 | 4650 | 7975 | 4650 | 54 | 80 | 12:12:24 | 18 |
| 19 | 6805 | 5955 | 10210 | 5955 | 58 | 96 | 14:14:35 | 19 |
| 20 | 8710 | 7620 | 13065 | 7620 | 62 | 115 | 16:36:19 | 20 |

### Embassy (gid 18)

Base cost 180/130/150/80, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: Main Building lvl 1.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) |
|---|---|---|---|---|---|---|---|
| 1 | 180 | 130 | 150 | 80 | 3 | 5 | 0:33:20 |
| 2 | 230 | 165 | 190 | 100 | 5 | 6 | 0:43:40 |
| 3 | 295 | 215 | 245 | 130 | 7 | 7 | 0:55:39 |
| 4 | 375 | 275 | 315 | 170 | 9 | 8 | 1:09:33 |
| 5 | 485 | 350 | 405 | 215 | 11 | 10 | 1:25:41 |
| 6 | 620 | 445 | 515 | 275 | 13 | 12 | 1:44:24 |
| 7 | 790 | 570 | 660 | 350 | 15 | 14 | 2:06:06 |
| 8 | 1015 | 730 | 845 | 450 | 17 | 17 | 2:31:17 |
| 9 | 1295 | 935 | 1080 | 575 | 19 | 21 | 3:00:29 |
| 10 | 1660 | 1200 | 1385 | 740 | 21 | 25 | 3:34:21 |
| 11 | 2125 | 1535 | 1770 | 945 | 24 | 30 | 4:13:39 |
| 12 | 2720 | 1965 | 2265 | 1210 | 27 | 36 | 4:59:14 |
| 13 | 3480 | 2515 | 2900 | 1545 | 30 | 43 | 5:52:07 |
| 14 | 4455 | 3220 | 3715 | 1980 | 33 | 51 | 6:53:27 |
| 15 | 5705 | 4120 | 4755 | 2535 | 36 | 62 | 8:04:37 |
| 16 | 7300 | 5275 | 6085 | 3245 | 39 | 74 | 9:27:09 |
| 17 | 9345 | 6750 | 7790 | 4155 | 42 | 89 | 11:02:54 |
| 18 | 11965 | 8640 | 9970 | 5315 | 45 | 106 | 12:53:57 |
| 19 | 15315 | 11060 | 12760 | 6805 | 48 | 128 | 15:02:47 |
| 20 | 19600 | 14155 | 16335 | 8710 | 51 | 153 | 17:32:14 |

### Barracks (gid 19)

Base cost 210/140/260/120, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: Rally Point lvl 1; Main Building lvl 3.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | trainingTimeBarracks |
|---|---|---|---|---|---|---|---|---|
| 1 | 210 | 140 | 260 | 120 | 4 | 1 | 0:33:20 | 1 |
| 2 | 270 | 180 | 335 | 155 | 6 | 1 | 0:43:40 | 0.9 |
| 3 | 345 | 230 | 425 | 195 | 8 | 2 | 0:55:39 | 0.81 |
| 4 | 440 | 295 | 545 | 250 | 10 | 2 | 1:09:33 | 0.729 |
| 5 | 565 | 375 | 700 | 320 | 12 | 2 | 1:25:41 | 0.6561 |
| 6 | 720 | 480 | 895 | 410 | 15 | 3 | 1:44:24 | 0.5905 |
| 7 | 925 | 615 | 1145 | 530 | 18 | 4 | 2:06:06 | 0.5314 |
| 8 | 1180 | 790 | 1465 | 675 | 21 | 4 | 2:31:17 | 0.4783 |
| 9 | 1515 | 1010 | 1875 | 865 | 24 | 5 | 3:00:29 | 0.4305 |
| 10 | 1935 | 1290 | 2400 | 1105 | 27 | 6 | 3:34:21 | 0.3874 |
| 11 | 2480 | 1655 | 3070 | 1415 | 30 | 7 | 4:13:39 | 0.3487 |
| 12 | 3175 | 2115 | 3930 | 1815 | 33 | 9 | 4:59:14 | 0.3138 |
| 13 | 4060 | 2710 | 5030 | 2320 | 36 | 11 | 5:52:07 | 0.2824 |
| 14 | 5200 | 3465 | 6435 | 2970 | 39 | 13 | 6:53:27 | 0.2542 |
| 15 | 6655 | 4435 | 8240 | 3805 | 42 | 15 | 8:04:37 | 0.2288 |
| 16 | 8520 | 5680 | 10545 | 4870 | 46 | 18 | 9:27:09 | 0.2059 |
| 17 | 10905 | 7270 | 13500 | 6230 | 50 | 22 | 11:02:54 | 0.1853 |
| 18 | 13955 | 9305 | 17280 | 7975 | 54 | 27 | 12:53:57 | 0.1668 |
| 19 | 17865 | 11910 | 22120 | 10210 | 58 | 32 | 15:02:47 | 0.1501 |
| 20 | 22865 | 15245 | 28310 | 13065 | 62 | 38 | 17:32:14 | 0.1351 |

### Academy (gid 22)

Base cost 220/160/90/40, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: Barracks lvl 3; Main Building lvl 3.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) |
|---|---|---|---|---|---|---|---|
| 1 | 220 | 160 | 90 | 40 | 4 | 5 | 0:33:20 |
| 2 | 280 | 205 | 115 | 50 | 6 | 6 | 0:43:40 |
| 3 | 360 | 260 | 145 | 65 | 8 | 7 | 0:55:39 |
| 4 | 460 | 335 | 190 | 85 | 10 | 8 | 1:09:33 |
| 5 | 590 | 430 | 240 | 105 | 12 | 10 | 1:25:41 |
| 6 | 755 | 550 | 310 | 135 | 15 | 12 | 1:44:24 |
| 7 | 970 | 705 | 395 | 175 | 18 | 14 | 2:06:06 |
| 8 | 1240 | 900 | 505 | 225 | 21 | 17 | 2:31:17 |
| 9 | 1585 | 1155 | 650 | 290 | 24 | 21 | 3:00:29 |
| 10 | 2030 | 1475 | 830 | 370 | 27 | 25 | 3:34:21 |
| 11 | 2595 | 1890 | 1065 | 470 | 30 | 30 | 4:13:39 |
| 12 | 3325 | 2420 | 1360 | 605 | 33 | 36 | 4:59:14 |
| 13 | 4255 | 3095 | 1740 | 775 | 36 | 43 | 5:52:07 |
| 14 | 5445 | 3960 | 2230 | 990 | 39 | 51 | 6:53:27 |
| 15 | 6970 | 5070 | 2850 | 1270 | 42 | 62 | 8:04:37 |
| 16 | 8925 | 6490 | 3650 | 1625 | 46 | 74 | 9:27:09 |
| 17 | 11425 | 8310 | 4675 | 2075 | 50 | 89 | 11:02:54 |
| 18 | 14620 | 10635 | 5980 | 2660 | 54 | 106 | 12:53:57 |
| 19 | 18715 | 13610 | 7655 | 3405 | 58 | 128 | 15:02:47 |
| 20 | 23955 | 17420 | 9800 | 4355 | 62 | 153 | 17:32:14 |

### Cranny (gid 23)

Base cost 40/50/30/10, cost factor 1.28; time base 300s, factor 1.16, padding 300. Prereqs: none.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | storageCranny | storageCrannyGaul |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 50 | 30 | 10 | 0 | 1 | 0:05:00 | 200 | 300 |
| 2 | 50 | 65 | 40 | 15 | 0 | 1 | 0:10:48 | 260 | 390 |
| 3 | 65 | 80 | 50 | 15 | 0 | 2 | 0:17:32 | 340 | 510 |
| 4 | 85 | 105 | 65 | 20 | 0 | 2 | 0:25:20 | 440 | 660 |
| 5 | 105 | 135 | 80 | 25 | 0 | 2 | 0:34:23 | 560 | 840 |
| 6 | 135 | 170 | 105 | 35 | 1 | 3 | 0:44:53 | 720 | 1080 |
| 7 | 175 | 220 | 130 | 45 | 2 | 4 | 0:57:04 | 920 | 1380 |
| 8 | 225 | 280 | 170 | 55 | 3 | 4 | 1:11:12 | 1200 | 1800 |
| 9 | 290 | 360 | 215 | 70 | 4 | 5 | 1:27:36 | 1540 | 2310 |
| 10 | 370 | 460 | 275 | 90 | 5 | 6 | 1:46:36 | 2000 | 3000 |

### Town Hall (gid 24)

Base cost 1250/1110/1260/600, cost factor 1.28; time base 12500s, factor 1.16, padding 300. Prereqs: Main Building lvl 10; Academy lvl 10.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | smallPartyTime | largePartyTime |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1250 | 1110 | 1260 | 600 | 4 | 6 | 3:28:20 | 86400 | — |
| 2 | 1600 | 1420 | 1615 | 770 | 6 | 7 | 4:06:40 | 83289.6 | — |
| 3 | 2050 | 1820 | 2065 | 985 | 8 | 9 | 4:51:08 | 80291.1744 | — |
| 4 | 2620 | 2330 | 2640 | 1260 | 10 | 10 | 5:42:43 | 77400.6921 | — |
| 5 | 3355 | 2980 | 3380 | 1610 | 12 | 12 | 6:42:33 | 74614.2672 | — |
| 6 | 4295 | 3815 | 4330 | 2060 | 15 | 15 | 7:51:57 | 71928.1536 | — |
| 7 | 5500 | 4880 | 5540 | 2640 | 18 | 18 | 9:12:28 | 69338.7401 | — |
| 8 | 7035 | 6250 | 7095 | 3380 | 21 | 21 | 10:45:52 | 66842.5454 | — |
| 9 | 9005 | 8000 | 9080 | 4325 | 24 | 26 | 12:34:12 | 64436.2138 | — |
| 10 | 11530 | 10240 | 11620 | 5535 | 27 | 31 | 14:39:53 | 62116.5101 | 155291.2752 |
| 11 | 14755 | 13105 | 14875 | 7085 | 30 | 37 | 17:05:39 | 59880.3157 | 149700.7893 |
| 12 | 18890 | 16775 | 19040 | 9065 | 33 | 45 | 19:54:46 | 57724.6244 | 144311.5609 |
| 13 | 24180 | 21470 | 24370 | 11605 | 36 | 53 | 23:10:55 | 55646.5379 | 139116.3447 |
| 14 | 30950 | 27480 | 31195 | 14855 | 39 | 64 | 26:58:28 | 53643.2625 | 134108.1563 |
| 15 | 39615 | 35175 | 39930 | 19015 | 42 | 77 | 31:22:26 | 51712.1051 | 129280.2627 |
| 16 | 50705 | 45025 | 51110 | 24340 | 46 | 92 | 36:28:37 | 49850.4693 | 124626.1732 |
| 17 | 64905 | 57635 | 65425 | 31155 | 50 | 111 | 42:23:48 | 48055.8524 | 120139.631 |
| 18 | 83075 | 73770 | 83740 | 39875 | 54 | 133 | 49:15:48 | 46325.8417 | 115814.6043 |
| 19 | 106340 | 94430 | 107190 | 51040 | 58 | 160 | 57:13:44 | 44658.1114 | 111645.2785 |
| 20 | 136115 | 120870 | 137200 | 65335 | 62 | 192 | 66:28:07 | 43050.4194 | 107626.0485 |

### Residence (gid 25)

Base cost 580/460/350/180, cost factor 1.28; time base 2000s, factor 1.16, padding 300. Prereqs: Main Building lvl 5; No Palace in village; No Command Center in village.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | slots | trainingTimeResidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 580 | 460 | 350 | 180 | 1 | 2 | 0:33:20 | — | 1 |
| 2 | 740 | 590 | 450 | 230 | 2 | 3 | 0:43:40 | — | 0.9 |
| 3 | 950 | 755 | 575 | 295 | 3 | 3 | 0:55:39 | — | 0.81 |
| 4 | 1215 | 965 | 735 | 375 | 4 | 4 | 1:09:33 | — | 0.729 |
| 5 | 1555 | 1235 | 940 | 485 | 5 | 5 | 1:25:41 | — | 0.6561 |
| 6 | 1995 | 1580 | 1205 | 620 | 6 | 6 | 1:44:24 | — | 0.5905 |
| 7 | 2550 | 2025 | 1540 | 790 | 7 | 7 | 2:06:06 | — | 0.5314 |
| 8 | 3265 | 2590 | 1970 | 1015 | 8 | 9 | 2:31:17 | — | 0.4783 |
| 9 | 4180 | 3315 | 2520 | 1295 | 9 | 10 | 3:00:29 | — | 0.4305 |
| 10 | 5350 | 4245 | 3230 | 1660 | 10 | 12 | 3:34:21 | 1 | 0.3874 |
| 11 | 6845 | 5430 | 4130 | 2125 | 12 | 15 | 4:13:39 | — | 0.3487 |
| 12 | 8765 | 6950 | 5290 | 2720 | 14 | 18 | 4:59:14 | — | 0.3138 |
| 13 | 11220 | 8900 | 6770 | 3480 | 16 | 21 | 5:52:07 | — | 0.2824 |
| 14 | 14360 | 11390 | 8665 | 4455 | 18 | 26 | 6:53:27 | — | 0.2542 |
| 15 | 18380 | 14580 | 11090 | 5705 | 20 | 31 | 8:04:37 | — | 0.2288 |
| 16 | 23530 | 18660 | 14200 | 7300 | 22 | 37 | 9:27:09 | — | 0.2059 |
| 17 | 30115 | 23885 | 18175 | 9345 | 24 | 44 | 11:02:54 | — | 0.1853 |
| 18 | 38550 | 30570 | 23260 | 11965 | 26 | 53 | 12:53:57 | — | 0.1668 |
| 19 | 49340 | 39130 | 29775 | 15315 | 28 | 64 | 15:02:47 | — | 0.1501 |
| 20 | 63155 | 50090 | 38110 | 19600 | 30 | 77 | 17:32:14 | 2 | 0.1351 |

### Palace (gid 26)

Base cost 550/800/750/250, cost factor 1.28; time base 5000s, factor 1.16, padding 300. Prereqs: Embassy lvl 1; Main Building lvl 5; No Residence in village; No Command Center in village; Only one per account.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | slots | trainingTimeResidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 550 | 800 | 750 | 250 | 1 | 6 | 1:23:20 | — | 1 |
| 2 | 705 | 1025 | 960 | 320 | 2 | 7 | 1:41:40 | — | 0.9 |
| 3 | 900 | 1310 | 1230 | 410 | 3 | 9 | 2:02:56 | — | 0.81 |
| 4 | 1155 | 1680 | 1575 | 525 | 4 | 10 | 2:27:36 | — | 0.729 |
| 5 | 1475 | 2145 | 2015 | 670 | 5 | 12 | 2:56:13 | — | 0.6561 |
| 6 | 1890 | 2750 | 2575 | 860 | 6 | 15 | 3:29:25 | — | 0.5905 |
| 7 | 2420 | 3520 | 3300 | 1100 | 7 | 18 | 4:07:55 | — | 0.5314 |
| 8 | 3095 | 4505 | 4220 | 1405 | 8 | 21 | 4:52:35 | — | 0.4783 |
| 9 | 3965 | 5765 | 5405 | 1800 | 9 | 26 | 5:44:24 | — | 0.4305 |
| 10 | 5075 | 7380 | 6920 | 2305 | 10 | 31 | 6:44:30 | 1 | 0.3874 |
| 11 | 6495 | 9445 | 8855 | 2950 | 12 | 37 | 7:54:14 | — | 0.3487 |
| 12 | 8310 | 12090 | 11335 | 3780 | 14 | 45 | 9:15:06 | — | 0.3138 |
| 13 | 10640 | 15475 | 14505 | 4835 | 16 | 53 | 10:48:55 | — | 0.2824 |
| 14 | 13615 | 19805 | 18570 | 6190 | 18 | 64 | 12:37:45 | — | 0.2542 |
| 15 | 17430 | 25355 | 23770 | 7925 | 20 | 77 | 14:43:59 | 2 | 0.2288 |
| 16 | 22310 | 32450 | 30425 | 10140 | 22 | 92 | 17:10:25 | — | 0.2059 |
| 17 | 28560 | 41540 | 38940 | 12980 | 24 | 111 | 20:00:18 | — | 0.1853 |
| 18 | 36555 | 53170 | 49845 | 16615 | 26 | 133 | 23:17:20 | — | 0.1668 |
| 19 | 46790 | 68055 | 63805 | 21270 | 28 | 160 | 27:05:55 | — | 0.1501 |
| 20 | 59890 | 87110 | 81670 | 27225 | 30 | 192 | 31:31:04 | 3 | 0.1351 |

### Command Center (gid 44)

Base cost 1600/1250/1050/200, cost factor 1.22; time base 2500s, factor 1.16, padding 300. Prereqs: Main Building lvl 5; No Residence in village; No Palace in village; Tribe: Huns.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | slots | trainingTimeResidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1600 | 1250 | 1050 | 200 | 1 | 2 | 0:41:40 | — | 1 |
| 2 | 1950 | 1525 | 1280 | 245 | 2 | 3 | 0:53:20 | — | 0.9 |
| 3 | 2380 | 1860 | 1565 | 300 | 3 | 3 | 1:06:52 | — | 0.81 |
| 4 | 2905 | 2270 | 1905 | 365 | 4 | 4 | 1:22:34 | — | 0.729 |
| 5 | 3545 | 2770 | 2325 | 445 | 5 | 5 | 1:40:47 | — | 0.6561 |
| 6 | 4325 | 3380 | 2840 | 540 | 6 | 6 | 2:01:54 | — | 0.5905 |
| 7 | 5275 | 4120 | 3460 | 660 | 7 | 7 | 2:26:24 | — | 0.5314 |
| 8 | 6435 | 5030 | 4225 | 805 | 8 | 9 | 2:54:50 | — | 0.4783 |
| 9 | 7850 | 6135 | 5155 | 980 | 9 | 10 | 3:27:48 | — | 0.4305 |
| 10 | 9580 | 7485 | 6285 | 1195 | 10 | 12 | 4:06:03 | 1 | 0.3874 |
| 11 | 11685 | 9130 | 7670 | 1460 | 12 | 15 | 4:50:25 | — | 0.3487 |
| 12 | 14260 | 11140 | 9355 | 1780 | 14 | 18 | 5:41:53 | — | 0.3138 |
| 13 | 17395 | 13590 | 11415 | 2175 | 16 | 21 | 6:41:35 | — | 0.2824 |
| 14 | 21225 | 16580 | 13925 | 2655 | 18 | 26 | 7:50:50 | — | 0.2542 |
| 15 | 25890 | 20230 | 16990 | 3235 | 20 | 31 | 9:11:10 | 2 | 0.2288 |
| 16 | 31590 | 24680 | 20730 | 3950 | 22 | 37 | 10:44:22 | — | 0.2059 |
| 17 | 38535 | 30105 | 25290 | 4815 | 24 | 44 | 12:32:28 | — | 0.1853 |
| 18 | 47015 | 36730 | 30855 | 5875 | 26 | 53 | 14:37:51 | — | 0.1668 |
| 19 | 57360 | 44810 | 37640 | 7170 | 28 | 64 | 17:03:19 | — | 0.1501 |
| 20 | 69975 | 54670 | 45925 | 8745 | 30 | 77 | 19:52:02 | 3 | 0.1351 |

### Waterworks (gid 45)

Base cost 910/945/910/340, cost factor 1.31; time base 2000s, factor 1.16, padding 300. Prereqs: Hero&#39;s Mansion lvl 10; Tribe: Egyptians.

| Lvl | Wood | Clay | Iron | Crop | Pop (cum.) | CP | Time (1x, MB1) | oasisBoost |
|---|---|---|---|---|---|---|---|---|
| 1 | 910 | 945 | 910 | 340 | 1 | 2 | 0:33:20 | 0.05 |
| 2 | 1190 | 1240 | 1190 | 445 | 2 | 3 | 0:43:40 | 0.1 |
| 3 | 1560 | 1620 | 1560 | 585 | 3 | 3 | 0:55:39 | 0.15 |
| 4 | 2045 | 2125 | 2045 | 765 | 4 | 4 | 1:09:33 | 0.2 |
| 5 | 2680 | 2785 | 2680 | 1000 | 5 | 5 | 1:25:41 | 0.25 |
| 6 | 3510 | 3645 | 3510 | 1310 | 6 | 6 | 1:44:24 | 0.3 |
| 7 | 4600 | 4775 | 4600 | 1720 | 7 | 7 | 2:06:06 | 0.35 |
| 8 | 6025 | 6255 | 6025 | 2250 | 8 | 9 | 2:31:17 | 0.4 |
| 9 | 7890 | 8195 | 7890 | 2950 | 9 | 10 | 3:00:29 | 0.45 |
| 10 | 10340 | 10735 | 10340 | 3865 | 10 | 12 | 3:34:21 | 0.5 |
| 11 | 13545 | 14065 | 13545 | 5060 | 12 | 15 | 4:13:39 | 0.55 |
| 12 | 17745 | 18425 | 17745 | 6630 | 14 | 18 | 4:59:14 | 0.6 |
| 13 | 23245 | 24135 | 23245 | 8685 | 16 | 21 | 5:52:07 | 0.65 |
| 14 | 30450 | 31620 | 30450 | 11375 | 18 | 26 | 6:53:27 | 0.7 |
| 15 | 39890 | 41420 | 39890 | 14905 | 20 | 31 | 8:04:37 | 0.75 |
| 16 | 52255 | 54265 | 52255 | 19525 | 22 | 37 | 9:27:09 | 0.8 |
| 17 | 68450 | 71085 | 68450 | 25575 | 24 | 44 | 11:02:54 | 0.85 |
| 18 | 89670 | 93120 | 89670 | 33505 | 26 | 53 | 12:53:57 | 0.9 |
| 19 | 117470 | 121985 | 117470 | 43890 | 28 | 64 | 15:02:47 | 0.95 |
| 20 | 153885 | 159805 | 153885 | 57495 | 30 | 77 | 17:32:14 | 1 |

## 7. Data files

- `data/kb-buildings.json` — full official per-level dataset (49 buildings, every level: costs, time, CP, cumulative population, effects, prerequisites, formula parameters). Extracted 2026-08-12 from https://knowledgebase.legends.travian.com main.js bundle.
- `data/kb-names.json` — gid → English building name (official translations, `en-US`).

For the calculator, prefer computing from the formula parameters (`costBase`, `costFactor`, `timeBase`, `timeFactor`, `timePadding`, `cultureBase`, `supplyBase`) and validating against the per-level values.

## Open questions (verify in-game or with Travian support)

1. **Demolition time per level** — official sources only say demolition "takes time based on the Main Building's level". Is it exactly the construction time of the removed level × 0.964^(MB−1) ÷ speed? [UNVERIFIED]
2. **Resource refund on demolition** — assumed none, not officially stated. [UNVERIFIED]
3. **Build-time rounding** — official dataset stores fractional seconds (e.g. 63,134.00248 s); does the game floor or round to whole seconds, before or after MB/speed modifiers? Matters only at ±1s precision. [UNVERIFIED]
4. **Server speed division** — direction confirmed (faster servers build faster), plain `time / speed` matches the official stats tool and kirilloid, but no official formula text; check whether any minimum build time exists on x5/x10. [UNVERIFIED detail]
5. **MB reduction scope** — confirmed multiplier 0.964^(MB−1); verify it applies to resource fields and to the Wonder of the World identically. [UNVERIFIED detail]
6. **Resource field max level in capital** — official dataset carries levels to 25 (11–12 city/capital, 13+ capital); is 25 a real hard cap? Support articles only document 10 (village) / 12 (city). [UNVERIFIED]
7. **Initial (no-warehouse) storage = 800** — community consensus, not in extracted data. [UNVERIFIED]
8. **Horse Drinking Trough upkeep effect** — official KB effect data contains only the stable-training-time reduction (−1% per level). Kirilloid and community guides additionally claim cavalry crop-upkeep reductions (e.g. Equites Legati/Imperatoris/Caesaris −1 crop at levels 10/15/20). [DISPUTED — KB data vs community/kirilloid; verify in-game]
9. **Great Barracks/Great Stable 3× training cost** — well-known but not present in the extracted building data (it's a troop-cost multiplier, not a building stat). [UNVERIFIED here — belongs to the troops research domain]
10. **Master Builder queue depth (5 orders?) and instant-finish pricing (2 Gold / free under 5 minutes?)** — official pages confirm the features but not these numbers. [UNVERIFIED]
11. **Cranny capacity** — official KB data says 200 per level (2,000 at lvl 10), ×1.5 for Gauls (300/level, 3,000 at lvl 10). Older sources (incl. kirilloid t3.5 lineage: `roundP(10)(129.17^(lvl-1))` ≈ 100→1,000) give half of that — the KB values describe current T4.6; treat old numbers as outdated. Also verify Egyptian/hero-item cranny modifiers if any. [CONFIRMED current values from KB; discrepancy noted]
12. **Wounded-system availability** — Hospital appears in the official dataset for all tribes except Spartans; confirm which live 2026 servers actually enable Hospitals (it rolled out with/after Glory of Sparta ~2022 and is standard on current annual/regional specials; some classic servers may not have it). [UNVERIFIED]
