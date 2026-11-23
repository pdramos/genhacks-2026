// VALIDAÇÃO: o nosso fogo parece-se com o fogo VERDADEIRO de 6-7 de outubro de 2018?
// Comparamos o modelo (src/sim/fire.js, sem mudar nenhuma regra) com a área que ardeu mesmo,
// medida pelo ICNF (ver data/validation/sintra-2018-burned.json e docs/validation.md).
//
// Como usar (na pasta do projeto):
//   npm run validate                      -> 1000 noites (sementes 1-1000), imprime a tabela
//   node dev/validate.js --nights 200     -> menos noites (mais rápido)
//   node dev/validate.js --rasterize <perímetro ICNF .geojson> [--effis <perímetro EFFIS .geojson>]
//        -> volta a fazer a grelha 32x32 da área ardida a partir do ficheiro descarregado
//           (o ficheiro original não fica no repositório; só a grelha, com a atribuição)
// Os números vão também para data/validation/sintra-2018-results.json.
//
// Só regras, sem Three.js. As funções são exportadas para o tests/validation.test.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createVillage } from '../src/sim/village.js';
import { runDisaster } from '../src/sim/fire.js';
import { resolveIgnition } from '../src/sim/ignition.js';
import { windForLevel, STEP_MINUTES } from '../src/sim/weather.js';

const LEVEL_URL = new URL('../data/levels/sintra.json', import.meta.url);
const BURNED_URL = new URL('../data/validation/sintra-2018-burned.json', import.meta.url);
const RESULTS_URL = new URL('../data/validation/sintra-2018-results.json', import.meta.url);

// Um quadrado conta como "ardido" no modelo se ardeu em pelo menos metade das noites.
export const MODEL_THRESHOLD = 0.5;
// E conta como "ardido de verdade" se pelo menos metade da área dele está dentro do perímetro.
export const REAL_THRESHOLD = 0.5;

// Onde o fogo começou mesmo: "PNSC Serra de Sintra (Fonte da Peninha)" no registo do ICNF.
// A Fonte da Peninha (OpenStreetMap) fica ~360 m a norte do mapa. Por isso o fogo do modelo
// começa no quadrado do mapa que arde mais perto dela, na linha de cima (ver findStartTile).
export const REAL_IGNITION = { name: 'Fonte da Peninha (ICNF SGIF start point, OSM position)', lat: 38.7667249, lon: -9.4606301 };

// ---------- 1) Do perímetro (polígono) para a grelha do jogo ----------

// Quantos metros tem um grau de latitude e de longitude perto da latitude lat (fórmula WGS84 curta).
function metresPerDegree(lat) {
  const phi = (lat * Math.PI) / 180;
  return {
    lat: 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi),
    lon: 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi),
  };
}

// Os polígonos de um GeoJSON, como lista de polígonos; cada polígono = [anel de fora, buracos...].
// Cada anel é uma lista de [lon, lat].
export function polygonsOf(geojson) {
  const geometries = geojson.type === 'FeatureCollection' ? geojson.features.map((f) => f.geometry)
    : geojson.type === 'Feature' ? [geojson.geometry] : [geojson];
  const polygons = [];
  for (const g of geometries) {
    if (g.type === 'Polygon') polygons.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polygons.push(...g.coordinates);
  }
  return polygons;
}

// Área (em metros quadrados) dentro de um anel, pela "fórmula do atacador" (shoelace).
function ringArea(ring, metres, lat0, lon0) {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lonA, latA] = ring[i];
    const [lonB, latB] = ring[(i + 1) % ring.length];
    const ax = (lonA - lon0) * metres.lon, ay = (latA - lat0) * metres.lat;
    const bx = (lonB - lon0) * metres.lon, by = (latB - lat0) * metres.lat;
    sum += ax * by - bx * ay;
  }
  return Math.abs(sum) / 2;
}

// A área total dos polígonos, em hectares (1 ha = 10 000 m²). Os buracos descontam.
export function polygonAreaHa(polygons) {
  const [lon0, lat0] = polygons[0][0][0];
  const metres = metresPerDegree(lat0);
  let m2 = 0;
  for (const [outer, ...holes] of polygons) {
    m2 += ringArea(outer, metres, lat0, lon0);
    for (const hole of holes) m2 -= ringArea(hole, metres, lat0, lon0);
  }
  return m2 / 10000;
}

