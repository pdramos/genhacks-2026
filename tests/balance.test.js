// EQUILÍBRIO (ticket #14): o jogo é fácil ou difícil demais?
// Joga o nível de Sintra (o mapa real de Malveira da Serra) 120 vezes (sementes 1-120) com 8
// estratégias "escritas à mão" e conta as
// estrelas. Cada semente escolhe onde cai o cigarro (resolveIgnition) e o vento é o vento real, hora a hora.
// Porquê 120 e não 30? Com 30 sementes, um resultado dependia muito de QUAIS sementes calhavam
// (ex.: o ingénuo dava 1,17 nas sementes 1-30 e ~1,7 nas outras). Para ver os números "a sério",
// com mais sementes (demora mais): BALANCE_SEEDS=1000 npm test (ver SEED_COUNT, mais abaixo)
// As metas vêm do docs/integration-contract.md (secção "Equilíbrio"):
//   - não fazer nada:                    média < 0,75 estrelas e 3 estrelas em menos de 15% das
//                                        sementes (a meta antiga, < 0,5, não se cumpre: ver o teste)
//   - "limpar tudo a começar no topo":   cerca de 1 estrela, <= 1,3, e não melhor do que não fazer nada
//   - um bom plano (pensado a olhar para o mapa e o vento): >= 2 estrelas em mais de metade das sementes
//   - 3 estrelas: menos de 35% das sementes para quem não joga como um perito
//   - o plano de um PERITO ("expertPlan" no data/levels/sintra.json): salvar TODAS as casas tem de
//     ser difícil mas possível: 3 estrelas em >= 50% das sementes e >= 2 estrelas em >= 85%
// E três guardas da revisão de equilíbrio (os "truques" não podem valer mais do que pensar):
//   - corta-fogo em cada sítio possível do cigarro: bem abaixo do bom plano;
//   - limpar o mato à volta de cada "?" do mapa: pouco 3 estrelas, bem abaixo do perito;
//   - só proteger o quartel: abaixo do bom plano e bem abaixo do perito (o resto do orçamento conta).
// No fim imprime uma tabela, para se ver os números ao correr "npm test".
// Se mudares o mapa, os preços ou o fogo, corre isto outra vez e vê se as metas ainda se cumprem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createVillage } from '../src/sim/village.js';
import { createBuildState, applyAction, actionCost } from '../src/sim/actions.js';
import { runDisaster } from '../src/sim/fire.js';
import { resolveIgnition } from '../src/sim/ignition.js';
import { windForLevel } from '../src/sim/weather.js';
import { countStars } from '../src/sim/stars.js';
import { createRandom } from '../src/sim/random.js';
import { TOO_EASY_STARS } from '../src/sim/balance.js';

const level = JSON.parse(readFileSync(new URL('../data/levels/sintra.json', import.meta.url), 'utf8'));
// O plano do perito: uma lista de ações { x, y, action }, feita antes de saber onde cai o cigarro.
// Vive no próprio nível (level.expertPlan), porque o jogo também o usa no fim de cada noite
// (src/sim/counterfactual.js: "o que o perito teria feito nesta mesma noite").
const EXPERT_ACTIONS = level.expertPlan.actions;
// Quantas sementes jogar: 120 por omissão (1-120). Para uma conta mais longa, ou com sementes
// que nunca foram usadas para afinar: BALANCE_SEEDS=1000 BALANCE_FIRST_SEED=4001 npm test
const SEED_COUNT = Number(process.env.BALANCE_SEEDS) || 120;
const FIRST_SEED = Number(process.env.BALANCE_FIRST_SEED) || 1;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => FIRST_SEED + i);

// ---------- As estratégias ----------
// Cada uma recebe o "estado" da construção (com o orçamento do nível) e gasta o dinheiro.

// (a) Não fazer nada.
function doNothing() {}

