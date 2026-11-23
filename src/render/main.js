// Ponto de entrada do jogo: carrega o nível, cria a vila (simulação) e mostra-a em 3D.
// ?style=sintra|portugal|canada escolhe o estilo da região (senão usa o do nível).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVillage } from '../sim/village.js';
import { setupRenderer, addLights } from './lighting.js';
import { createVillageView } from './village3d.js';
import { createFireFx } from './fireFx.js';
import { createWindFx } from './windFx.js';
import { windForLevel } from '../sim/weather.js';
import { newSeed, saveRetry, loadRetry } from './runState.js';

const params = new URLSearchParams(location.search);
// ?level=demo carrega data/levels/demo.json (por omissão, o nível a sério: Sintra, outubro de 2018).
const levelName = params.get('level') || 'sintra';
const level = await fetch(`data/levels/${levelName}.json`, { cache: 'no-cache' }).then((r) => r.json());
const village = createVillage(level);
const styleName = params.get('style') || level.style || 'portugal';
const style = await import(`./styles/${styleName}.js`);

// ---------- A semente deste jogo ----------
// Cada jogo novo sorteia uma semente (é ela que decide onde cai o cigarro e o acaso do fogo).
// "Try again (same night)" (no cartão do fim) guarda a semente e o plano antes de recarregar
// a página: se os encontrarmos aqui, repetimos a MESMA noite com o MESMO plano.
// ?seed=123 fixa a semente à mão (útil para testar).
const RETRY_KEY = 'brace-retry';
const retry = takeRetry();
const seed = retry?.seed ?? (Number(params.get('seed')) || newSeed());

// Lê (e apaga logo) o "Try again" guardado. O try/catch é porque o navegador pode bloquear o
// sessionStorage (janela privada, por exemplo): nesse caso é só um jogo novo.
function takeRetry() {
  try {
    const text = sessionStorage.getItem(RETRY_KEY);
    sessionStorage.removeItem(RETRY_KEY);
    return loadRetry(text, levelName);
  } catch {
    return null;
  }
}

