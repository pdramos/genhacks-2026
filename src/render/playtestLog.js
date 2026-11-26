// O REGISTO DO PLAYTEST, do lado da página: só liga com ?playtest=1 no endereço.
// Junta o que o jogador faz (o quiz, cada noite, os botões) numa "sessão" sem nomes e envia-a
// para a base de dados (src/render/playtestConfig.js). As regras do que se guarda estão em
// src/sim/playtestLog.js (testadas).
//
// Regras importantes (revisão de 26/11):
//   - NADA é enviado antes de o jogador acabar o quiz do início (depois de ler o aviso).
//     Quem abre o link e fecha logo não deixa rasto na base de dados.
//   - A sessão vive no sessionStorage (só neste separador): sobrevive ao "Try again" e ao
//     "Play again", que recarregam a página. Uma sessão ACABADA nunca é reaproveitada.
//   - Se o envio final falhar (sem rede), a sessão fica guardada neste aparelho e é enviada
//     da próxima vez que alguém abrir o link do playtest aqui.
import {
  deviceKind, newPlaytestSession, addEvent, addTry, setQuiz, setFeedback, toPayload,
} from '../sim/playtestLog.js';
import { countStars } from '../sim/stars.js';
import { remainingBudget } from '../sim/actions.js';
import { planFromChanges } from './runState.js';
import { PLAYTEST_API, PLAYTEST_KEY, PLAYTEST_VERSION } from './playtestConfig.js';

const params = new URLSearchParams(location.search);
export const PLAYTEST = params.get('playtest') === '1';
const STORAGE_KEY = 'same-night-playtest-log';        // sessionStorage: a sessão deste separador
const PENDING_KEY = 'same-night-playtest-pending';    // localStorage: sessões acabadas por enviar

let session = null;
let startedAt = Date.now(); // para os segundos desde o início (o relógio do aparelho não é enviado)
let consented = false;      // true depois do quiz do início: só então se envia alguma coisa

if (PLAYTEST) start();

