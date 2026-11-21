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
