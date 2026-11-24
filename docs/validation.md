# Validation: does our fire behave like the real one?

Brace's level is a real night: the fire that started near the Peninha sanctuary, in the Serra de Sintra (Portugal), at 22:50 on 6 October 2018. We checked the game's fire model against the area that really burned that night. We did not change any fire rule to match the data, because changing the rules to fit one fire would be cheating (overfitting).

*Updated on 24 Nov 2026:* the fire now rolls its random numbers per tile (each tile, step and direction has its own fixed "dice"), so that changing one tile in a plan no longer reshuffles the whole night. No fire rule changed. We reran everything below; the main overlap score stayed at 0.65.

**Short answer:** with the real wind, the model burns **81%** of the tiles that really burned inside our map. It also burns too much: **45%** of the tiles it burns did not burn in real life. The real wind clearly matters: without wind the model only gets 52% of the real tiles. But a plain circle around the start, given the true burned area, matches the official map slightly *better* than the model does (overlap 0.68 vs 0.65). So the model gets the direction right, but it does not beat a simple circle on the official map, and this one fire is not enough to show that it predicts the exact shape.

## What we compared

- **Reality:** the official burned-area map of this fire from ICNF, Portugal's forest and nature agency (fire `RO2182659`, "PNSC Serra de Sintra (Fonte da Peninha)"). Start 22:50 local time, official end 14:27 the next day, **429 ha** in total: 321 ha of scrub, 47 ha of forest and 55 ha of farmland.
- **The model:** `runDisaster` from `src/sim/fire.js`, exactly as in the game. No player actions, the real hourly wind from the game level (ERA5 via Open-Meteo), and 1000 nights (seeds 1 to 1000).
- **The map:** the game map is a 2.1 km square (32 x 32 tiles of 65 m) around Malveira da Serra. Only **101 ha (23%)** of the real fire lies inside it. The other **328 ha (77%)** burned outside it: to the north-west, near the start, and to the south-west, towards Guincho and the sea.

## Data sources and licences

| Data | Source | Licence / terms | What we keep in the repo |
|---|---|---|---|
| Official burned area 2018 (main reference) | ICNF, *Cartografia nacional de áreas ardidas*, layer `BDG:ardida_2018`, open WFS at `https://si.icnf.pt/wfs/areas_ardidas` (listed on dados.gov.pt as "Áreas ardidas (desde 1975)"). Retrieved 23 Nov 2026. | The service metadata says no fees and no access constraints. The dados.gov.pt entry does not name a licence. | Only a derived 32 x 32 grid with attribution, not the original polygon. |
| Satellite burned area (cross-check) | EFFIS, Copernicus Emergency Management Service / JRC, layer `modis.ba.poly.2018` (MODIS, 250 m pixels), fire id 15381, 606 ha. Retrieved 23 Nov 2026. | CC BY 4.0, Copyright (C) European Union, 1995-2025 (as on the EFFIS data licence page) | The derived 32 x 32 grid only. |
| Real start point | ICNF record: only the place name "Fonte da Peninha" (no coordinates). The spring's position (38.76672 N, 9.46063 W) comes from OpenStreetMap, so it is a stand-in for the real start (see Limitations). | ODbL (OpenStreetMap) | Two coordinates in `dev/validate.js`. |

Attribution lines (for the README and Devpost):
- Burned area: ICNF, Cartografia nacional de áreas ardidas 2018, https://si.icnf.pt/wfs/areas_ardidas
- Burned area (cross-check): Copyright (C) European Union, 1995-2025, EFFIS, Copernicus Emergency Management Service, CC BY 4.0 (changed: cut into the game grid)

## Method

1. **From polygon to tiles.** We laid the ICNF polygon over the game map's bounding box (`data/levels/sintra.json`, `mapSource.bbox`). In each tile we tested 16 x 16 = 256 points to measure how much of the tile lies inside the burned area. A tile counts as **really burned** if at least half of it is inside. That gives 242 tiles. As a check, our area for the whole polygon is 428.7 ha, against 429 ha in ICNF's record.
2. **Where the fire starts.** ICNF names the start only as "Fonte da Peninha". The spring of that name (its position in OpenStreetMap) is about 360 m north of the map (tile x = 2.2, y = -5.5). So the model starts at the nearest map tile that can burn, in the top row: tile (2, 0), which is scrub.
3. **Running the model.** We ran 1000 nights with no player actions. For each tile, its **burn probability** is the share of nights in which it caught fire. A tile counts as **model-burned** if it burned in at least half of the nights (P ≥ 0.5).
4. **Scores** (in each case, "tiles" means tiles inside the map):
   - **Hit rate:** the share of really burned tiles that the model also burns.
   - **False alarms:** the share of model-burned tiles that did not really burn.
   - **Jaccard:** tiles burned in both / tiles burned in either one (0 = no overlap, 1 = identical).
   - **Sørensen** (also called Dice or F1): 2 × tiles burned in both / (model tiles + real tiles).
