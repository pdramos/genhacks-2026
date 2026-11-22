// ESTILO "SINTRA" — Malveira da Serra e a Serra de Sintra (Sintra/Cascais, perto de Lisboa),
// a zona do incêndio de 6-7 de outubro de 2018.
// Tudo é feito aqui com formas simples (caixas, cilindros e "pedras" de 20 triângulos): sem ficheiros.
// Segue o CONTRATO descrito em basic.js (palette, buildHouse, buildSchool, buildTree, buildBush).
// Extra (opcional, só este estilo usa): buildHouse(rand, ctx) e buildTree(kind, rand, ctx) recebem
// da vista um "contexto" (quantas casas há à volta, se é a capela do largo...). Sem ctx também
// funcionam (a galeria não o passa).
// Comparado com as fotos da Malveira da Serra (Wikimedia Commons) e o satélite: vivendas brancas
// de telhado laranja de 4 águas, sebes de cipreste, piscinas, pinheiros-mansos; nada de prédios.
// A cena é de OUTUBRO, no fim do verão seco: mato castanho-azeitona, relva cor de palha, sem flores.
// As cores vêm da pesquisa (fotos e textos sobre Sintra, Cascais e as aldeias saloias).
//
// Como ler este ficheiro (de cima para baixo):
//   1. Cores e cores do chão     2. Matemática avançada (não precisas de perceber isto agora)
//   3. Texturas desenhadas em código (azulejos, calçada, granito...)     4. Materiais
//   5. Geometrias partilhadas     6. Ajudantes (caixa, pau, telhado, janela, varanda...)
//   7. Casas (vivenda, casinhas do centro, casa saloia, café, solar, quinta, casa de granito,
//      e os marcos: capela com coreto e sociedade recreativa)     8. Quartel dos Bombeiros
//      e as bandeiras     9. Árvores     10. Arbustos (mato)
import * as THREE from 'three';

// =====================================================================================
// 1. CORES
// =====================================================================================
const COLORS = {
  // paredes (as paredes pintadas usam a textura de cal: estes valores são a cor da tinta)
  lime: 0xf4f1ea, limeShadow: 0xdcd6ca, cream: 0xefe3c2,
  paleYellow: 0xf0d27a, salmon: 0xe8b49a,
  // pedra
  cantaria: 0xd9cfbd, granite: 0x9a958c, graniteDark: 0x7d786f, lichen: 0xb7b49a,
  // barras e caixilhos
  saloioBlue: 0x2f5d9e, ochre: 0xd9a03a, green: 0x2e5e3a, brown: 0x6b4a2e,
  navy: 0x1f2a44, oxblood: 0x6e2a22, iron: 0x2b2b2b, glass: 0x4a6478, hole: 0x1e1b19,
  white: 0xffffff,
  // telhados (as telhas usam uma textura cinzenta: estes valores dão a cor)
  tile: 0xb5532f, tileAged: 0x8e4a2e, tileLichen: 0xa26a48, ridge: 0x8a3a24,
  // vivendas da Malveira (fotos): telha laranja Marselha/Lusa nova, normal e velha
  roofFresh: 0xd2693c, roofTypical: 0xc8643c, roofAged: 0xa9573a,
  hedge: 0x2f4a34, hedgeLit: 0x3d5b3f, lawn: 0x6f8f3e, poolWater: 0x3fa7c9,
  // chão à volta das casas
  yardEarth: 0xbfae8a, gravel: 0xcfc6b2, gardenGreen: 0x7d8a4a,
  // bombeiros
  fireRed: 0xb3261e, doorRed: 0x8e1c17, truckRed: 0xc62828, tyre: 0x1c1c1c, chrome: 0xc8c8c8,
  beacon: 0x2a6bff, pole: 0xd8d8d8, gold: 0xffcc00,
  // toldos
  awningGreen: 0x2f5a3c, awningRed: 0x9e3b2c, chair: 0xf2f2f2,
  // árvores (outubro)
  euBark: 0xc9b8a0, euPatch: 0x9c9488, euStrip: 0x8c7b66, euLeaf: 0x6f8c78, euLeafLit: 0x7e9a85,
  pineNeedle: 0x34502a, pineNeedleLit: 0x3e5b2e, pineCone: 0x8a4f2e,
  stonePine: 0x4a6b35, stonePineLit: 0x5c7f42, stonePineBark: 0x7a5235,
  cork: 0x8c8274, corkFresh: 0x8b3a1e, corkAged: 0x7a4030, oak: 0x4f6136, oakLit: 0x5e7340,
  holm: 0x3f4f33, holmLit: 0x4b5c3c, oakBark: 0x5e564c,
  palmTrunk: 0x8a7558, palmLeaf: 0x5f7a3a, palmDry: 0x9a8a5a,
  olive: 0x7d8a5a, oliveLit: 0x8f9a68,
  cypress: 0x2f4a34, lemon: 0x4e6a34, lemonFruit: 0xe8c62e,
  // mato (outubro: castanho-azeitona, nada de flores)
  gorse: 0x5c6e2e, gorseDry: 0x8a8a4a, rockrose: 0x4f5d3a, heather: 0x6b5a6e, heatherRust: 0x7d5c4e,
  broom: 0x6f7f3a, broomDry: 0x7d7a48, acacia: 0x556b2f, acaciaFeather: 0x7a8c6a, dryGrass: 0xb3a374,
};

// Cores do chão. Outubro, fim do verão seco: relva cor de palha, mato castanho-azeitona.
// O aceiro (firebreak) é terra de granito raspada, clara; o terreno limpo é restolho baixo.
// O queimado é CARVÃO (quase preto), nunca castanho: castanho parece lama.
// yard = o chão dos quintais: na Malveira cada vivenda tem jardim regado (verde-azeitona),
// por isso a vila vista de cima é "branco e laranja no meio do verde", e não cor de areia.
export const palette = {
  grass: 0xb8a874, brush: 0x5f6236, dirt: 0x8a7258, road: 0x55555a,
  cleared: 0xa3a874, firebreak: 0xd9cdb0, water: 0x2f7f9a, burned: 0x1f1d1b,
  yard: 0x6f7f3f,
};

// Opcional (só este estilo usa): quantos arbustos põe a vista em cada quadrado de mato.
// O mato da serra é um tapete contínuo de tojo e urze, não arbustos soltos.
export const bushesPerTile = 6;

// Opcional: o CENÁRIO à volta do mapa (desenhado por src/render/backdrop.js; não se joga lá).
// Posições no mundo (1 quadrado = 65 m; o centro do mapa é (0, 0); -z é o norte), a partir das
// cartas e do satélite. A vila da Malveira fica no quadrado (17, 17), ou seja, perto de (1.5, 1.5).
//   - Peninha (487 m), com o santuário branco no cume, ~2 km a NNO: a serra que se vê atrás da vila;
//   - a cumeada até ao Monge (~490 m) a norte, toda de pinhal escuro com penedos de granito;
//   - Cruz Alta (528 m, o ponto mais alto da serra), longe para nordeste;
//   - a cúpula a nordeste, de cume pelado cor de ferrugem;
//   - a oeste, mato baixo cor de caqui a descer para a costa e o Guincho (o mar a sudoeste);
//   - a sul e a leste, Janes, Alcorvim, Alcabideche e Cascais: casinhas brancas ao longe.
// Nas fotos o ar é limpo e o céu azul-forte: a crista da serra recorta-se, verde-escura, contra o
// céu. Por isso este estilo pede um nevoeiro de dia mais LONGE e azulado (e não uma neblina branca).
// (Como o do lighting.js, main.js ainda o afasta na proporção do tamanho do mapa: ~1.55x aqui.)
export const dayFog = { color: 0xa9cbe6, near: 44, far: 140 };

export const backdrop = {
  metresPerLevel: 31, minMetres: 85,
  lift: { above: 330, factor: 2.6 },   // a serra ao fundo, exagerada (é cenário: o morro "enche" o céu como nas fotos)
  range: 200,  // o chão vai até longe: o nevoeiro azul apaga-o antes de se ver a ponta
  blend: 6,    // a serra começa logo a seguir à borda do mapa
  // o terreno "de fundo" em metros: continua o declive do mapa (alto a norte, baixo a sul)
  base(x, z) {
    let m = 210 - z * 7.5;
    if (z < -16) m = 330 + (-16 - z) * 3;
    if (z > 16) m = 90 - (z - 16) * 1.2;
    m -= Math.max(0, -x - 18) * 1.5;
    return Math.max(25, m);
  },
  peaks: [
    { x: -14, z: -25, metres: 487, radius: 9, cover: 'pine', tors: 70, sanctuary: true },  // Peninha
    { x: -5, z: -33, metres: 455, radius: 9, cover: 'pine', tors: 30 },                    // cumeada
    { x: 5, z: -41, metres: 490, radius: 13, cover: 'pine', tors: 50 },                    // Monge
    { x: 11, z: -36, metres: 450, radius: 10, cover: 'pine', tors: 25 },                   // cumeada para leste
    { x: -26, z: -30, metres: 430, radius: 10, cover: 'pine', tors: 30 },                  // cumeada para oeste
    { x: 55, z: -52, metres: 528, radius: 18, cover: 'pine', tors: 40 },                   // Cruz Alta
    // a cúpula NE (o "morro" das fotos): redonda, com um cume grande e pelado cor de ferrugem
    { x: 20, z: -21, metres: 460, radius: 10.5, dome: true, cover: 'pine', bareTop: true, bareRadius: 0.42, tors: 25 },
    { x: -40, z: -28, metres: 300, radius: 14, cover: 'scrub', tors: 25 },                 // para o Cabo da Roca
    { x: -30, z: -2, metres: 215, radius: 10, cover: 'scrub' },
    // metres: 0 = só pinhal, sem levantar o chão. A encosta sul da serra a leste (pinhal cerrado,
    // como no mapa) e os vales a sul da vila, com pinhal escuro (fotos e satélite)
    { x: 5, z: -21, metres: 0, radius: 7, cover: 'pine' },
    { x: 26, z: -8, metres: 0, radius: 8, cover: 'pine' },
    { x: -7, z: 26, metres: 0, radius: 5, cover: 'pine' },
    { x: 3, z: 31, metres: 0, radius: 5, cover: 'pine' },
    { x: -15, z: 31, metres: 0, radius: 5, cover: 'pine' },
  ],
  // penedos grandes no ombro leste da cúpula (nas fotos, os "tors" de granito cinzento)
  torClusters: [{ x: 25, z: -21, radius: 2.8, count: 18, size: 1.8 }],
  pines: { range: 90, max: 24000, denseScale: 1.3 }, // pinhal cerrado, de copas grandes
  hedgeRows: { count: 30, length: 4.5 },                // sebes escuras compridas entre os campos
  scrubWest: -20,
  lowlandTrees: 0.05,
  // a costa, de norte para sul e depois para leste (o mar fica à direita de quem a percorre)
  coast: [[-80, -90], [-66, -40], [-54, 0], [-42, 24], [-35, 40], [-28, 52], [-10, 70], [20, 84], [60, 94], [160, 100]],
  colours: {
    // cor-de-azeitona (mato e campos verdes); a cor de palha só em manchas de restolho
    pine: 0x2b3f26, pineLit: 0x3d5531, pineFloor: 0x2f3b24, scrub: 0x6f7444, scrubDark: 0x5a5f36,
    granite: 0x8f8c85, bare: 0x74503a, field: 0x6f7d3c, fieldDry: 0xa99b68, sand: 0xd8caa2,
    sea: 0x2a6f8e, track: 0xd6c9a6, hedge: 0x2a4230,
  },
  // aceiros e carreiros de terra clara a subir a encosta a noroeste (fotos e satélite)
  tracks: [
    { x0: -22, z0: -12, x1: -15, z1: -27, turns: 6, width: 2.2 },
    { x0: -33, z0: -10, x1: -27, z1: -27, turns: 5, width: 2.6 },
    { x0: -19, z0: -17, x1: -38, z1: -22, turns: 2, width: 1.5 },
  ],
  towns: [
    { x: 27, z: 0, radius: 6, count: 60 },     // Janes
    { x: 24, z: 22, radius: 7, count: 60 },    // Malveira (o resto da aldeia, a sueste)
    { x: 6, z: 30, radius: 10, count: 130 },   // Alcorvim, Alcabideche
    { x: 22, z: 72, radius: 20, count: 300 },  // Cascais, ao longe
    { x: -20, z: 40, radius: 6, count: 40 },   // Areia, junto ao Guincho
  ],
};

// Opcional: o MURO DE SUPORTE debaixo de uma casa numa encosta (a vista põe a casa num patamar
// plano e, do lado de baixo, aparece este muro). Na Malveira as casas sobem a encosta em degraus,
// cada uma no seu socalco de muro caiado ou de pedra de granito.
// w x d = o tamanho do patamar; h = a altura do muro (o topo fica em y = 0).
export function buildTerrace(w, d, h, ctx = {}) {
  const g = new THREE.Group();
  const stone = ctx.x !== undefined && tileHash(ctx.x + 7, ctx.y + 3) < 0.35;
  box(g, stone ? MATERIALS.graniteWall : MATERIALS.lime, w, h, d, 0, -h / 2, 0);
  box(g, MATERIALS.whiteTrim, w + 0.02, 0.018, d + 0.02, 0, -0.009, 0);                 // capeamento
  if (!stone) box(g, MATERIALS.granite, w + 0.006, Math.min(0.05, h * 0.5), d + 0.006, 0, -h + 0.025, 0); // sapata
  mergeByMaterial(g);
  return shadows(g);
}

// =====================================================================================
// 2. MATEMÁTICA AVANÇADA — não precisas de perceber isto agora.
//    São ferramentas: usa-as como "caixas pretas" (sabes o que entra e o que sai).
//    (São as mesmas ferramentas do estilo portugal.js.)
// =====================================================================================

// Gerador de acaso FIXO só para desenhar as texturas (sai sempre igual; não mexe no rand() da vila).
function seeded(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// Desenha uma imagem num <canvas> (uma só vez) e transforma-a numa textura que se repete.
function canvasTexture(width, height, draw, isColor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;                                 // textura nítida mesmo vista de lado
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace; // imagem com cores "a sério" (azulejo, bandeira)
  return tex;
}

// Um número "ao calhas" mas sempre igual para o mesmo ponto (x, y, z). Serve para amolgar as pedras.
function hash(x, y, z, salt) {
  let h = Math.round(x * 1e4) * 374761393 + Math.round(y * 1e4) * 668265263
    + Math.round(z * 1e4) * 2246822519 + salt * 144269;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// "Pedra" irregular: um icosaedro (20 faces) com os cantos empurrados para dentro/fora.
function jagged(radius, detail, amount, salt) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const f = 1 + (hash(p.getX(i), p.getY(i), p.getZ(i), salt) - 0.5) * amount;
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

// Caixa cuja textura tem SEMPRE o mesmo tamanho no mundo (uma chaminé fina e uma parede
// comprida mostram azulejos do mesmo tamanho). A textura repete-se a cada `uvTile` unidades.
const worldBoxCache = new Map();
function worldBoxGeometry(sx, sy, sz, uvTile) {
  const key = [sx, sy, sz, uvTile].map((n) => n.toFixed(4)).join(',');
  if (worldBoxCache.has(key)) return worldBoxCache.get(key);
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uv = geo.attributes.uv;
  // a caixa tem 6 faces de 4 cantos, por esta ordem: +x, -x, +y, -y, +z, -z
  const faceSizes = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let i = 0; i < uv.count; i++) {
    const size = faceSizes[Math.floor(i / 4)];
    uv.setXY(i, (uv.getX(i) * size[0]) / uvTile, (uv.getY(i) * size[1]) / uvTile);
  }
  worldBoxCache.set(key, geo);
  return geo;
}

// Telhado/prisma em forma de "cunha": base w (ao longo de x) por d (ao longo de z), altura h.
// ridgeHalf = metade do comprimento da cumeeira. ridgeHalf = w/2 -> 2 águas (empena); menor -> 4 águas.
// uvAlong / uvDown = de quantas em quantas unidades a textura se repete.
const wedgeCache = new Map();
function wedgeGeometry(w, d, h, ridgeHalf, uvAlong = 0.8, uvDown = 0.4) {
  const key = [w, d, h, ridgeHalf, uvAlong, uvDown].map((n) => n.toFixed(4)).join(',');
  if (wedgeCache.has(key)) return wedgeCache.get(key);
  const hw = w / 2, hd = d / 2;
  const backLeft = [-hw, 0, -hd], backRight = [hw, 0, -hd];
  const frontRight = [hw, 0, hd], frontLeft = [-hw, 0, hd];
  const ridgeLeft = [-ridgeHalf, h, 0], ridgeRight = [ridgeHalf, h, 0];
  const triangles = [
    [frontLeft, frontRight, ridgeRight], [frontLeft, ridgeRight, ridgeLeft],   // água da frente
    [backRight, backLeft, ridgeLeft], [backRight, ridgeLeft, ridgeRight],      // água de trás
    [frontRight, backRight, ridgeRight], [backLeft, frontLeft, ridgeLeft],     // pontas
    [backLeft, backRight, frontRight], [backLeft, frontRight, frontLeft],      // fundo
  ];
  const pos = [], uv = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const normal = new THREE.Vector3(), along = new THREE.Vector3(), down = new THREE.Vector3();
  for (const [p1, p2, p3] of triangles) {
    a.fromArray(p1); b.fromArray(p2); c.fromArray(p3);
    normal.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    if (Math.abs(normal.y) > 0.99) along.set(1, 0, 0);
    else along.set(normal.z, 0, -normal.x).normalize();
    down.crossVectors(normal, along);
    for (const p of [a, b, c]) {
      pos.push(p.x, p.y, p.z);
      uv.push(p.dot(along) / uvAlong, p.dot(down) / uvDown);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  wedgeCache.set(key, geo);
  return geo;
}

// JUNTAR PEÇAS para o computador desenhar mais depressa.
// Junta todas as peças com o MESMO material numa só peça (menos "pedidos" à placa gráfica).
// Peças com userData.keepSeparate (ex.: a bandeira e as luzes, que mexem) ficam de fora.
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  const kept = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const matrix = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
    if (o.userData.keepSeparate) { kept.push({ mesh: o, matrix }); return; }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(matrix);
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(geo);
  });
  root.clear();
  for (const [material, geos] of groups) {
    root.add(new THREE.Mesh(joinGeometries(geos), material));
    for (const geo of geos) geo.dispose();
  }
  for (const { mesh, matrix } of kept) {
    matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    root.add(mesh);
  }
  return root;
}

