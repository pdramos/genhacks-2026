// CONSTANTES DE EQUILÍBRIO: os números que decidem se o jogo é fácil ou difícil.
// Ficam todas aqui, num só sítio, para se poderem afinar sem procurar pelo código todo.
// (O agente/pessoa que afina a dificuldade mexe neste ficheiro e corre "npm test".)
//
// O teste do equilíbrio é tests/balance.test.js: joga Sintra 30 vezes com 4 estratégias e
// imprime uma tabela de estrelas. Ronda de equilíbrio (ticket #14), o que mudou e porquê:
//   - orçamento de Sintra 8000 -> 12000 (em data/levels/sintra.json, porque é do nível):
//     com o fogo mais forte, 8000 não chegava para o bom plano proteger o quartel E as casas;
//   - fogo (src/sim/fire.js, cada mudança explicada lá): mais brasas com rajadas fortes
//     (SPOT_CHANCE_PER_KMH 0.003 -> 0.006, SPOT_MIN_WIND_KMH 20 -> 25) e casas/escola mais
//     inflamáveis (0.4 -> 0.5). Antes, não fazer nada dava 1,67 estrelas em média.
//   - preços, declive e estrelas ficaram iguais (os testes das ações e das estrelas usam-nos).
// Revisão de equilíbrio (depois do #14), o que mudou e porquê:
//   - a ignição: um corta-fogo no sítio do cigarro já não impede o fogo (resolveIgnition em
//     src/sim/ignition.js); antes, €3.390 em corta-fogos davam 3 estrelas em todas as noites;
//   - corta-fogo em árvores passa a custar FIREBREAK_ON_TREES_COST (trocar árvores passa a compensar);
//   - no mapa de Sintra, o quartel tem casas a leste (proteger só o quartel já não chega) e o
//     candidato da costa passou para o lado da estrada da Peninha que desce para a vila.

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

// Um corta-fogo onde há ÁRVORES (eucalipto ou folhosa) custa mais: é preciso abatê-las primeiro.
// Antes custava os mesmos €500 e era sempre melhor do que trocar as árvores (€800, a folhosa
// ainda arde um pouco), por isso a 3.ª carta nunca compensava. Agora: abater = €1000,
// trocar = €800 (mais barato, mas a folhosa ainda pode arder).
export const FIREBREAK_ON_TREES_COST = 1000;

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