// O ponto (lon, lat) está dentro deste anel? Lança-se um "raio" para leste e contam-se
// as vezes que corta a linha do anel: um número ímpar = dentro.
function insideRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Dentro de algum polígono (dentro do anel de fora e fora dos buracos)?
export function insidePolygons(lon, lat, polygons) {
  return polygons.some(([outer, ...holes]) => insideRing(lon, lat, outer) && !holes.some((h) => insideRing(lon, lat, h)));
}

// Para cada quadrado do mapa: que parte (0 a 1) da área dele está dentro do perímetro?
// Medimos com uma pequena grelha de samples x samples pontos dentro de cada quadrado.
// bbox = { south, west, north, east }; linha 0 = norte, coluna 0 = oeste (como no jogo).
export function rasterizePolygons(polygons, bbox, size = 32, samples = 16) {
  const fractions = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const lon = bbox.west + ((x + (sx + 0.5) / samples) / size) * (bbox.east - bbox.west);
          const lat = bbox.north - ((y + (sy + 0.5) / samples) / size) * (bbox.north - bbox.south);
          if (insidePolygons(lon, lat, polygons)) hits++;
        }
      }
      row.push(Math.round((hits / (samples * samples)) * 1000) / 1000);
    }
    fractions.push(row);
  }
  return fractions;
}

// 0/1: 1 se a fração for pelo menos o limite.
export function threshold(grid, limit) {
  return grid.map((row) => row.map((v) => (v >= limit ? 1 : 0)));
}

// Onde fica um ponto (lon, lat) na grelha, em quadrados (pode dar fora do mapa: <0 ou >=size).
export function lonLatToTile(lon, lat, bbox, size = 32) {
  return {
    x: ((lon - bbox.west) / (bbox.east - bbox.west)) * size,
    y: ((bbox.north - lat) / (bbox.north - bbox.south)) * size,
  };
}

// ---------- 2) Comparar duas grelhas 0/1 ----------

// model e real são grelhas 0/1 do mesmo tamanho. Devolve:
//   hitRate     = dos quadrados que arderam MESMO, que parte o modelo também queimou
//   falseAlarm  = dos quadrados que o modelo queimou, que parte NÃO ardeu na realidade
//   jaccard     = sobreposição: em comum / (todos os que arderam em pelo menos um dos dois)
//   sorensen    = 2 x em comum / (quadrados do modelo + quadrados reais) (também chamado F1 ou Dice)
// Se um dos conjuntos estiver vazio, a conta que dividia por 0 dá null.
export function compareGrids(model, real) {
  let both = 0, modelOnly = 0, realOnly = 0;
  for (let y = 0; y < real.length; y++) {
    for (let x = 0; x < real[y].length; x++) {
      if (model[y][x] && real[y][x]) both++;
      else if (model[y][x]) modelOnly++;
      else if (real[y][x]) realOnly++;
    }
  }
  const realTiles = both + realOnly, modelTiles = both + modelOnly;
  const share = (a, b) => (b === 0 ? null : a / b);
  return {
    realTiles,
    modelTiles,
    both,
    hitRate: share(both, realTiles),
    falseAlarm: share(modelOnly, modelTiles),
    jaccard: share(both, both + modelOnly + realOnly),
    sorensen: share(2 * both, modelTiles + realTiles),
  };
}

// ---------- 3) Correr o modelo muitas noites ----------

// O quadrado do mapa onde começa o fogo "verdadeiro": o quadrado que arde mais perto do ponto
// (em linha reta, a contar do centro do quadrado). Se o ponto estiver dentro do mapa e o
// quadrado dele arder, é esse.
export function findStartTile(village, point) {
  let best = null, bestDistance = Infinity;
  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) {
      if (!['grass', 'brush', 'eucalyptus', 'broadleaf'].includes(village.tiles[y][x])) continue;
      const distance = Math.hypot(x + 0.5 - point.x, y + 0.5 - point.y);
      if (distance < bestDistance) { best = { x, y }; bestDistance = distance; }
    }
  }
  return best;
}

// O vento sem força nenhuma (nem rajadas, que levam as brasas): a "linha de base" sem vento.
export function calmWind(level) {
  const real = windForLevel(level);
  return (step) => ({ ...real(step), speed: 0, gust: 0 });
}

