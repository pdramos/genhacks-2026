// "E SE...?" (a comparação da mesma noite): no fim do jogo, o jogo volta a jogar a MESMA noite
// (o mesmo nível, a mesma semente, o mesmo vento) sem fazer nada e com o plano do perito,
// e compara com o que o jogador fez. Daí saem 0 a 2 frases curtas com uma lição.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createVillage } from '../src/sim/village.js';
import { createBuildState, applyAction } from '../src/sim/actions.js';
import { runDisaster } from '../src/sim/fire.js';
import { resolveIgnition, pickIgnition } from '../src/sim/ignition.js';
import { windForLevel } from '../src/sim/weather.js';
import { countStars } from '../src/sim/stars.js';
import { playPlan, compareNight, nightLessons, luckyAndUntested } from '../src/sim/counterfactual.js';

const level = JSON.parse(readFileSync(new URL('../data/levels/sintra.json', import.meta.url), 'utf8'));
const EXPERT_ACTIONS = level.expertPlan.actions;

// ---------- playPlan: jogar uma noite inteira com uma lista de ações ----------

// Uma noite "à mão", com os mesmos passos do tests/balance.test.js.
function playByHand(seed, actions) {
  const village = createVillage(level);
  const state = createBuildState(village, level.budget);
  for (const { x, y, action } of actions) applyAction(state, x, y, action);
  const { outcome } = runDisaster(village, {
    ignition: resolveIgnition(village, level, seed),
    wind: windForLevel(level),
    seed,
  });
  return outcome;
}

test('the level carries the expert plan (description and a list of actions)', () => {
  assert.equal(typeof level.expertPlan.description, 'string');
  assert.ok(EXPERT_ACTIONS.length > 0);
  for (const { x, y, action } of EXPERT_ACTIONS) {
    assert.ok(Number.isInteger(x) && Number.isInteger(y), 'x and y are whole numbers');
    assert.ok(['clearBrush', 'firebreak', 'replaceTrees'].includes(action), `unknown action ${action}`);
  }
});

test('playPlan gives the same result as playing the night by hand', () => {
  for (const seed of [1, 7]) {
    for (const actions of [[], EXPERT_ACTIONS]) {
      const byHand = playByHand(seed, actions);
      assert.deepEqual(playPlan(level, seed, actions), {
        housesSaved: byHand.housesSaved,
        housesTotal: byHand.housesTotal,
        schoolSaved: byHand.schoolSaved,
        stars: countStars(byHand),
      });
    }
  }
});

test('playPlan is deterministic: the same night twice gives the same result', () => {
  assert.deepEqual(playPlan(level, 7, EXPERT_ACTIONS), playPlan(level, 7, EXPERT_ACTIONS));
});

test('playPlan skips refused actions (no money, outside the map) instead of crashing', () => {
  const tooMuch = Array.from({ length: 200 }, (_, i) => ({ x: i % 32, y: 31, action: 'firebreak' }));
  const outside = [{ x: 99, y: 99, action: 'clearBrush' }];
  assert.doesNotThrow(() => playPlan(level, 7, [...tooMuch, ...outside]));
});

test('playPlan does not change the level', () => {
  const before = JSON.stringify(level);
  playPlan(level, 7, EXPERT_ACTIONS);
  assert.equal(JSON.stringify(level), before);
});

// ---------- compareNight: o jogador, "não fazer nada" e o perito, na mesma noite ----------

test('compareNight: nothing and expert are the same as playPlan; player gets its stars', () => {
  const seed = 7;
  const playerOutcome = { housesSaved: 40, housesTotal: 50, schoolSaved: true, burnedCount: 99 };
  const night = compareNight(level, seed, playerOutcome);
  assert.deepEqual(night.nothing, playPlan(level, seed, []));
  assert.deepEqual(night.expert, playPlan(level, seed, EXPERT_ACTIONS));
  assert.equal(night.player.stars, countStars(playerOutcome));
  assert.equal(night.player.burnedCount, 99, 'the rest of the player outcome is kept');
});