// Cola várias geometrias (sem índices) numa só: põe as listas de pontos umas a seguir às outras.
function joinGeometries(geos) {
  const out = new THREE.BufferGeometry();
  let total = 0;
  for (const geo of geos) total += geo.attributes.position.count;
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const array = new Float32Array(total * size);
    let offset = 0;
    for (const geo of geos) {
      const attr = geo.attributes[name];
      if (attr) array.set(attr.array.subarray(0, attr.count * size), offset);
      offset += geo.attributes.position.count * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, size));
  }
  return out;
}

// =====================================================================================
// 3. TEXTURAS DESENHADAS EM CÓDIGO (num <canvas>, uma só vez)
// =====================================================================================
// Um tom de cinzento (0 = preto, 1 = branco). As texturas "cinzentas" escurecem a cor do material.
const gray = (v) => {
  const n = Math.round(v * 255);
  return `rgb(${n},${n},${n})`;
};
const grayA = (v, a) => {
  const n = Math.round(v * 255);
  return `rgba(${n},${n},${n},${a})`;
};

// Cal: uma máscara quase branca, com manchas suaves e escorridos da chuva (paredes pintadas).
const limewashTex = canvasTexture(128, 128, (ctx, w, h) => {
  const r = seeded(17);
  ctx.fillStyle = gray(0.97);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {                             // 40 manchas redondas e suaves
    const cx = r() * w, cy = r() * h;
    const radius = 6 + r() * 14;
    const tone = 0.9 + r() * 0.1;
    for (const [dx, dy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {   // repete nas bordas
      const grad = ctx.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, radius);
      grad.addColorStop(0, grayA(tone, 0.8));
      grad.addColorStop(1, grayA(tone, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(cx + dx - radius, cy + dy - radius, radius * 2, radius * 2);
    }
  }
  ctx.fillStyle = gray(0.92);
  for (let i = 0; i < 6; i++) {                              // 6 escorridos finos ao alto
    const x = Math.floor(r() * w);
    const top = Math.floor(r() * h);
    const len = 30 + Math.floor(r() * 60);
    const width = 1 + Math.floor(r() * 2);
    ctx.fillRect(x, top, width, len);
    ctx.fillRect(x, top - h, width, len);
  }
});

// Telha (canudo e marselha): filas de "capas" redondas e claras e "canais" mais escuros,
// cada fila desencontrada meia telha. Há manchas escorridas (sujidade e líquenes).
const roofTex = canvasTexture(128, 64, (ctx, w) => {
  const r = seeded(23);
  const channel = 8;
  for (let row = 0; row < 4; row++) {
    const shift = (row % 2) * (channel / 2);
    for (let c = 0; c < w / channel; c++) {
      const capTone = 0.95 + r() * 0.05;
      const panTone = 0.65 + r() * 0.1;
      for (let px = 0; px < channel; px++) {
        const isCap = px < channel / 2;
        const k = px % (channel / 2);
        const round = Math.sin((Math.PI * (k + 0.5)) / (channel / 2));
        const tone = isCap ? capTone * (0.75 + 0.25 * round) : panTone * (1 - 0.1 * round);
        ctx.fillStyle = gray(tone);
        ctx.fillRect((c * channel + px + shift) % w, row * 16, 1, 16);
      }
    }
    ctx.fillStyle = gray(0.42);
    ctx.fillRect(0, row * 16 + 14, w, 2);
  }
  ctx.fillStyle = grayA(0.55, 0.6);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * w);
    ctx.fillRect(x, Math.floor(r() * 20), 1 + Math.floor(r() * 2), 20 + Math.floor(r() * 30));
  }
});

// AZULEJOS DE FACHADA — a marca de Lisboa e de Sintra. Cada imagem tem 8 x 8 azulejos de 32 px.
// motif: 'star'    = padrão azul e branco com círculos que passam de um azulejo para o vizinho;
//        'diamond' = losangos (padrão "pombalino") com uma flor ao meio;
//        'plain'   = azulejo liso de uma só cor, com o brilho do vidrado (muito comum em Lisboa).
// Os desenhos são simétricos, por isso o padrão continua sem costuras de um azulejo para outro.
function azulejoTex(motif, bg, fg, fg2 = fg) {
  return canvasTexture(256, 256, (ctx, w) => {
    const r = seeded(motif.length * 7 + fg.length);
    const T = 32;
    for (let ty = 0; ty < w / T; ty++) {
      for (let tx = 0; tx < w / T; tx++) {
        ctx.save();
        ctx.translate(tx * T, ty * T);
        if (motif === 'plain') plainTile(ctx, T, fg, r);
        else {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, T, T);
          if (motif === 'star') starTile(ctx, T, fg, fg2);
          else diamondTile(ctx, T, fg, fg2);
        }
        ctx.strokeStyle = 'rgba(120,120,120,0.55)';        // junta entre azulejos
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, T - 1, T - 1);
        ctx.restore();
      }
    }
  }, true);
}

// Azulejo "estrela": um quarto de círculo em cada canto (4 azulejos juntos fazem um círculo)
// e uma flor de 4 pétalas ao meio.
function starTile(ctx, T, fg, fg2) {
  const h = T / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2.5;
  for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T]]) {
    ctx.beginPath(); ctx.arc(cx, cy, h * 0.7, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = fg2;
  for (let i = 0; i < 4; i++) {                               // 4 pétalas
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.ellipse(h + Math.cos(a) * 5, h + Math.sin(a) * 5, 5, 2.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.arc(h, h, 2.5, 0, Math.PI * 2); ctx.fill();
}

// Azulejo "losango": um losango que toca o meio de cada lado, um ponto ao meio e pontos nos cantos.
function diamondTile(ctx, T, fg, fg2) {
  const h = T / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(h, 1); ctx.lineTo(T - 1, h); ctx.lineTo(h, T - 1); ctx.lineTo(1, h);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = fg2;
  ctx.beginPath(); ctx.arc(h, h, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fg;
  for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

// Azulejo liso: uma cor com pequenas diferenças de tom e um brilho no canto de cima.
function plainTile(ctx, T, color, r) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = grayA(r() < 0.5 ? 1 : 0, 0.06 + r() * 0.06);   // cada azulejo com o seu tom
  ctx.fillRect(0, 0, T, T);
  const grad = ctx.createLinearGradient(0, 0, T, T);
  grad.addColorStop(0, 'rgba(255,255,255,0.25)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, T, T);
}

// Calçada portuguesa: cubinhos de calcário branco com uma onda de basalto preto (como no Rossio).
// A onda repete-se 2 vezes na largura e a cada 64 px na altura, por isso a imagem não tem costuras.
const calcadaTex = canvasTexture(128, 128, (ctx, w, h) => {
  const r = seeded(29);
  ctx.fillStyle = '#a9a294';                                   // juntas de areia
  ctx.fillRect(0, 0, w, h);
  const S = 6;                                                 // cada cubinho tem ~6 px
  for (let y = 0; y < h; y += S) {
    for (let x = 0; x < w; x += S) {
      const wave = y + Math.sin(((x + S / 2) / w) * Math.PI * 4) * 12;
      const black = ((wave % 64) + 64) % 64 < 12;
      const tone = black ? 0.13 + r() * 0.06 : 0.86 + r() * 0.08;
      ctx.fillStyle = black ? gray(tone) : `rgb(${Math.round(237 * tone / 0.9)},${Math.round(232 * tone / 0.9)},${Math.round(222 * tone / 0.9)})`;
      ctx.fillRect(x + 1, y + 1, S - 1 - (r() < 0.3 ? 1 : 0), S - 1 - (r() < 0.3 ? 1 : 0));
    }
  }
}, true);

// Granito em blocos arredondados (casa de pedra da serra): cinzentos diferentes com pintinhas.
const GRANITE_TONES = ['#8f8a80', '#9a958c', '#857f76', '#a59f95', '#7d786f'];
const graniteTex = canvasTexture(128, 128, (ctx, w, h) => {
  const r = seeded(37);
  ctx.fillStyle = '#4a4640';                                   // juntas
  ctx.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    let rowH = 16 + Math.floor(r() * 10);
    if (h - y - rowH < 14) rowH = h - y;
    let x = -Math.floor(r() * 20);
    while (x < w) {
      const bw = 18 + Math.floor(r() * 26);
      ctx.fillStyle = GRANITE_TONES[Math.floor(r() * GRANITE_TONES.length)];
      for (const dx of [0, -w, w]) {                           // ±w: a parte que dá a volta
        roundRect(ctx, x + 1 + dx, y + 1, bw - 2, rowH - 2, 5);
        ctx.fill();
      }
      x += bw;
    }
    y += rowH;
  }
  for (let i = 0; i < 500; i++) {                              // pintinhas de mica e quartzo
    ctx.fillStyle = r() < 0.5 ? 'rgba(30,30,30,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  }
}, true);

// Retângulo de cantos redondos (só o caminho; quem chama decide fill ou stroke).
function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Tábuas de madeira ao alto (o anexo de madeira, a parte que ardeu em 2018).
const planksTex = canvasTexture(64, 64, (ctx, w, h) => {
  const r = seeded(43);
  for (let x = 0; x < w; x += 8) {
    ctx.fillStyle = gray(0.8 + r() * 0.2);
    ctx.fillRect(x, 0, 8, h);
    ctx.fillStyle = gray(0.45);
    ctx.fillRect(x, 0, 1, h);                                  // frincha entre tábuas
  }
});

// Porta de garagem seccionada (bombeiros): faixas horizontais com uma sombra em baixo.
const garageTex = canvasTexture(32, 64, (ctx, w, h) => {
  for (let y = 0; y < h; y += 8) {
    ctx.fillStyle = gray(1.0);
    ctx.fillRect(0, y, w, 7);
    ctx.fillStyle = gray(0.6);
    ctx.fillRect(0, y + 7, w, 1);
  }
  ctx.fillStyle = gray(0.75);
  ctx.fillRect(0, 24, w, 8);                                   // fila de janelinhas
});

// Toldo às riscas (café): riscas largas da cor do toldo e brancas.
function stripesTex(color) {
  return canvasTexture(64, 16, (ctx, w, h) => {
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = color; ctx.fillRect(x, 0, 8, h);
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(x + 8, 0, 8, h);
    }
  }, true);
}

// Placa com letras (nomes por cima das portas). O último número de fillText impede o texto de sair.
function signTex(lines, bg, fg, width = 256, height = 64) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((text, i) => {
      const size = i === 0 ? h * 0.5 : h * 0.26;
      ctx.font = `bold ${Math.round(size)}px sans-serif`;
      const y = lines.length === 1 ? h / 2 : (i === 0 ? h * 0.38 : h * 0.8);
      ctx.fillText(text, w / 2, y + 1, w - 12);
    });
  }, true);
}

// BANDEIRA DE PORTUGAL (Decreto de 19 de junho de 1911), desenhada uma vez num canvas 384 x 256:
//   - proporção 2:3 (altura : comprimento);
//   - verde junto ao mastro = 2/5 do comprimento, vermelho = 3/5;
//   - a esfera armilar amarela tem diâmetro = 1/2 da altura e o centro EXATAMENTE na divisão
//     verde/vermelho, a meia altura;
//   - por cima da esfera, o escudo: orla vermelha com 7 castelos amarelos (3 em cima, 2 de cada
//     lado) e, dentro, o escudo branco com 5 escudetes azuis (as quinas) em cruz, cada um com
//     5 pontos brancos (os besantes).
// Simplificada (sem as letras e pormenores finos), mas reconhecível e com as medidas certas.
const flagTex = canvasTexture(384, 256, (ctx, w, h) => {
  const split = w * 0.4;                                     // 2/5 verde
  ctx.fillStyle = '#046a38'; ctx.fillRect(0, 0, split, h);
  ctx.fillStyle = '#da291c'; ctx.fillRect(split, 0, w - split, h);
  const cx = split, cy = h / 2, R = h / 4;                   // esfera: diâmetro = h/2
  // a esfera armilar: anéis amarelos com contorno preto fino (primeiro o preto, por baixo)
  const ring = (draw) => {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 9; ctx.beginPath(); draw(); ctx.stroke();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 6.5; ctx.beginPath(); draw(); ctx.stroke();
  };
  ring(() => ctx.ellipse(cx, cy, R * 0.42, R - 3, 0, 0, Math.PI * 2));          // meridiano
  ring(() => ctx.ellipse(cx, cy + R * 0.42, R * 0.9, R * 0.22, 0, 0, Math.PI));  // trópico (frente)
  ring(() => ctx.ellipse(cx, cy - R * 0.42, R * 0.9, R * 0.22, 0, 0, Math.PI));
  ring(() => ctx.ellipse(cx, cy, R - 3, R * 0.3, 0, 0, Math.PI * 2));            // equador
  ring(() => ctx.ellipse(cx, cy, R - 3, R * 0.3, -0.5, 0, Math.PI * 2));         // eclíptica (inclinada)
  ring(() => ctx.arc(cx, cy, R - 3, 0, Math.PI * 2));                             // aro de fora
  // o escudo (largura ~0.45 do diâmetro da esfera), de base redonda
  const shield = (sw, sh, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - sw / 2, cy - sh / 2);
    ctx.lineTo(cx + sw / 2, cy - sh / 2);
    ctx.lineTo(cx + sw / 2, cy + sh / 2 - sw / 2);
    ctx.arc(cx, cy + sh / 2 - sw / 2, sw / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  };
  const SW = 2 * R * 0.46, SH = SW * 1.15;
  shield(SW + 3, SH + 3, '#000');                            // contorno fino
  shield(SW, SH, '#da291c');                                 // orla vermelha
  ctx.fillStyle = '#ffd700';                                 // 7 castelos
  const castle = (x, y) => {
    const s = SW * 0.13;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.fillRect(x - s / 2, y - s * 0.8, s * 0.28, s * 0.35);   // ameias
    ctx.fillRect(x + s * 0.22, y - s * 0.8, s * 0.28, s * 0.35);
  };
  const top = cy - SH / 2 + SW * 0.1;
  for (const dx of [-0.32, 0, 0.32]) castle(cx + dx * SW, top);
  for (const s of [-1, 1]) for (const dy of [0.12, 0.4]) castle(cx + s * SW * 0.4, cy - SH / 2 + SH * (0.2 + dy));
  shield(SW * 0.6, SH * 0.62, '#ffffff');                    // escudo branco de dentro
  const q = SW * 0.15;                                       // 5 quinas azuis em cruz
  for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) {
    const qx = cx + dx * q * 1.15, qy = cy - SH * 0.04 + dy * q * 1.3;
    ctx.fillStyle = '#003399';
    ctx.fillRect(qx - q / 2, qy - q * 0.6, q, q * 1.2);
    ctx.fillStyle = '#ffffff';                                // 5 besantes em cada quina
    for (const [bx, by] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]) {
      ctx.fillRect(qx + bx * q * 0.24 - 0.8, qy + by * q * 0.3 - 0.8, 1.6, 1.6);
    }
  }
}, true);

// Bandeira da União Europeia (fica ao lado da nacional nos edifícios públicos):
// azul com 12 estrelas amarelas em círculo.
const euFlagTex = canvasTexture(192, 128, (ctx, w, h) => {
  ctx.fillStyle = '#003399'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffcc00';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    star(ctx, w / 2 + Math.cos(a) * h / 3, h / 2 + Math.sin(a) * h / 3, h / 18);
  }
}, true);

// Estrela de 5 pontas com centro (x, y) e raio r.
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Bandeira da corporação de bombeiros (ESTILIZADA, não é a verdadeira de nenhuma corporação):
// vermelha com um disco branco e uma chama vermelha e amarela ao meio. Sem letras: vista do
// outro lado, uma bandeira mostra o desenho ao contrário, e as letras ficavam ao espelho.
const firemenFlagTex = canvasTexture(192, 128, (ctx, w, h) => {
  ctx.fillStyle = '#b3261e'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill();
  const flame = (scale, color) => {
    const s = h * 0.22 * scale, cx = w / 2, cy = h / 2 + h * 0.08;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.3);
    ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.6, cy + s * 0.4);
    ctx.arc(cx, cy + s * 0.25, s * 0.62, 0.2, Math.PI - 0.2);
    ctx.quadraticCurveTo(cx - s * 0.9, cy - s * 0.2, cx, cy - s * 1.3);
    ctx.fill();
  };
  flame(1, '#d8261c');
  flame(0.55, '#ffcc00');
}, true);

// Casca do pinheiro-bravo: placas avermelhadas com fendas escuras ao comprido.
const pineBarkTex = canvasTexture(32, 64, (ctx, w, h) => {
  const r = seeded(31);
  ctx.fillStyle = '#8a4f2e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#4e3020';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 8 + r() * 24);
  }
}, true);

// Sombra de contacto: uma mancha escura no meio que desaparece nas bordas (a casa "assenta").
const contactShadowTex = canvasTexture(64, 64, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});

// =====================================================================================
// 4. MATERIAIS (criados uma vez e partilhados por todas as casas e árvores)
// =====================================================================================
const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });

