// O REGISTO DO PLAYTEST: o que se guarda de cada jogador (sempre anónimo) quando o jogo é
// jogado com ?playtest=1. Só regras e contas, sem página nem rede: testado em
// tests/playtestLog.test.js. Quem envia é src/render/playtestLog.js.
//
// Uma "sessão" é um jogador, do quiz do início ao fim. Guarda:
//   - o aparelho (phone / tablet / computer) e o tamanho do ecrã, nada mais sobre ele;
//   - as respostas do quiz antes e depois (números das opções) e as notas;
//   - cada tentativa (estrelas, casas salvas, quartel, dinheiro gasto, o plano em quadrados);
//   - a resposta a "as tuas escolhas mudaram o que aconteceu?" e um comentário opcional;
//   - um registo de eventos com o tempo em segundos desde o início ("log").
// Nunca: nomes, emails, endereços IP, hora do relógio do aparelho.

// Limites, para o envio nunca ficar grande demais (o servidor recusa acima de 64 000 bytes, e o
// browser só garante os envios ao fechar a página até 64 KB SOMADOS, por isso ficamos bem abaixo).
// O limite conta letras; com acentos e € uma letra pode ser mais de 1 byte, daí a folga.
export const MAX_EVENTS = 300;
export const MAX_COMMENT = 300;
export const MAX_PAYLOAD_CHARS = 30000;

// As letras curtas das ações no plano: [x, y, letra].
const ACTION_LETTERS = { clearBrush: 'c', firebreak: 'f', replaceTrees: 'r' };

// Que tipo de aparelho? Pela largura e altura do ecrã (CSS px) e por o dedo ser o "rato".
//   coarse = true quando o ecrã é de toque (matchMedia('(pointer: coarse)')).
export function deviceKind(width, height, coarse) {
  const shortSide = Math.min(width, height);
  if (coarse && shortSide < 600) return 'phone';
  if (coarse) return 'tablet';
  return 'computer';
}

// Uma sessão nova. sessionId = um identificador ao acaso (crypto.randomUUID), que não diz
// nada sobre a pessoa: serve só para juntar as várias mensagens do mesmo jogador.
export function newPlaytestSession({ sessionId, version, seed, device, screen }) {
  return {
    session_id: sessionId,
    version,
    seed,
    device,
    screen,
    before_answers: null,
    after_answers: null,
    before_score: null,
    after_score: null,
    tries: [],
    choices_mattered: null,
    confusing: null,
    finished: false,
    log: [],
    seq: 0, // conta os envios: a base de dados ignora um envio antigo que chegue atrasado
  };
}

// Junta um evento ao registo. seconds = segundos desde o início da sessão.
// data = coisas pequenas sobre o evento (ex.: { stars: 2 }). Depois de MAX_EVENTS, deixa de juntar
// (e marca uma vez 'log-full'), para o registo não crescer sem fim.
export function addEvent(session, seconds, name, data = {}) {
  if (session.log.length >= MAX_EVENTS) {
    const last = session.log[session.log.length - 1];
    if (last?.e !== 'log-full') session.log[session.log.length - 1] = { t: round1(seconds), e: 'log-full' };
    return session;
  }
  session.log.push({ t: round1(seconds), e: name, ...data });
  return session;
}

// O plano do jogador em forma curta: [[x, y, 'c'|'f'|'r'], ...].
// plan = a lista de planFromChanges ([{ x, y, actionName }, ...]).
export function compactPlan(plan) {
  return (plan ?? []).map(({ x, y, actionName }) => [x, y, ACTION_LETTERS[actionName] ?? '?']);
}

// Junta uma tentativa (uma noite jogada até ao fim).
//   outcome    = o resultado do fogo ({ housesSaved, housesTotal, schoolSaved })
//   stars      = as estrelas desta noite
//   comparison = o "same night, three plans" (pode ser null): { nothing, expert, lucky }
//   spent      = euros gastos;  plan = a lista de planFromChanges;  seconds = quando acabou
//   seed       = a noite jogada;  retry = true se veio do "Try again (same night)"
//                ("Play again" também recarrega a página, mas é outra noite: retry = false)
export function addTry(session, { outcome, stars, comparison, spent, plan, seconds, seed = null, retry = false }) {
  session.tries.push({
    n: session.tries.length + 1,
    seed,
    retry: Boolean(retry),
    stars,
    saved: outcome.housesSaved,
    total: outcome.housesTotal,
    station: outcome.schoolSaved,
    spent,
    actions: plan?.length ?? 0,
    plan: compactPlan(plan),
    nothing: comparison?.nothing?.housesSaved ?? null,
    expert: comparison?.expert?.housesSaved ?? null,
    lucky: comparison?.lucky ?? null,
    t: round1(seconds),
  });
  return session;
}

// As respostas de um quiz ('before' ou 'after'): answers = números das opções, score = { correct }.
export function setQuiz(session, stage, answers, score) {
  session[`${stage}_answers`] = answers;
  session[`${stage}_score`] = score?.correct ?? null;
  return session;
}

// "As tuas escolhas mudaram o que aconteceu?" ('yes' | 'a-little' | 'no' | null) e o comentário.
// O comentário perde os espaços a mais e é cortado em MAX_COMMENT letras; vazio fica null.
export function setFeedback(session, choicesMattered, comment) {
  session.choices_mattered = ['yes', 'a-little', 'no'].includes(choicesMattered) ? choicesMattered : null;
  const text = String(comment ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT);
  session.confusing = text || null;
  return session;
}

// O que se envia: só os campos da sessão (nada de extra que tenha ficado no objeto).
// Se ficar grande demais, tira primeiro os planos das tentativas mais antigas e depois os
// eventos mais antigos do registo, até caber em MAX_PAYLOAD_CHARS.
export function toPayload(session) {
  const payload = JSON.parse(JSON.stringify({
    session_id: session.session_id,
    version: session.version,
    seed: session.seed,
    device: session.device,
    screen: session.screen,
    before_answers: session.before_answers,
    after_answers: session.after_answers,
    before_score: session.before_score,
    after_score: session.after_score,
    tries: session.tries,
    choices_mattered: session.choices_mattered,
    confusing: session.confusing,
    finished: session.finished,
    log: session.log,
    seq: session.seq ?? 0,
  }));
  const size = () => JSON.stringify({ payload }).length;
  for (const attempt of payload.tries) {
    if (size() <= MAX_PAYLOAD_CHARS) break;
    attempt.plan = null; // o resumo da tentativa fica; só o plano quadrado a quadrado sai
  }
  while (size() > MAX_PAYLOAD_CHARS && payload.log.length > 0) payload.log.shift();
  return payload;
}

function round1(seconds) {
  return Math.round(Math.max(0, seconds) * 10) / 10;
}