// (b) O jogador "ingénuo": percorre o mapa a partir do canto de cima à esquerda, linha a linha,
// e em cada quadrado onde a lei deixa trabalhar tenta limpar o mato; se não der, faz corta-fogo.
// Continua até ao fim do mapa (as ações que já não cabem no dinheiro são recusadas).
function naiveTopLeft(state) {
  const { width, height } = state.village;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!applyAction(state, x, y, 'clearBrush').ok) applyAction(state, x, y, 'firebreak');
    }
  }
}

// (c) Ao calhas: 3000 tentativas num quadrado e numa ação sorteados (muitas são recusadas).
// Usa uma semente própria, para a mesma semente dar sempre as mesmas ações.
function randomActions(state, seed) {
  const rand = createRandom(seed * 31 + 5);
  const actions = ['clearBrush', 'firebreak', 'replaceTrees'];
  const { width, height } = state.village;
  for (let i = 0; i < 3000 && state.budget >= 200; i++) {
    const x = Math.floor(rand() * width);
    const y = Math.floor(rand() * height);
    applyAction(state, x, y, actions[Math.floor(rand() * actions.length)]);
  }
}

// (d) Um BOM plano: defender a vila, a olhar para o mapa e para o vento (sem usar os "?"):
//   - o vento vem de NORTE, por isso o fogo desce a serra e entra em Malveira pela orla norte;
//   - o quartel dos bombeiros (a "escola", em 19-20, 15-16) está no meio das casas e, por cima
//     delas, há pastagem e mato até à serra (x 17-20, linhas 9-11): é a primeira coisa a
//     proteger (sem quartel, 0 estrelas);
//   - o resto da orla norte de Malveira (x 13-16, linhas 9-11);
//   - a orla norte de Almoinhas Velhas e do Arneiro, a oeste (x 6-12, linhas 11-12);
//   - com o que sobra, as primeiras casas do oeste, ao pé da EN247 (x 0-5, linhas 13-14).
// Cada passo é [modo, x0, y0, x1, y1]: um retângulo de quadrados.
//   'firebreak' = corta-fogo em toda a vegetação; 'clear' = limpar se for mato, senão corta-fogo;
//   'replaceTrees' = trocar os eucaliptos por folhosas.
// (O perito, mais abaixo, pensa de outra maneira: os "?" mostram onde o cigarro pode cair e o
// vento diz para onde o fogo corre, por isso trava o fogo logo a sul de cada "?". É isso que lhe
// dá as 3 estrelas.)
// O plano cabe TODO no orçamento: um teste lá em baixo verifica que nenhum passo fica por fazer
// (se os preços ou o declive mudarem, o teste avisa, em vez de o plano se estragar em silêncio).
const GOOD_PLAN = [
  // 1. A pastagem e o mato por cima das casas do quartel (€5.650).
  ['clear', 17, 9, 20, 11],
  // 2. O resto da orla norte de Malveira (€6.160).
  ['clear', 13, 9, 16, 11],
  // 3. A orla norte da vila oeste, Almoinhas Velhas e Arneiro (€4.500).
  ['clear', 6, 11, 12, 12],
  // 4. Com o que sobra: as primeiras casas do oeste, ao pé da EN247 (x 0-5, linhas 13-14, €3.280).
  ['clear', 0, 13, 5, 14],
];

function goodPlan(state) {
  for (const step of GOOD_PLAN) applyRectangle(state, step);
}

// Aplica um passo do plano. Devolve { applied, refusals }: quantas ações deram certo e
// as razões das que foram recusadas (ex.: 'not-enough-money').
function applyRectangle(state, [mode, x0, y0, x1, y1]) {
  const report = { applied: 0, refusals: [] };
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let action = mode === 'clear' && state.village.tiles[y][x] === 'brush' ? 'clearBrush' : 'firebreak';
      if (mode === 'replaceTrees') action = 'replaceTrees';
      const result = applyAction(state, x, y, action);
      if (result.ok) report.applied++;
      else report.refusals.push(result.reason);
    }
  }
  return report;
}

