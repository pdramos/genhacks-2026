// "Os olhos" do jogo: desenha a vila da simulação em 3D e permite mudá-la depois.
// Não tem regras do jogo — só mostra o que a simulação diz.
//
// API (o que o resto do jogo pode usar):
//   const view = createVillageView(scene, village, style, rand)
//   view.setTileType(x, y, type)   -> redesenha um quadrado com outro tipo (ex.: depois de construir)
//   view.setBurned(x, y)           -> pinta o quadrado como queimado (chão e objetos)
//   view.tileFromPointer(event, camera, canvas) -> {x, y} do quadrado clicado, ou null
//   view.worldPosition(x, y)       -> {x, z} no mundo 3D (centro do quadrado)
//   view.update(t)                 -> animações (árvores ao vento, bandeiras, água); chamar a cada desenho
import * as THREE from 'three';
import { tileAt } from '../sim/village.js';

export function createVillageView(scene, village, style, rand) {
  const half = (village.width - 1) / 2;

  // Materiais do chão (cores vêm do estilo da região)
  const P = style.palette;
  const groundMat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true, ...o });
  const GM = {
    grass: groundMat(P.grass), brush: groundMat(P.brush), dirt: groundMat(P.dirt), road: groundMat(P.road),
    cleared: groundMat(P.cleared), firebreak: groundMat(P.firebreak), burned: groundMat(P.burned),
    water: groundMat(P.water, { roughness: 0.2, transparent: true, opacity: 0.85 }),
  };
  const tileGeo = new THREE.BoxGeometry(1, 0.5, 1);
  const waterGeo = new THREE.BoxGeometry(1, 0.35, 1);

  // tiles[y][x] = { block, prop, swaying: [...], animated: [...] }
  const tiles = [];
  const blocks = []; // para o clique

  for (let y = 0; y < village.height; y++) {
    tiles.push([]);
    for (let x = 0; x < village.width; x++) {
      const block = new THREE.Mesh(tileGeo, GM.grass);
      block.receiveShadow = true;
      block.userData = { x, y };
      scene.add(block);
      blocks.push(block);
      tiles[y].push({ block, prop: null, swaying: [], animated: [] });
    }
  }
  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) setTileType(x, y, tileAt(village, x, y));
  }

  // Base da "ilha" por baixo de tudo
  const base = new THREE.Mesh(new THREE.BoxGeometry(village.width + 0.4, 1.2, village.height + 0.4), GM.dirt);
  base.position.y = -0.85;
  scene.add(base);

  function worldPosition(x, y) {
    return { x: x - half, z: y - half };
  }

  // Redesenha um quadrado: o bloco do chão e o que está em cima (árvores, casas...).
  function setTileType(x, y, type) {
    const t = tiles[y][x];
    if (t.prop) scene.remove(t.prop);
    t.prop = null; t.swaying = []; t.animated = [];

    const { x: wx, z: wz } = worldPosition(x, y);
    const isWater = type === 'water';
    t.block.geometry = isWater ? waterGeo : tileGeo;
    t.block.position.set(wx, isWater ? -0.08 : 0, wz);
    const top = GM[type] || GM.grass;
    t.block.material = [GM.dirt, GM.dirt, top, GM.dirt, GM.dirt, GM.dirt];

    const prop = new THREE.Group();
    prop.position.set(wx, 0.25, wz);
    if (type === 'eucalyptus') addTrees(t, prop, 'conifer', 3);
    if (type === 'broadleaf') addTrees(t, prop, 'broadleaf', 1);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') {
      const house = style.buildHouse(rand);
      house.rotation.y = facingRoad(x, y); // a porta vira-se para a estrada mais próxima
      prop.add(house);
    }
    if (type === 'school') addSchool(prop, x, y);
    prop.traverse((o) => { if (o.userData.animate) t.animated.push(o); });
    if (prop.children.length) { scene.add(prop); t.prop = prop; }
  }

  function addTrees(t, group, kind, count) {
    for (let i = 0; i < count; i++) {
      const tree = style.buildTree(kind, rand);
      tree.position.set((rand() - 0.5) * 0.45, 0, (rand() - 0.5) * 0.45);
      tree.rotation.y = rand() * Math.PI * 2;
      group.add(tree);
      t.swaying.push({ obj: tree, phase: rand() * 10 });
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

  // A escola pode ocupar vários quadrados (ex.: 2x2). Construímos UMA só escola, no
  // quadrado do canto de cima-esquerda do bloco, aumentada para ocupar o bloco todo.
  function addSchool(group, x, y) {
    const isSchool = (cx, cy) => inside(cx, cy) && tileAt(village, cx, cy) === 'school';
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
    for (let r = 1; r <= 4; r++) {
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const cx = x + dx * r, cy = y + dy * r;
        if (inside(cx, cy) && tileAt(village, cx, cy) === 'road') return Math.atan2(dx, dy);
      }
    }
    return 0;
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < village.width && y < village.height;
  }

  // Pinta um quadrado como queimado: chão escuro e tudo o que está em cima carbonizado.
  function setBurned(x, y) {
    const t = tiles[y][x];
    t.block.material = [GM.dirt, GM.dirt, GM.burned, GM.dirt, GM.dirt, GM.dirt];
    if (t.prop) t.prop.traverse((o) => { if (o.isMesh) o.material = GM.burned; });
    t.swaying = []; // árvores queimadas não balançam
  }

  // Descobre que quadrado está debaixo do rato (um "raio" sai da câmara pelo ponto clicado).
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function tileFromPointer(event, camera, canvas) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(blocks)[0];
    return hit ? { x: hit.object.userData.x, y: hit.object.userData.y } : null;
  }

  function update(t) {
    for (const row of tiles) {
      for (const tile of row) {
        for (const s of tile.swaying) s.obj.rotation.z = Math.sin(t * 1.6 + s.phase) * 0.04;
        for (const o of tile.animated) o.userData.animate(t);
      }
    }
    GM.water.opacity = 0.8 + Math.sin(t * 2) * 0.05;
  }

  return { setTileType, setBurned, tileFromPointer, worldPosition, update };
}
