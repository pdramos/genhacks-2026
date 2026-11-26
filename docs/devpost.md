# Devpost page — draft

> Draft for the GenHacks 2026 submission (track: **Healthcare & Environmental**). Rewritten on
> 25/11/2026 from four drafts and five simulated judges, then corrected by three sceptical reviews
> (facts, cold reading, checklist). Copy each part into the matching Devpost field. Everything in
> this header is for us, not for the page. The only thing still to fill in is the video link.
>
> **Name: Same Night, chosen by the student on 25/11/2026.** 4 of the 5 simulated judges put it
> first, because it is the idea that makes this project different ("Same night, three plans",
> "Try again (same night)"). It is now the same in this file, the README title, the game's tab
> (`index.html`) and `docs/validation.md`. Check the Devpost name limit when creating the project.

**Project name:** Same Night: one real wildfire, three plans

**Tagline (198 characters):** A 3D game: prepare a real Portuguese village for the 2018 wildfire that
forced 347 people out; that night's real wind drives the fire. Our fire matches the official burn map
at 0.65 (1 = identical).

*Spare tagline (195 characters), only if the 30-second test on 16-17/12 shows that people do not
understand "0.65"; then change the headline on the page, the README and the video too:* A 3D game:
prepare a real Portuguese village for the 2018 wildfire that forced 347 people out. Same night, three
plans: an expert plan saves the whole village 68% of the time; doing nothing, 10%.

**Links ("Try it out"):**
- Play: https://pdramos.github.io/genhacks-2026/?seed=1960 (no account; made for a computer browser). Night 1960 was
  chosen on 26/11 by AI agents who played 8 candidate nights: doing nothing loses 100 houses and the
  fire station, a sensible plan gets 181/194 (2 stars), the expert plan 194/194, and the cigarette
  scene is not hidden by trees. Reserve: night 531. Re-check both after any change to `src/sim/`.
- Code: https://github.com/pdramos/genhacks-2026
- Video: [TODO: YouTube link ("unlisted"), due 15/12]
- Already inside the About: the ICNF burned-area map service
  (https://si.icnf.pt/wfs/areas_ardidas?service=WFS&request=GetCapabilities; the bare address without
  `?service=...` returns an error in a browser) and the law in the Diário da República
  (https://diariodarepublica.pt/dr/detalhe/decreto-lei/82-2021-172745163).

**Images (in this order, with these captions).** Retake all four on 14/12 from the frozen game:
today `result.jpg` shows old text ("70 horses", "could fly") and `build.jpg` shows an "Already
changed" warning. The captions quote no numbers from the screen.
1. `docs/images/build.jpg`: Prepare: €20,000 and the real village of Malveira da Serra. You may only
   work on the glowing tiles, the strips the law requires. Each ? is where a cigarette could land.
2. `docs/images/fire.jpg`: The night: the real wind of 6 October 2018, from the north at 33 km/h with
   gusts near 70 km/h, drives the fire towards the village. The cigarette that starts it is a
   dramatization.
3. `docs/images/result.jpg`: Same night, three plans: yours, doing nothing and an expert plan, on the
   exact same fire, so you can tell skill from luck. Then: Try again (same night).
4. `docs/images/look-around.jpg`: Look around: walk the burned village after the fire. Every red ring
   is a house you lost.

**Numbers to re-check on 13/12** (code frozen). Each number on the page, and where it comes from:
- 430 ha (429 ha), start at 22:50, "Fonte da Peninha": ICNF record of fire RO2182659, in
  `docs/validation.md` ("What we compared").
- 347 people evacuated (300 of them from a campsite), 21 lightly hurt, 70 animals from riding stables:
  DN, 7 Oct 2018, "Fogo dominado em Sintra: 21 pessoas assistidas, 347 retiradas" (read on 25/11).
  "Most of them firefighters" = 8 crew taken to hospital + 9 firefighters treated on site, of 21. The
  game text (`data/levels/sintra.json`, `aftermath`) says "Hundreds" and "almost all of them
  firefighters": both are true (the final Lusa count, in Sábado on 9 Oct, is 10 crew + 1 civilian to
  hospital + 10 firefighters on site), but the page is more exact. The DN link is now in the level's
  `sources` (added 25/11). Both the Observador and the DN addresses say 18 (an earlier count); their
  titles now say 21. The final 10 + 1 + 10 breakdown is in the Observador and Sábado articles.