// Material cuja textura tem sempre o mesmo tamanho no mundo (ver worldBoxGeometry).
// uvTile = de quantas em quantas unidades a imagem se repete.
function worldMat(color, map, uvTile, opts = {}) {
  const m = mat(color, { map, ...opts });
  m.userData.uvTile = uvTile;
  return m;
}
// Parede caiada ou pintada: a textura de cal escurece um bocadinho, por isso clareamos 6%.
const limeMat = (color) => worldMat(new THREE.Color(color).multiplyScalar(1.06), limewashTex, 0.6);
// Fachada de azulejo: brilha um pouco, como o vidrado verdadeiro. 8 azulejos em 0.48 = 0.06 cada
// (maiores do que na vida real, para o padrão se ver de longe).
const azulejoMat = (tex) => worldMat(0xffffff, tex, 0.48, { roughness: 0.3, flatShading: false });
const roofMat = (color) => mat(new THREE.Color(color).multiplyScalar(1.25), { map: roofTex });

// Os padrões de azulejo da barra dos cafés (azul #3A6EA5 sobre branco #EAF0F6).
const AZULEJOS = [
  azulejoMat(azulejoTex('star', '#eaf0f6', '#3a6ea5')),
  azulejoMat(azulejoTex('diamond', '#eaf0f6', '#2f5d9e', '#e3b23c')),
  azulejoMat(azulejoTex('plain', '', '#4a74a8')),
];

const MATERIALS = {
  // paredes
  lime: limeMat(COLORS.lime), cream: limeMat(COLORS.cream),
  paleYellow: limeMat(COLORS.paleYellow), salmon: limeMat(COLORS.salmon), limeShadow: limeMat(COLORS.limeShadow),
  // pedra
  cantaria: mat(COLORS.cantaria), granite: mat(COLORS.granite), graniteDark: mat(COLORS.graniteDark),
  graniteWall: worldMat(0xffffff, graniteTex, 0.5), lichen: mat(COLORS.lichen),
  calcada: worldMat(0xffffff, calcadaTex, 0.5),
  // telhados
  tile: roofMat(COLORS.tile), tileAged: roofMat(COLORS.tileAged), tileLichen: roofMat(COLORS.tileLichen),
  roofFresh: roofMat(COLORS.roofFresh), roofTypical: roofMat(COLORS.roofTypical), roofAged: roofMat(COLORS.roofAged),
  ridge: mat(COLORS.ridge), flatRoof: mat(0x9a948a),
  // barras, caixilhos, portas
  saloioBlue: mat(COLORS.saloioBlue), ochre: mat(COLORS.ochre), green: mat(COLORS.green),
  brown: mat(COLORS.brown), navy: mat(COLORS.navy), oxblood: mat(COLORS.oxblood),
  white: mat(COLORS.white), whiteTrim: mat(0xf7f5ef),
  iron: mat(COLORS.iron, { roughness: 0.6, metalness: 0.4 }),
  glass: mat(COLORS.glass, { roughness: 0.15, metalness: 0.1 }),
  hole: mat(COLORS.hole),
  planks: mat(COLORS.brown, { map: planksTex }),
  // chão à volta das casas
  yardEarth: mat(COLORS.yardEarth), gravel: mat(COLORS.gravel), gardenGreen: mat(COLORS.gardenGreen),
  lawn: mat(COLORS.lawn), hedge: mat(COLORS.hedge), hedgeLit: mat(COLORS.hedgeLit),
  poolWater: mat(COLORS.poolWater, { roughness: 0.1, metalness: 0.1 }),
  // bombeiros e café
  fireRed: mat(COLORS.fireRed), garageDoor: mat(COLORS.doorRed, { map: garageTex }),
  truckRed: mat(COLORS.truckRed, { roughness: 0.4 }), tyre: mat(COLORS.tyre),
  chrome: mat(COLORS.chrome, { metalness: 0.6, roughness: 0.3 }),
  pole: mat(COLORS.pole, { metalness: 0.3 }), gold: mat(COLORS.gold, { metalness: 0.5 }),
  flag: mat(0xffffff, { map: flagTex, side: THREE.DoubleSide, flatShading: false }),
  euFlag: mat(0xffffff, { map: euFlagTex, side: THREE.DoubleSide, flatShading: false }),
  firemenFlag: mat(0xffffff, { map: firemenFlagTex, side: THREE.DoubleSide, flatShading: false }),
  bombeirosSign: mat(0xffffff, { map: signTex(['BOMBEIROS', 'VOLUNTÁRIOS'], '#1f2a44', '#ffffff') }),
  cafeSign: mat(0xffffff, { map: signTex(['CAFÉ'], '#f2efe6', '#2e5e3a', 128, 48) }),
  hallSign: mat(0xffffff, { map: signTex(['SOCIEDADE RECREATIVA'], '#ffffff', '#2f5d9e', 256, 32) }),
  alSign: mat(0xffffff, { map: signTex(['AL'], '#2f5d9e', '#ffffff', 64, 48) }),
  awningGreen: mat(0xffffff, { map: stripesTex('#2f5a3c') }),
  awningRed: mat(0xffffff, { map: stripesTex('#9e3b2c') }),
  chair: mat(COLORS.chair, { roughness: 0.5 }),
  // árvores
  euBark: mat(COLORS.euBark), euPatch: mat(COLORS.euPatch),
  euStrip: mat(COLORS.euStrip, { side: THREE.DoubleSide }),
  euLeaf: mat(COLORS.euLeaf), euLeafLit: mat(COLORS.euLeafLit),
  pineBark: mat(0xffffff, { map: pineBarkTex }),
  pineNeedle: mat(COLORS.pineNeedle), pineNeedleLit: mat(COLORS.pineNeedleLit), pineCone: mat(COLORS.pineCone),
  stonePine: mat(COLORS.stonePine), stonePineLit: mat(COLORS.stonePineLit), stonePineBark: mat(COLORS.stonePineBark),
  cork: mat(COLORS.cork), corkFresh: mat(COLORS.corkFresh), corkAged: mat(COLORS.corkAged),
  oak: mat(COLORS.oak), oakLit: mat(COLORS.oakLit), holm: mat(COLORS.holm), holmLit: mat(COLORS.holmLit),
  oakBark: mat(COLORS.oakBark),
  palmTrunk: mat(COLORS.palmTrunk), palmLeaf: mat(COLORS.palmLeaf), palmDry: mat(COLORS.palmDry),
  olive: mat(COLORS.olive), oliveLit: mat(COLORS.oliveLit),
  cypress: mat(COLORS.cypress), lemon: mat(COLORS.lemon), lemonFruit: mat(COLORS.lemonFruit),
  // mato
  gorse: mat(COLORS.gorse), gorseDry: mat(COLORS.gorseDry), rockrose: mat(COLORS.rockrose),
  heather: mat(COLORS.heather), heatherRust: mat(COLORS.heatherRust),
  broom: mat(COLORS.broom), broomDry: mat(COLORS.broomDry),
  acacia: mat(COLORS.acacia), acaciaFeather: mat(COLORS.acaciaFeather), dryGrass: mat(COLORS.dryGrass),
};

// Paredes das vivendas: quase todas brancas; de vez em quando creme ou amarelo-claro.
// (Comparado com as fotos: as paredes coloridas são raras, ~1 em 12.)
const VILLA_WALLS = [
  MATERIALS.lime, MATERIALS.lime, MATERIALS.lime, MATERIALS.lime, MATERIALS.lime, MATERIALS.lime,
  MATERIALS.lime, MATERIALS.lime, MATERIALS.lime, MATERIALS.lime, MATERIALS.cream, MATERIALS.paleYellow,
];
// Telhados das vivendas: laranja vivo (telha nova), o laranja normal e algum mais velho.
const VILLA_ROOFS = [MATERIALS.roofTypical, MATERIALS.roofTypical, MATERIALS.roofFresh, MATERIALS.roofAged];
const DOORS = [MATERIALS.green, MATERIALS.brown, MATERIALS.oxblood, MATERIALS.navy];
const ROOFS = [MATERIALS.tile, MATERIALS.tile, MATERIALS.tileAged, MATERIALS.tileLichen];

// =====================================================================================
// 5. GEOMETRIAS PARTILHADAS
// =====================================================================================
// Uma caixa de 1x1x1: cada parede, janela ou porta é esta caixa "esticada" com .scale.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

const GEOMETRIES = {
  clumps: [jagged(1, 0, 0.45, 1), jagged(1, 0, 0.45, 2), jagged(1, 0, 0.45, 3)], // copas (raio 1)
  gorse: [jagged(0.17, 1, 0.75, 7), jagged(0.17, 1, 0.75, 8)],                     // tojo espinhoso
  cushion: [jagged(0.16, 1, 0.35, 9), jagged(0.16, 1, 0.35, 10)],                  // almofadas de urze
  boulders: [jagged(0.2, 1, 0.3, 21), jagged(0.2, 1, 0.3, 22), jagged(0.2, 1, 0.3, 23)], // granito
  // troncos e paus com 1 de altura (o ajudante stick() estica-os até ao comprimento certo)
  euTrunk: new THREE.CylinderGeometry(0.022, 0.036, 1, 5, 1, true),
  euStrip: new THREE.PlaneGeometry(0.014, 0.12),
  twig: new THREE.CylinderGeometry(0.006, 0.01, 1, 3, 1, true),
  pineTrunk: new THREE.CylinderGeometry(0.03, 0.045, 1, 6, 1, true),
  oakTrunk: new THREE.CylinderGeometry(0.06, 0.075, 1, 6, 1, true),
  limb: new THREE.CylinderGeometry(0.025, 0.04, 1, 5, 1, true),
  palmTrunk: new THREE.CylinderGeometry(0.03, 0.045, 1, 6, 1, true),
  frond: new THREE.BoxGeometry(0.05, 1, 0.01),                            // folha de palmeira
  flagPole: new THREE.CylinderGeometry(0.008, 0.011, 1, 6),
  // pormenores
  wheel: new THREE.CylinderGeometry(0.022, 0.022, 0.014, 10).rotateZ(Math.PI / 2),
  bell: new THREE.CylinderGeometry(0.012, 0.022, 0.035, 8),
  finial: new THREE.SphereGeometry(0.016, 6, 4),
  turretCap: new THREE.ConeGeometry(0.17, 0.2, 4).rotateY(Math.PI / 4),   // pirâmide de base quadrada
  coretoBase: new THREE.CylinderGeometry(0.15, 0.16, 0.05, 8),            // coreto: estrado octogonal
  coretoRail: new THREE.CylinderGeometry(0.135, 0.135, 0.035, 8, 1, true), // gradeamento
  coretoRoof: new THREE.ConeGeometry(0.17, 0.12, 8),                      // telhado em bico
  chairLeg: new THREE.CylinderGeometry(0.003, 0.003, 0.03, 4),
  tableTop: new THREE.CylinderGeometry(0.025, 0.025, 0.006, 10),
  // sombra suave no chão debaixo da casa: um quadrado deitado
  contactShadow: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};

const contactShadowMat = new THREE.MeshBasicMaterial({
  map: contactShadowTex, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,   // fica sempre por cima do chão
});

// =====================================================================================
// 6. AJUDANTES
// =====================================================================================
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const UP = new THREE.Vector3(0, 1, 0);

// Liga sombras em todas as peças do grupo (menos nas marcadas com userData.noShadow).
function shadows(group) {
  group.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return group;
}

// Uma caixa com o centro em (x, y, z) e tamanho (sx, sy, sz).
// Se o material tiver userData.uvTile (cal, azulejo, granito, calçada), a textura não estica.
function box(parent, material, sx, sy, sz, x, y, z) {
  let m;
  if (material.userData.uvTile) {
    m = new THREE.Mesh(worldBoxGeometry(sx, sy, sz, material.userData.uvTile), material);
  } else {
    m = new THREE.Mesh(UNIT_BOX, material);
    m.scale.set(sx, sy, sz);
  }
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Um "pau" (tronco, ramo, mastro) que vai do ponto A ao ponto B. thick engrossa-o.
function stick(parent, geo, material, ax, ay, az, bx, by, bz, thick = 1) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(geo, material);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.scale.set(thick, dir.length(), thick);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
  return m;
}

// Uma "pedra" de folhagem (copa) achatada ou esticada, com centro em (x, y, z).
function clump(parent, rand, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(pick(rand, GEOMETRIES.clumps), material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.y = rand() * Math.PI * 2;
  parent.add(m);
  return m;
}

// Um objeto com geometria própria (roda, sino, bola...) no ponto (x, y, z).
function place(g, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// Um pontinho colorido (fruto, pinha) na superfície de uma "bola" com centro (cx,cy,cz) e raios (rx,ry,rz).
function dot(parent, rand, material, size, cx, cy, cz, rx, ry, rz) {
  const ang = rand() * Math.PI * 2;
  const up = rand() * 1.1;                     // 0 = no topo, 1.1 = já de lado
  const x = cx + Math.cos(ang) * Math.sin(up) * rx;
  const y = cy + Math.cos(up) * ry;
  const z = cz + Math.sin(ang) * Math.sin(up) * rz;
  box(parent, material, size, size, size, x, y, z);
}

// Põe uma peça "colada" a uma parede. wall = { w, d } (largura em x, fundo em z).
// face: 'front' (+z), 'back' (-z), 'right' (+x), 'left' (-x). along = posição ao longo da parede.
// out = quanto a frente da peça sai da parede. Metade da peça fica enterrada na parede:
// assim nunca há duas faces no mesmo sítio (isso faz "tremeliques", o chamado z-fighting).
function onWall(g, wall, face, along, y, w, h, out, material) {
  const depth = 0.03;
  const front = wall.d / 2 + out - depth / 2;
  const side = wall.w / 2 + out - depth / 2;
  if (face === 'front') return box(g, material, w, h, depth, along, y, front);
  if (face === 'back') return box(g, material, w, h, depth, -along, y, -front);
  if (face === 'right') return box(g, material, depth, h, w, side, y, -along);
  return box(g, material, depth, h, w, -side, y, along);
}

// Janela ou porta. Peças (quase todas opcionais):
//   moldura de 4 barras à volta (opts.frame), que sai MAIS da parede do que o enchimento,
//   por isso a janela parece "funda"; enchimento (vidro, portada fechada ou porta);
//   peitoril de pedra por baixo (só janelas); caixilhos brancos (só vidro);
//   verga por cima (opts.lintel); grade de ferro (opts.grille).
//   Portas (opts.door): uma frincha ao meio (porta de 2 folhas) e uma soleira de pedra.
function opening(g, wall, face, along, y, w, h, fill, opts = {}) {
  const f = opts.frame ? (opts.frameSize ?? 0.02) : 0;
  if (opts.frame) {
    onWall(g, wall, face, along, y + (h / 2 + f / 2), w + 2 * f, f, 0.022, opts.frame);   // cima
    onWall(g, wall, face, along, y - (h / 2 + f / 2), w + 2 * f, f, 0.022, opts.frame);   // baixo
    onWall(g, wall, face, along - (w / 2 + f / 2), y, f, h, 0.022, opts.frame);           // esquerda
    onWall(g, wall, face, along + (w / 2 + f / 2), y, f, h, 0.022, opts.frame);           // direita
  }
  onWall(g, wall, face, along, y, w, h, opts.frame ? 0.006 : 0.016, fill);
  if (!opts.door) {
    const sill = opts.sill ?? opts.frame ?? MATERIALS.cantaria;
    onWall(g, wall, face, along, y - h / 2 - 0.012, w + 0.04, 0.014, 0.035, sill);
  }
  if (fill === MATERIALS.glass) {
    // caixilhos brancos: uma barra ao alto e duas deitadas (janela de guilhotina)
    onWall(g, wall, face, along, y, 0.007, h, 0.02, MATERIALS.white);
    onWall(g, wall, face, along, y + h / 6, w, 0.007, 0.02, MATERIALS.white);
    onWall(g, wall, face, along, y - h / 6, w, 0.007, 0.02, MATERIALS.white);
  }
  if (opts.door) {
    onWall(g, wall, face, along, y, 0.004, h * 0.9, 0.02, MATERIALS.hole);               // frincha
    const bottom = y - h / 2;
    if (bottom < 0.08) onWall(g, wall, face, along, bottom + 0.01, w + 0.04, 0.02, 0.04, MATERIALS.cantaria);
  }
  if (opts.lintel) onWall(g, wall, face, along, y + h / 2 + 0.018, w + 0.05, 0.03, 0.02, opts.lintel);
  if (opts.grille) {
    for (const dx of [-w / 3, 0, w / 3]) onWall(g, wall, face, along + dx, y, 0.006, h, 0.03, opts.grille);
  }
}

// Placa com letras na fachada da frente: uma tábua lisa da cor do fundo e, mesmo à frente,
// um retângulo fino com a imagem das letras (assim as letras não aparecem nos lados da tábua).
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
function signBoard(g, wall, along, y, w, h, material, backing) {
  onWall(g, wall, 'front', along, y, w, h, 0.01, backing);
  const plate = new THREE.Mesh(UNIT_PLANE, material);
  plate.scale.set(w - 0.004, h - 0.004, 1);
  plate.position.set(along, y, wall.d / 2 + 0.0115);
  g.add(plate);
}

// Varanda de ferro (de sacada) à frente de uma janela da fachada: laje de pedra e grade de ferro.
function ironBalcony(g, wall, along, floorY, width) {
  const deep = 0.055;
  const front = wall.d / 2;
  box(g, MATERIALS.cantaria, width, 0.014, deep, along, floorY, front + deep / 2);          // laje
  box(g, MATERIALS.iron, width, 0.006, 0.006, along, floorY + 0.075, front + deep - 0.003); // corrimão
  for (const side of [-1, 1]) {                                                             // lados
    box(g, MATERIALS.iron, 0.006, 0.006, deep, along + side * (width / 2 - 0.003), floorY + 0.075, front + deep / 2);
  }
  const bars = Math.round(width / 0.022);
  for (let i = 0; i <= bars; i++) {                                                         // grades
    const x = along - width / 2 + 0.003 + (i * (width - 0.006)) / bars;
    box(g, MATERIALS.iron, 0.004, 0.07, 0.004, x, floorY + 0.04, front + deep - 0.003);
  }
}

// Paredes = uma caixa só.
function walls(g, wall, height, material) {
  return box(g, material, wall.w, height, wall.d, 0, height / 2, 0);
}

// Cunhais: pilastras de pedra (ou pintadas) nos 4 cantos da casa.
function quoins(g, wall, height, material, size) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (wall.w / 2 - size / 2 + 0.005);
      const z = sz * (wall.d / 2 - size / 2 + 0.005);
      box(g, material, size, height, size, x, height / 2, z);
    }
  }
}

