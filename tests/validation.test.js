// VALIDAÇÃO: o fogo do modelo comparado com a área que ardeu MESMO em 2018 (dados do ICNF).
// O relatório completo corre com "npm run validate" (1000 noites, ~15 s). Aqui só verificamos,
// depressa, que os dados e as contas estão certos (ver dev/validate.js e docs/validation.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compareGrids, rasterizePolygons, polygonAreaHa, threshold, topTiles, circleGrid,
  lonLatToTile, findStartTile, runValidation, REAL_IGNITION, REAL_THRESHOLD,
} from '../dev/validate.js';
import { createVillage } from '../src/sim/village.js';

const level = JSON.parse(readFileSync(new URL('../data/levels/sintra.json', import.meta.url), 'utf8'));
const real = JSON.parse(readFileSync(new URL('../data/validation/sintra-2018-burned.json', import.meta.url), 'utf8'));
const results = JSON.parse(readFileSync(new URL('../data/validation/sintra-2018-results.json', import.meta.url), 'utf8'));

// ---------- A grelha da área ardida verdadeira ----------

test('a grelha real tem 32x32 quadrados, frações de 0 a 1, e o 0/1 vem do limite de 50%', () => {
  assert.equal(real.fractions.length, 32);
  assert.equal(real.burned.length, 32);
  for (let y = 0; y < 32; y++) {
    assert.equal(real.fractions[y].length, 32);
    for (let x = 0; x < 32; x++) {
      const f = real.fractions[y][x];
      assert.ok(f >= 0 && f <= 1, `fraction ${f} at (${x}, ${y})`);
      assert.equal(real.burned[y][x], f >= REAL_THRESHOLD ? 1 : 0);
    }
  }
  assert.equal(real.realTilesInMap, real.burned.flat().reduce((a, b) => a + b, 0));
});