- Around 700 firefighters, no aircraft until dawn, control at 10:45: news in the level's `sources`
  (Inquirer: 700; DN: 740 crew at 08:00, under control "a few minutes before 11:00").
- Wind from the north, 33 km/h, gusts near 70 km/h (67.7 at 22:00, 70.2 at 01:00):
  `data/levels/sintra.json`, `wind` (ERA5 via Open-Meteo).
- 32 × 32 tiles of 65 m, 2.1 km, 1,024 tiles, €20,000, six "?": `data/levels/sintra.json`.
  194 house tiles: count the `house` tiles of `createVillage(level)`. Each is a 65 m tile with three
  or more OpenStreetMap buildings (`mapSource.map` in the level), not one house.
- €200 / €500 / €800, firebreak through trees €1,000: `BASE_COSTS` and `FIREBREAK_ON_TREES_COST` in
  `src/sim/balance.js`. Strips of up to 2 tiles from houses, 1 tile from roads: `HOUSE_STRIP`,
  `ROAD_STRIP` in the same file.
- 0.65 / 0.47 / 0.68, 81% / 45% and 52% / 57%, 242 tiles, 16 road tiles, 0.07 from the "?" spots,
  0.78 between ICNF and EFFIS: `npm run validate` (12 s on 25/11), saved in
  `data/validation/sintra-2018-results.json`; explained in `docs/validation.md`. Then
  `git diff --exit-code data/validation/` must show no change.
- Start tile (2, 0), the nearest map tile that can burn; the recorded start is 360 m north of the
  map; 23% of the fire inside the map; five of six "?" on the east side: `docs/validation.md`.
- 68% / 10% / 13% / 16%, 2.47 / 0.65 / 0.77 / 1.68 stars, €18,590: the table that
  `node --test tests/balance.test.js` prints (strategies expert, nothing, naive, good).
- No free wins: 24% of the 120 nights (29% of 2,000, with `BALANCE_SEEDS=2000`) give doing nothing 2+ stars; 91 of 120 are
  dealt; on those, doing nothing 0.09 stars and the expert 68%: the second table of the same test.
- Night 1960 (the Play link): doing nothing 100/194 and the fire station lost, a sensible plan
  181/194, the expert 194/194. Check it on the published site after any change to `src/sim/`.
- Expert plan tuned on other random versions of the same night (seeds 3001-3400 and 5001-5300, not
  1-120): comment in `tests/balance.test.js`, line 148.
- 231 tests, about 3 s: `npm test`.
- About 14,600 lines: `find src -name '*.js' | xargs cat | wc -l` (14,607 on 25/11). About 10,800
  without blank lines and comment lines (10,801 on 25/11, same command after
  `grep -v '^\s*$' | grep -v '^\s*//' | grep -v '^\s*\*' | grep -v '^\s*/\*'`).
- About 140 commits: `git rev-list --count HEAD` (142 on 25/11).
- 15 of 21 actions before the fix: recorded in `tests/fixtures/judge-night.json` (`about`) and in the
  comment above "the judge night" test in `tests/counterfactual.test.js` (old code, cannot be rerun).
  0 of 21 after the fix, and the plan beats doing nothing: asserted by that test. **125 against 108
  houses was removed from the page on 25/11** (no command prints it). Only put it back if, by 13/12,
  that test prints it.
