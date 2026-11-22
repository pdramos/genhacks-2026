// "Os olhos" do jogo: desenha a vila da simulação em 3D e permite mudá-la depois.
// Não tem regras do jogo — só mostra o que a simulação diz.
// O chão (relevo, cores, estradas, rio, borda da ilha) é feito em terrain.js;
// aqui pomos por cima as casas, a escola, as árvores e o mato.
//
// API (o que o resto do jogo pode usar):
//   const view = createVillageView(scene, village, style, rand, options)
//                                    options.terrainScale = quanto sobe cada nível de altura (opcional;
//                                    vem do nível: o de Sintra exagera o relevo para se ver o morro)
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
import { createBackdrop } from './backdrop.js';

// Tamanho de um bloco (em quadrados). Maior = menos pedidos de desenho, mas mais trabalho
// para refazer o bloco quando um quadrado muda (por exemplo, quando arde).
const CHUNK = 8;

// O aspeto de "queimado" dos objetos vem de charring.js (feito por outra pessoa).
// Enquanto esse ficheiro não existir, usamos uma versão simples (pinta tudo de carvão).
const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1, flatShading: true });
let charProp = (group) => group.traverse((o) => { if (o.isMesh) o.material = charcoalMat; });
import('./charring.js').then((m) => { if (m.charProp) charProp = m.charProp; }).catch(() => {});

