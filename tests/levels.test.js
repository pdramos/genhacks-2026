// Testes dos ficheiros de nível (data/levels/*.json).
// Cada nível tem de "construir" uma vila válida. Os níveis com história (todos menos o
// demo, que é só para desenvolvimento) também têm de cumprir o contrato de integração:
// relevo, ignição em mato/relva colada a uma estrada (é onde cai o cigarro), vento e orçamento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createVillage, tileAt } from '../src/sim/village.js';
import { runDisaster } from '../src/sim/fire.js';

const LEVELS_DIR = new URL('../data/levels/', import.meta.url);
// O demo é anterior ao contrato (não tem relevo nem estrada junto à ignição).
const DEVELOPMENT_LEVELS = ['demo.json'];

// Lê todos os níveis da pasta: [{ file, level }, ...]
async function loadLevels() {
  const files = (await readdir(LEVELS_DIR)).filter((f) => f.endsWith('.json'));
  const levels = [];
  for (const file of files) {
    const text = await readFile(new URL(file, LEVELS_DIR), 'utf8');
    levels.push({ file, level: JSON.parse(text) });
  }
  return levels;
}

async function storyLevels() {
  return (await loadLevels()).filter(({ file }) => !DEVELOPMENT_LEVELS.includes(file));
}

// Os 4 vizinhos "de lado" (norte, sul, este, oeste) de um quadrado que existem na grelha.
function sideNeighbours(village, x, y) {
  return [[0, -1], [0, 1], [1, 0], [-1, 0]]
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < village.width && ny < village.height);
}

test('there is a Sintra level among the level files', async () => {
  const files = (await loadLevels()).map(({ file }) => file);
  assert.ok(files.includes('sintra.json'), `found only: ${files.join(', ')}`);
});

// O tamanho de cada nível: o demo fica pequeno (20x20); Sintra cresceu para 32x32 (ticket #13).
const LEVEL_SIZES = { 'demo.json': 20, 'sintra.json': 32 };

test('the demo stays 20x20 and the Sintra level is 32x32', async () => {
  for (const { file, level } of await loadLevels()) {
    const size = LEVEL_SIZES[file];
    assert.ok(size, `${file}: add its size to LEVEL_SIZES`);
    const village = createVillage(level);
    assert.equal(village.width, size, `${file}: width`);
    assert.equal(village.height, size, `${file}: height`);
  }
});

test('every story level has heights (relief) for every row', async () => {
  for (const { file, level } of await storyLevels()) {
    assert.ok(Array.isArray(level.heights), `${file}: no "heights"`);
    const village = createVillage(level);
    assert.equal(village.heights.length, village.height, `${file}: heights rows`);
    const all = village.heights.flat();
    assert.ok(Math.max(...all) > Math.min(...all), `${file}: the terrain is flat`);
  }
});

test('in every story level the fire starts on dry brush or grass right next to a road', async () => {
  for (const { file, level } of await storyLevels()) {
    const village = createVillage(level);
    const { x, y } = level.ignition;
    const type = tileAt(village, x, y);
    assert.ok(['brush', 'grass'].includes(type), `${file}: ignition (${x},${y}) is ${type}`);
    const nextToRoad = sideNeighbours(village, x, y).some(([nx, ny]) => tileAt(village, nx, ny) === 'road');
    assert.ok(nextToRoad, `${file}: no road next to the ignition (${x},${y})`);
  }
});

test('every story level has a wind (direction FROM in degrees, speed in km/h) and a budget', async () => {
  for (const { file, level } of await storyLevels()) {
    assert.ok(level.wind.direction >= 0 && level.wind.direction < 360, `${file}: wind direction`);
    assert.ok(level.wind.speed > 0, `${file}: wind speed`);
    assert.ok(level.budget > 0, `${file}: budget`);
    assert.ok(Array.isArray(level.sources) && level.sources.length > 0, `${file}: sources`);
  }
});

test('the landmark (school tile) of every story level is one 2x2 block', async () => {
  for (const { file, level } of await storyLevels()) {
    const village = createVillage(level);
    const cells = [];
    village.tiles.forEach((row, y) => row.forEach((type, x) => { if (type === 'school') cells.push([x, y]); }));
    assert.equal(cells.length, 4, `${file}: ${cells.length} school tiles`);
    const [x0, y0] = cells[0];
    const expected = [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]];
    assert.deepEqual(cells.sort(), expected.sort(), `${file}: school tiles are not a 2x2 square`);
  }
});

test('without any defence, the fire of every story level reaches the town', async () => {
  for (const { file, level } of await storyLevels()) {
    const village = createVillage(level);
    // Experimenta 5 sementes: basta uma em que o fogo chegue às casas.
    const housesLost = [1, 2, 3, 4, 5].map((seed) => {
      const { outcome } = runDisaster(village, { ignition: level.ignition, wind: level.wind, seed });
      return outcome.housesTotal - outcome.housesSaved;
    });
    assert.ok(Math.max(...housesLost) > 0, `${file}: the fire never reaches a house`);
  }
});

test('the Sintra level tells the real story: crest to the north, sea to the south-west, wind from the north', async () => {
  const level = JSON.parse(await readFile(new URL('sintra.json', LEVELS_DIR), 'utf8'));
  const village = createVillage(level);
  assert.equal(level.style, 'sintra');
  const bottom = village.height - 1; // a última linha (a sul)
  assert.ok(village.heights[0][4] >= 8, 'the Peninha crest is high');
  assert.equal(tileAt(village, 0, bottom), 'water', 'the Atlantic is at the south-west corner');
  assert.equal(village.heights[bottom][0], 0, 'the sea is at height 0');
  // vento de norte (entre 350° e 20°): o fogo desce a serra para sul
  assert.ok(level.wind.direction <= 20 || level.wind.direction >= 350);
  // a cena do cigarro é uma dramatização: a causa real nunca foi confirmada
  assert.match(level.ignitionNote, /never confirmed/);
});