function start() {
  const saved = load();
  if (saved && !saved.session.finished) {
    ({ session, startedAt, consented } = saved);
  } else {
    session = newPlaytestSession({
      sessionId: crypto.randomUUID?.() ?? fallbackId(),
      version: params.get('test') === '1' ? 'test' : PLAYTEST_VERSION,
      seed: null, // vem do main.js, logo abaixo
      device: deviceKind(screen.width, screen.height, matchMedia('(pointer: coarse)').matches),
      screen: `${innerWidth}x${innerHeight}`,
    });
    startedAt = Date.now();
    consented = false;
  }
  log('page-load');
  if (!storageWorks()) log('no-storage'); // cada recarga vai criar outra sessão: o relatório sabe
  resendPending();
  // Os botões: guardamos só o NOME do que se carregou (ex.: "law", "again", "try-again").
  // "true" = ouvimos antes do próprio botão, porque o "Try again" recarrega a página logo.
  addEventListener('click', (event) => {
    const target = event.target.closest?.('button, a');
    if (!target) return;
    if (target.classList.contains('retry')) return log('try-again');
    const name = target.dataset.do || target.className.match(/playtest-finish|credit-toggle/)?.[0];
    if (name) log('click', { what: name });
  }, true);
  // Sair do separador (ou fechar): envia o que houver, para não se perder uma sessão a meio.
  document.addEventListener('visibilitychange', () => {
    log(document.visibilityState === 'hidden' ? 'hidden' : 'visible');
    if (document.visibilityState === 'hidden') send();
  });
  // Erros do PRÓPRIO jogo (não de extensões do browser), só a mensagem curta e sem endereços.
  addEventListener('error', (event) => {
    if (event.filename && !event.filename.startsWith(location.origin)) return;
    log('error', { msg: String(event.message || '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 120) });
  });
  // As fases do jogo vêm do main.js (import() = só quando ele estiver pronto).
  import('./main.js').then(({ game, onPhaseChange }) => {
    if (session.seed === null) session.seed = game.seed;
    save();
    onPhaseChange((phase) => {
      if (phase === 'disaster') {
        const plan = planFromChanges(game.buildState?.changes ?? {});
        log('start-disaster', { actions: plan.length, spent: spentBy(game) });
      }
      // O cartão do fim é criado logo DEPOIS de a fase mudar: esperamos um instante pelo resultado.
      if (phase === 'result') setTimeout(() => recordNight(game), 0);
    });
  }).catch(() => log('error', { msg: 'game did not start' }));
}

// Uma noite acabou: junta a tentativa e envia.
function recordNight(game) {
  const outcome = game.outcome;
  if (!outcome || !session) return;
  const plan = planFromChanges(game.buildState?.changes ?? {});
  addTry(session, {
    outcome,
    stars: countStars(outcome),
    comparison: game.comparison ?? null,
    spent: spentBy(game),
    plan,
    seconds: seconds(),
    seed: game.seed,
    retry: Boolean(game.retryPlan),
  });
  log('result', { stars: countStars(outcome), saved: outcome.housesSaved });
  send();
}

function spentBy(game) {
  return game.buildState ? game.level.budget - remainingBudget(game.buildState) : 0;
}

// ---------- O que o quiz.js chama ----------
export function recordQuiz(stage, answers, score) {
  if (!session) return;
  if (stage === 'before') consented = true; // leu o aviso e respondeu: a partir daqui envia-se
  setQuiz(session, stage, answers, score);
  log(`quiz-${stage}`, { score: score?.correct ?? null });
  send();
}

export function recordFeedback(choicesMattered, comment) {
  if (!session) return;
  setFeedback(session, choicesMattered, comment);
  log('feedback');
}

// O jogador acabou o playtest. Devolve uma promessa com 'sent', 'refused' (o servidor disse não)
// ou 'offline' (não chegou). A sessão é logo esquecida neste separador, para nunca se misturar
// com a do jogador seguinte (mesmo que a página seja recarregada sem "Next player").
export function finishSession() {
  if (!session) return Promise.resolve('offline');
  session.finished = true;
  log('finish');
  const finished = session;
  const result = send();
  resetSession();
  return result.then((status) => {
    if (status === 'offline') keepPending(toPayload(finished));
    return status;
  });
}

// Esquece a sessão deste separador. A próxima começa do zero, com outro identificador.
export function resetSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* sem sessionStorage */ }
  session = null;
}

// ---------- Guardar e enviar ----------
function log(name, data) {
  if (!session) return;
  addEvent(session, seconds(), name, data);
  save();
}

function seconds() {
  return (Date.now() - startedAt) / 1000;
}

function save() {
  if (!session) return;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session, startedAt, consented })); } catch { /* fica só na memória */ }
}

function load() {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return data?.session?.session_id ? data : null;
  } catch {
    return null;
  }
}

function storageWorks() {
  try {
    sessionStorage.setItem('same-night-storage-test', '1');
    sessionStorage.removeItem('same-night-storage-test');
    return true;
  } catch {
    return false;
  }
}

// Envia a sessão inteira (a base de dados substitui a versão anterior da mesma sessão, se o
// número seq for maior ou igual). keepalive só quando a página está a fechar: aí o browser acaba
// o envio sozinho (mas tem um limite pequeno, partilhado por todos os envios desse momento).
// Devolve uma promessa com 'sent', 'refused' ou 'offline'.
function send() {
  if (!session || !consented) return Promise.resolve('offline');
  session.seq = (session.seq ?? 0) + 1;
  save();
  return post(toPayload(session), document.visibilityState === 'hidden');
}

function post(payload, keepalive) {
  return fetch(`${PLAYTEST_API}/submit_playtest`, {
    method: 'POST',
    headers: { apikey: PLAYTEST_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
    keepalive,
  }).then((response) => (response.ok ? 'sent' : 'refused')).catch(() => 'offline');
}

// ---------- Sessões acabadas que não chegaram (sem rede no fim) ----------
function readPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch { return []; }
}

function writePending(list) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-5)));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* sem localStorage: paciência */ }
}

function keepPending(payload) {
  writePending([...readPending().filter((p) => p.session_id !== payload.session_id), payload]);
}

async function resendPending() {
  const pending = readPending();
  if (!pending.length) return;
  const left = [];
  for (const payload of pending) {
    if (await post(payload, false) === 'offline') left.push(payload); // 'refused' não adianta repetir
  }
  writePending(left);
}

// Para browsers sem crypto.randomUUID (antigos): um identificador ao acaso parecido.
function fallbackId() {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, hex);
}
