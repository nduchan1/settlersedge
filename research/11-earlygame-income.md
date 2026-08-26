# 11 — Early-Game Income Sources, Quantified (Travian: Legends ~T4.6, first ~14 days)

Research date: 2026-08-12/13. Follow-up to doc 06 (§Open questions items 2–9).
Scope: putting NUMBERS on adventure rewards, daily-quest points, hero XP, auction/silver economics, tutorial, left-hand items — for EV modeling in the calculator.

Tagging: **[CONFIRMED]** official / 2+ independent sources · **[DISPUTED]** sources disagree · **[UNVERIFIED]** single community source.

## Key new source found this pass: the Travium codebase

`https://github.com/Travium/Travium` — a self-described "Travian T4.4 / T4.6" private-server codebase (PHP). Its game constants reproduce **verbatim** many independently-confirmed official values: auction floor prices (100 silver non-stackable / 1 silver per stackable unit), consumable stack sizes (5/10/30…), the exact four 25-point and four 100-point daily-chest reward values, artwork release at day 14 on 1x, hero XP `25·L·(L+1)`, daily rewards not speed-scaled at ≤10x, hero revive-cost formula. This strongly suggests it derives from leaked/decompiled retail T4.4 logic. **But it is NOT retail T4.6**: it demonstrably deviates in places (it randomizes the order of the first-10 adventure rewards and randomizes daily chest reward selection, both of which are fixed/deterministic in current retail; item tier dates 75/165 vs official 70/140). Convention used below: values from this codebase are tagged **[UNVERIFIED — Travium]**, upgraded to **[DISPUTED]/[CONFIRMED]** where retail sources corroborate. Treat every Travium number as a *strong prior to verify in-game*, not ground truth.

Key files (all under `src/` in the repo):
- `Model/Movements/AdventureProcessor.php` — adventure damage, XP, reward amounts & distribution
- `Model/DailyQuestModel.php` — daily quest list, per-quest points, chest rewards
- `Model/AuctionModel.php`, `Controller/Ajax/heroAuction.php` — auction floors, stacks
- `Game/Formulas.php` — hero XP/level, item tiers, artwork release
- `functions.general.php` — `game_progress()` (elapsed time ÷ round length, clamped 0..1; round length ≈ 350/speed days)

---

## 1. Adventure rewards, quantified

### 1.1 First-10 fixed package — amounts

Retail sequence (fixed order) is official [CONFIRMED, doc 06 §4.2]: horse, resources, troops, silver, ointment, book, resources, silver, cages, XP-only. Amounts:

| # | Reward | Amount (best available data) | Tag / source |
|---|---|---|---|
| 1 | Horse (Gelding) | 1 (tier-1 mount, 14 f/h at 1x) | [CONFIRMED official] |
| 2 | Resources | ≈ `rand(450,700) × speed × (1+15·progress)` **per resource type** → ~1,870–2,900 total at day 0–1 on 1x (mean ≈ 2,350) | [DISPUTED→likely: Travium formula `calculateResourcesPerType()`; independently corroborated by MoulaCZ guide "adventure 2 (resource reward, ~2,300 res)"] |
| 3 | Troops | **3 units** of your tribe's basic unit | [CONFIRMED: official article ("3 units to be exact" per unofficialtravian/Steve's FAQ retelling) + Travium `getTroops($race, true)` returns 3 at speed ≤10] |
| 4 | Silver | `rand(100−rand(1,50), 400+rand(1,50))` ≈ 50–450, **mean ≈ 250** | [UNVERIFIED — Travium] |
| 5 | Ointments | `rand(20,25)` in Travium — retail count unconfirmed; player lore suggests fewer | [UNVERIFIED — Travium; flag for in-game check] |
| 6 | Book of Wisdom | 1 | [CONFIRMED] |
| 7 | Resources | same formula as #2 | [DISPUTED→likely, as #2] |
| 8 | Silver | same as #4 (mean ≈ 250) | [UNVERIFIED — Travium] |
| 9 | Cages | **6** (× server cage multiplier, =1 on normal worlds) | [UNVERIFIED — Travium] |
| 10 | Nothing (XP only) | — | [CONFIRMED] |

