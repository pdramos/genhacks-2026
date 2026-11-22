// Testes da fase de construção: orçamento e ações defensivas.
// Só usam a "porta da frente" do módulo (createBuildState, applyAction, undoAction, remainingBudget).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVillage, tileAt } from '../src/sim/village.js';
import { DEFAULT_BUDGET } from '../src/sim/balance.js';
import { createBuildState, applyAction, undoAction, remainingBudget, checkAction, isWorkable, actionCost, ACTIONS } from '../src/sim/actions.js';

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

test('a firebreak on trees costs 1000 (the trees must be cut down first), on brush or grass 500', () => {
  // Revisão de equilíbrio: com o mesmo preço, o corta-fogo num eucalipto (€500, não arde)
  // era sempre melhor do que trocar as árvores (€800, folhosa ainda arde) e ninguém usava a 3.ª carta.
  const village = smallVillage();
  assert.equal(actionCost(village, 2, 0, 'firebreak'), 1000); // eucalyptus
  assert.equal(actionCost(village, 3, 0, 'firebreak'), 1000); // broadleaf
  assert.equal(actionCost(village, 1, 0, 'firebreak'), 500); // brush
  assert.equal(actionCost(village, 0, 0, 'firebreak'), 500); // grass
  // Trocar as árvores passa a ser mais barato do que abatê-las para um corta-fogo.
  assert.ok(actionCost(village, 2, 0, 'replaceTrees') < actionCost(village, 2, 0, 'firebreak'));
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

test('a tile already changed by an action cannot take another action', () => {
  const village = smallVillage();
  const state = createBuildState(village, 10000);
  applyAction(state, 1, 0, 'clearBrush'); // brush -> cleared (€200)
  // cleared é vegetação, mas o quadrado já foi mudado: tem de desfazer primeiro.
  assert.deepEqual(applyAction(state, 1, 0, 'firebreak'), { ok: false, reason: 'already-changed' });
  assert.equal(tileAt(village, 1, 0), 'cleared');
  assert.equal(remainingBudget(state), 9800);
});

test('an action outside the village is blocked', () => {
  const state = createBuildState(smallVillage(), 10000); // a vila tem 5x2
  for (const [x, y] of [[-1, 0], [5, 0], [0, -1], [0, 2]]) {
    assert.deepEqual(applyAction(state, x, y, 'firebreak'), { ok: false, reason: 'outside' }, `${x},${y}`);
  }
  assert.equal(remainingBudget(state), 10000);
});

test('undo restores the original tile and refunds the exact cost', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  applyAction(state, 2, 0, 'firebreak'); // eucalyptus -> firebreak (€1000: é preciso abater as árvores)
  const result = undoAction(state, 2, 0);
  assert.deepEqual(result, { ok: true, refund: 1000, restoredType: 'eucalyptus' });
  assert.equal(tileAt(village, 2, 0), 'eucalyptus');
  assert.equal(remainingBudget(state), 1000);
});

test('undo on a tile that was never changed fails and gives no money', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  // Um corta-fogo que já vinha no mapa não foi comprado: não há nada a desfazer.
  assert.deepEqual(undoAction(state, 4, 1), { ok: false, reason: 'nothing-to-undo' });
  assert.equal(tileAt(village, 4, 1), 'firebreak');
  assert.equal(remainingBudget(state), 1000);
});

test('after an undo, the tile cannot be undone again but can take a new action', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  applyAction(state, 2, 0, 'firebreak'); // eucalyptus -> firebreak (€1000)
  undoAction(state, 2, 0); // volta a eucalyptus, devolve €1000

  // Desfazer outra vez não pode dar dinheiro a dobrar.
  assert.deepEqual(undoAction(state, 2, 0), { ok: false, reason: 'nothing-to-undo' });
  assert.equal(remainingBudget(state), 1000);

  // O quadrado ficou livre: aceita uma ação nova e paga o preço dela.
  assert.deepEqual(applyAction(state, 2, 0, 'replaceTrees'), { ok: true, newType: 'broadleaf' });
  assert.equal(tileAt(village, 2, 0), 'broadleaf');
  assert.equal(remainingBudget(state), 200);
});

// ---------- checkAction: "posso fazer isto aqui?" sem mudar nada (para o destaque do quadrado) ----------

