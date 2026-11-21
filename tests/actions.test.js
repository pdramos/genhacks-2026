// Testes da fase de construção: orçamento e ações defensivas.
// Só usam a "porta da frente" do módulo (createBuildState, applyAction, undoAction, remainingBudget).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage, tileAt } from '../src/sim/village.js';
import { createBuildState, applyAction, remainingBudget } from '../src/sim/actions.js';

// Uma vila pequena (5x2) com um quadrado de cada tipo:
//   x:  0      1      2           3          4
//   y=0 grass  brush  eucalyptus  broadleaf  house
//   y=1 school road   water       cleared    firebreak
function smallVillage() {
  return createVillage({ name: 'Small', map: ['GBEOH', 'SRWCF'] });
}

test('clearBrush turns brush into cleared and costs 200', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  const result = applyAction(state, 1, 0, 'clearBrush');
  assert.deepEqual(result, { ok: true, newType: 'cleared' });
  assert.equal(tileAt(village, 1, 0), 'cleared');
  assert.equal(remainingBudget(state), 800);
});

test('firebreak turns grass into firebreak and costs 500', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  const result = applyAction(state, 0, 0, 'firebreak');
  assert.deepEqual(result, { ok: true, newType: 'firebreak' });
  assert.equal(tileAt(village, 0, 0), 'firebreak');
  assert.equal(remainingBudget(state), 500);
});

test('replaceTrees turns eucalyptus into broadleaf and costs 800', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  const result = applyAction(state, 2, 0, 'replaceTrees');
  assert.deepEqual(result, { ok: true, newType: 'broadleaf' });
  assert.equal(tileAt(village, 2, 0), 'broadleaf');
  assert.equal(remainingBudget(state), 200);
});

test('an action that costs more than the budget is blocked and nothing changes', () => {
  const village = smallVillage();
  const state = createBuildState(village, 700);
  const result = applyAction(state, 2, 0, 'replaceTrees'); // custa 800, só há 700
  assert.deepEqual(result, { ok: false, reason: 'not-enough-money' });
  assert.equal(tileAt(village, 2, 0), 'eucalyptus');
  assert.equal(remainingBudget(state), 700);
});

test('a firebreak cannot be built on a house, school, road or water', () => {
  const village = smallVillage();
  const state = createBuildState(village, 10000);
  const targets = [[4, 0, 'house'], [0, 1, 'school'], [1, 1, 'road'], [2, 1, 'water']];
  for (const [x, y, type] of targets) {
    assert.deepEqual(applyAction(state, x, y, 'firebreak'), { ok: false, reason: 'invalid-target' }, type);
    assert.equal(tileAt(village, x, y), type);
  }
  assert.equal(remainingBudget(state), 10000);
});

test('clearBrush only works on brush and replaceTrees only on eucalyptus', () => {
  const village = smallVillage();
  const state = createBuildState(village, 10000);
  assert.deepEqual(applyAction(state, 0, 0, 'clearBrush'), { ok: false, reason: 'invalid-target' }); // grass
  assert.deepEqual(applyAction(state, 3, 0, 'replaceTrees'), { ok: false, reason: 'invalid-target' }); // broadleaf
  assert.deepEqual(applyAction(state, 4, 0, 'replaceTrees'), { ok: false, reason: 'invalid-target' }); // house
  assert.equal(tileAt(village, 0, 0), 'grass');
  assert.equal(tileAt(village, 3, 0), 'broadleaf');
  assert.equal(remainingBudget(state), 10000);
});