// Barra pintada à volta da base da casa (azul ou ocre nas casas saloias, pedra nas de vila).
function baseBand(g, wall, height, material) {
  box(g, material, wall.w + 0.008, height, wall.d + 0.008, 0, height / 2, 0);
}

// Telhado de 2 águas com a cumeeira ao longo de x: empenas (triângulos de parede), duas lajes
// de telha e a cumeeira. Devolve { eave, surfaceY(x, z), rise } (para a chaminé e a sineira).
function gableRoof(g, wall, eave, pitchDeg, overhang, roofMaterial, gableMaterial, ridgeMaterial) {
  const a = THREE.MathUtils.degToRad(pitchDeg);
  const rise = (wall.d / 2) * Math.tan(a);
  const tile = gableMaterial.userData.uvTile ?? 0.8;
  const gable = new THREE.Mesh(wedgeGeometry(wall.w, wall.d, rise, wall.w / 2, tile, tile), gableMaterial);
  gable.position.y = eave;
  g.add(gable);
  const thick = 0.04;
  const run = wall.d / 2 + overhang;
  const L = run / Math.cos(a);
  const len = wall.w + 2 * overhang;
  for (const side of [1, -1]) {
    const y = eave + rise - (L / 2) * Math.sin(a) + (thick / 2) * Math.cos(a);
    const z = side * ((L / 2) * Math.cos(a) + (thick / 2) * Math.sin(a));
    const slab = box(g, roofMaterial, len, thick, L, 0, y, z);
    slab.rotation.x = side * a;
  }
  box(g, ridgeMaterial, len, 0.045, 0.07, 0, eave + rise + thick * 0.8, 0);
  const surfaceY = (x, z) => eave + rise * (1 - Math.abs(z) / (wall.d / 2)) + thick / Math.cos(a);
  return { eave, surfaceY, rise };
}

// Telhado de 4 águas: uma cunha maciça. fascia = faixa branca à volta (beirado), ou nada.
function hipRoof(g, wall, eave, pitchDeg, overhang, roofMaterial, ridgeMaterial, fascia = true) {
  const run = wall.d / 2 + overhang;
  const h = run * Math.tan(THREE.MathUtils.degToRad(pitchDeg));
  const r = Math.max(0, (wall.w - wall.d) / 2);
  const roof = new THREE.Mesh(wedgeGeometry(wall.w + 2 * overhang, wall.d + 2 * overhang, h, r), roofMaterial);
  roof.position.y = eave;
  g.add(roof);
  if (r > 0) box(g, ridgeMaterial, 2 * r + 0.03, 0.025, 0.035, 0, eave + h, 0);
  if (fascia) {
    const o = overhang, y = eave - 0.015;
    for (const s of [-1, 1]) {
      box(g, MATERIALS.whiteTrim, wall.w + 2 * o, 0.03, 0.02, 0, y, s * (wall.d / 2 + o - 0.01));
      box(g, MATERIALS.whiteTrim, 0.02, 0.03, wall.d + 2 * o, s * (wall.w / 2 + o - 0.01), y, 0);
    }
  }
  const surfaceY = (x, z) => eave + h * (1 - Math.max(Math.abs(z), Math.abs(x) - r) / run);
  return { eave, surfaceY };
}

// Chaminé alta e quadrada que nasce dentro do telhado e sai `above` acima dele, com uma laje
// de telha por cima e (pierced = true) os buraquinhos da chaminé saloia por onde sai o fumo.
function chimney(g, roof, x, z, size, above, bodyMaterial, pierced = false) {
  const top = roof.surfaceY(x, z) + above;
  const bottom = roof.eave - 0.02;
  box(g, bodyMaterial, size, top - bottom, size, x, (top + bottom) / 2, z);
  box(g, MATERIALS.tile, size + 0.03, 0.018, size + 0.03, x, top + 0.009, z);
  if (pierced) {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      box(g, MATERIALS.hole, dz ? 0.02 : 0.004, 0.022, dz ? 0.004 : 0.02,
        x + dx * (size / 2 + 0.001), top - 0.025, z + dz * (size / 2 + 0.001));
    }
  }
}

// Muro baixo caiado com capeamento de telha (muro de quintal), de x1 a x2, à profundidade z.
function gardenWall(g, x1, x2, z, height = 0.1) {
  const len = Math.abs(x2 - x1);
  const x = (x1 + x2) / 2;
  box(g, MATERIALS.lime, len, height, 0.035, x, height / 2, z);
  box(g, MATERIALS.tile, len + 0.01, 0.016, 0.05, x, height + 0.008, z);
}

// O mesmo muro, mas ao longo de z (de z1 a z2, na posição x).
function gardenWallZ(g, z1, z2, x, height = 0.1) {
  const len = Math.abs(z2 - z1);
  const z = (z1 + z2) / 2;
  box(g, MATERIALS.lime, 0.035, height, len, x, height / 2, z);
  box(g, MATERIALS.tile, 0.05, 0.016, len + 0.01, x, height + 0.008, z);
}

// "Assenta" a casa no chão: um passeio de calçada da fachada até à rua (lot.sidewalk = z da
// fachada), um quintal (lot.yard = material do chão) e uma sombra suave por baixo.
// lot = { w, d, z }: tamanho e centro (em z) do edifício.
function groundHouse(house, lot) {
  if (lot.sidewalk !== undefined) {
    const depth = 0.45 - lot.sidewalk;
    box(house, MATERIALS.calcada, 0.9, 0.014, depth, 0, 0.007, lot.sidewalk + depth / 2);
  }
  if (lot.yard) box(house, lot.yard, 0.84, 0.01, 0.84, 0, 0.005, 0);
  const shadow = new THREE.Mesh(GEOMETRIES.contactShadow, contactShadowMat);
  shadow.position.set(0, 0.018, lot.z ?? 0);
  shadow.scale.set(lot.w + 0.2, 1, lot.d + 0.2);
  shadow.renderOrder = 1;                       // desenhada depois do chão
  shadow.userData.keepSeparate = true;          // não juntar com as outras peças
  shadow.userData.noShadow = true;              // uma sombra não faz sombra
  house.add(shadow);
}

// =====================================================================================
// 7. CASAS — como as da Malveira da Serra VERDADEIRA (fotos e satélite, ver docs/research).
// A Malveira não é uma cidade de prédios coloridos: é uma aldeia saloia que cresceu em
// vivendas ("moradias"). Quase todas as casas são:
//   - brancas (cal), com 1 ou 2 pisos;
//   - telhado de 4 águas, pouco inclinado (~27°), de telha laranja (Marselha/Lusa);
//   - num lote com jardim, muro branco baixo com portão de ferro, sebes altas de cipreste
//     e, muitas vezes, uma piscina (há mais de 100 piscinas à volta da aldeia!).
// No centro (à volta do largo) as casas são pequenas e ficam encostadas umas às outras:
// "cubos brancos com chapéu laranja" em degraus pela encosta. Por isso, um quadrado de casa
// no centro tem 2 ou 3 casinhas; um quadrado na periferia tem UMA vivenda com o seu jardim.
//
// buildHouse(rand, ctx) — ctx é OPCIONAL (a galeria não o passa). A vista (village3d.js) diz:
//   ctx.x, ctx.y     -> o quadrado (para escolher, sempre da mesma maneira, as casas com bandeira)
//   ctx.neighbors    -> quantas casas há nos 8 quadrados à volta (0 = isolada, 8 = centro denso)
//   ctx.landmark     -> 'chapel' (a capela do largo) ou 'hall' (a sociedade recreativa), ou nada
// A porta fica sempre virada para +z (a vista roda a casa para a estrada).
// =====================================================================================
export function buildHouse(rand, ctx) {
  const kind = ctx ? houseKind(rand, ctx) : GALLERY_HOUSES[galleryIndex++ % GALLERY_HOUSES.length];
  const house = HOUSE_BUILDERS[kind](rand, ctx);
  groundHouse(house, house.userData.lot);
  mergeByMaterial(house);                       // as bandeiras ficam de fora (keepSeparate)
  return shadows(house);
}

// Na galeria (sem ctx) mostramos cada tipo de casa por esta ordem, para se ver tudo.
const GALLERY_HOUSES = ['villaPool', 'cluster', 'saloioPair', 'villaFlag', 'cafe', 'chapel', 'hall', 'manor'];
let galleryIndex = 0;

const HOUSE_BUILDERS = {
  villa: (rand) => villa(rand, {}),
  villaPool: (rand) => villa(rand, { pool: true }),
  villaFlag: (rand, ctx) => villa(rand, { flag: true, rotation: ctx?.rotation ?? 0 }),
  cluster: (rand) => villageCluster(rand),
  saloio: (rand) => saloioCottage(rand, false),
  saloioPair: (rand) => saloioCottage(rand, true),
  cafe: (rand) => cafeHouse(rand),
  quinta: (rand) => quinta(rand),
  manor: (rand) => quintaManor(rand),
  stone: (rand) => stoneCottage(rand),
  chapel: (rand) => chapelLargo(rand),
  hall: (rand) => clubHall(rand),
};

// Que casa vai neste quadrado? Depende de quantas casas há à volta (centro denso ou periferia)
// e da distância ao largo (ctx.largoDistance): as casas saloias em banda e o café só existem
// junto ao largo; no resto da aldeia são vivendas brancas de 4 águas, como nas fotos.
// As bandeiras nas varandas (~1 casa em 16) são escolhidas pelo quadrado (tileHash),
// por isso aparecem sempre nas mesmas casas.
function houseKind(rand, ctx) {
  if (ctx.landmark === 'chapel' || ctx.landmark === 'hall') return ctx.landmark;
  if (ctx.x !== undefined && tileHash(ctx.x, ctx.y) < 0.06) return 'villaFlag';
  const n = ctx.neighbors ?? 3;
  const nearLargo = (ctx.largoDistance ?? 99) <= 3;
  const r = rand();
  if (nearLargo && n >= 4) {                     // à volta do largo: o núcleo antigo
    if (r < 0.4) return 'cluster';
    if (r < 0.6) return 'saloioPair';
    if (r < 0.75) return 'cafe';
    return 'villa';
  }
  if (n >= 5) {                                  // centro: casinhas brancas e vivendas
    if (r < 0.45) return 'cluster';
    if (r < 0.8) return 'villa';
    return 'villaPool';
  }
  if (n >= 2) {                                  // bairros: vivendas, muitas com piscina
    if (r < 0.5) return 'villa';
    if (r < 0.76) return 'villaPool';
    if (r < 0.93) return 'cluster';
    if (r < 0.97) return 'saloio';
    return 'stone';
  }
  if (r < 0.38) return 'villaPool';              // periferia: vivendas com piscina, quintas
  if (r < 0.78) return 'villa';
  if (r < 0.86) return 'quinta';
  if (r < 0.93) return 'manor';
  if (r < 0.97) return 'stone';
  return 'saloio';
}