test('compareNight: a level without an expert plan gives expert = null', () => {
  const { expertPlan, ...levelWithoutExpert } = level;
  const night = compareNight(levelWithoutExpert, 7, { housesSaved: 0, housesTotal: 50, schoolSaved: false });
  assert.equal(night.expert, null);
});

// Procura nas sementes 1-60 uma noite "com sorte" (não fazer nada dá 3 estrelas) e uma sem sorte.
// Com o mapa de Sintra, não fazer nada dá 3 estrelas em ~12% das noites.
test('compareNight: lucky = doing nothing would have saved every house and the school', () => {
  let luckySeed = null, unluckySeed = null;
  for (let seed = 1; seed <= 60 && (luckySeed === null || unluckySeed === null); seed++) {
    if (playPlan(level, seed, []).stars === 3) luckySeed ??= seed;
    else unluckySeed ??= seed;
  }
  assert.ok(luckySeed !== null, 'no lucky night in seeds 1-60');
  assert.ok(unluckySeed !== null, 'no unlucky night in seeds 1-60');
  const anyOutcome = { housesSaved: 0, housesTotal: 50, schoolSaved: false };
  assert.equal(compareNight(level, luckySeed, anyOutcome).lucky, true, `seed ${luckySeed}`);
  assert.equal(compareNight(level, unluckySeed, anyOutcome).lucky, false, `seed ${unluckySeed}`);
});

// O jogo corre o compareNight no navegador, no fim de cada noite: tem de ser rápido.
test('compareNight is fast enough to run at the end of a game', () => {
  const playerOutcome = { housesSaved: 40, housesTotal: 50, schoolSaved: true };
  compareNight(level, 7, playerOutcome); // a primeira vez "aquece" o Node
  const start = performance.now();
  compareNight(level, 8, playerOutcome);
  const ms = performance.now() - start;
  console.log(`\ncompareNight (seed 8, two extra nights): ${ms.toFixed(1)} ms`);
  assert.ok(ms < 200, `compareNight took ${ms.toFixed(0)} ms (the goal is well under 200 ms)`);
});

// ---------- nightLessons: as frases do fim da noite ----------

// Resultados "feitos à mão" (sem correr o fogo), para testar cada regra sozinha.
const result = (housesSaved, schoolSaved = true, housesTotal = 50) =>
  ({ housesSaved, housesTotal, schoolSaved, stars: countStars({ housesSaved, housesTotal, schoolSaved }) });

// Uma noite base: o jogador salvou mais do que "não fazer nada", perto do perito, gastou tudo.
// Nenhuma regra dispara aqui; cada teste muda só uma coisa.
const baseNight = {
  player: result(45),
  nothing: result(20),
  expert: result(48),
  lucky: false,
  spent: 20000,
  budget: 20000,
  windFrom: 'N',
  schoolName: 'Fire station',
};

test('nightLessons: a quiet night (nothing to say) gives no lessons', () => {
  assert.deepEqual(nightLessons(baseNight), []);
});

test('nightLessons: a lucky night says so, and nothing about the plan', () => {
  const lessons = nightLessons({ ...baseNight, lucky: true, nothing: result(50), player: result(50), spent: 0 });
  assert.equal(lessons.length, 1);
  assert.match(lessons[0], /^Lucky night/);
  assert.match(lessons[0], /Play again/);
});

// Visto no jogo (semente 20): sem fazer nada o fogo morria logo, mas o jogador pôs um corta-fogo
// no "?", o fogo começou ao lado e queimou a vila. Aí não se diz "noite com sorte".
test('nightLessons: a lucky night where the player did worse tells the truth, not "lucky"', () => {
  const lessons = nightLessons({ ...baseNight, lucky: true, movedStart: true, nothing: result(50), player: result(30, false), expert: result(50) });
  assert.match(lessons[0], /^You lost the fire station/);
  assert.equal(lessons[1], 'Doing nothing would have saved every house tonight: work on a ? spot only moves the start to the dry scrub beside it.');
  assert.ok(!lessons.some((lesson) => /^Lucky night|no more houses than doing nothing/.test(lesson)));
});

