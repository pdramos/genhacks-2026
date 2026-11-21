// TESTE (spike) da vila em 3D com Three.js. Código descartável: serve para decidir 3D vs 2D.
// Usa a MESMA simulação da versão 2D (src/sim/village.js) — só o desenho muda.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVillage, tileAt } from '../src/sim/village.js';

const level = await fetch('../data/levels/demo.json').then((r) => r.json());
const village = createVillage(level);

// ---------- Cena, câmara, luz ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;                 // sombras reais
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // cores mais "de cinema"
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ff);
scene.fog = new THREE.Fog(0x9fd3ff, 40, 80);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
camera.position.set(22, 20, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42;  // não deixa ir para baixo do chão
controls.minDistance = 8;
controls.maxDistance = 55;

scene.add(new THREE.HemisphereLight(0xdfefff, 0x5a4a30, 1.2)); // luz do céu + reflexo do chão
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
scene.add(sun);

// ---------- Materiais ----------
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });
const M = {
  grass: mat(0x79b94f), brush: mat(0x9c8f3e), dirt: mat(0x7a5634), road: mat(0x6f6f73),
  water: mat(0x3b8fd9, { roughness: 0.2, transparent: true, opacity: 0.85 }), sand: mat(0xd9c48f),
  cleared: mat(0xc9b38a), firebreak: mat(0x6b4a2c),
  trunk: mat(0x6b4426), pine: mat(0x2e6b3a), leaf: mat(0x4f9a46), bush: mat(0x7a8c35),
  wall: mat(0xf1e6d2), roofs: [mat(0xc0462d), mat(0x3e6fa8), mat(0x8a5a3c)], school: mat(0xf0b04a),
  window: mat(0x2c3e50, { roughness: 0.3 }), burned: mat(0x2a2522), ember: mat(0x3a1a0c),
};

// ---------- Construir a vila ----------
const TILE = 1;                       // 1 quadrado = 1 unidade
const half = (village.width - 1) / 2; // para centrar a vila na origem
const tilesGroup = new THREE.Group();
scene.add(tilesGroup);
const tileMeshes = [];                // para o clique (raycast)
const props = new Map();              // "x,y" -> objetos em cima do quadrado (árvores, casas)
const swaying = [];                   // árvores que balançam
const rand = mulberry32(42);          // acaso com semente: a vila fica sempre igual

for (let y = 0; y < village.height; y++) {
  for (let x = 0; x < village.width; x++) {
    const type = tileAt(village, x, y);
    const wx = (x - half) * TILE, wz = (y - half) * TILE;

    // Chão: um bloco com lateral de terra (efeito "maquete")
    const isWater = type === 'water';
    const top = { water: M.water, road: M.road, brush: M.brush, cleared: M.cleared, firebreak: M.firebreak }[type] || M.grass;
    const block = new THREE.Mesh(new THREE.BoxGeometry(TILE, isWater ? 0.35 : 0.5, TILE),
      [M.dirt, M.dirt, top, M.dirt, M.dirt, M.dirt]);
    block.position.set(wx, isWater ? -0.08 : 0, wz);
    block.receiveShadow = true;
    block.userData = { x, y, type };
    tilesGroup.add(block);
    tileMeshes.push(block);

    const prop = new THREE.Group();
    prop.position.set(wx, 0.25, wz);
    if (type === 'eucalyptus') addTrees(prop, 'pine', 2);
    if (type === 'broadleaf') addTrees(prop, 'round', 1);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') addHouse(prop, false);
    if (type === 'school') addHouse(prop, true);
    if (prop.children.length) { scene.add(prop); props.set(`${x},${y}`, prop); }
  }
}

// Base da "ilha" por baixo de tudo
const base = new THREE.Mesh(new THREE.BoxGeometry(village.width + 0.4, 1.2, village.height + 0.4), M.dirt);
base.position.y = -0.85;
scene.add(base);

function addTrees(group, kind, count) {
  for (let i = 0; i < count; i++) {
    const t = new THREE.Group();
    const h = 0.5 + rand() * 0.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h * 0.5, 6), M.trunk);
    trunk.position.y = h * 0.25;
    t.add(trunk);
    if (kind === 'pine') {
      for (let k = 0; k < 3; k++) { // três "andares" de cone
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.28 - k * 0.07, 0.4, 7), M.pine);
        c.position.y = h * 0.45 + k * 0.22;
        t.add(c);
      }
    } else {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + rand() * 0.08, 0), M.leaf);
      crown.position.y = h * 0.75;
      t.add(crown);
    }
    t.position.set((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5);
    t.rotation.y = rand() * Math.PI;
    t.traverse((o) => { o.castShadow = true; });
    group.add(t);
    swaying.push({ obj: t, phase: rand() * 10 });
  }
}

function addBushes(group) {
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rand() * 0.08, 0), M.bush);
    b.position.set((rand() - 0.5) * 0.7, 0.08, (rand() - 0.5) * 0.7);
    b.castShadow = true;
    group.add(b);
  }
}

