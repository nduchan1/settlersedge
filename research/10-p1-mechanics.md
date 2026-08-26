# P1 mechanics sweep — settler anomaly + remaining P1 items

*Research 2026-08-12/13. Sources: official support KB (support.travian.com) primary; kirilloid LIVE site bundles (fetched fresh from travian.kirilloid.ru — `js/units.js?d`, `js/troops.js?a`, `js/server.js`, inline JS of `build.php`, `villages_res.php`, `hero4.php`, `items.php`, `distance.php`); `data/kb-buildings.json` (official KB app bundle, already in repo); Fandom/community secondary. Resolves master-summary items P1-9…P1-13 and several P2 items.*

---

## P0-4 follow-up: the settler-time anomaly — ✅ SOLVED

**Verdict [CONFIRMED by exact numeric fit]: the published Gaul base 22,700 s is correct. The measured ~4% discrepancy is the alliance "Recruitment" bonus at level 2 (−4% training time). There is no qualifier training modifier and no settler rebalance.**

The exact reproduction of both in-game measurements (Tournament qualifier, x2, Gaul):

| Residence | formula `ceil(22700 × 0.9^(L−1) × (1 − 0.04) / 2)` | measured |
|---|---|---|
| 10 | ceil(4221.334) = **4222 s = 1:10:22** | 1:10:22 ✓ |
| 20 | ceil(1471.888) = **1472 s = 0:24:32** | 0:24:32 ✓ |

No other recruitment level fits (0/2/6/8/10% all miss by ≥30 s); 4% with **ceiling** rounding is the unique exact fit at both data points. The previously inferred "base ≈ 21,796–21,800 with floor" was the same numbers seen through a floor-rounding lens; 22,700 × 0.96 = 21,792 sits right below that window and ceil-vs-floor accounts for the residual.

Supporting evidence per sub-question:

