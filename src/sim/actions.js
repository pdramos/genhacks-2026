// A fase de construção: o jogador gasta o orçamento em ações defensivas.
// Só regras e dados (sem desenho), por isso funciona igual no navegador e nos testes.

// As ações que o jogador pode comprar. cost = preço em euros.
export const ACTIONS = {
  clearBrush: { cost: 200, label: 'Clear brush', result: 'cleared' },
  firebreak: { cost: 500, label: 'Firebreak', result: 'firebreak' },
  replaceTrees: { cost: 800, label: 'Replace trees', result: 'broadleaf' },
};

// Começa a fase de construção. O "estado" guarda a vila (que vamos alterar)
// e o dinheiro que ainda há.
export function createBuildState(village, budget) {
  return { village, budget };
}

// Tenta aplicar uma ação no quadrado (x, y).
export function applyAction(state, x, y, actionName) {
  const action = ACTIONS[actionName];
  // Não há dinheiro suficiente? Recusa, sem mexer em nada.
  if (action.cost > state.budget) return { ok: false, reason: 'not-enough-money' };

  state.village.tiles[y][x] = action.result;
  state.budget -= action.cost;
  return { ok: true, newType: action.result };
}

// Quanto dinheiro ainda sobra.
export function remainingBudget(state) {
  return state.budget;
}