// Um número "ao calhas" entre 0 e 1, mas SEMPRE o mesmo para o mesmo quadrado (x, y).
function tileHash(x, y) {
  let h = Math.imul(x * 73856093 ^ y * 19349663, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// Um "corpo" de edifício: um grupo cujo centro fica em (x, z) dentro do quadrado.
function bodyAt(g, x, z) {
  const body = new THREE.Group();
  body.position.set(x, 0, z);
  g.add(body);
  return body;
}

// Sebe alta de cipreste aparada (as "paredes verdes" que dividem os lotes na Malveira).
function hedge(g, x, z, w, d, h) {
  box(g, MATERIALS.hedge, w, h, d, x, h / 2, z);
  box(g, MATERIALS.hedgeLit, w - 0.01, 0.012, d - 0.01, x, h + 0.004, z);   // topo aparado, mais claro
}

// Piscina: bordo de pedra branca e água azul-turquesa.
function pool(g, x, z, w, d) {
  box(g, MATERIALS.whiteTrim, w + 0.04, 0.016, d + 0.04, x, 0.008, z);
  box(g, MATERIALS.poolWater, w, 0.004, d, x, 0.017, z);
}

// Portão de ferro (verde-escuro ou preto) entre dois pilares brancos, em x, à profundidade z.
function ironGate(g, x, z, width, material) {
  for (const s of [-1, 1]) {
    box(g, MATERIALS.lime, 0.035, 0.11, 0.035, x + s * (width / 2 + 0.017), 0.055, z);
    box(g, MATERIALS.tile, 0.045, 0.012, 0.045, x + s * (width / 2 + 0.017), 0.116, z);
  }
  box(g, material, width, 0.006, 0.006, x, 0.085, z);
  box(g, material, width, 0.006, 0.006, x, 0.02, z);
  const bars = Math.max(3, Math.round(width / 0.018));
  for (let i = 0; i <= bars; i++) box(g, material, 0.004, 0.075, 0.004, x - width / 2 + (i * width) / bars, 0.05, z);
}

// Árvore de jardim: pinheiro-manso pequeno, palmeira, cipreste ou limoeiro.
function gardenTree(rand) {
  const v = rand();
  if (v < 0.4) { const t = stonePine(rand); t.scale.setScalar(0.55); return t; }
  if (v < 0.62) { const t = palm(rand); t.scale.setScalar(0.8); return t; }
  if (v < 0.82) return cypress(rand);
  return lemonTree(rand);
}

// H1 — VIVENDA ("moradia"), a casa mais comum da Malveira.
// Branca (às vezes amarelo-claro ou salmão), 1 ou 2 pisos, telhado de 4 águas laranja com beirado
// branco, chaminé, muitas vezes uma ala em "L" ou um alpendre de colunas brancas. No lote: muro
// branco baixo com portão de ferro, sebe de cipreste ao fundo, relva (rega) ou terra seca,
// às vezes uma piscina, e uma árvore de jardim. opts.flag = bandeira de Portugal na varanda.
function villa(rand, opts) {
  const g = new THREE.Group();
  const twoFloors = opts.flag || rand() < 0.5;
  const floorH = 0.2, plinth = 0.03;
  const eave = plinth + (twoFloors ? 2 : 1) * floorH + 0.02;      // 0.25 ou 0.45
  const wall = { w: 0.42 + rand() * 0.12, d: 0.3 + rand() * 0.08 };
  const side = rand() < 0.5 ? -1 : 1;                              // a casa fica deste lado; o jardim do outro
  const bx = side * 0.1, bz = -0.1;
  const body = bodyAt(g, bx, bz);
  const paint = pick(rand, VILLA_WALLS);
  const roofMaterial = pick(rand, VILLA_ROOFS);
  walls(body, wall, eave, paint);
  baseBand(body, wall, plinth, pick(rand, [MATERIALS.granite, MATERIALS.cantaria, MATERIALS.limeShadow]));
  const roof = hipRoof(body, wall, eave, 27, 0.035, roofMaterial, MATERIALS.ridge);
  // janelas e porta: caixilhos brancos, castanhos ou verdes; às vezes portadas
  const frame = pick(rand, [MATERIALS.whiteTrim, MATERIALS.whiteTrim, MATERIALS.brown, MATERIALS.green]);
  const framed = { frame, frameSize: 0.014, sill: MATERIALS.cantaria };
  const doorX = -side * wall.w * 0.18;
  opening(body, wall, 'front', doorX, 0.12, 0.08, 0.17, pick(rand, DOORS), { ...framed, door: true });
  opening(body, wall, 'front', doorX + side * 0.15, 0.15, 0.1, 0.1, MATERIALS.glass, framed);
  if (wall.w > 0.48) opening(body, wall, 'front', doorX - side * 0.11, 0.15, 0.08, 0.1, MATERIALS.glass, framed);
  opening(body, wall, 'back', 0, 0.15, 0.1, 0.1, MATERIALS.glass, framed);
  opening(body, wall, side > 0 ? 'right' : 'left', 0, 0.15, 0.09, 0.1, MATERIALS.glass, framed);
  let terrace = null;                                              // { y, z, w, x }: onde pendurar a bandeira
  if (twoFloors) {
    const y2 = plinth + floorH + 0.11;
    for (const f of [-0.3, 0, 0.3]) opening(body, wall, 'front', f * wall.w, y2, 0.09, 0.11, MATERIALS.glass, framed);
    opening(body, wall, 'back', 0.1, y2, 0.09, 0.1, MATERIALS.glass, framed);
    if (opts.flag || rand() < 0.55) {
      // varanda do 1.º andar: laje e parapeito branco (as varandas da Malveira são de alvenaria)
      const bw = wall.w * 0.55, deep = 0.07;
      const floorY = plinth + floorH + 0.015;
      box(body, MATERIALS.whiteTrim, bw, 0.02, deep, 0, floorY, wall.d / 2 + deep / 2);
      box(body, paint, bw, 0.06, 0.016, 0, floorY + 0.04, wall.d / 2 + deep - 0.008);
      for (const s of [-1, 1]) box(body, paint, 0.016, 0.06, deep, s * (bw / 2 - 0.008), floorY + 0.04, wall.d / 2 + deep / 2);
      box(body, MATERIALS.whiteTrim, bw + 0.01, 0.01, 0.024, 0, floorY + 0.075, wall.d / 2 + deep - 0.008);
      terrace = { x: 0, y: floorY + 0.08, z: wall.d / 2 + deep };
    }
  }
  chimney(body, roof, side * (wall.w / 2 - 0.08), -0.06, 0.05, 0.07, paint);
  // ala em "L" (1 piso) virada para a frente, do lado da casa, OU um alpendre com colunas
  if (!terrace && rand() < 0.45) {
    const ww = 0.2 + rand() * 0.06, wd = 0.22;
    const wing = bodyAt(g, bx + side * (wall.w / 2 - ww / 2), bz + wall.d / 2 + wd / 2 - 0.06);
    const wingWall = { w: ww, d: wd };
    walls(wing, wingWall, 0.25, paint);
    baseBand(wing, wingWall, plinth, MATERIALS.limeShadow);
    hipRoof(wing, wingWall, 0.25, 27, 0.03, roofMaterial, MATERIALS.ridge);
    opening(wing, wingWall, 'front', 0, 0.15, 0.1, 0.1, MATERIALS.glass, framed);
  } else if (!terrace) {
    porch(body, wall, rand, roofMaterial);
  }
  // o lote: muro branco à frente com portão, sebe ao fundo, jardim e (às vezes) piscina
  const gateX = doorX + bx;
  gardenWall(g, -0.44, gateX - 0.08, 0.425, 0.07);
  gardenWall(g, gateX + 0.08, 0.44, 0.425, 0.07);
  ironGate(g, gateX, 0.425, 0.12, rand() < 0.6 ? MATERIALS.green : MATERIALS.iron);
  // sebes de cipreste aparadas: as "paredes verdes" compridas e escuras entre os lotes (fotos)
  if (rand() < 0.85) hedge(g, 0, -0.405, 0.86, 0.05, 0.13 + rand() * 0.07);
  if (rand() < 0.55) hedge(g, side * 0.415, 0, 0.045, 0.78, 0.14 + rand() * 0.05);
  else if (!opts.pool) hedge(g, -side * 0.405, -0.05, 0.05, 0.62, 0.16);
  const freeX = -side * 0.29;                                       // o lado livre do lote
  const irrigated = opts.pool || rand() < 0.75;                     // quase todos têm jardim regado
  box(g, irrigated ? MATERIALS.lawn : MATERIALS.yardEarth, 0.3, 0.008, 0.7, freeX, 0.004, 0.02);
  box(g, MATERIALS.gravel, 0.12, 0.006, 0.4 - (bz + wall.d / 2), gateX, 0.003, (0.42 + bz + wall.d / 2) / 2);   // caminho
  if (opts.pool) pool(g, freeX, -0.08, 0.18 + rand() * 0.04, 0.3);
  const tree = gardenTree(rand);
  tree.position.set(freeX + side * 0.02, 0, opts.pool ? 0.27 : 0.05 + rand() * 0.2);
  g.add(tree);
  if (rand() < 0.5) {                                               // mais uma árvore de jardim
    const second = rand() < 0.6 ? cypress(rand) : gardenTree(rand);
    second.position.set(side * 0.34, 0, 0.33);
    g.add(second);
  }
  if (opts.flag) {
    // A bandeira fica na parede virada para a câmara do jogo (que olha de sueste), para se ver.
    const face = faceTowardsCamera(opts.rotation ?? 0);
    if (face === 'front') balconyFlag(body, terrace ?? { x: 0, y: eave - 0.04, z: wall.d / 2 + 0.01 }, 'front');
    else balconyFlag(body, { y: eave - 0.04, wall }, face);
  }
  g.userData.lot = { w: wall.w, d: wall.d, z: bz };
  return g;
}

// Alpendre: laje branca com telha por cima, apoiada em 3 colunas brancas, à frente da porta.
function porch(body, wall, rand, roofMaterial) {
  const pw = wall.w * 0.62, deep = 0.1, h = 0.2;
  const z = wall.d / 2 + deep / 2;
  for (const s of [-1, 0, 1]) box(body, MATERIALS.whiteTrim, 0.018, h, 0.018, s * (pw / 2 - 0.012), h / 2, z + deep / 2 - 0.012);
  const slab = box(body, roofMaterial, pw + 0.03, 0.02, deep + 0.03, 0, h + 0.015, z + 0.005);
  slab.rotation.x = 0.18;                                           // cai um pouco para a frente
  box(body, MATERIALS.gravel, pw, 0.01, deep, 0, 0.005, z);
}

// H2 — Casinhas do centro: 2 ou 3 cubos brancos pequenos encostados, de alturas diferentes,
// com telhado laranja de 4 águas (ou de 2 águas nas mais velhas, com barra azul ou ocre).
// Vistos de longe, os quadrados de centro formam a "mancha" branca e laranja das fotos.
const CLUSTER_SLOTS = [[-0.2, 0.17], [0.2, -0.16], [0.21, 0.22], [-0.21, -0.2]];
function villageCluster(rand) {
  const g = new THREE.Group();
  const count = rand() < 0.5 ? 2 : 3;
  const first = Math.floor(rand() * 2);                 // 2 arrumações possíveis, nenhuma se sobrepõe
  const slots = [CLUSTER_SLOTS[first], CLUSTER_SLOTS[first + 1], CLUSTER_SLOTS[(first + 3) % 4]].slice(0, count);
  let lot = null;
  for (const [x, z] of slots) {
    const w = 0.3 + rand() * 0.06, d = 0.26 + rand() * 0.04;
    const info = smallHouse(g, rand, x + (rand() - 0.5) * 0.03, z + (rand() - 0.5) * 0.03, w, d);
    if (!lot) lot = info;
  }
  box(g, rand() < 0.6 ? MATERIALS.lawn : MATERIALS.yardEarth, 0.84, 0.008, 0.84, 0, 0.004, 0);
  if (rand() < 0.65) {                                   // um quintal com uma árvore
    const tree = rand() < 0.5 ? lemonTree(rand) : cypress(rand);
    const [fx, fz] = CLUSTER_SLOTS[(first + 2) % 4];
    tree.position.set(fx, 0, fz);
    g.add(tree);
  }
  g.userData.lot = lot;
  return g;
}

// Uma casinha (cubo branco, 1 ou 2 pisos) com o centro em (x, z). Devolve o seu "lot".
function smallHouse(g, rand, x, z, w, d) {
  const body = bodyAt(g, x, z);
  const wall = { w, d };
  const eave = rand() < 0.45 ? 0.43 : 0.25;
  const old = rand() < 0.08;                              // casa saloia antiga: barra pintada (rara)
  const paint = old ? MATERIALS.lime : pick(rand, VILLA_WALLS);
  walls(body, wall, eave, paint);
  const band = old ? pick(rand, [MATERIALS.saloioBlue, MATERIALS.ochre]) : MATERIALS.limeShadow;
  baseBand(body, wall, old ? 0.05 : 0.03, band);
  const roofMaterial = pick(rand, old ? ROOFS : VILLA_ROOFS);
  const roof = old
    ? gableRoof(body, wall, eave, 28, 0.03, roofMaterial, paint, MATERIALS.ridge)
    : hipRoof(body, wall, eave, 27, 0.03, roofMaterial, MATERIALS.ridge);
  const framed = { frame: old ? band : MATERIALS.whiteTrim, frameSize: 0.014, sill: MATERIALS.cantaria };
  opening(body, wall, 'front', -w * 0.22, 0.11, 0.07, 0.16, pick(rand, DOORS), { ...framed, door: true });
  opening(body, wall, 'front', w * 0.2, 0.15, 0.08, 0.09, rand() < 0.7 ? MATERIALS.glass : MATERIALS.green, framed);
  opening(body, wall, 'back', 0, 0.15, 0.08, 0.09, MATERIALS.glass, framed);
  if (eave > 0.3) {
    opening(body, wall, 'front', -w * 0.22, 0.33, 0.07, 0.09, MATERIALS.glass, framed);
    opening(body, wall, 'front', w * 0.2, 0.33, 0.07, 0.09, MATERIALS.glass, framed);
  }
  if (rand() < 0.5) chimney(body, roof, w * 0.3, -d * 0.15, 0.045, 0.07, paint, old);
  return { w, d, z };
}

// H3 — Casa saloia térrea (a casa rural antiga da região de Lisboa, ao longo das estradas EN):
// comprida e baixa, caiada de branco, barra e cunhais azuis ou ocre, telhado de 2 águas,
// janelas pequenas e uma chaminé grande com buraquinhos. pair = 2 casas coladas em banda.
function saloioCottage(rand, pair) {
  const g = new THREE.Group();
  const parts = pair ? [[-0.215, 0.42], [0.215, 0.42]] : [[0, 0.74]];
  let lot = null;
  for (const [x, w] of parts) {
    const wall = { w, d: 0.44 };
    const eave = pair ? 0.27 + rand() * 0.06 : 0.3;
    const body = bodyAt(g, x, 0.04);
    const band = pick(rand, [MATERIALS.saloioBlue, MATERIALS.saloioBlue, MATERIALS.ochre]);
    walls(body, wall, eave, MATERIALS.lime);
    baseBand(body, wall, 0.06, band);
    quoins(body, wall, eave, band, 0.03);
    const roof = gableRoof(body, wall, eave, 28, 0.035, pick(rand, ROOFS), MATERIALS.lime, MATERIALS.ridge);
    const framed = { frame: band, frameSize: 0.018 };
    const shutter = rand() < 0.5 ? MATERIALS.green : MATERIALS.glass;
    opening(body, wall, 'front', -w * 0.17, 0.12, 0.09, 0.2, pick(rand, DOORS), { ...framed, door: true });
    opening(body, wall, 'front', w * 0.22, 0.18, 0.09, 0.1, shutter, framed);
    opening(body, wall, 'back', 0, 0.18, 0.08, 0.1, MATERIALS.green, framed);
    chimney(body, roof, w * 0.3, 0, 0.08, 0.15, MATERIALS.lime, true);
    if (!lot) lot = { w: pair ? 0.86 : w, d: wall.d, z: 0.04 };
  }
  // à frente: pátio de saibro, muro caiado e vasos
  box(g, MATERIALS.gravel, 0.84, 0.01, 0.16, 0, 0.005, 0.35);
  gardenWall(g, -0.44, -0.2, 0.425, 0.08);
  gardenWall(g, -0.04, 0.44, 0.425, 0.08);
  pottedPlants(g, rand, 0.05, 0.34);
  if (!pair) hedge(g, 0, -0.405, 0.86, 0.05, 0.15);
  g.userData.lot = lot;
  return g;
}

// 2 ou 3 vasos de barro com plantas, em fila ao longo de x a partir de (x, z).
function pottedPlants(g, rand, x, z) {
  const n = 2 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    box(g, MATERIALS.tile, 0.035, 0.035, 0.035, x + i * 0.06, 0.018, z);
    clump(g, rand, MATERIALS.lemon, x + i * 0.06, 0.05, z, 0.025, 0.025, 0.025);
  }
}

// H4 — Café/pastelaria da avenida (a rua comercial para Janes): casa branca de 1 ou 2 pisos
// com montras, toldo às riscas, a placa "CAFÉ", barra de azulejo e esplanada com mesas brancas.
function cafeHouse(rand) {
  const g = new THREE.Group();
  const twoFloors = rand() < 0.6;
  const eave = twoFloors ? 0.62 : 0.42;
  const wall = { w: 0.84, d: 0.46 };
  const frontZ = 0.28;
  const body = bodyAt(g, 0, frontZ - wall.d / 2);
  const paint = pick(rand, [MATERIALS.lime, MATERIALS.lime, MATERIALS.cream, MATERIALS.paleYellow]);
  const trim = MATERIALS.whiteTrim;
  walls(body, wall, eave, paint);
  onWall(body, wall, 'front', 0, 0.1, wall.w - 0.09, 0.12, 0.003, pick(rand, AZULEJOS));   // barra de azulejo
  baseBand(body, wall, 0.04, MATERIALS.cantaria);
  const frame = { frame: MATERIALS.brown, frameSize: 0.014 };
  opening(body, wall, 'front', -0.27, 0.13, 0.12, 0.25, MATERIALS.glass, { ...frame, door: true });
  opening(body, wall, 'front', 0.02, 0.17, 0.2, 0.17, MATERIALS.glass, frame);
  opening(body, wall, 'front', 0.27, 0.17, 0.17, 0.17, MATERIALS.glass, frame);
  awning(body, wall, rand);
  signBoard(body, wall, 0, 0.37, 0.24, 0.07, MATERIALS.cafeSign, MATERIALS.whiteTrim);
  if (twoFloors) {
    for (const x of [-0.27, 0, 0.27]) {
      opening(body, wall, 'front', x, 0.52, 0.11, 0.15, MATERIALS.glass, { frame: trim, frameSize: 0.016 });
    }
  }
  hipRoof(body, wall, eave, 27, 0.035, pick(rand, VILLA_ROOFS), MATERIALS.ridge);
  for (const x of [-0.08, 0.24]) cafeTable(g, x, 0.36);           // esplanada
  box(g, MATERIALS.calcada, 0.9, 0.012, 0.45 - frontZ, 0, 0.006, frontZ + (0.45 - frontZ) / 2);
  box(g, MATERIALS.yardEarth, 0.86, 0.01, 0.38, 0, 0.005, -0.24);
  hedge(g, 0, -0.405, 0.86, 0.05, 0.12);
  g.userData.lot = { w: wall.w, d: wall.d, z: body.position.z };
  return g;
}

// Toldo às riscas inclinado por cima das montras, com uma sanefa (a faixa que cai na ponta).
function awning(body, wall, rand) {
  const material = rand() < 0.5 ? MATERIALS.awningGreen : MATERIALS.awningRed;
  const deep = 0.14;
  const tilt = 0.4;                                                    // inclinação para a rua
  const a = box(body, material, wall.w - 0.1, 0.008, deep, 0.0,
    0.31 - (deep / 2) * Math.sin(tilt), wall.d / 2 + (deep / 2) * Math.cos(tilt));
  a.rotation.x = tilt;
  box(body, material, wall.w - 0.1, 0.03, 0.006, 0, 0.31 - deep * Math.sin(tilt) - 0.012, wall.d / 2 + deep * Math.cos(tilt));
}

// Terraço plano com platibanda à volta (muro baixo) e capeamento claro.
function flatRoof(body, wall, eave, paint, trim) {
  box(body, MATERIALS.flatRoof, wall.w - 0.02, 0.012, wall.d - 0.02, 0, eave + 0.006, 0);
  const h = 0.07, t = 0.03;
  for (const s of [-1, 1]) {
    box(body, paint, wall.w, h, t, 0, eave + h / 2, s * (wall.d / 2 - t / 2));
    box(body, paint, t, h, wall.d - 2 * t, s * (wall.w / 2 - t / 2), eave + h / 2, 0);
    box(body, trim, wall.w + 0.02, 0.014, t + 0.02, 0, eave + h + 0.007, s * (wall.d / 2 - t / 2));
    box(body, trim, t + 0.02, 0.014, wall.d, s * (wall.w / 2 - t / 2), eave + h + 0.007, 0);
  }
}

// Mesa redonda de esplanada com 2 cadeiras de plástico branco.
function cafeTable(g, x, z) {
  place(g, GEOMETRIES.tableTop, MATERIALS.chair, x, 0.045, z);
  box(g, MATERIALS.iron, 0.006, 0.04, 0.006, x, 0.024, z);
  for (const side of [-1, 1]) {
    const cx = x + side * 0.045;
    box(g, MATERIALS.chair, 0.025, 0.005, 0.025, cx, 0.03, z);                 // assento
    box(g, MATERIALS.chair, 0.005, 0.03, 0.025, cx + side * 0.012, 0.047, z);  // costas
    box(g, MATERIALS.chair, 0.02, 0.028, 0.02, cx, 0.014, z);                  // pés (juntos)
  }
}

// H5 — Solar de quinta na encosta (como a Quinta da Felicidade, por cima da aldeia):
// casa de 2 pisos creme ou branca, telhado de 2 águas e uma torre quadrada com telhado em
// pirâmide. Jardim de saibro murado, sebe e um pinheiro-manso.
function quintaManor(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.6, d: 0.46 };
  const eave = 0.56;
  const body = bodyAt(g, -0.04, -0.06);
  const paint = pick(rand, [MATERIALS.cream, MATERIALS.lime, MATERIALS.paleYellow]);
  const trim = MATERIALS.whiteTrim;
  walls(body, wall, eave, paint);
  baseBand(body, wall, 0.05, MATERIALS.granite);
  quoins(body, wall, eave, MATERIALS.cantaria, 0.035);
  box(body, trim, wall.w + 0.014, 0.018, wall.d + 0.014, 0, 0.3, 0);                      // friso
  gableRoof(body, wall, eave, 32, 0.04, pick(rand, VILLA_ROOFS), paint, MATERIALS.ridge);
  const framed = { frame: MATERIALS.cantaria, frameSize: 0.02, sill: MATERIALS.cantaria };
  opening(body, wall, 'front', -0.06, 0.13, 0.1, 0.24, pick(rand, DOORS), { ...framed, door: true });
  opening(body, wall, 'front', -0.22, 0.18, 0.09, 0.14, MATERIALS.glass, framed);
  opening(body, wall, 'front', -0.22, 0.44, 0.09, 0.15, MATERIALS.glass, framed);
  opening(body, wall, 'front', -0.06, 0.43, 0.09, 0.17, MATERIALS.glass, framed);
  ironBalcony(body, wall, -0.06, 0.33, 0.15);
  for (const x of [-0.15, 0.15]) {
    opening(body, wall, 'back', x, 0.18, 0.09, 0.14, MATERIALS.glass, framed);
    opening(body, wall, 'back', x, 0.44, 0.09, 0.14, MATERIALS.glass, framed);
  }
  villaTurret(body, wall, paint, trim);
  const tree = stonePine(rand);
  tree.scale.setScalar(0.7);
  tree.position.set(-0.3, 0, 0.3);
  g.add(tree);
  hedge(g, 0, -0.405, 0.86, 0.05, 0.18);
  gardenWall(g, -0.44, -0.16, 0.425, 0.1);
  gardenWall(g, 0.04, 0.44, 0.425, 0.1);
  ironGate(g, -0.06, 0.425, 0.16, MATERIALS.iron);
  g.userData.lot = { w: wall.w, d: wall.d, z: -0.06, yard: MATERIALS.gravel };
  return g;
}

