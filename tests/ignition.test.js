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
