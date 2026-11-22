// Testes dos ficheiros de nível (data/levels/*.json).
// Cada nível tem de "construir" uma vila válida. Os níveis com história (todos menos o
// demo, que é só para desenvolvimento) também têm de cumprir o contrato de integração:
// relevo, ignição em mato/relva colada a uma estrada (é onde cai o cigarro), vento e orçamento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createVillage, tileAt } from '../src/sim/village.js';
import { runDisaster } from '../src/sim/fire.js';
import { findRoadPath } from '../src/render/roadPath.js'; // o caminho do carro (não usa Three.js)

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

// Os candidatos à ignição: os sítios onde o cigarro PODE cair (a simulação escolhe um pela semente).
// Um nível sem a lista só tem a ignição fixa.
function ignitionCandidates(level) {
  return level.ignitionCandidates ?? [level.ignition];
}

test('in every story level each ignition candidate is dry brush or grass right next to a road', async () => {
  for (const { file, level } of await storyLevels()) {
    const village = createVillage(level);
    for (const { x, y } of ignitionCandidates(level)) {
      const type = tileAt(village, x, y);
      assert.ok(['brush', 'grass'].includes(type), `${file}: candidate (${x},${y}) is ${type}`);
      const nextToRoad = sideNeighbours(village, x, y).some(([nx, ny]) => tileAt(village, nx, ny) === 'road');
      assert.ok(nextToRoad, `${file}: no road next to the candidate (${x},${y})`);
    }
  }
});

test('the Sintra level has at least 4 ignition candidates and "ignition" is the first one', async () => {
  const level = JSON.parse(await readFile(new URL('sintra.json', LEVELS_DIR), 'utf8'));
  assert.ok(Array.isArray(level.ignitionCandidates), 'no "ignitionCandidates"');
  assert.ok(level.ignitionCandidates.length >= 4, `only ${level.ignitionCandidates.length} candidates`);
  assert.deepEqual(level.ignition, level.ignitionCandidates[0]);
});

// A EN247 é a primeira linha (a contar do norte) em que pelo menos metade dos quadrados são estrada.
function en247Row(village) {
  return village.tiles.findIndex((row) => row.filter((type) => type === 'road').length >= village.width / 2);
}

// Dá um número a cada estrada da serra (só as linhas acima da EN247): quadrados de estrada
// ligados entre si (norte, sul, este, oeste) ficam com o mesmo número.
// Devolve um objeto "x,y" -> número da estrada.
function serraRoadNumbers(village, lastRow) {
  const numbers = {};
  let next = 0;
  for (let y = 0; y <= lastRow; y++) {
    for (let x = 0; x < village.width; x++) {
      if (tileAt(village, x, y) !== 'road' || numbers[`${x},${y}`] !== undefined) continue;
      // Uma estrada nova: pinta todos os quadrados ligados a este com o mesmo número.
      const todo = [[x, y]];
      numbers[`${x},${y}`] = next;
      while (todo.length > 0) {
        const [cx, cy] = todo.pop();
        for (const [nx, ny] of sideNeighbours(village, cx, cy)) {
          const isNew = ny <= lastRow && tileAt(village, nx, ny) === 'road' && numbers[`${nx},${ny}`] === undefined;
          if (isNew) { numbers[`${nx},${ny}`] = next; todo.push([nx, ny]); }
        }
      }
      next++;
    }
  }
  return numbers;
}

test('the Sintra candidates are beside at least 2 different serra roads, all north (upwind) of the town', async () => {
  const level = JSON.parse(await readFile(new URL('sintra.json', LEVELS_DIR), 'utf8'));
  const village = createVillage(level);
  const en247 = en247Row(village);
  assert.ok(en247 > 0, 'no EN247 (a road row across the map)');
  // A vila (o quartel) fica a sul da EN247.
  village.tiles.forEach((row, y) => row.forEach((type) => {
    if (type === 'school') assert.ok(y > en247, 'the fire station is north of the EN247');
  }));
  const numbers = serraRoadNumbers(village, en247 - 1);
  const roadsUsed = new Set();
  for (const { x, y } of level.ignitionCandidates) {
    // O vento é de norte: um candidato a norte da EN247 está a montante (upwind) da vila.
    assert.ok(y < en247, `candidate (${x},${y}) is not north of the EN247 (row ${en247})`);
    const roads = sideNeighbours(village, x, y)
      .map(([nx, ny]) => numbers[`${nx},${ny}`])
      .filter((n) => n !== undefined);
    assert.ok(roads.length > 0, `candidate (${x},${y}) is not beside a serra road`);
    roads.forEach((n) => roadsUsed.add(n));
  }
  assert.ok(roadsUsed.size >= 2, `the candidates are beside only ${roadsUsed.size} serra road(s)`);
});

test('in the Sintra level the cigarette car can drive past every candidate (3+ straight road tiles)', async () => {
  const level = JSON.parse(await readFile(new URL('sintra.json', LEVELS_DIR), 'utf8'));
  const village = createVillage(level);
  for (const candidate of level.ignitionCandidates) {
    const path = findRoadPath(village, candidate);
    assert.ok(path && path.tiles.length >= 3, `candidate (${candidate.x},${candidate.y}): road too short`);
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

test('without any defence, the fire from every candidate of every story level reaches the houses', async () => {
  for (const { file, level } of await storyLevels()) {
    const village = createVillage(level);
    for (const ignition of ignitionCandidates(level)) {
      // Experimenta 5 sementes: basta uma em que o fogo chegue às casas.
      const housesLost = [1, 2, 3, 4, 5].map((seed) => {
        const { outcome } = runDisaster(village, { ignition, wind: level.wind, seed });
        return outcome.housesTotal - outcome.housesSaved;
      });
      assert.ok(Math.max(...housesLost) > 0, `${file}: from (${ignition.x},${ignition.y}) the fire never reaches a house`);
    }
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
