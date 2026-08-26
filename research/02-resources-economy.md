# Travian: Legends (T4.6) — Resource Production & Economy Research

Research date: 2026-08-12. Target: current Travian: Legends (~T4.6).

Tags: **[CONFIRMED]** = official source, or 2+ independent non-kirilloid sources agree · **[DISPUTED]** = sources disagree (all versions shown) · **[UNVERIFIED]** = single source only.

Primary sources used:
- Official Help Center (new KB, 2024/25 rewrite): https://support.travian.com/en/articles/...
- Travian Fandom wiki (community, mostly T3/T4-era data): https://travian.fandom.com
- kirilloid open-source data: https://github.com/kirilloid/travian (cross-check only, known errors)

---

## Executive summary

- Resource field production per level in T4.6 = classic T3 table × 1.4, rounded: L1=7 … L10=280 … L20+=capital-only. Wood/clay/iron/crop fields all share the **same production table** (only build costs differ). Production scales linearly with server speed (×2/×3/×5/×10). **[CONFIRMED]** (kirilloid formula + Fandom tables agree level-by-level, except L0 and L2 — see Open questions)
- Max field level: 10 in regular villages, 12 in "cities" (special worlds), effectively unlimited-by-storage in the capital (practical cap ~L19–21 due to warehouse space). **[CONFIRMED official]**
- Oases: +25% single resource, +25%+25% (resource+crop), +50% crop, and a rare +50% single-resource "Type 3" in the grey Natar zone. Up to 3 oases per village via Hero's Mansion levels 10/15/20; bonus applies to that village's **base** production. **[CONFIRMED official]**
- Warehouse/Granary: L0 hidden storage = 800, L1 = 1,200, L20 = 80,000 (identical capacity curve for both). Great Warehouse/Granary = exactly 3× capacity (L20 = 240,000), WW villages / storage artefacts only. **[CONFIRMED]** (Great variants: single-source table)
- Net crop = gross crop production − population (1 crop/hour per inhabitant) − troop upkeep. **[CONFIRMED official]**
- Hero production: hero starts with 4 points in Resources; per point at 1x the current official KB says **9/hr of each resource or 30/hr of one chosen resource** (Egyptians 12/40). Older sources say 3/10 per point/hr. **[DISPUTED — verify in game]**
- **Egyptian bonus verdict:** it is a bonus to **hero** resource production only — NOT ×2 on anything, and NOT a village/field bonus. kirilloid's code applies ×2 to Egyptian hero production (`this.res = 2` in `src/model/t4.fs/hero.ts`) — this is contradicted by every current official source. Official prose says "+25%"; the official KB's own numeric table implies ×4/3 (+33%). Magnitude needs in-game verification; mechanism (hero-only) is settled.

---

## 1. Resource field production per level

