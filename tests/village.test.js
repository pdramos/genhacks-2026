// Testes da simulação: criar a vila a partir dos dados de um nível.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage, tileAt } from '../src/sim/village.js';

// Um mapa 20x20 desenhado com letras (cada letra é um tipo de quadrado).
const ROW_A = 'GGGGBBBBEEEEOOOORRWW';
const ROW_B = 'HHHHSCCCFFFFGGGGRRWW';
function validLevel() {
  const map = [];
  for (let y = 0; y < 20; y++) map.push(y % 2 === 0 ? ROW_A : ROW_B);
  return { name: 'Test village', map };
}

test('creates a 20x20 village whose tiles match the letters of the map', () => {
  const village = createVillage(validLevel());
  assert.equal(village.width, 20);
  assert.equal(village.height, 20);
  assert.equal(tileAt(village, 0, 0), 'grass');
  assert.equal(tileAt(village, 4, 0), 'brush');
  assert.equal(tileAt(village, 8, 0), 'eucalyptus');
  assert.equal(tileAt(village, 12, 0), 'broadleaf');
  assert.equal(tileAt(village, 16, 0), 'road');
  assert.equal(tileAt(village, 19, 0), 'water');
  assert.equal(tileAt(village, 0, 1), 'house');
  assert.equal(tileAt(village, 4, 1), 'school');
  assert.equal(tileAt(village, 5, 1), 'cleared');
  assert.equal(tileAt(village, 8, 1), 'firebreak');
});

test('rejects a map with an unknown letter, saying which letter and where', () => {
  const level = validLevel();
  level.map[3] = 'GGGGGXGGGGGGGGGGGGGG'; // X não é um tipo de quadrado
  assert.throws(() => createVillage(level), /unknown tile "X" at column 5, row 3/);
});

test('rejects a map whose rows have different lengths', () => {
  const level = validLevel();
  level.map[7] = 'GGGG'; // linha curta demais
  assert.throws(() => createVillage(level), /row 7 has 4 tiles, expected 20/);
});

test('rejects a level without a map', () => {
  assert.throws(() => createVillage({ name: 'Empty' }), /level has no map/);
});