// Visto pelo revisor (semente 34): o jogador não tocou em nenhum "?" (o fogo começou no mesmo
// sítio), mas ficou abaixo das 3 estrelas. Aí não se pode culpar o trabalho no "?".
test('nightLessons: a worse lucky night without moving the start does not blame the ? spot', () => {
  const lessons = nightLessons({ ...baseNight, lucky: true, movedStart: false, nothing: result(50), player: result(45), expert: result(50) });
  assert.equal(lessons[0], 'Doing nothing would have saved every house tonight: your changes sent the fire a different way.');
});

test('compareNight: movedStart says whether the player moved the start of the fire', () => {
  const anyOutcome = { housesSaved: 0, housesTotal: 50, schoolSaved: false };
  const picked = pickIgnition(level, 34);
  assert.equal(compareNight(level, 34, anyOutcome, picked).movedStart, false);
  assert.equal(compareNight(level, 34, anyOutcome, { x: picked.x + 1, y: picked.y }).movedStart, true);
  assert.equal(compareNight(level, 34, anyOutcome).movedStart, false, 'no start given');
});

test('compareNight: the "Lucky night" banner only when the night was lucky AND the player got 3 stars', () => {
  assert.equal(luckyAndUntested(true, result(50)), true);
  assert.equal(luckyAndUntested(true, result(45)), false);
  assert.equal(luckyAndUntested(false, result(50)), false);
  const night = compareNight(level, 7, { housesSaved: 0, housesTotal: 50, schoolSaved: false });
  assert.equal(night.showLuckyBanner, false);
});

test('nightLessons: losing the school comes first and names it in lower case', () => {
  const lessons = nightLessons({ ...baseNight, player: result(45, false) });
  assert.match(lessons[0], /^You lost the fire station: without it there are no stars\./);
});

test('nightLessons: saving no more houses than doing nothing points downwind', () => {
  const lessons = nightLessons({ ...baseNight, player: result(20), expert: result(25) });
  assert.match(lessons[0], /^Your work saved no more houses than doing nothing\./);
  assert.match(lessons[0], /The wind blows from the north: work just south \(downwind\) of the \? spots\./);
});

test('nightLessons: saving the school that doing nothing lost is not "no better than nothing"', () => {
  // Sem fazer nada: mais casas, mas sem quartel (0 estrelas). O jogador: menos casas, com quartel.
  const lessons = nightLessons({ ...baseNight, player: result(40), nothing: result(45, false), expert: result(48) });
  assert.ok(!lessons.some((lesson) => /no more houses than doing nothing/.test(lesson)));
});

test('nightLessons: the downwind direction is the opposite of where the wind comes from', () => {
  const downwind = (windFrom) => nightLessons({ ...baseNight, player: result(20), expert: result(25), windFrom })[0];
  assert.match(downwind('NE'), /from the north-east: work just south-west/);
  assert.match(downwind('W'), /from the west: work just east/);
  assert.match(downwind('SSE'), /from the south-south-east: work just north-north-west/);
  assert.match(downwind('?'), /^Your work saved no more houses than doing nothing\. Work just downwind/);
});

test('nightLessons: the expert saving 10+ more houses on the same night is a lesson', () => {
  const lessons = nightLessons({ ...baseNight, player: result(30), expert: result(48) });
  assert.deepEqual(lessons, ['On this same night the expert plan saved 18 more houses: firebreaks and cleared scrub on and just downwind of the ? spots, and in the ravine above the fire station.']);
  // 9 a mais não chega para ser lição.
  assert.deepEqual(nightLessons({ ...baseNight, player: result(39), expert: result(48) }), []);
});

