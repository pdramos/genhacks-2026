// O RELATÓRIO do playtest: junta as sessões que chegaram à base de dados (src/render/playtestLog.js)
// e faz as contas que a página playtest-results.html mostra. Só contas: testado em
// tests/playtestReport.test.js.
//
// sessions  = as linhas da base de dados (ver src/sim/playtestLog.js: before_answers, tries, ...)
// questions = as perguntas de data/quiz.json
import { scoreQuiz, questionOutcomes } from './quiz.js';

// Com menos do que isto, a página do Devpost diz "Learning: not measured yet" (plano de 25/11).
export const MIN_PLAYERS_TO_REPORT = 5;

export function summarizePlaytests(sessions, questions) {
  const devices = { phone: 0, tablet: 0, computer: 0, other: 0 };
  // Object.hasOwn (e não "in"): um device como "toString" não pode baralhar as contas.
  for (const s of sessions) devices[Object.hasOwn(devices, s.device) ? s.device : 'other']++;

  // ---------- Aprendizagem: só quem fez os DOIS questionários ----------
  const paired = sessions.filter((s) => Array.isArray(s.before_answers) && Array.isArray(s.after_answers));
  const perQuestion = questions.map((q) => ({ id: q.id, question: q.question, improved: 0, kept: 0, missed: 0, worse: 0 }));
  let beforeSum = 0;
  let afterSum = 0;
  for (const s of paired) {
    const before = scoreQuiz(questions, s.before_answers);
    const after = scoreQuiz(questions, s.after_answers);
    beforeSum += before.correct;
    afterSum += after.correct;
    questionOutcomes(before, after).forEach((outcome, i) => { perQuestion[i][outcome]++; });
  }
  const learning = {
    players: paired.length,
    enough: paired.length >= MIN_PLAYERS_TO_REPORT,
    averageBefore: paired.length ? beforeSum / paired.length : null,
    averageAfter: paired.length ? afterSum / paired.length : null,
    total: questions.length,
    perQuestion,
  };

  // ---------- O jogo: as tentativas de cada jogador ----------
  // Só tentativas que façam sentido (um objeto, com estrelas 0-3 e casas salvas dentro do total):
  // a base de dados aceita envios de qualquer pessoa, por isso uma linha estranha não pode estragar tudo.
  const cleanTries = (s) => (Array.isArray(s.tries) ? s.tries.filter(validTry) : []);
  const played = sessions.map((s) => ({ ...s, tries: cleanTries(s) })).filter((s) => s.tries.length > 0);
  const firstStars = [0, 0, 0, 0];
  const bestStars = [0, 0, 0, 0];
  let triesSum = 0;
  let usedTryAgain = 0;
  let firstSavedSum = 0;
  let bestSavedSum = 0;
  let firstActionsSum = 0;
  for (const s of played) {
    const first = s.tries[0];
    const best = s.tries.reduce((a, b) => (b.stars > a.stars || (b.stars === a.stars && b.saved > a.saved) ? b : a));
    firstStars[clampStars(first.stars)]++;
    bestStars[clampStars(best.stars)]++;
    triesSum += s.tries.length;
    if (s.tries.some((t) => t.retry)) usedTryAgain++; // "Play again" é outra noite: não conta
    firstSavedSum += first.saved ?? 0;
    bestSavedSum += best.saved ?? 0;
    firstActionsSum += first.actions ?? 0;
  }
  const n = played.length;
  const play = {
    players: n,
    averageTries: n ? triesSum / n : null,
    usedTryAgain,
    firstStars,
    bestStars,
    averageFirstSaved: n ? firstSavedSum / n : null,
    averageBestSaved: n ? bestSavedSum / n : null,
    averageFirstActions: n ? firstActionsSum / n : null,
  };

  // ---------- "As tuas escolhas mudaram o que aconteceu?" e os comentários ----------
  // Só entre quem chegou ao fim; quem fechou a meio conta à parte (notReached).
  const choices = { yes: 0, 'a-little': 0, no: 0, none: 0 };
  const reachedEnd = sessions.filter((s) => s.finished);
  for (const s of reachedEnd) choices[Object.hasOwn(choices, s.choices_mattered) ? s.choices_mattered : 'none']++;
  const comments = sessions.filter((s) => typeof s.confusing === 'string' && s.confusing).map((s) => s.confusing);

  return {
    sessions: sessions.length,
    finished: sessions.filter((s) => s.finished).length,
    devices,
    learning,
    play,
    choices,
    notReached: sessions.length - reachedEnd.length,
    comments,
  };
}

// Uma tentativa válida: um objeto com estrelas 0-3 e casas salvas entre 0 e o total.
export function validTry(t) {
  if (!t || typeof t !== 'object') return false;
  const total = Number.isFinite(t.total) ? t.total : 194;
  return [0, 1, 2, 3].includes(t.stars) && Number.isFinite(t.saved) && t.saved >= 0 && t.saved <= total;
}

// As sessões a mostrar: tira as de teste ('test') e, se pedirem, fica só com uma versão do jogo.
export function filterSessions(sessions, { showTests = false, version = null } = {}) {
  return sessions.filter((s) => (showTests || s.version !== 'test') && (!version || s.version === version));
}

function clampStars(stars) {
  return Math.max(0, Math.min(3, Number(stars) || 0));
}
