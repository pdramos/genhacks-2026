// A fase de construção: o jogador gasta o orçamento em ações defensivas.
// Só regras e dados (sem desenho), por isso funciona igual no navegador e nos testes.
import { HOUSE_STRIP, ROAD_STRIP } from './balance.js';

// Os quadrados de vegetação (ver GLOSSARY.md).
const VEGETATION = ['grass', 'brush', 'eucalyptus', 'broadleaf', 'cleared'];

// As ações que o jogador pode comprar.
//   cost   = preço em euros
//   label  = nome mostrado no botão (em inglês)
//   from   = tipos de quadrado onde a ação pode ser feita
//   result = tipo em que o quadrado se transforma
export const ACTIONS = {
  clearBrush: { cost: 200, label: 'Clear brush', from: ['brush'], result: 'cleared' },
  firebreak: { cost: 500, label: 'Firebreak', from: VEGETATION, result: 'firebreak' },
  replaceTrees: { cost: 800, label: 'Replace trees', from: ['eucalyptus'], result: 'broadleaf' },
};

// Começa a fase de construção. O "estado" guarda:
//   village = a vila (alteramos village.tiles diretamente, porque o fogo lê a mesma vila)
//   budget  = o dinheiro que ainda há
//   changes = os quadrados mudados, para poder desfazer.
//             A chave é "x,y" e o valor é { actionName, originalType }.
export function createBuildState(village, budget) {
  return { village, budget, changes: {} };
}

// Tenta aplicar uma ação no quadrado (x, y).
// Devolve { ok: true, newType } ou { ok: false, reason } a dizer porque não deu.
export function applyAction(state, x, y, actionName) {
  const check = checkAction(state, x, y, actionName);
  if (!check.ok) return check;
  const action = ACTIONS[actionName];
  const key = `${x},${y}`;
  const currentType = state.village.tiles[y][x];

  // Tudo bem: guarda o tipo original (para o undo), muda o quadrado e paga.
  state.changes[key] = { actionName, originalType: currentType };
  state.village.tiles[y][x] = action.result;
  state.budget -= action.cost;
  return { ok: true, newType: action.result };
}

// "Posso fazer esta ação aqui?" — a mesma verificação do applyAction, mas SEM mudar nada.
// Serve para a interface pintar o quadrado debaixo do rato de verde (pode) ou vermelho (não pode).
// actionName pode ser também 'undo'. Devolve { ok: true, cost } (no undo, cost é negativo:
// é dinheiro que volta) ou { ok: false, reason }.
export function checkAction(state, x, y, actionName) {
  const { village } = state;
  // Fora da grelha? Não há quadrado para mudar.
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return { ok: false, reason: 'outside' };
  const change = state.changes[`${x},${y}`];
  if (actionName === 'undo') {
    if (!change) return { ok: false, reason: 'nothing-to-undo' };
    return { ok: true, cost: -ACTIONS[change.actionName].cost };
  }
  const action = ACTIONS[actionName];
  // O quadrado já foi mudado? Tem de ser desfeito primeiro.
  if (change) return { ok: false, reason: 'already-changed' };
  // Longe das casas e das estradas? É Parque Natural: a lei não deixa mexer.
  if (!isWorkable(village, x, y)) return { ok: false, reason: 'protected-area' };
  // A ação não faz sentido neste tipo de quadrado? Recusa.
  if (!action.from.includes(village.tiles[y][x])) return { ok: false, reason: 'invalid-target' };
  // Não há dinheiro suficiente? Recusa, sem mexer em nada.
  if (action.cost > state.budget) return { ok: false, reason: 'not-enough-money' };
  return { ok: true, cost: action.cost };
}

// Desfaz a ação no quadrado (x, y): volta ao tipo original e devolve o dinheiro todo.
// Devolve { ok: true, refund, restoredType } ou { ok: false, reason: 'nothing-to-undo' }.
export function undoAction(state, x, y) {
  const key = `${x},${y}`;
  const change = state.changes[key];
  // Este quadrado não foi mudado nesta fase? Não há nada para desfazer.
  if (!change) return { ok: false, reason: 'nothing-to-undo' };
  const refund = ACTIONS[change.actionName].cost;

  state.village.tiles[y][x] = change.originalType;
  state.budget += refund;
  delete state.changes[key]; // o quadrado fica livre para outra ação
  return { ok: true, refund, restoredType: change.originalType };
}

// "Posso trabalhar neste quadrado?" A lei só deixa limpar as faixas de gestão de combustível:
//   - até HOUSE_STRIP quadrados de uma casa ou da escola;
//   - até ROAD_STRIP quadrado de uma estrada.
// O resto é Parque Natural protegido. Devolve true ou false.
export function isWorkable(village, x, y) {
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return false;
  return isNear(village, x, y, ['house', 'school'], HOUSE_STRIP) || isNear(village, x, y, ['road'], ROAD_STRIP);
}

// Há algum quadrado de um destes tipos a "distance" ou menos de (x, y)?
// Vê o quadrado à volta, como o rei no xadrez: as diagonais também contam como 1.
function isNear(village, x, y, types, distance) {
  for (let ny = y - distance; ny <= y + distance; ny++) {
    for (let nx = x - distance; nx <= x + distance; nx++) {
      if (nx < 0 || ny < 0 || nx >= village.width || ny >= village.height) continue; // fora do mapa
      if (types.includes(village.tiles[ny][nx])) return true;
    }
  }
  return false;
}

// Quanto dinheiro ainda sobra.
export function remainingBudget(state) {
  return state.budget;
}