test('nightLessons: leaving more than 25% of the budget unspent is a lesson (with €4,300 style money)', () => {
  const lessons = nightLessons({ ...baseNight, budget: 10000, spent: 5700 }); // sobram 43%
  assert.deepEqual(lessons, ['You left €4,300 unspent: every euro in the right strip counts.']);
  // Sobrar exatamente 25% (€5,000 de €20,000) ainda não é lição.
  assert.deepEqual(nightLessons({ ...baseNight, spent: 15000 }), []);
});

test('nightLessons: no "unspent" lesson after a 3-star night', () => {
  assert.deepEqual(nightLessons({ ...baseNight, player: result(50), expert: result(50), spent: 0 }),
    ['You matched the expert plan on this night!']);
});

test('nightLessons: matching or beating the expert plan is praised', () => {
  assert.deepEqual(nightLessons({ ...baseNight, player: result(48) }), ['You matched the expert plan on this night!']);
  assert.deepEqual(nightLessons({ ...baseNight, player: result(49) }), ['You beat the expert plan on this night!']);
  // Sem o quartel não há elogio, mesmo com as casas todas.
  const noSchool = nightLessons({ ...baseNight, player: result(50, false) });
  assert.ok(!noSchool.some((lesson) => /expert plan on this night/.test(lesson)));
});

// Visto pelo revisor: o jogador e o perito perdem os dois o quartel (0 estrelas cada um).
test('nightLessons: no praise when the player lost the school, even if the expert lost it too', () => {
  const lessons = nightLessons({ ...baseNight, player: result(40, false), nothing: result(20, false), expert: result(30, false) });
  assert.match(lessons[0], /^You lost the fire station/);
  assert.ok(!lessons.some((lesson) => /expert plan on this night/.test(lesson)));
});

// Visto pelo revisor (semente 74): há noites em que o perito faz PIOR do que não fazer nada.
// Um jogador igual a "não fazer nada" não pode ouvir "não fizeste melhor do que nada" e
// "bateste o perito" ao mesmo tempo.
test('nightLessons: "no better than doing nothing" and "beat the expert" never come together', () => {
  const lessons = nightLessons({ ...baseNight, player: result(40), nothing: result(40), expert: result(30) });
  assert.match(lessons[0], /^Your work saved no more houses than doing nothing/);
  assert.ok(!lessons.some((lesson) => /expert plan on this night/.test(lesson)));
  // O mesmo numa noite com sorte em que o jogador piorou e o perito ainda mais.
  const worse = nightLessons({ ...baseNight, lucky: true, nothing: result(50), player: result(45), expert: result(40) });
  assert.match(worse[0], /^Doing nothing would have saved every house tonight/);
  assert.ok(!worse.some((lesson) => /expert plan on this night/.test(lesson)));
});

test('nightLessons: no expert plan in the level means no expert lessons', () => {
  assert.deepEqual(nightLessons({ ...baseNight, player: result(30), expert: null }), []);
});

test('nightLessons: never more than 2 lessons, the most useful first, no repeats', () => {
  // Tudo correu mal: perdeu o quartel, não fez melhor do que nada, o perito fez muito melhor, sobrou dinheiro.
  const lessons = nightLessons({ ...baseNight, player: result(10, false), nothing: result(12), expert: result(48), spent: 5000 });
  assert.equal(lessons.length, 2);
  assert.match(lessons[0], /^You lost the fire station/);
  assert.match(lessons[1], /^Your work saved no more houses than doing nothing/);
  assert.equal(new Set(lessons).size, lessons.length);
});

test('nightLessons: with the downwind tip already given, the expert lesson does not repeat it', () => {
  const lessons = nightLessons({ ...baseNight, player: result(10), nothing: result(12), expert: result(48) });
  assert.equal(lessons.length, 2);
  assert.match(lessons[0], /downwind/);
  assert.equal(lessons[1], 'On this same night the expert plan saved 38 more houses.');
});