5. **Baselines** (simple guesses the model should beat):
   - **A, no wind:** the same model with wind speed and gusts set to 0, so no embers fly either.
   - **B, circle:** the 242 map tiles closest to the start, a circle with the *true* burned area. This is a generous baseline, because it is told the right area, which the model must work out alone.

All the code is in `dev/validate.js` and runs with `npm run validate`, in about 20 s. The numbers are saved to `data/validation/sintra-2018-results.json`.

## Results

**Main table:** the fire starts at the real ignition point. The real fire covers 242 tiles (101 ha) inside the map.

| Run | Model tiles | Hit rate | False alarms | Jaccard | Sørensen | Mean burned per night |
|---|---:|---:|---:|---:|---:|---:|
| **Model, real wind** | 359 | **81.0%** | 45.4% | 0.48 | **0.65** | 126.8 ha |
| Baseline A: model, no wind | 292 | 51.7% | 57.2% | 0.31 | 0.47 | 114.6 ha |
| Baseline B: circle, true area | 242 | 67.8% | 32.2% | 0.51 | 0.68 | 102.2 ha |
| Model, real wind, top 242 tiles | 242 | 59.5% | 40.5% | 0.42 | 0.60 | 126.8 ha |
| Baseline A, no wind, top 242 tiles | 242 | 47.9% | 52.1% | 0.32 | 0.48 | 114.6 ha |

The "top 242 tiles" rows keep only the 242 most likely tiles. That way the model and the circle cover the same area, and only the shape is compared.

**Where they agree and disagree.** `#` = burned in both, `M` = model only, `R` = reality only, `.` = neither. North is at the top, and the start is tile (2, 0). The village of Malveira is around columns 13-22, rows 11-20.

```
RR##RRRR........................
RR#####R#.......................
R########MM.....................
###########M....................
RR#########MM...................
RR##########MMM.................
########M####MM.................
########M####MMM................
########M####MMMM...............
RRRRR########MMMM...............
.RRRR#######MMMMM...............
.##RRR######MMMMMM..............
R###.R######MMMMMMM.............
.###RRR#M##MMMMMMM..............
####RRR.MMMMMMMMMM..............
####.RRR#MMMMMMMMM..............
###...RR#MMMMMMMMM..............
###.R.RR...MMMMMM...............
###RRR..........................
###.............................
###RM......MMM..................
####M......MMMM.................
#####....M.MMMM.................
#####MMMMM.MMMM.................
#####MMMMM.MMM..................
#####MMMMM.MMM..................
#####MMMMMMMMM..................
#####MMMMMMMMM..................
###MMMMMM.......................
##MMM#MMMM......................
###M##MMMM......................
######MMMM......................
```

**Secondary table:** the fire starts at the game's "?" spots, the way the game plays. In the game, a seed picks one of six spots beside the serra roads (1000 nights in total).

| Start | Nights | Hit rate | False alarms | Sørensen |
|---|---:|---:|---:|---:|
| All ? spots (as the game plays) | 1000 | 5.0% | 88.8% | 0.07 |
| ? at (17, 3) | 155 | 50.4% | 65.1% | 0.41 |
| ? at (5, 9), by the EN247 on the Peninha side | 163 | 32.2% | 56.7% | 0.37 |
| ? at (20, 5) | 165 | 16.9% | 81.1% | 0.18 |
| ? at (20, 7) | 170 | 3.3% | 93.6% | 0.04 |
| ? at (22, 1) | 170 | 0.0% | 100.0% | 0.00 |
| ? at (20, 10) | 177 | 0.0% | 100.0% | 0.00 |

**Cross-check against the EFFIS satellite map.** This map is coarser (250 m pixels) and larger (606 ha). It covers 378 tiles inside our map and contains all 242 ICNF tiles.

| Run | Hit rate | False alarms | Jaccard | Sørensen |
|---|---:|---:|---:|---:|
| Model, real wind | 76.2% | 19.8% | 0.64 | 0.78 |
| Baseline A: no wind | 48.7% | 37.0% | 0.38 | 0.55 |
| Baseline B: circle, EFFIS area | 72.2% | 27.8% | 0.57 | 0.72 |
| ICNF map vs EFFIS map (two "real" maps) | 64.0% | 0.0% | 0.64 | 0.78 |

## What this means

**What matches:**
- **The wind drives the fire in the right direction.** With the real north wind, the model hits 81% of the real tiles. Without wind it hits 52%, and its overlap with reality (Sørensen) falls from 0.65 to 0.47. The real fire ran south, downhill and downwind, along the west side of the map, and so does the model. Columns 0-5 burn in reality all the way to the southern edge, and the model burns them too: tiles in the bottom row of those columns burn in 64-75% of the nights.
- **The size is in the right range.** Inside the map, the model burns 127 ha on an average night against 101 ha in reality, 26% too much. That is not a factor of 2 or 10.