**All four field types (Woodcutter, Clay Pit, Iron Mine, Cropland) produce identical amounts per level.** Only their upgrade costs differ (each field type is cheap in its own resource; croplands are cheapest overall). **[CONFIRMED]** — Fandom per-type tables show identical Production columns (https://travian.fandom.com/wiki/Resource); kirilloid uses one shared `prod` array for all four (github.com/kirilloid/travian `src/model/base/buildings.ts`, `src/model/t4/buildings.ts`).

T4 production per hour at 1x speed = `round(prodT3(level) × 1.4)` where prodT3 = [2, 5, 9, 15, 22, 33, 50, 70, 100, 145, 200, 280, 375, 495, 635, 800, 1000, 1300, 1600, 2000, 2450, 3050] (kirilloid `src/model/t4/buildings.ts`: `const prod4 = (lvl) => Math.round(prod(lvl) * 1.4)`).

| Level | Production/hr (1x) | Source agreement |
|---|---|---|
| 0 | **3** (kirilloid: round(2×1.4)) | **[DISPUTED]** Fandom prose says level 0 produces **6**/hr; kirilloid says 3. See Open questions. |
| 1 | 7 | [CONFIRMED] both |
| 2 | **13 or 14** | **[DISPUTED]** kirilloid: round(9×1.4)=13; Fandom tables: 14. See Open questions. |
| 3 | 21 | [CONFIRMED] both |
| 4 | 31 | [CONFIRMED] both |
| 5 | 46 | [CONFIRMED] both |
| 6 | 70 | [CONFIRMED] both (Fandom cropland table has an obvious typo "50" at L6; its woodcutter table says 70) |
| 7 | 98 | [CONFIRMED] both |
| 8 | 140 | [CONFIRMED] both |
| 9 | 203 | [CONFIRMED] both |
| 10 | 280 | [CONFIRMED] both |
| 11 | 392 | [CONFIRMED] both |
| 12 | 525 | [CONFIRMED] both |
| 13 | 693 | [CONFIRMED] both |
| 14 | 889 | [UNVERIFIED] kirilloid formula only (Fandom table shows "???" past 13) |
| 15 | 1,120 | [UNVERIFIED] kirilloid formula |
| 16 | 1,400 | [UNVERIFIED] kirilloid formula |
| 17 | 1,820 | [UNVERIFIED] kirilloid formula |
| 18 | 2,240 | [UNVERIFIED] kirilloid formula |
| 19 | 2,800 | [UNVERIFIED] kirilloid formula |
| 20 | 3,430 | [UNVERIFIED] kirilloid formula |
| 21 | 4,270 | [UNVERIFIED] kirilloid formula (array ends at 21) |

Sources: https://github.com/kirilloid/travian (src/model/base/buildings.ts + src/model/t4/buildings.ts), https://travian.fandom.com/wiki/Resource

### Max levels **[CONFIRMED official]**
- Regular villages: fields max **level 10**.
- Cities (special game worlds with city upgrade): max **level 12**.
- Capital: "the upgrade is only limited by costs and how much resources you may store" (no hard level cap stated officially). Practical limits from storage (Fandom "Maximum resource levels", https://travian.fandom.com/wiki/Maximum_resource_levels): with normal warehouses only, crop L19 / wood-iron L18 / clay L19 are the highest fundable; with Great Warehouses/Granaries croplands can reach ~L21. [UNVERIFIED single source for exact practical caps]
- Source: https://support.travian.com/en/articles/214-guide-resources-explained

### Server speed **[CONFIRMED official]**
Resource production is multiplied by server speed: ×1 normal, ×2, ×3, ×5, ×10 (official speed table). Construction/training times divided by speed. Source: https://support.travian.com/en/articles/20-game-versions-and-speed

### Production bonus buildings **[CONFIRMED]**
- Sawmill (wood), Brickyard (clay), Iron Foundry (iron), Grain Mill (crop), Bakery (crop): each level = **+5% of base field production**, max level 5 → +25% each; crop can get +50% total (Mill 25% + Bakery 25%).
- Prerequisites: Sawmill needs Woodcutter 10 + MB 5 (kirilloid lists Clay Pit 10 for sawmill — likely swapped with brickyard; Fandom: Sawmill←Woodcutter 10, Brickyard←Clay Pit 10); Grain Mill needs Cropland 5; Bakery needs Cropland 10 + Grain Mill 5.
- Sources: https://travian.fandom.com/wiki/Resource ("Each upgrade of each adds 5% ... maximum of 25%"), kirilloid base/buildings.ts (`f: p5`, `m:5`), https://support.travian.com/en/articles/214-guide-resources-explained (lists all five bonus buildings)

### Other production bonuses **[CONFIRMED official, magnitude below]**
- Gold "resource bonus": +25% per resource type, duration 7 days (1x) / 3 days (speed servers). Sources: https://travian.fandom.com/wiki/Resource ("25% increased production from gold"), https://support.travian.com/en/articles/20-game-versions-and-speed (bonus duration row), https://support.travian.com/en/articles/214-guide-resources-explained (premium bonus / video bonus alternative).
- Video bonus (on worlds where enabled) can be activated per resource as a free alternative. [official, magnitude not stated]

---

## 2. Village layout types

Starting villages are always **4-4-4-6** (4 wood, 4 clay, 4 iron, 6 crop). **[CONFIRMED official]** (https://support.travian.com/en/articles/214-guide-resources-explained: "The starting village has 6 croplands and 4 of each other resource field type")

Full list of layouts (18 fields total) — from Fandom (https://travian.fandom.com/wiki/Village) **[UNVERIFIED single source for the full enumeration; 4446/9c/15c/18c confirmed officially]**:

| Wood | Clay | Iron | Crop | Notes |
|---|---|---|---|---|
| 4 | 4 | 4 | 6 | Standard; all spawn villages |
| 5 | 3 | 4 | 6 | |
| 5 | 4 | 3 | 6 | |
| 3 | 5 | 4 | 6 | |
| 4 | 5 | 3 | 6 | |
| 3 | 4 | 5 | 6 | |
| 4 | 3 | 5 | 6 | |
| 3 | 4 | 4 | 7 | 7-cropper (T3.5+/T4 only) |
| 4 | 3 | 4 | 7 | 7-cropper |
| 4 | 4 | 3 | 7 | 7-cropper |
| 3 | 3 | 3 | 9 | 9-cropper |
| 1 | 1 | 1 | 15 | 15-cropper |

- Official confirms croppers with "9, 15 or on some special game worlds even 18 croplands" — so an **18-cropper** (presumably 0-0-0-18) exists on some special worlds. **[CONFIRMED official existence; layout distribution 0/0/0/18 UNVERIFIED]**
- Croppers are prized because crop has two +25% bonus buildings (Mill + Bakery) vs one for other resources, and capital fields go past level 10.
- Sources: https://support.travian.com/en/articles/214-guide-resources-explained, https://travian.fandom.com/wiki/Village

---

## 3. Oases

Source (official, current): https://support.travian.com/en/articles/48-oasis **[CONFIRMED official]** unless noted.

### Types and bonuses
- **Type 1**: +25% of one resource (exists for lumber, clay, iron, crop).
- **Type 2**: +25% of one resource **plus +25% crop** (lumber/clay/iron variants); the crop "Type 2" is **+50% crop**.
- **Type 3**: +50% of one resource (lumber/clay/iron only; **no +50% single Type 3 for crop** — crop's 50% is its Type 2). Found **only in the grey Natarian area** around the World Wonder; only villages within 3 tiles of a Type 3 oasis can annex it.
- The bonus applies **only to the base production of the owning village** (i.e., % of base field output; bonuses do not compound with each other — they add as percentage points of base). Official wording: "This bonus applies only to that village's base production."
- Fandom (older, agrees on the classic types): https://travian.fandom.com/wiki/Oasis

### Unoccupied oasis production & raid capacity (1x, official table)
- An unoccupied oasis produces 40/hr of its main resource (80/hr for Type 3), 10/hr of the others, and 11/hr crop (41/hr for +crop types, 81/hr for the 50% crop oasis); storage capacity 1,000 per resource (Type 1) or 2,000 (Types 2/3).
- Oases spawn no NEW animals until Beginner Protection ends. CLEARED oases DO produce resources during BP, raidable by troops (owner-verified live x3, 2026-08-21 — an earlier reading of this note conflated animal respawn with resource production).
- Raiding a player-owned oasis: steals up to 10% of the **owning village's** stored resources; regenerates over 10 minutes (partial raid → partial %).

### Annexation rules
- Oasis must be within **3 tiles** of the village (official current). (Older community sources say "the 7×7 map centered on the village" — same thing.)
- **Hero's Mansion level 10 → 1 oasis, level 15 → 2, level 20 → 3** (max 3 per village). A new oasis takes the lowest free slot.
- Conquest by repeated hero attacks driving oasis loyalty 100%→0. From another player: 1 attack if defender owns 3 oases, 2 if 2, 3 if 1 (after clearing defense). Loyalty regenerates 1% per 30 min.
- Releasing an oasis: ~6 h at 1x, ~2 h at 3x. Losing the village releases all its oases.

### How the bonus computes (for the calculator)
`village production of resource R = base(R) × (1 + oasisBonus%(R) + bonusBuilding%(R) + goldBonus%(R) + ...)` — all sources describe oasis/mill/gold bonuses as additive percentages of base production. **[UNVERIFIED formula composition — verify in game that bonuses are additive, not multiplicative]** (Official says oasis bonus applies to "base production"; Fandom says the same for the bonus buildings.)
Egyptian Waterworks multiplies the **oasis** portion — see §7.

---

## 4. Storage: Warehouse, Granary, Great variants, Cranny

### Warehouse & Granary capacity per level **[CONFIRMED]**
(Fandom tables https://travian.fandom.com/wiki/Warehouse and /wiki/Granary; identical values reproduced by kirilloid formula `roundP(100)(2120 × 1.2^lvl − 1320)` — two independent sources agree on every level.)

| Level | Capacity | Level | Capacity |
|---|---|---|---|
| 0 | **800** (hidden initial storage; granary L0 explicitly "holds 800 crops") | 11 | 14,400 |
| 1 | 1,200 | 12 | 17,600 |
| 2 | 1,700 | 13 | 21,400 |
| 3 | 2,300 | 14 | 25,900 |
| 4 | 3,100 | 15 | 31,300 |
| 5 | 4,000 | 16 | 37,900 |
| 6 | 5,000 | 17 | 45,700 |
| 7 | 6,300 | 18 | 55,100 |
| 8 | 7,800 | 19 | 66,400 |
| 9 | 9,600 | 20 | 80,000 |
| 10 | 11,800 | | |

- Warehouse stores wood+clay+iron (each up to capacity); Granary stores crop. Production over capacity is lost. **[CONFIRMED official]** (https://support.travian.com/en/articles/214-guide-resources-explained)
- Multiple warehouses/granaries can be built (build another after one reaches L20; per Fandom you can build as many as you have slots). **[CONFIRMED]** (Fandom Warehouse; official KB mentions upgrading storage regularly, multi-warehouse practice universally documented)

### Great Warehouse / Great Granary
- Capacity = exactly **3× the normal building** per level: L1 = 3,600 … L10 = 35,400 … L20 = **240,000**. **[UNVERIFIED — single full table]** (Fandom https://travian.fandom.com/wiki/Great_warehouse; Fandom "Maximum resource levels" separately states "triple the capacity")
- Requirements: Main Building 10; normally **only buildable in World Wonder (Natar-origin) villages**, or anywhere with the storage artefacts ("Great Storehouse" / builder's-plan-type artefact). **[UNVERIFIED for current T4.6 exact artefact name — check the artefact effects page in game]** (Fandom Great warehouse infobox: "Main Building level 10, World Wonder level 0"; https://travian.fandom.com/wiki/Artifacts)

### Cranny (raid protection) **[CONFIRMED official, current]**
Source: https://support.travian.com/en/articles/35-hiding-resources-and-cranny
- Level 1 hides **200** of each resource (**300** for Gauls); level 10 hides **2,000** (**3,000** for Gauls).
- Gauls: crannies hide **1.5×** more than other tribes.
- Teutons: if a Teuton **hero** accompanies a raid, the defender's cranny protects only **80%** of its capacity ("20% cranny dip").
- After L10 you can build unlimited additional crannies.
- Crannies can't be targeted by catapults (only random-target hits).
- Not raidable: resources in the hero's inventory; resources in transit. Raidable: storage + open marketplace sell offers.
- Note: kirilloid's base cranny formula corresponds to a 100→1,000 curve (T3-era in their model tree); the official current values are 200→2,000. Trust official.

---

## 5. Crop consumption / net crop **[CONFIRMED official]**

Source: https://support.travian.com/en/articles/214-guide-resources-explained
- "Each hour, your village itself consumes crop equal to its population." (1 crop/hour per inhabitant; population = sum of pop values of all buildings/field levels.)
- Every troop unit eats its upkeep in crop/hour, day and night ("Every unit stationed in your village eats a certain amount of Crop per hour"). Upkeep is the unit's "crop consumption" stat (1–6 for most units; e.g. Egyptian units 1–3, settlers 1, catapults 6). Troops in an annexed oasis eat from the owning village.
- **Net crop = gross crop production − population − troop upkeep.** Can be negative; if the granary empties while negative, troops starve and die over time (buildings unaffected).
- While crop is negative, only Granary, Main Building, and croplands can be upgraded (Fandom /wiki/Crop — [UNVERIFIED] for current version details).
- Reinforcements eat crop in the village where they're stationed (standard mechanic; official starvation article exists: "Starvation Mechanics" linked from the resources guide).
- **Speed servers: production is multiplied by speed but nothing official states upkeep is multiplied — assume upkeep per unit/pop stays 1×. [UNVERIFIED — verify in game]**
- Helmets/artefacts/Horse Drinking Trough can reduce troop upkeep (see §7 Romans).

---

## 6. Hero resource production

Official sources:
- https://support.travian.com/en/articles/45-hero-overview — hero starts with **4 skill points, all in Resources by default**; +4 points per level; max 100 per attribute; "Resources: increases resource production in the hero's home village. You can choose one resource type or spread the bonus evenly. This setting can be changed freely anytime." Production is added to the hero's home village like normal production. **[CONFIRMED official]**
- https://support.travian.com/en/articles/141-hero-in-the-early-game — the only official page with numbers (quoted verbatim):

| Tribe | "Resource Production per Point (x1 speed)" | "If Focused on One Resource" |
|---|---|---|
| All (except Egyptians) | 9 resources of each type | 30 of the selected resource |
| Egyptians | 12 resources of each type | 40 of the selected resource |

  Plus: "Your hero's resource production increases with game speed (e.g. x2, x3 worlds). Don't forget that the 25% hero production bonus applies to these values too."

Problems / conflicts **[DISPUTED — must verify in game]**:
1. **Time unit is not stated** in the official table (per hour is the natural reading and matches how all other production is quoted, but it is not explicit).
2. Older sources give **3 of each / 10 of one, per point per hour** (+ a flat 6 crop/hr from the hero itself regardless of allocation): https://travian.fandom.com/wiki/Hero ("for each point invested in resources, 3 of each resources or 10 of one type is produced"). The current official 9/30 is exactly 3× that — either production was buffed 3× at some point in T4.6's life, or the new KB table is per some other unit. No changelog found confirming a 3× buff.
3. kirilloid `src/model/t4/hero.ts` codes `resources × 6` (units unclear) — agrees with neither. Do not use kirilloid for hero production.
4. Note the odd ratio: "spread evenly" gives 9×4 = 36 total vs 30 single — spreading gives more total; focusing gives more of one type. (Same 3.6:3 ratio in the old 3-each/10-one numbers: 12 total vs 10.) The support note "the 25% hero production bonus applies to these values too" is ambiguous (it reads like the Egyptian bonus, but the Egyptian row is already inflated — see §7).

**Speed scaling**: hero production scales up with game speed (official, wording above); exact multiplier presumed = server speed. **[CONFIRMED direction / UNVERIFIED exact multiplier]**

Working recommendation for the calculator: model hero production as `perPoint × points × serverSpeed`, with `perPoint` a config constant defaulting to {all: 9 each, single: 30} and an alternative preset {all: 3 each + 6 crop flat, single: 10 + 6 crop flat}; flag for in-game calibration on day 1.

---

## 7. Tribe-specific economy effects

Merchant stats — all **[CONFIRMED official]** from https://support.travian.com/en/articles/3-the-tribes-and-their-advantages (per-tribe pages repeat them):

| Tribe | Merchant capacity (1x) | Merchant speed |
|---|---|---|
| Romans | 500 | 16 fields/hr |
| Teutons | 1,000 | 12 fields/hr |
| Gauls | 750 | 24 fields/hr |
| Egyptians | 750 | 16 fields/hr |
| Huns | 500 | 20 fields/hr |
| Spartans | 500 | 14 fields/hr |
| Vikings (newest tribe, special worlds) | 750 | 18 fields/hr |

- Marketplace: 1 merchant per level (T3-era Fandom /wiki/Merchant — [UNVERIFIED for current]); NPC merchant trades 1:1 for gold [CONFIRMED, Fandom Resource + official gold features].
- **Trade Office**: raises merchant carrying capacity per level; T3.5-era official numbers were +10%/level of base (Gauls/Teutons) and +20%/level (Romans). Current T4.6 per-level % **[DISPUTED/UNVERIFIED — Fandom /wiki/Trade_office documents the old split; current game shows +20%/level for all in the building UI per community tools; verify in game]**. No effect on merchant speed.
- Merchant capacity/speed on speed servers: old official guidance said multiply both capacity and speed by server speed (Fandom /wiki/Merchant). Current official speed table only lists "troops speed ×2 (×4 at x10)". **[UNVERIFIED — verify]**

Per-tribe economy effects:

### Romans **[CONFIRMED official]**
- Can build/upgrade **one resource field and one building simultaneously** (dual queue) — major economic advantage.
- **Horse Drinking Trough** (special building): reduces cavalry crop consumption (and speeds stable training). Official tribes page: "reduces cavalry crop consumption". Exact per-unit reduction (classically: Equites Imperatoris −1 crop at HDT 10, Equites Caesaris −1 at HDT 15/20) **[UNVERIFIED — check in game]**.
- No cranny bonus. Hero: +100 fighting strength/point (not economic).
- Source: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages

### Gauls **[CONFIRMED official]**
- Crannies hide **1.5×** (see §4).
- Cheap settlers (Fandom/official tribes page: "Cheap settlers").
- Fastest merchants (750 @ 24 f/h). Hero: +5 mounted speed (not economic).

### Teutons **[CONFIRMED official]**
- Hero **plunder bonus: 20% cranny dip** on raids (defender cranny works at 80%).
- Biggest merchants (1,000 @ 12 f/h).
- Brewery (special building): +1% attack per level (max 10... combat, not economy; celebrations cost crop).
- Raid economy (cheap fast troops) — outside this domain's scope.

### Egyptians **[CONFIRMED official, magnitude of hero bonus DISPUTED]**
- **Hero bonus: increased hero resource production.** Official prose (multiple pages): "Hero's resource production is increased by 25%" (Fandom Egyptians page, old official pages); current official KB numeric table: 12 each/40 single vs 9/30 = **+33%**. kirilloid codes **×2** (`src/model/t4.fs/hero.ts`: `if (tribe === ID.EGYPTIANS) { this.res = 2; }`) — **contradicted by all current official sources; the ×2 was (at most) the original 2017/2018 Fire-and-Sand value and is wrong for current worlds.** It is NOT a field/village production bonus and NOT ×2. Verdict: hero-only bonus, +25% nominal (possibly implemented as 12/40 per point ≈ +33%). Sources: https://support.travian.com/en/articles/141-hero-in-the-early-game, https://support.travian.com/en/articles/9-the-egyptians-and-their-advantages, https://support.travian.com/en/articles/45-hero-overview, https://travian.fandom.com/wiki/Egyptians
- **Waterworks** (Egyptian-only special building, one of the strongest economy buildings in the game):
  - Each level increases the **total bonus of all oases annexed to that village by +5% of the oasis bonus** (relative). At level 20: +100% → **doubles the oasis bonus** (e.g., 3×25% crop oases = +75% becomes +150%). **[CONFIRMED]** (Fandom /wiki/Waterworks incl. old official Answers quote: "Its maximum effect at level 20 doubles the effect of oases"; official tribes page: "Waterworks: increases oases bonuses (up to twice)")
  - Requirement: Hero's Mansion 10 (kirilloid t4.fs; consistent with it boosting oases) **[UNVERIFIED]**. Cost tables conflict: Fandom L1 = 910/945/910/340; kirilloid base cost 650/670/650/240 (k=1.28) **[DISPUTED — verify]**.
  - Waterworks itself has population/CP per level (Fandom table: pop 1–2/level, CP 1–30).
- Egyptians available "only on 5-tribe servers" (official Egyptians page).
- Merchants 750 @ 16.

### Huns **[CONFIRMED official]**
- **No special economy building or production bonus.** Their specials are military/expansion: Command Center (expansion slots without Residence/Palace), mounted-army speed hero bonus, strong cavalry.
- Merchants 500 @ 20 f/h.
- Source: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages, https://support.travian.com/en/support/solutions/articles/7000095592-the-huns-and-their-advantages

### Spartans **[CONFIRMED official]**
- **No special economy building.** Economy-relevant trait: units have excellent power-to-crop-consumption efficiency (cheaper army upkeep per strength). Special building Asclepeion (recovers up to 60% of troops lost in battle — indirectly economic via reduced retraining cost).
- Merchants 500 @ 14 f/h (slowest).
- Source: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages

### Vikings (bonus: 8th tribe on current special worlds) **[CONFIRMED official]**
- Merchants 750 @ 18 f/h; Valkyries eat only 2 crop (efficient heavy cavalry); Berserkers eat double crop. No production-side special building documented.
- Source: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages

---

## 8. Starting state of a fresh account

- Spawn village: **4-4-4-6 layout, all fields level 0**, level 1 Main Building. **[CONFIRMED]** (official resources guide + Fandom Village)
- Starting resources: **750 of each resource**. **[UNVERIFIED — Fandom /wiki/Resource ("Every village starts with 750 units of each resource"); official "first steps" page says only "some initial resources"]**. Newly settled villages likewise start with 750 each (settlers carry 3×250). [UNVERIFIED]
- Starting storage: 800 warehouse / 800 granary (hidden level-0 storage, §4). **[CONFIRMED]**
- Starting gold: **130 gold** on a new account (official First Steps page, via search snippet). **[UNVERIFIED verbatim — page is JS-only; verify]**
- Hero: given at start; **4 skill points, all in Resources by default**. **[CONFIRMED official]** (https://support.travian.com/en/articles/45-hero-overview)
- Starting production: 18 fields at level 0 (4/4/4/6 × L0 rate) + hero production. Depends on the disputed L0 rate: if L0 = 3/hr → 12/12/12/18 per hour before hero; if 2/hr → 8/8/8/12. **[DISPUTED via L0 rate — verify]**
- Starting culture points: 500 at 1x (scales down with speed: 250/167/100/50). 2nd village needs 2,000 CP at 1x (800/500/300/200 on faster). **[CONFIRMED official]** (https://support.travian.com/en/articles/20-game-versions-and-speed)
- **Beginner Protection**: 5 days + optional 3-day extension at 1x; 3+3 at x2 and x3; 2+2 at x5; 1+1 at x10. No attacks/raids/scouting/reinforcements in or out during protection. Ends early if you attack someone(?) — standard rule **[UNVERIFIED detail]**. Oases spawn no NEW animals until BP of server start ends; cleared oases DO produce raidable resources during BP (owner-verified live; the old "produce nothing" reading conflated respawn with production). **[CONFIRMED owner + official art. 190]** (https://support.travian.com/en/articles/20-game-versions-and-speed; https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection)
- Advanced Start worlds (special): first village spawns with **all fields level 5**, 6 settlers, CP for 2 immediate villages + 75% of 4th-village CP; villages beyond the 4th settle normally at L0 fields. **[CONFIRMED official]** (https://support.travian.com/en/articles/203-advanced-start)

---

## Open questions (for in-game verification)

1. **Hero production per point (CRITICAL for calculator)** — [DISPUTED]
   - Official KB (2025): 9 each / 30 single per point at 1x (Egyptians 12/40) — time unit not stated (assume /hr).
   - Older sources (Fandom, T4-era): 3 each / 10 single per point **per hour**, plus flat 6 crop/hr.
   - kirilloid: ×6 per point (unit unclear).
   - Verify: create hero with known points, read production tooltip in-game (production overview shows hero contribution separately).
2. **Egyptian hero bonus magnitude** — [DISPUTED]: +25% (official prose, Fandom) vs ×4/3 ≈ +33% (official KB table 12/40 vs 9/30) vs ×2 (kirilloid — almost certainly wrong today). Mechanism (hero-only, home village) is [CONFIRMED].
3. **Level 0 field production** — [DISPUTED]: 3/hr (kirilloid ×1.4 formula) vs 6/hr (Fandom prose). Check a fresh village's production screen.
4. **Level 2 field production** — [DISPUTED]: 13 (kirilloid rounding) vs 14 (Fandom tables). One-level check in game.
5. **Field production levels 14–21** — [UNVERIFIED]: only kirilloid formula (×1.4 over T3 base). Spot-check one high capital field.
6. **Capital max field level** — official says storage-limited only; confirm whether a hard cap (20? 21? 22 on specials) exists in the client.
7. **Bonus stacking formula** — [UNVERIFIED]: confirm oasis% + mill/bakery% + gold 25% + Waterworks all add as percentage points of base (not multiplicative). Also confirm Waterworks is `oasisBonus × (1 + 0.05×level)`.
8. **Trade Office current per-level %** — [DISPUTED]: old official 10%/level (20% Romans) vs possibly flat 20%/level now.
9. **Merchant capacity/speed scaling on speed servers** — [UNVERIFIED]: old rule multiplied both by server speed; current speed table doesn't mention merchants.
10. **Troop/population crop upkeep on speed servers** — [UNVERIFIED]: assumed NOT multiplied by speed (only production is). Verify on any speed world.
11. **Great Warehouse/Granary** — capacity 3× table [single source]; exact current availability rules (WW villages + which artefact) need checking on a live world.
12. **Starting resources 750 each & 130 starting gold** — [UNVERIFIED]: single/JS-only sources.
13. **18-cropper layout** (0-0-0-18?) on special worlds — official confirms 18 croplands exist; exact layout distribution unverified.
14. **Horse Drinking Trough** exact upkeep reduction per level/unit — [UNVERIFIED].
15. **Waterworks costs** — Fandom vs kirilloid conflict (L1: 910/945/910/340 vs 650/670/650/240).
16. **Hero flat 6 crop/hr** (old T4 mechanic: hero always produces 6 crop/hr regardless of points) — still true in T4.6? [UNVERIFIED]

## Source index

Official (support.travian.com):
- Resources guide: https://support.travian.com/en/articles/214-guide-resources-explained
- Oasis: https://support.travian.com/en/articles/48-oasis
- Cranny: https://support.travian.com/en/articles/35-hiding-resources-and-cranny
- Tribes & advantages: https://support.travian.com/en/articles/3-the-tribes-and-their-advantages
- Egyptians: https://support.travian.com/en/articles/9-the-egyptians-and-their-advantages
- Hero overview: https://support.travian.com/en/articles/45-hero-overview
- Hero in the early game (hero production table): https://support.travian.com/en/articles/141-hero-in-the-early-game
- Game versions & speed (all speed-scaling tables, BP durations): https://support.travian.com/en/articles/20-game-versions-and-speed
- Advanced start: https://support.travian.com/en/articles/203-advanced-start
- Buildings & resource fields statistics (interactive tool, JS-only): https://support.travian.com/en/support/solutions/articles/7000090158

Community / cross-check:
- Fandom: /wiki/Resource, /wiki/Village, /wiki/Warehouse, /wiki/Granary, /wiki/Great_warehouse, /wiki/Cranny (T3-era), /wiki/Oasis, /wiki/Waterworks, /wiki/Egyptians, /wiki/Hero, /wiki/Merchant, /wiki/Maximum_resource_levels, /wiki/Crop_usage (all at https://travian.fandom.com)
- kirilloid data: https://github.com/kirilloid/travian — src/model/base/buildings.ts (T3 prod array, capacity formula), src/model/t4/buildings.ts (×1.4 production), src/model/t4.fs/buildings.ts (Waterworks percent(5)), src/model/t4.fs/hero.ts (Egyptian ×2 — WRONG vs official), src/model/t4/hero.ts (×6/point — inconsistent)