**(a) Tournament qualifier config** — official KB "Travian Tournament — Game Worlds Setup" (https://support.travian.com/en/articles/108-travian-tournament-game-worlds-setup): x2 speed, regular map, five tribes (Gauls/Teutons/Romans/Egyptians/Huns), artifacts + WW, standard Travian: Legends gameplay, **no special training-speed settings documented**. [CONFIRMED]

**(b) Rebalance since 2021** — no changelog evidence found (blog.travian.com changelog category searched; nothing about settler time changes). Kirilloid live still ships 22,700 for Gauls. [CONFIRMED absence — as far as searchable sources go]

**(c) Alliance Recruitment bonus** — official KB "Alliance Bonuses" (https://support.travian.com/en/articles/88-alliance-bonuses): four bonuses (Recruitment / Philosophy / Metallurgy / Commerce), 5 levels each; Recruitment "increases troop production speed **in all troop-producing buildings**" (i.e., includes Residence/Palace/Command Center → settlers and chiefs), 2%/level → level 2 = 4%; multiplied with hero items (Helmet of the Mercenary etc.). Kirilloid live implements it as `time *= (1 − recruit/100)` applied to **all** units including settlers (`troops.js`). [CONFIRMED]

The earlier "hypothetical Residence 1 → 3:09:10 = exactly 22,700/2" figure is consistent with an **external calculator** (no alliance bonus), not an in-game display — which further corroborates the bonus explanation.

**ENGINE**:
```
settlerTime(L, speed, recruitPct) = ceil( base_tribe × 0.9^(L−1) × (1 − recruitPct/100) / speed )
```
Rounding: ceiling matches both points; floor/round do not. (Kirilloid uses Math.round and applies ÷speed before the 0.9 power — order is irrelevant except for the final rounding step.)

**Remaining in-game check**: open Alliance → Bonuses on the qualifier account and confirm Recruitment = level 2. (30-second check; if it shows any other level, re-open this item.)

### (c) Kirilloid LIVE settler base data (units.js, `t4`/`t4.5` branch — used for T4.6)

Extracted 2026-08-12 from `travian.kirilloid.ru/js/units.js?d` (settler = unit idx 9, `cap:3000` rows; the t4 override does not touch settler rows):

| Tribe | wood | clay | iron | crop | Σ | base time (s) | base time |
|---|---|---|---|---|---|---|---|
| Romans | 4600 | 4200 | 5800 | 4400 | 19,000 | 26,900 | 7:28:20 |
| Teutons | 5800 | 4400 | 4600 | 5200 | 20,000 | 31,000 | 8:36:40 |
| Gauls | 4400 | 5600 | 4200 | 3900 | 18,100 | 22,700 | 6:18:20 |
| Egyptians | 5040 | 6510 | 4830 | 4620 | 21,000 | 24,800 | 6:53:20 |
| Huns | 6100 | 4600 | 4800 | 5400 | 20,900 | 28,950 | 8:02:30 |
| Spartans | 5115 | 5580 | 6045 | 3255 | 19,995 | 34,100 | 9:28:20 |
| (Vikings) | 5800 | 4600 | 4800 | 4800 | 20,000 | 31,000 | 8:36:40 |

All match the values already in 04-tribes-settlers-heroes.md. [CONFIRMED — kirilloid live; Gaul base additionally confirmed in-game via the recruitment-bonus fit above]

Kirilloid live train-time pipeline (`troops.js`): `time ÷ server speed` → × (1 − alliance recruit%) → × (1 − helmet%) (barracks/stable units only, idx<6) → × artifact → × HDT (Roman cavalry) → **`Math.round(time × 0.9^(buildingLevel − 1))`** — i.e. it applies ×0.9 per level of the training building, Residence/Palace included.

### (d) Does ×0.9/level officially apply to Palace & Command Center, and below level 10?

**[CONFIRMED — official]** `data/kb-buildings.json` (official KB dataset) carries an explicit `trainingTimeResidence` effect on all three buildings:

- **Residence (gid 25)**, **Palace (gid 26)**, **Command Center (gid 44)**: effect = `0.9^(L−1)` exactly, **from level 1** (1.0, 0.9, 0.81, … 0.13509 at L20). Identical sequence for all three buildings.
- So the rule applies below level 10 too (it just doesn't matter for settlers, which need level 10+ to exist — but it does matter for chiefs? No: chiefs also need Res 10/20 or Palace 10/15/20; the sub-10 factors are only reachable by nothing trainable — still, the data is unambiguous).

---

## P1 items

### 1. Merchant capacity/speed on speed servers

**Verdict: capacity AND movement speed × server speed (linear — NOT the ×2/×4 troop-travel cap). [DISPUTED→community-consensus; official KB silent]**

- Official KB art. 20 "Game versions and speed" (https://support.travian.com/en/articles/20-game-versions-and-speed) lists production/build/training/troop-speed/celebrations/protection — **merchants are not mentioned at all**.
- Official marketplace guide (https://support.travian.com/en/articles/213-guide-the-marketplace-trading-resources): base capacity per tribe, Trade Office, Commerce alliance bonus, Roman Trade Office twice as effective — **no speed-server statement**.
- Fandom "Merchant" (https://travian.fandom.com/wiki/Merchant): "for speed servers, you multiply both the carrying capacity and the movement speed by the speed of the server." Long-standing community consensus, matches player expectation (Roman merchant carries 2500 on x5).
- Kirilloid live has no merchant travel calculator to cross-check; its troop-speed multiplier `{1:1, 2:2, 3:2, 5:2, 10:4}` (server.js) applies to combat units.

**In-game check (trivial on the qualifier)**: marketplace UI shows capacity — Gaul base 750, expect **1500** on x2. One trade to a known-distance village pins the speed (24 f/h → expect 48 f/h if linear; 48 also equals the ×2 troop rule at x2, so the *speed* question needs an x10 data point or a snapshot from any x3/x5 world to fully separate — capacity separates immediately).

### 2. Main Building reduction on resource fields

**Verdict: YES — MB 0.964^(MB−1) applies to resource fields exactly as to buildings. [CONFIRMED — kirilloid live + community consensus; no official formula published]**

Kirilloid live `build.php` uses one `getStat` for every gid; the time line is `t.valueOf(lvl) × MB_Time(mbLevel) / speed` with `MB_Time(lvl) = 0.964^(lvl−1)` (and ×5 when MB=0, i.e. WW-village no-MB case), and gids 1–4 (fields) go through the identical code path. No exceptions for fields anywhere in the bundle. Community guides treat field build times as MB-reduced. Official KB describes MB as reducing "construction time of buildings" without excluding fields; `kb-buildings.json` gives MB effect `buildingTime: 0.964^(L−1)` with no scope qualifier.

Side finding (for master item P1-8, field production values): kirilloid live applies a **×1.4 multiplier to the classic field production table for T4.4+** (`build.php`: `speed × round(classicTable[lvl] × 1.4)`; `villages_res.php`: `spd *= 1.4` when major=4). This reproduces the official `kb-buildings.json` numbers: classic L1=5 → 7 ✓ (official production1=7), classic L2=9 → 12.6 → **13** ✓ (official 13 — resolves the "13 vs 14" L2 dispute in favor of 13). The L0 base (3/hr classic → would be 4.2) still needs the in-game check.

### 3. Production bonus stacking

**Verdict: oasis% and Sawmill/Brickyard/Foundry/Mill/Bakery% are ADDITIVE percentage points of base field production; Waterworks multiplies only the oasis term (+5% of it per level); the gold +25% is a separate MULTIPLICATIVE factor applied at the end. [CONFIRMED — kirilloid live implementation; consistent with official Waterworks effect data]**

Kirilloid live `villages_res.php` reCalc, verbatim structure:

```
mul = 1
    + 0.25 (sawmill-type factory, if built; 5%/level, 25% at L5)
    + 0.25 (bakery, crop only)
    + oasis% × (1 + waterworksLevel/20)      // WW scales the oasis term only
perType = round( nFields × round(baseProd[lvl] × serverSpeed × mul) × plusBonus )
                                              // plusBonus = 1.25 with gold bonus, else 1
```

- Sawmill/Mill etc. contribute flat percentage points of BASE production (not compounding with oasis).
- **Waterworks**: official `kb-buildings.json` effect `oasisBoost` = 0.05×L (L20 = 1.00) — i.e. Egyptian oases give up to double bonus; kirilloid's `oasis% × (1 + L/20)` is the same formula. A 25% crop oasis + WW20 → 50 percentage points. [CONFIRMED official effect data + kirilloid agree]
- **Gold +25%** multiplies the whole (base × (1+bonuses)) result — and per earlier research it also applies to hero production. [kirilloid live; community consensus]
- Hero production is a flat add on top, NOT affected by oasis/factory percentages.

Rounding detail (kirilloid): per-resource production is rounded once at `base × speed × mul`, then ×1.25 and rounded again. Treat exact rounding order as [UNVERIFIED] pending one in-game production-overview screenshot with known oasis+factory+gold state.

### 4. Command Center (Huns) cost/CP/pop table

**Verdict: [CONFIRMED — OFFICIAL. Already in `data/kb-buildings.json` as gid 44.]** No external source needed. Key rows (wood/clay/iron/crop, time@MB1 x1, CP, pop):

| L | cost | CP | pop | slots |
|---|---|---|---|---|
| 1 | 1600/1250/1050/200 | 2 | 1 | — |
| 10 | 9580/7485/6285/1195 | 12 | 10 | **1** |
| 15 | 25890/20230/16990/3235 | 31 | 20 | **2** |
| 20 | 69975/54670/45925/8745 | 77 | 30 | **3** |

Full 20 levels in the JSON. Cost factor ≈1.22 (matches 01-buildings). Prereqs: MB 5, no Residence, no Palace, Huns only. Max level 20. Total cost L1→20 is far below Palace (CC is the cheap 3-slot option — Hun expansion advantage). Effects include the `trainingTimeResidence` 0.9^(L−1) sequence (see settler section).

### 5. Waterworks cost table conflict

**Verdict: Fandom was right, kirilloid wrong. Official L1 = 910/945/910/340. [CONFIRMED — OFFICIAL, `kb-buildings.json` gid 45.]**

L1 910/945/910/340, factor 1.31, L20 = 153885/159805/153885/57495; CP 2 at L1 (kirilloid's CP 1 also wrong, as already flagged); pop 1..30; effect oasisBoost 5%/level. Prereqs: Hero's Mansion 10, Egyptians only. Add to kirilloid-errors list: **Waterworks L1 cost 650/670/650/240 (kirilloid GitHub-era value) is stale — live-site build.php data not re-checked for this gid, but official data is authoritative anyway.**

### 6. Capital resource-field max level

**Verdict: official dataset caps fields at level 25 (capital); levels 11–12 need capital OR city, 13+ capital only ⇒ normal village 10, city 12, capital 25. [CONFIRMED — official KB data; practical cap is storage/cost, not the number 20/21/22]**

`kb-buildings.json` gids 1–4: `maxLevel: 25`, level rows 1–25 all present (cropland L25 costs 15.5M/19.9M/15.5M/4.4M, produces 9730/hr base), prerequisites `Level11CapitalOrCity` + `Level13Capital`. Kirilloid live build.php says `maxLvl: 22` with the note "Maximum level is 10, except capital — limited by stockyards there" — i.e. kirilloid's 22 is a practical display cap (storage limits), not the game rule. Engine: cap = 10 (non-capital) / 12 (city, on worlds with cities) / 25 (capital).

### 7. Horse Drinking Trough — upkeep dispute

**Verdict: BOTH effects are official. Training time −1%/level for all cavalry AND crop upkeep −1 for Equites Legati at L10, Imperatoris at L15, Caesaris at L20. [CONFIRMED — official KB]**

Official KB "Reducing crop consumption & Horse Drinking Trough" (https://support.travian.com/en/articles/81-reducing-crop-consumption-and-horse-drinking-trough): "Training time for all cavalry is reduced by 1% per level"; "Equites Legati consume one crop less at level 10"; "Equites Imperatoris consume one crop less at level 15"; "Equites Caesaris consume one crop less at level 20". **The upkeep reduction is location-based**: it applies to cavalry in the village with the HDT — Legati reinforcing a village without one eat 2 crop again regardless of home village.

The `kb-buildings.json` effects field only carries `trainingTimeStable: 0.99^…` (1%/level) — the upkeep breakpoints are simply not modeled in that dataset's effect schema; the KB article text is the authority. Kirilloid live implements both (`troops.js`: `if (hdp >= (idx−1)*5) uc--` → thresholds 10/15/20 for idx 3/4/5, plus `time *= 1 − 0.01×hdp`). Prereqs (official, gid 41): Stable 20, Rally Point 10, Romans only; max level 20.

### 8. Hero base stats

**Verdicts:**
- **Base fighting strength = 100** (before any points). Kirilloid live `hero4.php`: `fs = 100 + points × (Roman ? 100 : 80)`. [CONFIRMED — kirilloid live + community; official KB gives the per-point values but not the base 100 explicitly]
- **Strength per point: 80, Romans 100.** Official KB "Hero overview" (https://support.travian.com/en/articles/45-hero-overview): "Hero strength increases by 100 points per skill point (instead of 80)" for Romans. [CONFIRMED — official]
- **4 skill points per level, 4 at start** (default: all in resource production). [CONFIRMED — official art. 45]
- **Base speed on foot = 7 fields/hour** (all tribes; scaled by the troop-speed server multiplier ×2/×2/×2/×4 like other units). Kirilloid live distance.php lists "hero: 7" for every tribe. [CONFIRMED — kirilloid live; community consensus]
- **Mounts (hero speed becomes, not adds): Gelding 14, Thoroughbred 17, Warhorse 20.** Kirilloid live items.php: "Hero speed is 14/17/20". [CONFIRMED — kirilloid live] Tribe bonuses on top: **Gauls +5 mounted** ("+5 fields/hour speed bonus when mounted" — official art. 45), **Huns +3** for mounted armies with mounted hero (official art. 45). Kirilloid notes some item effects double on 3x servers (its note: Gaul +10 on 3x) — treat speed-server scaling of ITEM effects as [UNVERIFIED] for modern T4.6.
- **Regeneration**: base regen reported as ~10%/day via official "Hero Health and Revival" article search snippet (https://support.travian.com/en/support/solutions/articles/7000064020-hero-health-and-revival) — article body not retrieved; Regeneration helmets +10/15/20 HP/day (kirilloid items list). Tag base regen [UNVERIFIED — one KB fetch or in-game look needed].
- Bonus confirmations from kirilloid live hero4.php: **XP thresholds `25·L·(L+1)`** (closes master P1-15 as kirilloid-live-confirmed, still no official source); revival cost = tribeCost × (1+L/24) × (1+L) with tiered rounding; revival time = min(L+1, 24) h ÷ floor(speed/3 + 1).
- Note: hero4.php still uses the stale production model (×1.5 for T4, Huns ×2) — **ignore it**; the 9/30 (Egyptian 12/40) model from P0-1 stands.

### 9. Gold feature prices (2026)

| Feature | Price | Status |
|---|---|---|
| NPC merchant | **3 gold** per use | [CONFIRMED — official KB art. 38 / unofficialtravian 2025] |
| +25% production bonus (per resource type) | **5 gold** | [CONFIRMED — support KB "Production Bonuses" search snippet; duration = same period as Plus: 7 days x1 / 3 days speed [UNVERIFIED for duration]] |
| Travian Plus | **10 gold** (community-standard value), lasts **7 days on x1, 3 days on faster speeds** (duration official — KB art. 219) | price [UNVERIFIED — in-game shop only]; duration [CONFIRMED] |
| Instant completion ("instant finish") | **2 gold** (community-standard) | [UNVERIFIED — in-game shop only] |
| Gold Club | **200 gold, whole round** | [CONFIRMED — official KB art. 126: "costs 200 Gold and remains active for the entire duration of a game world"; Fandom's 100/50-scaled figure is stale] |
| Plus build-queue slot | Plus includes the **"Building and Research Waiting Loop"** (the +1 queue slot), plus larger map, central overview, merchant run-twice, smithy research queue, attack warnings | [CONFIRMED — official KB art. 126 feature list] |

The official KB deliberately does not publish per-feature prices ("access the in-game Gold shop"). **In-game check (10 seconds)**: the qualifier account's gold menu shows exact 2026 prices for Plus / bonus / NPC / instant-complete — grab all four in one screenshot.

---

## Still needing in-game checks (consolidated)

1. **Alliance → Bonuses tab**: confirm Recruitment level 2 on the qualifier account (locks the settler-anomaly solution). Also note Commerce level for merchant modeling.
2. **Marketplace UI**: merchant capacity on x2 (Gaul: 1500 expected) — settles item 1 capacity; a timed trade settles speed at x2 (x10 data point would fully separate linear-vs-capped).
3. **Gold shop screenshot**: exact prices of Plus / +25% bonus / NPC / instant complete.
4. **Hero attributes screen**: base regen %/day; confirm fighting strength shows 100 at zero points.
5. Production overview with known oasis+factory+gold state: pins the stacking rounding order (and the hero-production per-hour unit from P0-1).
6. Field L0 production on a fresh village (3 vs 4.2 vs 6/hr — see item 2 side finding).

## Data-layer updates for the engine

- Settler formula: `ceil(base × 0.9^(L−1) × (1 − recruit%) / speed)` — base per tribe from the table above; recruit% a user input (0–10, step 2).
- `trainingTimeResidence` 0.9^(L−1) is official for Residence/Palace/CC alike — one shared curve.
- Production: `round(base[lvl] × speed × (1 + factory% + oasis% × (1 + 0.05·WW))) × (gold ? 1.25 : 1)` + hero flat.
- Command Center + Waterworks tables: read directly from `data/kb-buildings.json` gids 44/45 (official) — kirilloid Waterworks costs must NOT be used.
- HDT: training ×(1−0.01·L) on stable units; upkeep −1 crop for EL/EI/EC at L≥10/15/20, keyed to the village the cavalry is IN.
- Field caps: 10 / 12 (city) / 25 (capital).