**What does not match:**
- **The model does not beat a simple circle on the official map.** A circle around the start, given the true area, scores 0.68 against the model's 0.65 on the ICNF map (Jaccard 0.51 vs 0.48). When both are cut to the same area, the model drops to 0.60. One reason: only 23% of the real fire is inside the map, and that part is the "near end" of the fire, right below the start. Any blob around the start in the map's north-west corner covers a lot of it. Against the coarser EFFIS map, the model does beat the circle (0.78 vs 0.72). But we treat ICNF, the finer official map, as the main reference, and we do not pick whichever one flatters us.
- **The model burns too far east and too far into the middle of the map.** Of the 163 false-alarm tiles, 65 lie in column 13 or further east, towards Malveira da Serra, and 68 lie in the south-centre (rows 18-31, west of column 13). Likely reasons:
  - **No firefighting.** About 700 firefighters defended the villages that night. The model has no firefighters at all, so its flanks keep creeping sideways until the fuel runs out.
  - **Spotting.** In the model, embers jump 2-3 tiles ahead with the 65-70 km/h gusts. Some of these start fires in places the real fire never reached.
- **It misses some real tiles.** The model misses 46 of the 242 real tiles. 16 of them are road tiles, which can never burn in the model, although the official perimeter includes the roads the fire crossed. So the best possible hit rate is 93%. Of the other 30 misses, 10 are in the top-left corner, around the start (rows 0-2), and 20 are in the western strip (rows 4-20, columns 0-6). They are brush, grass and cleared ground that the model burns in 9-50% of the nights, a third of them just under the 50% line (P 0.44-0.50).
- **The game's ? spots are a "what if", not a replay.** When the fire starts at the game's ? spots, the overlap is low (0.07). This is expected. Five of the six spots are on the east side, so the game asks "what if the cigarette had landed here instead?" on the real night's wind. Only the western spot (5, 9) and the northern one (17, 3) send the fire over ground that really burned.
- **Timing.** On average, the model fire goes out by itself after 7.7 hours. The real fire was declared controlled after about 12 hours, at 10:45. We did not compare how fast the fire spread, because we have no public timeline of the real fire front.

## Limitations

- **One fire only.** This is one fire on one night, so it cannot show that the model is accurate in general. It only shows how the model compares on this one night.
- **Most of the fire is outside the map.** 77% of the real burned area lies outside our 2.1 km map, and the start is about 360 m beyond the top edge.
- **The exact start point is not public.** ICNF gives only the place name Fonte da Peninha, so we used the spring's position in OpenStreetMap, which lies about 90 m outside the official burned area. The real start may be a few hundred metres away, and the score depends on the start tile: with 300 nights, Sørensen is 0.64 from tile (2, 0), 0.65 from (3, 0), 0.63 from (4, 0), 0.60 from (1, 0) and only 0.07 from (0, 0). The circle stays between 0.65 and 0.70 for all of these starts.
- **Coarse tiles.** A 65 m tile is either burned or not. Small unburned islands and ragged edges get lost, and a tile counts as burned when at least half of it burned.
- **The "real" map is uncertain too.** The ICNF and EFFIS maps of the same fire only agree at Sørensen 0.78 inside our map (EFFIS is 41% larger in total). So a score near 0.8 is about as close as two official maps get to each other.
- **The ground is from today, not from 2018.** The vegetation on the game map comes from OpenStreetMap in 2026. After the fire, the park cut invasive trees and replanted, so some tiles may not show the fuel that burned in 2018.
- **The model knows nothing about firefighting or the time of day**, and its burn probabilities come from game rules tuned for gameplay (`tests/balance.test.js`), not from fire physics.

## How to reproduce

```
npm run validate                    # 1000 nights, about 20 s, writes data/validation/sintra-2018-results.json
node dev/validate.js --nights 200   # quicker
npm test                            # includes tests/validation.test.js (fast checks)
```

To rebuild the grid from the source data, download the two perimeters into an empty folder:
- ICNF: `https://si.icnf.pt/wfs/areas_ardidas?service=WFS&version=2.0.0&request=GetFeature&typeNames=BDG:ardida_2018&outputFormat=application/json&srsName=EPSG:4326&bbox=38.70,-9.55,38.82,-9.35,urn:ogc:def:crs:EPSG::4326`
- EFFIS: `https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=1.1.0&request=GetFeature&typename=ms:modis.ba.poly.2018&outputformat=application/json;%20subtype=geojson&bbox=38.70,-9.55,38.82,-9.35,urn:ogc:def:crs:EPSG::4326`

Then run `node dev/validate.js --rasterize <icnf.json> --effis <effis.json>`.
