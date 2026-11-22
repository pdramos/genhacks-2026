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
//   view.propTop(x, y)             -> altura (y no mundo) do topo das árvores/casas do quadrado, ou null
//   view.update(t)                 -> animações (árvores ao vento, bandeiras, água); chamar a cada desenho
//   view.terrain                   -> o terreno (ver terrain.js), para quem precisar da altura exata
//
// Desempenho: os objetos de cada quadrado NÃO vão diretamente para a cena. São "cozidos"
// (ver mergeProps.js) e colados por blocos de 8x8 quadrados, uma peça por material.
// Assim o mapa 32x32 passa de milhares de pedidos de desenho para umas centenas.
// Os grupos originais de cada quadrado continuam guardados: servem para o clique (raio),
// para medir a altura (propTop) e para o charring.js os carbonizar.
import * as THREE from 'three';
import { tileAt } from '../sim/village.js';
import { createTerrain } from './terrain.js';
import { bakeTile, buildMeshes, swayTime } from './mergeProps.js';

// Tamanho de um bloco (em quadrados). Maior = menos pedidos de desenho, mas mais trabalho
// para refazer o bloco quando um quadrado muda (por exemplo, quando arde).
const CHUNK = 8;

// O aspeto de "queimado" dos objetos vem de charring.js (feito por outra pessoa).
// Enquanto esse ficheiro não existir, usamos uma versão simples (pinta tudo de carvão).
const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1, flatShading: true });
let charProp = (group) => group.traverse((o) => { if (o.isMesh) o.material = charcoalMat; });
import('./charring.js').then((m) => { if (m.charProp) charProp = m.charProp; }).catch(() => {});