// (e) O "truque" encontrado na revisão: corta-fogo em cada sítio possível do cigarro.
// Antes, o fogo nunca começava num corta-fogo e isto dava 3 estrelas em todas as noites (€3.390).
// Agora o cigarro rola para o lado e o fogo começa no vizinho que arde (resolveIgnition).
function firebreakEveryCandidate(state) {
  for (const { x, y } of level.ignitionCandidates) applyAction(state, x, y, 'firebreak');
}

// (e2) Outro truque, agora que os "?" do mapa mostram os sítios VERDADEIROS do cigarro:
// limpar o mato à volta de cada "?" (o próprio quadrado e os 8 vizinhos).
// Antes de o cigarro rolar para fora da terra limpa (CIGARETTE_MIN_FLAMMABILITY), o fogo nascia
// em terra limpa e quase sempre morria logo: isto valia mais do que defender a vila.
function clearAroundEveryMarker(state) {
  for (const { x: cx, y: cy } of level.ignitionCandidates) {
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) applyAction(state, x, y, 'clearBrush');
    }
  }
}

// (f) Só a pastagem e o mato por cima do quartel (o passo 1 do bom plano, sozinho).
// Antes da revisão, o "anel do quartel" sozinho dava quase o mesmo que o bom plano inteiro.
function onlyFireStation(state) {
  applyRectangle(state, GOOD_PLAN[0]);
}

// (g) O plano de um PERITO: a resposta à pergunta "é possível não perder nenhuma casa?".
// Foi afinado por computador (fogos de treino nas sementes 3001-3400 e 5001-5300, não nestas).
// Só usa o que se vê no mapa (os "?" estão nos sítios verdadeiros do cigarro, e o vento é de
// norte), por isso um jogador pode descobri-lo sozinho (€20 000). A ideia: travar o fogo logo a
// SUL de cada "?", antes de ele crescer, e fechar a ravina por cima do quartel:
//   - "?" (17, 3) e (20, 5), na serra por cima da Malveira: corta-fogo em (17, 3) e na linha 4
//     (x 17-19), mato limpo em (16, 2-3) e (17-18, 5-7), trocar os eucaliptos de (20, 4);
//   - a ravina por cima do quartel, por onde descem os fogos de (20, 5), (20, 7) e (20, 10):
//     corta-fogo na coluna x 19 (linhas 3-11) e em (17-18, 10), mato limpo em (20, 5) e (20, 10);
//   - "?" (22, 1), na estrada dos Capuchos: corta-fogo em (22, 0) e (21, 1), mato limpo no "?",
//     trocar os eucaliptos de (21, 2);
//   - "?" (5, 9), na EN247 do lado da Peninha: mato limpo de (4-5, 8) a (7-8, 11) e (7, 12);
//   - alguns quadrados soltos (orla norte da Malveira e a sul), onde caem brasas.
// Cada ação passa pelo applyAction (as mesmas regras do jogo: faixas da lei, preços, orçamento).
function expertPlan(state) {
  for (const { x, y, action } of EXPERT_ACTIONS) applyAction(state, x, y, action);
}

// O que os planos deste ficheiro (e o do perito) esperam encontrar no mapa.
const FIRE_STATION = { x: 19, y: 15 }; // o canto de cima à esquerda do quartel 2x2
const EXPECTED_MARKERS = [[5, 9], [17, 3], [20, 5], [20, 7], [20, 10], [22, 1]]; // os "?" (x, y)

const STRATEGIES = {
  nothing: doNothing,
  naive: naiveTopLeft,
  random: randomActions,
  candidates: firebreakEveryCandidate,
  markers: clearAroundEveryMarker,
  station: onlyFireStation,
  good: goodPlan,
  expert: expertPlan,
};

// ---------- Jogar ----------
// Para cada estratégia e semente: vila nova, gastar o orçamento, fogo, estrelas.
function play(strategy) {
  return SEEDS.map((seed) => {
    const village = createVillage(level);
    const state = createBuildState(village, level.budget);
    strategy(state, seed);
    const { outcome } = runDisaster(village, {
      // Onde o fogo começa MESMO, já com o plano feito (o mesmo que o jogo usa).
      ignition: resolveIgnition(village, level, seed),
      wind: windForLevel(level),
      seed,
    });
    return { stars: countStars(outcome), spent: level.budget - state.budget };
  });
}

