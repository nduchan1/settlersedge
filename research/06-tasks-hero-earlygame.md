# 06 — Tasks/Quests, Hero Adventures & Early-Game Income (Travian: Legends ~T4.6)

Research date: 2026-08-12.
Scope: the current ("new", post-2019) task system, daily quests, hero adventures, hero basics, hero items relevant to early economy (incl. Artwork CP), starting account state, and silver/auction basics — for day 1–7 income modeling in a calculator/optimizer.

Tagging convention:
- **[CONFIRMED]** — official Travian source (support.travian.com Knowledge Base / blog.travian.com), or 2+ independent sources.
- **[DISPUTED]** — sources disagree; all versions shown.
- **[UNVERIFIED]** — single (usually community) source.

Note on sources: the official KB (support.travian.com) migrated to a JS-rendered help center in ~2025/2026; the article bodies below were retrieved from Wayback Machine captures of the Freshdesk-era pages (2024–2025 revisions, i.e., current T4.6 content). Old `/en/support/solutions/articles/...` URLs and new `/en/articles/<id>` URLs both listed where known.

---

## Executive summary

1. **The current task system (introduced ~2019, "new task system") pays only resources + hero XP.** Every reward is an *equal amount of each of the 4 resources*. Reward size = task-type multiplier × step number within that type × (1 + hero-level bonus). **The exact reward tables are NOT published anywhere official or community — this is the single biggest data gap for a calculator** (see Open questions). The full *list* of tasks and their trigger levels IS official and reproduced below. [CONFIRMED for structure; reward values unknown]
2. **Daily quests**: up to 10 quests/day, rewards claimable at 25/50/75/100 points (4/day max), reward pools cycle deterministically per gameworld day and are identical for all players. **Daily quest rewards are explicitly NOT scaled by server speed.** The 25-point cycle alone is worth +50 XP / +50 CP / +1,000 res (1 type) / +200 res (each type) on a 4-day rotation. Point values per activity are not officially published. [CONFIRMED for rewards/cycle; point values unknown]
3. **Adventures are the dominant deterministic early income**: 3 adventures at start, ~5–6 in the first 24h on 1x; first 10 adventure rewards are **fixed and known** (horse, resources, troops, silver, ointment, book, resources, silver, cages, XP-only). Spawn rate scales with server speed and decays over time. After #10, rewards are RNG with equal chances for everyone. [CONFIRMED]
4. **Hero = a resource field on legs**: starts with 4 skill points in Resources; each point = 9 res/hr of each type (or 30/hr of one type) at 1x, ×speed; Egyptian hero: 12/40. The +25% gold production bonus applies to hero production too. [CONFIRMED]
5. **Artwork** (consumable): instantly grants CP equal to your avatar's daily CP production × speed factor (×1 at 1x), capped at 2000/1300/1000/700/400 CP for 1x/2x/3x/5x/10x; cooldown 24/24/12/12/6 h. **Cannot drop before adventure #31 (~day 14 on 1x)** — so it is NOT a day-1..7 income knob on 1x, but matters on speed servers. [CONFIRMED]
6. **Starting state**: 750 of each resource [CONFIRMED-community], 130 gold on new avatar [CONFIRMED official], starting CP 500/250/167/100/50 (1x/2x/3x/5x/10x), beginner protection 5+3 / 3+3 / 3+3 / 2+2 / 1+1 days. [CONFIRMED]
7. **Silver**: first-week silver comes from adventures (#4 and #8 fixed silver drops + RNG later) and from selling adventure items/consumables at auction (system buys unsold items at start price, e.g. 100 silver for a helmet, 1 silver/ointment). Exchange: 1 gold = 100 silver; 200 silver = 1 gold. [CONFIRMED]

Calculator implication: day-1..7 income = field/building production + hero production + **first-10 adventure package** + **daily quest chest cycle** + **task rewards**. Items 1 and 2 of the unknowns (task reward values, daily-quest point values) must be measured in-game or datamined — everything else below is modelable now.

---

## 1. Current task system (post-2019 rework)

Source (official): Task System — `https://support.travian.com/en/support/solutions/articles/7000060702-task-system` (KB revision 25 Apr 2024; new URL `https://support.travian.com/en/articles/17`). Mirror: `https://unofficialtravian.com/2025/10/task-system/`.

### 1.1 Structure [CONFIRMED]

- Tasks exist per **village** (each village has its own set) plus **general (avatar-wide) tasks**.
- Each task has **multiple levels/steps** (e.g., Main Building 1 → 3 → 7 → 12 → 20); completing a step grants a reward and reveals the next step.
- The old quest lines ("Tutorial / Economy / Battle / World", pre-2019) are **gone** — see §2 for the historical system so you don't accidentally model it.
- 2022 update: spawn-village Residence task rewards at **level 10** (was 12); a task+reward for **celebrating a party** in the spawn village was added. [CONFIRMED official]

### 1.2 Reward mechanics [CONFIRMED structure, values unknown]

Official text (verbatim, condensed):
> "The reward for the completed task is always a certain number of resources (same amount of each type of resource) and hero experience. The size of the reward depends only on a few factors: Each task type has its own reward multiplier; Each next task of the same type grants a bigger reward; Hero level grants an additional bonus to all rewards."

- Reward = equal amount of wood/clay/iron/crop + hero XP. **No gold, silver, CP, items, or troops from the current task system.**
- Hero level scales rewards up → doing adventures/quests first (leveling the hero) increases subsequent task payouts. Exact bonus per hero level: **not published** (open question).
- Server-speed scaling of task rewards: **not published** (open question; note that daily-quest rewards are explicitly NOT speed-scaled, but no such statement exists for tasks).

### 1.3 General (avatar) tasks [CONFIRMED — official list]

| Task type | Steps |
|---|---|
| Population (avatar total) | 500, 1000, 1500, 2500, 5000, 10000, 20000... (unlimited, doubling) |
| Culture Point **production** (avatar current CP/day, not accumulated) | 500, 1000, 1500, 2500, 5000, 10000, 20000... (unlimited, doubling) |

### 1.4 Spawn-village tasks (first village only) [CONFIRMED — official list]

Building/feature tasks:

| Building / feature | Reward steps at levels |
|---|---|
| Main Building | 1, 3, 7, 12, 20 |
| Warehouse | 1, 3, 7, 12, 20 |
| Granary | 1, 3, 7, 12, 20 |
| Barracks | 1, 3, 7, 12, 20 |
| Stable | 1, 3, 7, 12, 20 |
| Market | 1, 3, 7, 12, 20 |
| Wall | 1, 3, 7, 12, 20 |
| Palace or Command Center | 1, 3, 7, 12, 20 |
| Residence | 1, 3, 7, **10**, 20 |
| Academy | 1, 10, 20 |
| Smithy | 1, 10, 20 |
| Town Hall | 1, 10, 20 |
| Rally Point | 1, 10, 20 |
| Cranny | 1, 3, 6, 10 |
| Workshop | 1 |
| Embassy | 1 |
| Sawmill / Brickyard / Iron Foundry / Grain Mill / Bakery | 1, 5 (each) |
| Town Hall — hold a celebration | (single task) |
| Population (village) | 50, 100, 150, 250, 350, 500, 750, 1000 |
| CP production (village) | 50, 100, 150, 250, 350, 500 |

Resource-field tasks (spawn village):

| Task | Steps |
|---|---|
| A Wood Cutter to level | 2, 4, 7, 10 |
| A Clay Pit to level | 2, 4, 7, 10 |
| An Iron Mine to level | 2, 4, 7, 10 |
| A Crop Field to level | 2, 4, 7, 10 |
| "Even growth" — at least one field of each of the 4 types at level | 2, 4, 7, 10 |
| ALL Wood Cutters to level | 2, 3, 5, 8, 10 |
| ALL Clay Pits to level | 2, 3, 5, 8, 10 |
| ALL Iron Mines to level | 2, 3, 5, 8, 10 |
| ALL Crop Fields to level | 2, 3, 5, 8, 10 |
| ALL 18 resource fields to level | 2, 4, 7, 8, 9, 10 (progress bar counts fields 0/18…18/18) |

### 1.5 Settled-village tasks (every new village) [CONFIRMED — official list]

| Task | Steps |
|---|---|
| Main Building | 1, 10, 20 |
| Warehouse | 1, 10, 20 |
| Granary | 1, 10, 20 |
| Town Hall | 1, 10, 20 |
| Market | 1, 10, 20 |
| Administration building (Residence/Palace/Command Center) | 1, 10, 20 |
| Wall | 1, 10, 20 |
| Rally Point | 1, 10, 20 |
| Barracks | 1 |
| Academy | 1 |
| Cranny | 1, 10 |
| Population | 50, 100, 150, 250, 350, 500, 750, 1000 |
| CP production | 50, 100, 150, 250, 350, 500 |
| One field of each resource type to level | 2, 4, 7, 10 (progress 0/4…4/4) |
| ALL fields to level | 2, 4, 7, 8, 9, 10 (progress 0/18…18/18) |

### 1.6 Conquered-village tasks [CONFIRMED]

- Task status carries over to the conqueror (completed stays completed; **no retro-rewards**, even uncollected ones).
- Always (re)created on conquest: Residence/Palace(/Command Centre for Huns) 1, 10, 20; Wall 1, 10, 20; Loyalty to 100. These replace open similar tasks and do not transfer on re-conquest.

### 1.7 What we know about reward magnitudes [UNVERIFIED / gap]

- No official or community table of exact resource/XP amounts for the current system was found (official KB, unofficialtravian mirror, kirilloid repo, Fandom, forum threads all lack it — kirilloid's `quests.ts` covers only the pre-2019 lines).
- Anecdotal search snippets show per-task rewards in the low hundreds of resources early (comparable to the old system's 100–600-per-task scale), but nothing citable. **Measure in-game** (see Open questions for a measurement plan).

---

## 2. Historical context: the OLD quest lines (pre-2019) — do NOT model

Sources: Travian Fandom `https://travian.fandom.com/wiki/Quests` (documents T3.6 quests and T4 "Tutorial/Economy/World/Battle" task lines with exact rewards); kirilloid's data files `https://github.com/kirilloid/travian/blob/master/src/model/t4/quests.ts` (exact old rewards, e.g. Battle 03 Barracks → [110,140,160,30], Battle 08 "10 adventures" → 500 silver, Economy 06 Marketplace → 600 each, World 07 Gold quest, etc.).

- These lines (with mixed rewards: uneven resources, silver, items, troops, Plus days, gold) were **replaced** by the §1 system in the 2019 rework. [CONFIRMED]
- Useful only as a sanity check on magnitude (old early-game quest line total ≈ several thousand resources + 500 silver + a few consumables across the first days).
- If you see a guide with "Battle/Economy/World XX" tasks — it's the old system. Tag any such reward numbers as **[DISPUTED — old system]**.

---

## 3. Daily quests

Source (official): Daily Quests — `https://support.travian.com/en/support/solutions/articles/7000061163-daily-quests` (rev. 25 Apr 2024; new URL `/en/articles/16`). Blog: "Travian Loop: Daily Quests and Rewards" Part I `https://blog.travian.com/2023/04/travian-loop-daily-quests-and-rewards/`, Part II `https://blog.travian.com/2023/05/travian-loop-daily-quests-and-rewards-part-ii/`.

### 3.1 Mechanics [CONFIRMED]

- Up to **10 quest types per day**; each completed quest gives points.
- Rewards claimable at **25 / 50 / 75 / 100 points** — up to 4 rewards/day; one reward per tier.
- Reset **once per day at the gameworld start time** (server time; shown in the daily-quest popup). Points AND unclaimed rewards are wiped at reset — **rewards must be actively collected before reset**.
- Plus/production-bonus rewards auto-activate at the moment of claiming.
- **"The daily quest rewards are not affected by the server speed."** (verbatim official) — model identical chest values on all speeds.
- Rewards are **not random**: the same reward is available to all players on the gameworld on a given day; the sequence advances by one row per daily reset regardless of whether you claimed. Day 1 of the server always starts at row 1 (+50 Hero XP at 25 points).
- Hint (official): the "train 20 infantry/cavalry" quest requires **20 units queued in one go**.

### 3.2 Reward cycles [CONFIRMED — official table]

Rows advance daily, per column independently... actually per official text, "the next reward in each group becomes available" each reset; each column cycles through its own list:

| Day in cycle | 25 points | 50 points | 75 points | 100 points |
|---|---|---|---|---|
| 1 | +50 Hero XP | +1 day +25% Lumber production | +5 Tablets of Law | +20,000 resources of one random type |
| 2 | +50 Culture Points | +1 day +25% Clay production | +5 Small Bandages | +400 Hero XP |
| 3 | +1,000 resources of one random type | +1 day +25% Iron production | +5 Cages | +4,000 resources of each type |
| 4 | +200 resources of each type | +1 day +25% Crop production | +1 additional Adventure | +400 Culture Points |
| 5 | (repeat from top) | +1 day Travian Plus | +5 Ointments | (repeat from top) |

- 25-pt and 100-pt columns cycle with period 4; 50-pt and 75-pt columns with period 5.
- Early-game modeling: over server days 1–7 a player who hits 25 points daily banks +100 XP, +100 CP, +1,200 res(one type), +400 res(each type) minimum (approx.: rows 1–4 then repeat); hitting 100 points daily is a huge income line (avg 100-pt chest ≈ 20,000/4 + 4,000×4/4 + ... — note the 20k-one-type and 4k-each rows dominate).

### 3.3 Known daily quest activities [CONFIRMED existence; point values UNKNOWN]

Officially attested (KB hint + Travian Loop blogs): complete an adventure; train 20 infantry in one go; train 20 cavalry in one go; win an auction; raid Natars or an oasis; earn/spend gold (×3); hold celebrations (×3). [CONFIRMED existence — blog Part I/II + KB]
Point values per activity: **not published anywhere found** → [open question; measure in-game]. Community consensus is that a fully active no-gold player can reach 100 only on days when the gold/auction quests are avoidable or covered — treat 25–75 as the reliable no-gold band. [UNVERIFIED]

- Note: the daily quest "+1 additional Adventure" (75-pt row 4) interacts with adventure income (§4).
- Note (official adventures article): "Saving one adventure from a previous day helps with daily task completion" → the adventure daily quest is reliably completable if you bank adventures.

---

## 4. Hero adventures

Sources (official): Adventures — `https://support.travian.com/en/support/solutions/articles/7000060172-adventures` (rev. 20 Nov 2025; new URL `/en/articles/46`); Hero in the early game — `.../7000092525-hero-in-early-game` (rev. 19 Feb 2025, contains community-measured tables published by Travian); Game Versions and Speed — `.../7000068688`.

### 4.1 Spawning [CONFIRMED — official]

- Every player starts with **3 adventures**; more appear over time at a decaying rate.
- Adventures spawn around your **capital** and any village with a **Hero's Mansion** (independent of hero location/home).
- **Adventures never expire.** (The 168-hour expiry found on Fandom/old T4 docs is obsolete → [DISPUTED: current official = no expiry; old T4 wiki = 168 h].)
- Item-tier content is locked at adventure **creation** time (a pre-tier-2 adventure never gives tier 2, even if done later).

Spawn rate on **1x** [CONFIRMED official]:

| Server age (1x) | Adventures/day |
|---|---|
| Days 0–2 | ~3 |
| Days 3–16 | ~2 |
| Days 17–63 | ~1.5 |
| Day 64+ | ~1 |

First 24 h ≈ **5–6 total adventures** (3 starting + spawns). Randomness exists (some days 0).

Speed scaling: rates multiply by speed and the age brackets divide by speed. Official 3x example: day 0: 9/day; days 1–5.33: 6/day; days 5.33–21: ~4.5/day; day 21+: 3/day. General rule for the calculator: `rate(speed, day) = speed × rate_1x(day × speed)`. [CONFIRMED for 1x and 3x; rule inferred — treat other speeds as derived]

Timing of the first spawns (1x; divide by speed for faster worlds) [CONFIRMED — official "Hero in early game" table, marked by Travian as based on player tests]:

| Adventure # | Appears (hours after start) |
|---|---|
| 1–3 | available from start |
| 4 | 0–8 h |
| 5 | 8–16 h |
| 6 | 16–24 h |
| 7 | 24–32 h |
| 8 | 32–40 h |
| 9 | 40–48 h |
| 10 | 48–56 h |
| 11..15 | +8 h each (56–64, 64–72, 72–80, 80–88, 88+) |

### 4.2 First 10 adventures — fixed rewards [CONFIRMED — official]

"The first 10 adventures always give fixed rewards in this order":

| # | Reward |
|---|---|
| 1 | Horse (Gelding, tier 1 mount) |
| 2 | Resources |
| 3 | Units (scattered troops of your tribe join) |
| 4 | Silver |
| 5 | Ointment(s) |
| 6 | Book of Wisdom |
| 7 | Resources |
| 8 | Silver |
| 9 | Cages |
| 10 | Experience only ("Nothing") |

After #10: outcomes random, equal chances for all players regardless of account size. Possible outcomes: nothing (XP+damage only) / item / silver / resources (into hero inventory) / troops. **Resources are the most common; items are rarer.** [CONFIRMED]

Exact amounts for the fixed rewards (#2 resources, #4/#8 silver, #5 ointment count, #9 cage count) are **not officially quantified**. unofficialtravian's retelling lists "Silver Coins (3x)" for #4/#8 [UNVERIFIED]. → measure in-game (open question).

### 4.3 Difficulty & hero damage [CONFIRMED]

- Two difficulties, visible before sending: **Normal** (low damage, low XP) and **Difficult/Hard** (higher damage, **double XP**).
- Difficulty of generated adventures ramps with count; location type has no effect on damage.
- Health loss in the first adventures with 0 points in Fighting Strength (official community-measured table, 1x):

| Adv # | Normal HP loss | Hard HP loss |
|---|---|---|
| 1 | 1–3 | 3–4 |
| 2 | 2–4 | 4–8 |
| 3 | 2–7 | 7–12 |
| 4 | 3–9 | 9–16 |
| 5 | 3–11 | 11–20 |
| 6 | 4–14 | 14–24 |
| 7 | 4–16 | 16–28 |
| 8 | 4–18 | 18–32 |
| 9 | 5–21 | 21–36 |
| 10 | 5–23 | 23–39 |
| 11–15 | 6–34 (rising) | 26–54 (rising) |

- Damage is reduced by fighting strength (items or skill points). A full-health hero "usually survives" heavy adventures.
- Modeling guidance: with all points in Resources (standard early meta), budget ointments/health; a level-up fully heals the hero (see §5.4 trick).

### 4.4 Item availability windows [CONFIRMED — official]

| Adventures | Restriction |
|---|---|
| 1–31 | **No** scrolls, small bandages, (large) bandages, **artworks** |
| 32–61 | No (large) bandages |
| 62+ | Everything possible |

On 1x, adventure #31 is reached around **day 14** ("proportionally shorter on higher speeds"). Item tiers: tier 2 items appear after 70/35/23.3/14/7 days (1x/2x/3x/5x/10x); tier 3 after 140/70/46.6/28/14 (earlier + more gradual on worlds with Item Rarities). [CONFIRMED]

### 4.5 Expected-value modeling guidance

Deterministic (model exactly):
- Adventures #1–#10 fixed reward sequence + spawn schedule (§4.1–4.2).
- XP per adventure: not officially quantified per adventure; hard = 2× normal. [gap — measure]

RNG (model as EV):
- Post-#10 outcome distribution (nothing/item/silver/resources/troops) — **no published probabilities**; community consensus only says "resources most common, items rarer". [UNVERIFIED]
- No community dataset with average resources/silver per adventure was found in this pass (searched reddit, forum, kirilloid, unofficialtravian). → Open question; recommend logging 50–100 adventures on a live 1x/2x server or scraping a "Travian adventure log" spreadsheet if one surfaces.
- The 75-point daily chest "+1 additional Adventure" (every 5th day) adds one spawn — include as deterministic when the player hits 75 points.

---

## 5. Hero basics for early game

Sources (official): Hero overview — `.../7000061665` (rev. 20 Nov 2025; also `/en/articles/45`); Hero in early game — `.../7000092525`; Hero Experience — `.../7000060173`; Maximize Your Hero's XP — `.../7000092527`. Community: kirilloid model code `https://github.com/kirilloid/travian/blob/master/src/model/t4/hero.ts`.

### 5.1 Starting hero & skill points [CONFIRMED]

- Hero starts with **4 skill points, all in Resource Production by default**.
- **+4 points per level-up**; four attributes, each max level 100.
- Attributes:
  - **Fighting strength**: +80 hero strength per point (+**100** for Romans); base strength 100 [base value CONFIRMED via kirilloid code `skills.strength * mul + 100`; official articles state the per-point tribe difference].
  - **Off bonus**: +0.2% whole-army attack per point, max +20% (only when hero attacks with the army).
  - **Def bonus**: +0.2% defense of your own troops fighting with the hero, max +20% (not allied reinforcements).
  - **Resources**: production in hero's home village; split evenly or all-in one type (freely switchable).

### 5.2 Hero resource production per point [CONFIRMED — official]

| Tribe | Even split | Single resource |
|---|---|---|
| All except Egyptians | 9/hr of each type per point | 30/hr of one type per point |
| Egyptians | 12/hr of each type per point | 40/hr of one type per point |

Values are **per 1x and multiplied by server speed**. The gold **+25% production bonus applies to hero production too** (official note). Start of game: hero alone = 4 pts × 9 × 4 types = 144 res/hr equiv on 1x (192 for Egyptians) before any level-ups — comparable to all starting fields combined; this is why "all points into resources" is the early meta (official guide says the same).

### 5.3 Tribe hero passives (early-relevant) [CONFIRMED]

- Romans: 100 strength/point (cheaper adventure damage mitigation).
- Gauls: +5 fields/hr mounted speed (scaled by speed) → faster adventure loops.
- Huns: +3 fields/hr for all-cavalry armies with mounted hero.
- Teutons: 20% cranny dip when raiding with hero.
- Egyptians: higher hero resource production (see 5.2).
- Spartans: +50% strength from Spartan weapons. Vikings: −5% loyalty on attacks/raids.

### 5.4 Hero XP & levels

- XP sources: battles (1 XP per crop-supply of killed enemy units; defense XP split among heroes by accompanying army's crop), adventures, daily quests, tasks, scrolls (+10 XP each), oasis animals (1 XP per crop consumption; e.g., rat/spider kills also pay 40 of each resource per animal, elephant 200 of each — official "Maximize XP" guide). [CONFIRMED]
- **XP thresholds**: cumulative XP to reach level L = `25 × L × (L+1)` (T4 halves the classic `50·L·(L+1)`), i.e. L1=50, L2=150, L3=300, L4=500, L5=750, L10=2,750, L20=10,500. [UNVERIFIED — single source: kirilloid model code (`levelExp = 50·L·(L+1) / 2`); official KB does not publish the table. Cross-check in-game.]
- **Level-up fully heals the hero** (official tip: "finish tasks/quests to pop a level — your hero returns to full HP"). [CONFIRMED]
- Max level 100 per attribute; hero level cap effectively 100. [UNVERIFIED — kirilloid]
- Helmet of Awareness (+15% XP, tier 1) multiplies all XP gained. [CONFIRMED]

---

## 6. Hero items relevant to early economy

Sources (official): Hero Consumable Items — `.../7000063372` (rev. 29 Aug 2024); Hero Armour Items — `.../7000068828` (rev. 25 Nov 2025); Hero Item Overview and Mounts — `.../7000064021`; Game Versions and Speed — `.../7000068688` (per-speed table); Culture Points — `.../7000065115` (rev. 8 Oct 2025).

### 6.1 ARTWORK (Town-Hall-independent instant CP) [CONFIRMED — official, exact per-speed table]

- Effect: **instantly adds Culture Points to your avatar**, amount = avatar's **daily CP production** × speed factor, capped:

| Speed | CP granted (× daily CP production) | Cap per artwork use | Usage cooldown |
|---|---|---|---|
| 1x | ×1 | 2000 CP | 24 h |
| 2x | ×2/3 | 1300 CP | 24 h |
| 3x | ×1/2 | 1000 CP | 12 h |
| 5x | ×1/3 | 700 CP | 12 h |
| 10x | ×~1/6 | 400 CP | 6 h |

- **No artwork drops from adventures in the first 31 adventures** (~first 14 days on 1x; proportionally earlier on speed). It CAN, however, be **bought at auction** as soon as someone lists one — on 1x that also can't happen before adventure #31 server-wide, so effectively unavailable in week 1 on 1x. [CONFIRMED for drop restriction; auction availability inference]
- Northern Legends (Annual Special 2024) only: Philosophy alliance bonus raises the artwork CP cap. [CONFIRMED — official note]
- Modeling: on 1x, artwork is a settle-race accelerator only for week 3+ or via auction sniping; on 5x/10x it enters the second-village window.

### 6.2 Consumables (official effects) [CONFIRMED]

| Item | Effect |
|---|---|
| Ointment | Heals hero 1 HP per ointment immediately (max to 100%) |
| Small bandage | Heals up to 25% of battle losses (1 bandage per unit; healing takes min(24h, return time)) |
| Bandage | Heals up to 33% of battle losses (same mechanics) |
| Cage | Captures oasis animals without battle (left→right, 1 of each type per pass); animals defend your village, unfed |
| Scroll | +10 hero XP each (XP-bonus items apply) |
| Book of Wisdom | Resets all attribute points for reassignment |
| Bucket | Free instant hero revive; cooldown 24h at 1x, formula `24h / (RoundDown(speed/3) + 1)`; can't equip on a living hero |
| Tablet of Law | +1% loyalty in hero's home town per tablet, up to 125% |

### 6.3 CP helmets (persistent daily CP — relevant to settle race) [CONFIRMED — official]

| Item (tier) | CP/day at 1x | CP/day at 3x |
|---|---|---|
| Helmet of the Gladiator (T1) | +100 | +50 |
| Helmet of the Tribune (T2) | +400 | +200 |
| Helmet of the Consul (T3) | +1600 | +800 |

Tier 1 Gladiator can drop/be auctioned from day ~1 — a realistic week-1 CP knob (unlike artwork on 1x).

Other early-economy-relevant tier-1 items: Helmet of Awareness (+15% XP), Small Map (faster hero return; value halved... exact % in left-hand article — not fetched, see open questions), Small Spurs (+3 fields/hr at 1x, +6 at 3x), Light Scale Armour (damage −4, +10 HP/day regen), Gelding (hero speed 14 f/h at 1x / 28 at 3x). [CONFIRMED for listed values]

---

## 7. Starting state of a fresh account

Sources (official): First steps — `.../7000092522` (rev. 12 Nov 2025); Beginner's Protection — `.../7000060689` (rev. 18 Nov 2025); Game Versions and Speed — `.../7000068688` (rev. 6 Oct 2025); Culture Points — `.../7000065115`. Community: Fandom Resource/New Village pages.

### 7.1 Resources, gold, CP

- **Starting resources: 750 of each type** (wood/clay/iron/crop). [CONFIRMED-community — Travian Fandom "Resource" & "New Village" pages; not stated in current official KB; assumed speed-independent — verify per server]
- **Starting gold: 130** on a new avatar ("you'll start with a hero, some initial resources, and 130 gold" — official First Steps). [CONFIRMED — official] (Referral/promo gold may add more; Gold transfer from a previous server also possible.)
- **Starting Culture Points** [CONFIRMED — official]:

| Speed | 1x | 2x | 3x | 5x | 10x |
|---|---|---|---|---|---|
| Starting CP | 500 | 250 | 167 | 100 | 50 |
| CP needed for village 2 | 2000 | 800 | 500 | 300 | 200 |

- Starting village: 18 resource fields (4-4-4-6 layout for a normal spawn), all level 0; Main Building 1. [CONFIRMED-community/game standard]

### 7.2 Beginner's protection [CONFIRMED — official]

| Speed | Base | Optional extension (once) |
|---|---|---|
| 1x | 5 days | +3 days |
| 2x | 3 days | +3 days |
| 3x | 3 days | +3 days |
| 5x | 2 days | +2 days |
| 10x | 1 day | +1 day |

Rules: no attacks/raids/scouting/reinforcements in either direction; can receive (not send) resources; under 200 pop only ≥1:1 marketplace offers can be accepted; can attack Natars & unoccupied oases; cannot end protection early; extension offered near expiry, cannot be regained later.

### 7.3 Gold features & durations (early-game toggles)

- **+25% resource production bonus**: per resource type, **5 gold each (20 gold for all four)** [CONFIRMED — official First Steps]; duration **7 days on 1x, 3 days on 2x–10x** [CONFIRMED — speed table]. Applies to hero production as well [CONFIRMED].
- **Travian Plus**: duration 7 days (1x) / 3 days (2x–10x) [CONFIRMED]; features incl. build queue ("waiting loop"), merchants run twice, etc. Cost in gold: **10 gold** [UNVERIFIED — common knowledge, not in fetched KB pages].
- **NPC merchant** (instant 1:1 resource rebalance): cost **3 gold** [UNVERIFIED — common knowledge]. Officially recommended flow: cover shortfalls from hero inventory first, NPC second [CONFIRMED — First Steps].
- **Instant finish** construction: cost ~2 gold [UNVERIFIED]. **Master Builder** queue slots exist [CONFIRMED, cost unverified].
- **Gold Club**: 200 gold, whole server; farm lists, crop finder, trade routes, merchants ×3, troop evacuation [CONFIRMED — official].
- New-account daily-quest link: "earn/spend gold ×3" is a daily quest activity — the 130 starting gold enables it early [CONFIRMED existence].
- With 130 starting gold a typical opener is: 20 (res bonuses) + Plus + a few NPC swaps — model gold as a toggle set {res-bonus ×4, Plus, N × NPC}. [modeling note]

### 7.4 Celebrations (CP generation, week-1 relevant) [CONFIRMED — official speed table]

| Speed | 1x | 2x | 3x | 5x | 10x |
|---|---|---|---|---|---|
| Celebration duration | normal (24h small at TH1) | normal | /2 | /2 | /4 |
| Small celebration CP cap | 500 | 500 | 250 | 250 | 125 |
| Large celebration CP cap | 2000 | 2000 | 1000 | 1000 | 500 |

(TH level-1 small celebration time: 24h at 1x/2x, 12h at 3x/5x, 6h at 10x — official "Hero in early game" table.) Costs of celebrations: see building research doc (01), not covered here.

---

## 8. Silver & auctions as an early income knob

Source (official): Auctions — `.../7000065116` (rev. 27 Nov 2025); Adventures; Gold and Silver exchange — `.../7000064019`.

- Silver sources: adventures (fixed #4/#8 + RNG later), selling items at auction, exchanging gold→silver. [CONFIRMED]
- **Exchange rates: 1 gold → 100 silver; 200 silver → 1 gold.** [CONFIRMED — official]
- Auction mechanics: max-bid proxy bidding; last-5-minutes bid resets timer to 5 min; max 5 concurrent sales; 5-minute cancel window; anti-manipulation random listing delay; consumables sell in stacks of 5/10/30/50. **If nobody bids, the system buys at the starting price** (e.g., 100 silver for a helmet, 1 silver per ointment) — this makes item liquidation deterministic (floor value). [CONFIRMED — official]
- Geldings: can only be sold if you own another horse, and only to the system for a fixed 100 silver; you can never sell your last horse. [CONFIRMED]
- Auction duration ~24h (1x) / ~12h (2x) / ~8h (3x) / ~4h (5x) / ~2h (10x). [CONFIRMED — speed table]
- Early-game use: silver → buy Helmet of the Gladiator / Awareness, ointments, cages, or hold to flip into gold (200:1) for NPC. Week-1 silver on 1x is small (2 fixed silver drops + occasional RNG) — treat as a minor knob; amounts unquantified (open question).

---

## 9. Speed-scaling master table (early-game relevant extract) [CONFIRMED — official]

Source: Game Versions and Speed `.../7000068688` (rev. 6 Oct 2025).

| Quantity | 1x | 2x | 3x | 5x | 10x |
|---|---|---|---|---|---|
| Resource production | ×1 | ×2 | ×3 | ×5 | ×10 |
| Construction / training time | ÷1 | ÷2 | ÷3 | ÷5 | ÷10 |
| Troop speed | ×1 | ×2 | ×2 | ×2 | ×4 |
| Beginner protection | 5+3 d | 3+3 d | 3+3 d | 2+2 d | 1+1 d |
| Plus / res-bonus duration | 7 d | 3 d | 3 d | 3 d | 3 d |
| Starting CP | 500 | 250 | 167 | 100 | 50 |
| CP for 2nd village | 2000 | 800 | 500 | 300 | 200 |
| Artwork CP multiplier | ×1 | ×2/3 | ×1/2 | ×1/3 | ×~1/6 |
| Artwork CP cap | 2000 | 1300 | 1000 | 700 | 400 |
| Artwork cooldown | 24 h | 24 h | 12 h | 12 h | 6 h |
| Small/large celebration caps | 500/2000 | 500/2000 | 250/1000 | 250/1000 | 125/500 |
| Tier 2 items appear | 70 d | 35 d | 23.3 d | 14 d | 7 d |
| Auction duration | ~24 h | ~12 h | ~8 h | ~4 h | ~2 h |
| Daily quest rewards | — identical on all speeds (explicit official statement) — |

(Full CP-requirement table per village count for all speeds is in the Culture Points article `.../7000065115` — copied into research doc 05/data if needed; villages 1–50 values were captured during this research.)

---

## Open questions (ranked by calculator impact)

1. **Exact reward values of the current task system** (resources + XP per task step, per task type; the task-type multipliers; the hero-level bonus %; speed scaling if any). Not published officially or by any community source found (kirilloid only covers pre-2019 quests). → Plan: record every task reward on a fresh 1x and 2x account for the first ~48h (screenshot or scrape `tasks` endpoint), fit `reward(type, step, heroLevel)`; check whether values match across speeds.
2. **Daily quest activity list + point values** (the 10 quest types and points each; whether the mix rotates). Officially attested activities: adventure, train 20 inf / 20 cav (one order), win auction, raid Natars/oasis, earn gold ×3 / spend gold ×3, hold celebrations ×3. → Measure in-game (one day of screenshots suffices per gameworld type).
3. **Adventure reward magnitudes**: resource amounts (#2/#7 and RNG ones — do they scale with hero level / server age / storage?), silver amounts (#4/#8 and RNG), ointment/cage counts (#5/#9), XP per adventure (normal vs hard, by adventure number). No official numbers; no solid community dataset found. → Log adventures; also check if the "Community observations" link in the KB adventures article gains numbers in future revisions.
4. **Post-#10 adventure outcome probabilities** (nothing/item/silver/resources/troops distribution) — needed for EV; only qualitative statements exist.
5. **Hero XP thresholds** — verify `25·L·(L+1)` in-game (kirilloid-only currently). One evening of play verifies L1–L5.
6. **Starting resources on non-1x speeds** — 750 each is community-attested for standard worlds; confirm identical on 2x/5x/10x and on Annual Special (Advanced Start worlds differ — see KB "Advanced Start" `.../7000091817`, not researched here).
7. **Gold prices of Plus / NPC / instant finish** in current shop (10 / 3 / ~2 gold are community folklore; the KB gold article lists features but not prices).
8. **Tutorial micro-quests**: the current game still has a short interactive tutorial before/alongside the task system (First Steps mentions "Advancing Beyond the Tutorial"); its step list and rewards are undocumented → capture on a fresh account (small but nonzero day-0 income).
9. **Left-hand items** (Small Map return-speed %, Pennant, Standard values per speed) — article `.../7000068826` not fetched this pass; relevant to adventure loop time modeling.

---

## Source index

Official (Travian Games):
- Task System — https://support.travian.com/en/support/solutions/articles/7000060702-task-system (new: /en/articles/17)
- Daily Quests — https://support.travian.com/en/support/solutions/articles/7000061163-daily-quests (new: /en/articles/16)
- Adventures — https://support.travian.com/en/support/solutions/articles/7000060172-adventures (new: /en/articles/46)
- Hero in the early game — https://support.travian.com/en/support/solutions/articles/7000092525-hero-in-early-game (new: /en/articles/141)
- Hero overview — https://support.travian.com/en/support/solutions/articles/7000061665-hero-overview (new: /en/articles/45)
- Hero Experience — https://support.travian.com/en/support/solutions/articles/7000060173-hero-experience (new: /en/articles/49)
- Maximize Your Hero's XP — https://support.travian.com/en/support/solutions/articles/7000092527-maximizing-hero-experience-and-growth
- Hero Consumable Items — https://support.travian.com/en/support/solutions/articles/7000063372-hero-consumable-items
- Hero Armour Items — https://support.travian.com/en/support/solutions/articles/7000068828-hero-armour-items
- Hero Item Overview and Mounts — https://support.travian.com/en/support/solutions/articles/7000064021-hero-item-overview-and-mounts
- Culture Points — https://support.travian.com/en/support/solutions/articles/7000065115-culture-points-cp- (new: /en/articles/51)
- Game Versions and Speed — https://support.travian.com/en/support/solutions/articles/7000068688-game-versions-and-speed (new: /en/articles/20)
- Beginner's Protection — https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection (new: /en/articles/12)
- Auctions — https://support.travian.com/en/support/solutions/articles/7000065116-auctions (new: /en/articles/94)
- First steps in the game — https://support.travian.com/en/support/solutions/articles/7000092522-first-steps-in-the-game
- Gold/Plus/Gold Club features — https://support.travian.com/en/support/solutions/articles/7000061561-available-gold-plus-gold-club-features
- Blog, Travian Loop: Daily Quests and Rewards Part I — https://blog.travian.com/2023/04/travian-loop-daily-quests-and-rewards/ ; Part II — https://blog.travian.com/2023/05/travian-loop-daily-quests-and-rewards-part-ii/
- Blog, Game Secrets ~ Pro-tips on Hero inventory — https://blog.travian.com/2024/02/game-secrets-hero-inventory-packages/

Community / cross-checks:
- The Unofficial Travian Community (KB mirrors) — https://unofficialtravian.com/2025/10/task-system/ , /2025/10/daily-quests/ , /2025/10/adventures/ , /2025/10/hero-overview/ , /2025/01/unleashing-the-heros-potential-beginner-protection-stage/ , /2025/01/game-secrets-your-very-first-steps-in-the-game/
- kirilloid (open-source model) — https://github.com/kirilloid/travian (src/model/t4/quests.ts = OLD quest lines; src/model/base/hero.ts + t4/hero.ts = XP formula 25·L·(L+1))
- Travian Fandom — https://travian.fandom.com/wiki/Quests (old system), /wiki/Resource & /wiki/New_Village (750 starting resources), /wiki/Adventure (contains obsolete 168h expiry — disputed)
- Forum announcement/feedback (new task system, 2019) — https://wbb.forum.travian.com/index.php?thread/651399-new-task-system-feedback-thread/
