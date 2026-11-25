// A "interface de jogo" (HUD): barra de cima, cartas das ferramentas, mensagens
// "toast", botão grande de começar o desastre, bússola do vento e cartão do resultado.
// Este ficheiro só mexe no HTML (DOM). Não sabe nada das regras do jogo:
// os outros módulos (buildPanel.js, disasterPlayer.js) chamam estas funções.
// O aspeto (cores, tamanhos, animações) está em hud.css.
import { coinIcon, flameIcon, windArrowIcon, houseIcon, schoolIcon } from './icons.js';
import { countStars, TWO_STAR_SHARE } from '../../sim/stars.js';
import { lawButton } from './lawCard.js';

// ---------- Barra de cima ----------
// Os elementos da barra de cima já existem no index.html (ids: level-name, budget, wind...).
const budgetBox = document.getElementById('budget');
const budgetValue = document.getElementById('budget-value');
document.getElementById('budget-coin').innerHTML = coinIcon;
document.getElementById('wind-arrow').innerHTML = windArrowIcon;

// Botão do som: aqui só trocamos o desenho (altifalante normal ou riscado).
// aria-pressed="true" quer dizer "sem som". O módulo de som (audio.js) também
// ouve o clique neste botão e liga/desliga o som a sério.
const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', () => {
  const muted = soundToggle.getAttribute('aria-pressed') !== 'true';
  soundToggle.setAttribute('aria-pressed', String(muted));
});

// Mostra o nome do nível (ex.: "Demo village").
export function setLevelName(name) {
  document.getElementById('level-name').textContent = name;
}

// ---------- Contador de moedas (orçamento) ----------
let shownBudget = null; // o valor que está escrito agora no ecrã
let budgetAnimation = 0; // o número do pedido de animação (para o poder cancelar)

// Muda o orçamento mostrado. Os números "correm" até ao valor novo,
// a moeda dá um pulo e aparece um "+€200" / "−€500" a subir.
export function setBudget(amount) {
  if (shownBudget === null) { // a primeira vez: escreve logo, sem animação
    shownBudget = amount;
    budgetValue.textContent = formatEuros(amount);
    return;
  }
  const change = amount - shownBudget;
  if (change === 0) return;
  countUp(shownBudget, amount);
  shownBudget = amount;
  restartAnimation(budgetBox, change > 0 ? 'gain' : 'spend');
  floatDelta(change);
}

// Faz os números passarem do valor antigo ao novo em ~0,45 segundos.
function countUp(from, to) {
  cancelAnimationFrame(budgetAnimation);
  const start = performance.now();
  const durationMs = 450;
  function frame(now) {
    const progress = Math.min((now - start) / durationMs, 1);
    const eased = 1 - (1 - progress) ** 3; // começa depressa e trava no fim
    budgetValue.textContent = formatEuros(Math.round(from + (to - from) * eased));
    if (progress < 1) budgetAnimation = requestAnimationFrame(frame);
  }
  budgetAnimation = requestAnimationFrame(frame);
}

// O "+€200" ou "−€500" que sobe e desaparece ao lado das moedas.
function floatDelta(change) {
  const delta = document.createElement('span');
  delta.className = 'budget-delta ' + (change > 0 ? 'gain' : 'spend');
  delta.textContent = (change > 0 ? '+' : '−') + formatEuros(Math.abs(change));
  budgetBox.append(delta);
  removeLater(delta, 1200);
}

// ---------- Mensagens "toast" ----------
const toastStack = document.createElement('div');
toastStack.className = 'toast-stack';
toastStack.setAttribute('role', 'status'); // os leitores de ecrã leem as mensagens novas
document.body.append(toastStack);
const TOAST_MS = 2200;