First-10 package totals (1x, days 0–3): **≈ 4,400–5,600 resources (even split across types), ≈ 300–900 silver (mean ≈ 500), 3 troops, ~20+ ointments, 1 book, 6 cages, 1 horse** — plus XP (below). Resource drops land in the **hero inventory** (no warehouse cap) [CONFIRMED].

### 1.2 Scaling of amounts

- **Server speed**: resource amounts multiply by speed (Travium: `× getGameSpeed()`); silver does NOT scale with speed in the code. [UNVERIFIED — Travium]
- **Server age**: amounts grow linearly with `game_progress = elapsed/(round_length)`, round_length ≈ 350/speed days. Resources: `×(1+15·progress)` (→ up to ×16 at server end); post-#10 silver: `×(1+4·progress)`. In the first 14 days of a 1x world progress ≤ 0.04, so the early-game correction is only ×1.00–×1.60 for resources. [UNVERIFIED — Travium]
- **Hero level**: adventure rewards do NOT depend on hero level in the code (only the count of completed adventures matters, for XP and item odds). Official sources are silent. [UNVERIFIED — Travium]

### 1.3 XP per adventure

No official numbers exist. Travium: `XP = 8 + rand(n, 2n)` where n = number of previously completed adventures; **×2 for Difficult/Heavy**; ×(1+helmet XP bonus). Mean ≈ `8 + 1.5·n`. [UNVERIFIED — Travium]

| Adventure # (normal) | mean XP (Travium model) |
|---|---|
| 1 | 8 |
| 5 | ~14 |
| 10 | ~21.5 |
| 15 | ~29 |
| 20 | ~36.5 |
| 30 | ~51.5 |

Cumulative over first 10 adventures ≈ **~140 XP** (normal difficulty) → hero ~level 1–2 from adventures alone (L2 = 150 XP). "Heavy = double XP" is separately [CONFIRMED official]. Note: the task prompt's "normal vs long" is Travian *Kingdoms* terminology (short/long adventures) — Legends has normal vs difficult only.

### 1.4 Post-#10 outcome distribution

Official (current KB): random, equal for all; possible outcomes nothing/item/silver/resources/troops; "**resources are the most common reward, while items are rarer**" [CONFIRMED qualitative].

Travium implementation: `rand(1,14)` → item-branch 8/14 (57%), resources 2/14 (14.3%), silver 2/14 (14.3%), troops 2/14 (14.3%); within the item branch a miss roll produces "nothing" (roughly 0–30% of the branch depending on adventure count and tier locks). **This contradicts the official "resources most common" statement** → [DISPUTED — do not trust the Travium distribution for retail T4.6; it may reflect old T4.4 tuning or fan tuning].

Amounts when they do hit (Travium, all [UNVERIFIED — Travium]):
- Resources: same `rand(450,700)/type × speed × (1+15·progress)` as first-10.
- Silver: `rand(200,400) × (1+4·progress)` → early mean ≈ **310 silver**.
- Troops: `rand(2..12)` of a random unit type (scaled up on fast/very fast worlds), ×(1+10·progress).
- Consumable item drops come in batches (ointments/scrolls/bandages base `rand(20,50)`, cages `rand(6,20)`, ×(1+3·progress)); equipment items ×1.
- Item drops respect the tier windows and the no-artwork-before-day-14 (1x) lock — matches official adventure-range locks [CONFIRMED].

**No community logging dataset of post-#10 outcomes was found** despite targeted searches (reddit r/travian via Arctic-Shift archive, old forum archives, unofficialtravian, YouTube-adjacent text). Only qualitative anecdotes surfaced (e.g. "first 10 give just oint/silver/cages, 11th–15th might give a drop"; "selling early adventure items nets 2k–30k silver on a 3x"). The outcome distribution remains the single weakest input. → keep as a knob (see §7).

### 1.5 Adventure count in the window (recap from doc 06, official)

3 at start; ~3/day days 0–2, ~2/day days 3–16 (1x); ≈ 5–6 in the first 24h; ≈ **25–30 adventures by day 14** on 1x. Spawn ~×speed on faster worlds with brackets compressed by speed. The 75-pt daily chest "+1 adventure" (every 5th day) adds one. [CONFIRMED]

---

## 2. Daily quests: activities, point values, chests

### 2.1 The activity list with point values

