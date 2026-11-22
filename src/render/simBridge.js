// PONTE TEMPORÁRIA para as regras novas da ronda "dificuldade" (tickets #12-#14).
//
// TODO(merger): apagar este ficheiro depois da junção com o ramo da simulação (SIM-DIFF).
// Nesse ramo, src/sim/actions.js já tem isWorkable/actionCost e checkAction/applyAction recusam
// com 'protected-area', e src/sim/ignition.js tem pickIgnition. Basta trocar, em
// buildPanel.js e disasterPlayer.js:
//     import { ... } from './simBridge.js'
// por
//     import { isWorkable, checkAction, applyAction, ... } from '../sim/actions.js'
//     import { pickIgnition } from '../sim/ignition.js'
//
// Enquanto isso não acontece, esta ponte usa as funções da simulação SE existirem, e só se
// não existirem usa uma cópia pequena das regras do contrato (docs/integration-contract.md).
import * as actions from '../sim/actions.js';
import { createRandom } from '../sim/random.js';

// O ficheiro da ignição pode ainda não existir: tentamos carregá-lo e, se falhar, usamos a cópia.
const ignitionModule = await import('../sim/ignition.js').catch(() => null);

// true = a simulação já tem as regras novas (então esta ponte não faz nada de seu).
export const usingRealRules = typeof actions.isWorkable === 'function';

export const { ACTIONS, createBuildState, undoAction, remainingBudget } = actions;

// ---------- isWorkable: faixas de gestão de combustível ----------
// Trabalhável = a ≤ 2 quadrados (contando as diagonais) de uma casa ou da escola,
// ou a ≤ 1 quadrado de uma estrada. O resto é Parque Natural.
export const isWorkable = usingRealRules ? actions.isWorkable : function fallbackIsWorkable(village, x, y) {
  return hasNear(village, x, y, 2, ['house', 'school']) || hasNear(village, x, y, 1, ['road']);
};

function hasNear(village, x, y, distance, types) {
  for (let dy = -distance; dy <= distance; dy++) {
    for (let dx = -distance; dx <= distance; dx++) {
      const row = village.tiles[y + dy];
      if (row && types.includes(row[x + dx])) return true;
    }
  }
  return false;
}

// ---------- checkAction / applyAction com 'protected-area' ----------
// A ordem das verificações do contrato: outside, already-changed, protected-area, ...
// Com a simulação antiga, metemos o 'protected-area' no sítio certo dessa ordem.
export const checkAction = usingRealRules ? actions.checkAction : function fallbackCheck(state, x, y, actionName) {
  const check = actions.checkAction(state, x, y, actionName);
  if (actionName === 'undo') return check;
  if (!check.ok && (check.reason === 'outside' || check.reason === 'already-changed')) return check;
  if (!isWorkable(state.village, x, y)) return { ok: false, reason: 'protected-area' };
  return check;
};

export const applyAction = usingRealRules ? actions.applyAction : function fallbackApply(state, x, y, actionName) {
  const check = checkAction(state, x, y, actionName);
  if (!check.ok) return check;
  return actions.applyAction(state, x, y, actionName);
};

// ---------- pickIgnition: onde cai o cigarro ----------
// Escolhe um dos level.ignitionCandidates com a semente; sem candidatos, usa level.ignition.
export const pickIgnition = ignitionModule?.pickIgnition ?? function fallbackPickIgnition(level, seed) {
  const candidates = level.ignitionCandidates;
  if (!candidates || candidates.length === 0) return level.ignition;
  const index = Math.floor(createRandom(seed)() * candidates.length);
  return candidates[index];
};