// ---------- Renderizador, cena, câmara ----------
// ?lowgpu = modo leve para computadores fracos (menos píxeis e sombras mais pequenas).
const lowGpu = params.has('lowgpu');
const renderer = new THREE.WebGLRenderer({ antialias: !lowGpu });
// Ecrãs "retina" têm 2 ou 3 píxeis por ponto: 1.5 já fica nítido e poupa muito a placa gráfica.
renderer.setPixelRatio(Math.min(devicePixelRatio, lowGpu ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight);
setupRenderer(renderer);
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
// O tamanho do mapa manda na câmara, nas sombras e no nevoeiro (o mapa de Sintra é 32x32).
const mapSize = Math.max(village.width, village.height);
// Metade do mapa (+ uma margem) tem de ter sombras do sol.
// style.dayFog (opcional): o estilo escolhe o nevoeiro de dia (Sintra: ar limpo, a serra nítida).
const lights = addLights(scene, mapSize / 2 + 2, { dayFog: style.dayFog }); // lights.setTimeOfDay(t): 0 = dia, 1 = noite (o fogo real foi às 22:50)
if (lowGpu) lights.sun.shadow.mapSize.set(1024, 1024);

// Se a janela ainda não tem tamanho (ex.: aberta escondida), innerHeight é 0 e a proporção dava
// NaN (e a câmara ficava perdida em [NaN, NaN, NaN]). Nesse caso usamos 1 até haver tamanho.
const viewAspect = () => (innerWidth > 0 && innerHeight > 0 ? innerWidth / innerHeight : 1);
const camera = new THREE.PerspectiveCamera(40, viewAspect(), 0.1, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.46; // não deixa ir para baixo do chão (mas deixa uma vista baixa, de lado)
controls.minDistance = 4;
// A distância a que o mapa todo cabe no ecrã (ver frameDistance, lá em baixo).
const startDistance = frameDistance();
controls.maxDistance = startDistance * 1.5;
// A câmara começa na mesma direção de sempre (de sudeste, a olhar para baixo),
// só que mais longe se o mapa for maior.
camera.position.set(22, 20, 22).setLength(startDistance);

// O nevoeiro de lighting.js foi pensado para um mapa 20x20 visto a ~37 de distância.
// Com a câmara mais longe, afastamos o nevoeiro na mesma proporção (senão o mapa grande
// ficava todo enevoado). Fazemos isto sempre que a hora do dia muda o nevoeiro.
const fogScale = Math.max(1, startDistance / 37);
const setTimeOfDay = lights.setTimeOfDay;
lights.setTimeOfDay = (t) => {
  setTimeOfDay(t);
  scene.fog.near *= fogScale;
  scene.fog.far *= fogScale;
};
lights.setTimeOfDay(0);

// A distância da câmara a que o mapa inteiro cabe no ecrã.
// Imaginamos uma bola à volta do mapa (raio = metade da diagonal) e afastamos a câmara até a
// bola caber no ângulo de visão mais apertado (o vertical, ou o horizontal num ecrã ao alto).
// O 0.95 aproxima um bocadinho, porque o mapa é plano e não ocupa a bola toda.
function frameDistance() {
  const radius = Math.hypot(village.width, village.height) / 2;
  const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);
  return (radius * 0.95) / Math.tan(Math.min(halfVertical, halfHorizontal));
}

// ---------- A vila em 3D ----------
const rand = mulberry32(42); // acaso com semente: a vila sai sempre igual
// level.terrainScale (opcional): mais relevo (Sintra: a Malveira está mesmo num morro).
const view = createVillageView(scene, village, style, rand, { terrainScale: level.terrainScale });
// A câmara gira à volta do chão do meio do mapa (com muito relevo, o meio já não está a y = 0).
const middle = view.worldPosition(Math.floor(village.width / 2), Math.floor(village.height / 2));
controls.target.set(0, middle.y * 0.6, 0);
// style.startView (opcional): o estilo escolhe de onde a câmara começa (Sintra: de sul e mais
// baixa, para se ver a serra e o céu por trás da vila).
if (style.startView) {
  const { azimuth = 45, elevation = 33, distance = 1, targetZ = 0, targetUp = 0 } = style.startView;
  const az = THREE.MathUtils.degToRad(azimuth), el = THREE.MathUtils.degToRad(elevation);
  const lookAt = view.worldPosition(Math.floor(village.width / 2), Math.floor(village.height / 2 + targetZ));
  controls.target.set(0, lookAt.y + targetUp, lookAt.z);
  camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    .multiplyScalar(startDistance * distance);
}
camera.position.add(controls.target);
// O fumo inclina-se com o vento do nível; o tipo de cada quadrado diz a altura das chamas.
// As sombras só são recalculadas quando a vila muda (construir, arder) ou quando alguém pede
// (a cena do cigarro liga o autoUpdate enquanto o carro anda). Poupa metade dos desenhos.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
view.onShadowsChanged(() => { renderer.shadowMap.needsUpdate = true; });
const fireFx = createFireFx(scene, view, { wind: level.wind, tileType: (x, y) => village.tiles[y]?.[x] });
// O vento À VISTA no mapa (riscos brancos a favor do vento, a manga de vento do quartel e as
// árvores inclinadas). Começa com a previsão (o vento do passo 0); durante o fogo, o
// disasterPlayer muda-o de hora a hora com game.windFx.setWind(direction, speed, gust).
const windFx = createWindFx(scene, { view, village, wind: windForLevel(level)(0) });
// De noite os riscos ficam mais discretos e a manga acende-se: juntamos isso à hora do dia.
const setTimeOfDayAndFog = lights.setTimeOfDay;
lights.setTimeOfDay = (t) => {
  setTimeOfDayAndFog(t);
  windFx.setNight(t);
};

// Exposto para os outros módulos do jogo (fase de construção, desastre) se ligarem.
// game.village é a MESMA vila que a fase de construção altera e que o fogo lê.
// scene e controls servem à cena do cigarro (ignitionCinematic.js), que move a câmara.
// seed = a semente deste jogo; retryPlan = o plano a repetir no "Try again" (ou null num jogo novo).
export const game = {
  level, levelName, village, view, fireFx, windFx, scene, camera, controls, renderer, lights, phase: 'build',
  seed, retryPlan: retry?.plan ?? null,
};

// Guarda a semente e o plano e recarrega a página: é o "Try again (same night)".
export function retrySameNight(plan) {
  try {
    sessionStorage.setItem(RETRY_KEY, saveRetry(levelName, seed, plan));
  } catch {
    // Sem sessionStorage não há como guardar: fica um jogo novo.
  }
  location.reload();
}

// ---------- Fases do jogo: 'build' (construir) -> 'disaster' (fogo) -> 'result' (estrelas) ----------
const phaseListeners = [];
export function onPhaseChange(fn) { phaseListeners.push(fn); }
export function setPhase(phase) {
  game.phase = phase;
  for (const fn of phaseListeners) fn(phase);
}

// ---------- Que quadrado está debaixo do rato? ----------
// view.tilesFromPointer dá os "candidatos" (o objeto da frente, ..., o chão). Quem escolhe
// entre eles é o "escolhedor": por omissão, o primeiro. O painel de construção troca-o
// (setTileChooser) para preferir um quadrado onde a ferramenta escolhida dá.
// O clique E o destaque do rato usam esta MESMA função: o que brilha é o que o clique muda.
let tileChooser = (candidates) => candidates[0] ?? null;
export function setTileChooser(fn) { tileChooser = fn; }
export function tileUnderPointer(event) {
  return tileChooser(view.tilesFromPointer(event, camera, renderer.domElement));
}

// ---------- Clique num quadrado ----------
// Distingue "clicar" de "arrastar a câmara": só conta se o rato quase não se mexeu.
const clickListeners = [];
export function onTileClick(fn) { clickListeners.push(fn); }
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  const tile = tileUnderPointer(e);
  for (const fn of clickListeners) fn(tile);
});
// Na fase de construção: mostra o nome do quadrado clicado (ex.: "Dry scrub").
// Esperamos um instante (setTimeout 0) para o painel de construção já ter feito a ação:
// assim mostramos o tipo NOVO (ex.: "Cleared land" logo depois de limpar o mato).
// Depois disso, #info mostra o relógio do fogo e a mensagem final, que um clique não pode apagar.
onTileClick((tile) => {
  if (game.phase !== 'build') return;
  setTimeout(() => {
    if (game.phase !== 'build') return;
    document.getElementById('info').textContent = tile ? tileName(village.tiles[tile.y][tile.x]) : 'Outside the village';
  }, 0);
});