// A torre do solar, no canto da frente à direita: sai um pouco da casa e sobe até 0.85,
// com cornija branca, janelas estreitas e um telhado em pirâmide com um pináculo de ferro.
function villaTurret(body, wall, paint, trim) {
  const size = 0.2, top = 0.85;
  const turret = bodyAt(body, wall.w / 2 - 0.08, wall.d / 2 - 0.06);
  const tw = { w: size, d: size };
  walls(turret, tw, top, paint);
  baseBand(turret, tw, 0.05, MATERIALS.granite);
  box(turret, trim, size + 0.03, 0.03, size + 0.03, 0, top + 0.005, 0);                    // cornija
  place(turret, GEOMETRIES.turretCap, MATERIALS.tileAged, 0, top + 0.02 + 0.1, 0);
  place(turret, GEOMETRIES.finial, MATERIALS.iron, 0, top + 0.23, 0);
  const framed = { frame: MATERIALS.cantaria, frameSize: 0.014, sill: trim };
  for (const face of ['front', 'right']) {
    opening(turret, tw, face, 0, 0.44, 0.07, 0.15, MATERIALS.glass, framed);
    opening(turret, tw, face, 0, 0.7, 0.07, 0.12, MATERIALS.glass, framed);
  }
}

// H6 — Quinta murada saloia: muro caiado à volta (com capeamento de telha), portão de ferro entre
// dois pilares com bolas de pedra, e uma casa branca em "L" ao fundo. No pátio: uma palmeira,
// um pinheiro-manso pequeno ou dois limoeiros.
function quinta(rand) {
  const g = new THREE.Group();
  const H = 0.11;
  gardenWall(g, -0.44, -0.09, 0.43, H);
  gardenWall(g, 0.09, 0.44, 0.43, H);
  gardenWall(g, -0.44, 0.44, -0.43, H);
  gardenWallZ(g, -0.43, 0.43, -0.43, H);
  gardenWallZ(g, -0.43, 0.43, 0.43, H);
  quintaGate(g);
  const band = pick(rand, [MATERIALS.ochre, MATERIALS.saloioBlue]);
  const roofMaterial = pick(rand, ROOFS);
  // corpo principal, ao fundo
  const main = bodyAt(g, -0.1, -0.22);
  const mainWall = { w: 0.5, d: 0.3 };
  walls(main, mainWall, 0.34, MATERIALS.lime);
  baseBand(main, mainWall, 0.05, band);
  quoins(main, mainWall, 0.34, band, 0.03);
  const roof = hipRoof(main, mainWall, 0.34, 27, 0.03, roofMaterial, MATERIALS.ridge);
  const framed = { frame: band, frameSize: 0.018 };
  opening(main, mainWall, 'front', 0.0, 0.12, 0.09, 0.2, pick(rand, DOORS), { ...framed, door: true });
  opening(main, mainWall, 'front', -0.16, 0.2, 0.09, 0.11, MATERIALS.green, framed);
  opening(main, mainWall, 'left', 0, 0.2, 0.09, 0.11, MATERIALS.green, framed);
  chimney(main, roof, -0.15, -0.04, 0.07, 0.14, MATERIALS.lime, true);
  // ala virada para o pátio (o "L")
  const wing = bodyAt(g, 0.27, -0.17);
  const wingWall = { w: 0.22, d: 0.34 };
  walls(wing, wingWall, 0.28, MATERIALS.lime);
  baseBand(wing, wingWall, 0.05, band);
  hipRoof(wing, wingWall, 0.28, 27, 0.03, roofMaterial, MATERIALS.ridge);
  opening(wing, wingWall, 'front', 0, 0.17, 0.09, 0.11, MATERIALS.glass, framed);
  opening(wing, wingWall, 'left', 0.12, 0.17, 0.09, 0.11, MATERIALS.green, framed);
  // árvore do pátio
  const v = rand();
  let tree;
  if (v < 0.45) tree = palm(rand);
  else if (v < 0.75) { tree = stonePine(rand); tree.scale.setScalar(0.6); }
  else tree = lemonTree(rand);
  tree.position.set(-0.24, 0, 0.2);
  g.add(tree);
  if (v >= 0.75) {
    const second = lemonTree(rand);
    second.position.set(0.22, 0, 0.25);
    g.add(second);
  }
  g.userData.lot = { w: 0.6, d: 0.4, z: -0.18, yard: MATERIALS.gravel };
  return g;
}

// Portão da quinta: 2 pilares caiados com capa de cantaria e uma bola em cima, e grades de ferro.
function quintaGate(g) {
  for (const sx of [-1, 1]) {
    box(g, MATERIALS.lime, 0.05, 0.2, 0.05, sx * 0.09, 0.1, 0.43);
    box(g, MATERIALS.cantaria, 0.065, 0.016, 0.065, sx * 0.09, 0.208, 0.43);
    place(g, GEOMETRIES.finial, MATERIALS.cantaria, sx * 0.09, 0.232, 0.43);
  }
  for (const y of [0.03, 0.15]) box(g, MATERIALS.iron, 0.13, 0.008, 0.008, 0, y, 0.43);
  for (let i = 0; i < 6; i++) box(g, MATERIALS.iron, 0.005, 0.14, 0.005, -0.055 + i * 0.022, 0.09, 0.43);
}

// H7 — Casa de granito de alojamento local (o tipo de casa atingido em 2018 na Malveira):
// paredes de granito à vista, telhado de telha velha, a plaquinha azul "AL" ao lado da porta
// e, ao lado, um anexo de madeira (foram os anexos que arderam). Muro de granito à frente.
function stoneCottage(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.5, d: 0.4 };
  const eave = 0.32;
  const body = bodyAt(g, -0.12, 0.0);
  walls(body, wall, eave, MATERIALS.graniteWall);
  const roof = gableRoof(body, wall, eave, 28, 0.05, pick(rand, [MATERIALS.tileAged, MATERIALS.tileLichen]),
    MATERIALS.graniteWall, MATERIALS.ridge);
  const stone = { frame: MATERIALS.cantaria, frameSize: 0.025 };
  opening(body, wall, 'front', -0.08, 0.12, 0.1, 0.22, pick(rand, [MATERIALS.green, MATERIALS.brown]), { ...stone, door: true });
  opening(body, wall, 'front', 0.13, 0.2, 0.09, 0.11, MATERIALS.green, stone);
  opening(body, wall, 'back', 0, 0.2, 0.09, 0.11, MATERIALS.green, stone);
  opening(body, wall, 'left', 0, 0.2, 0.09, 0.11, MATERIALS.glass, stone);
  signBoard(body, wall, -0.2, 0.23, 0.045, 0.034, MATERIALS.alSign, MATERIALS.saloioBlue); // placa "AL"
  chimney(body, roof, 0.17, 0, 0.07, 0.1, MATERIALS.graniteWall);
  woodenAnnex(g, 0.29, -0.06);
  // muro de pedra seca de granito à frente, com uma abertura para a porta
  box(g, MATERIALS.graniteWall, 0.18, 0.08, 0.06, -0.35, 0.04, 0.41);
  box(g, MATERIALS.graniteWall, 0.56, 0.07, 0.06, 0.16, 0.035, 0.41);
  g.userData.lot = { w: 0.8, d: wall.d, z: 0, yard: MATERIALS.yardEarth };
  return g;
}

// Anexo de madeira com telhado de uma água e um monte de lenha encostado.
function woodenAnnex(g, x, z) {
  const w = 0.2, d = 0.24, h = 0.2;
  box(g, MATERIALS.planks, w, h, d, x, h / 2, z);
  const roof = box(g, MATERIALS.tileAged, w + 0.04, 0.02, d + 0.04, x, h + 0.02, z);
  roof.rotation.z = 0.25;                                       // uma água, a cair para a direita
  box(g, MATERIALS.hole, 0.08, 0.17, 0.01, x, 0.085, z + d / 2 + 0.002);        // porta aberta
  for (let layer = 0; layer < 3; layer++) {                     // lenha
    for (let i = 0; i < 3 - layer; i++) {
      box(g, MATERIALS.brown, 0.028, 0.028, 0.12, x - w / 2 - 0.02 - i * 0.03 + layer * 0.015, 0.015 + layer * 0.027, z + 0.04);
    }
  }
}

// MARCO 1 — A Capela de Nossa Senhora da Assunção e o Largo do Rochio (o centro da aldeia).
// A vista escolhe UM quadrado de casa colado ao largo (ver village3d.js, findLandmarks).
// Capela caiada pequena, empena virada para o largo, uma sineira e telhado de telha laranja.
// Ao lado, o coreto octogonal com telhado e dois bancos. A capela NÃO tem bandeira:
// na vida real as igrejas portuguesas não hasteiam a bandeira nacional. A bandeira fica num
// mastro alto no canto do largo, como os mastros das Juntas de Freguesia.
function chapelLargo(rand) {
  const g = new THREE.Group();
  const chapelGroup = chapel(rand);
  chapelGroup.position.set(-0.17, 0, -0.08);
  chapelGroup.scale.setScalar(1.1);
  g.add(chapelGroup);
  bandstand(g, 0.24, 0.2);
  for (const z of [-0.2, 0.0]) {                                   // bancos de jardim
    box(g, MATERIALS.brown, 0.03, 0.012, 0.12, 0.38, 0.035, z);
    box(g, MATERIALS.iron, 0.03, 0.03, 0.012, 0.38, 0.015, z - 0.05);
    box(g, MATERIALS.iron, 0.03, 0.03, 0.012, 0.38, 0.015, z + 0.05);
  }
  const tree = stonePine(rand);                                    // pinheiro-manso do largo
  tree.scale.setScalar(0.75);
  tree.position.set(0.25, 0, -0.27);
  g.add(tree);
  box(g, MATERIALS.calcada, 0.9, 0.012, 0.9, 0, 0.006, 0);
  // o mastro do largo (da Junta, não da capela) com uma bandeira de Portugal grande
  const flag = tallFlagMast(g, 0.38, 0.38, 1.05, 0.32);
  g.userData.animate = (t) => flag.animate(t, 'south');
  g.userData.lot = { w: 0.44, d: 0.66, z: -0.08 };
  return g;
}

// Capela branca (ermida) com sineira: frontão virado para a rua, cunhais e porta de
// cantaria, óculo redondo, um sino na sineira e uma cruz no topo.
function chapel(rand) {
  const g = new THREE.Group();
  const face = { w: 0.4, d: 0.6 };                       // vista de fora: 0.4 de largura, 0.6 de fundo
  const eave = 0.42;
  // a nave: construída "de lado" (cumeeira ao longo de x) e rodada 90°: a empena fica na frente
  const nave = new THREE.Group();
  nave.rotation.y = Math.PI / 2;
  g.add(nave);
  const naveWall = { w: face.d, d: face.w };
  walls(nave, naveWall, eave, MATERIALS.lime);
  const roof = gableRoof(nave, naveWall, eave, 32, 0.035, MATERIALS.tile, MATERIALS.lime, MATERIALS.ridge);
  const band = pick(rand, [MATERIALS.ochre, MATERIALS.saloioBlue, MATERIALS.cantaria]);
  baseBand(g, face, 0.06, band);
  quoins(g, face, eave, MATERIALS.cantaria, 0.04);
  opening(g, face, 'front', 0, 0.14, 0.12, 0.26, MATERIALS.brown, { frame: MATERIALS.cantaria, frameSize: 0.025, door: true });
  onWall(g, face, 'front', 0, 0.35, 0.07, 0.07, 0.012, MATERIALS.cantaria);                 // óculo
  onWall(g, face, 'front', 0, 0.35, 0.04, 0.04, 0.016, MATERIALS.glass);
  for (const side of ['left', 'right']) {
    opening(g, face, side, 0.05, 0.28, 0.06, 0.12, MATERIALS.glass, { frame: MATERIALS.cantaria, frameSize: 0.015 });
  }
  bellGable(g, face.d / 2, eave + roof.rise);
  return g;
}

// Sineira: um pedaço de parede por cima da empena, com um arco, o sino e uma cruz.
function bellGable(g, frontZ, peakY) {
  const z = frontZ - 0.03;
  const bottom = peakY - 0.08, top = peakY + 0.2;
  box(g, MATERIALS.lime, 0.16, top - bottom, 0.05, 0, (top + bottom) / 2, z);
  box(g, MATERIALS.hole, 0.07, 0.1, 0.052, 0, top - 0.08, z);                              // arco
  place(g, GEOMETRIES.bell, MATERIALS.iron, 0, top - 0.08, z);
  const cap = new THREE.Mesh(wedgeGeometry(0.18, 0.065, 0.05, 0.09), MATERIALS.cantaria);
  cap.position.set(0, top, z);
  g.add(cap);
  box(g, MATERIALS.iron, 0.012, 0.08, 0.012, 0, top + 0.09, z);                           // cruz
  box(g, MATERIALS.iron, 0.05, 0.012, 0.012, 0, top + 0.1, z);
}

// Coreto: estrado octogonal de pedra, 8 colunas finas brancas, gradeamento e telhado em bico.
function bandstand(g, x, z) {
  place(g, GEOMETRIES.coretoBase, MATERIALS.cantaria, x, 0.025, z);
  place(g, GEOMETRIES.coretoRail, MATERIALS.iron, x, 0.07, z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    box(g, MATERIALS.whiteTrim, 0.012, 0.18, 0.012, x + Math.cos(a) * 0.12, 0.14, z + Math.sin(a) * 0.12);
  }
  place(g, GEOMETRIES.coretoRoof, MATERIALS.tile, x, 0.29, z);
  place(g, GEOMETRIES.finial, MATERIALS.iron, x, 0.36, z);
}

// MARCO 2 — Sociedade Familiar Recreativa (o clube da aldeia, fundado em 1941): um salão comprido
// branco com telhado de 2 águas, portas e janelas altas, uma placa e a bandeira de Portugal num
// mastro curto preso à parede, inclinado a 45° por cima da porta (como nas coletividades).
function clubHall(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.82, d: 0.42 };
  const eave = 0.32;
  const body = bodyAt(g, 0, 0.0);
  walls(body, wall, eave, MATERIALS.lime);
  baseBand(body, wall, 0.05, MATERIALS.saloioBlue);
  quoins(body, wall, eave, MATERIALS.saloioBlue, 0.03);
  gableRoof(body, wall, eave, 25, 0.035, pick(rand, VILLA_ROOFS), MATERIALS.lime, MATERIALS.ridge);
  const framed = { frame: MATERIALS.whiteTrim, frameSize: 0.016, sill: MATERIALS.cantaria };
  opening(body, wall, 'front', 0, 0.13, 0.14, 0.24, MATERIALS.green, { ...framed, door: true });
  for (const x of [-0.3, -0.17, 0.17, 0.3]) opening(body, wall, 'front', x, 0.17, 0.08, 0.16, MATERIALS.glass, framed);
  for (const x of [-0.25, 0, 0.25]) opening(body, wall, 'back', x, 0.17, 0.08, 0.14, MATERIALS.glass, framed);
  signBoard(body, wall, -0.16, 0.285, 0.34, 0.045, MATERIALS.hallSign, MATERIALS.whiteTrim);
  box(g, MATERIALS.calcada, 0.9, 0.012, 0.22, 0, 0.006, 0.34);
  hedge(g, 0, -0.405, 0.86, 0.05, 0.12);
  // mastro de parede a 45°, ao lado da porta (sai bem para fora, para a bandeira não bater no beiral)
  const fz = wall.d / 2, fy = 0.2, len = 0.2;
  const tip = { x: 0.1, y: fy + len * Math.SQRT1_2, z: fz + len * Math.SQRT1_2 };
  stick(body, GEOMETRIES.flagPole, MATERIALS.pole, 0.1, fy, fz, tip.x, tip.y, tip.z);
  box(body, MATERIALS.iron, 0.03, 0.03, 0.012, 0.1, fy, fz + 0.004);                        // suporte
  place(body, GEOMETRIES.finial, MATERIALS.gold, tip.x, tip.y + 0.006, tip.z);
  const flag = makeFlag(MATERIALS.flag, 0.12, 0.08);
  flag.mesh.position.set(tip.x, tip.y - 0.045, tip.z);
  body.add(flag.mesh);
  // e um mastro alto à frente do salão, com uma bandeira grande (vê-se de longe)
  const big = tallFlagMast(g, -0.37, 0.37, 0.95, 0.28);
  g.userData.animate = (t) => { flag.animate(t, 'alongWall'); big.animate(t, 'south'); };
  g.userData.lot = { w: wall.w, d: wall.d, z: 0 };
  return g;
}

// A bandeira de Portugal pendurada no parapeito de uma varanda (como depois de um jogo de futebol):
// fica encostada à varanda, a cair, e mexe-se um pouco com o vento.
// face = a parede onde fica ('front' = no parapeito da varanda; 'back', 'left', 'right' = pendurada
// na parede, por baixo do beiral).
function balconyFlag(body, spot, face = 'front') {
  const w = 0.195, h = 0.13;                                        // 2:3 (maior, para se ver de longe)
  const flag = makeFlag(MATERIALS.flag, w, h, 'hanging');
  const y = spot.y - h / 2;
  if (face === 'front') flag.mesh.position.set(spot.x - w / 2, y, spot.z + 0.006);
  else {
    const { w: ww, d: wd } = spot.wall;
    // a bandeira é desenhada virada para +z; rodamo-la para ficar virada para fora da parede
    if (face === 'right') { flag.mesh.rotation.y = Math.PI / 2; flag.mesh.position.set(ww / 2 + 0.008, y, w / 2); }
    if (face === 'left') { flag.mesh.rotation.y = -Math.PI / 2; flag.mesh.position.set(-ww / 2 - 0.008, y, -w / 2); }
    if (face === 'back') { flag.mesh.rotation.y = Math.PI; flag.mesh.position.set(w / 2, y, -wd / 2 - 0.008); }
  }
  body.add(flag.mesh);
  const root = body.parent;
  root.userData.animate = (t) => flag.animate(t, 'hanging');
}

