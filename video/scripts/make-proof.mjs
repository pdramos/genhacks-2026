// Gera video/src/data/proof.json a partir dos dados reais do repositorio (nao muda nada no repo). Correr: node video/scripts/make-proof.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
// A raiz do repositório, a partir do sítio deste ficheiro (video/scripts/ -> ../../).
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const v = await import(pathToFileURL(ROOT + 'dev/validate.js').href);
const { windForLevel } = await import(pathToFileURL(ROOT + 'src/sim/weather.js').href);
const { createVillage } = await import(pathToFileURL(ROOT + 'src/sim/village.js').href);
const level = JSON.parse(readFileSync(ROOT + 'data/levels/sintra.json', 'utf8'));
const burned = JSON.parse(readFileSync(ROOT + 'data/validation/sintra-2018-burned.json', 'utf8'));
const results = JSON.parse(readFileSync(ROOT + 'data/validation/sintra-2018-results.json', 'utf8'));
const r3 = (x) => Math.round(x * 1000) / 1000;
const seeds = Array.from({ length: 1000 }, (_, i) => i + 1);
const start = results.startTile;
const t0 = Date.now();
const withWind = v.burnProbability(level, { seeds, startAt: () => start, wind: windForLevel(level) });
const noWind = v.burnProbability(level, { seeds, startAt: () => start, wind: v.calmWind(level) });
const pw = withWind.probability.map((r) => r.map(r3));
const pn = noWind.probability.map((r) => r.map(r3));
// confere: a grelha com vento recalculada = a guardada; e as metricas batem com a tabela
const same = JSON.stringify(pw) === JSON.stringify(results.probabilityRealWind);
const mW = v.compareGrids(v.threshold(withWind.probability, 0.5), burned.burned);
const mN = v.compareGrids(v.threshold(noWind.probability, 0.5), burned.burned);
const circle = v.circleGrid(start, burned.realTilesInMap, 32, 32);
const mC = v.compareGrids(circle, burned.burned);
console.log('withWind recomputed == saved:', same, 'ms', Date.now() - t0);
console.log('with wind', mW, '\nno wind', mN, '\ncircle', mC);
const find = (arr, name) => arr.find((r) => r.name === name);
const round4 = (o) => ({ ...o, hitRate: r3(o.hitRate), falseAlarm: r3(o.falseAlarm), jaccard: r3(o.jaccard), sorensen: Math.round(o.sorensen * 100) / 100 });
const rows = (g) => g.map((r) => r.map((x) => (x ? '#' : '.')).join(''));
const out = {
  about: 'Real data for the video proof scene. Grids are 32x32, row 0 = north, column 0 = west, one tile = 65 m (map = 2.1 km square around Malveira da Serra). Nothing here is invented: grids are copied from data/validation/ or recomputed with dev/validate.js exported functions (same model, same seeds 1-1000, same start), and cross-checked against the saved numbers.',
  generated: '2026-11-26, by video/scripts/make-proof.mjs (copy of data/validation/*.json; no-wind grid recomputed with dev/validate.js burnProbability + calmWind)',
  fire: { id: burned.fire.id, place: burned.fire.place, start: burned.fire.start, officialAreaHa: burned.fire.officialAreaHa, localStart: '22:50, 6 Oct 2018' },
  map: { size: 32, tileSizeM: burned.tileSizeM, bbox: burned.bbox, realBurnedHaInMap: burned.realBurnedHaInMap, realTilesInMap: burned.realTilesInMap, outsideMapShare: burned.outsideMapShare },
  startTile: { ...start, note: 'Model start = nearest burnable map tile to Fonte da Peninha (ICNF place name, position from OpenStreetMap), which lies about 360 m north of the map, at tile (2.23, -5.48).' },
  realIgnitionTile: results.realIgnition.tile,
  official: {
    label: 'Official burned area (ICNF)',
    source: burned.attribution,
    rule: 'tile = 1 if at least 50% of its area is inside the ICNF perimeter',
    burned: burned.burned,
    burnedRows: burned.burnedRows,
    fractions: burned.fractions,
  },
  effis: {
    label: 'EU satellite burned area (EFFIS, MODIS 250 m), cross-check only',
    source: burned.crossCheck.attribution + ', CC BY 4.0 (changed: cut into the game grid)',
    tilesInMap: burned.crossCheck.tilesInMap,
    burned: burned.crossCheck.burned,
  },
  modelRealWind: {
    label: 'Model, real wind of that night (hourly ERA5 via Open-Meteo), 1000 nights, no player actions',
    source: 'data/validation/sintra-2018-results.json probabilityRealWind (npm run validate)',
    probability: results.probabilityRealWind,
    burned: v.threshold(results.probabilityRealWind, 0.5),
    burnedRows: rows(v.threshold(results.probabilityRealWind, 0.5)),
  },
  modelNoWind: {
    label: 'Same model, no wind (speed and gusts set to 0), 1000 nights, no player actions',
    source: 'NOT saved in data/validation/. Recomputed on 2026-11-26 with dev/validate.js burnProbability(level, { seeds 1-1000, start (2,0), wind: calmWind(level) }), exactly the run behind the "Baseline A: model, no wind" row. Check: thresholded at 0.5 it gives ' + mN.modelTiles + ' tiles and Sorensen ' + mN.sorensen.toFixed(2) + ', as in the saved table.',
    probability: pn,
    burned: v.threshold(noWind.probability, 0.5),
    burnedRows: rows(v.threshold(noWind.probability, 0.5)),
  },
  circle: { label: 'Baseline: circle of the 242 tiles nearest the start (told the true area)', burned: circle },
  overlap: {
    measure: 'Sorensen (Dice / F1) overlap: 2 x tiles burned in both / (model tiles + real tiles). 0 = none, 1 = identical. Model tile = burned in at least 50% of 1000 nights.',
    realWind: 0.65,
    noWind: 0.47,
    circle: 0.68,
    icnfVsEffis: 0.78,
    hitRateRealWind: 0.81,
    falseAlarmsRealWind: 0.45,
    hitRateNoWind: 0.52,
    sources: {
      table: 'data/validation/sintra-2018-results.json (main + crossCheck), printed by npm run validate',
      page: 'docs/devpost.md: "Overlap (0 = none, 1 = identical): 0.65 with the real wind of that night, 0.47 with no wind"; "two official maps of this same fire agree at only 0.78"; "a plain circle around the start, told the true burned area, scores 0.68 (a bit more than ours)"',
      doc: 'docs/validation.md (Results + What this means)',
    },
    rows: {
      realWind: round4(find(results.main, 'Model, real wind (hourly ERA5)')),
      noWind: round4(find(results.main, 'Baseline A: model, no wind')),
      circle: round4(find(results.main, 'Baseline B: circle, same area')),
      icnfVsEffis: round4(find(results.crossCheck, 'ICNF map vs EFFIS map (two real maps)')),
    },
    honestyNotes: [
      'A plain circle told the true area scores 0.68, a bit more than the model (0.65). Do not claim the model beats it.',
      'Only 23% of the real fire is inside the 2.1 km map; 77% burned outside it.',
      'One fire only: this compares the model on this one night; it does not show general accuracy. Never say forecast or predicts.',
      'The 0.78 is ICNF vs EFFIS (two official maps of the same fire). The model vs EFFIS is also 0.78, but the page uses 0.78 for the two maps.',
    ],
  },
};
writeFileSync(ROOT + 'video/src/data/proof.json', JSON.stringify(out, null, 1).replace(/\[\s*(-?[\d.]+(?:,\s*-?[\d.]+)*)\s*\]/g, (m, inner) => `[${inner.replace(/\s+/g, '')}]`) + '\n');
console.log('written');
