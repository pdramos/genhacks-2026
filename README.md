# Brace (working title) — GenHacks 2026

**▶ Play it in your browser (no account needed): https://pdramos.github.io/genhacks-2026/**
Works on a computer and on a phone held sideways.

A browser game about getting ready for a real wildfire. You get a limited budget to prepare a village
(clear brush, cut firebreaks, swap eucalyptus for native trees), then a **real fire night** plays out,
driven by the real hourly weather of that night.

The main level is **Malveira da Serra, 6 October 2018**: the night a fire started near the Peninha
sanctuary in the Serra de Sintra (Portugal) and a strong north wind pushed it downhill towards the
villages. The map is built from real data (OpenStreetMap roads, houses and land cover; satellite
elevation), and the wind is the real wind of that night.

The game is educational, not a fire forecast: the fire rules are simplified.

## How to run it

No build tools are needed.

```
python dev/serve.py
```

(It works like `python -m http.server 8000`, but tells the browser not to cache, so it always runs
the newest code.) Then open <http://localhost:8000/>. Other styles for development: `?style=canada`, and
`gallery.html?style=sintra` shows every 3D piece of a style.

**Playtests:** `?playtest=1` adds a short anonymous quiz before and after playing, to measure what
players learned. Results stay only on that device (answers, scores and time; nothing personal) and can
be exported as CSV.

Tests (game rules, map checks and a balance check that plays the level hundreds of times):

```
npm test
```

## How close is the fire to the real one?

We checked the fire model against the official map of what really burned in 2018: see
[docs/validation.md](docs/validation.md). In short: with the real wind, the model finds 82% of the
real burned tiles inside the map, but it also burns too much to the east (there are no firefighters
in the model, and about 700 fought that fire). A simple circle with the right area scores almost as
well, and we say so. To run the check yourself: `npm run validate`.

## How it is made

- `src/sim/` — the rules (village, actions, fire, stars). Plain JavaScript, no graphics, tested with
  Node's built-in `node:test`.
- `src/render/` — the 3D view (Three.js). It only reads the simulation.
- `data/levels/` — the levels (map, heights, budget, real wind, story and sources).
- All graphics and sounds are **generated in code**: no downloaded models, images, textures or audio.

## Credits and licences

**Code library**
- [Three.js](https://threejs.org/) 0.186.1 — MIT licence, loaded from the jsDelivr CDN.
- Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) from Google Fonts — SIL Open Font Licence.

**Data**
- **Weather:** [Open-Meteo](https://open-meteo.com/) historical weather API (ERA5 archive) — CC BY 4.0.
  The hourly wind, gusts, temperature and humidity of 6–7 October 2018 at the Peninha ridge.
- **Map:** Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
  Open Database Licence (ODbL 1.0). Roads, buildings and land cover around Malveira da Serra,
  retrieved through the Overpass API and turned into a 32 × 32 tile map (some tiles are game choices:
  the fire station stand-in and the dry verges where the cigarette can fall).
- **Elevation:** [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) (CC BY 4.0),
  based on the Copernicus DEM GLO-90 (© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH
  2014-2018, provided under COPERNICUS by the European Union and ESA).
- **The real story** (briefing and "what really happened"): news reports listed in the level's
  `sources` (Observador, DN, CM Jornal, RTP, Euronews, Inquirer, Sábado). They are also linked on the
  results screen in the game.
- **Real burned area (only for the model check, not shown in the game):** ICNF, Cartografia nacional
  de áreas ardidas 2018, https://si.icnf.pt/wfs/areas_ardidas. Cross-check: © European Union,
  1995-2026, EFFIS, Copernicus Emergency Management Service, CC BY 4.0 (changed: cut into the game
  grid). Only the derived 32 × 32 grids are in `data/validation/`. Details in
  [docs/validation.md](docs/validation.md).

The game shows the weather, map and elevation credits on the briefing and results screens.

**Early spike (removed):** in the first days we briefly tried free Kenney 3D models (CC0, public
domain). They were never committed to this repository and the final game uses none of them: every
house, tree and flag is now built in code.

## Licence

The source code is under the [MIT licence](LICENSE). The map data in `data/levels/sintra.json` is
derived from OpenStreetMap and stays under the **ODbL 1.0**; the weather and elevation data stay under
CC BY 4.0 (see above).

## Use of AI

This project is made by a 16-year-old student who is learning to program from scratch. Most of the
code was written by **Claude Code (Anthropic)**, an AI coding assistant, in small steps that the
student directed, tested and explained back in their own words. The student made the design decisions
(the game idea, the real fire, the look of the town, the difficulty goals). AI was also used to help
gather the real data and the news sources listed above. No AI-generated images, models or sounds are
used: everything you see and hear is drawn or synthesised by the game's own code.