test('checkAction says yes for a valid action and changes nothing', () => {
  const village = smallVillage();
  const state = createBuildState(village, 1000);
  assert.deepEqual(checkAction(state, 1, 0, 'clearBrush'), { ok: true, cost: 200 });
  assert.equal(tileAt(village, 1, 0), 'brush');
  assert.equal(remainingBudget(state), 1000);
});

test('checkAction gives the same reasons as applyAction', () => {
  const state = createBuildState(smallVillage(), 300);
  assert.deepEqual(checkAction(state, 4, 0, 'clearBrush'), { ok: false, reason: 'invalid-target' });
  assert.deepEqual(checkAction(state, 0, 0, 'firebreak'), { ok: false, reason: 'not-enough-money' });
  assert.deepEqual(checkAction(state, 9, 9, 'firebreak'), { ok: false, reason: 'outside' });
  applyAction(state, 1, 0, 'clearBrush');
  assert.deepEqual(checkAction(state, 1, 0, 'firebreak'), { ok: false, reason: 'already-changed' });
});

test('checkAction for undo is ok only on a changed tile', () => {
  const state = createBuildState(smallVillage(), 1000);
  assert.deepEqual(checkAction(state, 1, 0, 'undo'), { ok: false, reason: 'nothing-to-undo' });
  applyAction(state, 1, 0, 'clearBrush');
  assert.deepEqual(checkAction(state, 1, 0, 'undo'), { ok: true, cost: -200 });
});

// ---------- Faixas de gestão de combustível: só se pode trabalhar perto de casas e estradas ----------
// (Lei portuguesa DL 82/2021. Longe disso é Parque Natural protegido.)

test('tiles up to 2 away from a house are workable, including diagonals; 3 away is park', () => {
  const village = createVillage({ name: 'House', map: ['HGGG', 'GGGG', 'GGGG', 'GGGG'] });
  assert.equal(isWorkable(village, 2, 0), true); // 2 para leste
  assert.equal(isWorkable(village, 2, 2), true); // 2 na diagonal
  assert.equal(isWorkable(village, 3, 0), false); // 3 para leste
  assert.equal(isWorkable(village, 3, 3), false); // 3 na diagonal
  assert.equal(isWorkable(village, 1, 3), false); // 3 para sul
});

test('tiles up to 2 away from the school are workable', () => {
  const village = createVillage({ name: 'School', map: ['GGGGGG', 'GGGGGS'] });
  assert.equal(isWorkable(village, 3, 0), true);
  assert.equal(isWorkable(village, 2, 1), false);
});

test('tiles next to a road are workable, but 2 away from a road is park', () => {
  const village = createVillage({ name: 'Road', map: ['RGGG', 'GGGG', 'GGGG'] });
  assert.equal(isWorkable(village, 1, 0), true);
  assert.equal(isWorkable(village, 1, 1), true); // na diagonal
  assert.equal(isWorkable(village, 2, 0), false);
  assert.equal(isWorkable(village, 0, 2), false);
});

test('a map with no houses, school or roads is all park', () => {
  const village = createVillage({ name: 'Wild', map: ['GBE', 'OCW'] });
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 3; x++) assert.equal(isWorkable(village, x, y), false, `${x},${y}`);
  }
});

// Uma vila 6x1: casa no x=0, Parque Natural a partir de x=3 (mato, água, eucalipto).
//   x:  0      1      2      3      4      5
//   y=0 house  brush  brush  brush  water  eucalyptus
function parkVillage() {
  return createVillage({ name: 'Park', map: ['HBBBWE'] });
}

test('an action in the natural park is blocked with protected-area and nothing changes', () => {
  const village = parkVillage();
  const state = createBuildState(village, 1000);
  assert.deepEqual(applyAction(state, 3, 0, 'clearBrush'), { ok: false, reason: 'protected-area' });
  assert.equal(tileAt(village, 3, 0), 'brush');
  assert.equal(remainingBudget(state), 1000);
  // Dentro da faixa, a mesma ação funciona.
  assert.equal(applyAction(state, 2, 0, 'clearBrush').ok, true);
});

test('protected-area is checked before invalid-target and not-enough-money', () => {
  const state = createBuildState(parkVillage(), 0);
  assert.deepEqual(applyAction(state, 4, 0, 'firebreak'), { ok: false, reason: 'protected-area' }); // água
  assert.deepEqual(applyAction(state, 5, 0, 'replaceTrees'), { ok: false, reason: 'protected-area' }); // sem dinheiro
  assert.deepEqual(applyAction(state, 9, 0, 'firebreak'), { ok: false, reason: 'outside' });
});

