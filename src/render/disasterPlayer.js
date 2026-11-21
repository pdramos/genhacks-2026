// O botão "Start disaster" e a "reprodução" do incêndio no ecrã.
// As regras do fogo estão em src/sim/fire.js. Aqui só:
//   1) pedimos à simulação o incêndio inteiro (uma lista de snapshots, um por passo de 10 minutos);
//   2) mostramos esses snapshots um a um, devagar, como um filme.
import * as THREE from 'three';
import { game, onFrame, onPhaseChange, setPhase } from './main.js';
import { runDisaster } from '../sim/fire.js';
import { createStartButton, showWind, hideWind, isWindVisible, setWindAngles, showResultCard } from './ui/hud.js';

// Ritmo do "filme": cada passo dura no máximo 2 segundos e o filme todo no máximo 40 segundos.
const MAX_STEP_MS = 2000;
const MAX_TOTAL_MS = 40000;

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
function startDisaster() {
  if (game.phase !== 'build') return;
  setPhase('disaster');

  const wind = game.level.wind;
  showWind(`From ${compassName(wind.direction)} · ${wind.speed} km/h`);

  // A simulação calcula o incêndio todo de uma vez, a partir da vila ATUAL
  // (já com o que o jogador construiu). Não altera a vila.
  const { steps, outcome } = runDisaster(game.village, {
    ignition: game.level.ignition,
    wind,
    seed: game.level.seed ?? 1,
  });

  // Depois mostramos um passo de cada vez. O passo 0 (a ignição) aparece logo.
  const stepMs = Math.min(MAX_STEP_MS, MAX_TOTAL_MS / steps.length);
  const shownBurned = new Set(); // quadrados que já pintámos de queimado
  showSnapshot(steps[0], shownBurned);
  let index = 1;
  if (steps.length === 1) return showResult(outcome); // nada pegou fogo
  const timer = setInterval(() => {
    showSnapshot(steps[index], shownBurned);
    index++;
    if (index === steps.length) {
      clearInterval(timer);
      showResult(outcome);
    }
  }, stepMs);
}

// Mostra um snapshot: fogo nos quadrados a arder, cinza nos queimados.
function showSnapshot(snapshot, shownBurned) {
  for (const [x, y] of snapshot.burning) game.fireFx.ignite(x, y);
  for (const [x, y] of snapshot.burned) {
    const key = `${x},${y}`;
    if (shownBurned.has(key)) continue;
    game.fireFx.extinguish(x, y);
    game.view.setBurned(x, y);
    shownBurned.add(key);
  }
  // Cada passo são 10 minutos simulados.
  const minutes = snapshot.step * 10;
  info.textContent = `Fire! ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min since ignition`;
}

function showResult(outcome) {
  const school = outcome.schoolSaved ? 'School saved' : 'School lost';
  info.textContent = `Houses saved: ${outcome.housesSaved} / ${outcome.housesTotal} · ${school}`;
  setPhase('result');
  showResultCard(outcome); // o cartão grande do fim, com "Play again"
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