// Corre o fogo SEM nenhuma ação do jogador nas sementes dadas e conta, para cada quadrado,
// em que parte das noites ele pegou fogo (a "probabilidade de arder", 0 a 1).
//   startAt(seed, village) -> { x, y } onde começa o fogo nessa noite
//   wind = o vento (fixo ou função passo -> vento), como no runDisaster
// Devolve { probability (grelha), meanTiles (média de quadrados ardidos por noite),
//   meanHours (quantas horas, em média, o fogo durou até se apagar sozinho), starts }.
export function burnProbability(level, { seeds, startAt, wind }) {
  const village = createVillage(level);
  const counts = village.tiles.map((row) => row.map(() => 0));
  const starts = {};
  let totalTiles = 0, totalSteps = 0;
  for (const seed of seeds) {
    const ignition = startAt(seed, village);
    starts[`${ignition.x},${ignition.y}`] = (starts[`${ignition.x},${ignition.y}`] ?? 0) + 1;
    const { steps } = runDisaster(village, { ignition, wind, seed });
    const last = steps[steps.length - 1];
    for (const [x, y] of [...last.burned, ...last.burning]) counts[y][x]++;
    totalTiles += last.burned.length + last.burning.length;
    totalSteps += steps.length - 1;
  }
  return {
    probability: counts.map((row) => row.map((c) => c / seeds.length)),
    meanTiles: totalTiles / seeds.length,
    meanHours: (totalSteps / seeds.length) * (STEP_MINUTES / 60),
    starts,
  };
}

// A linha de base "círculo": os N quadrados do mapa mais perto do início do fogo
// (um círculo com a mesma área que ardeu de verdade dentro do mapa, cortado pela borda).
export function circleGrid(start, tileCount, width = 32, height = 32) {
  const tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push({ x, y, d: Math.hypot(x - start.x, y - start.y) });
  tiles.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x); // ordem fixa nos empates
  const grid = Array.from({ length: height }, () => new Array(width).fill(0));
  for (const { x, y } of tiles.slice(0, tileCount)) grid[y][x] = 1;
  return grid;
}

// Os "count" quadrados com a probabilidade mais alta (só os que arderam pelo menos uma vez).
// Serve para comparar a FORMA do fogo com a mesma área que ardeu de verdade, como o círculo.
// Empates: primeiro a linha de cima, depois a coluna da esquerda (ordem fixa).
export function topTiles(probability, count) {
  const tiles = [];
  probability.forEach((row, y) => row.forEach((p, x) => { if (p > 0) tiles.push({ x, y, p }); }));
  tiles.sort((a, b) => b.p - a.p || a.y - b.y || a.x - b.x);
  const grid = probability.map((row) => row.map(() => 0));
  for (const { x, y } of tiles.slice(0, count)) grid[y][x] = 1;
  return grid;
}

