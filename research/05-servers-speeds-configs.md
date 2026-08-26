# Travian: Legends — Server Types, Speeds & Special Configs

Research domain 05 — compiled 2026-08-12.

**Tag legend:** [CONFIRMED] = official source or 2+ independent sources · [DISPUTED] = sources conflict, all versions shown · [UNVERIFIED] = single (usually non-official) source.

**Key sources**
- Official KB (Help Center): `https://support.travian.com/en/articles/20-game-versions-and-speed` (the canonical speed/config article; the older URL scheme `support.travian.com/en/support/solutions/articles/7000068688-game-versions-and-speed` redirects to/mirrors the same content)
- Official KB: `https://support.travian.com/en/articles/51-culture-points-cp`
- Official KB: `https://support.travian.com/en/articles/28-special-servers-advanced-start` and `https://support.travian.com/en/articles/203-advanced-start`
- Official KB: `https://support.travian.com/en/articles/46-adventures`
- Official KB collection index: `https://support.travian.com/en/collections/7-gameworlds-and-specials`
- Community mirror of the KB (verbatim copies, useful when the KB blocks fetches): `https://unofficialtravian.com/2025/10/game-versions-and-speed/`
- kirilloid source data: `https://github.com/kirilloid/travian` (`src/model/speeds.ts`, `src/model/t5/culture.ts`)
- Wikipedia: `https://en.wikipedia.org/wiki/Travian`
- getter-tools live server list: `https://www.gettertools.com/en/67-Travian-server-list`

---

## 1. Executive summary

- Current version is **T4.6**, stable since **15 March 2021** [CONFIRMED — Wikipedia]. There has been no T4.7; Travian ships continuous updates on top of 4.6 (shorter rounds, fixed early-game reward rotation, oasis-farming rework, new tribes on specials, lobby/avatar system, etc.).
- Server speed (x1/x2/x3/x5/x10) divides **build & training times** linearly and multiplies **resource production** linearly, but **troop travel speed does NOT scale linearly**: ×2 on all of x2/x3/x5 and ×4 on x10 [CONFIRMED — official KB].
- **CP requirements shrink faster than intuition suggests** at higher speed: 2nd village needs 2000 / 800 / 500 / 300 / 200 CP at x1/x2/x3/x5/x10; from mid-game onward the reduction converges to exactly 1/speed. Starting CP also shrinks (500 → 50). Celebration CP **caps are halved/quartered** on x3+ [CONFIRMED — official KB].
- **Advanced Start** (official spelling; sometimes "advance start" colloquially): first village spawns with **all resource fields at level 5**, **6 settlers already trained**, and **CP for two immediate settlements plus 75% of the 4th-village CP gap**; the first two settled villages also spawn with all fields at level 5; croppers (18/15/9c) are banned as 2nd/3rd villages [CONFIRMED — official KB]. Which gameworlds get it is announced per-world; there is no fixed list.
- Tribe counts per world: **3 tribes** (Romans/Teutons/Gauls), **5 tribes** (+ Huns, Egyptians — the standard international config), **6 tribes** on some special worlds (+ Spartans, with Vikings sometimes swapping in for Teutons) [CONFIRMED — official KB].
- Quest/task and adventure **reward amounts do not scale with speed**, but **adventure spawn frequency scales ~linearly with speed** [CONFIRMED for adventures — official KB; quest rewards see §6].

---

## 2. Version: what is T4.6 and what distinguishes it