// Que parede da casa fica virada para a câmara do jogo (que está a sueste, em +x +z)?
// rotation = quanto a vista roda a casa (para a porta olhar para a estrada).
function faceTowardsCamera(rotation) {
  const s = Math.sin(rotation), c = Math.cos(rotation);
  const faces = { front: s + c, back: -s - c, right: c - s, left: s - c };   // direção no mundo · (1, 1)
  return Object.keys(faces).reduce((a, b) => (faces[b] > faces[a] ? b : a));
}

// Mastro ALTO com uma bandeira de Portugal grande (no largo e na sociedade recreativa), para a
// bandeira se ver da câmara do jogo. Base de pedra, mastro branco e uma bola dourada no topo.
// Devolve { animate } da bandeira.
function tallFlagMast(g, x, z, height = 1.0, flagW = 0.3) {
  box(g, MATERIALS.cantaria, 0.07, 0.04, 0.07, x, 0.02, z);
  stick(g, GEOMETRIES.flagPole, MATERIALS.pole, x, 0.04, z, x, height, z, 1.6);
  place(g, GEOMETRIES.finial, MATERIALS.gold, x, height + 0.014, z);
  const flagH = flagW * 2 / 3;
  const flag = makeFlag(MATERIALS.flag, flagW, flagH);
  flag.mesh.position.set(x, height - flagH / 2 - 0.015, z);
  g.add(flag.mesh);
  return flag;
}

// =====================================================================================
// 8. QUARTEL DOS BOMBEIROS VOLUNTÁRIOS (o edifício especial do mapa, no lugar da "escola")
// Um bloco branco comprido com uma faixa vermelha em cima, 3 portões vermelhos de garagem,
// a placa "BOMBEIROS VOLUNTÁRIOS", um edifício de 2 pisos ao lado com a torre de secar
// mangueiras, um carro de bombeiros e uma ambulância na calçada, e a bandeira de Portugal.
// Desenhado para caber num quadrado (0.9 x 0.9); a vista aumenta-o para ocupar 2 x 2.
// =====================================================================================
export function buildSchool(rand) {
  const g = new THREE.Group();
  box(g, MATERIALS.calcada, 0.9, 0.014, 0.36, 0, 0.007, 0.27);                            // calçada
  const garage = garageBlock(g);
  officeAndTower(g);
  const beacons = fireEngine(g, garage.position.x - 0.2, 0.25);
  ambulance(g, garage.position.x, 0.24);
  box(g, MATERIALS.fireRed, 0.022, 0.05, 0.022, 0.1, 0.025, 0.42);                        // marco de água
  // os 3 mastros à entrada (como em todos os quartéis portugueses): a União Europeia, Portugal
  // ao meio (o mais alto) e a bandeira da corporação
  const flags = [
    flagPole(g, 0.2, 0.4, 0.5, MATERIALS.euFlag),
    flagPole(g, 0.29, 0.4, 0.72, MATERIALS.flag, 0.21),             // Portugal: o mais alto
    flagPole(g, 0.38, 0.4, 0.5, MATERIALS.firemenFlag),
  ];
  mergeByMaterial(g);                                       // as bandeiras e as luzes ficam de fora
  g.userData.animate = (t) => {
    for (const flag of flags) flag.animate(t, 'south');
    // pirilampos azuis a piscar, um de cada vez
    const on = Math.sin(t * 9) > 0;
    beacons[0].emissiveIntensity = on ? 2.5 : 0.15;
    beacons[1].emissiveIntensity = on ? 0.15 : 2.5;
  };
  return shadows(g);
}

// O bloco das garagens: paredes brancas, faixa vermelha, terraço com platibanda branca,
// 3 portões vermelhos com moldura branca e a placa azul-escura por cima.
function garageBlock(g) {
  const wall = { w: 0.62, d: 0.44 };
  const h = 0.28;
  const body = bodyAt(g, -0.13, 0.11 - wall.d / 2);
  walls(body, wall, h, MATERIALS.lime);
  baseBand(body, wall, 0.03, MATERIALS.cantaria);
  box(body, MATERIALS.fireRed, wall.w + 0.006, 0.035, wall.d + 0.006, 0, h - 0.025, 0);   // faixa vermelha
  flatRoof(body, wall, h, MATERIALS.lime, MATERIALS.whiteTrim);
  for (const x of [-0.2, 0, 0.2]) {
    onWall(body, wall, 'front', x, 0.085, 0.16, 0.17, 0.008, MATERIALS.garageDoor);
    onWall(body, wall, 'front', x, 0.177, 0.18, 0.014, 0.016, MATERIALS.whiteTrim);
    for (const s of [-1, 1]) onWall(body, wall, 'front', x + s * 0.087, 0.085, 0.014, 0.17, 0.016, MATERIALS.whiteTrim);
  }
  signBoard(body, wall, 0, 0.212, 0.46, 0.05, MATERIALS.bombeirosSign, MATERIALS.navy);
  for (const x of [-0.12, 0.12]) {
    opening(body, wall, 'left', x, 0.15, 0.08, 0.1, MATERIALS.glass, { frame: MATERIALS.whiteTrim, frameSize: 0.012 });
  }
  for (const x of [-0.2, 0, 0.2]) {
    opening(body, wall, 'back', x, 0.15, 0.08, 0.1, MATERIALS.glass, { frame: MATERIALS.whiteTrim, frameSize: 0.012 });
  }
  return body;
}

// O edifício da secretaria (2 pisos) e a torre de secar mangueiras com faixas vermelhas.
function officeAndTower(g) {
  const wall = { w: 0.22, d: 0.3 };
  const h = 0.42;
  const office = bodyAt(g, 0.31, 0.12 - wall.d / 2);
  walls(office, wall, h, MATERIALS.lime);
  baseBand(office, wall, 0.03, MATERIALS.cantaria);
  box(office, MATERIALS.fireRed, wall.w + 0.006, 0.035, wall.d + 0.006, 0, h - 0.025, 0);
  flatRoof(office, wall, h, MATERIALS.lime, MATERIALS.whiteTrim);
  const framed = { frame: MATERIALS.whiteTrim, frameSize: 0.012 };
  opening(office, wall, 'front', 0, 0.11, 0.09, 0.2, MATERIALS.glass, { ...framed, door: true });
  opening(office, wall, 'front', 0, 0.3, 0.1, 0.1, MATERIALS.glass, framed);
  opening(office, wall, 'right', 0.05, 0.14, 0.08, 0.1, MATERIALS.glass, framed);
  opening(office, wall, 'right', 0.05, 0.3, 0.08, 0.1, MATERIALS.glass, framed);
  // torre: sobe por trás do edifício até 0.63
  const size = 0.13, top = 0.63;
  const tower = bodyAt(g, 0.33, -0.1);
  const tw = { w: size, d: size };
  walls(tower, tw, top, MATERIALS.lime);
  for (const y of [0.5, 0.585]) box(tower, MATERIALS.fireRed, size + 0.006, 0.025, size + 0.006, 0, y, 0);
  box(tower, MATERIALS.fireRed, size + 0.03, 0.02, size + 0.03, 0, top + 0.01, 0);        // capa
  for (const face of ['front', 'right']) {
    onWall(tower, tw, face, 0, 0.545, 0.03, 0.05, 0.006, MATERIALS.hole);                  // frestas
  }
  box(tower, MATERIALS.iron, 0.006, 0.08, 0.006, 0, top + 0.06, 0);                        // antena
}

// Carro de bombeiros: cabine e caixa vermelhas com uma risca branca, escada no tejadilho,
// 4 rodas e 2 pirilampos azuis que piscam (materiais próprios). Devolve os 2 materiais das luzes.
function fireEngine(g, x, z) {
  const t = bodyAt(g, x, z);
  box(t, MATERIALS.truckRed, 0.1, 0.075, 0.16, 0, 0.06, -0.035);                          // caixa
  box(t, MATERIALS.truckRed, 0.1, 0.066, 0.065, 0, 0.055, 0.08);                          // cabine
  box(t, MATERIALS.glass, 0.09, 0.026, 0.004, 0, 0.072, 0.113);                           // para-brisas
  box(t, MATERIALS.glass, 0.102, 0.022, 0.04, 0, 0.072, 0.085);                           // vidros laterais
  box(t, MATERIALS.white, 0.102, 0.008, 0.16, 0, 0.045, -0.035);                          // risca
  box(t, MATERIALS.chrome, 0.104, 0.012, 0.01, 0, 0.026, 0.113);                          // para-choques
  for (const s of [-1, 1]) box(t, MATERIALS.chrome, 0.006, 0.006, 0.2, s * 0.025, 0.102, -0.03);   // escada
  for (let i = 0; i < 6; i++) box(t, MATERIALS.chrome, 0.05, 0.004, 0.006, 0, 0.102, -0.12 + i * 0.035);
  for (const wx of [-0.05, 0.05]) {
    for (const wz of [-0.08, 0.08]) place(t, GEOMETRIES.wheel, MATERIALS.tyre, wx, 0.022, wz);
  }
  return [-0.025, 0.025].map((bx) => {
    const material = new THREE.MeshStandardMaterial({ color: COLORS.beacon, emissive: COLORS.beacon, emissiveIntensity: 1 });
    const light = box(t, material, 0.022, 0.012, 0.016, bx, 0.094, 0.08);
    light.userData.keepSeparate = true;
    light.userData.moving = true;                       // pisca: a vista deixa-o solto na cena
    light.userData.noShadow = true;
    return material;
  });
}

// Ambulância dos bombeiros: branca com risca vermelha e um pirilampo azul.
function ambulance(g, x, z) {
  const t = bodyAt(g, x, z);
  box(t, MATERIALS.white, 0.09, 0.085, 0.15, 0, 0.065, -0.02);
  box(t, MATERIALS.white, 0.09, 0.055, 0.05, 0, 0.05, 0.08);
  box(t, MATERIALS.glass, 0.08, 0.024, 0.004, 0, 0.065, 0.106);
  box(t, MATERIALS.fireRed, 0.092, 0.014, 0.15, 0, 0.06, -0.02);
  box(t, MATERIALS.saloioBlue, 0.03, 0.01, 0.014, 0, 0.113, 0.03);
  for (const wx of [-0.045, 0.045]) {
    for (const wz of [-0.07, 0.07]) place(t, GEOMETRIES.wheel, MATERIALS.tyre, wx, 0.022, wz);
  }
}

// Mastro com uma bandeira (2:3). Devolve { animate } para a fazer ondular ao vento.
function flagPole(g, px, pz, poleTop, material, w = 0.16) {
  stick(g, GEOMETRIES.flagPole, MATERIALS.pole, px, 0, pz, px, poleTop, pz);
  place(g, GEOMETRIES.finial, MATERIALS.gold, px, poleTop + 0.012, pz);
  const h = w * 2 / 3;
  const flag = makeFlag(material, w, h);
  flag.mesh.position.set(px, poleTop - h / 2 - 0.01, pz);
  g.add(flag.mesh);
  return flag;
}

// UMA BANDEIRA que ondula. Cada bandeira tem a sua geometria (é dobrada a cada frame, no
// processador: são só ~50 pontos). O lado da tralha (o verde, junto ao mastro) fica em x = 0.
// animate(t, mode):
//   'south'     -> bandeira num mastro solto: voa para SUL no mundo (+z). Nesta noite o vento
//                  vem de norte (5°), por isso as bandeiras apontam para a vila e para o mar.
//   'alongWall' -> mastro preso a uma parede: voa ao longo da parede, para o lado mais a sul.
//   'hanging'   -> pendurada numa varanda: fica a cair, só mexe um pouco.
// Como uma bandeira verdadeira, vista do outro lado mostra o desenho ao espelho: com o vento de
// norte, quem olha de oeste vê a frente (verde junto ao mastro) e quem olha de leste vê o verso.
const flagEuler = new THREE.Euler(), flagQuat = new THREE.Quaternion();
let flagCount = 0;
function makeFlag(material, w, h) {
  const geo = new THREE.PlaneGeometry(w, h, 10, 3);
  geo.translate(w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.keepSeparate = true;                   // não juntar com as outras peças (mexe-se)
  mesh.userData.moving = true;                         // a vista deixa-a solta na cena (village3d.js)
  mesh.userData.noShadow = true;
  const pos = geo.attributes.position;
  const original = pos.array.slice();
  const phase = flagCount++ * 1.7;                    // cada bandeira ondula com o seu atraso
  let aimed = false;
  const animate = (t, mode) => {
    if (!aimed && mesh.parent) {
      // O vento é no MUNDO, mas a casa está rodada (olha para a estrada). Medimos para onde a
      // bandeira aponta no mundo (yaw) e rodamo-la o que falta. Funciona com a bandeira dentro
      // da casa ou solta na cena (a vista solta-a, ver village3d.js).
      mesh.getWorldQuaternion(flagQuat);
      const yaw = flagEuler.setFromQuaternion(flagQuat, 'YXZ').y;
      let target = yaw;
      if (mode === 'south') target = -Math.PI / 2;                                // +x -> +z (sul)
      if (mode === 'alongWall') target = yaw + (-Math.sin(yaw) >= 0 ? 0 : Math.PI); // o lado mais a sul
      mesh.rotation.y += target - yaw;
      aimed = true;
    }
    const hanging = mode === 'hanging';
    for (let i = 0; i < pos.count; i++) {
      const x = original[i * 3], y = original[i * 3 + 1];
      const k = x / w;                                 // 0 no mastro, 1 na ponta
      const wave = Math.sin(x * (hanging ? 50 : 38) - t * (hanging ? 3 : 8) + phase + y * 6);
      pos.array[i * 3 + 2] = hanging ? 0.003 + wave * 0.003 : wave * 0.016 * k;
      if (!hanging) pos.array[i * 3 + 1] = y - k * k * 0.01;       // a ponta cai um bocadinho
    }
    pos.needsUpdate = true;
  };
  return { mesh, animate };
}

// =====================================================================================
// 9. ÁRVORES DA SERRA DE SINTRA (outubro)
// 'conifer'   = as que ardem muito: eucalipto, pinheiro-bravo e pinheiro-manso.
// 'broadleaf' = folhosas que travam o fogo: sobreiro, azinheira, carvalho-cerquinho, oliveira.
// buildTree(kind, rand, ctx) — ctx é OPCIONAL: ctx.nearHouses = quantas casas há nos 8 quadrados
// à volta. Nas fotos, DENTRO da aldeia não há eucaliptos: há pinheiros-mansos de copa achatada,
// ciprestes (as sebes altas e escuras), palmeiras nos jardins e oliveiras nos quintais velhos.
// Os eucaliptos e os pinheiros-bravos ficam na serra e nos vales.
// Alturas (cerca de 0.6 x as reais): eucalipto 1.15-1.35, pinheiro-bravo 0.9-1.1,
// pinheiro-manso 0.85-1.05, carvalho 0.7-0.85, sobreiro 0.6-0.75, azinheira 0.55-0.7.
// =====================================================================================
export function buildTree(kind, rand, ctx) {
  const g = new THREE.Group();
  const r = rand();
  const inVillage = (ctx?.nearHouses ?? 0) >= 2;
  let tree;
  if (kind === 'conifer') {
    if (inVillage) {
      if (r < 0.5) tree = stonePine(rand);
      else if (r < 0.75) { tree = cypress(rand); tree.scale.setScalar(1.45); }   // cipreste alto
      else tree = maritimePine(rand);
    } else if (r < 0.35) tree = eucalyptus(rand);
    else if (r < 0.8) tree = maritimePine(rand);
    else tree = stonePine(rand);
  } else if (inVillage) {
    if (r < 0.3) tree = oliveTree(rand);
    else if (r < 0.5) tree = palm(rand);
    else if (r < 0.75) tree = corkOak(rand);
    else tree = holmOak(rand);
  } else {
    if (r < 0.5) tree = corkOak(rand);
    else if (r < 0.8) tree = holmOak(rand);
    else tree = portugueseOak(rand);
  }
  g.add(tree);
  // Na serra o pinhal é fechado (70-90% de copa nas fotos e no satélite): junto a cada árvore
  // grande nasce muitas vezes um pinheiro novo, para o manto verde-escuro não ter buracos.
  if (kind === 'conifer' && !inVillage && rand() < 0.6) {
    const young = maritimePine(rand);
    const ang = rand() * Math.PI * 2;
    young.scale.setScalar(0.5 + rand() * 0.15);
    young.position.set(Math.cos(ang) * 0.17, 0, Math.sin(ang) * 0.17);
    g.add(young);
  }
  mergeByMaterial(g);
  return shadows(g);
}

// C1 — Eucalipto: o mais alto, tronco fino e claro com manchas e tiras de casca a cair,
// copa aberta lá em cima: tufos azul-acinzentados pendurados em raminhos.
function eucalyptus(rand) {
  const t = new THREE.Group();
  const H = 1.15 + rand() * 0.2;
  const topX = (rand() - 0.5) * 0.1;
  const topZ = (rand() - 0.5) * 0.1;
  const trunkTop = H * 0.88;
  stick(t, GEOMETRIES.euTrunk, MATERIALS.euBark, 0, 0, 0, topX, trunkTop, topZ);
  const patches = 2 + Math.floor(rand() * 2);                  // manchas cinzentas na casca
  for (let i = 0; i < patches; i++) {
    const y = H * (0.1 + rand() * 0.4);
    const k = y / trunkTop;
    const radius = (0.036 - 0.014 * k) * 0.95;
    const ang = rand() * Math.PI * 2;
    const patch = box(t, MATERIALS.euPatch, 0.025, 0.07, 0.006,
      topX * k + Math.cos(ang) * radius, y, topZ * k + Math.sin(ang) * radius);
    patch.rotation.y = Math.PI / 2 - ang;
  }
  for (const ang of [rand() * 3, 3 + rand() * 3]) {             // tiras de casca junto à base
    const strip = new THREE.Mesh(GEOMETRIES.euStrip, MATERIALS.euStrip);
    strip.position.set(Math.cos(ang) * 0.038, 0.07, Math.sin(ang) * 0.038);
    strip.rotation.set(0, Math.PI / 2 - ang, (rand() - 0.5) * 0.4);
    t.add(strip);
  }
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.7;
    const dist = 0.08 + rand() * 0.12;
    const s = 0.06 + rand() * 0.025;
    const sy = s * 2;                                           // esticado: folhas a pender
    const wanted = H * (0.62 + (i / (n - 1)) * 0.27 + rand() * 0.06);
    const cy = Math.min(wanted, H - sy * 1.15);
    const cx = topX + Math.cos(ang) * dist;
    const cz = topZ + Math.sin(ang) * dist;
    const fromY = Math.min(cy - 0.08, trunkTop);
    const k = fromY / trunkTop;
    stick(t, GEOMETRIES.twig, MATERIALS.euBark, topX * k, fromY, topZ * k, cx, cy + sy * 0.5, cz);
    clump(t, rand, rand() < 0.6 ? MATERIALS.euLeaf : MATERIALS.euLeafLit, cx, cy, cz, s, sy, s);
  }
  return t;
}

