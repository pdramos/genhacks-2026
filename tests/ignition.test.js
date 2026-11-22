// Testes da ignição escondida: o cigarro cai num de vários quadrados possíveis,
// escolhido pela semente do jogo. Só usam a "porta da frente": pickIgnition(level, seed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickIgnition } from '../src/sim/ignition.js';

// Um nível com 4 candidatos (quadrados de mato colados a estradas).
const CANDIDATES = [{ x: 1, y: 0 }, { x: 5, y: 2 }, { x: 3, y: 7 }, { x: 8, y: 4 }];
const level = { name: 'Test', ignition: { x: 1, y: 0 }, ignitionCandidates: CANDIDATES };

test('the same seed always picks the same ignition', () => {
  for (let seed = 1; seed <= 30; seed++) {
    assert.deepEqual(pickIgnition(level, seed), pickIgnition(level, seed), `seed ${seed}`);
  }
});

test('the ignition is always one of the level candidates', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { x, y } = pickIgnition(level, seed);
    assert.ok(CANDIDATES.some((c) => c.x === x && c.y === y), `seed ${seed} picked ${x},${y}`);
  }
});

test('over seeds 1-30, every candidate gets picked at least once', () => {
  // Se escolhesse sempre o mesmo, o jogador aprendia onde o fogo começa.
  const picked = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const { x, y } = pickIgnition(level, seed);
    picked.add(`${x},${y}`);
  }
  assert.equal(picked.size, CANDIDATES.length);
});

test('without candidates, the level ignition is used', () => {
  const oldLevel = { name: 'Old', ignition: { x: 6, y: 2 } };
  assert.deepEqual(pickIgnition(oldLevel, 1), { x: 6, y: 2 });
  assert.deepEqual(pickIgnition({ ...oldLevel, ignitionCandidates: [] }, 5), { x: 6, y: 2 });
});

test('changing the picked ignition does not change the level', () => {
  const picked = pickIgnition(level, 3);
  picked.x = 99;
  assert.ok(CANDIDATES.every((c) => c.x !== 99));
});

// ---------- resolveIgnition: o cigarro cai sempre em algo que arde ----------
// Bug encontrado na revisão: um corta-fogo no quadrado do candidato impedia o fogo de começar
// (3 estrelas por €3.390). Agora, se o candidato não arde, o fogo começa no primeiro vizinho
// que arde, numa ordem fixa (a mesma semente continua a dar sempre o mesmo fogo).
import { createVillage } from '../src/sim/village.js';
import { resolveIgnition, canIgnite } from '../src/sim/ignition.js';

// Uma serra pequena 5x5 com uma estrada no meio (x=2) e mato dos dois lados.
const SERRA = { name: 'Serra', map: ['BBRBB', 'BBRBB', 'BBRBB', 'BBRBB', 'BBRBB'] };
const serraLevel = { ...SERRA, ignition: { x: 1, y: 2 }, ignitionCandidates: [{ x: 1, y: 2 }] };

test('resolveIgnition keeps the picked candidate when it can burn', () => {
  const village = createVillage(SERRA);
  assert.deepEqual(resolveIgnition(village, serraLevel, 4), { x: 1, y: 2 });
});

test('a firebreak on the candidate moves the ignition to a burnable neighbour', () => {
  const village = createVillage(SERRA);
  village.tiles[2][1] = 'firebreak';
  const spot = resolveIgnition(village, serraLevel, 4);
  assert.ok(canIgnite(village, spot.x, spot.y), `${spot.x},${spot.y} must burn`);
  assert.ok(Math.abs(spot.x - 1) <= 1 && Math.abs(spot.y - 2) <= 1, 'one of the 8 neighbours');
});

test('the moved ignition is the same every time (deterministic)', () => {
  const village = createVillage(SERRA);
  village.tiles[2][1] = 'firebreak';
  village.tiles[1][1] = 'firebreak';
  assert.deepEqual(resolveIgnition(village, serraLevel, 9), resolveIgnition(village, serraLevel, 9));
});

test('a ring of firebreaks pushes the ignition further out (it never just disappears)', () => {
  const village = createVillage(SERRA);
  // Corta-fogo no candidato e em todos os vizinhos que ardiam (a estrada já não arde).
  for (const [x, y] of [[1, 2], [0, 1], [1, 1], [0, 2], [0, 3], [1, 3]]) village.tiles[y][x] = 'firebreak';
  const spot = resolveIgnition(village, serraLevel, 2);
  assert.ok(canIgnite(village, spot.x, spot.y), `${spot.x},${spot.y} must burn`);
});

test('with nothing burnable nearby, the candidate is kept (the fire simply does not start)', () => {
  const village = createVillage({ name: 'Wet', map: ['WWWWW', 'WWWWW', 'WWRWW', 'WWWWW', 'WWWWW'] });
  const level = { name: 'Wet', ignition: { x: 2, y: 2 } };
  assert.deepEqual(resolveIgnition(village, level, 1), { x: 2, y: 2 });
});
