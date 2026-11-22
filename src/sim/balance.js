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
// Ronda "salvar todas as casas" (pedido do estudante: difícil, mas não impossível), o que mudou e porquê:
//   - NENHUMA constante deste ficheiro mudou (preços, declive, faixas e estrelas iguais), nem o fogo;
//   - mapa de Sintra (data/levels/sintra.json): a linha 10, x 8-17, passou de floresta a pastagem
//     ("G"). Era Parque Natural (não se pode trabalhar) a 3 quadrados das casas da linha 13: as brasas
//     saltavam a linha 11 e a EN247 e caíam nas casas, e nenhum plano as conseguia travar. Mesmo a
//     gastar €190 000 (tudo o que a lei deixa), ardiam casas em ~20% das noites;
//   - orçamento de Sintra 12000 -> 20000: com €12 000 o melhor plano encontrado dava 3 estrelas em
//     ~50% das noites mas >= 2 estrelas em só ~70-80% (um fogo que escapa queima o quartel ou a vila).
//   - o teste ganhou a estratégia "expert" (tests/fixtures/expert-plan-sintra.json, €19 930;
//     esse ficheiro já não existe: hoje o plano é "expertPlan" em data/levels/sintra.json):
//     3 estrelas em 60% (sementes 1-30) e 70% (31-90); >= 2 estrelas em 87% e 95%.
//   - o que se testou e NÃO chegou: só o orçamento (€20 000 com o mapa antigo: 3 estrelas em ~47%,
//     >= 2 em ~80%; seriam precisos ~€45 000) e só o mapa (€12-16 000: >= 2 estrelas em ~80%).
// Ronda "o fogo nasce sempre" (a verificação da ronda anterior), o que mudou e porquê:
//   - com 30 sementes os números enganavam: noutras sementes o ingénuo dava ~1,7 (não 1,17) e o
//     perito >= 2 estrelas em só 88% (à justa). O teste passou a jogar 120 sementes;
//   - o perito ganhava ~13 pontos de 3 estrelas a limpar à volta dos sítios ESCONDIDOS do cigarro
//     (os "?" estavam no meio das estradas, não lá). Agora os "?" estão nos sítios verdadeiros
//     (mapHints.js) e limpar lá já não chega: CIGARETTE_MIN_FLAMMABILITY (o cigarro não acende
//     terra limpa, rola para o mato seco). O ingénuo, que limpava os "?" sem saber, desce para
//     ~1,5, o mesmo que não fazer nada;
//   - mapa: a linha 11, x 20-25 (a berma norte da EN247 em frente ao quartel), passa de eucalipto
//     a mato ("B"). Era daí que as brasas saltavam para as casas do leste e para o quartel, e
//     abater eucaliptos ali custava ~€7 500. Limpar o mato custa €1 500: o perito chega a >= 2
//     estrelas em ~94% das noites (era 88%) e 3 estrelas em ~60%;
//   - nenhuma outra constante mudou (preços, declive, fogo, estrelas, orçamento).
// Ronda "mapa real de Malveira da Serra" (o mapa refeito com OpenStreetMap + relevo Copernicus):
//   - NENHUMA constante deste ficheiro mudou, nem o orçamento (€20 000): com o mapa novo, um
//     plano novo do perito (tests/fixtures/expert-plan-sintra.json, €19 610) chega às metas
//     (3 estrelas em ~64-70% das noites, >= 2 estrelas em ~91%). Os números estão no
//     docs/integration-contract.md, secção "Equilíbrio".
//     (O plano do perito mudou-se depois para o próprio nível: "expertPlan" em data/levels/sintra.json.)
// Ronda "não fazer nada perde" (os "?" passaram para onde o fogo chega mesmo à Malveira):
//   - NENHUMA constante deste ficheiro mudou, nem o fogo, nem o orçamento. Mudaram os sítios do
//     cigarro no mapa (ignitionCandidates) e o plano do perito; não fazer nada desce de ~1,5 para
//     ~0,65 estrelas. Ver docs/integration-contract.md, secção "Equilíbrio".

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

// ---------- Onde começa o fogo ----------
// Uma ponta de cigarro só acende combustível seco: inflamabilidade de pelo menos isto
// (erva 0.5, mato 0.8, folhosa 0.3, eucalipto 0.9; ver FLAMMABILITY em fire.js).
// Terra limpa (0.15) e corta-fogo (0) não pegam: o cigarro rola para o lado (resolveIgnition,
// em ignition.js). Porquê: limpar o mato em volta de cada "?" fazia o fogo morrer ao nascer e
// valia mais do que defender a vila (ver a ronda "o fogo nasce sempre" no topo deste ficheiro).
export const CIGARETTE_MIN_FLAMMABILITY = 0.3;

// ---------- Orçamento ----------
// Orçamento usado quando o nível não traz "budget" no JSON.
export const DEFAULT_BUDGET = 6000;

// ---------- Estrelas ----------
// Que parte das casas é preciso salvar para a 2.ª estrela (ver src/sim/stars.js).
export const TWO_STAR_SHARE = 0.8;
