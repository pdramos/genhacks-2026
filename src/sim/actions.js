// A fase de construção: o jogador gasta o orçamento em ações defensivas.
// Só regras e dados (sem desenho), por isso funciona igual no navegador e nos testes.

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
  const { village } = state;
  // Fora da grelha? Não há quadrado para mudar.
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return { ok: false, reason: 'outside' };

  const action = ACTIONS[actionName];
  const key = `${x},${y}`;
  const currentType = state.village.tiles[y][x];

  // O quadrado já foi mudado? Tem de ser desfeito primeiro.
  if (state.changes[key]) return { ok: false, reason: 'already-changed' };
  // A ação não faz sentido neste tipo de quadrado? Recusa.
  if (!action.from.includes(currentType)) return { ok: false, reason: 'invalid-target' };
  // Não há dinheiro suficiente? Recusa, sem mexer em nada.
  if (action.cost > state.budget) return { ok: false, reason: 'not-enough-money' };

  // Tudo bem: guarda o tipo original (para o undo), muda o quadrado e paga.
  state.changes[key] = { actionName, originalType: currentType };
  state.village.tiles[y][x] = action.result;
  state.budget -= action.cost;
  return { ok: true, newType: action.result };
}

// Quanto dinheiro ainda sobra.
export function remainingBudget(state) {
  return state.budget;
}
