// Ponto de entrada do jogo: carrega o nível, cria a vila (simulação) e mostra-a em 3D.
// ?style=portugal|canada escolhe o estilo da região (senão usa o do nível).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVillage } from '../sim/village.js';
import { setupRenderer, addLights } from './lighting.js';
import { createVillageView } from './village3d.js';
import { createFireFx } from './fireFx.js';

const params = new URLSearchParams(location.search);
const level = await fetch('data/levels/demo.json').then((r) => r.json());
const village = createVillage(level);
const styleName = params.get('style') || level.style || 'portugal';
const style = await import(`./styles/${styleName}.js`);

// ---------- Renderizador, cena, câmara ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
setupRenderer(renderer);
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
addLights(scene, 16);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
camera.position.set(22, 20, 22);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42; // não deixa ir para baixo do chão
controls.minDistance = 4;
controls.maxDistance = 55;

// ---------- A vila em 3D ----------
const rand = mulberry32(42); // acaso com semente: a vila sai sempre igual
const view = createVillageView(scene, village, style, rand);
const fireFx = createFireFx(scene, view);

// Exposto para os outros módulos do jogo (fase de construção, desastre) se ligarem.
// game.village é a MESMA vila que a fase de construção altera e que o fogo lê.
export const game = { level, village, view, fireFx, camera, renderer, phase: 'build' };

// ---------- Fases do jogo: 'build' (construir) -> 'disaster' (fogo) -> 'result' (estrelas) ----------
const phaseListeners = [];
export function onPhaseChange(fn) { phaseListeners.push(fn); }
export function setPhase(phase) {
  game.phase = phase;
  for (const fn of phaseListeners) fn(phase);
}

// ---------- Clique num quadrado ----------
// Distingue "clicar" de "arrastar a câmara": só conta se o rato quase não se mexeu.
const clickListeners = [];
export function onTileClick(fn) { clickListeners.push(fn); }
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  const tile = view.tileFromPointer(e, camera, renderer.domElement);
  for (const fn of clickListeners) fn(tile);
});
// Por agora: mostra o tipo do quadrado clicado.
onTileClick((tile) => {
  document.getElementById('info').textContent = tile
    ? `Tile (${tile.x}, ${tile.y}): ${village.tiles[tile.y][tile.x]}`
    : 'Outside the village';
});

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
  for (const fn of frameListeners) fn(dt, t);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Gerador de números "aleatórios" com semente (sempre a mesma sequência).
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
