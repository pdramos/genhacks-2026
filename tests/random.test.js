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

// ---------- tileRandom: os "dados por quadrado" do fogo ----------
import { tileRandom } from '../src/sim/random.js';

test('tileRandom: the same seed and numbers always give the same number', () => {
  assert.equal(tileRandom(42, 1, 7, 3, 5), tileRandom(42, 1, 7, 3, 5));
});

test('tileRandom: changing the seed or any one number gives a different number', () => {
  const base = tileRandom(42, 1, 7, 3, 5);
  for (const other of [tileRandom(43, 1, 7, 3, 5), tileRandom(42, 2, 7, 3, 5), tileRandom(42, 1, 8, 3, 5),
    tileRandom(42, 1, 7, 4, 5), tileRandom(42, 1, 7, 3, -5), tileRandom(42, 1, 7, 5, 3)]) {
    assert.notEqual(other, base);
  }
});

test('tileRandom: numbers are between 0 and 1 and spread evenly (no bucket is too full or too empty)', () => {
  const buckets = Array(10).fill(0);
  let count = 0;
  for (let step = 0; step < 50; step++) {
    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        const n = tileRandom(7, 1, step, x, y);
        assert.ok(n >= 0 && n < 1, `out of range: ${n}`);
        buckets[Math.floor(n * 10)]++;
        count++;
      }
    }
  }
  // Com 51 200 números, cada décimo deve ter cerca de 5120 (10%): aceitamos 9,5% a 10,5%.
  for (const b of buckets) assert.ok(Math.abs(b / count - 0.1) < 0.005, `bucket share ${(b / count).toFixed(4)}`);
});

test('tileRandom: the dice of neighbouring tiles are not linked (tile x tells nothing about tile x+1)', () => {
  // Correlação entre o dado de (x, y) e o de (x+1, y): perto de 0 quer dizer "sem ligação".
  const a = [], b = [];
  for (let step = 0; step < 40; step++) {
    for (let x = 0; x < 31; x++) {
      for (let y = 0; y < 32; y++) {
        a.push(tileRandom(5, 1, step, x, y));
        b.push(tileRandom(5, 1, step, x + 1, y));
      }
    }
  }
  const mean = (l) => l.reduce((s, v) => s + v, 0) / l.length;
  const ma = mean(a), mb = mean(b);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  const correlation = cov / Math.sqrt(va * vb);
  assert.ok(Math.abs(correlation) < 0.03, `correlation ${correlation.toFixed(3)}`);
});
