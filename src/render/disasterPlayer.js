// O botão "Start disaster" e a "reprodução" do incêndio no ecrã.
// As regras do fogo estão em src/sim/fire.js. Aqui só:
//   1) mostramos a cena do cigarro (ignitionCinematic.js);
//   2) pedimos à simulação o incêndio inteiro (uma lista de snapshots, um por passo de 10 minutos);
//   3) mostramos esses snapshots um a um, devagar, como um filme.
import * as THREE from 'three';
import { game, onFrame, onPhaseChange, setPhase } from './main.js';
import { runDisaster } from '../sim/fire.js';
import { playIgnition } from './ignitionCinematic.js';
import { createStartButton, showWind, hideWind, isWindVisible, setWindAngles, showResultCard } from './ui/hud.js';

// Ritmo do "filme": cada passo dura no máximo 2 segundos e o filme todo no máximo 40 segundos.
const MAX_STEP_MS = 2000;
const MAX_TOTAL_MS = 40000;
// Quanto tempo (mais ou menos) uma brasa demora a voar até cair (ver fireFx.ember).
const EMBER_FLIGHT_MS = 900;

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
}
onPhaseChange(updateUi);
updateUi(game.phase);

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

  // A bússola do vento só aparece depois da cena, para não ficar por baixo das barras de cinema.
  const wind = game.level.wind;
  showWind(`From ${compassName(wind.direction)} · ${wind.speed} km/h`);

  // 2) A simulação calcula o incêndio todo de uma vez, a partir da vila ATUAL
  //    (já com o que o jogador construiu). Não altera a vila.
  const { steps, outcome } = runDisaster(game.village, {
    ignition: game.level.ignition,
    wind,
    seed: game.level.seed ?? 1,
  });
  game.outcome = outcome; // o som (audioHooks.js) usa isto para saber se ganhámos

  // 3) Depois mostramos um passo de cada vez. O passo 0 (a ignição) aparece logo.
  const stepMs = Math.min(MAX_STEP_MS, MAX_TOTAL_MS / steps.length);
  const shownBurned = new Set(); // quadrados que já pintámos de queimado
  showSnapshot(steps[0], shownBurned, stepMs);
  if (steps.length === 1) return showResult(outcome); // nada pegou fogo
  let index = 1;
  const timer = setInterval(() => {
    showSnapshot(steps[index], shownBurned, stepMs);
    index++;
    if (index === steps.length) {
      clearInterval(timer);
      showResult(outcome);
    }
  }, stepMs);
}

// Mostra um snapshot:
//  - brasas (spots) a voar por cima do fogo; o quadrado onde caem só pega fogo quando ela aterra;
//  - chamas nos quadrados a arder, com a força (intensity) que a simulação calculou;
//  - nos quadrados que acabaram de arder: as chamas apagam-se, fica a fumegar e o chão fica carvão.
function showSnapshot(snapshot, shownBurned, stepMs) {
  const intensity = snapshot.intensity || {};
  const landing = new Set(); // quadrados que vão ser acesos por uma brasa a voar
  for (const [fromX, fromY, toX, toY] of snapshot.spots || []) {
    game.fireFx.ember(fromX, fromY, toX, toY);
    landing.add(`${toX},${toY}`);
  }
  for (const [x, y] of snapshot.burning) {
    const key = `${x},${y}`;
    if (intensity[key] !== undefined) game.fireFx.setIntensity(x, y, intensity[key]);
    if (!landing.has(key)) { game.fireFx.ignite(x, y); continue; }
    // A brasa demora quase 1 segundo a voar: acendemos o fogo quando ela chega ao chão.
    setTimeout(() => { if (!shownBurned.has(key)) game.fireFx.ignite(x, y); }, Math.min(EMBER_FLIGHT_MS, stepMs * 0.8));
  }
  for (const [x, y] of snapshot.burned) {
    const key = `${x},${y}`;
    if (shownBurned.has(key)) continue;
    game.fireFx.extinguish(x, y);
    game.fireFx.smolder(x, y);
    game.view.setBurned(x, y);
    shownBurned.add(key);
  }
  // Cada passo são 10 minutos simulados.
  const minutes = snapshot.step * 10;
  info.textContent = `Fire! ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min since ignition`;
}

function showResult(outcome) {
  const label = game.level.schoolName || 'School'; // em Sintra: o quartel dos bombeiros
  const school = `${label} ${outcome.schoolSaved ? 'saved' : 'lost'}`;
  info.textContent = `Houses saved: ${outcome.housesSaved} / ${outcome.housesTotal} · ${school}`;
  setPhase('result');
  showResultCard(outcome, label); // o cartão grande do fim, com "Play again"
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
  const radians = (game.level.wind.direction * Math.PI) / 180;
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