export function createVillageView(scene, village, style, rand) {
  const halfX = (village.width - 1) / 2, halfZ = (village.height - 1) / 2;
  const terrain = createTerrain(scene, village, style.palette);
  let shadowListener = null; // quem quer saber que as sombras mudaram (ver onShadowsChanged)

  // tiles[y][x] = { type, prop, swaying: [...], animated: [...], baked, merged }
  //   baked  = os pontos do quadrado já "cozidos" (ver mergeProps.js), prontos a colar no bloco
  //   merged = true se o quadrado vai colado no bloco; false se o grupo está sozinho na cena
  //            (só os quadrados com coisas animadas, como a bandeira do quartel)
  const tiles = [];
  const props = []; // grupos de objetos, para o clique
  for (let y = 0; y < village.height; y++) {
    tiles.push([]);
    for (let x = 0; x < village.width; x++) {
      tiles[y].push({ type: null, prop: null, swaying: [], animated: [], top: undefined, baked: null, merged: false });
    }
  }

  // Os blocos: chunks.get("bx,by") = { meshes: [...], dirty }. Um bloco "sujo" tem de ser refeito.
  const chunks = new Map();
  function markDirty(x, y) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, { bx: Math.floor(x / CHUNK), by: Math.floor(y / CHUNK), meshes: [], dirty: true });
    chunks.get(key).dirty = true;
  }

  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) setTileType(x, y, tileAt(village, x, y));
  }
  rebuildDirtyChunks();

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
    prop.userData = { x, y, isTile: true };
    if (type === 'eucalyptus') addTrees(t, prop, 'conifer', 3);
    if (type === 'broadleaf') addTrees(t, prop, 'broadleaf', 1);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') addHouse(prop, x, y);
    if (type === 'school') addSchool(prop, x, y);
    trimShadows(prop); // desempenho: as peças pequenas não fazem sombra
    shadowsChanged();
    prop.traverse((o) => { if (o.userData.animate) t.animated.push(o); });
    if (prop.children.length) {
      t.prop = prop;
      props.push(prop);
      if (t.animated.length) {
        scene.add(prop); // tem partes que mexem (bandeira, luzes): fica sozinho, como antes
      } else {
        t.merged = true; // vai colado no bloco
        t.baked = bakeTile(prop, t.swaying);
        markDirty(x, y);
      }
    }
  }

  function removeProp(t) {
    if (t.prop) {
      if (t.merged) markDirty(t.prop.userData.x, t.prop.userData.y);
      else scene.remove(t.prop);
      props.splice(props.indexOf(t.prop), 1);
    }
    t.prop = null; t.swaying = []; t.animated = []; t.top = undefined; t.baked = null; t.merged = false;
  }

  // Refaz os blocos sujos: junta os quadrados cozidos do bloco numa peça por material.
  function rebuildDirtyChunks() {
    let changed = false;
    for (const chunk of chunks.values()) {
      if (!chunk.dirty) continue;
      for (const mesh of chunk.meshes) { scene.remove(mesh); mesh.geometry.dispose(); }
      const baked = [];
      for (let y = chunk.by * CHUNK; y < Math.min((chunk.by + 1) * CHUNK, village.height); y++) {
        for (let x = chunk.bx * CHUNK; x < Math.min((chunk.bx + 1) * CHUNK, village.width); x++) {
          if (tiles[y][x].baked) baked.push(tiles[y][x].baked);
        }
      }
      chunk.meshes = buildMeshes(baked);
      for (const mesh of chunk.meshes) scene.add(mesh);
      chunk.dirty = false;
      changed = true;
    }
    if (changed) shadowsChanged(); // as sombras têm de ser redesenhadas
  }

  // O topo das coisas do quadrado (medido uma vez e guardado). null = quadrado sem objetos.
  function propTop(x, y) {
    const t = tiles[y]?.[x];
    if (!t) return null;
    if (t.top === undefined) {
      const box = t.prop ? new THREE.Box3().setFromObject(t.prop) : null;
      t.top = box && !box.isEmpty() ? box.max.y : null;
    }
    return t.top;
  }

  // ---------- Desempenho ----------
  // Cada peça (Mesh) é um "pedido" à placa gráfica, e cada peça que faz sombra é desenhada
  // DUAS vezes (uma para a sombra). Com milhares de peças, um portátil fraco fica lento.
  // Por isso colamos os quadrados em blocos (ver rebuildDirtyChunks e mergeProps.js).
  // Por isso o mapa das sombras só é redesenhado quando alguma coisa muda (ver main.js):
  // a vista avisa com onShadowsChanged.
  function onShadowsChanged(fn) { shadowListener = fn; }
  function shadowsChanged() { shadowListener?.(); }

  // As peças muito pequenas ou achatadas (janelas, flores, passeios, tocos) não fazem sombra:
  // a sombra delas quase não se vê, mas custava um desenho a mais cada uma.
  function trimShadows(group) {
    const size = new THREE.Vector3(), scale = new THREE.Vector3();
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!o.isMesh || !o.castShadow) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      o.geometry.boundingBox.getSize(size).multiply(o.getWorldScale(scale));
      if (Math.max(size.x, size.y, size.z) < 0.1 || size.y < 0.03) o.castShadow = false;
    });
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
    // O tipo diz ao charring se são árvores, mato ou casas; a altura do chão serve para a cinza
    // seguir o relevo (sem bordas a flutuar nas encostas).
    if (t.prop) charProp(t.prop, t.type, terrain.heightAtWorld);
    shadowsChanged();
    t.swaying = []; // árvores queimadas não balançam
    // Coze outra vez o quadrado (agora queimado) e marca o bloco para ser refeito no próximo frame.
    if (t.merged) {
      t.baked = bakeTile(t.prop, []);
      markDirty(x, y);
    }
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
      while (o && !o.userData.isTile) o = o.parent; // sobe até ao grupo do quadrado
      if (o) return { x: o.userData.x, y: o.userData.y };
    }
    return terrain.pickTile(raycaster);
  }

  function update(t) {
    swayTime.value = t; // as árvores coladas nos blocos balançam na placa gráfica (mergeProps.js)
    for (const row of tiles) {
      for (const tile of row) {
        if (!tile.merged) for (const s of tile.swaying) s.obj.rotation.z = Math.sin(t * 1.6 + s.phase) * 0.04;
        for (const o of tile.animated) o.userData.animate(t);
      }
    }
    rebuildDirtyChunks(); // os quadrados que mudaram (construir, arder) aparecem já neste frame
    terrain.update(t);
  }

  return { setTileType, setBurned, tileFromPointer, worldPosition, propTop, update, terrain, onShadowsChanged };
}