export function createVillageView(scene, village, style, rand, options = {}) {
  const halfX = (village.width - 1) / 2, halfZ = (village.height - 1) / 2;
  // Com cenário à volta, o chão continua para lá do mapa: nada de ribanceira de "ilha".
  const terrain = createTerrain(scene, village, style.palette, {
    verticalScale: options.terrainScale,
    uplift: style.terrainUplift, // (opcional) a serra mais íngreme, só no desenho
    cliff: !style.backdrop,
  });
  // O cenário à volta do mapa (serra, mar, povoações ao longe), se o estilo o tiver.
  if (style.backdrop) createBackdrop(scene, village, terrain, style.backdrop);
  let shadowListener = null; // quem quer saber que as sombras mudaram (ver onShadowsChanged)

  // tiles[y][x] = { type, prop, swaying: [...], animated: [...], baked, merged }
  //   baked  = os pontos do quadrado já "cozidos" (ver mergeProps.js), prontos a colar no bloco
  //   merged = true se o quadrado vai colado no bloco; false se o grupo está sozinho na cena
  //            (só os quadrados com coisas animadas que o estilo não marcou com userData.moving)
  //   loose  = as peças que mexem (userData.moving: bandeiras, pirilampos), soltas na cena
  const tiles = [];
  const props = []; // grupos de objetos, para o clique
  for (let y = 0; y < village.height; y++) {
    tiles.push([]);
    for (let x = 0; x < village.width; x++) {
      tiles[y].push({ type: null, prop: null, swaying: [], animated: [], loose: [], top: undefined, baked: null, merged: false });
    }
  }

  // Os blocos: chunks.get("bx,by") = { meshes: [...], dirty }. Um bloco "sujo" tem de ser refeito.
  const chunks = new Map();
  function markDirty(x, y) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, { bx: Math.floor(x / CHUNK), by: Math.floor(y / CHUNK), meshes: [], dirty: true });
    chunks.get(key).dirty = true;
  }

  // Os marcos da vila (só os estilos que quiserem os usam; ver findLandmarks, lá em baixo).
  let largo = null; // o centro do largo (se houver), para largoDistance
  const landmarks = findLandmarks();

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
    if (type === 'eucalyptus') addTrees(t, prop, 'conifer', 3, x, y);
    if (type === 'broadleaf') addTrees(t, prop, 'broadleaf', 1, x, y);
    if (type === 'brush') addBushes(prop);
    if (type === 'house') addHouse(prop, x, y);
    if (type === 'school') addSchool(prop, x, y);
    trimShadows(prop); // desempenho: as peças pequenas não fazem sombra
    shadowsChanged();
    prop.traverse((o) => { if (o.userData.animate) t.animated.push(o); });
    // Peças marcadas pelo estilo com userData.moving (bandeiras, pirilampos) saem do grupo e vão
    // sozinhas para a cena; o resto do quadrado é colado no bloco como os outros (desempenho:
    // uma casa com bandeira custava ~30 pedidos de desenho, agora custa 1).
    const moving = [];
    prop.traverse((o) => { if (o.isMesh && o.userData.moving) moving.push(o); });
    if (prop.children.length) {
      t.prop = prop;
      props.push(prop);
      if (moving.length) {
        prop.updateMatrixWorld(true);
        for (const o of moving) scene.attach(o); // attach: fica no mesmo sítio do mundo
        t.loose = moving;
        t.merged = true;
        t.baked = bakeTile(prop, t.swaying);
        markDirty(x, y);
      } else if (t.animated.length) {
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
    for (const o of t.loose) scene.remove(o);
    t.prop = null; t.swaying = []; t.animated = []; t.loose = []; t.top = undefined; t.baked = null; t.merged = false;
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

  // ctx (o 3.º argumento) é opcional no contrato: diz ao estilo se a árvore está no meio das casas
  // (ex.: o estilo sintra põe pinheiros-mansos e ciprestes na aldeia e eucaliptos só na serra).
  function addTrees(t, group, kind, count, x, y) {
    const ctx = { x, y, nearHouses: houseNeighbors(x, y) };
    for (let i = 0; i < count; i++) {
      const tree = style.buildTree(kind, rand, ctx);
      placeOnGround(group, tree, (rand() - 0.5) * 0.45, (rand() - 0.5) * 0.45);
      tree.rotation.y = rand() * Math.PI * 2;
      group.add(tree);
      t.swaying.push({ obj: tree, phase: rand() * 10 });
    }
  }

  function addBushes(group) {
    const count = style.bushesPerTile ?? 3; // o estilo pode pedir mato mais denso
    for (let i = 0; i < count; i++) {
      const b = style.buildBush(rand);
      placeOnGround(group, b, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6);
      b.rotation.y = rand() * Math.PI * 2;
      group.add(b);
    }
  }

  // A casa assenta no ponto MAIS BAIXO do seu terreno: numa encosta fica "encaixada" no
  // monte (como as casas reais), em vez de ficar a flutuar.
  // ctx (o 2.º argumento) é opcional no contrato: quantas casas há à volta (centro denso ou
  // periferia) e se este quadrado é um marco da vila ('chapel', 'hall'). Os outros estilos ignoram-no.
  // ctx.rotation = para onde a casa vai ficar virada; ctx.largoDistance = a que distância
  // (em quadrados) está do largo. Os outros estilos ignoram-nos.
  function addHouse(group, x, y) {
    const rotation = facingRoad(x, y); // a porta vira-se para a estrada mais próxima
    const ctx = {
      x, y, neighbors: houseNeighbors(x, y), landmark: landmarks.get(`${x},${y}`),
      rotation, largoDistance: largo ? Math.max(Math.abs(x - largo.x), Math.abs(y - largo.y)) : Infinity,
    };
    const house = style.buildHouse(rand, ctx);
    house.rotation.y = rotation;
    house.position.y = seat(group, 0, 0, 1, 1, ctx) - group.position.y;
    group.add(house);
  }

  // Onde assenta um edifício de w x h quadrados, deslocado (ox, oz) do centro do quadrado.
  // Sem muro de suporte no estilo: no ponto mais baixo do terreno (fica "encaixado" no monte).
  // Com style.buildTerrace: num PATAMAR plano, e do lado de baixo da encosta aparece o muro de
  // suporte. É isso que faz as casas da Malveira subirem a encosta em degraus.
  function seat(group, ox, oz, w, h, ctx) {
    const cx = group.position.x + ox, cz = group.position.z + oz;
    if (!style.buildTerrace) return lowestGround(cx, cz, w, h);
    let low = Infinity, high = -Infinity;
    for (const fx of [-0.45, -0.15, 0.15, 0.45]) {
      for (const fz of [-0.45, -0.15, 0.15, 0.45]) {
        const g = terrain.heightAtWorld(cx + fx * w, cz + fz * h);
        low = Math.min(low, g); high = Math.max(high, g);
      }
    }
    // o patamar fica a 3/4 do desnível: o lado de cima enterra-se um pouco no monte
    const platform = low + (high - low) * 0.75;
    const drop = platform - low;
    if (drop > 0.04) {
      const wall = style.buildTerrace(0.94 * w, 0.94 * h, drop + 0.08, ctx);
      wall.position.set(ox, platform - group.position.y, oz);
      group.add(wall);
    }
    return platform - 0.005;
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
    school.position.set((w - 1) / 2, seat(group, (w - 1) / 2, (h - 1) / 2, w, h, { x, y }) - group.position.y, (h - 1) / 2);
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

  // Quantas casas (ou a escola/quartel) há nos 8 quadrados à volta de (x, y): 0 = isolada, 8 = centro.
  // Lê o MAPA ORIGINAL do nível (village.tiles), por isso a resposta não muda durante o jogo.
  function houseNeighbors(x, y) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && inside(x + dx, y + dy) && ['house', 'school'].includes(tileAt(village, x + dx, y + dy))) n++;
      }
    }
    return n;
  }

  // Os marcos da vila, escolhidos SEMPRE da mesma maneira a partir do mapa:
  //   o LARGO = o primeiro bloco 2x2 só de estrada (lendo o mapa linha a linha);
  //   as casas coladas ao largo, por esta ordem: lado norte (oeste -> leste), leste, sul, oeste.
  //   A 1.ª é a capela ('chapel') e a 2.ª a sociedade recreativa ('hall').
  // Em Sintra o largo é (16,18)-(17,19): a capela fica em (16,17), a norte do largo, onde está a
  // Capela de N. Sra. da Assunção verdadeira, e a sociedade em (18,18), a leste (a avenida para Janes).
  // Devolve um Map "x,y" -> nome do marco (vazio se o mapa não tiver largo).
  function findLandmarks() {
    const found = new Map();
    const isRoad = (x, y) => inside(x, y) && tileAt(village, x, y) === 'road';
    for (let y = 0; y < village.height - 1; y++) {
      for (let x = 0; x < village.width - 1; x++) {
        if (!(isRoad(x, y) && isRoad(x + 1, y) && isRoad(x, y + 1) && isRoad(x + 1, y + 1))) continue;
        largo = { x: x + 0.5, y: y + 0.5 };
        const around = [[x, y - 1], [x + 1, y - 1], [x + 2, y], [x + 2, y + 1],
          [x, y + 2], [x + 1, y + 2], [x - 1, y], [x - 1, y + 1]];
        const houses = around.filter(([cx, cy]) => inside(cx, cy) && tileAt(village, cx, cy) === 'house');
        ['chapel', 'hall'].forEach((name, i) => { if (houses[i]) found.set(`${houses[i][0]},${houses[i][1]}`, name); });
        return found;
      }
    }
    return found;
  }

  // Mostra um quadrado queimado: chão de carvão e cinza, e os objetos carbonizados.
  function setBurned(x, y) {
    const t = tiles[y][x];
    terrain.setSurface(x, y, 'burned');
    // O tipo diz ao charring se são árvores, mato ou casas; a altura do chão serve para a cinza
    // seguir o relevo (sem bordas a flutuar nas encostas).
    if (t.prop) charProp(t.prop, t.type, terrain.heightAtWorld);
    shadowsChanged();
    for (const o of t.loose) o.visible = false; // as bandeiras ardem; os pirilampos apagam-se
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