// Mostra uma mensagem curta que aparece, fica um pouco e desaparece.
// kind: 'info' (normal), 'success' (verde) ou 'error' (vermelho, abana).
// Só há UMA mensagem de cada vez: a nova substitui a antiga. (Antes ficavam até 3, mais as que
// estavam a sair: 6 no ecrã quando se clicava depressa, e no vídeo isso parecia desarrumado.)
export function showToast(text, kind = 'info') {
  if (!text) return;
  // Se a última mensagem é igual, não empilha outra: só a faz "pulsar" de novo.
  const last = toastStack.lastElementChild;
  if (last && last.textContent === text && !last.classList.contains('leaving')) {
    restartAnimation(last, 'again');
    clearTimeout(last.hideTimer);
    last.hideTimer = setTimeout(() => hideToast(last), TOAST_MS);
    return;
  }
  // Uma mensagem diferente: as antigas saem já, sem animação, para nunca ficarem duas no ecrã.
  for (const old of [...toastStack.children]) {
    clearTimeout(old.hideTimer);
    old.remove();
  }
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`;
  toast.textContent = text;
  toastStack.append(toast);
  toast.hideTimer = setTimeout(() => hideToast(toast), TOAST_MS);
}

function hideToast(toast) {
  if (toast.classList.contains('leaving')) return;
  toast.classList.add('leaving');
  removeLater(toast, 350);
}

// ---------- Cartas das ferramentas ----------
// Cria uma carta (um botão) com tecla de atalho, ícone, nome e preço.
// price = null para ferramentas grátis (o Undo).
export function createToolCard({ name, price, icon, hotkey, hint }) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'tool-card';
  card.title = hint;
  card.innerHTML = `
    <span class="tool-hotkey">${hotkey}</span>
    <span class="tool-icon">${icon}</span>
    <span class="tool-name"></span>
    <span class="tool-price"></span>`;
  card.querySelector('.tool-name').textContent = name;
  const priceTag = card.querySelector('.tool-price');
  if (price === null) {
    priceTag.textContent = 'Free';
    priceTag.classList.add('free');
  } else {
    priceTag.innerHTML = `<span class="mini-coin">${coinIcon}</span>`;
    priceTag.append(price.toLocaleString('en-US'));
  }
  return card;
}

// ---------- Botão "Start disaster" ----------
// Um botão redondo e grande com uma chama, que pulsa enquanto espera.
export function createStartButton(onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'start-button';
  button.innerHTML = `<span class="start-flame">${flameIcon}</span><span class="start-label">Start disaster</span>`;
  button.addEventListener('click', onClick);
  return button;
}

// ---------- Bússola do vento ----------
const windChip = document.getElementById('wind');

const windCompass = windChip.querySelector('.compass');
const windArrow = document.getElementById('wind-arrow');

// Mostra a bússola com o texto, em duas linhas:
//   from + to = a linha grande (ex.: "From the north" e "→ fire goes south");
//   details   = a linha pequena (ex.: "33 km/h · gusts 67 · 23:00").
// label = a palavra pequena por cima ("Wind" durante o fogo, "Forecast" na construção).
export function showWind({ from, to, details }, label = 'Wind') {
  document.getElementById('wind-from').textContent = from;
  document.getElementById('wind-to').textContent = to;
  document.getElementById('wind-details').textContent = details;
  windChip.querySelector('.wind-label').textContent = label;
  // Para quem usa um leitor de ecrã (que não vê a seta): a frase toda.
  windChip.setAttribute('aria-label', `${label}: ${from} ${to}, ${details}`);
  windChip.hidden = false;
}

// O vento mudou de direção: a bússola "pisca" (um anel dourado e um pulo, cerca de 0.6 s),
// para o jogador reparar. A animação está em hud.css (.wind-changed).
export function pulseWind() {
  windChip.classList.remove('wind-changed');
  void windChip.offsetWidth; // obriga o navegador a ver que a classe saiu, para a animação recomeçar
  windChip.classList.add('wind-changed');
}
// Quando a animação acaba, tiramos a classe (assim pode voltar a piscar mais tarde).
// (Todas as animações do "piscar" têm nomes começados por "wind-" e duram o mesmo.)
windChip.addEventListener('animationend', (event) => {
  if (event.animationName.startsWith('wind-')) windChip.classList.remove('wind-changed');
});

export function hideWind() {
  windChip.hidden = true;
}

export function isWindVisible() {
  return !windChip.hidden;
}

// Roda a seta (para onde o vento empurra o fogo) e põe cada letra N, E, S, W no seu sítio,
// para baterem certo com o que se vê no ecrã. Ângulos em radianos, 0 = para a direita.
// letters = { north, east, south, west }: o ângulo no ecrã de cada direção do mapa.
// É chamada a cada desenho: se a câmara não mexeu, não mudamos nada (poupa trabalho ao telemóvel).
const LETTER_ORDER = ['north', 'east', 'south', 'west']; // a ordem à volta do mostrador
const windLetters = {};
for (const name of LETTER_ORDER) windLetters[name] = windChip.querySelector(`.compass-${name}`);
let shownAngles = '';
export function setWindAngles(arrowRadians, letters) {
  const key = [arrowRadians, letters.north, letters.east, letters.south, letters.west]
    .map((angle) => angle.toFixed(3)).join(' ');
  if (key === shownAngles) return;
  shownAngles = key;
  const real = LETTER_ORDER.map((name) => letters[name]);
  const spread = spreadLetters(real);
  // A seta fica no mesmo sítio entre as suas duas letras vizinhas, mesmo que elas se tenham afastado.
  windArrow.style.transform = `rotate(${moveBetweenLetters(arrowRadians, real, spread)}rad)`;
  // Cada letra lê a sua "variável" do CSS (--at) para ir para a borda certa (ver hud.css).
  // No CSS, 0 = para cima; aqui 0 = para a direita. Por isso somamos 90° (π/2).
  LETTER_ORDER.forEach((name, i) => {
    windLetters[name].style.setProperty('--at', `${spread[i] + Math.PI / 2}rad`);
  });
}

// Quanto falta andar (no sentido dos ponteiros do relógio) do ângulo "from" até ao "to": de 0 a 2π.
function turnBetween(from, to) {
  const full = Math.PI * 2;
  return (((to - from) % full) + full) % full;
}

// Com a câmara muito baixa, duas letras podem ficar quase uma em cima da outra.
// Aqui afastamo-las um pouco (no mínimo 45°), sem trocar a ordem N, E, S, W.
// Com a câmara normal as letras já estão longe e nada muda.
const MIN_LETTER_GAP = Math.PI / 4;
function spreadLetters(angles) {
  const spread = [...angles];
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < spread.length; i++) {
      const next = (i + 1) % spread.length;
      const gap = turnBetween(spread[i], spread[next]);
      if (gap >= MIN_LETTER_GAP) continue;
      const push = (MIN_LETTER_GAP - gap) / 2;
      spread[i] -= push; // esta letra recua um bocadinho
      spread[next] += push; // e a seguinte avança
    }
  }
  return spread;
}

// Se as letras se afastaram, a seta acompanha: descobrimos entre que duas letras ela está
// (e a que fração do caminho) e pomo-la à mesma fração entre as letras afastadas.
function moveBetweenLetters(angle, real, spread) {
  for (let i = 0; i < real.length; i++) {
    const next = (i + 1) % real.length;
    const gap = turnBetween(real[i], real[next]);
    const along = turnBetween(real[i], angle);
    if (along <= gap && gap > 0) {
      return spread[i] + (along / gap) * turnBetween(spread[i], spread[next]);
    }
  }
  return angle;
}

// ---------- Cartão do briefing (antes da construção) ----------
// Conta a história verdadeira do nível e só depois deixa construir. A ordem é:
//   level.briefingLead (a abertura, 1 frase) -> "Your goal" -> level.briefing (o resto).
// Assim o objetivo aparece logo no início, e não depois de um parágrafo inteiro.
// onStart é chamado quando o jogador carrega em "Prepare the village".
export function showBriefingCard(level, onStart) {
  if (!level.briefing) { onStart?.(); return null; }
  const card = document.createElement('div');
  card.className = 'result-card briefing-card';
  card.setAttribute('role', 'dialog');
  card.innerHTML = `
    <div class="result-title">Mission briefing</div>
    <div class="briefing-name"></div>
    <div class="briefing-place"></div>
    <p class="briefing-text briefing-lead"></p>
    <div class="briefing-goal">
      <div class="story-heading">Your goal</div>
      <ul class="goal-list">
        <li><span class="goal-stars">★</span> <span class="goal-school"></span></li>
        <li><span class="goal-stars">★★</span> <span class="goal-share"></span></li>
        <li><span class="goal-stars">★★★</span> and every single house</li>
      </ul>
      <p class="goal-hint"></p>
    </div>
    <p class="briefing-text briefing-rest"></p>
    <div class="credit">Real weather of that night: Open-Meteo (CC BY 4.0), from ERA5 (Copernicus Climate Change Service)</div>
    <div class="result-buttons">
      <button type="button" class="result-button" data-do="start">Prepare the village</button>
    </div>`;
  card.querySelector('.briefing-name').textContent = level.name;
  card.querySelector('.briefing-place').textContent = level.place || '';
  // Sem abertura no nível, a história inteira vai para cima do objetivo (como era antes).
  const lead = card.querySelector('.briefing-lead');
  const rest = card.querySelector('.briefing-rest');
  if (level.briefingLead) {
    lead.textContent = level.briefingLead;
    rest.textContent = level.briefing;
  } else {
    lead.textContent = level.briefing;
    rest.remove();
  }
  // Os créditos do mapa e do relevo (OpenStreetMap, Copernicus), por baixo do crédito do tempo.
  addLevelCredits(card.querySelector('.credit'), level);
  // Os créditos completos têm ~60 palavras: ficam escondidos atrás de uma linha curta
  // (level.creditLine) com um botão "Credits" que os abre. A linha curta continua a nomear o
  // OpenStreetMap, como pede a licença ODbL.
  if (level.creditLine) foldCredits(card, level.creditLine);
  // As regras das estrelas (src/sim/stars.js): sem o edifício importante, 0 estrelas.
  const school = level.schoolName || 'School';
  card.querySelector('.goal-school').textContent = `Save the ${school.toLowerCase()} (lose it and you get no stars)`;
  card.querySelector('.goal-share').textContent = `and at least ${Math.round(TWO_STAR_SHARE * 100)}% of the houses`;
  // O nível pode avisar que não se sabe onde o fogo vai começar (a ignição escondida).
  const hint = card.querySelector('.goal-hint');
  if (level.ignitionHint) hint.textContent = level.ignitionHint;
  else hint.remove();
  // O botão "The law" (à esquerda): explica porque só se pode trabalhar perto das casas e estradas.
  const law = lawButton(level);
  if (law) card.querySelector('.result-buttons').prepend(law);
  card.querySelector('[data-do="start"]').addEventListener('click', () => {
    card.remove();
    onStart?.();
  });
  document.body.append(card);
  card.querySelector('[data-do="start"]').focus();
  return card;
}

// Desenho de uma estrela (cheia ou vazia).
function starSvg(filled) {
  return `<svg viewBox="0 0 24 24" class="star ${filled ? 'on' : 'off'}" aria-hidden="true">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
}