// Junta tudo: corre os modelos e as linhas de base e devolve as linhas das tabelas.
// real = o conteúdo de data/validation/sintra-2018-burned.json.
export function runValidation(level, real, { nights = 1000, firstSeed = 1 } = {}) {
  const seeds = Array.from({ length: nights }, (_, i) => firstSeed + i);
  const village = createVillage(level);
  const realGrid = real.burned;
  const point = lonLatToTile(REAL_IGNITION.lon, REAL_IGNITION.lat, level.mapSource.bbox, village.width);
  const start = findStartTile(village, point);
  const tileHa = (level.mapSource.tileSizeM ** 2) / 10000;

  // Uma linha da tabela, a partir de uma grelha de probabilidades (ou já 0/1).
  // sameArea = true: em vez do limite de 50%, ficam os N quadrados mais prováveis (N = os reais).
  // reference = a grelha 0/1 "verdadeira" com que comparamos (por omissão, a do ICNF).
  const row = (name, probability, meanTiles, sameArea = false, reference = realGrid) => {
    const tileCount = reference.flat().reduce((a, b) => a + b, 0);
    const model = sameArea ? topTiles(probability, tileCount) : threshold(probability, MODEL_THRESHOLD);
    const metrics = compareGrids(model, reference);
    return { name, ...metrics, meanBurnedHa: meanTiles === null ? null : round(meanTiles * tileHa, 1) };
  };

  const withWind = burnProbability(level, { seeds, startAt: () => start, wind: windForLevel(level) });
  const noWind = burnProbability(level, { seeds, startAt: () => start, wind: calmWind(level) });
  const circle = circleGrid(start, real.realTilesInMap, village.width, village.height);
  const main = [
    row('Model, real wind (hourly ERA5)', withWind.probability, withWind.meanTiles),
    row('Baseline A: model, no wind', noWind.probability, noWind.meanTiles),
    row('Baseline B: circle, same area', circle, real.realTilesInMap),
    // A mesma comparação, mas com a área certa (os N quadrados mais prováveis): só conta a forma.
    row('Model, real wind, same area (top N)', withWind.probability, withWind.meanTiles, true),
    row('Baseline A: no wind, same area (top N)', noWind.probability, noWind.meanTiles, true),
  ];

  // Secundária: como o jogo joga, o fogo começa num dos "?" (a semente escolhe).
  const game = burnProbability(level, { seeds, startAt: (seed, v) => resolveIgnition(v, level, seed), wind: windForLevel(level) });
  const perSpot = [];
  for (const spot of Object.keys(game.starts)) {
    const [x, y] = spot.split(',').map(Number);
    const spotSeeds = seeds.filter((seed) => { const s = resolveIgnition(village, level, seed); return s.x === x && s.y === y; });
    const p = burnProbability(level, { seeds: spotSeeds, startAt: () => ({ x, y }), wind: windForLevel(level) });
    perSpot.push({ ...row(`? spot at (${x}, ${y}), ${spotSeeds.length} nights`, p.probability, p.meanTiles), x, y, nights: spotSeeds.length });
  }
  perSpot.sort((a, b) => a.y - b.y || a.x - b.x);
  const secondary = [row('Game: all ? spots (as the game plays)', game.probability, game.meanTiles), ...perSpot];

  // Verificação cruzada: o mesmo modelo contra o perímetro do EFFIS (satélite MODIS, mais grosseiro).
  // Não substitui o ICNF (o mapa oficial); mostra quanto os "dois mapas verdadeiros" diferem entre si.
  const effis = real.crossCheck?.burned;
  const crossCheck = !effis ? [] : [
    row('Model, real wind vs EFFIS', withWind.probability, withWind.meanTiles, false, effis),
    row('Baseline A: no wind vs EFFIS', noWind.probability, noWind.meanTiles, false, effis),
    row('Baseline B: circle (EFFIS area) vs EFFIS', circleGrid(start, real.crossCheck.tilesInMap, village.width, village.height), real.crossCheck.tilesInMap, false, effis),
    { name: 'ICNF map vs EFFIS map (two real maps)', ...compareGrids(realGrid, effis), meanBurnedHa: real.realBurnedHaInMap },
  ];

  return {
    nights,
    seeds: `${firstSeed}-${firstSeed + nights - 1}`,
    modelThreshold: MODEL_THRESHOLD,
    realIgnition: { ...REAL_IGNITION, tile: { x: round(point.x, 2), y: round(point.y, 2) } },
    startTile: start,
    // Quanto tempo o fogo do modelo dura (o verdadeiro foi dominado às 10:45, ~12 horas depois).
    meanFireHoursRealWind: round(withWind.meanHours, 1),
    realTilesInMap: real.realTilesInMap,
    realBurnedHaInMap: real.realBurnedHaInMap,
    main,
    secondary,
    crossCheck,
    probability: withWind.probability.map((r) => r.map((p) => round(p, 3))),
  };
}

// JSON fácil de ler: as percentagens com 4 casas e cada linha de uma grelha numa só linha.
const METRIC_KEYS = ['hitRate', 'falseAlarm', 'jaccard', 'sorensen'];
function toJson(data) {
  const text = JSON.stringify(data, (key, value) => (METRIC_KEYS.includes(key) && value !== null ? round(value, 4) : value), 1);
  // Uma lista só de números (ex.: uma linha da grelha) fica numa linha: [0,0.5,1,...]
  return text.replace(/\[\s*(-?[\d.]+(?:,\s*-?[\d.]+)*)\s*\]/g, (match, inner) => `[${inner.replace(/\s+/g, '')}]`) + '\n';
}

function round(value, digits) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

// ---------- A tabela no terminal ----------

function percent(value) {
  return value === null ? '   -  ' : `${(value * 100).toFixed(1).padStart(5)}%`;
}

export function formatTable(title, rows) {
  const lines = [title, `${'Run'.padEnd(42)} model tiles  hit rate  false alarms  Jaccard  Sorensen  mean burned`];
  for (const r of rows) {
    lines.push(`${r.name.padEnd(42)} ${String(r.modelTiles).padStart(11)}  ${percent(r.hitRate)}  ${percent(r.falseAlarm).padStart(12)}  `
      + `${(r.jaccard ?? 0).toFixed(2).padStart(7)}  ${(r.sorensen ?? 0).toFixed(2).padStart(8)}  ${r.meanBurnedHa === null ? '-' : `${r.meanBurnedHa} ha`}`);
  }
  return lines.join('\n');
}

