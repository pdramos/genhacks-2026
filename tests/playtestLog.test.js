// O registo do playtest (src/sim/playtestLog.js): o que se guarda de cada jogador, sempre anónimo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deviceKind, newPlaytestSession, addEvent, compactPlan, addTry, setQuiz, setFeedback, toPayload,
  MAX_EVENTS, MAX_COMMENT, MAX_PAYLOAD_CHARS,
} from '../src/sim/playtestLog.js';

const fresh = () => newPlaytestSession({ sessionId: 'abc', version: 'v1', seed: 1960, device: 'computer', screen: '1280x720' });

test('the device kind comes only from the screen size and the kind of pointer', () => {
  assert.equal(deviceKind(390, 844, true), 'phone');
  assert.equal(deviceKind(844, 390, true), 'phone', 'a phone held sideways is still a phone');
  assert.equal(deviceKind(820, 1180, true), 'tablet');
  assert.equal(deviceKind(1280, 720, false), 'computer');
});

test('a new session has no answers, no tries and nothing about the person', () => {
  const session = fresh();
  assert.equal(session.before_answers, null);
  assert.deepEqual(session.tries, []);
  assert.deepEqual(session.log, []);
  const keys = Object.keys(toPayload(session)).sort();
  assert.deepEqual(keys, [
    'after_answers', 'after_score', 'before_answers', 'before_score', 'choices_mattered', 'confusing',
    'device', 'finished', 'log', 'screen', 'seed', 'seq', 'session_id', 'tries', 'version',
  ]);
});

test('events keep the time in seconds (one decimal) and stop at MAX_EVENTS with one "log-full" mark', () => {
  const session = fresh();
  addEvent(session, 12.345, 'start-disaster', { spent: 5000 });
  assert.deepEqual(session.log[0], { t: 12.3, e: 'start-disaster', spent: 5000 });
  for (let i = 0; i < MAX_EVENTS + 20; i++) addEvent(session, i, 'tick');
  assert.equal(session.log.length, MAX_EVENTS);
  assert.equal(session.log.at(-1).e, 'log-full');
  assert.equal(session.log.filter((event) => event.e === 'log-full').length, 1);
});

test('the plan is stored as [x, y, letter] and a try keeps the result and the comparison', () => {
  const plan = [{ x: 3, y: 4, actionName: 'clearBrush' }, { x: 5, y: 6, actionName: 'firebreak' }, { x: 1, y: 1, actionName: 'replaceTrees' }];
  assert.deepEqual(compactPlan(plan), [[3, 4, 'c'], [5, 6, 'f'], [1, 1, 'r']]);
  const session = fresh();
  addTry(session, {
    outcome: { housesSaved: 181, housesTotal: 194, schoolSaved: true },
    stars: 2,
    comparison: { nothing: { housesSaved: 100 }, expert: { housesSaved: 194 }, lucky: false },
    spent: 18000,
    plan,
    seconds: 95.04,
    seed: 1960,
    retry: true,
  });
  assert.deepEqual(session.tries[0], {
    n: 1, seed: 1960, retry: true, stars: 2, saved: 181, total: 194, station: true, spent: 18000, actions: 3,
    plan: [[3, 4, 'c'], [5, 6, 'f'], [1, 1, 'r']], nothing: 100, expert: 194, lucky: false, t: 95,
  });
});

test('quiz answers and scores go to the right stage', () => {
  const session = fresh();
  setQuiz(session, 'before', [1, 0, 2, 1, 0], { correct: 2 });
  setQuiz(session, 'after', [1, 1, 2, 1, 1], { correct: 4 });
  assert.deepEqual(session.before_answers, [1, 0, 2, 1, 0]);
  assert.equal(session.before_score, 2);
  assert.equal(session.after_score, 4);
});

test('feedback: only the 3 known answers, and the comment is trimmed, cut and empty becomes null', () => {
  const session = fresh();
  setFeedback(session, 'a-little', '  the   map\nwas small  ');
  assert.equal(session.choices_mattered, 'a-little');
  assert.equal(session.confusing, 'the map was small');
  setFeedback(session, 'maybe', 'x'.repeat(MAX_COMMENT + 50));
  assert.equal(session.choices_mattered, null);
  assert.equal(session.confusing.length, MAX_COMMENT);
  setFeedback(session, 'no', '   ');
  assert.equal(session.confusing, null);
});

test('a huge session is cut down to fit: old plans go first, then the oldest events', () => {
  const session = fresh();
  const bigPlan = Array.from({ length: 900 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), actionName: 'clearBrush' }));
  for (let i = 0; i < 12; i++) {
    addTry(session, { outcome: { housesSaved: 100, housesTotal: 194, schoolSaved: false }, stars: 0, comparison: null, spent: 20000, plan: bigPlan, seconds: i });
  }
  for (let i = 0; i < MAX_EVENTS; i++) addEvent(session, i, 'click', { what: 'x'.repeat(100) });
  const payload = toPayload(session);
  assert.ok(JSON.stringify({ payload }).length <= MAX_PAYLOAD_CHARS);
  assert.equal(payload.tries.length, 12, 'every try is still there');
  assert.equal(payload.tries[0].plan, null, 'the oldest plan was dropped first');
  assert.equal(session.tries[0].plan.length, 900, 'toPayload does not change the session itself');
});
