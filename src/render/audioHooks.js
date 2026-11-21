// Liga o som (audio.js) ao resto do jogo, sem mexer nos ficheiros dos outros.
// Só "escuta" o que acontece:
//   - a fase do jogo (onPhaseChange) -> ambiente: vento leve e pássaros, ou vento forte;
//   - cada desenho (onFrame)        -> o crepitar do fogo segue quantos quadrados ardem;
//   - cliques em botões e quadrados -> sons curtos (clique, construir, erro).
// Também põe o botão de som on/off.
//
// É carregado pelo index.html com a sua própria tag <script type="module">.
import { game, onPhaseChange, onFrame, onTileClick } from './main.js';
import { initAudio, setAmbience, setFireLevel, play, setMuted, isMuted, fireLevelFromCount } from './audio.js';

const MUTE_KEY = 'brace-muted';

// ---------- 1. Ligar o som no primeiro gesto do jogador ----------
// Os navegadores só deixam tocar som depois de um clique ou tecla (regra de "autoplay").
setMuted(loadMuted());
setAmbience(game.phase);
function startAudioOnce() {
  if (!initAudio()) return;
  removeEventListener('pointerdown', startAudioOnce, true);
  removeEventListener('keydown', startAudioOnce, true);
}
addEventListener('pointerdown', startAudioOnce, true);
addEventListener('keydown', startAudioOnce, true);

// ---------- 2. Contar os quadrados a arder ----------
// O fireFx não diz quantos fogos tem acesos, por isso "espreitamos" as suas funções:
// cada vez que alguém chama ignite/extinguish/clear, atualizamos a nossa lista
// e depois chamamos a função original (o fogo continua a funcionar igual).
const burningTiles = new Set();
const burnedTiles = new Set();
watchFireFx(game.fireFx);
watchBurnedTiles(game.view);

function watchFireFx(fireFx) {
  if (!fireFx) return;
  wrapMethod(fireFx, 'ignite', (x, y) => {
    if (burningTiles.size === 0 && game.phase === 'disaster') firstFlame();
    burningTiles.add(`${x},${y}`);
    updateFireSound();
  });
  wrapMethod(fireFx, 'extinguish', (x, y) => {
    burningTiles.delete(`${x},${y}`);
    updateFireSound();
  });
  wrapMethod(fireFx, 'clear', () => {
    burningTiles.clear();
    updateFireSound();
  });
}

// Para saber no fim se ganhámos ou perdemos, contamos as casas e a escola queimadas.
function watchBurnedTiles(view) {
  if (!view) return;
  wrapMethod(view, 'setBurned', (x, y) => {
    const type = game.village.tiles[y]?.[x];
    if (type === 'house' || type === 'school') burnedTiles.add(`${x},${y},${type}`);
  });
}

// Troca obj[name] por uma função que primeiro avisa "spy" e depois chama a original.
function wrapMethod(obj, name, spy) {
  const original = obj[name];
  if (typeof original !== 'function') return;
  obj[name] = function (...args) {
    try { spy(...args); } catch (error) { console.warn('audio hook:', error); }
    return original.apply(this, args);
  };
}

// A primeira chama: um "fuuush" e, uns segundos depois, uma sirene ao longe.
let sirenTimer = null;
function firstFlame() {
  play('ignite');
  clearTimeout(sirenTimer);
  sirenTimer = setTimeout(() => { if (game.phase === 'disaster') play('siren'); }, 5000);
}

// ---------- 3. Fases do jogo ----------
onPhaseChange((phase) => {
  setAmbience(phase);
  if (phase === 'disaster') {
    burningTiles.clear();
    burnedTiles.clear();
  }
  if (phase === 'result') setTimeout(() => play(playerWon() ? 'win' : 'lose'), 700);
});

// Ganhou se a escola se salvou e ardeu no máximo metade das casas.
// Se outro módulo publicar o resultado em game.outcome, usamos esse.
function playerWon() {
  const outcome = game.outcome;
  if (outcome && 'schoolSaved' in outcome) {
    return outcome.schoolSaved && outcome.housesSaved * 2 >= outcome.housesTotal;
  }
  const housesTotal = countTiles('house');
  const housesBurned = [...burnedTiles].filter((key) => key.endsWith(',house')).length;
  const schoolBurned = [...burnedTiles].some((key) => key.endsWith(',school'));
  return !schoolBurned && housesBurned * 2 <= housesTotal;
}