- **T4.6 stable release: 15 March 2021.** [CONFIRMED] — Wikipedia (`https://en.wikipedia.org/wiki/Travian`). T4 itself dates to Feb 2011; 4.4 → 4.5 → 4.6 were incremental platform releases.
- Distinguishing changes accumulated in the 4.5→4.6 era and since (from the official blog's own retrospective, mirrored at `https://unofficialtravian.com/2025/01/08/travian-legends-6-years-of-changes-at-a-glance/`, original: `https://blog.travian.com/2023/05/travian-legends-5-years-changes-at-one-glance/`):
  - **Shorter rounds** (2021): max round length even at x1 "rarely longer than 200 days and can't exceed 250 (compared to 350 before)". [CONFIRMED — official blog retrospective + KB timeline table (Natar WW finishes after 250 days at x1)]
  - **Fixed early-game rewards**: every player gets a horse in the 1st adventure; **first 10 adventure rewards are a fixed sequence** (Horse, Resources, Units, Silver, Ointment, Book of Wisdom, Resources, Silver, Cages, Experience) and daily-reward rotation is identical for all players. [CONFIRMED — official KB Adventures article + blog retrospective]
  - **Oasis farming rework**: rewards for killing nature units in oases (hero gets 1 XP per crop-consumption of nature unit + 40 of each resource per animal on unoccupied-oasis attacks). [CONFIRMED — official KB]
  - **PvP/PvE ranking split**, **wave builder** (50 gold/village, up to 8 waves), **consolidated training queue view**, **farm-list overhaul**, **lobby account system with avatars & respawn**. [UNVERIFIED as to exact version — blog retrospective, single source]
  - **Hospital / wounded troops**: listed in the retrospective as an added feature. In Legends this appeared on **special servers** (Annual Specials) rather than base regular worlds. [DISPUTED/UNVERIFIED — retrospective lists it without scoping; treat Hospital as a special-server feature unless a regular-world announcement says otherwise. Do NOT build it into a baseline calculator.]
  - **New tribes**: Huns + Egyptians (2017, "Fire and Sand" era, later standard on 5-tribe worlds), **Spartans (2022, "Glory of Sparta")**, **Vikings (2024)**. [CONFIRMED — blog retrospective + KB tribes article]
- **For a calculator:** T4.6 economy/CP/build mechanics are the ones documented in the current Help Center (support.travian.com). Anything sourced from T4.4-era fan wikis (e.g., old Fandom pages) must be cross-checked; several values (CP tables, round timelines, beginner protection) changed. [CONFIRMED as a caution — the KB is the live source]

## 3. Server types & tribes

| World type | Tribes | Notes |
|---|---|---|
| Regular, 3-tribe | Romans, Teutons, Gauls | Classic config; some regional/local worlds run this. [CONFIRMED — KB "Game Versions and Speed"] |
| Regular, 5-tribe | Romans, Teutons, Gauls, **Huns, Egyptians** | The standard config on international gameworlds. [CONFIRMED — KB; "Huns/Egyptians available only on 5-tribe servers" per KB tribes article `https://support.travian.com/en/articles/3-the-tribes-and-their-advantages`] |
| 6-tribe (special/selected worlds) | Romans, **Teutons *or* Vikings**, Gauls, Huns, Egyptians, **Spartans** | Official KB lists the 6-tribe roster as "Romans, Teutons/Vikings, Gauls, Huns, Egyptians, Spartans" — i.e., Vikings can replace Teutons. Spartans originated in Annual Special 2022 (Glory of Sparta) and now appear on selected worlds. [CONFIRMED — KB "Game Versions and Speed"; Vikings-swap detail single official source ⇒ treat exact swap rule as [UNVERIFIED] until seen on a live world] |

- **Game scenarios** per official KB [CONFIRMED — `https://support.travian.com/en/articles/20-game-versions-and-speed`]:
  - **Regular** — randomized map, artefacts, WW race to level 100.
  - **Annual Special** — each September; ancient-Europe map; **regions + Victory Points instead of individual artefacts**; duration 180/120/80/50/30 days at x1/x2/x3/x5/x10.
  - **New Year Special** — each January; remixes past special features.
  - **Travian Tournament** — qualification + finals, prizes (`https://support.travian.com/en/articles/108-travian-tournament-game-worlds-setup`).
  - **Community Week** — community-voted feature set.
  - **Local gameworlds** — language/community-specific worlds with their own naming and medals.
- Live server naming (getter-tools, Aug 2026): international worlds run as `ts<N>.x1.international.travian.com`, `ts20.x2...`, `ts30/ts31/ts50.x3...`, plus event worlds (`cw.x2` Community Week, `rof.x3` Reign of Fire, `ptr.x3` public test realm, `nys.x5.international` New Year's Special). [CONFIRMED — getter-tools list + live domain `https://nys.x5.international.travian.com/`]

## 4. Speed multiplier matrix

All rows from the official KB "Game Versions and Speed" article, cross-checked against the verbatim community mirror (unofficialtravian.com). Everything in this table is **[CONFIRMED — official]** unless marked.

### 4.1 Core mechanics

| Mechanic | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| Troop training time | normal | ÷2 | ÷3 | ÷5 | ÷10 |
| Building construction time | normal | ÷2 | ÷3 | ÷5 | ÷10 |
| Resource production | ×1 | ×2 | ×3 | ×5 | ×10 |
| **Troop travel speed** | ×1 | **×2** | **×2** | **×2** | **×4** |
| Beginner's protection | 5 days + optional 3 | 3 + 3 | 3 + 3 | 2 + 2 | 1 + 1 |
| Travian Plus package duration | 7 days | 3 | 3 | 3 | 3 |
| Resource bonus (25%) duration | 7 days | 3 | 3 | 3 | 3 |

- Research times scale like training times (kirilloid `speeds.ts` for 3x: `t: /3, rt: /3, v: ×2` — training, research ÷3, unit speed ×2, matching the official table). [CONFIRMED — kirilloid source + official KB]
- **Merchants**: movement follows the troop-speed multiplier; **carrying capacity is multiplied by server speed** so trade keeps pace with production (e.g., ×3 capacity on x3). [DISPUTED — Fandom (`https://travian.fandom.com/wiki/Merchant`, via search snippet) says "both carrying capacity and movement speed of merchants are multiplied by the speed of the server" (i.e., ×3 movement on x3), while the official KB says troop movement is ×2 on x2–x5 and kirilloid applies ×2 to unit speeds on 3x. Most likely correct model: **capacity ×server speed, movement ×2 (×4 on x10)** — but verify capacity in-game before hard-coding.]

### 4.2 Round timeline

| Event | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| Registration closes after | 70 d | 35 d | 28 d | 15 d | 7 d |
| Artefacts appear | day 90 | day 45 | day 30 | day 18 | day 9 |
| WW construction plans appear | day 180 | day 90 | day 60 | day 36 | day 18 |
| Natars finish their WW after (round hard end) | 250 d | 160 d | 95 d | 71 d | 35.5 d |
| Annual Special round duration | 180 d | 120 d | 80 d | 50 d | 30 d |

### 4.3 Culture points & celebrations

| Metric | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| Starting CP (account start) | 500 | 250 | 167 | 100 | 50 |
| CP required for 2nd village | 2000 | 800 | 500 | 300 | 200 |
| CP required for 3rd village | 8000 | 3900 | 2600 | 1600 | 800 |
| CP required for 4th village | 20 000 | 10 000 | 6 700 | 4 000 | 2 000 |
| CP required for 5th village | 39 000 | 19 400 | 12 900 | 7 800 | 3 900 |
| … CP for 50th village | 12 347 000 | 6 173 600 | 4 115 800 | 2 469 500 | 1 234 700 |
| Town Hall celebration duration | normal | normal | ÷2 | ÷2 | ÷4 |
| Small celebration CP cap | 500 | 500 | 250 | 250 | 125 |
| Large celebration CP cap | 2000 | 2000 | 1000 | 1000 | 500 |
| Artwork CP production | ×1 | ×⅔ | ×½ | ×⅓ | ×~1/6 |
| Artwork CP limit | 2000 | 1300 | 1000 | 700 | 400 |
| Artwork use cooldown | 24 h | 24 h | 12 h | 12 h | 6 h |

Sources: CP-per-village table verbatim from official KB `https://support.travian.com/en/articles/51-culture-points-cp` (full table runs villages 2–50); celebration/artwork rows from KB `articles/20`. [CONFIRMED]

Calculator notes:
- Scaling is **not** a clean 1/speed for early villages (village 2 at x2 is 800, not 1000; at x3 it's 500, not 667) but converges to exactly 1/speed by mid table (village 50: exactly ÷2/÷3/÷5/÷10). **Use the official lookup table, not a formula, for villages 2–5.** [CONFIRMED — arithmetic on the official table]
- CP must be sufficient both **when settlers depart and when they arrive**; conquest requires the CP at battle time. [CONFIRMED — KB articles/51]
- Daily CP production of buildings itself is **not** listed as speed-scaled in the KB (only requirements, celebration caps and artwork output are adjusted). kirilloid models building CP output as identical across speeds. [UNVERIFIED — inferred; verify in-game: a level-N building's CP/day appears to be the same value at any speed, which combined with lower requirements is what makes settling faster]
- kirilloid's `t5/culture.ts` (`CP(n) = [0,0,.1,.5,1,2,4][n]×10000`, else `ceil(.16×(n−2)^2.33)×10000`) gives 1000 CP for village 2 — that file models **Travian Kingdoms (T5), not Legends**; do not use it for Legends. [CONFIRMED mismatch — kirilloid repo vs official Legends table]

### 4.4 Hero, items, misc

| Metric | x1 | x2 | x3 | x5 | x10 |
|---|---|---|---|---|---|
| Adventure frequency (start of world) | ~3/day | — | 9/day (official example) | — | — |
| Tier 2 items appear | day 70 | day 35 | day 23.3 | day 14 | day 7 |
| Tier 3 items appear | day 140 | day 70 | day 46.6 | day 28 | day 14 |
| Auction duration | ~24 h | ~12 h | ~8 h | ~4 h | ~2 h |
| Artefact/item smelting time | 24 h | 24 h | 12 h | 12 h | 6 h |
| Vacation days available | 15 | 8 | 5 | 3 | 2 |
| Village→city upgrade cooldown | 24 h | 24 h | 12 h | 12 h | 6 h |
| Natar attack delay in gray zone | 24 h | 12 h | 8 h | 4:48 | 2:24 |

- **Adventures scale with speed**: official x1 schedule is ~3/day (days 0–2), ~2/day (days 3–16), ~1.5/day (days 17–63), ~1/day (day 64+); everyone starts with 3 adventures and gets ~5–6 in the first 24 h. Official x3 example: 9/day at day 0, 6/day to day ~5.3, ~4.5/day to day 21, 3/day after — i.e., **frequency ×speed, phase boundaries ÷speed**. [CONFIRMED — KB `https://support.travian.com/en/articles/46-adventures`]
- **Hero resource production** (attribute points → resources/hour): the KB speed article does not list a multiplier; community calculators treat it as scaling with server speed like all production. [UNVERIFIED — verify in-game; recommended assumption: ×speed]

## 5. Advanced Start (a.k.a. "advance start")

Official articles: `https://support.travian.com/en/articles/28-special-servers-advanced-start` and `https://support.travian.com/en/articles/203-advanced-start`. All bullets [CONFIRMED — official] unless noted.

What the account gets at spawn:
1. **First village: all resource fields at level 5.**
2. **Six settlers, already trained** (no residence/palace requirement to produce them — they're granted).
3. **CP granted = enough to settle two additional villages immediately, plus 75% of the CP difference required for the 4th village** ("the bar will be filled to ¾"). Only the remaining 25% must be earned before village #4.
4. **The first two villages you settle also spawn with all resource fields at level 5.** From the 3rd settled village (4th village overall) onward, new villages start with level-0 fields as normal.
5. **Restriction: 18-, 15-, and 9-croppers cannot be settled as the 2nd or 3rd village** (i.e., not with the granted settlers; cropper hunting starts from village 4).
6. **Not granted**: the articles do not mention extra starting resources or gold beyond the normal start (normal start = hero + "some initial resources" + **130 gold**, per KB `https://support.travian.com/en/articles/142-first-steps-in-the-game`). [CONFIRMED that docs are silent; treat "no extra resources/gold" as the default assumption — [UNVERIFIED]]

Which worlds use it:
- "Some Travian: Legends gameworlds include the Advanced Start feature… it will always be **announced before the gameworld begins**." There is **no fixed official list**; it is a per-world flag used on special/regional/event worlds and it has been "becoming more frequent" (KB strategy guide, `https://support.travian.com/en/support/solutions/articles/7000092448-advanced-start-fast-fourth-village-x2-speed-`). [CONFIRMED — official, but per-world]
- The KB even publishes an optimization guide for **x2 + Advanced Start** worlds ("Fast Fourth Village"): with the grant, the 4th village needs ~**1,525 additional CP** (the remaining 25%), 3 more settlers (~63k resources), residence 10 in a settled village, two small celebrations (22,360 res each) — 4th village achievable in **36–40 h** on x2. [CONFIRMED — official strategy article; useful as a calculator test case]
- Calculator implication: with Advanced Start ON, the CP table's villages 2–3 are free, village 4 costs 0.25 × (CP₄ − CP₃)… **exact formula of the "75% of CP needed" wording is ambiguous** (75% of the 4th-village *requirement* vs 75% of the *difference* between 3rd and 4th) — article 28 says "75% of the CP difference required to settle the fourth". [DISPUTED (wording varies between the two official articles); the x2 worked example (1,525 CP remaining) can disambiguate once the x2 CP-for-4th value (10,000) and grant model are reconciled — see Open questions]

Other recurring special-server modifiers (each has its own official article; per-world flags, announced at world start) [CONFIRMED — KB collection `https://support.travian.com/en/collections/7-gameworlds-and-specials`]:
- **Harbor & Deep Water / Ships & Naval Movement** (map with water, ship-borne movement)
- **Regional Map / Regions & Population** (Annual-Special-style region control + Victory Points)
- **Common/Uncommon/Rare/Epic items** and **Item Crafting** (hero item rework)
- **Keep Tribe on Conquest** (conquered villages keep original tribe; enables multi-tribe accounts)
- **18-Cropper** worlds
- **Alliance Attack Notifications**
- Named specials with their own mechanics articles: **Reign of Fire**, **Northern Legends** (Vikings), **Glory of Sparta** (Spartans; `https://blog.travian.com/2022/08/glory-of-sparta-game-mechanics/`)

## 6. Early-game calculator config notes

- **Starting state (all regular worlds)**: hero + "some initial resources" + **130 gold** [CONFIRMED — KB articles/142]. Exact starting resource amounts are not in the KB. Community consensus is 750 of each resource on T4.x regular starts. [UNVERIFIED — needs in-game confirmation per world]
- **Quest/task & daily-quest rewards do not scale with server speed** ("Server speed does not affect rewards" — KB Daily Quests, `https://support.travian.com/en/support/solutions/articles/7000061163-daily-quests`). [CONFIRMED for daily quests — official; for the main task-list rewards the same is widely assumed but not explicitly documented ⇒ [UNVERIFIED] for the tasklist]
- **Adventure rewards** (resources/silver/items) are amount-fixed; only frequency scales (§4.4). First-10 rewards are a fixed sequence on all worlds. [CONFIRMED — KB articles/46]
- **Beginner's protection**: base durations per speed in §4.1; the "+N days" part is an **optional extension** the player chooses (x1: +3 d). [CONFIRMED — KB articles/20; details `https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection`]
- **Round length cap** for planning horizons: Natar WW ends the round at day 250/160/95/71/35.5 (x1…x10). [CONFIRMED]
- **Plus/resource-bonus economics differ by speed** (7-day packages at x1, 3-day at x2+) — affects gold-cost-per-round modeling. [CONFIRMED]
- **Annual/New-Year specials should be excluded** from the baseline calculator: region-based map (no free settling of the whole map), Victory Points instead of artefacts, special tribes (Spartans/Vikings), possible Hospital/wounded system, item rarity/crafting variants, shorter fixed round length (§4.2). Every one of these is flagged per-world in the KB special-server articles (§5). [CONFIRMED]

## 7. Open questions

1. **Merchant scaling** — resolve the x2-vs-x3 movement question on x3 worlds and confirm capacity ×speed (official KB is silent; Fandom says both ×speed; kirilloid implies movement ×2). Test in-game or find a gameworld-announcement blog post with explicit merchant settings.
2. **Building CP output per level vs speed** — confirm that per-building CP/day values are identical across speeds (assumed; only requirements/caps are documented as scaled).
3. **Hero resource production** — confirm ×speed scaling of hero production points on speed servers.
4. **Exact starting resources** (750/750/750/750?) per speed/type, and whether x10 or Advanced-Start worlds ship larger starting stock.
5. **Advanced Start CP grant formula** — reconcile "75% of the CP needed for your fourth village" (article 203) vs "75% of the CP difference required to settle the fourth" (article 28) against the x2 worked example (1,525 CP remaining on x2, where CP₄ = 10,000, CP₃ = 3,900). Neither reading yields 1,525 exactly ((10,000−3,900)×25% = 1,525 ✓ — the *difference* reading matches; treat article 28's wording as authoritative). → Effectively resolved in favor of "difference", but verify on a live Advanced Start world.
6. **Which current worlds are 3-tribe vs 5-tribe vs 6-tribe** — the KB gives the rosters but not a live mapping; scrape travian.com's server list / gameworld-announcement blog posts at build time (regional "classics" are often 3-tribe; internationals 5-tribe; selected specials 6-tribe).
7. **Vikings availability** — confirmed added 2024 and named in the 6-tribe roster as a Teutons alternative; exact conditions (which worlds, permanent or special-only) unverified.
8. **x10 worlds** — the KB documents the x10 column fully (troops ×4, BP 1+1, round 35.5 d, registration closes day 7), but confirm whether current x10 rounds routinely couple with Advanced Start (community reports suggest yes; no official fixed rule).
9. **T4.6 formal changelog** — no single official 4.5→4.6 diff document was found; the blog's changelog category (`https://blog.travian.com/category/news/changelogs-game-updates/`) is the best running record (blog fetches failed on TLS during this research; retry with a browser).
10. **Hospital on regular worlds** — determine whether the wounded-troops system has reached regular (non-special) gameworlds by 2026.
