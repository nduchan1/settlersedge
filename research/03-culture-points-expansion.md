# Culture Points & Expansion — Travian: Legends (T4.6, researched 2026-08-12)

Research domain: everything needed for a "fastest second village" optimizer — CP production, CP
thresholds, celebrations, expansion buildings, settlers, and every other CP source.

**Tags:** [CONFIRMED] = official source, or 2+ independent non-kirilloid-derived sources agree ·
[DISPUTED] = sources disagree · [UNVERIFIED] = single source.

**Primary sources used:**
- Official support KB (new URL scheme `support.travian.com/en/articles/<id>-<slug>`; the old
  `/en/support/solutions/articles/70000…` freshdesk URLs now 404):
  - Culture Points (CP): https://support.travian.com/en/articles/51-culture-points-cp
  - Celebrations and Town Hall: https://support.travian.com/en/articles/82-celebrations-and-town-hall
  - Expansion Slots: https://support.travian.com/en/articles/52-expansion-slots
  - Guide: Palace, Residence and Command Center: https://support.travian.com/en/articles/216-guide-the-palace-residence-and-command-center
  - Passive culture points: https://support.travian.com/en/articles/174-passive-culture-points
  - Settling villages: https://support.travian.com/en/articles/56-settling-villages
  - Advanced Start: https://support.travian.com/en/articles/203-advanced-start and
    https://support.travian.com/en/articles/28-special-servers-advanced-start
  - Unit stats (incl. settlers): https://support.travian.com/en/articles/193-romans-community-week-unit-stats ,
    …/192-teutons-community-week-unit-stats , …/199-gauls-community-week-unit-stats
- **Official Travian: Legends Knowledge Base data bundle** (webpack app `travian_kb`; contains full
  per-level data for all 49 buildings: cost, build time, `culturePoints`, population,
  `smallPartyTime`/`largePartyTime`, `trainingTimeResidence`, `slots`). Extracted to
  `research/data`-grade JSON during this session (`kb-buildings.json`). This is official game data,
  the single best source found. It is Legends (has Command Center, Waterworks, Hospital — not Kingdoms).
