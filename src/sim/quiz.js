// O QUESTIONÁRIO de "antes e depois" dos testes com jogadores (playtests).
// Pergunta: jogar ensina alguma coisa? O jogador responde às mesmas perguntas antes de jogar
// e depois de jogar, e comparamos as notas.
// Aqui ficam só as contas (dar a nota, baralhar as opções, juntar as sessões, fazer o CSV).
// Não usa Three.js nem o navegador, por isso é testado no Node (tests/quiz.test.js).
// As perguntas estão em data/quiz.json; o desenho dos cartões está em src/render/ui/quiz.js.
//
// Uma resposta é o NÚMERO da opção na ordem do data/quiz.json (0 = a primeira),
// ou null se ficou sem resposta. Mesmo quando as opções aparecem baralhadas no ecrã,
// guardamos sempre o número da ordem original (assim o "antes" e o "depois" comparam-se).

// Dá a nota de uma lista de respostas.
// Devolve { correct, total, perQuestion }: perQuestion = [true, false, ...] (certa ou errada).
export function scoreQuiz(questions, answers) {
  const perQuestion = questions.map((question, i) => answers?.[i] === question.answer);
  const correct = perQuestion.filter(Boolean).length;
  return { correct, total: questions.length, perQuestion };
}

// O que mudou em cada pergunta, do "antes" para o "depois" (as duas notas de scoreQuiz):
//   'improved' = errada antes, certa depois (aprendeu!)
//   'kept'     = certa nas duas vezes (já sabia)
//   'missed'   = errada nas duas vezes (ainda por aprender)
//   'worse'    = certa antes, errada depois
export function questionOutcomes(before, after) {
  return before.perQuestion.map((wasRight, i) => {
    const isRight = after.perQuestion[i];
    if (isRight) return wasRight ? 'kept' : 'improved';
    return wasRight ? 'worse' : 'missed';
  });
}

// Uma ordem baralhada para `length` opções: ex. [2, 0, 1] quer dizer "mostra primeiro a opção 2".
// rand = um gerador com semente (src/sim/random.js): a mesma semente dá sempre a mesma ordem.
// Nunca devolve a ordem original (com 2 ou mais opções), senão o jogador podia só decorar a posição.
export function shuffledOrder(length, rand) {
  const order = Array.from({ length }, (_, i) => i);
  // Baralhar de Fisher-Yates: troca cada lugar, do fim para o início, com um lugar ao acaso antes dele.
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Saiu igual ao original? Roda tudo uma casa (a primeira vai para o fim).
  if (length > 1 && order.every((value, i) => value === i)) order.push(order.shift());
  return order;
}

// ---------- As sessões guardadas ----------
// Uma sessão = um jogador que acabou os dois questionários. Só guardamos isto (nada pessoal):
//   { time, before, after, beforeScore, afterScore, total }
//   time = quando acabou (milissegundos desde 1970, como Date.now()); before/after = as respostas.

// Cria a sessão a guardar, a partir das perguntas e das duas listas de respostas.
export function makeSession(questions, before, after, time) {
  return {
    time,
    before: [...before],
    after: [...after],
    beforeScore: scoreQuiz(questions, before).correct,
    afterScore: scoreQuiz(questions, after).correct,
    total: questions.length,
  };
}

// Lê as sessões guardadas (texto JSON do localStorage). Se o texto não existir ou estiver
// estragado, devolve uma lista vazia. As sessões com um formato estranho ficam de fora.
export function parseSessions(text) {
  if (!text) return [];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(isValidSession);
}

// Uma resposta válida: um número inteiro (0, 1, 2...) ou null.
const isAnswer = (value) => value === null || (Number.isInteger(value) && value >= 0);

function isValidSession(session) {
  return Boolean(session) && Number.isFinite(session.time)
    && Array.isArray(session.before) && session.before.every(isAnswer)
    && Array.isArray(session.after) && session.after.every(isAnswer);
}

// O resumo de todas as sessões (para o ficheiro exportado):
//   n = quantas sessões; meanBefore / meanAfter = a nota média antes e depois;
//   meanGain = quanto subiu em média; perQuestionGain[i] = a parte dos jogadores que acertou
//   a pergunta i depois, menos a parte que acertou antes (0.5 = mais metade dos jogadores).
// Damos a nota outra vez com as perguntas (não confiamos nos números guardados).
// Sem sessões, as médias são null (não há média de nada).
export function summarizeSessions(sessions, questions) {
  const n = sessions.length;
  if (n === 0) {
    return { n, meanBefore: null, meanAfter: null, meanGain: null, perQuestionGain: questions.map(() => null) };
  }
  const befores = sessions.map((session) => scoreQuiz(questions, session.before));
  const afters = sessions.map((session) => scoreQuiz(questions, session.after));
  const mean = (numbers) => numbers.reduce((sum, value) => sum + value, 0) / n;
  const meanBefore = mean(befores.map((score) => score.correct));
  const meanAfter = mean(afters.map((score) => score.correct));
  const perQuestionGain = questions.map((_, i) =>
    mean(afters.map((score) => Number(score.perQuestion[i]))) - mean(befores.map((score) => Number(score.perQuestion[i]))));
  return { n, meanBefore, meanAfter, meanGain: meanAfter - meanBefore, perQuestionGain };
}

// ---------- O ficheiro CSV (para abrir numa folha de cálculo) ----------
// Uma linha por sessão, uma linha com as respostas certas ("answer_key") e, no fim, o resumo.
// As respostas aparecem como letras (A = a primeira opção do data/quiz.json).
// Todos os valores são números, letras ou datas que nós próprios fazemos: não há vírgulas
// nem aspas para "escapar".
export function sessionsToCsv(sessions, questions) {
  const numbers = questions.map((_, i) => i + 1);
  const letter = (answer) => (answer === null || answer === undefined ? '' : String.fromCharCode(65 + answer));
  const rows = [[
    'session', 'time_utc', 'before_score', 'after_score', 'total', 'gain',
    ...numbers.map((q) => `before_q${q}`), ...numbers.map((q) => `after_q${q}`),
  ]];
  sessions.forEach((session, index) => {
    const before = scoreQuiz(questions, session.before).correct;
    const after = scoreQuiz(questions, session.after).correct;
    rows.push([
      index + 1, new Date(session.time).toISOString(), before, after, questions.length, after - before,
      ...questions.map((_, i) => letter(session.before[i])), ...questions.map((_, i) => letter(session.after[i])),
    ]);
  });
  const key = questions.map((question) => letter(question.answer));
  rows.push(['answer_key', '', '', '', '', '', ...key, ...key]);

  // O resumo (summarizeSessions), separado por uma linha em branco.
  const summary = summarizeSessions(sessions, questions);
  const fixed = (value) => (value === null ? '' : value.toFixed(2));
  rows.push([]);
  rows.push(['summary_sessions', 'mean_before', 'mean_after', 'mean_gain', ...numbers.map((q) => `gain_q${q}`)]);
  rows.push([summary.n, fixed(summary.meanBefore), fixed(summary.meanAfter), fixed(summary.meanGain),
    ...summary.perQuestionGain.map(fixed)]);
  return rows.map((row) => row.join(',')).join('\n') + '\n';
}
