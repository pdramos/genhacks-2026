# Devpost page — draft

> Draft for the GenHacks 2026 submission (track: **Healthcare & Environmental**). Copy each section
> into the matching Devpost field. Things to fill in before submitting are marked **[TODO]**.
> Keep every number in sync with the README if the game changes.

**Project name:** [TODO: final name — "Brace" is the working title]

**Tagline (19 words):** Spend €20,000 to fire-proof a real Portuguese village, then watch the real
hourly wind of 6 October 2018 test your plan.

**Links:**
- Play: https://pdramos.github.io/genhacks-2026/ (no account, works on a computer and on a phone held
  sideways)
- Code: https://github.com/pdramos/genhacks-2026
- Video: [TODO: YouTube link. A captioned draft (2:22, no voice yet) is in `media/brace-demo-draft.mp4`, kept out of git; its sources are in `media/video-source/`]

**Images (in this order):** `docs/images/build.jpg` (preparing), `docs/images/fire.jpg` (the night),
`docs/images/result.jpg` (same night, three plans), `docs/images/look-around.jpg` (after the fire).

---

## Inspiration

Saturday 6 October 2018, 22:50, Serra de Sintra, near Lisbon. A north wind of 33 km/h,
gusting to 68 km/h, roared down the mountain. A fire started near the Peninha sanctuary and ran
downhill towards the village of Malveira da Serra. About **430 hectares** burned
([ICNF official burned-area map](https://si.icnf.pt/wfs/areas_ardidas)), hundreds of people, a
campsite and 70 horses were evacuated, around **700 firefighters** fought it, and no aircraft could
fly until dawn.

Portugal has a law for nights like that. Decreto-Lei 82/2021, art. 49.º, says to clear fuel strips
of **100 m** around villages next to forest, **50 m** around houses on forest land and **10 m** on
each side of roads
([Diário da República](https://diariodarepublica.pt/dr/detalhe/decreto-lei/82-2021-172745163)).
Most people never read it. I live in Portugal, I am 16, and I wanted a game that makes that law feel
like a puzzle you want to solve, on a night that really happened.

**Who it is for:** 12–17-year-olds who live in Portuguese villages next to forest, and their
teachers. The kids take the lesson home to the parents who own the land and have to clear it.

## What it does

1. **Prepare.** You get **€20,000** and the real village: a 32 × 32 map of 65 m tiles built from
   OpenStreetMap, with **194 houses** and a fire station, on real satellite elevation. Three tools:
   clear brush (from €200), cut a firebreak (from €500) and replace eucalyptus with native trees
   (from €800). Steep ground and thick fuel cost more. You can only work where the law puts the fuel
   strips, and those tiles glow; the natural park is locked.
2. **The night.** Six **"?"** marks show where a cigarette could land on a dry verge. A seed picks
   the one where tonight's fire starts (a "what if" on the real night). Then the **real hourly wind of that night** (ERA5, via Open-Meteo) pushes the fire hour
   by hour, with embers flying in the gusts.
3. **The result.** Stars for the houses you saved, and **no stars if the fire station burns**. Then the
   game secretly replays **the same night** twice: once doing nothing and once with an expert plan.
   The result card shows all three side by side, and at most two short lessons ("the wind blows from
   the north: work just south of the ? spots"). If even doing nothing would have saved every house, it
   says **"Lucky night"** instead of praising you. "Try again (same night)" lets you fix your plan
   against the exact same fire, "The law" card shows the three strips with the official link, and
   "Look around" lets you walk the burned village with the lost houses marked in red.

## How we built it

- **Plain JavaScript and Three.js 0.186.1**, no build tools: one HTML page with an import map.
- **Real data → level file:** OpenStreetMap roads, buildings and land cover (Overpass API), the
  Copernicus DEM GLO-90 elevation (Open-Meteo Elevation API) and the hourly ERA5 wind, gusts,
  temperature and humidity of 6–7 October 2018 at the Peninha ridge (Open-Meteo). All of it becomes
  one JSON level of 1,024 tiles.
- **Rules apart from graphics:** `src/sim/` holds the rules (village, actions, fire, stars, the
  same-night comparison, the quiz) with no graphics at all, so Node can test them; `src/render/` only
  draws what the rules say.
- **Everything is generated in code:** every house, tree, flag and sound. No downloaded models,
  textures, images or audio.
- **Deterministic fire:** a seeded random generator, so the same seed gives the same night in Node and
  in the browser. That is what makes "same night, three plans" honest.
- **Built with AI:** see "Use of AI" below.

## How we tested it

| Check | Result |
|---|---|
| Automated tests (`npm test`, Node's `node:test`) | **219 of 219 pass** |
| Balance: 8 strategies × **120 seeds** | Doing nothing **0.59★** (3★ in **12%** of nights) · a sensible plan **1.62★** · expert plan **2.49★** (3★ in **73%**) |
| Spending blindly | Spending all **€20,000** from the top-left: **0.79★**, barely better than doing nothing |
| Clicks on glowing tiles | **180 of 180**, from 3 camera views with all 3 tools (was 159 of 180) |
| Fire model vs the real burned area | **1000 nights**, see below |
| Learning (quiz before and after) | [TODO: N players, mean before → after, the 2 questions that rose most, what did not improve] |

**Against the real fire.** We rasterised the official ICNF burned-area polygon into our grid and ran
the model 1000 times from the real start, with no player actions:

| Run | Hit rate | False alarms | Sørensen (overlap) |
|---|---:|---:|---:|
| **Model, real wind** | **82.2%** | 45.9% | **0.65** |
| Same model, no wind | 51.7% | 57.2% | 0.47 |
| A circle with the true burned area | 67.8% | 32.2% | 0.68 |

The real wind matters: 82% of the real burned tiles against 52% without it. But the model burns too
much to the east and in the south-centre (it has no firefighters, and about 700 fought that fire), and
**a plain circle with the right area scores slightly better on the official map**. We publish that
anyway. The full method, maps and limitations are in
[docs/validation.md](https://github.com/pdramos/genhacks-2026/blob/main/docs/validation.md), and
anyone can rerun it with `npm run validate` in about 15 seconds.

**With players.** `?playtest=1` adds a 5-question anonymous quiz before and after playing (the 50 m
strip, the wind, eucalyptus vs native trees, clearing brush, wind and slope). It stores no names and
nothing personal, only answers and scores, and exports a CSV.

## Challenges we ran into

- **Making it hard but possible.** Early versions were either hopeless or trivial. We wrote a balance
  test that plays 8 strategies on 120 nights and fails if doing nothing wins too often (over 15%) or if
  the best plan cannot save every house at least half the time.
- **Being honest about luck.** On some nights the wind takes the fire away from the village whatever
  you do. Without the same-night comparison, players would think their plan worked. Now the game says
  "Lucky night" instead.
- **Clicking the right tile in 3D.** Trees and houses in front of a tile stole the click (21 of 180
  test clicks missed). Now the click picks the first tile under the pointer where your tool is allowed.
- **Facing a disappointing number.** Our fire model does not beat a simple circle on the official
  map. We kept the number and explained it instead of tuning the model to fit one fire.

## Accomplishments that we're proud of

- A playable game on a **real night**, in a **real village**, with the **real wind**, that runs in any
  browser and on a phone.
- A fire model **checked in public** against the official burned area, including where it fails.
- **219 tests**, written while learning to program from scratch.

## What we learned

How a fire really moves (downhill and downwind, faster in the gusts), what the fuel strips are and why
they are where they are, and how to test a game with numbers instead of guesses. Also that an honest
"we don't beat the circle" is worth more than a nice-looking number.

## What's new here

The "budget → prepare → disaster" loop is not new: the UN's *Stop Disasters!* (2007) did it, and fire
models such as *GridFire* spread fire far more accurately than we do. What we add: a **real night**
(real village, real terrain, real hourly wind), the **law as the puzzle** (it says where you may work;
the slope says what it costs), a **hidden start** you can replay on the **same night**, a **"same
night, three plans" comparison** that separates skill from luck, and a fire model **validated in
public** against the official burned area.

## Limitations (what we have not proven yet)

- **One fire, one night.** The validation only shows how the model compares on this night.
- **Most of the real fire is off the map:** only 23% of the 429 ha lies inside our 2.1 km map.
- **The fire rules are game rules**, tuned for play, not physics. No firefighters, no time of day.
- **The ground is from today:** the vegetation comes from OpenStreetMap in 2026, and the park has
  replanted since the fire.
- **Learning:** [TODO: replace with the playtest result, or say plainly that it is not measured yet].

## What's next for [TODO: name]

More real nights (Pedrógão Grande 2017 and Jasper 2024 already have their own 3D styles in the code),
a classroom mode for teachers, and the playtests in schools.

## Use of AI

I am a 16-year-old learning to program from scratch. Most of the code was written by **Claude Code
(Anthropic)**, an AI coding assistant, in small steps that I directed, tested and explained back in
my own words. I made the design decisions: the game idea, the real fire, the look of the town and the
difficulty goals. AI also helped gather the real data and news sources, tune the expert plan and review
the code. No AI-generated images, models or sounds are used: everything you see and hear is drawn or
synthesised by the game's own code.

## Built with

javascript · three.js · html · css · node.js · openstreetmap · open-meteo · copernicus · github-pages ·
claude-code

## Credits

- Three.js 0.186.1 (MIT) · Fredoka font (SIL OFL)
- Weather: Open-Meteo historical weather API, ERA5 (Copernicus Climate Change Service), CC BY 4.0
- Map data © OpenStreetMap contributors, ODbL 1.0
- Elevation: Open-Meteo Elevation API (CC BY 4.0), Copernicus DEM GLO-90 (© DLR e.V. 2010-2014 and
  © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA)
- Burned area: ICNF, Cartografia nacional de áreas ardidas 2018, https://si.icnf.pt/wfs/areas_ardidas
- Burned area (cross-check): Copyright (C) European Union, 1995-2025, EFFIS, Copernicus Emergency
  Management Service, CC BY 4.0 (changed: cut into the game grid)
- The law: Decreto-Lei 82/2021, Diário da República
- The real story: Observador, DN, CM Jornal, RTP, Euronews, Inquirer, Sábado (linked in the game)