// ---------- Cartão do resultado (fim do desastre) ----------
// outcome = { housesSaved, housesTotal, schoolSaved } (vem da simulação).
// schoolLabel = o nome do edifício importante deste nível (em Sintra é o quartel dos bombeiros).
// level (opcional) = o nível: mostra "o que aconteceu de verdade" (level.aftermath) e as fontes.
// lostText (opcional) = uma linha a dizer ONDE se perderam casas (ex.: "2 at the quinta in the forest"),
//   para o jogador perceber o que mudar no plano. As casas perdidas também ficam marcadas no mapa.
// comparison (opcional) = { player, nothing, expert, showLuckyBanner, lessons } (de src/sim/counterfactual.js):
//   a mesma noite jogada com outros planos. Mostra "Same night, three plans" (ver compareSection).
export function showResultCard(outcome, schoolLabel = 'School', level = {}, lostText = '', comparison = null) {
  const allSaved = outcome.schoolSaved && outcome.housesSaved === outcome.housesTotal;
  const stars = countStars(outcome);
  const card = document.createElement('div');
  card.className = 'result-card ' + (allSaved ? 'good' : 'bad');
  card.setAttribute('role', 'dialog');
  card.innerHTML = `
    <div class="result-title">${allSaved ? 'Village saved!' : 'The fire is out'}</div>
    <div class="result-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starSvg(n <= stars)).join('')}</div>
    <div class="result-stats">
      <div class="result-stat">
        <span class="result-icon">${houseIcon}</span>
        <span class="result-number">${outcome.housesSaved}<small>/${outcome.housesTotal}</small></span>
        <span class="result-label">Houses saved</span>
      </div>
      <div class="result-stat ${outcome.schoolSaved ? '' : 'lost'}">
        <span class="result-icon">${schoolIcon}</span>
        <span class="result-number">${outcome.schoolSaved ? 'Safe' : 'Lost'}</span>
        <span class="result-label">${schoolLabel}</span>
      </div>
    </div>
    <p class="result-lost"></p>
    <div class="result-story">
      <div class="story-heading">What really happened</div>
      <p class="story-text"></p>
      <ul class="story-sources"></ul>
      <div class="credit">Weather: Open-Meteo (CC BY 4.0) · Game rules are simplified: this is not a fire forecast.</div>
    </div>
    <div class="result-buttons">
      <button type="button" class="result-button secondary" data-do="look">Look around</button>
      <button type="button" class="result-button" data-do="again">Play again</button>
    </div>`;
  // Onde se perderam casas (com textContent, como o resto do texto do nível).
  const lost = card.querySelector('.result-lost');
  if (lostText) lost.textContent = lostText;
  else lost.remove();
  // A comparação dos planos, logo por baixo dos números (e da linha das casas perdidas, que fala
  // do plano do jogador). Numa "noite com sorte" (não fazer nada também salvava tudo) aparece uma
  // faixa lá em cima, para o jogador não pensar que foi só mérito. Quem decide é a simulação
  // (showLuckyBanner, em src/sim/counterfactual.js): só quando o jogador também salvou tudo.
  if (comparison) {
    card.classList.add('has-compare');
    const above = card.querySelector('.result-lost') ?? card.querySelector('.result-stats');
    above.after(compareSection(comparison, schoolLabel));
    if (comparison.showLuckyBanner) {
      const lucky = document.createElement('div');
      lucky.className = 'result-lucky';
      // Só sabemos que "não fazer nada" também salvava tudo, não que o fogo se apagou sozinho.
      lucky.textContent = 'Lucky night: doing nothing would have saved every house too';
      card.querySelector('.result-title').after(lucky);
    }
  }
  // A história real e as fontes (com textContent: o texto do nível nunca vira HTML).
  const story = card.querySelector('.result-story');
  if (level.aftermath) card.querySelector('.story-text').textContent = level.aftermath;
  else card.querySelector('.story-text').remove();
  const list = card.querySelector('.story-sources');
  for (const url of level.sources || []) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = sourceName(url);
    item.append(link);
    list.append(item);
  }
  if (!level.aftermath && !(level.sources || []).length) story.querySelector('.story-heading').remove();
  addLevelCredits(story.querySelector('.credit'), level);
  // O botão "The law" (à esquerda do "Look around"), como no cartão do início.
  const law = lawButton(level);
  if (law) card.querySelector('[data-do="look"]').before(law);
  // "Look around" esconde o cartão (para ver a vila queimada) e deixa um botão "Back to results"
  // para o voltar a abrir (antes o cartão era apagado e perdiam-se o "Try again" e o "Play again").
  // "Play again" recomeça o nível.
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'result-button back-to-results';
  back.textContent = 'Back to results';
  back.hidden = true;
  back.addEventListener('click', () => { card.hidden = false; back.hidden = true; });
  document.body.append(back);
  card.querySelector('[data-do="look"]').addEventListener('click', () => {
    card.hidden = true;
    back.hidden = false;
    back.focus();
  });
  card.querySelector('[data-do="again"]').addEventListener('click', () => location.reload());
  document.body.append(card);
  return card;
}