function countTiles(type) {
  return game.village.tiles.flat().filter((tile) => tile === type).length;
}

// ---------- 4. O som do fogo ----------
// Muda sempre que um fogo acende ou apaga, e também a cada desenho (onFrame),
// para o fogo se calar logo que se volta à fase de construção.
// Não é preciso suavizar aqui: o audio.js já desliza o volume devagar.
function updateFireSound() {
  const level = game.phase === 'build' ? 0 : fireLevelFromCount(burningTiles.size);
  setFireLevel(level);
}
onFrame(updateFireSound);

// ---------- 5. Cliques ----------
// Qualquer botão do jogo faz "tic" (menos o botão do som, que tem o seu próprio).
addEventListener('click', (event) => {
  const button = event.target.closest?.('button');
  if (!button || button.id === 'sound-toggle' || button.disabled) return;
  play('click');
}, true);

// Mensagens de erro: o painel de construção mostra-as com uma classe "error".
// Um "observador" do HTML apanha quando alguma coisa com "error" no nome aparece ou muda.
let lastErrorAt = 0;
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const element = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
    const added = [...mutation.addedNodes].filter((node) => node.nodeType === 1);
    if ([element, ...added].some(hasErrorClass)) lastErrorAt = performance.now();
  }
}).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });

function hasErrorClass(element) {
  const name = element && typeof element.className === 'string' ? element.className : '';
  return /error/i.test(name);
}

// Clique num quadrado: se o tipo do quadrado mudou, construiu-se algo; se apareceu um erro, "bzz".
// Esperamos um instante (setTimeout 0) para o painel de construção já ter feito o seu trabalho.
const knownTiles = game.village.tiles.map((row) => [...row]);
onTileClick((tile) => {
  if (game.phase !== 'build') return;
  const clickedAt = performance.now();
  setTimeout(() => {
    if (tile && game.village.tiles[tile.y][tile.x] !== knownTiles[tile.y][tile.x]) {
      knownTiles[tile.y][tile.x] = game.village.tiles[tile.y][tile.x];
      play('build');
    } else if (lastErrorAt >= clickedAt) {
      play('error');
    }
  }, 0);
});

// ---------- 6. Botão de som on/off ----------
// Se a interface já tiver um botão com id "sound-toggle", usamos esse; senão criamos um pequeno.
setTimeout(setupSoundButton, 0);
function setupSoundButton() {
  let button = document.getElementById('sound-toggle');
  const ours = !button;
  if (ours) button = createSoundButton();
  button.addEventListener('click', () => {
    initAudio();
    setMuted(!isMuted());
    saveMuted(isMuted());
    showMuted(button, ours);
  });
  showMuted(button, ours);
}

// Tecla "M" também liga/desliga o som.
addEventListener('keydown', (event) => {
  if (event.key !== 'm' && event.key !== 'M') return;
  if (event.target.closest?.('input, textarea')) return;
  document.getElementById('sound-toggle')?.click();
});

function createSoundButton() {
  const button = document.createElement('button');
  button.id = 'sound-toggle';
  button.type = 'button';
  button.style.cssText = 'position:fixed; top:12px; right:12px; z-index:20; width:44px; height:44px;' +
    'display:grid; place-items:center; padding:0; border:2px solid rgba(255,255,255,.7); border-radius:50%;' +
    'background:rgba(20,24,32,.65); color:#fff; cursor:pointer; box-shadow:0 3px 8px rgba(0,0,0,.35);';
  document.body.append(button);
  return button;
}

// Atualiza o botão: título, estado e (só no nosso botão) o desenho do altifalante.
function showMuted(button, ours) {
  const muted = isMuted();
  button.title = muted ? 'Sound off (M)' : 'Sound on (M)';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', String(muted));
  button.dataset.muted = String(muted);
  if (ours) button.innerHTML = speakerIcon(muted);
}

// Um altifalante desenhado em SVG: com ondas (som ligado) ou com um X (som desligado).
function speakerIcon(muted) {
  const waves = muted
    ? '<path d="M16 9l5 6M21 9l-5 6"/>'
    : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>';
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' + waves + '</svg>';
}

// O navegador lembra-se do mute entre visitas. Pode falhar (janela privada): aí ignoramos.
function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
function saveMuted(value) {
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* sem memória: tudo bem */ }
}
