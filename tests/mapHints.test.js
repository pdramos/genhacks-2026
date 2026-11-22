// Testes das ajudas do mapa (src/render/mapHints.js): onde se perderam casas (cartão do fim)
// e onde pôr os "?" dos sítios onde o cigarro pode cair (fase de construção).
// São só contas com quadrados (sem Three.js), por isso testam-se no Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage } from '../src/sim/village.js';
import { lostHouses, describeLostHouses, ignitionSpots } from '../src/render/mapHints.js';

// Uma vila 5x3: uma quinta isolada em cima (1,0) e duas casas em baixo (3,2) e (4,2).
function smallVillage() {
  return createVillage({ name: 'Test', map: ['BHBBB', 'RRRRR', 'GGGHH'] });
}
const PLACES = [
  { name: 'at the quinta in the forest', x0: 0, y0: 0, x1: 4, y1: 0 },
  { name: 'in the town', x0: 0, y0: 2, x1: 4, y1: 2 },
];

test('lostHouses lists only the houses that burned or are still burning', () => {
  const lastStep = { burned: [[1, 0], [0, 0]], burning: [[4, 2]] };
  assert.deepEqual(lostHouses(smallVillage(), lastStep), [[1, 0], [4, 2]]);
});

test('nothing lost gives no text', () => {
  assert.equal(describeLostHouses([], PLACES), '');
});

test('the text says how many houses were lost in each named place', () => {
  assert.equal(describeLostHouses([[1, 0]], PLACES), 'Houses lost: 1 at the quinta in the forest');
  assert.equal(
    describeLostHouses([[1, 0], [3, 2], [4, 2]], PLACES),
    'Houses lost: 1 at the quinta in the forest · 2 in the town',
  );
});

test('a house outside every named place still counts', () => {
  assert.equal(describeLostHouses([[1, 0]], []), 'Houses lost: 1');
  assert.equal(describeLostHouses([[1, 0], [9, 9]], PLACES), 'Houses lost: 1 at the quinta in the forest · 1 elsewhere');
});

test('ignitionSpots puts a "?" on every spot where the cigarette can fall (the real ones)', () => {
  const level = { ignitionCandidates: [{ x: 1, y: 1 }, { x: 4, y: 0 }] };
  assert.deepEqual(ignitionSpots(level), [{ x: 1, y: 1 }, { x: 4, y: 0 }]);
  // São cópias: mexer no resultado não estraga o nível.
  ignitionSpots(level)[0].x = 9;
  assert.equal(level.ignitionCandidates[0].x, 1);
});

test('with one spot or none there is no mystery, so no "?"', () => {
  assert.deepEqual(ignitionSpots({ ignitionCandidates: [{ x: 1, y: 1 }] }), []);
  assert.deepEqual(ignitionSpots({ ignition: { x: 1, y: 1 } }), []);
});