test('a área real é plausível: o polígono dá a área oficial e cabe uma parte no mapa', () => {
  console.log(`  real fire: ${real.polygonAreaHa} ha (official ${real.fire.officialAreaHa} ha); inside the map ${real.realBurnedHaInMap} ha, `
    + `${real.realTilesInMap} tiles; outside ${real.outsideMapHa} ha`);
  // A nossa conta da área do polígono bate com a do ICNF (menos de 1% de diferença).
  assert.ok(Math.abs(real.polygonAreaHa - real.fire.officialAreaHa) / real.fire.officialAreaHa < 0.01);
  // O mapa tem 32 x 32 quadrados de 0,4225 ha = 432,6 ha: a parte de dentro tem de caber.
  assert.ok(real.realBurnedHaInMap > 20 && real.realBurnedHaInMap < 432.6);
  assert.ok(Math.abs(real.realBurnedHaInMap + real.outsideMapHa - real.polygonAreaHa) < 0.2);
  // Tem a origem e a atribuição escritas.
  assert.match(real.attribution, /ICNF/);
  assert.match(real.url, /^https:\/\/si\.icnf\.pt\//);
});

// ---------- Do polígono para a grelha ----------

test('rasterizePolygons: um retângulo que tapa a metade de oeste dá 1 nessa metade e 0 na outra', () => {
  const bbox = { south: 0, west: 0, north: 2, east: 2 };
  const halfWest = [[[[0, 0], [1, 0], [1, 2], [0, 2], [0, 0]]]];
  assert.deepEqual(rasterizePolygons(halfWest, bbox, 2, 8), [[1, 0], [1, 0]]);
  // Com um buraco no quadrado de cima à esquerda (linha 0 = norte), esse quadrado fica a 0.
  const withHole = [[[[0, 0], [1, 0], [1, 2], [0, 2], [0, 0]], [[0, 1], [1, 1], [1, 2], [0, 2], [0, 1]]]];
  assert.deepEqual(rasterizePolygons(withHole, bbox, 2, 8), [[0, 0], [1, 0]]);
});

test('polygonAreaHa: um quadrado de 0,01 graus perto de Sintra tem cerca de 96 ha', () => {
  const square = [[[[-9.46, 38.75], [-9.45, 38.75], [-9.45, 38.76], [-9.46, 38.76], [-9.46, 38.75]]]];
  // 0,01 grau de latitude ~ 1110 m e de longitude ~ 868 m: 1110 x 868 m ~ 96 ha.
  assert.ok(Math.abs(polygonAreaHa(square) - 96.4) < 1, `got ${polygonAreaHa(square)}`);
});

// ---------- As contas da comparação ----------

test('compareGrids: acertos, falsos alarmes, Jaccard e Sorensen numa grelha feita à mão', () => {
  const model = [
    [1, 1, 0],
    [1, 0, 0],
    [0, 0, 0],
  ];
  const reality = [
    [1, 0, 0],
    [1, 1, 0],
    [0, 0, 0],
  ];
  const m = compareGrids(model, reality);
  // Em comum: 2. Só o modelo: 1. Só a realidade: 1.
  assert.equal(m.both, 2);
  assert.equal(m.hitRate, 2 / 3);
  assert.equal(m.falseAlarm, 1 / 3);
  assert.equal(m.jaccard, 2 / 4);
  assert.equal(m.sorensen, 4 / 6);
});

test('compareGrids: igual = tudo certo; nada em comum = 0; modelo vazio = sem falsos alarmes (null)', () => {
  const g = [[1, 0], [0, 1]];
  assert.deepEqual(compareGrids(g, g), { realTiles: 2, modelTiles: 2, both: 2, hitRate: 1, falseAlarm: 0, jaccard: 1, sorensen: 1 });
  const other = [[0, 1], [1, 0]];
  assert.equal(compareGrids(other, g).sorensen, 0);
  const empty = [[0, 0], [0, 0]];
  assert.equal(compareGrids(empty, g).hitRate, 0);
  assert.equal(compareGrids(empty, g).falseAlarm, null);
});

test('threshold, topTiles e circleGrid em grelhas pequenas', () => {
  const p = [[0.9, 0.5], [0.2, 0]];
  assert.deepEqual(threshold(p, 0.5), [[1, 1], [0, 0]]);
  assert.deepEqual(topTiles(p, 3), [[1, 1], [1, 0]]); // o 0 nunca ardeu: não entra
  assert.deepEqual(topTiles(p, 4), [[1, 1], [1, 0]]);
  // O "círculo" de 3 quadrados à volta do canto (0, 0): ele e os 2 vizinhos de lado.
  assert.deepEqual(circleGrid({ x: 0, y: 0 }, 3, 3, 3), [[1, 1, 0], [1, 0, 0], [0, 0, 0]]);
});

// ---------- Onde começa o fogo verdadeiro ----------

test('a Fonte da Peninha fica a norte do mapa; o fogo começa no mato mais perto, na linha de cima', () => {
  const village = createVillage(level);
  const point = lonLatToTile(REAL_IGNITION.lon, REAL_IGNITION.lat, level.mapSource.bbox);
  assert.ok(point.y < 0, 'outside the map, to the north');
  assert.ok(point.x > 2 && point.x < 3);
  const start = findStartTile(village, point);
  assert.deepEqual(start, { x: 2, y: 0 });
  assert.equal(village.tiles[0][2], 'brush');
});

// ---------- A validação corre sempre igual ----------

test('runValidation com 5 noites é determinista e rápida', () => {
  const started = Date.now();
  const a = runValidation(level, real, { nights: 5 });
  const b = runValidation(level, real, { nights: 5 });
  assert.deepEqual(a, b);
  assert.ok(Date.now() - started < 3000, 'keep the test fast');
  assert.equal(a.main.length, 5);
  for (const row of [...a.main, ...a.secondary]) {
    assert.equal(row.realTiles, real.realTilesInMap);
    for (const key of ['hitRate', 'jaccard', 'sorensen']) assert.ok(row[key] >= 0 && row[key] <= 1, `${row.name} ${key}`);
  }
  // O círculo tem exatamente a área real.
  assert.equal(a.main[2].modelTiles, real.realTilesInMap);
});

test('o ficheiro de resultados guardado bate com a grelha real atual', () => {
  assert.equal(results.realTilesInMap, real.realTilesInMap);
  assert.equal(results.nights, 1000);
  assert.equal(results.probabilityRealWind.length, 32);
  assert.deepEqual(results.startTile, { x: 2, y: 0 });
});