// Desenha uma grelha em texto: '#' = os dois arderam, 'M' = só o modelo, 'R' = só a realidade.
export function overlapMap(model, real) {
  return real.map((row, y) => row.map((r, x) => (model[y][x] && r ? '#' : model[y][x] ? 'M' : r ? 'R' : '.')).join('')).join('\n');
}

// ---------- 4) Fazer a grelha da área ardida a partir do perímetro descarregado ----------

// A origem dos dados (fica escrita no ficheiro, com a atribuição).
const SOURCE = {
  source: 'ICNF (Instituto da Conservacao da Natureza e das Florestas, Portugal): national burned-area cartography, layer "Territorios ardidos (area ardida ano 2018)" (BDG:ardida_2018)',
  url: 'https://si.icnf.pt/wfs/areas_ardidas?service=WFS&version=2.0.0&request=GetFeature&typeNames=BDG:ardida_2018&outputFormat=application/json&srsName=EPSG:4326&bbox=38.70,-9.55,38.82,-9.35,urn:ogc:def:crs:EPSG::4326',
  catalogue: 'https://dados.gov.pt/en/datasets/areas-ardidas-desde-1975',
  licence: 'Open public WFS of ICNF. The service metadata says fees: none ("sem restricoes") and access constraints: none ("Nenhum"); the dados.gov.pt entry leaves the licence unspecified. We keep only this derived 32x32 grid (not the original polygon) and credit ICNF.',
  attribution: 'Burned area: ICNF, Cartografia nacional de areas ardidas 2018 (fire RO2182659), https://si.icnf.pt/wfs/areas_ardidas',
};

// Lê o perímetro descarregado (GeoJSON) e escreve data/validation/sintra-2018-burned.json.
function rasterizeCommand(icnfPath, effisPath) {
  const level = JSON.parse(readFileSync(LEVEL_URL, 'utf8'));
  const bbox = level.mapSource.bbox;
  const icnf = JSON.parse(readFileSync(icnfPath, 'utf8'));
  // Só o incêndio de Sintra (Cod_SGIF RO2182659): o pedido usou uma caixa maior do que o mapa.
  const fire = icnf.features.find((f) => f.properties.Cod_SGIF === 'RO2182659');
  if (!fire) throw new Error('The ICNF file does not contain fire RO2182659 (Sintra, 6 Oct 2018)');
  const polygons = polygonsOf(fire);
  const fractions = rasterizePolygons(polygons, bbox);
  const burned = threshold(fractions, REAL_THRESHOLD);
  const tileHa = (level.mapSource.tileSizeM ** 2) / 10000;
  const totalHa = polygonAreaHa(polygons);
  const insideHa = fractions.flat().reduce((a, b) => a + b, 0) * tileHa;
  const p = fire.properties;

  const out = {
    ...SOURCE,
    retrieved: '2026-11-23',
    fire: {
      id: p.Cod_SGIF, start: p.DH_Inicio, end: p.DH_Fim, place: p.PI_Local, parish: p.PI_Freg, municipality: p.PI_Conc,
      officialAreaHa: round(p.AreaHaSIG, 1), scrubHa: round(p.AreaHaMato, 1), forestHa: round(p.AreaHaPov, 1), farmHa: round(p.AreaHaAgri, 1),
      cause: p.Causa_Tipo,
    },
    method: 'The ICNF polygon (EPSG:4326) is laid over the game map bbox (data/levels/sintra.json mapSource.bbox), cut into 32x32 tiles '
      + '(x = east, y = south, row 0 = north, 65 m tiles). In each tile 16x16 = 256 points are tested (inside the outer ring and not in a hole); '
      + 'the share of points inside is the burned fraction. A tile counts as really burned if the fraction is at least 0.5.',
    bbox,
    tileSizeM: level.mapSource.tileSizeM,
    polygonAreaHa: round(totalHa, 1),
    realBurnedHaInMap: round(insideHa, 1),
    realTilesInMap: burned.flat().reduce((a, b) => a + b, 0),
    outsideMapHa: round(totalHa - insideHa, 1),
    outsideMapShare: round((totalHa - insideHa) / totalHa, 3),
    fractions,
    burned,
    burnedRows: burned.map((row) => row.map((v) => (v ? '#' : '.')).join('')),
  };

  // Verificação cruzada (opcional): o perímetro do EFFIS (satélite MODIS, 250 m, mais grosseiro).
  if (effisPath) {
    const effis = JSON.parse(readFileSync(effisPath, 'utf8'));
    const feature = effis.features.find((f) => f.properties.FIREDATE?.startsWith('2018-10-0'));
    const ep = polygonsOf(feature);
    const ef = rasterizePolygons(ep, bbox);
    const eb = threshold(ef, REAL_THRESHOLD);
    out.crossCheck = {
      source: 'EFFIS (European Forest Fire Information System, Copernicus) MODIS burnt areas 2018, layer modis.ba.poly.2018, id ' + feature.properties.id,
      url: 'https://maps.effis.emergency.copernicus.eu/effis?service=WFS&request=GetCapabilities&version=1.1.0',
      licence: 'CC BY 4.0 (EFFIS data licence: https://forest-fire.emergency.copernicus.eu/about-effis/data-license). Changed: cut into the 32x32 game grid.',
      attribution: '(c) European Union, 1995-2026, EFFIS (European Forest Fire Information System), Copernicus Emergency Management Service / JRC',
      areaHa: round(polygonAreaHa(ep), 1),
      officialAreaHa: Number(feature.properties.AREA_HA),
      burnedHaInMap: round(ef.flat().reduce((a, b) => a + b, 0) * tileHa, 1),
      tilesInMap: eb.flat().reduce((a, b) => a + b, 0),
      agreementWithIcnf: compareGrids(eb, burned),
      burned: eb,
    };
  }

  writeFileSync(BURNED_URL, toJson(out));
  console.log(`ICNF polygon: ${out.polygonAreaHa} ha (official ${out.fire.officialAreaHa} ha)`);
  console.log(`Inside the map: ${out.realBurnedHaInMap} ha, ${out.realTilesInMap} tiles; outside the map: ${out.outsideMapHa} ha (${Math.round(out.outsideMapShare * 100)}%)`);
  console.log(out.burnedRows.join('\n'));
  if (out.crossCheck) {
    const { areaHa, burnedHaInMap, tilesInMap } = out.crossCheck;
    console.log(`EFFIS cross-check: ${areaHa} ha in total, ${burnedHaInMap} ha = ${tilesInMap} tiles inside the map`);
  }
}

