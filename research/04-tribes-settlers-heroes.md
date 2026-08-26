# Research 04 — The Six Tribes: Bonuses, Special Buildings, Settlers, Heroes

**Scope:** Travian: Legends, current version (~T4.6), researched 2026-08-12.
**Tagging:** [CONFIRMED] = official source or 2+ independent non-kirilloid sources · [DISPUTED] = conflicting sources, all versions shown · [UNVERIFIED] = single source.

Primary sources used throughout:
- Official KB, tribe overview: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages
- Official KB, per-tribe advantage pages: articles/7 (Huns), articles/9 (Egyptians), articles/10 (Spartans), articles/8 (Teutons)
- Official KB, hero: https://support.travian.com/en/articles/45-hero-overview , https://support.travian.com/en/articles/141-hero-in-the-early-game
- Official KB, buildings: articles/216 (Palace/Residence/Command Center), articles/52 (Expansion slots), articles/41 (Trapper), articles/81 (Horse Drinking Trough), articles/77 (Hospital & Asclepeion), articles/64 (Walls & Rams), articles/35 (Cranny), articles/20 (Game versions & speed)
- Official-article mirror (verbatim copies of the KB): https://unofficialtravian.com (used where the KB page 404s or to double-check exact wording)
- Cross-checks: kirilloid live data (http://travian.kirilloid.ru/js/units.js — current T4.6 dataset, richer than the stale GitHub repo), github.com/kirilloid/travian (historical versions), travian.fandom.com (via MediaWiki API), github.com/adipiciu/Travian-scripts/issues/24 (Spartan unit dump)

---

## Executive summary

- The six playable tribes on modern T4.6 worlds are **Romans, Gauls, Teutons, Egyptians, Huns, Spartans**. Egyptians/Huns entered with the *Fire and Sand* special (2016) and are permanent since; Spartans entered with *Glory of Sparta* (2022). [CONFIRMED — official KB + fandom]
- **Settler cost/time differs per tribe** (table below). Gauls are the cheapest & fastest settlers (18,100 res, 22,700 s each at 1x); Huns the most expensive (20,900 res); Spartans the slowest (34,100 s each). Every settler carries 3,000 resources, upkeep 1, and 3 settlers found a village from a **Residence/Palace/Command Center expansion slot** (Residence slots at L10/L20; Palace and Command Center at L10/15/20). Training time divides by server speed.
- **Hero attributes** (4 points per level): Fighting strength +80/point (**Romans +100**), Off/Def bonus +0.2%/point (cap 20%), Resources **+9/hr of each type per point, or +30/hr of a single type** (×server speed). **Egyptian heroes: 12 each / 40 single** — the official prose says "+25%", but the official numeric table implies +33% (see Disputed).
- **Special buildings:** Roman Horse Drinking Trough (−1%/lvl cavalry training time, crop −1 for each cavalry type at levels 10/15/20), Gaul Trapper (up to 400 traps, then additional trappers allowed), Teuton Brewery (capital-only, +1%/lvl account-wide attack during 72 h mead celebration; chiefs −50%, catapults random-target), Egyptian Waterworks (+5% of the oasis bonus per level → oasis bonus ×2 at L20), Hun Command Center (Residence/Palace hybrid, 3 slots), Spartan Asclepeion (Hospital variant: 60% of losses wounded vs 40%).
- **Roman economy edge:** can build one building **and** one resource field simultaneously (dual queue) — the only tribe-level economy difference besides walls/crannies/merchants. No tribe has different resource-field or building costs.

---

## 1. Romans

### Tribe bonuses (current official list)
Source: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages (+ mirror)

| Fact | Status |
|---|---|
| Simultaneous construction of one building **and** one resource field (dual queue) | [CONFIRMED — official] |
| Merchants carry **500** res, speed **16** fields/h | [CONFIRMED — official + mirror] |
| Hero: fighting strength **+100 per point instead of +80** | [CONFIRMED — official articles 3 & 45] |
| City Wall: highest wall bonus (**+3%/lvl**, 10 base def pts/lvl) but lowest durability (1) | [CONFIRMED — official articles 3 & 64] |
| Senator lowers loyalty **20–30%** (other tribes' chiefs mostly 20–25%) | [CONFIRMED — official article 3] |
| Horse Drinking Trough (see below) | [CONFIRMED — official] |

### Horse Drinking Trough
Source: https://support.travian.com/en/articles/81-reducing-crop-consumption-and-horse-drinking-trough

- Roman-only. Prerequisites: **Stable 20, Rally Point 10**. [CONFIRMED — official]
- **Training time of all cavalry −1% per level** (max level 20 → −20%). [CONFIRMED — official]
- Crop upkeep −1: **Equites Legati at level 10, Equites Imperatoris at level 15, Equites Caesaris at level 20**. [CONFIRMED — official]

### Units relevant to early game (1x, per unit, kirilloid live cross-checked with official Community Week stats pages)
| Unit | Off | Def i/c | Speed | Carry | Cost (w/c/i/cr) | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Legionnaire | 40 | 35/50 | 6 | 50 | 120/100/150/30 | 1,600 | 1 |
| Praetorian | 30 | 65/35 | 5 | 20 | 100/130/160/70 | 1,760 | 1 |
| Imperian | 70 | 40/25 | 7 | 50 | 150/160/210/80 | 1,920 | 1 |

[CONFIRMED — kirilloid live + official unit-stat pages (support articles 192/193 series)]. Cheapest raider = Legionnaire (hybrid). Romans have no cheap dedicated raider — a known early-game weakness. [CONFIRMED — official "5 things" guides]

---

## 2. Gauls

### Tribe bonuses
| Fact | Status |
|---|---|
| Fastest units in the game (e.g., Theutates Thunder speed 19) | [CONFIRMED — official] |
| **Crannies hide 1.5× capacity** (L10 cranny: 3,000 vs 2,000) | [CONFIRMED — official articles 3 & 35] |
| Merchants carry **750** res, speed **24** fields/h (fastest merchants) | [CONFIRMED — official + mirror] |
| Hero: **+5 fields/h speed when mounted** (scales with world speed) | [CONFIRMED — official articles 3 & 45] |
| **Cheapest & fastest settlers** (see settler table) | [CONFIRMED — official mirror ("cheap settlers") + kirilloid + fandom] |
| Palisade: +2.5%/lvl def bonus, 8 base def pts/lvl, durability 2 | [CONFIRMED — official article 64] |
| Chieftain lowers loyalty 20–25% | [CONFIRMED — official] |

### Trapper
Source: https://support.travian.com/en/articles/41-trapper

- Gaul-only, buildable in any Gaul village. A single Trapper holds **up to 400 traps at L20**; after one Trapper reaches L20 you may build **additional Trappers in the same village**. [CONFIRMED — official]
- Traps start at ~10 at level 1 rising to 400 total at level 20 (non-linear per-level table exists in the official article). Per-level trap counts: [UNVERIFIED — official article references a table not captured; level 1 = 10 and L20 total = 400 are confirmed]
- Trapped troops are harmless and don't consume the trapper-owner's crop; **raids cannot free trapped troops, only normal attacks**; when freed by a successful attack **25% of the trapped troops die** and used traps are destroyed; owner-released captives cost nothing and traps repair free. [CONFIRMED — official]

### Early units (1x)
| Unit | Off | Def i/c | Speed | Carry | Cost | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Phalanx | 15 | 40/50 | 7 | 35 | 100/130/55/30 | 1,040 | 1 |
| Swordsman | 65 | 35/20 | 6 | 45 | 140/150/185/60 | 1,440 | 1 |

[CONFIRMED — kirilloid live + official]. Phalanx = one of the best cost-efficiency defenders; Gauls' cheapest raider is the Theutates Thunder (350/450/230/60, needs Stable) — early raiding usually skipped or done with hero.

---

## 3. Teutons

### Tribe bonuses
| Fact | Status |
|---|---|
| Cheapest, fastest-trained troops ("fastest training speed among all tribes") | [CONFIRMED — official article 144] |
| Merchants carry **1000** res (highest), speed **12** fields/h (slowest) | [CONFIRMED — official + mirror] |
| Hero: **20% "Cranny dip" (plunder bonus)** — enemy crannies protect only 80% of capacity vs armies attacking **with the hero**; base 20%, can be raised with items | [CONFIRMED — official articles 3/45 + cranny article] |
| Earth Wall: +2%/lvl, 6 base def pts/lvl, durability 5 (hardest to destroy) | [CONFIRMED — official article 64] |
| Chief lowers loyalty 20–25% | [CONFIRMED — official] |
| Brewery (below) | [CONFIRMED — official] |

Note (history): the old T3 rule "crannies only protect 2/3 against any Teuton attacker" is **gone**; in T4.6 the cranny reduction is tied to the **Teuton hero** (20%). [CONFIRMED — official cranny & hero articles]

### Brewery
Sources: official Brewery article (mirror: https://unofficialtravian.com/2025/10/brewery/), fandom, official article 144.

- Teuton-only, **capital only**, prerequisites **Granary 20 + Rally Point 10**. [CONFIRMED — official mirror + fandom]
- Enables a **mead celebration ("festival")**: while active, all attacking troops of the account get **+1% attack per Brewery level** (max L20 → +20%, account-wide). Bonus is evaluated **when the attack lands**, not when launched. [CONFIRMED — official]
- Celebration lasts **72 h**; cost **3,870 wood / 1,680 clay / 215 iron / 10,900 crop** per celebration. [CONFIRMED — 2 sources (search-verified fandom + travibot FAQ); duration also in official snippet] 
- Drawbacks while active: **chiefs' persuasion −50%** and **catapults hit only random targets**. [CONFIRMED — official]
- If the Brewery is destroyed mid-celebration the attack bonus stops but the chief/catapult penalties persist for that celebration. [UNVERIFIED — official mirror, single detailed source]

### Early units (1x)
| Unit | Off | Def i/c | Speed | Carry | Cost | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Clubswinger | 40 | 20/5 | 7 | 60 | 95/75/40/40 | 720 | 1 |
| Spearman | 10 | 35/60 | 7 | 40 | 145/70/85/40 | 1,120 | 1 |
| Axeman | 60 | 30/30 | 6 | 50 | 130/120/170/70 | 1,200 | 1 |

[CONFIRMED — kirilloid live + official]. **Clubswinger is the classic cheapest raider in the game** (250 total res, 720 s at 1x, carries 60). [CONFIRMED]

---

## 4. Egyptians

Introduced with *Fire and Sand* (2016 annual special), permanent tribe since T4.4 rollout. [CONFIRMED — official/fandom]

### Tribe bonuses
Source: https://support.travian.com/en/articles/9-the-egyptians-and-their-advantages , articles/149

| Fact | Status |
|---|---|
| Very cheap, very fast-trained basic units (Slave Militia = cheapest/fastest-trained defensive unit in the game) | [CONFIRMED — official] |
| Merchants carry **750** res, speed **16** fields/h | [CONFIRMED — official] |
| Hero: increased resource production — see Hero section (12 each / 40 single per point vs 9/30) | [CONFIRMED numbers / DISPUTED label, see §8] |
| Stone Wall: +2.5%/lvl (like Palisade), 8 base def pts/lvl, durability 4 (very hard to destroy) | [CONFIRMED — official article 64] |
| Nomarch lowers loyalty 20–25% | [CONFIRMED — official] |
| Waterworks (below) | [CONFIRMED — official] |
| Weak offense (single off-infantry line; chariot hammer is below other tribes) | [CONFIRMED — official article 149] |

### Waterworks
Sources: official article 149; official Oasis article; fandom Waterworks page (full cost table).

- Egyptian-only. Prerequisite on regular worlds: **Hero's Mansion level 10** (cities on special servers differ). [CONFIRMED — official article 149]
- **Each level increases the bonus of ALL oases annexed to that village by 5% of the oasis bonus** — i.e., at **level 20 the oasis bonus is doubled** (a 25% oasis effectively becomes 50%; a 50% crop oasis becomes 100%). It is a relative multiplier (×(1 + 0.05·level)) on the oasis bonus, **not** +5 percentage points of production. [CONFIRMED — official ("its maximum effect at level 20 doubles the effect of oases") + fandom table]
- Max level 20; L20 cumulative cost ≈ 2.21 M resources (fandom cost table, matches standard 1.28 growth). [UNVERIFIED — fandom only for exact per-level costs]

### Early units (1x)
| Unit | Off | Def i/c | Speed | Carry | Cost | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Slave Militia | 10 | 30/20 | 7 | 15 | 45/60/30/15 | 530 | 1 |
| Ash Warden | 30 | 55/40 | 6 | 50 | 115/100/145/60 | 1,380 | 1 |
| Khopesh Warrior | 65 | 50/20 | 7 | 45 | 170/180/220/80 | 1,440 | 1 |

[CONFIRMED — kirilloid live + fandom; Slave Militia superlatives official]. Note: Slave Militia is crop-inefficient per defense point for late-game standing defense (official article 149 warns about this). Ash Warden training time 1,320 s in the stale kirilloid GitHub data vs **1,380 s** in kirilloid live — use 1,380. [DISPUTED — minor, live data preferred]

---

## 5. Huns

Introduced with *Fire and Sand* (2016). [CONFIRMED]

### Tribe bonuses
Source: https://support.travian.com/en/articles/7-the-huns-and-their-advantages , articles/147

| Fact | Status |
|---|---|
| Strong, fast cavalry; only tribe with 3 attacking cavalry units; Spotter = fastest scout (speed 19) | [CONFIRMED — official] |
| Merchants carry **500** res, speed **20** fields/h | [CONFIRMED — official] |
| Hero: **+3 fields/h for a mounted army led by a mounted hero — army must contain no infantry** (scales with world speed) | [CONFIRMED — official articles 3/45] |
| Makeshift Wall: **+1.5%/lvl** (weakest bonus), 6 base def pts/lvl, durability 1 | [CONFIRMED — official article 64] |
| **Logades lowers loyalty 15–30%** (widest, riskiest range) | [CONFIRMED — official articles 7/216] |
| Command Center (below) | [CONFIRMED — official] |

### Command Center
Source: https://support.travian.com/en/articles/216-guide-the-palace-residence-and-command-center , articles/52

- **Hun-only, one per village.** Trains settlers & Logades like a Residence/Palace. [CONFIRMED — official]
- **3 expansion slots at levels 10 / 15 / 20** (same as Palace; Residence gives 2 at 10/20) while being buildable in **every** village (Palace: one per account). "Combines the best of the other two buildings"; protects the village from conquest like Residence/Palace. [CONFIRMED — official]
- Huns can still build Residence/Palace normally (Palace needed to designate a capital — Command Center does **not** allow declaring a capital). [CONFIRMED for capital-relocation being Palace-only — official article 216; the explicit statement "CC cannot set capital" is implicit: only Palace "allows capital relocation"]
- Costs/CP of Command Center vs Residence: not captured from an official table. [UNVERIFIED — open question]

### Early units (1x)
| Unit | Off | Def i/c | Speed | Carry | Cost | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Mercenary | 35 | 40/30 | 6 | 50 | 130/80/40/40 | 810 | 1 |
| Bowman | 50 | 30/10 | 6 | 30 | 140/110/60/60 | 1,120 | 1 |
| Steppe Rider | 120 | 30/15 | 16 | 75 | 290/370/190/45 | 2,400 | 2 |

[CONFIRMED — kirilloid live + fandom]. Mercenary = decent cheap raider/hybrid; Huns are the premier cavalry-raiding tribe. Steppe Rider carry 75 (kirilloid GitHub says 115 — stale; fandom & live agree on 75). [DISPUTED — resolved in favor of live+fandom: 75]

---

## 6. Spartans

Introduced with *Glory of Sparta* (2022 annual special); available on regular/annual worlds since. [CONFIRMED — official blog/KB references; exact server availability varies per world]

### Tribe bonuses
Source: https://support.travian.com/en/articles/10-the-spartans-and-their-advantages , articles/145

| Fact | Status |
|---|---|
| Very strong, crop-efficient units — higher combat stats at the **same** upkeep, but expensive and slow to train | [CONFIRMED — official] |
| Merchants carry **500** res, speed **14** fields/h | [CONFIRMED — official] |
| Hero: **+50% fighting strength from Spartan weapons**; Spartan weapons also give bigger bonuses to Spartan troops | [CONFIRMED — official articles 3/10/45] |
| Defensive Wall: **+2%/lvl** bonus, **10** base def pts/lvl, durability 2 | [CONFIRMED — official article 64] |
| Ephor lowers loyalty 20–25% | [CONFIRMED — official] |
| Asclepeion (below) | [CONFIRMED — official] |

### Asclepeion (replaces Hospital)
Source: https://support.travian.com/en/articles/77-hospital-and-asclepeion

- All non-Spartan tribes can build the **Hospital**: **40%** of a battle's own losses return as *wounded*; Spartans instead build the **Asclepeion**: **60%** of losses return as wounded. Applies when attacking, defending and reinforcing. [CONFIRMED — official]
- Asclepeion also has **lower building requirements** and **produces more culture points** than the Hospital. [CONFIRMED — official]
- Healing costs the same resources as training; healing is **2× as fast** as training the unit in an equal-level Barracks/Stable. Wounded units consume **no crop**, can't fight, and **decay 10%/day** while not queued for healing. If the building is destroyed, wounded become inaccessible until rebuilt; conquest kills them. [CONFIRMED — official]
- Note for the optimizer: Hospitals/Asclepeions exist only on gameworlds with the Hospital feature enabled (most current T4.6 annual/regular worlds). [UNVERIFIED — check per-server config]

### Units (1x; kirilloid live, costs cross-checked vs fandom & adipiciu dump — all three agree on costs)
| Unit | Off | Def i/c | Speed | Carry | Cost | Time (s) | Upkeep |
|---|---|---|---|---|---|---|---|
| Hoplite | 50 | 35/30 | 6 | 60 | 110/185/110/35 | 1,700 | 1 |
| Sentinel (scout) | 0 | 40/22 | 9 | 0 | 185/150/35/75 | 1,232 | 1 |
| Shieldsman | 40 | 85/45 | 8 | 40 | 145/95/245/45 | 1,936 | 1 |
| Twinsteel Therion | 90 | 55/40 | 6 | 50 | 130/200/400/65 | 2,112 | 1 |
| Elpida Rider | 55 | 120/90 | 16 | 110 | 555/445/330/110 | 2,816 | 2 |
| Corinthian Crusher | 195 | 80/75 | 9 | 80 | 660/495/995/165 | 3,432 | 3 |
| Ram | 65 | 30/80 | 4 | 0 | 525/260/790/130 | 4,620 | 3 |
| Ballista (catapult) | 50 | 60/10 | 3 | 0 | 550/1,240/825/135 | 9,900 | 6 |
| Ephor | 40 | 60/40 | 4 | 0 | 33,450/30,665/36,240/13,935 | 77,550 | 4 |
| Settler | 10 | 80/80 | 5 | 3,000 | 5,115/5,580/6,045/3,255 | 34,100 | 1 |

Stats/costs [CONFIRMED — 2+ sources (fandom API + adipiciu dump; kirilloid live agrees)]. Training times [UNVERIFIED-leaning — kirilloid live + adipiciu dump agree, but both may share provenance; no official times table found].
- Spartan early raiding is explicitly poor: expensive base units, long training times. [CONFIRMED — official article 145]
- Sentinel doubles as an unusually good cheap defender for a scout. [CONFIRMED — official article 145]
- Spartans notably have **no dedicated anti-cavalry powerhouse** and are "vulnerable to cavalry". [CONFIRMED — official article 145]

---

## 7. SETTLERS — the key table (per settler, 1x speed)

3 settlers found a new village. Requirements: **Residence L10 (1st slot) / L20 (2nd slot)** or **Palace L10/15/20** or **Command Center (Huns) L10/15/20**, plus culture points. Settlers carry 3,000 resources each (the trio arrives with 750 of each resource to kickstart the village), upkeep 1, map speed 5 fields/h.

| Tribe | Wood | Clay | Iron | Crop | **Total** | Time @1x (per settler) | h:mm:ss |
|---|---|---|---|---|---|---|---|
| Romans | 4,600 | 4,200 | 5,800 | 4,400 | **19,000** | 26,900 s | 7:28:20 |
| Teutons | 5,800 | 4,400 | 4,600 | 5,200 | **20,000** | 31,000 s | 8:36:40 |
| Gauls | 4,400 | 5,600 | 4,200 | 3,900 | **18,100** | 22,700 s | 6:18:20 |
| Egyptians | 5,040 | 6,510 | 4,830 | 4,620 | **21,000** | 24,800 s | 6:53:20 |
| Huns | 6,100 | 4,600 | 4,800 | 5,400 | **20,900** | 28,950 s | 8:02:30 |
| Spartans | 5,115 | 5,580 | 6,045 | 3,255 | **19,995** | 34,100 s | 9:28:20 |

Status per row:
- **Romans, Teutons**: costs+times [CONFIRMED — official-derived stats pages + kirilloid (identical)]
- **Gauls**: [CONFIRMED — kirilloid + fandom + official "cheap settlers" statement]
- **Egyptians**: cost [CONFIRMED — fandom + kirilloid live agree]. **Version note:** at Fire-and-Sand launch the cost was 4,560/5,890/4,370/4,180 (kirilloid GitHub archive); the Dec-2021/2022 balancing raised it exactly +10.5% to the values above. Time 24,800 s [UNVERIFIED — kirilloid live only; fandom omits the time]
- **Huns**: cost+time [CONFIRMED — fandom (8:02:30 comment) + kirilloid live agree]
- **Spartans**: cost [CONFIRMED — fandom API + adipiciu dump + kirilloid live all agree]. Time 34,100 s (9:28:20) [UNVERIFIED-leaning — kirilloid live + adipiciu dump, no official table]

**Server speed scaling:** troop (and settler) training time is divided by server speed — /2, /3, /5, /10 on 2x/3x/5x/10x worlds. [CONFIRMED — official article 20 "Game versions and speed"]. Unit *movement* speed only doubles on 2x–5x and quadruples on 10x (relevant for settler walk time). [CONFIRMED — official article 20]

**⚠ Open mechanic (affects optimizer):** whether Residence/Palace/CC **level above 10** reduces settler training time (like Barracks levels do). Fandom's Settler page lists "7:28:20 (Level 20 Palace: 3:02:21)" implying yes; kirilloid's calculator also applies per-level speed-up to the training building. No official statement captured. Treat the table's times as the **base** and verify the building-level multiplier in-game. [DISPUTED / OPEN]

Historical note: T3.5/T3.6 servers had ~25% more expensive settlers (e.g., Roman 5,800/5,300/7,200/5,500); T4 reverted to the values above. Don't mix the two datasets. [CONFIRMED — kirilloid version archives]

---

## 8. Heroes

Source: https://support.travian.com/en/articles/45-hero-overview , articles/141, articles/47.

### Attribute system (current, post-April-2022 hero rework)
- Hero starts with 4 skill points and gains **4 points per level**. [CONFIRMED — official]
- **Fighting strength:** +80 per point; **Romans +100 per point**. Base strength ≈ 100 at 0 points [base value UNVERIFIED — kirilloid formula only]. [CONFIRMED for 80/100 — official]
- **Off bonus:** +0.2% attack for the whole attacking army per point, **max 20%** (100 points). Applies only when the hero attacks with the army. [CONFIRMED — official]
- **Def bonus:** +0.2% defense for the whole defending army per point, max 20%. Applies only when the hero defends with the army. [CONFIRMED — official]
- **Resources:** per point, **+9/hour of every resource** OR **+30/hour of one chosen resource** (switchable for free), **multiplied by server speed**; production goes to the hero's home village regardless of hero location. [CONFIRMED — official article 141 + mirror]
- Hero health: **default regeneration 10%/day**; ointments heal 1% each; full heal on level-up. No "regeneration" attribute exists in Legends. [CONFIRMED — official article 47]
- Hero speed: 7 fields/h on foot (mount speed = horse item); [UNVERIFIED — kirilloid; official articles state tribe speed bonuses but not the base 7].

### Tribe-specific hero bonuses (current official list)
| Tribe | Hero bonus | Status |
|---|---|---|
| Romans | Strength +100/point instead of +80 | [CONFIRMED — official] |
| Gauls | +5 fields/h when mounted (scales with world speed) | [CONFIRMED — official] |
| Teutons | 20% cranny dip (enemy cranny protects only 80%) for armies attacking with the hero | [CONFIRMED — official] |
| Egyptians | Higher hero resource production: **12 of each / 40 of one** per point (vs 9/30) | [CONFIRMED numbers — official article 141; label DISPUTED, below] |
| Huns | +3 fields/h for fully-mounted army led by mounted hero (no infantry allowed; scales with world speed) | [CONFIRMED — official] |
| Spartans | Hero gets **+50% fighting strength from Spartan weapons**; Spartan weapons give increased troop bonuses | [CONFIRMED — official] |

### The Egyptian hero bonus — verdict
- **Current, authoritative numbers:** ordinary heroes produce **9 of each / 30 of one** resource per point; **Egyptian heroes 12 of each / 40 of one** (all × server speed). Source: official KB article 141 "Hero in the early game" + its verbatim mirror. [CONFIRMED]
- **The "×2 field/production bonus" is FALSE for current versions**, and even "+25%" (which appears in the official Egyptians-advantages prose and fandom) is arithmetically off: 12/9 = 40/30 = **+33%**. The kirilloid GitHub archive (`t4.fs/hero.ts`, `res = 2`) reflects the **original 2016–2021 doubling** (then 12/40 vs the old base 6/20) — that is where "×2" folklore (and the kirilloid suspicion) comes from. After the April-2022 hero update the base rose to 9/30 while Egyptians stayed 12/40, shrinking the effective bonus to +33%. [DISPUTED only in labeling: official prose "+25%" vs official table "+33%"; use **12/40** in the app.]
- The Egyptian bonus **never** applied ×2 to village resource-field production — it always concerned hero production only. [CONFIRMED across all sources]

---

## 9. Cross-tribe comparison table

| | Romans | Gauls | Teutons | Egyptians | Huns | Spartans |
|---|---|---|---|---|---|---|
| Merchant capacity | 500 | 750 | 1000 | 750 | 500 | 500 |
| Merchant speed (fields/h) | 16 | 24 | 12 | 16 | 20 | 14 |
| Wall (bonus/lvl · base def pts/lvl · durability) | City 3% · 10 · 1 | Palisade 2.5% · 8 · 2 | Earth 2% · 6 · 5 | Stone 2.5% · 8 · 4 | Makeshift 1.5% · 6 · 1 | Defensive 2% · 10 · 2 |
| Cranny | ×1 | **×1.5** | ×1 | ×1 | ×1 | ×1 |
| Special building | Horse Drinking Trough | Trapper | Brewery | Waterworks | Command Center | Asclepeion |
| Hospital variant | Hospital 40% | Hospital 40% | Hospital 40% | Hospital 40% | Hospital 40% | **Asclepeion 60%** |
| Build queue | **Building + field simultaneously** | 1 at a time | 1 at a time | 1 at a time | 1 at a time | 1 at a time |
| Administrator (loyalty hit) | Senator 20–30% | Chieftain 20–25% | Chief 20–25% | Nomarch 20–25% | Logades **15–30%** | Ephor 20–25% |
| Hero bonus | +100 str/pt | +5 mounted speed | 20% cranny dip | hero res 12/40 per pt | +3 army speed (all-cav) | +50% from Spartan weapons |
| Settler total cost | 19,000 | **18,100** | 20,000 | 21,000 | 20,900 | 19,995 |
| Settler time @1x | 7:28:20 | **6:18:20** | 8:36:40 | 6:53:20 | 8:02:30 | 9:28:20 |
| Cheapest raider (cost, time@1x) | Legionnaire (400, 1600s) | — (TT cavalry later) | **Clubswinger (250, 720s)** | Slave Militia (150, 530s)* | Mercenary (290, 810s) | Hoplite (440, 1700s) |

\* Slave Militia is a defender with off 10/carry 15 — cheapest unit, not a real raider. Merchant rows [CONFIRMED — official article 3]; walls [CONFIRMED — official article 64]; the rest as tagged in tribe sections.

Other economy notes:
- **No tribe pays different prices for buildings or resource fields**, and build times don't differ by tribe — the only construction-related tribe bonus is the Roman dual queue. [CONFIRMED — absence in all official tribe-advantage lists; buildings statistics article is tribe-agnostic]
- Teuton "plunder bonus" in current versions = the hero cranny dip (raid-related), not an economy bonus. [CONFIRMED]

---

## Open questions

1. **Settler training-time scaling with Residence/Palace/CC level** — does each building level speed up settler training (fandom suggests Palace 20 ⇒ 3:02:21 for a Roman settler)? Critical for settling-race optimization; verify in-game or against kirilloid's train-time calculator. [DISPUTED]
2. **Spartan settler & unit training times** (34,100 s etc.) lack an official published table — kirilloid live and the adipiciu dump agree, but confirm in-game.
3. **Egyptian settler training time** (24,800 s) is kirilloid-live-only; the 2021/22 rebalance provably changed Egyptian settler *costs* (+10.5%) — confirm the time wasn't touched.
4. **Egyptian hero bonus label**: official prose says "+25%", official table says 12/40 vs 9/30 (= +33%). Use 12/40; flag in UI copy.
5. **Command Center costs & culture points** vs Residence/Palace — no official cost table captured; needed if the optimizer compares Hun expansion economics. (Community claims CC is cheaper and gives more CP than Residence — untagged, unverified.)
6. **Trapper per-level trap counts** (10 → 400): the official article's table wasn't captured; per-level values needed only if simulating trap builds.
7. **Brewery**: whether celebrations can be queued back-to-back and the exact celebration cost on speed servers. Also confirm max level 20 (implied by "+20% at max level").
8. **Hero base fighting strength (≈100) and base on-foot speed (7 fields/h)** — kirilloid-only values; verify in-game.
9. **Hospital availability** as a per-server feature toggle (affects whether Asclepeion matters on a given world).
10. **Spartan availability** on any given gameworld (not all worlds run all six tribes) — treat tribe roster as a server-config input.