- Official "Game versions and speed" overview (old URL
  https://support.travian.com/en/support/solutions/articles/7000068688-game-versions-and-speed ; full text
  mirrored verbatim at https://unofficialtravian.com/2025/10/game-versions-and-speed/ ).
- Cross-checks: travian.kirilloid.ru (live `js/units.js`), github.com/kirilloid/travian,
  travian.fandom.com (Town_hall, Celebrations, Settler, tribe pages), unofficialtravian.com mirrors.
- **Excluded:** support.kingdoms.com and wiki.binary-tools.de/Speed_Settling — those document
  *Travian Kingdoms* (menhirs, robber hideouts, different settler costs like 4000/3500/3200). Do not
  mix into a Legends calculator.

---

## Executive summary

1. **CP per building level = `round(cultureBase × 1.2^level)`** per day. Confirmed against official
   KB per-level data for all 49 buildings and by kirilloid's identical formula. Bases range 0–6
   (fields/warehouses = 1 … Treasury = 6). [CONFIRMED]
2. **CP threshold for the Nth village depends on server speed.** Official table (villages 1–50,
   x1/x2/x3/x5/x10) captured in full below. Closed form that reproduces the official table exactly:
   `raw(n) = 1600 · n^2.3` (n = number of villages you already own); x1 rounds to nearest 1,000;
   x2/x3/x5/x10 use `round_to_100(raw/speed)`. [CONFIRMED]
3. **Celebrations were reworked** (current KB, live by late 2025): they now grant CP **instantly**,
   equal to **daily CP production** (small = that village's; great = whole account's), **capped** by a
   speed-dependent limit (small 500/500/250/250/125, great 2000/2000/1000/1000/500 for
   x1/x2/x3/x5/x10), followed by a **cooldown** that shrinks with Town Hall level
   (`24h × 0.964^(TH−1)` small, ×2.5 for great, at x1; ÷2 on x3/x5, ÷4 on x10). [CONFIRMED]
4. **CP is a threshold, not a currency** — nothing is deducted when you settle or conquer. You must
   *have* the required CP when settlers are **sent** and when they **arrive** (and, for conquering,
   at the time of the chief's battle). [CONFIRMED]
5. **Residence 10/20 = slots 1/2; Palace 10/15/20 = slots 1/2/3; Command Center (Huns) 10/15/20 =
   slots 1/2/3.** [CONFIRMED]
6. **Settler cost/time per tribe** confirmed for all 6 tribes (Romans, Teutons, Gauls, Egyptians,
   Huns, Spartans). Official KB data says settler training time is reduced ×0.9 per
   Residence/Palace/CC level above 1 (`trainingTimeResidence = 0.9^(level−1)`). [CONFIRMED data,
   interpretation flagged below]
7. **Starting CP is speed-dependent: 500/250/167/100/50** (x1/x2/x3/x5/x10). Advanced Start worlds
   instead give 6 settlers + CP = 75% of the 4th-village requirement. [CONFIRMED]

---

## 1. CP production per building

### 1.1 Formula [CONFIRMED]

```
CP_per_day(building, level) = round( cultureBase(building) × 1.2^level )
```

- Verified to reproduce the official KB `culturePoints` value for **every level of every one of the
  49 buildings** (official `travian_kb` data bundle; fit script in session scratchpad).
- Same formula in kirilloid source: `culture(lvl) = Math.round(cp * 1.2 ** lvl)`
  (github.com/kirilloid/travian `src/model/base/buildings.ts`). Two independent sources agree.
- Spot-checked against the official *Passive culture points* article
  (https://support.travian.com/en/articles/174-passive-culture-points): Main Building 20 = 77,
  Embassy 20 = 153, Academy 20 = 153, Town Hall 10 = 31, Marketplace 20 = 115, Trade Office 10 = 19,
  Residence 20 = 77, Rally Point 20 = 38, Smithy 20 = 77, Wall 20 = 38, Hospital 15 = 62,
  Treasury 20 = 230 — all match the formula exactly. [CONFIRMED]

### 1.2 Culture bases per building (official KB data) [CONFIRMED]

| cultureBase | Buildings (gid) |
|---|---|
| 0 | Wonder of the World (40) — produces **no** CP |
| 1 | Woodcutter (1), Clay Pit (2), Iron Mine (3), Cropland (4), Sawmill (5), Brickyard (6), Iron Foundry (7), Grain Mill (8), Bakery (9), Warehouse (10), Granary (11), Tournament Square (14), Rally Point (16), Barracks (19), Cranny (23), Great Barracks (29), City Wall (31), Earth Wall (32), Palisade (33), Stonemason's Lodge (34), Trapper (36), Hero's Mansion (37), Great Warehouse (38), Great Granary (39), Stone Wall/Egyptians (42), Makeshift Wall/Huns (43), Defensive Wall/Spartans (47), Barricade (50) |
| 2 | Smithy (13), Main Building (15), Stable (20), Great Stable (30), Residence (25), Command Center (44), Waterworks (45) |
| 3 | Marketplace (17), Workshop (21), Trade Office (28), Horse Drinking Trough (41) |
| 4 | Embassy (18), Academy (22), Brewery (35), Hospital (46), Harbor (49) |
| 5 | Town Hall (24), Palace (26), Asclepeion (48) |
| 6 | Treasury (27) |

(Building names per gid come from the official KB bundle's names data — see
`research/data/kb-names.json`; full per-level data in `research/data/kb-buildings.json`.)

Notes:
- kirilloid's repo lists Waterworks as base 1; the **official KB data says base 2** — use 2.
  [DISPUTED → resolved in favor of official data]
- gids 47/48/49/50 = Defensive Wall (Spartans), Asclepeion (Spartan healing building), Harbor,
  Barricade — names from the official KB names data. [CONFIRMED]
- The Passive CP article says "each level-10 resource field adds ~6 CP (croplands ~5)". The KB data
  gives **all four field types base 1 → 6 CP at L10**; the "~5" for crops appears to be an error in
  the guide text. [DISPUTED — trust the data: 6]

### 1.3 CP/day by level for each base (derived from confirmed formula)

| Lvl | base 1 | base 2 | base 3 | base 4 | base 5 | base 6 |
|----|----|----|----|----|----|----|
| 1 | 1 | 2 | 4 | 5 | 6 | 7 |
| 2 | 1 | 3 | 4 | 6 | 7 | 9 |
| 3 | 2 | 3 | 5 | 7 | 9 | 10 |
| 4 | 2 | 4 | 6 | 8 | 10 | 12 |
| 5 | 2 | 5 | 7 | 10 | 12 | 15 |
| 6 | 3 | 6 | 9 | 12 | 15 | 18 |
| 7 | 4 | 7 | 11 | 14 | 18 | 21 |
| 8 | 4 | 9 | 13 | 17 | 21 | 26 |
| 9 | 5 | 10 | 15 | 21 | 26 | 31 |
| 10 | 6 | 12 | 19 | 25 | 31 | 37 |
| 11 | 7 | 15 | 22 | 30 | 37 | 45 |
| 12 | 9 | 18 | 27 | 36 | 45 | 53 |
| 13 | 11 | 21 | 32 | 43 | 53 | 64 |
| 14 | 13 | 26 | 39 | 51 | 64 | 77 |
| 15 | 15 | 31 | 46 | 62 | 77 | 92 |
| 16 | 18 | 37 | 55 | 74 | 92 | 111 |
| 17 | 22 | 44 | 67 | 89 | 111 | 133 |
| 18 | 27 | 53 | 80 | 106 | 133 | 160 |
| 19 | 32 | 64 | 96 | 128 | 160 | 192 |
| 20 | 38 | 77 | 115 | 153 | 192 | 230 |

(Levels 21–25 exist for resource fields on capitals: base 1 → 46, 55, 66, 79, 95.)

Early-game optimizer note: the new village starts with Main Building 1 (2 CP) + fields; typical
day-1 passive production is only ~10–30 CP/day, which is why the CP limit on celebrations (below)
matters so much under the reworked system.

### 1.4 When CP is credited

- Official texts only say CP is "generated daily" / "produced per day" and that current total +
  daily production are shown in the Administration Building (Residence/Palace/CC).
  (https://support.travian.com/en/articles/174-passive-culture-points)
- **Whether accrual is continuous (pro-rata per second, as resources) or a once-per-day tick is not
  stated anywhere official that we found.** Community tools (kirilloid, getter-tools) model it as
  continuous fractional accrual. [UNVERIFIED — open question; recommend in-game measurement]

---

## 2. CP thresholds for the Nth village (per server speed)

Source: official CP article table, https://support.travian.com/en/articles/51-culture-points-cp
(verbatim identical copy at https://unofficialtravian.com/2025/10/culture-points/). [CONFIRMED]

These are **account totals required to own N villages** (settling *or* conquering). CP is **not
consumed**. You must meet the threshold both when settlers are **sent** and when they **arrive**;
for conquering, at the **time of the battle**. [CONFIRMED — same article]

| Villages | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 2,000 | 800 | 500 | 300 | 200 |
| 3 | 8,000 | 3,900 | 2,600 | 1,600 | 800 |
| 4 | 20,000 | 10,000 | 6,700 | 4,000 | 2,000 |
| 5 | 39,000 | 19,400 | 12,900 | 7,800 | 3,900 |
| 6 | 65,000 | 32,400 | 21,600 | 13,000 | 6,500 |
| 7 | 99,000 | 49,300 | 32,900 | 19,700 | 9,900 |
| 8 | 141,000 | 70,300 | 46,900 | 28,100 | 14,100 |
| 9 | 191,000 | 95,500 | 63,700 | 38,200 | 19,100 |
| 10 | 251,000 | 125,300 | 83,500 | 50,100 | 25,100 |
| 11 | 319,000 | 159,600 | 106,400 | 63,800 | 31,900 |
| 12 | 397,000 | 198,700 | 132,500 | 79,500 | 39,700 |
| 13 | 486,000 | 242,800 | 161,900 | 97,100 | 48,600 |
| 14 | 584,000 | 291,800 | 194,600 | 116,700 | 58,400 |
| 15 | 692,000 | 346,100 | 230,700 | 138,400 | 69,200 |
| 16 | 811,000 | 405,600 | 270,400 | 162,200 | 81,100 |
| 17 | 941,000 | 470,500 | 313,700 | 188,200 | 94,100 |
| 18 | 1,082,000 | 540,900 | 360,600 | 216,400 | 108,200 |
| 19 | 1,234,000 | 616,900 | 411,300 | 246,800 | 123,400 |
| 20 | 1,397,000 | 698,600 | 465,700 | 279,400 | 139,700 |
| 25 | 2,391,000 | 1,195,600 | 797,000 | 478,200 | 239,100 |
| 30 | 3,695,000 | 1,847,600 | 1,231,700 | 739,000 | 369,500 |
| 40 | 7,304,000 | 3,652,100 | 2,434,700 | 1,460,800 | 730,400 |
| 50 | 12,347,000 | 6,173,600 | 4,115,800 | 2,469,500 | 1,234,700 |

(The official table runs continuously from 1 to 50; the mirror capture in this session has every
row 1–50 if intermediate values are needed — they all follow the formula below.)

### Closed-form formula [CONFIRMED by exact reproduction of all official rows tested]

```
raw(n)        = 1600 · n^2.3          // n = current number of villages (threshold for village n+1)
CPreq_x1(n)   = round_to_1000( raw(n) )
CPreq_s(n)    = round_to_100( raw(n) / s )   // s = 2, 3, 5, 10
```
- x1 form matches kirilloid `t3/culture.ts` (`round_to_1000(1600 * n^2.3)`).
- Verified against official rows for n = 1, 2, 3, 4, 8, 9, 19, 49 at all five speeds.

### Server-type notes

- The threshold table has **no tribe-count variant** — 3-tribe, 5-tribe and 6-tribe gameworlds use
  the same speed-based table (official material only ever distinguishes speed). [CONFIRMED by
  absence in all official docs; no source claims otherwise]
- Special configs can change the *starting* CP (see §6: Advanced Start = enough CP for villages
  2+3 plus 75% of village 4). [CONFIRMED]
- Tribe availability per gameworld (context): 3 tribes (R/T/G) classic; 5 tribes (+Egyptians,
  Huns) on international worlds; 6 tribes (+Spartans; Vikings replace Teutons on some specials).
  Source: official Game versions overview (mirror). [CONFIRMED]

---

## 3. Celebrations & Town Hall

Source of record: https://support.travian.com/en/articles/82-celebrations-and-town-hall (full text
captured this session) + official `travian_kb` building data + official Game versions & speed table.

### 3.1 Current mechanics (reworked system, current KB) [CONFIRMED]

- Celebrations **instantly grant CP** when started.
- **Small Celebration** (Town Hall ≥ 1): CP gained = **daily CP production of that village**, capped
  at the small-celebration limit.
- **Great/Large Celebration** (Town Hall ≥ 10): CP gained = **daily CP production of ALL your
  villages**, capped at the large-celebration limit. (TH ≥ 10 requirement confirmed by the official
  KB data: `largePartyTime` is null below level 10.)
- After a celebration, a **cooldown** runs before the next one can start; cooldown depends on Town
  Hall level and server speed.
- **Queueing exists**: "Queued celebrations continue and will start after cooldown ends" (stated in
  the destroyed-Town-Hall rules). Exact queue depth not documented. [UNVERIFIED depth]
- Destroyed Town Hall: ongoing celebration continues, queued ones still start; no *new* ones until
  rebuilt. [CONFIRMED]
- Large Celebration combat effects: your administrators reduce enemy loyalty **up to 5% more**; your
  villages lose **up to 5% less** loyalty when attacked. Applies to all battles *during* the
  celebration regardless of when troops were sent. [CONFIRMED]
- Grey-area (Natar-zone) villages: even if such a village produces 0 CP, its theoretical production
  still counts toward celebration rewards. [CONFIRMED]
- **Legacy note:** the pre-rework system (CP awarded at the *end* of a celebration, flat 500/2000
  at x1) is what older guides describe. The rework date was not found in official material; all
  current official docs (and mirrors dated Oct 2025) describe the instant+cooldown system.
  [open question §8]

### 3.2 CP limits and speed scaling [CONFIRMED — official Game versions & speed, Culture Points tab]

| | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| Starting Culture Points | 500 | 250 | 167 | 100 | 50 |
| Town Hall celebration time (cooldown) | normal | normal | ÷2 | ÷2 | ÷4 |
| Small celebration CP limit | 500 | 500 | 250 | 250 | 125 |
| Large celebration CP limit | 2,000 | 2,000 | 1,000 | 1,000 | 500 |
| Requirement for 2nd village | 2,000 | 800 | 500 | 300 | 200 |
| Artwork CP production | ×1 | ×2/3 | ×1/2 | ×1/3 | ×~1/6 |
| Artwork CP limit | 2,000 | 1,300 | 1,000 | 700 | 400 |
| Artwork usage cooldown | 24 h | 24 h | 12 h | 12 h | 6 h |

So: **celebration reward = min(relevant daily CP production, limit)** — early small celebrations
give far less than 500 CP because a young village produces little. (On specials with the
Philosophy alliance bonus — e.g. Northern Legends 2024 — the limits are increased. [CONFIRMED that
it exists; magnitude unverified].)

### 3.3 Celebration resource costs

| Celebration | Wood | Clay | Iron | Crop | Cap (x1) |
|---|---|---|---|---|---|
| Small | 6,400 | 6,650 | 5,940 | 1,340 | 500 CP |
| Great | 29,700 | 33,250 | 32,000 | 6,700 | 2,000 CP |

- Costs are **flat** (do not change with Town Hall level or with celebration count).
- Source: Travian Fandom Town_hall page (which also carries the *new* reward mechanic note
  "Small parties grant village production, up to 500; Great parties grant account production, up to
  2000"), consistent with long-standing values across community sources.
  **Not present in the official KB article.** [CONFIRMED-community / UNVERIFIED-official — verify
  in game; costs may in principle scale with speed the way other values do, no source says so]

### 3.4 Cooldown (celebration time) per Town Hall level [CONFIRMED]

From the official `travian_kb` per-level data (`smallPartyTime`, `largePartyTime`), which matches
the fandom Town_hall duration table to the second:

```
small(TH L, x1) = 86,400 s × 0.964^(L−1)
large(TH L, x1) = 2.5 × small = 216,000 s × 0.964^(L−1)   (only L ≥ 10)
apply speed:  x1, x2 → ×1 ;  x3, x5 → ×0.5 ;  x10 → ×0.25
```

| TH | Small (x1) | Large (x1) |
|---|---|---|
| 1 | 24:00:00 | — |
| 2 | 23:08:10 | — |
| 3 | 22:18:11 | — |
| 4 | 21:30:01 | — |
| 5 | 20:43:34 | — |
| 6 | 19:58:48 | — |
| 7 | 19:15:39 | — |
| 8 | 18:34:03 | — |
| 9 | 17:53:56 | — |
| 10 | 17:15:17 | 43:08:11 |
| 11 | 16:38:00 | 41:35:01 |
| 12 | 16:02:05 | 40:05:12 |
| 13 | 15:27:27 | 38:38:36 |
| 14 | 14:54:03 | 37:15:08 |
| 15 | 14:21:52 | 35:54:40 |
| 16 | 13:50:50 | 34:37:06 |
| 17 | 13:20:56 | 33:22:20 |
| 18 | 12:52:06 | 32:10:15 |
| 19 | 12:24:18 | 31:00:45 |
| 20 | 11:57:30 | 29:53:46 |

(These values were the *durations* in the legacy system and are the *cooldowns* in the reworked
system — the official KB labels them `smallPartyTime`/`largePartyTime` and the article says
cooldown depends on TH level and speed.)

### 3.5 Town Hall building stats (for build-order planning) [CONFIRMED — official KB data]

Prereqs: Main Building 10, Academy 10. cultureBase 5. Cost multiplier 1.28. Level-1 cost
1250/1110/1260/600 (total 4,220), build time 12,500 s (x1, MB1-adjusted base). Level 10 cost
11,530/10,240/11,620/5,535. Full per-level table available in `kb-buildings.json` (gid 24).

---

## 4. Expansion mechanics: Residence / Palace / Command Center

Sources: https://support.travian.com/en/articles/216-guide-the-palace-residence-and-command-center ,
https://support.travian.com/en/articles/52-expansion-slots , official KB data (gids 25/26/44).

### 4.1 Expansion slots [CONFIRMED — all three sources agree]

| Building | Slots (level → cumulative) | Restrictions | Extras |
|---|---|---|---|
| Residence | L10 → 1, L20 → 2 | one per village (not with Palace/CC in same village) | cheap; def bonus 2·L² (kirilloid) |
| Palace | L10 → 1, L15 → 2, L20 → 3 | **one per account** | defines/moves capital |
| Command Center | L10 → 1, L15 → 2, L20 → 3 | **Huns only**, one per village | no wall-type def bonus; cheaper than Palace |

- Official KB `slots` data: Residence {10:1, 20:2}; Palace {10:1, 15:2, 20:3}; CC {10:1, 15:2, 20:3}. [CONFIRMED]
- Command Center level-1 cost 1600/1250/1050/200, cost factor **1.22** (cheaper growth than
  Residence/Palace 1.28); cultureBase 2 (same as Residence; Palace is 5). [CONFIRMED — KB data]
- Each expansion slot = **one** expansion: either 3 settlers (found) or administrator conquest.
  Training 3 settlers / using a chief consumes the slot of the village they came from.
- **Conquered villages inherit used slots**: if the previous owner had expanded 1/2/3 times from
  that village, those slots stay used for you. [CONFIRMED — article 52]
- Freeing a used slot: destroy the village founded from it, conquer that village yourself from
  another of your villages, or the owner's account is deleted. [CONFIRMED — article 52]
- If your newly founded village is destroyed, you may train 3 new settlers where the originals were
  trained (no CP penalty). [CONFIRMED — fandom Settler page; consistent with slot-freeing rules]

### 4.2 CP is not spent [CONFIRMED]

Settling and conquering **never subtract CP**. The thresholds in §2 are account milestones; official
wording is "you must **have** enough Culture Points … when you send your settlers and when they
arrive." Conquering likewise requires the threshold at battle time. (Losing a village *does* drop
you below a threshold for the next expansion count, but existing villages are unaffected.)

---

## 5. Settlers

Sources: official unit-stat articles (Romans/Teutons/Gauls), travian.kirilloid.ru live data
(`js/units.js`), travian.fandom.com tribe pages, official Settling villages article.

### 5.1 Requirements to found a village [CONFIRMED]

- **3 settlers** from one Residence/Palace/Command Center with a free expansion slot (trained one at
  a time, sequentially).
- **750 of each resource** carried by the settlers (settler capacity 3,000 each; the 750×4 = 3,000
  total basic supplies for the new village).
- CP threshold met at send **and** arrival.
- Target must still be free on arrival — otherwise settlers **return home** (not lost).

### 5.2 Cost & training time per tribe (x1 base values)

| Tribe | Wood | Clay | Iron | Crop | Total | Base time (x1) | Tag |
|---|---|---|---|---|---|---|---|
| Romans | 4,600 | 4,200 | 5,800 | 4,400 | 19,000 | 26,900 s = 7:28:20 | [CONFIRMED — official art. 193 + kirilloid + fandom] |
| Teutons | 5,800 | 4,400 | 4,600 | 5,200 | 20,000 | 31,000 s = 8:36:40 | [CONFIRMED — official art. 192 + kirilloid + fandom] |
| Gauls | 4,400 | 5,600 | 4,200 | 3,900 | 18,100 | 22,700 s = 6:18:20 | [CONFIRMED — official art. 199 + kirilloid + fandom] |
| Egyptians | 5,040 | 6,510 | 4,830 | 4,620 | 21,000 | 24,800 s = 6:53:20 | [CONFIRMED — kirilloid live + fandom] |
| Huns | 6,100 | 4,600 | 4,800 | 5,400 | 20,900 | 28,950 s = 8:02:30 | [CONFIRMED — kirilloid live + fandom] |
| Spartans | 5,115 | 5,580 | 6,045 | 3,255 | 19,995 | 34,100 s = 9:28:20 | costs [CONFIRMED — kirilloid live + fandom]; time [UNVERIFIED — kirilloid live + one derivative source] |
| Vikings (special worlds) | 5,800 | 4,600 | 4,800 | 4,800 | 20,000 | 31,000 s | [UNVERIFIED — kirilloid live only] |

All settlers: attack 0/10, def inf 80, def cav 80, speed 5 fields/h, capacity 3,000, upkeep 1 crop.
[CONFIRMED]

⚠ The kirilloid **github repo** (stale) lists Egyptian settler as 4,560/5,890/4,370/4,180 — wrong
vs. both the live kirilloid site and fandom (5,040/6,510/4,830/4,620). A good example of why
kirilloid-derived data needs corroboration. [DISPUTED → resolved: 5,040/6,510/4,830/4,620]

### 5.3 How training time scales [CONFIRMED data + flagged interpretation]

- **Server speed:** all troop training times are divided by the speed factor (x2 → ÷2 … x10 → ÷10).
  [CONFIRMED — official Game versions & speed overview]
- **Building level:** the official KB building data gives Residence/Palace/Command Center a
  per-level effect `trainingTimeResidence = 0.9^(level−1)` — i.e. **settlers/chiefs train 10%
  faster per level**, exactly like Barracks units. All three buildings share the same factor
  progression. [CONFIRMED — official `travian_kb` data]
- Interpretation for calculators: unit base times (§5.2, e.g. Roman 26,900 s) are quoted at
  building-level-1 factor 1.0 — the same convention official stat pages use for barracks units.
  Since settlers require level 10+, the **effective** time is:

```
t(settler) = base_time × 0.9^(ResidenceLevel − 1) / server_speed
```

| Residence level | Factor | Roman settler (x1) | All 3 settlers (x1) |
|---|---|---|---|
| 10 | 0.3874 | 2:53:42 | 8:41:06 |
| 12 | 0.3138 | 2:20:41 | 7:02:04 |
| 15 | 0.2288 | 1:42:33 | 5:07:39 |
| 20 | 0.1351 | 1:00:34 | 3:01:42 |

  ⚠ Most published guides quote the base time (7:28:20) as "the" settler time without stating a
  residence level. The 0.9^(L−1) factor is unambiguous in the official data, but **verify the
  absolute anchor in-game once** (i.e. that Res 10 shows ≈2:53:42 on x1 for Romans, not 7:28:20).
  [open question §8]

### 5.4 Chiefs (for completeness — conquering costs a slot too)

Administrator (Senator/Chief/Chieftain/Nomarch/Logades/Ephor) trains in Residence/Palace/CC (and
Palace-only levels differ per tribe rules); base times 70,500–90,700 s; loyalty drop 20–30%.
Community Week worlds rebalance senator cost. Out of scope for second-village optimization.
[UNVERIFIED details — not needed for v2-village calc]

---

## 6. Other CP sources (current T4.6)

| Source | Effect | Tag & source |
|---|---|---|
| **Starting CP** | 500 / 250 / 167 / 100 / 50 (x1/x2/x3/x5/x10) at account creation | [CONFIRMED — official Game versions & speed table (mirror verbatim)] |
| **Artwork** (hero consumable) | Instantly grants CP = your account's **daily CP production** × speed factor (×1, ×2/3, ×1/2, ×1/3, ×~1/6), capped at 2,000/1,300/1,000/700/400; usable once per 24/24/12/12/6 h. Cannot drop from the first 31 adventures (62 on item-crafting worlds). Found in adventures / auction house. | [CONFIRMED — official hero-items + Game versions table] |
| **Daily Quests** | Reward cycle includes **+50 CP** (25-point tier) and **+400 CP** (100-point tier); rewards cycle in fixed order, same for the whole gameworld, up to 4 rewards/day; daily reset at server-start time; **rewards not affected by server speed**. | [CONFIRMED — official Daily Quests article (mirror verbatim)] |
| **Task system (quests)** | Rewards are **resources + hero XP only** — no CP from tasks in the current task system. (Old pre-2020 quest system gave CP; ignore old guides.) | [CONFIRMED — official Task System article] |
| **Celebrations** | §3. | |
| **Alliance bonus "Philosophy"** | Faster CP production account-wide; also raises celebration & artwork limits. 5 levels, unlocked by alliance donations. 2%/level on 2018 servers; current per-level % not found. On regular worlds the 4 bonuses are Recruitment/Philosophy/Metallurgy/Commerce. | [CONFIRMED existence — official Alliance Bonuses article; per-level % UNVERIFIED] |
| **Advanced Start worlds** | First village spawns with all fields L5; you get **6 settlers** + CP for villages 2 and 3 immediately **plus 75% of the village-4 requirement** (CP bar ¾ full). No 18/15/9-croppers as village 2/3. First two settled villages get fields L5. Villages beyond the 4th settle normally. | [CONFIRMED — official articles 203 & 28] |
| **Embassy** | No special CP mechanic — it is simply a high-CP building (base 4) with cheap cost, which is why it features in CP build guides. | [CONFIRMED — KB data] |
| **Artifacts** | No CP-granting artifact in regular Legends; annual-special **region effects** can include CP-related bonuses (later game; verify per special). | [UNVERIFIED — note only] |
| **Wonder of the World** | Produces 0 CP. | [CONFIRMED — KB data] |
| **Menhir relocation** | Travian **Kingdoms** mechanic — does not exist in Legends; exclude from the app. | [CONFIRMED by source context] |

---

## 7. Optimizer-ready formula summary

```
# thresholds (n = villages currently owned)
raw = 1600 * n^2.3
need = round1000(raw)            if speed == 1
need = round100(raw / speed)     if speed in {2,3,5,10}

# passive production
village_cp_per_day = Σ_buildings round(base_b * 1.2^level_b)

# celebrations (instant reward + cooldown)
small_reward = min(village_cp_per_day, {x1:500, x2:500, x3:250, x5:250, x10:125}[speed])
large_reward = min(account_cp_per_day, {x1:2000, x2:2000, x3:1000, x5:1000, x10:500}[speed])   # TH>=10
cooldown_small = 86400 * 0.964^(TH-1) * {x1:1, x2:1, x3:0.5, x5:0.5, x10:0.25}[speed]
cooldown_large = 2.5 * cooldown_small
cost_small = (6400, 6650, 5940, 1340)      # flat; verify in-game
cost_large = (29700, 33250, 32000, 6700)

# settlers
t_settler = tribe_base_time * 0.9^(residence_level - 1) / speed
resources  = 3 * tribe_cost + (750,750,750,750)

# start
cp0 = {x1:500, x2:250, x3:167, x5:100, x10:50}[speed]     # regular worlds
cp0_advanced_start = 0.75 * need(villages=3)               # i.e. 75% of 4th-village threshold
```

---

## 8. Open questions ([DISPUTED] / [UNVERIFIED] items)

1. **CP accrual timing** — continuous pro-rata vs. daily tick (midnight/server-time). No official
   statement found; community tools assume continuous. → Measure in game: watch the Residence CP
   counter over an hour. **Optimizer-critical.**
2. **Settler training-time anchor** — official data confirms the ×0.9-per-Residence-level factor,
   but confirm in game that the published base times (e.g. Roman 7:28:20 on x1) correspond to the
   level-1 factor (⇒ ≈2:53:42 at Residence 10), not to level 10. **Optimizer-critical.**
3. **Celebration resource costs on current servers** — 6400/6650/5940/1340 & 29700/33250/32000/6700
   are community-sourced (fandom, pre- and post-rework); not present in current official KB. Also
   unknown whether costs scale with server speed (celebration *limits* do). → one in-game check.
4. **Celebration queue depth** under the reworked system (official text implies ≥1 queued; classic
   allowed exactly 1 queued). 
5. **Date/rollout of the celebration rework** (instant CP + cooldown) — all current official docs
   describe it, but we found no changelog entry; irrelevant for new 2026 worlds, relevant if the
   app must support older-style servers.
6. **Spartan settler training time** (34,100 s) and all Viking settler data — kirilloid-family
   sources only.
7. **Philosophy alliance bonus** current per-level percentage (2%/level as of 2018 servers) and the
   exact limit increase it gives to celebrations/artwork on specials.
8. **x3 "167" starting CP** — the official table says 167 (≈500/3); trust but oddly precise; will be
   visible immediately on any x3 world.
9. **Crop field CP at L10** — official guide text says "~5", official data says 6 (base 1, same as
   other fields). Data wins, but noted.
