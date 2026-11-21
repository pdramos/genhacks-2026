// Testes do caminho do carro na cena do cigarro (src/render/roadPath.js).
// O caminho é só uma lista de quadrados de estrada, por isso testa-se sem Three.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage } from '../src/sim/village.js';
import { findRoadPath } from '../src/render/roadPath.js';

// Cria uma vila pequena a partir de linhas de letras (G relva, B mato, R estrada...).
function village(rows) {
  return createVillage({ name: 'Test', map: rows });
}

test('a horizontal road under the ignition gives a path along that road', () => {
  const v = village([
    'GGGGG',
    'GGBGG', // ignição no mato em (2,1)
    'RRRRR',
    'GGGGG',
  ]);
  const path = findRoadPath(v, { x: 2, y: 1 });
  assert.equal(path.tiles.length, 5);
  for (const t of path.tiles) assert.equal(t.y, 2);
  // O quadrado onde o cigarro é atirado é a estrada colada à ignição.
  assert.deepEqual(path.tiles[path.dropIndex], { x: 2, y: 2 });
});

test('the car drives so that the ignition is on its left (the driver window)', () => {
  // Estrada a sul da ignição: para a ignição (norte) ficar à esquerda, o carro vai para LESTE.
  const below = findRoadPath(village(['GGGGG', 'GGBGG', 'RRRRR']), { x: 2, y: 1 });
  assert.deepEqual(below.tiles.map((t) => t.x), [0, 1, 2, 3, 4]);
  // Estrada a norte da ignição: o carro vai para OESTE.
  const above = findRoadPath(village(['RRRRR', 'GGBGG', 'GGGGG']), { x: 2, y: 1 });
  assert.deepEqual(above.tiles.map((t) => t.x), [4, 3, 2, 1, 0]);
});

test('a vertical road beside the ignition gives a path going north or south', () => {
  const v = village([
    'GRG',
    'GRB', // ignição em (2,1), a leste da estrada
    'GRG',
    'GRG',
  ]);
  const path = findRoadPath(v, { x: 2, y: 1 });
  // Ignição a leste: o carro vai para SUL (a esquerda de quem vai para sul é leste).
  assert.deepEqual(path.tiles.map((t) => t.y), [0, 1, 2, 3]);
  for (const t of path.tiles) assert.equal(t.x, 1);
  assert.deepEqual(path.tiles[path.dropIndex], { x: 1, y: 1 });
});

test('the path stops where the straight road ends', () => {
  const v = village([
    'GGGGGG',
    'GGBGGG',
    'GRRRGG', // a estrada só vai de x=1 a x=3
    'GGGGGG',
  ]);
  const path = findRoadPath(v, { x: 2, y: 1 });
  assert.deepEqual(path.tiles.map((t) => t.x), [1, 2, 3]);
});

test('a long road is cut to a few tiles on each side of the ignition', () => {
  const row = 'R'.repeat(20);
  const v = village(['G'.repeat(20), 'G'.repeat(10) + 'B' + 'G'.repeat(9), row]);
  const path = findRoadPath(v, { x: 10, y: 1 }, { maxReach: 3 });
  assert.equal(path.tiles.length, 7);
  assert.equal(path.dropIndex, 3);
  assert.deepEqual(path.tiles[3], { x: 10, y: 2 });
});

test('a road that only touches the ignition end-on is followed along its own direction', () => {
  // A estrada vem de sul e acaba mesmo por baixo da ignição.
  const v = village([
    'GBG',
    'GRG',
    'GRG',
    'GRG',
  ]);
  const path = findRoadPath(v, { x: 1, y: 0 });
  assert.equal(path.tiles.length, 3);
  for (const t of path.tiles) assert.equal(t.x, 1);
});

test('a road one tile away (diagonal) is still found', () => {
  const v = village([
    'GGGG',
    'BGGG', // ignição em (0,1); a estrada mais perto está na diagonal
    'GRRR',
  ]);
  const path = findRoadPath(v, { x: 0, y: 1 });
  assert.ok(path);
  assert.deepEqual(path.tiles[path.dropIndex], { x: 1, y: 2 });
});

test('returns null when there is no road near the ignition', () => {
  const v = village(['GGGGG', 'GGBGG', 'GGGGG', 'GGGGG', 'GGGGR']);
  assert.equal(findRoadPath(v, { x: 0, y: 0 }), null);
});
