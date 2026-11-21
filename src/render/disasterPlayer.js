// O botão "Start disaster" e a "reprodução" do incêndio no ecrã.
// As regras do fogo estão em src/sim/fire.js. Aqui só:
//   1) mostramos a cena do cigarro (ignitionCinematic.js);
//   2) pedimos à simulação o incêndio inteiro (uma lista de snapshots, um por passo de 10 minutos);
//   3) mostramos esses snapshots um a um, devagar, como um filme.
import * as THREE from 'three';
import { game, onFrame, onPhaseChange, setPhase } from './main.js';
import { runDisaster } from '../sim/fire.js';
import { windForLevel, STEP_MINUTES } from '../sim/weather.js';
import { playIgnition } from './ignitionCinematic.js';
import { createStartButton, showWind, hideWind, isWindVisible, setWindAngles, showResultCard } from './ui/hud.js';

// Ritmo do "filme": cada passo dura no máximo 2 segundos e o filme todo no máximo 40 segundos.
const MAX_STEP_MS = 2000;
const MAX_TOTAL_MS = 40000;
// Quanto tempo (no máximo) uma brasa demora a voar até cair. O MESMO tempo vai para o
// fireFx.ember (a animação) e para o atraso do ignite: o fogo nasce quando a brasa aterra.
const EMBER_FLIGHT_MS = 1300;
// Quanto tempo demora a passagem do dia para a noite quando começa o desastre.
const DUSK_SECONDS = 2.5;

const info = document.getElementById('info');

// ---------- Botão "Start disaster" ----------
// O aspeto (botão redondo com uma chama) está em src/render/ui/.
const button = createStartButton(startDisaster);
document.getElementById('hud').appendChild(button);

// O botão só funciona na fase de construção; a bússola do vento só aparece durante e depois do fogo.
// body[data-phase] deixa o CSS mudar de cores conforme a fase (ex.: a caixa #info fica cor de fogo).
function updateUi(phase) {
  button.disabled = phase !== 'build';
  if (phase === 'build') hideWind();
  document.body.dataset.phase = phase;
  // O incêndio real foi às 22:50: o desastre passa-se de NOITE (e o fogo vê-se muito melhor).
  // No fim amanhece (o fogo real foi dominado de manhã), mas fica uma névoa de fumo.
  if (phase === 'disaster') nightTarget = 1;
  if (phase === 'result') nightTarget = 0.35;
}
// A hora do dia "anda" devagar até ao alvo (0 = dia, 1 = noite), a cada desenho.
let night = 0, nightTarget = 0;
onPhaseChange(updateUi);
updateUi(game.phase);
onFrame((dt) => {
  if (night === nightTarget) return;
  const step = dt / (nightTarget > night ? DUSK_SECONDS : DUSK_SECONDS * 3);
  night = nightTarget > night ? Math.min(nightTarget, night + step) : Math.max(nightTarget, night - step);
  game.lights?.setTimeOfDay(night);
});

// ---------- Começar o desastre ----------
// O fluxo: fase 'disaster' -> cena do cigarro -> simulação -> "filme" do fogo -> fase 'result'.
async function startDisaster() {
  if (game.phase !== 'build') return;
  setPhase('disaster');

  // 1) A cena do cigarro: um carro passa e atira uma ponta de cigarro para o mato seco.
  //    Esperamos (await) até ela acabar; o jogador pode saltá-la com um clique ou Espaço.
  //    Durante a cena escondemos a caixa #info (a cena tem as suas próprias legendas).
  info.style.visibility = 'hidden';
  await playIgnition(game);
  info.style.visibility = '';

  // 2) A simulação calcula o incêndio todo de uma vez, a partir da vila ATUAL
  //    (já com o que o jogador construiu). Não altera a vila.
  //    O vento é o VERDADEIRO do dia, hora a hora (Open-Meteo), se o nível o tiver.
  const wind = windForLevel(game.level);
  const { steps, outcome } = runDisaster(game.village, {
    ignition: game.level.ignition,
    wind,
    seed: game.level.seed ?? 1,
  });
  game.outcome = outcome; // o som (audioHooks.js) usa isto para saber se ganhámos
  // A bússola do vento só aparece depois da cena, para não ficar por baixo das barras de cinema.
  showWindAt(wind(0));

  // 3) Depois mostramos um passo de cada vez. O passo 0 (a ignição) aparece logo.
  const stepMs = Math.min(MAX_STEP_MS, MAX_TOTAL_MS / steps.length);
  const shown = new Map(); // "x,y" -> 'burning' ou 'burned' (o que já está no ecrã)
  showSnapshot(steps[0], shown, stepMs);
  if (steps.length === 1) return showResult(outcome); // nada pegou fogo
  let index = 1;
  const timer = setInterval(() => {
    const currentWind = wind(index - 1); // o vento que soprou durante este passo
    if (currentWind !== lastWind) showWindAt(currentWind);
    showSnapshot(steps[index], shown, stepMs);
    index++;
    if (index === steps.length) {
      clearInterval(timer);
      // Esperamos um passo: os últimos quadrados ainda estão a mudar (ver staggerMs).
      setTimeout(() => showResult(outcome), stepMs);
    }
  }, stepMs);
}