// "Same night, three plans": uma linha por plano (o teu, não fazer nada, o do perito), cada uma
// com uma barra (casas salvas / total), o número e as estrelas. Por baixo, as lições (0 a 2).
// Se o nível não tiver plano do perito (expert = null), essa linha não aparece.
function compareSection({ player, nothing, expert, lessons = [] }, schoolLabel) {
  const section = document.createElement('div');
  section.className = 'result-compare';
  const heading = document.createElement('div');
  heading.className = 'story-heading';
  heading.textContent = expert ? 'Same night, three plans' : 'Same night, two plans';
  section.append(heading);
  section.append(compareRow('Your plan', player, schoolLabel, true));
  section.append(compareRow('Doing nothing', nothing, schoolLabel));
  if (expert) section.append(compareRow('Expert plan', expert, schoolLabel));
  if (lessons.length) {
    const list = document.createElement('ul');
    list.className = 'compare-lessons';
    for (const lesson of lessons) {
      const item = document.createElement('li');
      item.textContent = lesson;
      list.append(item);
    }
    section.append(list);
  }
  return section;
}

// Uma linha da comparação. result = { housesSaved, housesTotal, schoolSaved, stars }.
// A cor da barra segue as estrelas: 3 verde, 2 dourado, 1 laranja, 0 vermelho.
// isPlayer = true na linha do jogador (fica destacada).
function compareRow(name, result, schoolLabel, isPlayer = false) {
  const row = document.createElement('div');
  row.className = `compare-row stars-${result.stars}` + (isPlayer ? ' player' : '');
  row.innerHTML = `
    <span class="compare-name"><span class="compare-plan"></span></span>
    <span class="compare-bar"><span class="compare-fill"></span></span>
    <span class="compare-number"></span>
    <span class="compare-stars">${[1, 2, 3].map((n) => starSvg(n <= result.stars)).join('')}</span>`;
  row.querySelector('.compare-plan').textContent = name;
  // Sem o edifício importante não há estrelas: dizemos porquê por baixo do nome.
  if (!result.schoolSaved) {
    const note = document.createElement('small');
    note.className = 'compare-note';
    note.textContent = `${schoolLabel} lost`;
    row.querySelector('.compare-name').append(note);
  }
  const share = result.housesTotal ? result.housesSaved / result.housesTotal : 0;
  row.querySelector('.compare-fill').style.width = `${Math.round(share * 100)}%`;
  row.querySelector('.compare-number').textContent = `${result.housesSaved}/${result.housesTotal}`;
  row.querySelector('.compare-stars').setAttribute('aria-label', `${result.stars} of 3 stars`);
  row.title = `${name}: ${result.housesSaved} of ${result.housesTotal} houses saved, ${schoolLabel.toLowerCase()} ${result.schoolSaved ? 'saved' : 'lost'}`;
  return row;
}