Official sources list activities only partially and publish NO point values (doc 06 §3.3). Travium contains a complete an activity table whose **maximum points sum to exactly 100** — matching the retail chest ceiling perfectly:

| # | Activity (trigger in code) | Points/step | Steps | Max pts | Retail attestation |
|---|---|---|---|---|---|
| 1 | Complete an adventure | 5 | 1 | 5 | [CONFIRMED exists — official KB] |
| 2 | Raid an **unoccupied oasis** | 3 | 3 | 9 | [CONFIRMED exists — blog "Raid Natar or oasis"] |
| 3 | Raid/attack a **Natar village** | 3 | 3 | 9 | [CONFIRMED exists — blog] |
| 4 | Win an auction | 5 | 1 | 5 | [CONFIRMED exists — blog] |
| 5 | Use/obtain gold (gold spend, silver→gold exchange, Gold Club buy all trigger it) | 2 | 3 | 6 | [DISPUTED — official blog lists "earn gold ×3" AND "spend gold ×3" as *two* quests; Travium merges them into one] |
| 6 | Finish any **building upgrade** | 4 | 3 | 12 | [UNVERIFIED — Travium only] |
| 7 | Finish any **resource-field upgrade** | 5 | 3 | 15 | [UNVERIFIED — Travium only] |
| 8 | Train ≥20 **infantry** in one order (Barracks/GB) | 3 | 3 | 9 | [CONFIRMED exists — official KB hint] |
| 9 | Train ≥20 **cavalry** in one order (Stable/GS) | 3 | 3 | 9 | [CONFIRMED exists — official KB hint] |
| 10 | Start a **celebration** | 5 | 3 | 15 | [CONFIRMED exists — blog "hold celebrations ×3"] |
| 11 | **Alliance contribution** (donate ≥1,000 resources per step) | 2 | 3 | 6 | [UNVERIFIED — Travium only] |
| | **Total** | | | **100** | |

All point values are [UNVERIFIED — Travium] (no retail source publishes them), but the exact-100 total, and the fact that every officially attested activity appears in the list, make this the best available model. Note official KB says "up to 10 tasks per day" vs 11 here — either retail rotates/merges (e.g. earn+spend gold), or the count statement is loose. → verify one game-day in-game.

**No-gold, no-alliance reachable points early game** (Travium values): adventure 5 + oasis 9 + Natars 9 + buildings 12 + fields 15 + celebrations 15 (max 3/day impractical early but ≥1 = 5) + train-inf 9 = **64–83** without auctions; +5 with an auction win. → the community lore "25–75 is the reliable no-gold band" (doc 06) is consistent: 75 is reachable on active days, 100 effectively requires the gold and/or alliance quests.

### 2.2 Chest reward cycles (cross-check)

The official deterministic cycle table in doc 06 §3.2 stands [CONFIRMED — official KB]. Cross-check: Travium's chest reward *pools* contain **exactly the same reward values**:
- 25 pts: +200 each resource / +50 hero XP / +50 CP / +1,000 of one random type ✓ (all four match)
- 50 pts: +1 day Plus / +1 day +25% production (one of 4 types) ✓ (all five match; durations `86400s ÷ (7|2|3)` per speed — matches "not speed-scaled reward, speed-scaled duration" oddity, verify)
- 75 pts: 5× ointments / 5× consumable / 5× small bandages / 5× cages / +1 adventure ✓ (structure matches; Travium has scrolls where official lists Tablets of Law — item-ID ambiguity) [DISPUTED on the 5th consumable]
- 100 pts: +400 CP / +20,000 of one random type / +400 hero XP / +4,000 of each type ✓ (all four match)

Difference: Travium picks the reward **randomly** per player (old T4.4 behavior); current retail cycles them **deterministically server-wide** [CONFIRMED official] — model the official cycle, use Travium only as validation of the values. Daily-quest rewards not speed-scaled: stated officially AND reproduced in `Quest::calcEffect()` (rate 1 for speeds ≤10 with dailyQuest flag) [CONFIRMED].

---

## 3. Hero XP thresholds & early XP sources

### 3.1 Threshold formula — now triple-sourced