// Mostra o vento de agora na bússola e inclina o fumo para o lado certo.
// Com dados por hora, também diz a hora (ex.: "23:00").
let lastWind = null;
function showWindAt(wind) {
  lastWind = wind;
  const hour = wind.time ? ` · ${wind.time.slice(11, 16)}` : '';
  const gust = wind.gust ? `, gusts ${Math.round(wind.gust)}` : '';
  showWind(`From ${compassName(wind.direction)} · ${Math.round(wind.speed)} km/h${gust}${hour}`);
  game.fireFx.setWind?.(wind.direction, wind.speed);
}

// Um atraso fixo (de 0 a 90% de um passo) para cada quadrado, sempre igual para o mesmo
// quadrado. Assim os quadrados de um passo não acendem todos no mesmo instante: o fogo
// "escorre" pelo mapa em vez de avançar aos pulos. Como o ignite e o extinguish usam o
// MESMO atraso, cada quadrado arde no ecrã exatamente o número de passos da simulação.
function staggerMs(x, y, stepMs) {
  let h = Math.imul(x + 11, 374761393) ^ Math.imul(y + 17, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * stepMs * 0.9;
}

// Mostra um snapshot:
//  - brasas (spots) a voar por cima do fogo; o quadrado onde caem só pega fogo quando ela aterra;
//  - chamas nos quadrados a arder, com a força (intensity) que a simulação calculou;
//  - nos quadrados que acabaram de arder: as chamas apagam-se, fica a fumegar e o chão fica carvão.
function showSnapshot(snapshot, shown, stepMs) {
  const intensity = snapshot.intensity || {};
  const landing = new Set(); // quadrados que vão ser acesos por uma brasa a voar
  // A brasa voa durante flightMs e o fogo nasce exatamente quando ela aterra.
  const flightMs = Math.min(EMBER_FLIGHT_MS, stepMs * 0.8);
  for (const [fromX, fromY, toX, toY] of snapshot.spots || []) {
    game.fireFx.ember(fromX, fromY, toX, toY, flightMs / 1000);
    landing.add(`${toX},${toY}`);
  }
  for (const [x, y] of snapshot.burning) {
    const key = `${x},${y}`;
    if (intensity[key] !== undefined) game.fireFx.setIntensity(x, y, intensity[key]);
    if (shown.has(key)) continue; // já está a arder no ecrã
    shown.set(key, 'burning');
    // A ignição (passo 0) acende logo: a cena do cigarro já mostrou a primeira chama.
    const delay = landing.has(key) ? flightMs : snapshot.step === 0 ? 0 : staggerMs(x, y, stepMs);
    later(delay, () => { if (shown.get(key) === 'burning') game.fireFx.ignite(x, y); });
  }
  for (const [x, y] of snapshot.burned) {
    const key = `${x},${y}`;
    if (shown.get(key) === 'burned') continue;
    shown.set(key, 'burned');
    later(staggerMs(x, y, stepMs), () => {
      game.fireFx.extinguish(x, y);
      game.fireFx.smolder(x, y);
      game.view.setBurned(x, y);
    });
  }
  // Cada passo são 10 minutos simulados.
  const minutes = snapshot.step * STEP_MINUTES;
  info.textContent = `Fire! ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min since ignition`;
}

// Corre fn depois de ms milissegundos (0 = já, sem esperar).
function later(ms, fn) {
  if (ms <= 0) fn();
  else setTimeout(fn, ms);
}

function showResult(outcome) {
  const label = game.level.schoolName || 'School'; // em Sintra: o quartel dos bombeiros
  const school = `${label} ${outcome.schoolSaved ? 'saved' : 'lost'}`;
  info.textContent = `Houses saved: ${outcome.housesSaved} / ${outcome.housesTotal} · ${school}`;
  setPhase('result');
  showResultCard(outcome, label, game.level); // o cartão do fim: estrelas, a história real e as fontes
}

// Nome da direção na bússola: 0 -> N, 45 -> NE, 90 -> E, ...
function compassName(degrees) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(degrees / 45) % 8];
}

// ---------- A bússola roda com a câmara ----------
// A seta aponta para onde o vento EMPURRA o fogo (downwind), tal como se vê no ecrã,
// e o "N" do mostrador aponta para o norte do mapa.
// Projetamos pontos do mapa (o centro e um ponto noutra direção) para o ecrã
// e medimos o ângulo entre eles.
const center = new THREE.Vector3();
const ahead = new THREE.Vector3();
onFrame(() => {
  if (!isWindVisible()) return;
  const radians = ((lastWind ?? game.level.wind).direction * Math.PI) / 180;
  // No mundo 3D: x = leste e z = sul (como o y da grelha), por isso o norte é z negativo.
  const arrowAngle = screenAngle(-Math.sin(radians) * 3, Math.cos(radians) * 3);
  const northAngle = screenAngle(0, -3);
  setWindAngles(arrowAngle, northAngle);
});

// Ângulo no ecrã (radianos, 0 = para a direita) do centro do mapa até ao ponto (x, z).
function screenAngle(x, z) {
  center.set(0, 0, 0).project(game.camera);
  ahead.set(x, 0, z).project(game.camera);
  // project() dá coordenadas de -1 a 1; passamos para píxeis (o y do ecrã cresce para baixo).
  const pixelsX = (ahead.x - center.x) * innerWidth;
  const pixelsY = -(ahead.y - center.y) * innerHeight;
  return Math.atan2(pixelsY, pixelsX);
}
