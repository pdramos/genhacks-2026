// TESTE (spike) da vila em 3D com Three.js. Usa a MESMA simulação da versão 2D (src/sim/village.js).
// O aspeto das casas e árvores vem de um "estilo" por região (pasta styles/), escolhido com ?style=...
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVillage, tileAt } from '../src/sim/village.js';

const params = new URLSearchParams(location.search);
const level = await fetch('../data/levels/demo.json').then((r) => r.json());
const village = createVillage(level);
const styleName = params.get('style') || level.style || 'basic';
const style = await import(`./styles/${styleName}.js`);
document.getElementById('style').textContent = `Style: ${styleName}`;

// ---------- Cena, câmara, luz ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ff);
scene.fog = new THREE.Fog(0x9fd3ff, 40, 80);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
camera.position.set(22, 20, 22);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42;
controls.minDistance = 4;
controls.maxDistance = 55;

scene.add(new THREE.HemisphereLight(0xdfefff, 0x5a4a30, 1.2));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
scene.add(sun);

// ---------- Chão (cores vêm do estilo) ----------
const P = style.palette;
const groundMat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true, ...o });
const GM = {
  grass: groundMat(P.grass), brush: groundMat(P.brush), dirt: groundMat(P.dirt), road: groundMat(P.road),
  cleared: groundMat(P.cleared), firebreak: groundMat(P.firebreak), burned: groundMat(P.burned),
  water: groundMat(P.water, { roughness: 0.2, transparent: true, opacity: 0.85 }),
};

// ---------- Construir a vila ----------
const half = (village.width - 1) / 2;
const tileMeshes = [];
const props = new Map();
const animated = [];          // objetos com userData.animate
const swaying = [];           // árvores que balançam
const rand = mulberry32(42);  // acaso com semente: a vila sai sempre igual
const tileGeo = new THREE.BoxGeometry(1, 0.5, 1);
const waterGeo = new THREE.BoxGeometry(1, 0.35, 1);

for (let y = 0; y < village.height; y++) {
  for (let x = 0; x < village.width; x++) {
    const type = tileAt(village, x, y);
    const wx = x - half, wz = y - half;
    const isWater = type === 'water';
    const top = GM[type] || GM.grass;
    const block = new THREE.Mesh(isWater ? waterGeo : tileGeo, [GM.dirt, GM.dirt, top, GM.dirt, GM.dirt, GM.dirt]);
    block.position.set(wx, isWater ? -0.08 : 0, wz);
    block.receiveShadow = true;
    block.userData = { x, y, type };
    scene.add(block);
    tileMeshes.push(block);

    const prop = new THREE.Group();
    prop.position.set(wx, 0.25, wz);
    if (type === 'eucalyptus') addTrees(prop, 'conifer', 3);
    if (type === 'broadleaf') addTrees(prop, 'broadleaf', 1);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') {
      const house = style.buildHouse(rand);
      house.rotation.y = facingRoad(x, y); // a porta vira-se para a estrada mais próxima
      prop.add(house);
    }
    if (type === 'school') addSchool(prop, x, y);
    prop.traverse((o) => { if (o.userData.animate) animated.push(o); });
    if (prop.children.length) { scene.add(prop); props.set(`${x},${y}`, prop); }
  }
}
const base = new THREE.Mesh(new THREE.BoxGeometry(village.width + 0.4, 1.2, village.height + 0.4), GM.dirt);
base.position.y = -0.85;
scene.add(base);

// A escola pode ocupar vários quadrados (ex.: 2x2). Construímos UMA só escola, no
// quadrado do canto de cima-esquerda do bloco, aumentada para ocupar o bloco todo.
function addSchool(group, x, y) {
  const isSchool = (cx, cy) => cx >= 0 && cy >= 0 && cx < village.width && cy < village.height
    && tileAt(village, cx, cy) === 'school';
  if (isSchool(x - 1, y) || isSchool(x, y - 1)) return; // não é o canto: já foi construída
  let w = 1, h = 1;
  while (isSchool(x + w, y)) w++;
  while (isSchool(x, y + h)) h++;
  const school = style.buildSchool(rand);
  school.scale.setScalar(Math.min(w, h) * 0.95);
  school.position.set((w - 1) / 2, 0, (h - 1) / 2); // centro do bloco
  school.rotation.y = facingRoad(x, y);
  group.add(school);
}

