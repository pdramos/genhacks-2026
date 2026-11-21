import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countStars } from '../src/sim/stars.js';

// As regras do docs/design.md (5.6):
//   1 estrela  = salvar a escola (em Sintra, o quartel dos bombeiros);
//   2 estrelas = salvar também pelo menos 80% das casas;
//   3 estrelas = salvar todas as casas.
const outcome = (housesSaved, housesTotal, schoolSaved) => ({ housesSaved, housesTotal, schoolSaved });

test('losing the school gives 0 stars, even if every house is saved', () => {
  assert.equal(countStars(outcome(45, 45, false)), 0);
});

test('saving the school but less than 80% of the houses gives 1 star', () => {
  assert.equal(countStars(outcome(35, 45, true)), 1);
});

test('saving the school and at least 80% of the houses gives 2 stars', () => {
  assert.equal(countStars(outcome(36, 45, true)), 2); // 36/45 = 80%
  assert.equal(countStars(outcome(44, 45, true)), 2);
});

test('saving the school and every house gives 3 stars', () => {
  assert.equal(countStars(outcome(45, 45, true)), 3);
});

test('a village with no houses: saving the school is enough for 3 stars', () => {
  assert.equal(countStars(outcome(0, 0, true)), 3);
});
