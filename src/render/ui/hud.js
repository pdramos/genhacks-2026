// A "interface de jogo" (HUD): barra de cima, cartas das ferramentas, mensagens
// "toast", botão grande de começar o desastre, bússola do vento e cartão do resultado.
// Este ficheiro só mexe no HTML (DOM). Não sabe nada das regras do jogo:
// os outros módulos (buildPanel.js, disasterPlayer.js) chamam estas funções.
// O aspeto (cores, tamanhos, animações) está em hud.css.
import { coinIcon, flameIcon, windArrowIcon, houseIcon, schoolIcon } from './icons.js';

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

// ---------- Cartão do resultado (fim do desastre) ----------
// outcome = { housesSaved, housesTotal, schoolSaved } (vem da simulação).
// schoolLabel = o nome do edifício importante deste nível (em Sintra é o quartel dos bombeiros).
export function showResultCard(outcome, schoolLabel = 'School') {
  const allSaved = outcome.schoolSaved && outcome.housesSaved === outcome.housesTotal;
  const card = document.createElement('div');
  card.className = 'result-card ' + (allSaved ? 'good' : 'bad');
  card.setAttribute('role', 'dialog');
  card.innerHTML = `
    <div class="result-title">${allSaved ? 'Village saved!' : 'The fire is out'}</div>
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
    <div class="result-buttons">
      <button type="button" class="result-button secondary" data-do="look">Look around</button>
      <button type="button" class="result-button" data-do="again">Play again</button>
    </div>`;
  // "Look around" fecha o cartão (para ver a vila queimada); "Play again" recomeça o nível.
  card.querySelector('[data-do="look"]').addEventListener('click', () => card.remove());
  card.querySelector('[data-do="again"]').addEventListener('click', () => location.reload());
  document.body.append(card);
  return card;
}

// ---------- Pequenas ajudas ----------
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
