// A "interface de jogo" (HUD): barra de cima, cartas das ferramentas, mensagens
// "toast", botão grande de começar o desastre, bússola do vento e cartão do resultado.
// Este ficheiro só mexe no HTML (DOM). Não sabe nada das regras do jogo:
// os outros módulos (buildPanel.js, disasterPlayer.js) chamam estas funções.
// O aspeto (cores, tamanhos, animações) está em hud.css.
import { coinIcon, flameIcon, windArrowIcon, houseIcon, schoolIcon } from './icons.js';
import { countStars } from '../../sim/stars.js';

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
const MAX_TOASTS = 3;
const TOAST_MS = 2200;

// Mostra uma mensagem curta que aparece, fica um pouco e desaparece.
// kind: 'info' (normal), 'success' (verde) ou 'error' (vermelho, abana).
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
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`;
  toast.textContent = text;
  toastStack.append(toast);
  // Demasiadas mensagens? Tira a mais antiga.
  if (toastStack.children.length > MAX_TOASTS) hideToast(toastStack.firstElementChild);
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

// Mostra a bússola com o texto (ex.: "From NW · 30 km/h").
export function showWind(text) {
  document.getElementById('wind-text').textContent = text;
  windChip.hidden = false;
}

export function hideWind() {
  windChip.hidden = true;
}

export function isWindVisible() {
  return !windChip.hidden;
}

// Roda a seta (para onde o vento empurra o fogo) e o "N" do mostrador,
// para baterem certo com o que se vê no ecrã. Ângulos em radianos, 0 = para a direita.
export function setWindAngles(arrowRadians, northRadians) {
  document.getElementById('wind-arrow').style.transform = `rotate(${arrowRadians}rad)`;
  // O "N" está desenhado em cima do mostrador (-90°), por isso somamos 90° (π/2).
  document.getElementById('wind-dial').style.transform = `rotate(${northRadians + Math.PI / 2}rad)`;
}

// ---------- Cartão do briefing (antes da construção) ----------
// Conta a história verdadeira do nível (level.briefing) e só depois deixa construir.
// onStart é chamado quando o jogador carrega em "Prepare the town".
export function showBriefingCard(level, onStart) {
  if (!level.briefing) { onStart?.(); return null; }
  const card = document.createElement('div');
  card.className = 'result-card briefing-card';
  card.setAttribute('role', 'dialog');
  card.innerHTML = `
    <div class="result-title">Mission briefing</div>
    <div class="briefing-name"></div>
    <div class="briefing-place"></div>
    <p class="briefing-text"></p>
    <div class="credit">Real weather of that night: Open-Meteo (CC BY 4.0)</div>
    <div class="result-buttons">
      <button type="button" class="result-button" data-do="start">Prepare the town</button>
    </div>`;
  card.querySelector('.briefing-name').textContent = level.name;
  card.querySelector('.briefing-place').textContent = level.place || '';
  card.querySelector('.briefing-text').textContent = level.briefing;
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
export function showResultCard(outcome, schoolLabel = 'School', level = {}) {
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
  // "Look around" fecha o cartão (para ver a vila queimada); "Play again" recomeça o nível.
  card.querySelector('[data-do="look"]').addEventListener('click', () => card.remove());
  card.querySelector('[data-do="again"]').addEventListener('click', () => location.reload());
  document.body.append(card);
  return card;
}

// ---------- Pequenas ajudas ----------
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