// Nomes "de jogo" (em inglês) para cada tipo de quadrado.
const TILE_NAMES = {
  grass: 'Dry grass', brush: 'Dry scrub', eucalyptus: 'Eucalyptus & pine', broadleaf: 'Cork oaks & broadleaf',
  house: 'House', road: 'Road', water: 'Water', cleared: 'Cleared land', firebreak: 'Firebreak',
};
export function tileName(type) {
  if (type === 'school') return level.schoolName || 'School';
  return TILE_NAMES[type] || type;
}

// ---------- Ciclo de desenho ----------
const frameListeners = [];
export function onFrame(fn) { frameListeners.push(fn); }
let lastMs = 0;
renderer.setAnimationLoop((ms) => {
  // ms = milissegundos desde o início; dt = segundos desde o último desenho
  const dt = lastMs ? Math.min((ms - lastMs) / 1000, 0.1) : 0, t = ms / 1000;
  lastMs = ms;
  controls.update();
  view.update(t);
  fireFx.update(dt, t);
  windFx.update(dt, t);
  for (const fn of frameListeners) fn(dt, t);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = viewAspect();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  // Num ecrã mais estreito o mapa precisa de mais espaço: deixa afastar mais a câmara.
  const distance = frameDistance();
  controls.maxDistance = Math.max(Number.isFinite(controls.maxDistance) ? controls.maxDistance : 0, distance * 1.5);
  // Se a câmara se perdeu (NaN), põe-na outra vez no sítio do início.
  if (!Number.isFinite(camera.position.x)) camera.position.set(22, 20, 22).setLength(distance).add(controls.target);
});

// Gerador de números "aleatórios" com semente (sempre a mesma sequência).
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