function addHouse(group, isSchool) {
  const w = isSchool ? 0.85 : 0.6, h = isSchool ? 0.55 : 0.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), isSchool ? M.school : M.wall);
  body.position.y = h / 2;
  const roofMat = isSchool ? M.roofs[1] : M.roofs[Math.floor(rand() * 3)];
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, h * 0.7, 4), roofMat);
  roof.position.y = h + h * 0.35;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.02), M.window);
  door.position.set(0, 0.1, w * 0.4 + 0.01);
  [body, roof].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  group.add(body, roof, door);
  if (isSchool) { // mastro com bandeira
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7), M.window);
    pole.position.set(w * 0.55, 0.35, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.01), M.roofs[0]);
    flag.position.set(w * 0.55 + 0.1, 0.62, 0);
    group.add(pole, flag);
    swaying.push({ obj: flag, phase: 0, flag: true });
  }
  group.rotation.y = Math.floor(rand() * 4) * (Math.PI / 2);
}

// ---------- Clique: qual quadrado? ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return; // foi arrastar
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(tileMeshes)[0];
  document.getElementById('info').textContent = hit
    ? `Tile (${hit.object.userData.x}, ${hit.object.userData.y}): ${hit.object.userData.type}`
    : 'Outside the village';
});

// ---------- Demonstração de fogo (só visual, não é a regra do jogo) ----------
const fires = []; // { x, y, particles, smoke, age }
document.getElementById('fire').addEventListener('click', () => {
  const start = [[2, 3], [3, 3], [2, 4]]; // um canto da floresta
  start.forEach(([x, y]) => ignite(x, y));
});

function ignite(x, y) {
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return;
  const type = tileAt(village, x, y);
  if (['water', 'road', 'firebreak'].includes(type) || fires.some((f) => f.x === x && f.y === y)) return;
  const wx = (x - half) * TILE, wz = (y - half) * TILE;
  const flame = makeParticles(40, 0xff7a1a, 0.18);
  const smoke = makeParticles(25, 0x555555, 0.35, true);
  flame.position.set(wx, 0.3, wz); smoke.position.set(wx, 0.5, wz);
  const light = new THREE.PointLight(0xff7a2a, 2.5, 3);
  light.position.set(wx, 0.8, wz);
  scene.add(flame, smoke, light);
  fires.push({ x, y, flame, smoke, light, age: 0, spread: false });
}

function makeParticles(n, color, size, isSmoke = false) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const life = new Float32Array(n);
  for (let i = 0; i < n; i++) { resetParticle(pos, i); life[i] = rand(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity: isSmoke ? 0.45 : 0.9,
    blending: isSmoke ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  const p = new THREE.Points(geo, m);
  p.userData = { life, isSmoke };
  return p;
}
function resetParticle(pos, i) {
  pos[i * 3] = (rand() - 0.5) * 0.6; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (rand() - 0.5) * 0.6;
}

function burnTile(x, y) {
  const block = tileMeshes.find((m) => m.userData.x === x && m.userData.y === y);
  block.material = [M.dirt, M.dirt, M.burned, M.dirt, M.dirt, M.dirt];
  const prop = props.get(`${x},${y}`);
  if (prop) prop.traverse((o) => { if (o.isMesh) o.material = M.ember; });
}

// ---------- Ciclo de animação (≈60 vezes por segundo) ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta(), t = clock.elapsedTime;
  controls.update();

  // árvores balançam com o vento; bandeira abana
  swaying.forEach((s) => {
    if (s.flag) s.obj.rotation.y = Math.sin(t * 6) * 0.3;
    else s.obj.rotation.z = Math.sin(t * 1.6 + s.phase) * 0.04;
  });
  // água "respira"
  M.water.opacity = 0.8 + Math.sin(t * 2) * 0.05;

  // fogo: partículas sobem; depois de um tempo o quadrado queima e o fogo passa aos vizinhos
  for (const f of [...fires]) {
    f.age += dt;
    [f.flame, f.smoke].forEach((p) => {
      const pos = p.geometry.attributes.position.array, life = p.userData.life;
      for (let i = 0; i < life.length; i++) {
        life[i] += dt * (p.userData.isSmoke ? 0.4 : 1.4);
        pos[i * 3 + 1] = life[i] * (p.userData.isSmoke ? 1.8 : 0.9);
        if (life[i] > 1) { life[i] = 0; resetParticle(pos, i); }
      }
      p.geometry.attributes.position.needsUpdate = true;
    });
    f.light.intensity = 2 + Math.sin(t * 20 + f.x) * 0.6; // luz a tremeluzir
    if (f.age > 1.5 && !f.spread) {
      f.spread = true;
      burnTile(f.x, f.y);
      // espalha para leste (como se o vento soprasse de oeste) — só para o efeito visual
      [[1, 0], [1, 1], [0, 1]].forEach(([dx, dy]) => { if (rand() < 0.7) ignite(f.x + dx, f.y + dy); });
    }
    if (f.age > 4) { scene.remove(f.flame, f.smoke, f.light); fires.splice(fires.indexOf(f), 1); }
  }

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
