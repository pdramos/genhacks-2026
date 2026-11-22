// Testes da "semente" de cada jogo e do "Try again (same night)" (src/render/runState.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSeed, planFromChanges, saveRetry, loadRetry } from '../src/render/runState.js';

test('newSeed gives a whole number between 1 and 2147483646', () => {
  assert.equal(newSeed(() => 0), 1);
  assert.equal(newSeed(() => 0.9999999999), 2147483646);
  const seed = newSeed(() => 0.5);
  assert.ok(Number.isInteger(seed));
});

test('two new games almost never get the same seed', () => {
  const seeds = new Set(Array.from({ length: 50 }, () => newSeed()));
  assert.ok(seeds.size > 45);
});

test('planFromChanges turns the build changes into a list of actions, top row first', () => {
  const changes = {
    '3,2': { actionName: 'firebreak', originalType: 'grass' },
    '1,0': { actionName: 'clearBrush', originalType: 'brush' },
    '0,2': { actionName: 'replaceTrees', originalType: 'eucalyptus' },
  };
  assert.deepEqual(planFromChanges(changes), [
    { x: 1, y: 0, actionName: 'clearBrush' },
    { x: 0, y: 2, actionName: 'replaceTrees' },
    { x: 3, y: 2, actionName: 'firebreak' },
  ]);
});

test('a saved retry comes back with the same seed and plan for the same level', () => {
  const plan = [{ x: 1, y: 0, actionName: 'clearBrush' }];
  const text = saveRetry('sintra', 1234, plan);
  assert.deepEqual(loadRetry(text, 'sintra'), { seed: 1234, plan });
});

test('a retry saved for another level is ignored', () => {
  assert.equal(loadRetry(saveRetry('demo', 1, []), 'sintra'), null);
});

test('missing or broken retry text gives null instead of crashing', () => {
  assert.equal(loadRetry(null, 'sintra'), null);
  assert.equal(loadRetry('not json', 'sintra'), null);
  assert.equal(loadRetry('{"level":"sintra","seed":"abc","plan":[]}', 'sintra'), null);
});