// ---------- Pequenas ajudas ----------
// Os créditos dos dados do nível (level.attribution: ex. "Map data © OpenStreetMap contributors...").
// A licença do OpenStreetMap (ODbL) pede que o crédito se veja no jogo, por isso cada linha fica
// por baixo de `after` (o crédito do tempo), em letra pequena. O texto entra com textContent
// (nunca vira HTML) e um endereço "https://..." no meio da linha vira uma ligação.
function addLevelCredits(after, level) {
  if (!after) return;
  let last = after;
  for (const line of level.attribution || []) {
    const credit = document.createElement('div');
    credit.className = 'credit';
    // split com um grupo () guarda os endereços na lista: [texto, endereço, texto, ...]
    line.split(/(https?:\/\/[^\s,]*[^\s.,])/).forEach((part, index) => {
      if (index % 2 === 0) { credit.append(part); return; }
      const link = document.createElement('a');
      link.href = part;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = sourceName(part) + new URL(part).pathname.replace(/\/$/, '');
      credit.append(link);
    });
    last.after(credit);
    last = credit;
  }
}

// Junta todas as linhas .credit do cartão numa caixa escondida e põe no lugar delas uma linha curta:
//   "Data: © OpenStreetMap contributors (ODbL) · Open-Meteo (CC BY 4.0) · Copernicus DEM · Full credits"
// O botão "Full credits" abre a caixa POR CIMA da linha curta, como um balão: assim o cartão não
// cresce nem sai do ecrã. aria-expanded diz aos leitores de ecrã se está aberta; Escape fecha.
function foldCredits(card, shortText) {
  const lines = [...card.querySelectorAll('.credit')];
  if (lines.length === 0) return;
  const short = document.createElement('div');
  short.className = 'credit credit-short';
  lines[0].before(short);
  appendWithLinks(short, shortText);
  const full = document.createElement('div');
  full.className = 'credit-full';
  full.id = 'credit-full-' + Math.random().toString(36).slice(2, 8);
  full.hidden = true;
  full.append(...lines);
  // O separador e o botão andam juntos (nowrap), para o "·" nunca ficar sozinho no fim da linha.
  const tail = document.createElement('span');
  tail.className = 'credit-tail';
  tail.append(' · ');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'credit-toggle';
  toggle.textContent = 'Full credits';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', full.id);
  const setOpen = (open) => {
    full.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(full.hidden));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !full.hidden) { setOpen(false); toggle.focus(); }
  });
  tail.append(toggle);
  short.append(tail, full);
}