// C2 — Pinheiro-bravo: tronco avermelhado, nu em baixo, e uma copa escura, irregular e cheia
// na metade de cima (nas fotos, os pinhais da serra formam um manto verde-escuro contínuo).
function maritimePine(rand) {
  const t = new THREE.Group();
  const H = 0.9 + rand() * 0.2;
  const bend = (rand() - 0.5) * 0.08;
  const midY = H * 0.4;
  const topX = bend * 0.4 + (rand() - 0.5) * 0.04;
  const topY = H * 0.8;
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.pineBark, 0, 0, 0, bend, midY, 0, 1.15);
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.pineBark, bend, midY, 0, topX, topY, 0, 0.8);
  const n = 5 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.6;
    const low = i >= 3;                                         // 3 tufos lá em cima, 2-3 mais abaixo
    const dist = low ? 0.1 + rand() * 0.05 : 0.04 + rand() * 0.06;
    const s = low ? 0.11 + rand() * 0.03 : 0.14 + rand() * 0.04;
    const sy = s * 0.6;
    const cx = topX + Math.cos(ang) * dist;
    const cz = Math.sin(ang) * dist;
    const cy = low ? H * (0.58 + rand() * 0.1) : H - sy * 1.1 - rand() * 0.08;
    if (i < 2) stick(t, GEOMETRIES.twig, MATERIALS.pineBark, topX, topY - 0.04, 0, cx, cy, cz, 1.5);
    clump(t, rand, rand() < 0.55 ? MATERIALS.pineNeedle : MATERIALS.pineNeedleLit, cx, cy, cz, s, sy, s);
  }
  if (rand() < 0.5) {                                           // pinhas
    box(t, MATERIALS.pineCone, 0.03, 0.045, 0.03, topX + 0.06, H - 0.15, 0.03);
    box(t, MATERIALS.pineCone, 0.03, 0.045, 0.03, topX - 0.05, H - 0.16, -0.04);
  }
  return t;
}

// C3 — Pinheiro-manso: tronco torto que se abre em pernadas e uma copa larga e achatada,
// em forma de guarda-chuva (nas encostas baixas e no Guincho).
function stonePine(rand) {
  const t = new THREE.Group();
  const H = 0.85 + rand() * 0.2;
  const lean = (rand() - 0.5) * 0.14;
  const midY = H * 0.45, topY = H * 0.75;
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.stonePineBark, 0, 0, 0, lean * 0.4, midY, 0, 1.2);
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.stonePineBark, lean * 0.4, midY, 0, lean, topY, 0, 0.9);
  const n = 6 + (rand() < 0.5 ? 1 : 0);
  const crownY = H - 0.06;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.4;
    const dist = i === 0 ? 0 : 0.1 + rand() * 0.08;
    const s = 0.13 + rand() * 0.03;
    const cx = lean + Math.cos(ang) * dist;
    const cz = Math.sin(ang) * dist;
    const cy = crownY - dist * 0.3 - rand() * 0.02;              // as pontas descem um pouco
    if (i > 0 && i < 4) stick(t, GEOMETRIES.limb, MATERIALS.stonePineBark, lean, topY - 0.03, 0, cx * 0.85, cy - 0.03, cz * 0.85, 0.45);
    const material = i === 0 || rand() < 0.35 ? MATERIALS.stonePineLit : MATERIALS.stonePine;
    clump(t, rand, material, cx, cy, cz, s, s * 0.45, s);
  }
  return t;
}

// B1 — Sobreiro: tronco curto e grosso que se abre em pernadas, copa larga e escura.
// Alguns foram descortiçados: tronco vermelho-ferrugem com o algarismo do ano pintado a branco.
function corkOak(rand) {
  const t = new THREE.Group();
  const H = 0.6 + rand() * 0.15;
  const lean = (rand() - 0.5) * 0.06;
  const forkY = 0.22;
  const r = rand();
  let bark = MATERIALS.cork;
  if (r < 0.2) bark = MATERIALS.corkFresh;
  else if (r < 0.4) bark = MATERIALS.corkAged;
  stick(t, GEOMETRIES.oakTrunk, bark, 0, 0, 0, lean, forkY, 0);
  if (bark !== MATERIALS.cork) {
    const d = 0.065 * 0.866 + 0.004;
    const digit = box(t, MATERIALS.white, 0.02, 0.032, 0.006,
      lean * 0.5 + Math.sin(Math.PI / 6) * d, 0.13, Math.cos(Math.PI / 6) * d);
    digit.rotation.y = Math.PI / 6;
  }
  const limbs = 2 + (rand() < 0.5 ? 1 : 0);
  const centres = [];
  for (let i = 0; i < limbs; i++) {
    const ang = (i / limbs) * Math.PI * 2 + rand();
    centres.push({ x: lean + Math.cos(ang) * 0.13, z: Math.sin(ang) * 0.13 });
  }
  centres.push({ x: lean, z: 0 });
  centres.forEach((c, i) => {
    const s = 0.17 + rand() * 0.04;
    const sy = 0.1 + rand() * 0.025;
    const cy = H - sy * 1.15;
    if (i < limbs) stick(t, GEOMETRIES.limb, MATERIALS.cork, lean, forkY - 0.02, 0, c.x, cy, c.z);
    clump(t, rand, rand() < 0.6 ? MATERIALS.oak : MATERIALS.oakLit, c.x, cy, c.z, s, sy, s);
  });
  return t;
}

// B2 — Azinheira: tronco curto e escuro, copa redonda, densa e verde-escura até perto do chão.
function holmOak(rand) {
  const t = new THREE.Group();
  const H = 0.55 + rand() * 0.15;
  const lean = (rand() - 0.5) * 0.05;
  stick(t, GEOMETRIES.oakTrunk, MATERIALS.oakBark, 0, 0, 0, lean, 0.2, 0, 0.8);
  clump(t, rand, MATERIALS.holm, lean, H - 0.18, 0, 0.21, 0.17, 0.21);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + rand();
    const material = rand() < 0.5 ? MATERIALS.holmLit : MATERIALS.holm;
    clump(t, rand, material, lean + Math.cos(ang) * 0.12, H - 0.27, Math.sin(ang) * 0.12, 0.13, 0.11, 0.13);
  }
  return t;
}

// B3 — Carvalho-cerquinho: mais alto e mais claro, copa aberta em tufos; em outubro já tem
// algumas folhas a amarelar.
function portugueseOak(rand) {
  const t = new THREE.Group();
  const H = 0.7 + rand() * 0.15;
  const tx = (rand() - 0.5) * 0.05;
  stick(t, GEOMETRIES.oakTrunk, MATERIALS.oakBark, 0, 0, 0, tx, 0.32, 0, 0.75);
  stick(t, GEOMETRIES.limb, MATERIALS.oakBark, tx, 0.28, 0, tx + 0.1, H - 0.24, 0.05);
  const parts = [[tx, H - 0.18, 0, 0.18], [tx + 0.12, H - 0.25, 0.05, 0.14], [tx - 0.11, H - 0.27, -0.06, 0.14],
    [tx - 0.02, H - 0.3, 0.12, 0.12]];
  parts.forEach(([x, y, z, s], i) => {
    let material = rand() < 0.5 ? MATERIALS.oak : MATERIALS.oakLit;
    if (i === 3 && rand() < 0.5) material = MATERIALS.gorseDry;  // folhas a amarelar
    clump(t, rand, material, x, y, z, s, s * 0.85, s);
  });
  return t;
}

// Cipreste (nas quintas e chalés): uma coluna escura e estreita.
function cypress(rand) {
  const t = new THREE.Group();
  const H = 0.6 + rand() * 0.15;
  stick(t, GEOMETRIES.twig, MATERIALS.oakBark, 0, 0, 0, 0, 0.1, 0, 3);
  clump(t, rand, MATERIALS.cypress, 0, H * 0.4, 0, 0.08, H * 0.32, 0.08);
  clump(t, rand, MATERIALS.cypress, 0, H * 0.72, 0, 0.06, H * 0.24, 0.06);
  return t;
}

// Palmeira das Canárias (nos jardins das quintas): tronco grosso e um leque de folhas curvas.
function palm(rand) {
  const t = new THREE.Group();
  const H = 0.6 + rand() * 0.12;
  const lean = (rand() - 0.5) * 0.06;
  stick(t, GEOMETRIES.palmTrunk, MATERIALS.palmTrunk, 0, 0, 0, lean, H, 0, 1.3);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.3;
    const c = Math.cos(ang), s = Math.sin(ang);
    const material = rand() < 0.2 ? MATERIALS.palmDry : MATERIALS.palmLeaf;
    const midY = H + 0.05 + rand() * 0.03;
    const endY = H - 0.06 - rand() * 0.06;
    stick(t, GEOMETRIES.frond, material, lean, H, 0, lean + c * 0.12, midY, s * 0.12);
    stick(t, GEOMETRIES.frond, material, lean + c * 0.12, midY, s * 0.12, lean + c * 0.24, endY, s * 0.24, 0.8);
  }
  clump(t, rand, MATERIALS.palmTrunk, lean, H, 0, 0.05, 0.04, 0.05);
  return t;
}

// Limoeiro pequeno (nos quintais): copa redonda com limões amarelos.
function lemonTree(rand) {
  const t = new THREE.Group();
  stick(t, GEOMETRIES.twig, MATERIALS.oakBark, 0, 0, 0, 0, 0.12, 0, 2.5);
  clump(t, rand, MATERIALS.lemon, 0, 0.2, 0, 0.1, 0.09, 0.1);
  for (let i = 0; i < 5; i++) dot(t, rand, MATERIALS.lemonFruit, 0.018, 0, 0.2, 0, 0.1, 0.09, 0.1);
  return t;
}

// Oliveira (nos quintais velhos da aldeia): tronco curto e torcido, copa baixa cinzento-esverdeada.
function oliveTree(rand) {
  const t = new THREE.Group();
  const lean = (rand() - 0.5) * 0.08;
  stick(t, GEOMETRIES.oakTrunk, MATERIALS.oakBark, 0, 0, 0, lean, 0.14, 0.02, 0.7);
  stick(t, GEOMETRIES.limb, MATERIALS.oakBark, lean, 0.13, 0.02, lean + 0.08, 0.24, -0.03);
  stick(t, GEOMETRIES.limb, MATERIALS.oakBark, lean, 0.13, 0.02, lean - 0.07, 0.25, 0.04);
  for (const [x, y, z, s] of [[0.06, 0.3, -0.02, 0.13], [-0.07, 0.31, 0.04, 0.12], [0, 0.37, 0, 0.12]]) {
    clump(t, rand, rand() < 0.5 ? MATERIALS.olive : MATERIALS.oliveLit, lean + x, y, z, s, s * 0.7, s);
  }
  return t;
}

// =====================================================================================
// 10. ARBUSTOS — o mato da serra (o combustível principal do fogo). Outubro: tudo seco,
// castanho-azeitona, sem flores. Entre o mato aparecem os penedos de granito de Sintra.
// =====================================================================================
export function buildBush(rand) {
  const g = new THREE.Group();
  const r = rand();
  // Nas fotos o mato é um TAPETE baixo e contínuo (tojo, esteva, urze), com poucas acácias e penedos.
  if (r < 0.32) g.add(gorse(rand));
  else if (r < 0.56) g.add(mound(rand, MATERIALS.rockrose, MATERIALS.rockrose));        // esteva
  else if (r < 0.76) g.add(mound(rand, MATERIALS.heatherRust, MATERIALS.heather));      // urze
  else if (r < 0.84) g.add(acacia(rand));
  else if (r < 0.93) g.add(broom(rand));
  else g.add(boulder(rand));
  g.scale.set(1.3, 0.85, 1.3);                  // mais largo e mais baixo: os arbustos encostam-se
  mergeByMaterial(g);
  return shadows(g);
}

// K1 — Tojo: cúpula baixa, densa e espinhosa, com pontas e "saia" secas (sem flores em outubro).
function gorse(rand) {
  const t = new THREE.Group();
  const s = 0.85 + rand() * 0.3;
  const dome = new THREE.Mesh(pick(rand, GEOMETRIES.gorse), MATERIALS.gorse);
  dome.scale.set(s, s * 0.85, s);
  dome.position.y = 0.17 * s;
  dome.rotation.y = rand() * 6;
  const skirt = new THREE.Mesh(pick(rand, GEOMETRIES.gorse), MATERIALS.gorseDry);
  skirt.scale.set(s * 0.9, s * 0.35, s * 0.9);
  skirt.position.y = 0.08;
  t.add(dome, skirt);
  for (let i = 0; i < 4; i++) dot(t, rand, MATERIALS.gorseDry, 0.03, 0, 0.17 * s, 0, 0.16 * s, 0.14 * s, 0.16 * s);
  return t;
}

// K2/K3 — Esteva e urze: montinhos baixos e fofos feitos de 3-4 almofadas encostadas.
function mound(rand, baseMat, topMat) {
  const t = new THREE.Group();
  const n = 3 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const s = 0.08 + rand() * 0.03;
    const k = s / 0.16;
    const ang = (i / n) * Math.PI * 2 + rand();
    const dist = i === 0 ? 0 : 0.05 + rand() * 0.04;
    const big = i === 0 ? 1.25 : 1;
    const m = new THREE.Mesh(pick(rand, GEOMETRIES.cushion), i === 0 ? baseMat : topMat);
    m.scale.set(k * big, k * 0.7 * big, k * big);
    m.position.set(Math.cos(ang) * dist, s * 0.6 * big, Math.sin(ang) * dist);
    m.rotation.y = rand() * 6;
    t.add(m);
  }
  return t;
}

// K4 — Acácia invasora: um maciço denso de varas com tufos verde-azeitona e penachos mais claros.
// Na vida real arde muito e volta a rebentar depois do fogo.
function acacia(rand) {
  const t = new THREE.Group();
  const h = 0.35 + rand() * 0.12;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + rand();
    stick(t, GEOMETRIES.twig, MATERIALS.oakBark, 0, 0, 0, Math.cos(ang) * 0.08, h * 0.7, Math.sin(ang) * 0.08, 1.5);
  }
  for (let i = 0; i < 6; i++) {
    const ang = (i / 5) * Math.PI * 2 + rand() * 0.8;
    const dist = i === 0 ? 0 : 0.07 + rand() * 0.05;
    const s = 0.09 + rand() * 0.04;
    const y = i === 0 ? h - s * 0.8 : h * (0.35 + rand() * 0.4);   // tufos até perto do chão
    const material = rand() < 0.3 ? MATERIALS.acaciaFeather : MATERIALS.acacia;
    clump(t, rand, material, Math.cos(ang) * dist, y, Math.sin(ang) * dist, s, s * 0.8, s);
  }
  return t;
}

// K5 — Giesta seca: um molho de varas finas a abrir para cima, com o topo fofo.
function broom(rand) {
  const t = new THREE.Group();
  const material = rand() < 0.7 ? MATERIALS.broomDry : MATERIALS.broom;
  const h = 0.36 + rand() * 0.15;
  const n = 12 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.5;
    const spread = 0.05 + rand() * 0.07;
    const len = h * (0.8 + rand() * 0.2);
    stick(t, GEOMETRIES.twig, material, Math.cos(ang) * 0.012, 0, Math.sin(ang) * 0.012,
      Math.cos(ang) * spread, len, Math.sin(ang) * spread, 1.2);
  }
  clump(t, rand, material, 0, h * 0.78, 0, 0.07, 0.15, 0.07);
  return t;
}

// K6 — Penedo de granito (os "caos de blocos" da Serra de Sintra), com manchas de líquen
// e um tufo de erva seca ao lado.
function boulder(rand) {
  const t = new THREE.Group();
  const s = 0.6 + rand() * 0.45;
  const rock = new THREE.Mesh(pick(rand, GEOMETRIES.boulders), rand() < 0.5 ? MATERIALS.granite : MATERIALS.graniteDark);
  rock.scale.set(s, s * 0.65, s * 0.85);
  rock.position.y = 0.2 * s * 0.65 * 0.7;                       // um pouco enterrado
  rock.rotation.y = rand() * 6;
  t.add(rock);
  for (let i = 0; i < 3; i++) dot(t, rand, MATERIALS.lichen, 0.035, 0, rock.position.y, 0, 0.17 * s, 0.12 * s, 0.15 * s);
  if (rand() < 0.7) clump(t, rand, MATERIALS.dryGrass, 0.15 * s + 0.04, 0.04, 0.05, 0.06, 0.05, 0.06);
  return t;
}