// Ângulo (múltiplo de 90°) para o objeto olhar para a estrada mais próxima.
// Os estilos constroem as casas com a porta virada para +z.
function facingRoad(x, y) {
  let best = null;
  for (let r = 1; r <= 4 && !best; r++) {
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const cx = x + dx * r, cy = y + dy * r;
      if (cx >= 0 && cy >= 0 && cx < village.width && cy < village.height && tileAt(village, cx, cy) === 'road') {
        best = [dx, dy]; break;
      }
    }
  }
  if (!best) return 0;
  return Math.atan2(best[0], best[1]); // +z -> 0, +x -> 90°, -z -> 180°, -x -> -90°
}

function addTrees(group, kind, count) {
  for (let i = 0; i < count; i++) {
    const t = style.buildTree(kind, rand);
    t.position.set((rand() - 0.5) * 0.45, 0, (rand() - 0.5) * 0.45);
    t.rotation.y = rand() * Math.PI * 2;
    group.add(t);
    swaying.push({ obj: t, phase: rand() * 10 });
  }
}
function addBushes(group) {
  for (let i = 0; i < 3; i++) {
    const b = style.buildBush(rand);
    b.position.set((rand() - 0.5) * 0.6, 0, (rand() - 0.5) * 0.6);
    b.rotation.y = rand() * Math.PI * 2;
    group.add(b);
  }
}

// ---------- Clique: qual quadrado? ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(tileMeshes)[0];
  document.getElementById('info').textContent = hit
    ? `Tile (${hit.object.userData.x}, ${hit.object.userData.y}): ${hit.object.userData.type}`
    : 'Outside the village';
});

// ---------- Demonstração de fogo (só visual) ----------
const fires = [];
document.getElementById('fire').addEventListener('click', () => {
  [[2, 3], [3, 3], [2, 4]].forEach(([x, y]) => ignite(x, y));
});
function ignite(x, y) {
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return;
  const type = tileAt(village, x, y);
  if (['water', 'road', 'firebreak'].includes(type) || fires.some((f) => f.x === x && f.y === y)) return;
  const wx = x - half, wz = y - half;
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
  const pos = new Float32Array(n * 3), life = new Float32Array(n);
  for (let i = 0; i < n; i++) { resetParticle(pos, i); life[i] = rand(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true,
    opacity: isSmoke ? 0.45 : 0.9, blending: isSmoke ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  p.userData = { life, isSmoke };
  return p;
}
function resetParticle(pos, i) {
  pos[i * 3] = (rand() - 0.5) * 0.6; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (rand() - 0.5) * 0.6;
}
function burnTile(x, y) {
  const block = tileMeshes.find((m) => m.userData.x === x && m.userData.y === y);
  block.material = [GM.dirt, GM.dirt, GM.burned, GM.dirt, GM.dirt, GM.dirt];
  const prop = props.get(`${x},${y}`);
  if (prop) prop.traverse((o) => { if (o.isMesh) o.material = GM.burned; });
}

// ---------- Animação ----------
let lastMs = 0;
renderer.setAnimationLoop((ms) => {
  // ms = milissegundos desde o início; dt = segundos desde o último desenho
  const dt = lastMs ? Math.min((ms - lastMs) / 1000, 0.1) : 0, t = ms / 1000;
  lastMs = ms;
  controls.update();
  swaying.forEach((s) => { s.obj.rotation.z = Math.sin(t * 1.6 + s.phase) * 0.04; });
  animated.forEach((o) => o.userData.animate(t));
  GM.water.opacity = 0.8 + Math.sin(t * 2) * 0.05;
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
    f.light.intensity = 2 + Math.sin(t * 20 + f.x) * 0.6;
    if (f.age > 1.5 && !f.spread) {
      f.spread = true;
      burnTile(f.x, f.y);
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

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