Cumulative XP to reach level L = **`25·L·(L+1)`**:
1. kirilloid model code (doc 06) — `levelExp = 50·L·(L+1)/2`
2. Travian Fandom "Hero" page — T4 formula `Net Experience Needed = 25·level·(level+1)` and inverse `level = floor((sqrt(4·exp+25)−5)/10)` (https://travian.fandom.com/wiki/Hero)
3. Travium `Formulas::heroExperience($level) = 25·L·(L+1)` and identical inverse in `heroLevel()`

→ upgrade to **[CONFIRMED — 3 independent community/code sources]** (still no official statement; multiplier >1 only on >10x worlds per Travium — irrelevant for 1x–10x).

| L | cum. XP | L | cum. XP |
|---|---|---|---|
| 1 | 50 | 8 | 1,800 |
| 2 | 150 | 9 | 2,250 |
| 3 | 300 | 10 | 2,750 |
| 4 | 500 | 15 | 6,000 |
| 5 | 750 | 20 | 10,500 |
| 6 | 1,050 | 25 | 16,250 |
| 7 | 1,400 | 30 | 23,250 |

### 3.2 Early-game XP sources & values

| Source | XP | Tag |
|---|---|---|
| Adventure (normal) | ~8 + 1.5·(adventures done) each, see §1.3 | [UNVERIFIED — Travium] |
| Adventure (difficult) | ×2 | [CONFIRMED] |
| Combat (incl. oasis animals) | 1 XP per crop-consumption of killed units | [CONFIRMED] |
| Daily chest 25-pt (row 1 of cycle) | +50 XP | [CONFIRMED] |
| Daily chest 100-pt (row 2) | +400 XP | [CONFIRMED] |
| Task-system rewards | XP included, amounts unknown (doc 06 gap #1) | open |
| Scroll | +10 XP each | [CONFIRMED] |
| Helmet of Awareness | +15% on all XP (tier 1) | [CONFIRMED] |

Day-1..14 realistic no-combat XP on 1x: first ~25 adventures ≈ 500–700 XP (Travium model) + daily chests (≈ +50 XP every 4th day at 25 pts, +400 every 4th day if hitting 100) + task XP → hero level ≈ **4–7 by day 14 without oasis farming**; oasis clearing dominates XP for aggressive players (1 rat = 1 XP + 40/res type... see doc 06 §5.4).

---

## 4. Auction / silver economics (early game)

### 4.1 Fixed rails [CONFIRMED — official; reproduced in Travium code]

- Exchange: **1 gold → 100 silver; 200 silver → 1 gold** (buy direction costs 2× — a 50% haircut round-tripping).
- **System floor**: unsold auctions are bought by the system at start price = **100 silver** for non-stackable equipment (helmets, weapons, armour, boots, left-hand items), **1 silver per unit** for stackable consumables (ointments, cages, scrolls, tablets). Geldings: only sellable while owning another horse, fixed 100 silver to system.
- Consumables list/sell in stacks (5/10/30/50 per official; Travium fake-auction packages: cages 5/10/30, ointments 5/10/30/50/100, tablets 5/10/30, bandages 5/10/25/50, artwork singles on ≤10x).
- Auction duration ≈ 24h/12h/8h/4h/2h at 1x/2x/3x/5x/10x; last-5-min antisniping; max 5 concurrent sales.

### 4.2 Deterministic silver income floor, week 1–2 (1x)

| Source | Silver | Tag |
|---|---|---|
| Adventure #4 + #8 fixed | ~500 total (2× mean 250; range 100–900) | [UNVERIFIED — Travium] |
| Post-#10 silver drops (≈14% of ~15 adventures to day 14 → ~2 drops) | ~620 (2 × mean 310) | [UNVERIFIED — Travium ×2: rate AND amount] |
| System-floor liquidation of unwanted first-10 loot (ointments ~20 @1, cages 6 @1, book @1... equipment items post-#10 @100) | ~30–300+ | [CONFIRMED floor mechanics; quantities unverified] |
| Starting gold → silver (130 gold would be 13,000 silver — but better spent on bonuses) | 0 in practice | — |

→ Week-1 expected silver ≈ **1,000–1,500 from adventures + floors**, before market skill.

### 4.3 Market prices — band only [UNVERIFIED — community, qualitative]

No systematic early-price dataset found. Qualitative consensus (MoulaCZ guide; r/travian threads on auction speculation):
- **Right after server start there is an offer surplus → prices dip; then peak in the following days** ("buy right after start, sell in the period right after").
- Cages/scrolls/ointments: sell early — prices fall permanently once T2/T3 items appear.
- Selling all first-2-weeks adventure loot at auction (not floor) is community-cited at **~2,000–30,000 silver on a 3x world** depending on item luck; the 40,000-silver Gold Club (200 gold) is reachable "by end of BP with a lucky item".
- Practical band for the calculator: value equipment drops at **100 (floor) to ~2,000–5,000 silver** early; consumables at **1–30 silver/unit**. Expose the multiplier over floor as a user knob (default ~3–5× floor for equipment in week 1).

### 4.4 Gold prices cross-check (doc 06 gap #7)

Travium `Config` gold costs were not extracted this pass; community folklore (Plus 10, NPC 3, instant ~2, res-bonus 5/type, Gold Club 200) unchanged; Gold Club 200 gold and res-bonus 5/type are [CONFIRMED official]; rest stays [UNVERIFIED].

---

## 5. Tutorial micro-quests

**Still undocumented anywhere found** (official First Steps article rev. 12 Nov 2025 mentions only "Advancing Beyond the Tutorial" with zero step detail; no community write-up of the current T4.6 interactive tutorial steps/rewards surfaced; Travium implements only the *old* T4.4 quest lines in `Model/Quest.php`, which match kirilloid's historical data — not the current tutorial).

One indirect observation [UNVERIFIED — MoulaCZ build order]: on a fresh account the following are already "done by default" when the player takes control: **Main Building 1, Rally Point 1, one Woodcutter → 2(?), one Cropland → 2(?)** — implying the tutorial/task-intro auto-grants or force-builds these with instant completion. Day-0 income impact is small (a few hundred resources equivalent).

→ Keep as measurement task: capture the tutorial on a fresh account (screenshots of each popup + rewards) — 30 minutes of work, closes doc 06 gap #8.

---

## 6. Left-hand hero items (official values — gap #9 CLOSED)

Source: Hero Left-Hand Items — `https://support.travian.com/en/support/solutions/articles/7000068826` (= `/en/articles/92`), rev. 25 Nov 2025, full text captured. Cross-checked against kirilloid live (`http://travian.kirilloid.ru/items.php`) — identical. **[CONFIRMED — official + kirilloid live]**

| Family | Tier 1 | Tier 2 | Tier 3 | Effect |
|---|---|---|---|---|
| Shields | Small Shield **+250** | Shield **+1,000** | Large Shield **+4,000** | hero fighting strength |
| Horns of the Natarian | **+20%** | **+25%** | **+30%** | attack vs Natars (hero + accompanying troops) |
| Thief bags | Pouch **10%** | Bag **15%** | Sack **20%** | enemy cranny reduction (stacks with Teuton bonus) |
| **Maps** | Small Map **30%** | Map **40%** | Large Map **50%** | **faster hero return** after adventure/mission |
| Pennants | Small **30%** | Pennant **40%** | Great **50%** | faster troop travel between own villages (hero along) |
| Standards | Small **15%** | Standard **20%** | Great **25%** | faster travel between alliance/confed members (hero along) |

No per-speed variation is stated for these items (unlike spurs/horses). Early-game relevance: only the **Small Map** (tier 1, drops/auctionable week 1) matters — it cuts adventure return legs by 30%, i.e. loop time ≈ `out + return/1.3`, ~13% more adventures/day when return-bound, and faster hero-back-home for oasis raids.

---

## 7. EV model recommendations (engine knobs)

**Model deterministically (high confidence):**
1. First-10 adventure sequence + spawn schedule + the fixed package of §1.1 (with resource amount `A_res` and silver `A_sil` as tunable scalars defaulting to Travium means: `A_res = 575·speed·4` total per resource-adventure, `A_sil = 250`).
2. Daily chest cycle exactly as official table (doc 06 §3.2), gated by a user-selected daily points tier (0/25/50/75/100).
3. Hero XP thresholds `25·L·(L+1)`; level-ups = full heal events.
4. Left-hand map/pennant/standard values; Small Map −30% return time in the adventure loop.
5. Silver floors: liquidation value = 100/item + 1/consumable; exchange 200 silver→1 gold.

**Expose as knobs (data-quality-limited):**
6. `dailyQuestPoints(day)` — default profile: 25 (casual), 75 (active no-gold), 100 (gold user); underlying per-activity points table from §2.1 available as an "advanced" editor since it is [UNVERIFIED].
7. Post-#10 outcome mix — knob with two presets: "official-qualitative" (res 45%, nothing 20%, item 15%, silver 10%, troops 10% — our prior respecting "resources most common") and "Travium" (item 57/res 14/silver 14/troops 14). Default: official-qualitative. E[res|hit] and E[silver|hit] from §1.4.
8. XP per adventure — formula `8 + 1.5·n` (+×2 if difficult; share of difficult adventures as a knob, default ~30% rising with n).
9. Auction premium over floor for sold loot (default 3–5× for equipment, 1–3× for consumables, week-1).
10. Ointment count of adventure #5 and task-system reward table — leave as placeholders pending in-game measurement (doc 06 gap #1 remains open).

**Sanity totals for a 1x, day-0-start, active no-gold account, first 7 days** (using defaults above): adventures ≈ 12–14 done → ~5,000–7,000 res + ~750–1,100 silver + 3 troops + consumables; daily chests at 25pts → +400 res/type +1,200 one-type +100 XP +100 CP; hero production (4+ pts) ≈ 24,000+ res equiv/week. Adventures ≈ a strong day-1–2 spike (~2 days of total early production in one package), then decay to a minor line — matches community meta ("rush adventures 1–6 on day 1").

---

## 8. Open questions (updated)

1. Task-system reward table — **still the #1 gap** (unchanged from doc 06; Travium only implements the pre-2019 lines).
2. Verify §2.1 point values in-game (one active day per gameworld type suffices; check whether "earn gold" and "spend gold" are separate 3-step quests and whether building/field/alliance quests exist in retail T4.6).
3. Verify first-10 amounts in-game: #2/#7 resource totals (predict ≈575/type ±20% ×speed), #4/#8 silver (predict 50–450), #5 ointment count (Travium says 20–25 — most suspicious value), #9 cage count (predict 6).
4. Post-#10 outcome logging (50–100 adventures) to settle the [DISPUTED] distribution; also log XP per adventure vs the `8+rand(n,2n)` prediction.
5. Tutorial capture on fresh account (§5).
6. Whether retail resource-adventure amounts really scale `×(1+15·progress)` — distinguishable by ~day 30 on 1x (~+130%).

## Source index (new this pass)

Official:
- Hero Left-Hand Items — https://support.travian.com/en/support/solutions/articles/7000068826 (rev. 25 Nov 2025; captured full text)
- Adventures — .../7000060172 (rev. 20 Nov 2025; "Community observations" link verified to point only to the Hero-in-early-game article — no official amounts exist)
- Hero in the early game — .../7000092525 (rev. 12 Nov 2025; HP-loss %, reward timing, tier windows — re-captured in full)
- First steps in the game — .../7000092522 (rev. 12 Nov 2025; 130 gold, res-bonus pricing, no tutorial detail)

Community / code:
- **Travium codebase** — https://github.com/Travium/Travium (files listed at top; T4.4-derived fan server; primary quantitative source this pass, all values [UNVERIFIED — Travium] unless corroborated)
- Travian Fandom, Hero — https://travian.fandom.com/wiki/Hero (T4 XP formula 25·L·(L+1) — 2nd/3rd source)
- kirilloid live — http://travian.kirilloid.ru/items.php (left-hand values cross-check; site data confirmed live-accessible via plain HTTP)
- MoulaCZ/Travian-new-guide — https://github.com/MoulaCZ/Travian-new-guide (docs/first-village.md: "~2,300 res" for adventure #2; docs/gold-and-premium.md: sell/keep lists, 40k-silver Gold Club math)
- r/travian via Arctic-Shift archive API (qualitative: early auction price dynamics, "2k–30k silver from early loot on 3x", first-10 content anecdotes)
- Steve's T4 Hero & Adventure FAQ (2011, historical) — http://traviantale.blogspot.com/2011/02/steves-t4-hero-adventure-faq.html (confirms 3-unit troop reward, ×2 hard XP; no amounts)
