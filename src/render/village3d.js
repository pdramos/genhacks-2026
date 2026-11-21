// "Os olhos" do jogo: desenha a vila da simulação em 3D e permite mudá-la depois.
// Não tem regras do jogo — só mostra o que a simulação diz.
// O chão (relevo, cores, estradas, rio, borda da ilha) é feito em terrain.js;
// aqui pomos por cima as casas, a escola, as árvores e o mato.
//
// API (o que o resto do jogo pode usar):
//   const view = createVillageView(scene, village, style, rand)
//   view.setTileType(x, y, type)   -> redesenha um quadrado com outro tipo (ex.: depois de construir)
//   view.setBurned(x, y)           -> mostra o quadrado queimado (chão de carvão e objetos carbonizados)
//   view.tileFromPointer(event, camera, canvas) -> {x, y} do quadrado clicado, ou null
//   view.worldPosition(x, y)       -> {x, y, z} no mundo 3D: centro do quadrado, y = altura do chão
//   view.update(t)                 -> animações (árvores ao vento, bandeiras, água); chamar a cada desenho
//   view.terrain                   -> o terreno (ver terrain.js), para quem precisar da altura exata
import * as THREE from 'three';
import { tileAt } from '../sim/village.js';
import { createTerrain } from './terrain.js';

// O aspeto de "queimado" dos objetos vem de charring.js (feito por outra pessoa).
// Enquanto esse ficheiro não existir, usamos uma versão simples (pinta tudo de carvão).
const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1, flatShading: true });
let charProp = (group) => group.traverse((o) => { if (o.isMesh) o.material = charcoalMat; });
import('./charring.js').then((m) => { if (m.charProp) charProp = m.charProp; }).catch(() => {});

export function createVillageView(scene, village, style, rand) {
  const halfX = (village.width - 1) / 2, halfZ = (village.height - 1) / 2;
  const terrain = createTerrain(scene, village, style.palette);

  // tiles[y][x] = { type, prop, swaying: [...], animated: [...] }
  const tiles = [];
  const props = []; // grupos de objetos, para o clique
  for (let y = 0; y < village.height; y++) {
    tiles.push([]);
    for (let x = 0; x < village.width; x++) tiles[y].push({ type: null, prop: null, swaying: [], animated: [] });
  }
  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) setTileType(x, y, tileAt(village, x, y));
  }

  // Centro do quadrado no mundo 3D; y é a altura do chão nesse ponto.
  function worldPosition(x, y) {
    return { x: x - halfX, y: terrain.groundHeight(x, y), z: y - halfZ };
  }

  // Redesenha um quadrado: a cor do chão e o que está em cima (árvores, casas...).
  function setTileType(x, y, type) {
    const t = tiles[y][x];
    removeProp(t);
    t.type = type;
    terrain.setSurface(x, y, type);

    const { x: wx, y: wy, z: wz } = worldPosition(x, y);
    const prop = new THREE.Group();
    prop.position.set(wx, wy, wz);
    prop.userData = { x, y };
    if (type === 'eucalyptus') addTrees(t, prop, 'conifer', 3);
    if (type === 'broadleaf') addTrees(t, prop, 'broadleaf', 1);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') addHouse(prop, x, y);
    if (type === 'school') addSchool(prop, x, y);
    prop.traverse((o) => { if (o.userData.animate) t.animated.push(o); });
    if (prop.children.length) { scene.add(prop); t.prop = prop; props.push(prop); }
  }

  function removeProp(t) {
    if (t.prop) {
      scene.remove(t.prop);
      props.splice(props.indexOf(t.prop), 1);
    }
    t.prop = null; t.swaying = []; t.animated = [];
  }

  // Põe um objeto dentro do quadrado, deslocado (ox, oz) do centro, assente no relevo.
  function placeOnGround(group, obj, ox, oz) {
    const ground = terrain.heightAtWorld(group.position.x + ox, group.position.z + oz);
    obj.position.set(ox, ground - group.position.y - 0.02, oz); // -0.02: enterra um pouco a base
  }

  function addTrees(t, group, kind, count) {
    for (let i = 0; i < count; i++) {
      const tree = style.buildTree(kind, rand);
      placeOnGround(group, tree, (rand() - 0.5) * 0.45, (rand() - 0.5) * 0.45);
      tree.rotation.y = rand() * Math.PI * 2;
      group.add(tree);
      t.swaying.push({ obj: tree, phase: rand() * 10 });
    }
  }

  function addBushes(group) {
    for (let i = 0; i < 3; i++) {
      const b = style.buildBush(rand);
      placeOnGround(group, b, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6);
      b.rotation.y = rand() * Math.PI * 2;
      group.add(b);
    }
  }

  // A casa assenta no ponto MAIS BAIXO do seu terreno: numa encosta fica "encaixada" no
  // monte (como as casas reais), em vez de ficar a flutuar.
  function addHouse(group, x, y) {
    const house = style.buildHouse(rand);
    house.rotation.y = facingRoad(x, y); // a porta vira-se para a estrada mais próxima
    house.position.y = lowestGround(group.position.x, group.position.z, 1, 1) - group.position.y;
    group.add(house);
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
    const cx = group.position.x + (w - 1) / 2, cz = group.position.z + (h - 1) / 2; // centro do bloco
    school.position.set((w - 1) / 2, lowestGround(cx, cz, w, h) - group.position.y, (h - 1) / 2);
    school.rotation.y = facingRoad(x, y);
    group.add(school);
  }

  // A altura mais baixa do chão debaixo de um retângulo w x h (em quadrados) centrado em (cx, cz).
  function lowestGround(cx, cz, w, h) {
    let low = Infinity;
    for (const fx of [-0.42, 0, 0.42]) {
      for (const fz of [-0.42, 0, 0.42]) low = Math.min(low, terrain.heightAtWorld(cx + fx * w, cz + fz * h));
    }
    // ...mas sem se afundar muito (ex.: uma casa à beira do rio não desce até à água)
    return Math.max(low, terrain.heightAtWorld(cx, cz) - 0.15) - 0.02;
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

  // Mostra um quadrado queimado: chão de carvão e cinza, e os objetos carbonizados.
  function setBurned(x, y) {
    const t = tiles[y][x];
    terrain.setSurface(x, y, 'burned');
    if (t.prop) charProp(t.prop);
    t.swaying = []; // árvores queimadas não balançam
  }

  // Descobre que quadrado está debaixo do rato (um "raio" sai da câmara pelo ponto clicado).
  // Se o raio bater primeiro numa casa ou árvore, conta o quadrado desse objeto.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function tileFromPointer(event, camera, canvas) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const propHit = raycaster.intersectObjects(props, true)[0];
    if (propHit) {
      let o = propHit.object;
      while (o && !(o.parent && o.parent.isScene)) o = o.parent; // sobe até ao grupo do quadrado
      if (o && o.userData.x !== undefined) return { x: o.userData.x, y: o.userData.y };
    }
    return terrain.pickTile(raycaster);
  }

  function update(t) {
    for (const row of tiles) {
      for (const tile of row) {
        for (const s of tile.swaying) s.obj.rotation.z = Math.sin(t * 1.6 + s.phase) * 0.04;
        for (const o of tile.animated) o.userData.animate(t);
      }
    }
    terrain.update(t);
  }

  return { setTileType, setBurned, tileFromPointer, worldPosition, update, terrain };
}