// Escreve um texto com ligações no estilo "[texto](https://...)" (como no markdown) dentro de
// `element`. O texto entra com append (nunca vira HTML), por isso é seguro.
function appendWithLinks(element, text) {
  // split com dois grupos () dá: [texto, nome, endereço, texto, nome, endereço, ..., texto]
  const parts = text.split(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
  for (let i = 0; i < parts.length; i += 3) {
    element.append(parts[i]);
    if (i + 2 >= parts.length) break; // o último pedaço é só texto
    const link = document.createElement('a');
    link.textContent = parts[i + 1];
    link.href = parts[i + 2];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    element.append(link);
  }
}

// Um nome curto para uma fonte: "https://www.dn.pt/pais/..." -> "dn.pt".
function sourceName(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// 9300 -> "€9,300"
export function formatEuros(amount) {
  return '€' + amount.toLocaleString('en-US');
}

// Tira um elemento do ecrã depois de a sua animação acabar (ms = a duração da animação).
// Usamos um relógio em vez de esperar pelo fim da animação, porque num separador
// escondido o navegador pausa as animações e o elemento nunca seria tirado.
function removeLater(element, ms) {
  setTimeout(() => element.remove(), ms);
}

// Volta a correr uma animação CSS (tirar a classe, forçar o navegador a reparar, pôr outra vez).
function restartAnimation(element, className) {
  element.classList.remove('gain', 'spend', 'again');
  void element.offsetWidth; // "lê" o tamanho: obriga o navegador a esquecer a animação anterior
  element.classList.add(className);
}