- Learning: on 12/12, with N ≥ 5, raw numbers with N and limits ("same 5 questions, no control
  group, classmates, measured right after playing"); with N < 5, keep "Not measured yet".

**Before pasting (only the student can do these):** confirm "I live in Portugal", the line "What
I am proudest of" and the AI list in "Use of AI" (they are in the first person, but AI drafted them);
check on Devpost (5/12) the tagline limit (200?) and the name limit; join the lines of each paragraph
and of each list item before pasting (this file breaks lines at about 100 characters, and the Devpost
editor may show those breaks); in the Devpost preview, check that the tables show; read the whole page
aloud once.

**If the Devpost preview does not show tables,** paste this list instead of the table in "Does it
work?" (and turn the two tables in "Measured behaviour" into lists the same way):
- **Does our fire behave like the real one?** 1,000 runs from the map tile nearest the recorded start,
  compared tile by tile with ICNF's official burned-area map. Overlap (0 = none, 1 = identical):
  **0.65** with the real wind of that night, **0.47** with no wind.
- **Does a plan beat luck?** 120 replays of the night, every plan facing the same fires. Whole village
  saved: expert plan on **68%** of replays, doing nothing on **10%**. The game never deals a night
  that doing nothing would win, so on the nights you can get, doing nothing averages **0.09** stars.
- **Do players learn?** A 5-question anonymous quiz before and after (`?playtest=1`). **Not measured
  yet.**

---

## About the project

> Field: "About the project". Paste from "At a glance" down to the end of "Try it", then add
> "Sources and credits" (at the bottom of this file) at the end: Devpost has no separate credits field.

## At a glance

- **The problem.** On 6 October 2018, a wildfire burned about 430 hectares of scrub and forest near
  Lisbon, Portugal. It forced 347 people out of nearby villages and a campsite, and 21 were lightly
  hurt, most of them firefighters. Portugal's law says exactly where to clear fuel around villages,
  houses and roads next to forests, to keep fire away from people, but a rule on paper is hard to picture until the fire comes.
- **Why believe it.** We rebuilt that night in 3D and ran our fire 1,000 times from the map tile
  nearest the recorded start, with no player, and compared it tile by tile with the official map of
  what burned. Overlap (0 = none, 1 = identical): **0.65** with the real wind of that night, **0.47**
  with no wind. For scale, two official maps of this same fire agree at only **0.78**, and a plain
  circle around the start, told the true burned area, scores **0.68** (a bit more than ours), so we
  claim the direction of the fire (the wind matters), not its exact shape.
- **The game.** Same Night is a free 3D browser game for 12- to 17-year-olds in villages next to
  forest, and their teachers (in English for now; Portuguese next). You spend €20,000 on the real
  village, only on the strips where the law says to clear fuel. Then that night's real wind pushes
  the fire. Afterwards the game replays the exact same night with no plan and with an expert's plan:
  **your plan against both, on the same night**, so you can tell skill from luck. Where you
  work matters: over 120 replays of the night, an expert plan saves the whole village on **68%** of
  them; doing nothing, on **10%**.

**Play it:** https://pdramos.github.io/genhacks-2026/?seed=1960 (no account, nothing to install; made for a
computer browser) · [source code](https://github.com/pdramos/genhacks-2026)

## The night, and the law

Saturday, 6 October 2018, 22:50. A fire started near the Peninha sanctuary, in the Serra de Sintra,
and came down the mountain along the west side of Malveira da Serra, towards the coast, pushed by a north wind of
33 km/h with gusts near 70 km/h. 347 people and 70 animals from riding stables were evacuated.
Around 700 firefighters fought it, with no aircraft until dawn. It was brought under
control at 10:45 the next morning. No one died.

Portugal has a law for nights like this. Decreto-Lei 82/2021, article 49, says to clear fuel in
strips: **100 m** around villages next to forest, **50 m** around houses on forest land and **10 m**
on each side of roads
([Diário da República](https://diariodarepublica.pt/dr/detalhe/decreto-lei/82-2021-172745163)).
These strips exist to protect people: they keep fire further from homes and from the roads people
use to get out. But a law on paper does not clear a single hectare. I am 16, I live in Portugal, and
I wanted a game that turns that law into a puzzle you want to solve, on a night that really happened.

**Who it is for:** 12- to 17-year-olds in Portuguese villages next to forest, and their teachers.
They live in the places this law is about. Our aim is that they take what they learn home, to the
adults who own the land and have to clear it.

## What it does

**1. Prepare: the law is the puzzle.** You get €20,000 and the real village: a 2.1 km square of
32 × 32 tiles (65 m each), built from OpenStreetMap on real elevation data, with 194 house tiles
(each a 65 m block with three or more real buildings) and a fire station (a stand-in, placed where
the real primary school is). Three tools: **clear
brush** (from €200), **cut a firebreak** (from €500) and **replace eucalyptus (it burns fast) with native trees**
(from €800). Steep ground costs more, and a firebreak through trees costs double (€1,000). You can
only work on the strips the law requires (those tiles glow), and everything else, the Sintra-Cascais Natural Park, is locked. The law
tells you where; the slope and the trees tell you what it costs. "The law" card shows the three
strips, with the official link.

**2. The night: a cigarette, then the real wind.** Six **"?"** marks show dry roadsides where a
cigarette could land, and the game picks one at random (a dramatization: the real cause was never
confirmed). Then the real wind of 6–7 October 2018, from ERA5 (a global hourly record of past weather), pushes the fire:
it runs downwind, fastest uphill, and embers jump ahead in the gusts. The real fire started about
360 m north of this map, so the village, the ground and the wind are real, but where the fire
starts is a "what if".

**3. The result: same night, three plans.** Stars for the houses you saved, and **no stars if the
fire station burns**. Then the game replays the exact same night twice in the background, doing nothing and
with an expert plan, and shows the three results side by side, with at most two short lessons, like
*"The wind blows from the north: work just south (downwind) of the ? spots."* And there are no free
wins: if a new game draws a night where doing nothing would earn 2 or 3 stars, it draws another one,
so every night needs a plan.

**4. Try again (same night).** It keeps the same wind, the same "?" and the same luck (the same
random numbers), so the only thing that changes is your plan. (If you work on that "?", the
cigarette rolls to the nearest dry tile.) **Look around** lets you walk the burned village, with
every lost house ringed in red.

## Does it work?

Three questions, each with its own test:

| Question | How we tested it | Result |
|---|---|---|
| Does our fire behave like the real one? | 1,000 runs starting from the map tile nearest the recorded start (which lies about 360 m north of the map), with no player actions, compared tile by tile with the official burned-area map from ICNF, Portugal's forest agency | Overlap (0 = none, 1 = identical): **0.65** with the real wind of that night, **0.47** with no wind |
| Does a plan beat luck? | 120 replays of the night in the game (the fire starts at one of the six "?", same real wind); every plan faces the same fires | Whole village saved (every house and the fire station): expert plan on **68%** of replays, doing nothing on **10%**. The game never deals those winning nights for doing nothing: on the ones it deals, doing nothing averages **0.09** stars |
| Do players learn? | A 5-question anonymous quiz before and after playing (`?playtest=1`; no names or emails, and the results table stores no IP addresses) | **Not measured yet** |

What these numbers do and do not say:
- **The no-wind run is a control:** it shows that the wind matters. Our fire gets the direction
  right, not the exact shape, so Same Night is a game about where to work, not a fire forecast.
- **For scale,** the two official maps of this fire (ICNF's and the EU's EFFIS satellite map) agree
  with each other at 0.78, not 1.
- **The expert plan was tuned by computer on other random versions of this same night** (same map,
  same six "?" spots, same wind; seeds 3001-3400 and 5001-5300), not on these 120. So 68% shows that
  a plan can work on this night, not that it works on other fires. Part of its edge also comes from a
  game simplification (see Limitations).

**Reproduce:** `npm test` (231 tests, about 3 s) · `npm run validate` (1,000 runs, about 15 s).

**Scale:** about 14,600 lines of JavaScript in `src/` (about 10,800 without comments and blank
lines), 231 automated tests and about 140 commits, all public. Every house, tree, flame and sound is
generated by code: no downloaded models, textures, images or audio
([see every 3D piece](https://pdramos.github.io/genhacks-2026/gallery.html?style=sintra)).

## What's new here

The "budget → prepare → disaster" loop is not new: the UN's *Stop Disasters!* (2007) did it, and
research fire models such as *GridFire* already predict how fire spreads; our fire model is built for
play. What Same Night adds:

- **A real night, not a made-up one:** the real village, the real terrain and the real wind.
- **The law as the puzzle:** it decides where you may work; the slope and the trees decide what it
  costs.
- **Same night, three plans:** your plan, doing nothing and an expert plan on the exact same fire, so
  you can tell skill from luck, and then try again.
- **A fire checked in public** against the official burned area, including where it falls short.

What I am proudest of: I could not program when this project started, and now I can explain, in my
own words, what each part of Same Night does.

## How we built it

- **Plain JavaScript and Three.js 0.186.1** (a free 3D library for web pages), with no build tools:
  one HTML page with an import map, hosted on GitHub Pages.
- **Real data, one level file.** OpenStreetMap roads, buildings and land cover (Overpass API),
  Copernicus DEM GLO-90 elevation (Open-Meteo Elevation API) and the ERA5 wind, gusts, temperature
  and humidity of 6–7 October 2018 at the Peninha ridge (Open-Meteo) become one JSON level of 1,024
  tiles.
- **Rules apart from graphics.** `src/sim/` holds the rules (village, tools, fire, stars, the
  same-night comparison, the quiz) with no graphics, so Node can test them. `src/render/` only draws
  what the rules say.
- **Fair dice.** Every tile has its own fixed "dice" for each 10-minute step, picked from the
  replay's seed. The same seed gives the same night in Node and in the browser, and changing one tile
  only changes the fire where that tile matters. That is what makes "same night, three plans" fair.

## Measured behaviour (the numbers in detail)

**Our fire against the official burned area** (1,000 runs from the map tile nearest the recorded
start, no player actions, 242 really burned tiles inside the map):

| Run | Real burned tiles it also burns | Its burned tiles that did not really burn | Overlap (0 to 1) |
|---|---:|---:|---:|
| **Real wind of that night** | **81%** | 45% | **0.65** |
| Same fire, no wind | 52% | 57% | 0.47 |

**Where it is wrong.** The wind sends the fire the right way: south, along the west side of the map,
as in reality. But our fire burns too much: too far east, towards the village, and into the
south-centre of the map. One possible reason (not tested): the model has no firefighters, and about
700 fought that night. It also misses some real tiles: 16 of the 242 are roads, which never burn in
the model. ("Overlap" is the Sørensen score, also called Dice or F1.) Method, maps and limits:
[docs/validation.md](https://github.com/pdramos/genhacks-2026/blob/main/docs/validation.md).

**Does thinking pay?** 120 replays per strategy (`tests/balance.test.js`); 3 stars = every house and
the fire station saved:

| Strategy | Average stars (of 3) | Replays with 3 stars | Money spent |
|---|---:|---:|---:|
| Do nothing | 0.65 | 10% | €0 |
| Spend all €20,000, starting from the top-left corner | 0.77 | 13% | €20,000 |
| A sensible plan | 1.68 | 16% | €18,590 |
| **Expert plan** (tuned by computer on other seeds of this night) | **2.47** | **68%** | €20,000 |

Spending money without thinking is barely better than doing nothing. Where you spend it is what
counts.

## Limitations (what we have not proven)

- **One fire, one night.** The check shows how the model compares on this night only.
- **Most of the real fire is off the map.** Only about 23% of the fire (101 of its 429 ha) lies inside our 2.1 km map.
- **The game's fires are a "what if".** The check above starts the fire at the map tile nearest the
  recorded start. In the game, it starts at one of six "?" spots, five of them on the east side of the
  map, while the real fire burned mostly down the west side, under the same real wind. So a game
  night burns different ground and is not meant to copy the real burned area (from those spots, the
  overlap with it is only 0.07).
- **The exact start point is not public.** ICNF gives only a place name (Fonte da Peninha), so we used
  that spring's position on OpenStreetMap, about 360 m north of the map. The score depends on which
  start tile we use (details in validation.md).
- **The fire rules are game rules**, tuned for play, not fire physics. No firefighters, no aircraft,
  no time of day.
- **The ground is from today.** The vegetation comes from OpenStreetMap in 2026, and the park has
  replanted since the fire.
- **A firebreak on a "?" can make the night worse:** the cigarette rolls into the dry scrub beside
  it. The result screen only explains this on nights when doing nothing would have saved every house.
- **Some parts are game choices.** The cigarette is a dramatization: the real cause of the fire was
  never confirmed. The fire station is a stand-in, placed where the real primary school is, because
  Malveira has no fire station. When you work on a "?", the cigarette looks for the nearest dry tile
  in a fixed order that starts on the north side. That is a simplification, and part of the expert
  plan's edge depends on it.
- **The law is rounded up to whole 65 m tiles,** so the game's strips are wider than the law's: up to
  2 tiles (about 130 m) from any house or the fire station, and a whole tile beside each road, where
  the law asks for 10 m. Houses are counted as 65 m tiles, not single buildings.
- **The game is in English**, for this hackathon's judges; the players it is made for speak
  Portuguese. A Portuguese version is the first item in "What's next".
- **Learning is not measured yet.** The quiz is built, but we have not run it with enough players to
  report a number.
- **Made for a computer browser** with 3D graphics (WebGL) turned on. Not tested on phones.

## Challenges we ran into

- **Making it hard but possible.** Early versions were either hopeless or trivial. Now a balance test
  plays 8 strategies on 120 replays and fails if doing nothing gets 3 stars on 15% of replays or more,
  or if the expert plan gets 3 stars on fewer than half of them.
- **No free wins.** On about 3 nights in 10, the wind takes the fire away from the village and doing
  nothing already earns 2 or 3 stars. A player who got one of those first would learn the wrong
  lesson: that you do not need to do anything. So a new game never deals such a night: it draws
  another one. On the nights it can deal, the expert plan still saves everything on 68% of them.
- **Luck hiding skill.** An AI agent, playing the game the way a judge would, found a night where
  following the game's own advice saved *fewer* houses than doing nothing. The fire drew all its
  random numbers from one queue, so changing one tile reshuffled the whole night: 15 of that player's
  21 actions made the night worse on their own (measured on the old code, recorded in
  `tests/fixtures/judge-night.json`). After the fair-dice fix, none of the 21 does, and the whole plan
  beats doing nothing; that night is now a test.
- **Not tuning to the answer.** We kept the validation score we got and explained it, instead of
  tuning the model to fit one fire.

## Use of AI

"We" on this page means me (a 16-year-old student in Portugal, learning to program from scratch) and
the AI tools I directed. The rules ask us to list all AI use, so here it is.

- **What I decided:** the game idea, the real fire and village, the look of the village, that every
  graphic is made in code, the difficulty goals, and what to build and what to cut. At the end of each
  milestone, I explained back in my own words what the new part does before we moved on.
- **What AI did:** **Claude Code (Anthropic)**, an AI coding assistant, wrote most of the code and
  the tests, in small steps that I asked for and tested in the game. AI also helped gather the real
  data and the news sources, helped tune the expert plan (a computer search on other random versions
  of this night) and reviewed the code. AI agents played the game the way a judge would (that is how
  "luck hiding skill" was found), researched what past hackathon winners did, helped plan the work,
  wrote most of the in-game text (briefing, lessons and quiz questions), acted as simulated judges to
  critique drafts of this page, and helped draft this page and the README. Every number on this page
  comes from a command in the repository, from a cited source, or (one case, marked) from a recorded
  run of old code.
- **What AI did not make:** no AI-generated images, 3D models, sounds or voices. Every image, 3D model
  and sound is drawn or synthesized by the game's own code (the only outside asset is the free
  Fredoka font). There is no AI inside the game.

## What's next for Same Night

- **A Portuguese version**, and playtests in schools in villages next to forest, with the
  before-and-after quiz and a short guide for teachers.
- **More real nights.** Pedrógão Grande 2017 (Portugal) and Jasper 2024 (Canada) already have their
  own 3D styles in the code, but no level yet. "The law" card already shows the FireSmart Canada
  advice for the 30 m around a home.
- **Firefighter crews** you can place during the night. We cut this to finish on time and to keep the
  numbers above stable.
- **More than one fire** in the validation.

## Try it

- **Play** (no account; made for a computer browser): https://pdramos.github.io/genhacks-2026/?seed=1960
- **Every 3D piece, built in code:** https://pdramos.github.io/genhacks-2026/gallery.html?style=sintra
- **Code:** https://github.com/pdramos/genhacks-2026 (`npm test`, `npm run validate`)

---

## Built with

javascript · three.js · webgl · html5 · css3 · node.js · openstreetmap · overpass-api · open-meteo ·
era5 · copernicus-dem · github-pages · supabase · claude-code

---

## Sources and credits

> Paste this at the end of the About field, after "Try it".

**Where each claim comes from**
- Start time and place, and the 429 ha: ICNF, *Cartografia nacional de áreas ardidas 2018* (fire
  RO2182659), open WFS map service (for GIS software, not a web page):
  https://si.icnf.pt/wfs/areas_ardidas?service=WFS&request=GetCapabilities
- 347 people evacuated (300 of them from a campsite), 21 lightly hurt and 70 animals from riding
  stables: Civil Protection figures in
  [DN, 7 October 2018](https://www.dn.pt/arquivo/diario-de-noticias/fogo-em-sintra-18-pessoas-assistidas-347-retiradas-de-parque-de-campismo-e-varias-localidades-9963544.html).
- Brought under control at 10:45 the next morning: Lusa, in
  [Sábado, 9 October 2018](https://www.sabado.pt/portugal/amp/20181009-1725-reflorestacao-do-parque-natural-de-sintra-cascais-tem-inicio-no-sabado).
- Around 700 firefighters, no aircraft until dawn: news reports from
  Observador, DN, CM Jornal, RTP, Euronews, Inquirer and Sábado (linked inside the game).
- The wind (north, 33 km/h, gusts near 70 km/h): ERA5 via the
  [Open-Meteo historical weather API](https://open-meteo.com/), at the Peninha ridge.
- The fuel strips: Decreto-Lei 82/2021, art. 49.º,
  [Diário da República](https://diariodarepublica.pt/dr/detalhe/decreto-lei/82-2021-172745163).
- Overlap numbers: `npm run validate` and docs/validation.md. Game numbers: `npm test`
  (tests/balance.test.js).

**Licences**
- Three.js 0.186.1 (MIT) · Fredoka font (SIL Open Font License) · our code: MIT
- Map data © OpenStreetMap contributors, ODbL 1.0
- Weather: Open-Meteo historical weather API (CC BY 4.0), ERA5 from the Copernicus Climate Change
  Service
- Elevation: Open-Meteo Elevation API (CC BY 4.0), Copernicus DEM GLO-90 (© DLR e.V. 2010-2014 and
  © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA)
- Burned area (cross-check): Copyright (C) European Union, 1995-2025, EFFIS, Copernicus Emergency
  Management Service, CC BY 4.0 (changed: cut into the game grid)
