// O relatório do playtest (src/sim/playtestReport.js): as contas da página playtest-results.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizePlaytests, filterSessions, validTry, MIN_PLAYERS_TO_REPORT } from '../src/sim/playtestReport.js';

// 2 perguntas de exemplo: a resposta certa é a opção 1 na primeira e a 0 na segunda.
const QUESTIONS = [
  { id: 'wind', question: 'Where does the fire go?', options: ['a', 'b'], answer: 1 },
  { id: 'strip', question: 'How wide is the strip?', options: ['a', 'b'], answer: 0 },
];

const session = (overrides) => ({
  version: 'v1', device: 'computer', before_answers: null, after_answers: null,
  tries: [], choices_mattered: null, confusing: null, finished: false, ...overrides,
});

test('learning counts only players who did both quizzes, question by question', () => {
  const report = summarizePlaytests([
    session({ before_answers: [0, 0], after_answers: [1, 0], finished: true }), // aprendeu a 1.a, já sabia a 2.a
    session({ before_answers: [1, 1], after_answers: [0, 0] }),                 // piorou a 1.a, aprendeu a 2.a
    session({ before_answers: [0, 0] }),                                        // não acabou: não conta
  ], QUESTIONS);
  assert.equal(report.learning.players, 2);
  assert.equal(report.learning.averageBefore, 1);   // antes: 1 certa ([0,0] acerta a 2.a) e 1 certa ([1,1] acerta a 1.a)
  assert.equal(report.learning.averageAfter, 1.5);  // depois: 2 certas e 1 certa
  assert.deepEqual(report.learning.perQuestion[0], { id: 'wind', question: 'Where does the fire go?', improved: 1, kept: 0, missed: 0, worse: 1 });
  assert.deepEqual(report.learning.perQuestion[1], { id: 'strip', question: 'How wide is the strip?', improved: 1, kept: 1, missed: 0, worse: 0 });
  assert.equal(report.learning.enough, false, `under ${MIN_PLAYERS_TO_REPORT} players there is not enough to publish`);
  assert.equal(report.finished, 1);
});

test('play: first try against the best try, and how many used "Try again" (not "Play again")', () => {
  const report = summarizePlaytests([
    session({ tries: [{ stars: 0, saved: 100, actions: 10 }, { stars: 2, saved: 181, actions: 30, retry: true }] }),
    session({ tries: [{ stars: 1, saved: 150, actions: 20 }] }),
  ], QUESTIONS);
  assert.equal(report.play.players, 2);
  assert.equal(report.play.averageTries, 1.5);
  assert.equal(report.play.usedTryAgain, 1);
  assert.deepEqual(report.play.firstStars, [1, 1, 0, 0]);
  assert.deepEqual(report.play.bestStars, [0, 1, 1, 0]);
  assert.equal(report.play.averageFirstSaved, 125);
  assert.equal(report.play.averageBestSaved, 165.5);
  assert.equal(report.play.averageFirstActions, 15);
});

test('devices, the "did your choices matter" answers (only from players who finished) and the comments', () => {
  const report = summarizePlaytests([
    session({ device: 'phone', choices_mattered: 'yes', confusing: 'the map is small on my phone', finished: true }),
    session({ device: 'computer', choices_mattered: 'a-little', finished: true }),
    session({ device: 'tablet', finished: true }),
    session({ device: 'computer' }), // fechou a meio: não conta nas respostas
  ], QUESTIONS);
  assert.deepEqual(report.devices, { phone: 1, tablet: 1, computer: 2, other: 0 });
  assert.deepEqual(report.choices, { yes: 1, 'a-little': 1, no: 0, none: 1 });
  assert.equal(report.notReached, 1);
  assert.deepEqual(report.comments, ['the map is small on my phone']);
});

test('"Play again" (another night) does not count as "Try again"', () => {
  const report = summarizePlaytests([
    session({ tries: [{ stars: 0, saved: 120 }, { stars: 0, saved: 110, retry: false }] }),
  ], QUESTIONS);
  assert.equal(report.play.usedTryAgain, 0);
});

test('strange rows from the open database do not break the report', () => {
  const report = summarizePlaytests([
    session({ device: 'toString', choices_mattered: '__proto__', finished: true, tries: [null, 'x', { stars: 9, saved: 1e9 }, { stars: 2, saved: 181 }] }),
  ], QUESTIONS);
  assert.deepEqual(report.devices, { phone: 0, tablet: 0, computer: 0, other: 1 });
  assert.equal(report.choices.none, 1);
  assert.equal(report.play.players, 1);
  assert.equal(report.play.averageFirstSaved, 181, 'only the valid try counts');
  assert.equal(validTry(null), false);
  assert.equal(validTry({ stars: 2, saved: 195, total: 194 }), false);
  assert.equal(validTry({ stars: 3, saved: 194, total: 194 }), true);
});

test('test sessions are hidden unless asked for, and one version can be picked', () => {
  const sessions = [session({ version: 'test' }), session({ version: 'v1' }), session({ version: 'v2' })];
  assert.equal(filterSessions(sessions).length, 2);
  assert.equal(filterSessions(sessions, { showTests: true }).length, 3);
  assert.deepEqual(filterSessions(sessions, { version: 'v2' }).map((s) => s.version), ['v2']);
});

test('an empty list gives zeros and nulls, not errors', () => {
  const report = summarizePlaytests([], QUESTIONS);
  assert.equal(report.sessions, 0);
  assert.equal(report.learning.averageBefore, null);
  assert.equal(report.play.averageTries, null);
});