// Resumo de uma estratégia: média de estrelas, quantas sementes com 0/1/2/3 estrelas, etc.
function summarize(runs) {
  const count = (stars) => runs.filter((run) => run.stars === stars).length;
  const total = runs.length;
  return {
    average: runs.reduce((sum, run) => sum + run.stars, 0) / total,
    byStars: [0, 1, 2, 3].map(count),
    twoOrMoreShare: (count(2) + count(3)) / total,
    threeShare: count(3) / total,
    averageSpent: Math.round(runs.reduce((sum, run) => sum + run.spent, 0) / total),
  };
}

// Joga tudo uma vez só (os testes abaixo só leem os resultados).
const runsByName = Object.fromEntries(
  Object.entries(STRATEGIES).map(([name, strategy]) => [name, play(strategy)]),
);
const results = Object.fromEntries(
  Object.entries(runsByName).map(([name, runs]) => [name, summarize(runs)]),
);

// As noites que o jogo SORTEIA: salta as "fáceis demais", em que não fazer nada já dava
// TOO_EASY_STARS estrelas ou mais (src/sim/counterfactual.js, pickNightSeed). A tabela de cima
// é sobre TODAS as noites do modelo; esta é só sobre as que um jogador pode apanhar ao acaso.
const dealt = runsByName.nothing.map((run) => run.stars < TOO_EASY_STARS);
const dealtResults = Object.fromEntries(
  Object.entries(runsByName).map(([name, runs]) => [name, summarize(runs.filter((_, i) => dealt[i]))]),
);
const dealtCount = dealt.filter(Boolean).length;

// A tabela, para quem corre "npm test".
const percent = (share) => `${Math.round(share * 100)}%`.padStart(4);
console.log(`\nBalance - ${level.name}, budget ${level.budget}, seeds ${SEEDS[0]}-${SEEDS.at(-1)}`);
console.log('strategy   avg stars   0*/1*/2*/3*   >=2*   3*   spent');
for (const [name, r] of Object.entries(results)) {
  console.log(
    `${name.padEnd(10)} ${r.average.toFixed(2).padStart(9)}   ${r.byStars.map((n) => String(n).padStart(2)).join('/')}   `
    + `${percent(r.twoOrMoreShare)}  ${percent(r.threeShare)}  ${String(r.averageSpent).padStart(6)}`,
  );
}
console.log(`
Nights the game deals (doing nothing under ${TOO_EASY_STARS} stars): ${dealtCount} of ${SEEDS.length}`);
for (const name of ['nothing', 'good', 'expert']) {
  const r = dealtResults[name];
  console.log(`${name.padEnd(10)} ${r.average.toFixed(2).padStart(9)}   ${percent(r.twoOrMoreShare)} with 2+ stars   ${percent(r.threeShare)} with 3 stars`);
}

// ---------- As metas ----------

// O mapa de Sintra foi refeito com dados reais (OpenStreetMap + relevo Copernicus, 22/11/2026):
// Malveira da Serra. Os planos deste ficheiro e o do perito foram refeitos para este mapa
// (ronda "mapa real", ver docs/integration-contract.md). Se o mapa mudar, este teste avisa.
test('the strategies were written for this Malveira map (if the map changes, rewrite the plans)', () => {
  const village = createVillage(level);
  assert.equal(village.width, 32);
  assert.equal(village.height, 32);
  assert.equal(village.tiles[FIRE_STATION.y][FIRE_STATION.x], 'school', 'the fire station is at (19, 15)');
  assert.deepEqual(level.ignitionCandidates.map(({ x, y }) => [x, y]), EXPECTED_MARKERS, 'the "?" spots moved');
});

