// O MODO DE TESTE COM JOGADORES (playtest): só existe com ?playtest=1 no endereço.
// Os jurados nunca o veem. Serve para medir se jogar ensina alguma coisa:
//   1. Antes de jogar: um questionário ("Before you play"), uma pergunta de cada vez, sem dizer
//      se acertou. Depois o jogo continua normalmente (o briefing, a construção, o fogo).
//   2. No cartão do fim aparece o botão "Finish playtest": as MESMAS perguntas outra vez
//      ("After playing"), com as opções baralhadas, e um ecrã final com as duas notas,
//      as perguntas que melhoraram e as explicações.
//   3. Cada sessão acabada fica guardada neste aparelho (localStorage), sem nada pessoal:
//      as duas listas de respostas, as notas e a hora. O ecrã final exporta tudo em CSV.
//   4. Antes do ecrã final, 2 perguntas curtas (as escolhas mudaram o que aconteceu? o que
//      confundiu?). Tudo é também ENVIADO, anónimo, para a base de dados do playtest
//      (src/render/playtestLog.js), para o autor ver os resultados de quem joga em casa.
// As contas estão em src/sim/quiz.js (testadas); as perguntas em data/quiz.json.
// O aspeto está em quiz.css. O texto das perguntas entra sempre com textContent.
import { createRandom } from '../../sim/random.js';
import {
  scoreQuiz, questionOutcomes, shuffledOrder, makeSession, parseSessions, sessionsToCsv,
} from '../../sim/quiz.js';
import { recordQuiz, recordFeedback, finishSession, resetSession } from '../playtestLog.js';

const PARAMS = new URLSearchParams(location.search);
const PLAYTEST = PARAMS.get('playtest') === '1';
// &kiosk=1: o playtest é feito num só aparelho (o portátil do autor), um jogador a seguir ao outro.
// Sem isso (o normal: cada um joga em casa), o ecrã final é mais simples e diz "podes fechar".
const KIOSK = PARAMS.get('kiosk') === '1';
const SESSIONS_KEY = 'brace-playtests'; // localStorage: todas as sessões acabadas
const CURRENT_KEY = 'brace-playtest-current'; // sessionStorage: as respostas do "antes" deste jogador
const RETRY_KEY = 'brace-retry'; // o "Try again" do jogo (main.js): limpamos ao mudar de jogador
const SHUFFLE_SEED = 2018; // semente fixa: o "depois" baralha as opções sempre da mesma maneira

// O que aparece em cada pergunta do ecrã final.
const OUTCOME_LABELS = {
  improved: 'Learned it',
  kept: 'Knew it',
  missed: 'Still to learn',
  worse: 'Changed to wrong',
  right: 'Right', // só quando não há respostas do "antes"
  wrong: 'Wrong',
};

if (PLAYTEST) startPlaytest();

// Sem "await" lá em cima no ficheiro: assim este módulo não atrasa os outros do jogo.
async function startPlaytest() {
  document.body.classList.add('playtest');
  // O questionário aparece logo, antes de o 3D acabar de carregar e por cima do briefing.
  const questions = await loadQuestions();
  if (!questions) return;
  // As fases do jogo vêm do main.js. Importamos só aqui (import() = "carrega quando eu pedir"),
  // para o questionário não ficar à espera do mapa 3D.
  import('../main.js').then(({ onPhaseChange }) => {
    onPhaseChange((phase) => {
      // O cartão do fim é criado logo DEPOIS de a fase mudar: esperamos um instante por ele.
      if (phase === 'result') setTimeout(() => addFinishButton(questions), 0);
    });
  });
  // "Play again" e "Try again" recarregam a página: o mesmo jogador não responde outra vez.
  if (readCurrent()) return;
  const before = await runQuiz(questions, 'before');
  writeCurrent({ before });
  recordQuiz('before', before, scoreQuiz(questions, before));
  // O briefing estava escondido por baixo: o foco vai para o botão dele.
  document.querySelector('.briefing-card [data-do="start"]')?.focus();
}

