import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../src/sim/random.js';

test('the same seed always gives the same sequence', () => {
  const a = createRandom(7), b = createRandom(7);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test('different seeds give different sequences', () => {
  const a = createRandom(1), b = createRandom(2);
  assert.notEqual(a(), b());
});

test('numbers are between 0 (included) and 1 (excluded)', () => {
  const r = createRandom(123);
  for (let i = 0; i < 1000; i++) {
    const n = r();
    assert.ok(n >= 0 && n < 1, `out of range: ${n}`);
  }
});
