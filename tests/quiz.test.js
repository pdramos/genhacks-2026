// Testes do questionário de "antes e depois" dos playtests (src/sim/quiz.js e data/quiz.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRandom } from '../src/sim/random.js';
import {
  scoreQuiz, questionOutcomes, shuffledOrder, makeSession, parseSessions, summarizeSessions, sessionsToCsv,
} from '../src/sim/quiz.js';

const quiz = JSON.parse(readFileSync(new URL('../data/quiz.json', import.meta.url), 'utf8'));

// Três perguntas pequenas, feitas à mão: as respostas certas são 0, 2 e 1.
const QUESTIONS = [
  { id: 'a', options: ['x', 'y', 'z'], answer: 0 },
  { id: 'b', options: ['x', 'y', 'z', 'w'], answer: 2 },
  { id: 'c', options: ['x', 'y', 'z'], answer: 1 },
];

// ---------- data/quiz.json ----------

test('the quiz file has 5 questions, each with 3-4 options, one right answer and an explanation', () => {
  assert.equal(quiz.questions.length, 5);
  const ids = new Set();
  for (const question of quiz.questions) {
    assert.ok(question.id && !ids.has(question.id), `id repetido ou em falta: ${question.id}`);
    ids.add(question.id);
    assert.ok(question.question.length > 10, question.id);
    assert.ok(question.options.length >= 3 && question.options.length <= 4, question.id);
    assert.equal(new Set(question.options).size, question.options.length, `opções repetidas em ${question.id}`);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, question.id);
    assert.ok(question.explanation.length > 10, question.id);
  }
});

test('the law question uses the same widths as "The law" card of the Sintra level', () => {
  const level = JSON.parse(readFileSync(new URL('../data/levels/sintra.json', import.meta.url), 'utf8'));
  const law = quiz.questions.find((question) => question.id === 'law-houses');
  const houses = level.law.strips.find((strip) => strip.where.startsWith('around houses'));
  assert.equal(law.options[law.answer], houses.width);
});

// ---------- scoreQuiz ----------

test('scoreQuiz counts the right answers and says which ones were right', () => {
  assert.deepEqual(scoreQuiz(QUESTIONS, [0, 1, 1]), { correct: 2, total: 3, perQuestion: [true, false, true] });
});

test('scoreQuiz counts a missing answer (null, or a short list) as wrong', () => {
  assert.deepEqual(scoreQuiz(QUESTIONS, [null, 2]), { correct: 1, total: 3, perQuestion: [false, true, false] });
  assert.equal(scoreQuiz(QUESTIONS, undefined).correct, 0);
});

// ---------- questionOutcomes ----------

test('questionOutcomes says, per question, if the player improved, kept, missed or got worse', () => {
  const before = scoreQuiz(QUESTIONS, [1, 2, 0]); // errada, certa, errada
  const after = scoreQuiz(QUESTIONS, [0, 0, 0]); //  certa, errada, errada
  assert.deepEqual(questionOutcomes(before, after), ['improved', 'worse', 'missed']);
  assert.deepEqual(questionOutcomes(after, after), ['kept', 'missed', 'missed']);
});

// ---------- shuffledOrder ----------

test('shuffledOrder uses every option once', () => {
  const order = shuffledOrder(4, createRandom(7));
  assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
});

test('shuffledOrder gives the same order for the same seed', () => {
  assert.deepEqual(shuffledOrder(4, createRandom(99)), shuffledOrder(4, createRandom(99)));
});

test('shuffledOrder never gives back the original order', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const length of [2, 3, 4]) {
      const order = shuffledOrder(length, createRandom(seed));
      assert.ok(order.some((value, i) => value !== i), `seed ${seed}, ${length} opções`);
    }
  }
});

// ---------- As sessões guardadas ----------

test('makeSession keeps only the answers, the scores and the time', () => {
  const session = makeSession(QUESTIONS, [1, 2, 0], [0, 2, 1], 1700000000000);
  assert.deepEqual(session, {
    time: 1700000000000, before: [1, 2, 0], after: [0, 2, 1], beforeScore: 1, afterScore: 3, total: 3,
  });
});

test('parseSessions reads saved sessions and ignores broken text or broken sessions', () => {
  const good = makeSession(QUESTIONS, [0, null, 1], [0, 2, 1], 5);
  assert.deepEqual(parseSessions(JSON.stringify([good])), [good]);
  assert.deepEqual(parseSessions(null), []);
  assert.deepEqual(parseSessions('not json'), []);
  assert.deepEqual(parseSessions('{"a":1}'), []);
  const broken = [{ time: 'yesterday', before: [], after: [] }, { time: 1, before: ['A'], after: [] }, null];
  assert.deepEqual(parseSessions(JSON.stringify([...broken, good])), [good]);
});

// ---------- summarizeSessions ----------

test('summarizeSessions gives the mean scores, the mean gain and the gain per question', () => {
  const sessions = [
    makeSession(QUESTIONS, [1, 1, 1], [0, 2, 1], 1), // antes 1, depois 3
    makeSession(QUESTIONS, [0, 1, 0], [0, 1, 1], 2), // antes 1, depois 2
  ];
  const summary = summarizeSessions(sessions, QUESTIONS);
  assert.equal(summary.n, 2);
  assert.equal(summary.meanBefore, 1);
  assert.equal(summary.meanAfter, 2.5);
  assert.equal(summary.meanGain, 1.5);
  // Pergunta 1: certa 1 de 2 antes, 2 de 2 depois (+0.5). Pergunta 2: 0 -> 1 de 2 (+0.5).
  // Pergunta 3: 1 de 2 -> 2 de 2 (+0.5).
  assert.deepEqual(summary.perQuestionGain, [0.5, 0.5, 0.5]);
});

test('summarizeSessions with no sessions has no means', () => {
  assert.deepEqual(summarizeSessions([], QUESTIONS), {
    n: 0, meanBefore: null, meanAfter: null, meanGain: null, perQuestionGain: [null, null, null],
  });
});

// ---------- sessionsToCsv ----------

test('sessionsToCsv writes one row per session, the answer key and a summary', () => {
  const sessions = [makeSession(QUESTIONS, [1, null, 1], [0, 2, 1], Date.UTC(2026, 11, 1, 10, 30))];
  const lines = sessionsToCsv(sessions, QUESTIONS).trimEnd().split('\n');
  assert.deepEqual(lines, [
    'session,time_utc,before_score,after_score,total,gain,before_q1,before_q2,before_q3,after_q1,after_q2,after_q3',
    '1,2026-12-01T10:30:00.000Z,1,3,3,2,B,,B,A,C,B',
    'answer_key,,,,,,A,C,B,A,C,B',
    '',
    'summary_sessions,mean_before,mean_after,mean_gain,gain_q1,gain_q2,gain_q3',
    '1,1.00,3.00,2.00,1.00,1.00,0.00',
  ]);
});

test('sessionsToCsv with no sessions still has the headers and an empty summary', () => {
  const lines = sessionsToCsv([], QUESTIONS).trimEnd().split('\n');
  assert.equal(lines.length, 5);
  assert.equal(lines.at(-1), '0,,,,,,');
});