test('checkAction also says protected-area', () => {
  const state = createBuildState(parkVillage(), 1000);
  assert.deepEqual(checkAction(state, 3, 0, 'clearBrush'), { ok: false, reason: 'protected-area' });
});

// ---------- Preço com declive: trabalhar numa encosta custa mais ----------

// Uma vila 3x3 com mato no centro e uma casa no canto (tudo dentro da faixa).
// "heights" muda o relevo: o preço depende da diferença de altura do centro para os vizinhos.
function hill(heights) {
  return createVillage({ name: 'Hill', map: ['HGG', 'GBG', 'GGE'], heights });
}

test('on flat ground every action costs its base price', () => {
  const village = hill(undefined); // sem heights = plano
  assert.equal(actionCost(village, 1, 1, 'clearBrush'), ACTIONS.clearBrush.cost);
  assert.equal(actionCost(village, 1, 1, 'firebreak'), ACTIONS.firebreak.cost);
  assert.equal(actionCost(village, 2, 2, 'replaceTrees'), ACTIONS.replaceTrees.cost);
});

test('a tile on a slope costs more than on flat ground, and a steeper one costs even more', () => {
  const flat = actionCost(hill(undefined), 1, 1, 'clearBrush');
  const gentle = actionCost(hill(['000', '010', '000']), 1, 1, 'clearBrush');
  const steep = actionCost(hill(['000', '040', '000']), 1, 1, 'clearBrush');
  assert.ok(gentle > flat, `gentle ${gentle} vs flat ${flat}`);
  assert.ok(steep > gentle, `steep ${steep} vs gentle ${gentle}`);
});

test('a high but flat plateau costs the base price (only the slope counts, not the height)', () => {
  assert.equal(actionCost(hill(['999', '999', '999']), 1, 1, 'firebreak'), ACTIONS.firebreak.cost);
});

test('the slope counts uphill and downhill the same', () => {
  const peak = actionCost(hill(['000', '030', '000']), 1, 1, 'firebreak'); // o centro está 3 acima
  const pit = actionCost(hill(['333', '303', '333']), 1, 1, 'firebreak'); // o centro está 3 abaixo
  assert.equal(peak, pit);
});

test('prices are whole euros', () => {
  for (let h = 0; h <= 9; h++) {
    const cost = actionCost(hill(['000', `0${h}0`, '000']), 1, 1, 'clearBrush');
    assert.ok(Number.isInteger(cost), `height ${h}: ${cost}`);
  }
});

test('applyAction charges the slope price and checkAction shows it before', () => {
  const village = hill(['000', '040', '000']);
  const price = actionCost(village, 1, 1, 'firebreak');
  const state = createBuildState(village, 10000);
  assert.deepEqual(checkAction(state, 1, 1, 'firebreak'), { ok: true, cost: price });
  applyAction(state, 1, 1, 'firebreak');
  assert.equal(remainingBudget(state), 10000 - price);
});

test('the slope price decides if there is enough money', () => {
  const village = hill(['000', '040', '000']);
  const price = actionCost(village, 1, 1, 'clearBrush');
  // Dá para o preço base, mas não para o preço com declive.
  const state = createBuildState(village, price - 1);
  assert.deepEqual(applyAction(state, 1, 1, 'clearBrush'), { ok: false, reason: 'not-enough-money' });
  assert.equal(remainingBudget(state), price - 1);
});

test('a level without a budget uses the default budget from balance.js; a budget of 0 stays 0', () => {
  assert.equal(remainingBudget(createBuildState(smallVillage(), undefined)), DEFAULT_BUDGET);
  assert.equal(remainingBudget(createBuildState(smallVillage(), 0)), 0);
});

test('undo on a slope refunds exactly what was paid', () => {
  const village = hill(['000', '040', '000']);
  const state = createBuildState(village, 10000);
  applyAction(state, 1, 1, 'firebreak');
  const paid = 10000 - remainingBudget(state);
  assert.deepEqual(checkAction(state, 1, 1, 'undo'), { ok: true, cost: -paid });
  assert.deepEqual(undoAction(state, 1, 1), { ok: true, refund: paid, restoredType: 'brush' });
  assert.equal(remainingBudget(state), 10000);
});