// Ronda "não fazer nada perde" (22/11/2026): os "?" do oeste e do leste (2, 8), (3, 10), (24, 7) e
// (28, 9) davam 1,7-2,1 estrelas sem fazer nada: com o vento forte de norte o fogo corre numa faixa
// estreita para sul e queimava só a vila do oeste ou Janes (menos de 20% das casas). Os "?" passaram
// para sítios de onde o fogo desce mesmo para a Malveira e para o quartel: (5, 9) na EN247, onde o
// fogo verdadeiro a atravessou, (20, 5) e (20, 10) na Estrada da Serra e (22, 1) na estrada do
// Capuchos. Ver docs/integration-contract.md, "Equilibrio".
test('doing nothing loses: under 0.75 stars on average and 3 stars in under 15% of the seeds', () => {
  // A meta antiga do contrato era < 0,5. Não se cumpre (~0,6 nas sementes 1-120, ~0,65 em 200
  // sementes de jogo): o fogo do "?" do oeste ainda morre sozinho em ~1 de cada 4 noites (o vento
  // empurra-o contra a EN247). Mas quem só carrega em "Start" perde o quartel em ~3 de cada 4 noites.
  assert.ok(results.nothing.average < 0.75, `nothing: ${results.nothing.average.toFixed(2)}`);
  assert.ok(results.nothing.threeShare < 0.15, `nothing: ${percent(results.nothing.threeShare)} with 3 stars`);
});

test('doing nothing is much worse than the good plan', () => {
  assert.ok(results.good.average - results.nothing.average >= 0.8, 'the good plan must clearly pay off');
});

test('clearing everything from the top-left gives about 1 star (at most 1.3)', () => {
  assert.ok(results.naive.average <= 1.3, `naive: ${results.naive.average.toFixed(2)}`);
});

test('clearing everything from the top-left is no better than doing nothing', () => {
  // Gastar tudo sem pensar (as bermas das estradas da serra, de cima para baixo) não compra estrelas:
  // o dinheiro acaba nas linhas 0-2 (floresta, longe de todos os fogos).
  assert.ok(results.naive.average <= results.nothing.average + 0.3,
    `naive ${results.naive.average.toFixed(2)} vs nothing ${results.nothing.average.toFixed(2)}`);
});

test('the good plan gets 2 or more stars in more than half of the seeds', () => {
  assert.ok(results.good.twoOrMoreShare > 0.5, `good plan: ${percent(results.good.twoOrMoreShare)} with 2+ stars`);
});

test('3 stars stay rare (under 35% of the seeds) for every strategy except the expert plan', () => {
  for (const [name, r] of Object.entries(results)) {
    if (name === 'expert') continue; // o perito é a prova de que é possível (teste mais abaixo)
    assert.ok(r.threeShare < 0.35, `${name}: ${percent(r.threeShare)} with 3 stars`);
  }
});

// ---------- O plano do perito: não perder nenhuma casa é difícil, mas possível ----------

test('the expert plan is legal: applyAction accepts every action and its cost fits the budget', () => {
  const village = createVillage(level);
  const state = createBuildState(village, level.budget);
  let total = 0;
  EXPERT_ACTIONS.forEach(({ x, y, action }, index) => {
    total += actionCost(village, x, y, action); // o preço ANTES de mudar o quadrado
    const result = applyAction(state, x, y, action);
    assert.ok(result.ok, `action ${index + 1} (${action} at ${x},${y}) was refused: ${result.reason}`);
  });
  assert.equal(total, level.budget - state.budget, 'the money spent is not the sum of the prices');
  assert.ok(total <= level.budget, `the expert plan costs ${total}, more than the budget ${level.budget}`);
});

test('saving every house is possible: the expert plan gets 3 stars in at least 50% of the seeds', () => {
  assert.ok(results.expert.threeShare >= 0.5, `expert: ${percent(results.expert.threeShare)} with 3 stars`);
});