async function loadQuestions() {
  try {
    const data = await fetch('data/quiz.json', { cache: 'no-cache' }).then((response) => response.json());
    return data.questions;
  } catch (error) {
    console.warn('Playtest quiz could not load:', error);
    return null;
  }
}

// ---------- As respostas do "antes", enquanto o jogador joga ----------
// Ficam no sessionStorage (só neste separador): sobrevivem ao "Play again" e ao "Try again".
// Se o navegador o bloquear, guardamos aqui na memória (perde-se ao recarregar).
let currentInMemory = null;

function readCurrent() {
  try {
    const data = JSON.parse(sessionStorage.getItem(CURRENT_KEY));
    if (data && Array.isArray(data.before)) return data;
  } catch {
    // Texto estragado ou sem sessionStorage: usamos o que está na memória.
  }
  return currentInMemory;
}

function writeCurrent(data) {
  currentInMemory = data;
  try {
    if (data) sessionStorage.setItem(CURRENT_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(CURRENT_KEY);
  } catch {
    // Sem sessionStorage: fica só na memória.
  }
}

// ---------- As sessões acabadas (localStorage) ----------
function readSessions() {
  try {
    return parseSessions(localStorage.getItem(SESSIONS_KEY));
  } catch {
    return [];
  }
}

// Devolve true se ficou guardado.
function writeSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

// ---------- O cartão (e o fundo escuro) ----------
// Abre um cartão por cima de tudo. Enquanto está aberto, o resto da página fica "inert"
// (o rato e o Tab não chegam lá) e as teclas não chegam ao jogo (como no cartão da lei).
// onKey (opcional) = o que fazer com uma tecla (o questionário usa as teclas 1-4).
// Devolve { card, body, buttons, close }: body = o meio do cartão, buttons = a fila de botões.
function openCard(title, onKey = null) {
  const backdrop = document.createElement('div');
  backdrop.className = 'quiz-backdrop';
  const card = document.createElement('div');
  card.className = 'result-card quiz-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <div class="result-title"></div>
    <div class="quiz-body"></div>
    <div class="result-buttons"></div>`;
  card.querySelector('.result-title').textContent = title;
  card.setAttribute('aria-label', title);

  const asleep = [...document.body.children].filter((element) => !element.inert);
  for (const element of asleep) element.inert = true;
  document.body.classList.add('quiz-open');
  // "true" = ouvimos as teclas antes do jogo; stopPropagation() não as deixa chegar lá
  // (senão o 1-4 escolhia uma ferramenta e o WASD mexia a câmara por trás do cartão).
  const onAnyKey = (event) => {
    event.stopPropagation();
    onKey?.(event);
  };
  addEventListener('keydown', onAnyKey, true);

  function close() {
    card.remove();
    backdrop.remove();
    for (const element of asleep) element.inert = false;
    document.body.classList.remove('quiz-open');
    removeEventListener('keydown', onAnyKey, true);
  }
  document.body.append(backdrop, card);
  return { card, body: card.querySelector('.quiz-body'), buttons: card.querySelector('.result-buttons'), close };
}

function makeButton(text, className = 'result-button') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

// ---------- O questionário ----------
// Mostra as perguntas uma a uma e devolve (quando acaba) a lista de respostas,
// com os números da ordem ORIGINAL das opções. stage = 'before' ou 'after'.
// No "depois", as opções aparecem baralhadas (sempre da mesma maneira: semente fixa).
function runQuiz(questions, stage) {
  const isBefore = stage === 'before';
  const rand = createRandom(SHUFFLE_SEED);
  const orders = questions.map((question) =>
    (isBefore ? question.options.map((_, i) => i) : shuffledOrder(question.options.length, rand)));
  const answers = questions.map(() => null);
  // Teclas 1-4: escolhe a opção com esse número.
  const chooseByKey = (event) => body.querySelectorAll('.quiz-option')[Number(event.key) - 1]?.click();
  const { card, body, buttons, close } = openCard(isBefore ? 'Before you play' : 'After playing', chooseByKey);
  card.classList.add('quiz-asking');

  return new Promise((resolve) => {
    let index = 0;
    const next = makeButton('Next');
    buttons.append(next);
    next.addEventListener('click', () => {
      if (answers[index] === null) return;
      index++;
      if (index < questions.length) return show();
      close();
      resolve(answers);
    });
    function show() {
      const question = questions[index];
      body.replaceChildren();
      const intro = document.createElement('p');
      intro.className = 'quiz-intro';
      intro.textContent = isBefore
        ? 'A quick quiz before you play, then the game, then the same quiz again. No names. '
          + 'Your answers, how you play (clicks and times) and your device type and screen size are '
          + 'sent to the student who made this game, to see if it teaches anything. Like any website, '
          + 'the database service briefly keeps connection logs (such as the IP address). '
          + 'If you are under 13, ask a parent first. If you do not want to take part, just close this page.'
        : 'The same questions again. Pick the best answer.';
      const progress = document.createElement('div');
      progress.className = 'story-heading quiz-progress';
      progress.textContent = `Question ${index + 1} of ${questions.length}`;
      const text = document.createElement('div');
      text.className = 'quiz-question';
      text.id = `quiz-question-${index}`;
      text.tabIndex = -1; // pode receber o foco (pelo código), mas não é uma paragem do Tab
      text.textContent = question.question;
      const list = document.createElement('div');
      list.className = 'quiz-options';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-labelledby', text.id);
      // Cada opção é um botão normal: Tab passa por elas, Enter ou Espaço escolhe.
      // aria-pressed="true" diz a quem usa um leitor de ecrã qual está escolhida.
      orders[index].forEach((optionIndex, place) => {
        const option = makeButton('', 'quiz-option');
        option.setAttribute('aria-pressed', 'false');
        const number = document.createElement('span');
        number.className = 'quiz-option-number';
        number.textContent = String(place + 1);
        const label = document.createElement('span');
        label.textContent = question.options[optionIndex];
        option.append(number, label);
        option.addEventListener('click', () => {
          answers[index] = optionIndex; // guardamos o número ORIGINAL da opção
          for (const other of list.children) other.setAttribute('aria-pressed', String(other === option));
          next.disabled = false;
          next.focus();
        });
        list.append(option);
      });
      // A frase de introdução só aparece na primeira pergunta.
      if (index === 0) body.append(intro);
      body.append(progress, text, list);
      next.disabled = true;
      next.textContent = index < questions.length - 1 ? 'Next' : (isBefore ? 'Start the game' : 'See my results');
      body.scrollTop = 0;
      card.scrollTop = 0;
      // O foco vai para a PERGUNTA, não para a opção 1: assim um Enter sem querer não responde.
      text.focus();
    }
    show();
  });
}

// ---------- O botão "Finish playtest" no cartão do fim ----------
function addFinishButton(questions) {
  const resultCard = document.querySelector('.result-card.good, .result-card.bad');
  const row = resultCard?.querySelector('.result-buttons');
  if (!row || row.querySelector('.playtest-finish')) return;
  const finish = makeButton('Finish playtest', 'result-button playtest-finish');
  finish.title = 'Answer the quiz again and see what changed';
  finish.addEventListener('click', async () => {
    // Sem as respostas do "antes" (sessionStorage bloqueado e página recarregada) não há
    // comparação: before fica null e a sessão NÃO é guardada (senão contava como 0/5 antes
    // e fazia parecer que o jogador aprendeu tudo).
    const before = readCurrent()?.before ?? null;
    resultCard.hidden = true;
    document.querySelector('.back-to-results')?.setAttribute('hidden', '');
    const after = await runQuiz(questions, 'after');
    recordQuiz('after', after, scoreQuiz(questions, after));
    const feedback = await askFeedback();
    recordFeedback(feedback.choice, feedback.comment);
    const sent = finishSession(); // uma promessa: true quando chegar à base de dados
    const saved = before ? writeSessions([...readSessions(), makeSession(questions, before, after, Date.now())]) : false;
    writeCurrent(null); // este jogador acabou
    showFinalScreen(questions, before, after, saved, sent);
  });
  row.append(finish);
}

// ---------- O ecrã final ----------
// As duas notas (antes -> depois), cada pergunta com o que mudou, a resposta certa e a explicação.
// Os botões: limpar tudo, exportar o CSV e o próximo jogador.
// before = null quando as respostas do "antes" se perderam: aí só mostramos a nota do "depois".
// sent = a promessa do envio para a base de dados ('sent', 'refused' ou 'offline').
function showFinalScreen(questions, before, after, saved, sent) {
  const afterScore = scoreQuiz(questions, after);
  const beforeScore = before ? scoreQuiz(questions, before) : null;
  const outcomes = beforeScore ? questionOutcomes(beforeScore, afterScore) : null;
  const { card, body, buttons } = openCard('Playtest results');
  card.classList.add('quiz-final');

  const scores = document.createElement('div');
  scores.className = 'quiz-scores';
  if (beforeScore) {
    const arrow = Object.assign(document.createElement('span'), { className: 'quiz-arrow', textContent: '→' });
    arrow.setAttribute('aria-hidden', 'true');
    scores.append(scoreBox('Before', beforeScore), arrow, scoreBox('After', afterScore));
  } else {
    scores.append(scoreBox('After', afterScore));
  }
  body.append(scores);
  // O estado do envio fica logo aqui em cima, para quem joga em casa saber se já pode fechar.
  const sendNote = document.createElement('p');
  sendNote.className = 'quiz-send';
  sendNote.setAttribute('role', 'status');
  sendNote.textContent = 'Sending your results...';
  body.append(sendNote);
  sent?.then((status) => {
    sendNote.textContent = {
      sent: 'Sent! Thank you. You can close this page now.',
      refused: 'The results server did not accept them, sorry. They are saved on this device.',
      offline: 'Could not send them (no internet?). They are saved on this device and will be sent next time.',
    }[status] ?? '';
    sendNote.classList.toggle('ok', status === 'sent');
  });
  if (!beforeScore) {
    const missing = document.createElement('p');
    missing.className = 'quiz-intro';
    missing.textContent = 'The answers from before the game were lost (the page was reloaded), '
      + 'so there is no before/after comparison and this session was not saved.';
    body.append(missing);
  }

  const list = document.createElement('ol');
  list.className = 'quiz-review';
  questions.forEach((question, i) => {
    const item = document.createElement('li');
    // Sem o "antes", a etiqueta diz só se ficou certa ou errada agora.
    const outcome = outcomes ? outcomes[i] : (afterScore.perQuestion[i] ? 'right' : 'wrong');
    item.className = `quiz-review-item ${outcome}`;
    const tag = document.createElement('span');
    tag.className = 'quiz-tag';
    tag.textContent = OUTCOME_LABELS[outcome];
    const text = document.createElement('div');
    text.className = 'quiz-review-question';
    text.textContent = question.question;
    const answer = document.createElement('div');
    answer.className = 'quiz-review-answer';
    answer.textContent = `Answer: ${question.options[question.answer]}`;
    const why = document.createElement('div');
    why.className = 'quiz-review-why';
    why.textContent = question.explanation;
    item.append(tag, text, answer, why);
    list.append(item);
  });
  body.append(list);

  const note = document.createElement('p');
  note.className = 'credit quiz-note';
  body.append(note);
  const updateNote = () => {
    const count = readSessions().length;
    note.textContent = (saved || !before ? '' : 'Could not save this session on this device. ')
      + `${count} playtest${count === 1 ? '' : 's'} saved on this device (no names: answers, scores and time only).`;
  };
  updateNote();
  // Em casa (o normal): só um botão para jogar outra vez, já sem o quiz.
  if (!KIOSK) {
    note.hidden = true;
    const again = makeButton('Play again (no quiz)');
    again.addEventListener('click', () => {
      const url = new URLSearchParams(location.search);
      url.delete('playtest');
      url.delete('test');
      location.href = `${location.pathname}?${url}`;
    });
    buttons.append(again);
    return;
  }

  const clear = makeButton('Clear all results', 'result-button secondary quiz-clear');
  clear.addEventListener('click', () => {
    if (!confirm('Delete all saved playtest results on this device? This cannot be undone.')) return;
    try { localStorage.removeItem(SESSIONS_KEY); } catch { /* nada para apagar */ }
    updateNote();
  });
  const exportButton = makeButton('Export results', 'result-button secondary');
  exportButton.addEventListener('click', () => downloadCsv(questions));
  const nextPlayer = makeButton('Next player');
  nextPlayer.addEventListener('click', () => {
    // Esquece este jogador (e um "Try again" que tenha ficado) e recomeça com o mesmo endereço
    // (que ainda tem ?playtest=1).
    writeCurrent(null);
    resetSession(); // o registo enviado também recomeça: o próximo jogador é outra sessão
    try { sessionStorage.removeItem(RETRY_KEY); } catch { /* sem sessionStorage */ }
    location.reload();
  });
  buttons.append(clear, exportButton, nextPlayer);
  nextPlayer.focus();
}

// ---------- As 2 perguntas finais (opcionais) ----------
// "As tuas escolhas mudaram o que aconteceu?" (Yes / A little / No) e "o que confundiu?" (texto
// curto). Devolve { choice, comment }. Nada é obrigatório: dá para seguir sem responder.
function askFeedback() {
  const { body, buttons, close } = openCard('Two last questions');
  const question = document.createElement('div');
  question.className = 'quiz-question';
  question.id = 'feedback-choices';
  question.textContent = 'Did your choices change what happened in the game?';
  const list = document.createElement('div');
  list.className = 'quiz-options';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-labelledby', question.id);
  let choice = null;
  for (const [value, text] of [['yes', 'Yes'], ['a-little', 'A little'], ['no', 'No']]) {
    const option = makeButton('', 'quiz-option');
    option.setAttribute('aria-pressed', 'false');
    option.textContent = text;
    option.addEventListener('click', () => {
      choice = value;
      for (const other of list.children) other.setAttribute('aria-pressed', String(other === option));
    });
    list.append(option);
  }
  const label = document.createElement('label');
  label.className = 'quiz-question feedback-label';
  label.htmlFor = 'feedback-comment';
  label.textContent = 'Was anything confusing? (optional; please do not write your name)';
  const comment = document.createElement('textarea');
  comment.id = 'feedback-comment';
  comment.className = 'feedback-comment';
  comment.maxLength = 300;
  comment.rows = 3;
  body.append(question, list, label, comment);
  const done = makeButton('See my results');
  buttons.append(done);
  return new Promise((resolve) => {
    done.addEventListener('click', () => {
      close();
      resolve({ choice, comment: comment.value });
    });
  });
}

// Uma caixa com a nota (ex.: "Before 2/5").
function scoreBox(label, score) {
  const box = document.createElement('div');
  box.className = 'quiz-score';
  const number = document.createElement('span');
  number.className = 'result-number';
  number.textContent = String(score.correct);
  const total = document.createElement('small');
  total.textContent = `/${score.total}`;
  number.append(total);
  const name = document.createElement('span');
  name.className = 'result-label';
  name.textContent = label;
  box.append(number, name);
  return box;
}

// Faz o ficheiro CSV com todas as sessões (e o resumo) e pede ao navegador para o descarregar.
function downloadCsv(questions) {
  const csv = sessionsToCsv(readSessions(), questions);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `brace-playtests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
