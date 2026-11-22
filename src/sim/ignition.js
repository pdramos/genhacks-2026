// A ignição escondida: o jogador não sabe onde o cigarro vai cair.
// O nível traz vários "candidatos" (quadrados de mato colados a uma estrada) e a SEMENTE
// do jogo escolhe um deles. A mesma semente escolhe sempre o mesmo, por isso o
// "Try again (same night)" repete exatamente o mesmo fogo.
import { createRandom } from './random.js';

// Um número fixo que se junta à semente antes de sortear.
// Porquê? O fogo também usa createRandom(seed). Sem esta "pitada de sal", o primeiro número
// do fogo seria sempre o mesmo que escolheu a ignição, e as duas coisas ficavam ligadas.
const IGNITION_SALT = 7919;

// Escolhe onde começa o fogo. Devolve { x, y }.
//   level.ignitionCandidates = lista de { x, y } (opcional)
//   level.ignition           = o quadrado de sempre, usado se não houver candidatos
export function pickIgnition(level, seed) {
  const candidates = level.ignitionCandidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { x: level.ignition.x, y: level.ignition.y };
  }
  const rand = createRandom(seed + IGNITION_SALT);
  // rand() dá um número entre 0 e 1 (sem chegar a 1); vezes o número de candidatos,
  // e arredondado para baixo, dá uma posição válida da lista: 0, 1, 2, ...
  const index = Math.floor(rand() * candidates.length);
  const chosen = candidates[index];
  return { x: chosen.x, y: chosen.y }; // uma cópia, para ninguém estragar o nível sem querer
}