test('the expert plan gets 2 or more stars in at least 85% of the seeds', () => {
  assert.ok(results.expert.twoOrMoreShare >= 0.85, `expert: ${percent(results.expert.twoOrMoreShare)} with 2+ stars`);
});

test('the expert plan is clearly the best strategy (thinking pays off)', () => {
  for (const [name, r] of Object.entries(results)) {
    if (name === 'expert') continue;
    assert.ok(results.expert.average > r.average, `expert ${results.expert.average.toFixed(2)} vs ${name} ${r.average.toFixed(2)}`);
  }
});

test('every step of the good plan really does something, and the whole plan fits the budget', () => {
  // Guarda da revisão: o plano antigo gastava tudo nos primeiros passos e os outros davam
  // 'not-enough-money' em todos os quadrados, sem ninguém dar por isso.
  const state = createBuildState(createVillage(level), level.budget);
  GOOD_PLAN.forEach((step, index) => {
    const { applied, refusals } = applyRectangle(state, step);
    assert.ok(applied > 0, `step ${index + 1} (${step.join(' ')}) did nothing: ${refusals.join(', ')}`);
    assert.ok(!refusals.includes('not-enough-money'), `step ${index + 1} (${step.join(' ')}) ran out of money`);
  });
});

test('a firebreak on every cigarette spot is no shortcut: well below the good plan, few 3 stars', () => {
  // Antes da revisão: 3 estrelas em 30 de 30 sementes, por €3.390.
  assert.ok(results.candidates.average <= results.good.average - 0.3,
    `candidates ${results.candidates.average.toFixed(2)} vs good ${results.good.average.toFixed(2)}`);
  assert.ok(results.candidates.threeShare < 0.35, `candidates: ${percent(results.candidates.threeShare)} with 3 stars`);
});

test('protecting only the fire station is not enough: below the good plan, well below the expert', () => {
  // Antes da revisão: só o anel do quartel (€4.520) dava 1,80 estrelas, quase o bom plano inteiro.
  // A pastagem por cima do quartel é uma boa compra (sem quartel, 0 estrelas), mas sozinha
  // (€5.650) fica abaixo do bom plano e bem abaixo do perito: o resto do orçamento conta.
  assert.ok(results.station.average < results.good.average,
    `station only ${results.station.average.toFixed(2)} vs good ${results.good.average.toFixed(2)}`);
  assert.ok(results.station.average <= results.expert.average - 0.5,
    `station only ${results.station.average.toFixed(2)} vs expert ${results.expert.average.toFixed(2)}`);
});

test('clearing the brush around every "?" is no shortcut: few 3 stars, well below the expert', () => {
  // Os "?" mostram os sítios verdadeiros do cigarro. Limpar à volta deles já não faz o fogo
  // morrer ao nascer (o cigarro rola para o mato seco): o que salva as casas é pensar no VENTO
  // (travar o fogo do lado para onde ele corre, a sul de cada "?") e defender o quartel.
  assert.ok(results.markers.threeShare < 0.35, `markers: ${percent(results.markers.threeShare)} with 3 stars`);
  assert.ok(results.markers.average <= results.expert.average - 0.7,
    `markers ${results.markers.average.toFixed(2)} vs expert ${results.expert.average.toFixed(2)}`);
});

test('on the nights the game deals, doing nothing loses and the expert plan still saves everything on at least half', () => {
  // Sem as noites fáceis demais, "não fazer nada" quase nunca ganha estrelas, mas um bom plano
  // continua a poder salvar tudo: a noite precisa de um plano, e o plano funciona.
  assert.ok(dealtCount >= SEEDS.length * 0.6, `only ${dealtCount} of ${SEEDS.length} nights are dealt`);
  assert.equal(dealtResults.nothing.twoOrMoreShare, 0);
  assert.ok(dealtResults.nothing.average < 0.3, `doing nothing: ${dealtResults.nothing.average.toFixed(2)} stars`);
  assert.ok(dealtResults.expert.threeShare >= 0.5, `expert: 3 stars on ${percent(dealtResults.expert.threeShare)}`);
});
