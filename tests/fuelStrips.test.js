// Testes das faixas de gestão de combustível vistas na fase de construção (src/render/fuelStrips.js).
// São só contas com quadrados (sem Three.js), por isso testam-se no Node.
// A regra "este quadrado é trabalhável?" vem de fora (da simulação): aqui usamos uma regra de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage } from '../src/sim/village.js';
import { stripMap, stripEdges, slopeNote, usableTiles } from '../src/render/fuelStrips.js';

function village(rows) {
  return createVillage({ name: 'Test', map: rows });
}

// Regra de teste: só a coluna 0 é trabalhável.
const firstColumnOnly = (_village, x) => x === 0;

test('workable vegetation is a strip and protected vegetation is locked', () => {
  const v = village(['BB', 'EG']);
  assert.deepEqual(stripMap(v, firstColumnOnly), [
    ['strip', 'locked'],
    ['strip', 'locked'],
  ]);
});

test('houses, roads and water are neither strip nor locked', () => {
  // Não se pintam nem levam cadeado: não há nada para limpar ali.
  const v = village(['HRW', 'SBB']);
  const everywhere = () => true;
  assert.deepEqual(stripMap(v, everywhere), [
    [null, null, null],
    [null, 'strip', 'strip'],
  ]);
});

test('cleared land and firebreaks count as vegetation for the strips', () => {
  const v = village(['CF']);
  assert.deepEqual(stripMap(v, () => false), [['locked', 'locked']]);
});

test('the outline runs between a strip tile and a locked tile', () => {
  const map = [['strip', 'locked']];
  // Uma só aresta: a linha vertical entre (0,0) e (1,0), em x = 0.5, de y = -0.5 a y = 0.5.
  assert.deepEqual(stripEdges(map), [{ from: { x: 0.5, y: -0.5 }, to: { x: 0.5, y: 0.5 } }]);
});

test('the outline also runs between rows', () => {
  const map = [['strip'], ['locked']];
  assert.deepEqual(stripEdges(map), [{ from: { x: -0.5, y: 0.5 }, to: { x: 0.5, y: 0.5 } }]);
});

test('no outline next to houses, roads, water or the map border', () => {
  assert.deepEqual(stripEdges([['strip', null, 'locked']]), []);
  assert.deepEqual(stripEdges([['strip', 'strip'], ['strip', 'strip']]), []);
});

test('slopeNote says nothing on flat ground', () => {
  assert.equal(slopeNote(200, 200), '');
});

test('slopeNote shows how much more a slope costs, in percent', () => {
  assert.equal(slopeNote(200, 260), 'steep +30%');
  assert.equal(slopeNote(500, 501), 'steep +1%'); // arredonda para cima: nunca diz "+0%"
});

// Os quadrados que brilham: onde a verificação diz "ok". Os que só falham por falta de dinheiro
// são contados à parte (para o toast dizer "Not enough money" em vez de "não há quadrados").
test('usableTiles lists the tiles where the check is ok and counts the ones without money', () => {
  const check = (x, y) => {
    if (y === 0) return { ok: true };
    if (x === 0) return { ok: false, reason: 'not-enough-money' };
    return { ok: false, reason: 'protected-area' };
  };
  assert.deepEqual(usableTiles(3, 2, check), { tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], noMoney: 1 });
  assert.deepEqual(usableTiles(2, 2, () => ({ ok: false, reason: 'invalid-target' })), { tiles: [], noMoney: 0 });
});
