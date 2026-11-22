// CONSTANTES DE EQUILÍBRIO: os números que decidem se o jogo é fácil ou difícil.
// Ficam todas aqui, num só sítio, para se poderem afinar sem procurar pelo código todo.
// (O agente/pessoa que afina a dificuldade mexe neste ficheiro e corre "npm test".)

// ---------- Faixas de gestão de combustível (lei portuguesa DL 82/2021) ----------
// Só se pode trabalhar perto das coisas a proteger. O resto é Parque Natural.
// A distância conta como no xadrez para o rei: diagonais contam como 1 passo.
export const HOUSE_STRIP = 2; // até 2 quadrados de uma casa ou da escola
export const ROAD_STRIP = 1; // até 1 quadrado de uma estrada

// ---------- Preços ----------
// Preço base de cada ação, em euros, num terreno plano.
export const BASE_COSTS = {
  clearBrush: 200,
  firebreak: 500,
  replaceTrees: 800,
};

// Quanto MAIS caro fica por cada nível de altura de diferença para o vizinho mais desnivelado.
// Fator de declive = 1 + SLOPE_COST_PER_LEVEL × (maior diferença de altura para os 8 vizinhos).
// Exemplo com 0,25: plano → ×1; diferença 2 → ×1,5; diferença 4 → ×2.
// (Trabalhar numa encosta íngreme é mais difícil: máquinas mais lentas, mais horas de trabalho.)
export const SLOPE_COST_PER_LEVEL = 0.25;

// Os preços com declive são arredondados a múltiplos deste valor (fica mais fácil de ler: €250, não €247).
export const COST_ROUNDING = 10;

// ---------- Orçamento ----------
// Orçamento usado quando o nível não traz "budget" no JSON.
export const DEFAULT_BUDGET = 6000;

// ---------- Estrelas ----------
// Que parte das casas é preciso salvar para a 2.ª estrela (ver src/sim/stars.js).
export const TWO_STAR_SHARE = 0.8;