// ---------- Correr a partir da linha de comandos ----------

function main(args) {
  const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--rasterize')) return rasterizeCommand(option('--rasterize'), option('--effis'));

  const nights = Number(option('--nights')) || 1000;
  const level = JSON.parse(readFileSync(LEVEL_URL, 'utf8'));
  const real = JSON.parse(readFileSync(BURNED_URL, 'utf8'));
  const started = Date.now();
  const results = runValidation(level, real, { nights });

  console.log(`Real fire (ICNF): ${real.polygonAreaHa} ha in total; inside the 2.1 km map: ${real.realBurnedHaInMap} ha = ${real.realTilesInMap} tiles; `
    + `${Math.round(real.outsideMapShare * 100)}% of the real fire is outside the map.`);
  console.log(`Real start: Fonte da Peninha, tile (${results.realIgnition.tile.x}, ${results.realIgnition.tile.y}) = outside the map; `
    + `the model starts at the nearest burnable tile (${results.startTile.x}, ${results.startTile.y}).`);
  console.log(`${nights} nights (seeds ${results.seeds}), no player actions. A tile is "model-burned" if it burned in at least ${MODEL_THRESHOLD * 100}% of nights.`);
  console.log(`With the real wind, the model fire burns out on its own after ${results.meanFireHoursRealWind} hours on average (the real one was controlled after ~12 hours).\n`);
  console.log(formatTable('MAIN: start at the real ignition point', results.main));
  console.log('');
  console.log(formatTable('SECONDARY: start at the game\'s ? spots', results.secondary));
  if (results.crossCheck.length > 0) {
    console.log('');
    console.log(formatTable(`CROSS-CHECK: against the coarser EFFIS (MODIS) perimeter, ${real.crossCheck.tilesInMap} tiles in the map`, results.crossCheck));
  }
  console.log('\nOverlap map (model with real wind vs reality): # both, M model only, R reality only');
  console.log(overlapMap(threshold(results.probability, MODEL_THRESHOLD), real.burned));

  const { probability, ...summary } = results;
  writeFileSync(RESULTS_URL, toJson({ generated: 'npm run validate', ...summary, probabilityRealWind: probability }));
  console.log(`\nWrote data/validation/sintra-2018-results.json (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}

// Só corre o main quando o ficheiro é chamado diretamente (não quando um teste o importa).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
