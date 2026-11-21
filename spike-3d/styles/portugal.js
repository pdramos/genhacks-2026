// ESTILO "PORTUGAL" — aldeia do interior Centro (Pedrógão Grande, Figueiró dos Vinhos,
// Castanheira de Pera), a zona do grande incêndio de 17 de junho de 2017, com as Aldeias do Xisto.
// Tudo é feito aqui com formas simples (caixas, cilindros e "pedras" de 20 triângulos): sem ficheiros.
// Segue o CONTRATO descrito em basic.js (palette, buildHouse, buildSchool, buildTree, buildBush).
// A cena é de VERÃO (junho de 2017, seca): mato seco, nada de folhas de outono.
//
// Como ler este ficheiro (de cima para baixo):
//   1. Cores e cores do chão     2. Matemática avançada (não precisas de perceber isto agora)
//   3. Texturas desenhadas em código     4. Materiais     5. Geometrias partilhadas
//   6. Ajudantes (caixa, pau, telhado, janela...)     7. Casas     8. Escola
//   9. Árvores     10. Arbustos (mato)
import * as THREE from 'three';

// =====================================================================================
// 1. CORES (vêm da pesquisa: fotos e textos sobre a região)
// =====================================================================================
const COLORS = {
  // pedra e paredes
  // (as pedras usam uma textura A CORES; estes valores só "tingem" a textura: branco = sem mudança)
  schist: 0xe4e6ea, quartzite: 0xe8d8c0, quoin: 0x8c8378, lintel: 0x9a9287,
  dryStone: 0xd8d0c4, dryStoneLight: 0xf2ece4,
  lime: 0xf2efe6, render: 0xefece3, schoolWhite: 0xf3f0e8,
  paleOchre: 0xf0dca0, palePink: 0xf2d3c8,                    // casas caiadas pintadas de cor
  granite: 0xa39d92, plinth: 0x9a948a, yardEarth: 0xcdbb96,
  // telhados
  tile: 0xb4532f, tileSun: 0xcf8458, tileMoss: 0x86523c, ridge: 0x8a3a24, marseille: 0xb85a35,
  slate: 0x6a6560, slateRidge: 0x4a4745, metal: 0x7e7f7a, rust: 0x8a4b2a,
  // barras pintadas (à volta da base e das janelas)
  ochre: 0xd9a441, cobalt: 0x2f6ea5, slateGrey: 0x8d8f8e,
  // madeiras, portas, ferro, vidro
  woodDark: 0x5a3a22, doorPlank: 0x4e3420, shutterTeal: 0x3e6b66, bottleGreen: 0x2e5e3a,
  brownShutter: 0x6b3e22, balconyWood: 0x6b4a2e, iron: 0x2b2b2b, glass: 0x4a6478, hole: 0x2a2522,
  oxblood: 0x7a2e22, woodLintel: 0x4a3424, geranium: 0xc8283c,
  // casa de emigrante
  cream: 0xede0c4, salmon: 0xe8b9a0, paleYellow: 0xf1d98b, cladding: 0xc9b9a3,
  rollerBox: 0x5a4636, garage: 0x7a6a58, brick: 0xa0522d, alu: 0xdadada, concrete: 0xb8b4ac,
  // escola
  white: 0xffffff, pole: 0xd8d8d8, gold: 0xffcc00, yard: 0xc9b18a,
  // árvores
  euBark: 0xdcd5c6, euPatch: 0xa8a99a, euStrip: 0x8c7b66, euLeaf: 0x4e6b4a, euLeafLit: 0x6f8a62,
  euYoung: 0x8fa5a0, euYoung2: 0x9db3ae, stump: 0x3b332d,
  pineNeedle: 0x3f5a2e, pineNeedleLit: 0x5f7d3c, pineCone: 0x8b4a2b,
  youngPine: 0x557a35, youngTrunk: 0x8b4a2b,
  cork: 0x7d7468, corkFresh: 0xb5532e, corkAged: 0x8a4a30, corkAged2: 0xa0442a,
  oak: 0x3e5234, oakLit: 0x55684a,
  chestnutBark: 0x5a5048, chestnut: 0x5e7f35, chestnutLit: 0x74954a, catkin: 0xd9c76a,
  oliveBark: 0x6e675c, olive: 0x8a9a72, oliveLit: 0xa3ae8c,
  // mato
  gorse: 0x3f5530, gorseDry: 0x6b5a3a, gorseFlower: 0xe8c62e,
  broom: 0x5c7a3a, broomDry: 0x7a7440, broomFlower: 0xf2d22e, pod: 0x2a2620,
  heather: 0xb06a9a, heatherDry: 0x8a5a3a, treeHeathFlower: 0xede6e0,
  rockrose: 0x4a5a3a, rockroseFlower: 0xf5f2ea,   // rockrose = esteva
};

// Cores do chão. Encostas secas cor de palha no verão, rio verde-escuro.
// O aceiro (firebreak) e o terreno limpo (cleared) são as defesas do jogador, por isso
// têm de se ver bem: aceiro = terra raspada clara; limpo = restolho baixo verde-acinzentado.
export const palette = {
  grass: 0xb0a46c, brush: 0x6e6a3c, dirt: 0x8a6e52, road: 0x4a4a4c,
  cleared: 0x9aa86a, firebreak: 0xe2d5b4, water: 0x4a8f98, burned: 0x2a2522,
};

// =====================================================================================
// 2. MATEMÁTICA AVANÇADA — não precisas de perceber isto agora.
//    São ferramentas: usa-as como "caixas pretas" (sabes o que entra e o que sai).
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
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace; // imagem com cores "a sério" (bandeira, azulejo)
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
// O empurrão depende só da posição do canto, por isso a forma não abre buracos e sai sempre igual.
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

// Caixa com a textura de pedra SEMPRE do mesmo tamanho (uma chaminé fina e uma parede comprida
// mostram pedras iguais). A textura repete-se a cada STONE_TILE unidades. Guardadas em memória.
const STONE_TILE = 0.6;
const stoneBoxCache = new Map();
function stoneBoxGeometry(sx, sy, sz) {
  const key = [sx, sy, sz].map((n) => n.toFixed(4)).join(',');
  if (stoneBoxCache.has(key)) return stoneBoxCache.get(key);
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uv = geo.attributes.uv;
  // a caixa tem 6 faces de 4 cantos, por esta ordem: +x, -x, +y, -y, +z, -z
  const faceSizes = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let i = 0; i < uv.count; i++) {
    const size = faceSizes[Math.floor(i / 4)];
    uv.setXY(i, (uv.getX(i) * size[0]) / STONE_TILE, (uv.getY(i) * size[1]) / STONE_TILE);
  }
  stoneBoxCache.set(key, geo);
  return geo;
}

// Telhado/prisma em forma de "cunha": base w (ao longo de x) por d (ao longo de z), altura h.
// ridgeHalf = metade do comprimento da cumeeira. ridgeHalf = w/2 -> 2 águas (empena); menor -> 4 águas.
// uvAlong / uvDown = de quantas em quantas unidades a textura se repete (telha ou pedra).
const wedgeCache = new Map();
function wedgeGeometry(w, d, h, ridgeHalf, uvAlong = 0.8, uvDown = 0.4) {
  const key = [w, d, h, ridgeHalf, uvAlong, uvDown].map((n) => n.toFixed(4)).join(',');
  if (wedgeCache.has(key)) return wedgeCache.get(key);
  const hw = w / 2, hd = d / 2;
  const backLeft = [-hw, 0, -hd], backRight = [hw, 0, -hd];
  const frontRight = [hw, 0, hd], frontLeft = [-hw, 0, hd];
  const ridgeLeft = [-ridgeHalf, h, 0], ridgeRight = [ridgeHalf, h, 0];
  // cada linha = um triângulo, com os cantos na ordem certa para a face olhar para fora
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
    // direções "ao longo do beiral" e "a descer a água", para a textura ficar bem alinhada
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
// Uma casa tem ~25 peças; desenhar cada uma é um "pedido" à placa gráfica (draw call).
// Aqui juntamos todas as peças com o MESMO material numa só peça: a casa passa a ~8 pedidos.
// Peças com userData.keepSeparate (ex.: a bandeira, que se mexe) ficam de fora.
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();          // material -> lista de geometrias já na posição certa
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

// Um cinzento meio transparente (a = 0 invisível, 1 tapa tudo).
const grayA = (v, a) => {
  const n = Math.round(v * 255);
  return `rgba(${n},${n},${n},${a})`;
};

// Desenha um polígono fechado a partir de uma lista de cantos [[x, y], ...].
function polygon(ctx, corners, dx = 0) {
  ctx.beginPath();
  corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + dx, y) : ctx.lineTo(x + dx, y)));
  ctx.closePath();
}

// Desenha uma linha de A até B (para as arestas claras/escuras das lajes).
function line(ctx, [ax, ay], [bx, by], color, dx = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax + dx, ay);
  ctx.lineTo(bx + dx, by);
  ctx.stroke();
}

// Pedra de xisto A CORES: lajes deitadas, tortas e de tamanhos diferentes, com juntas escuras.
// Há lajes cinzentas, castanhas, cor de ferrugem e cinzento-azuladas (como o xisto a sério).
// A imagem repete-se sem se notar a costura.
const SCHIST_TONES = ['#6f655a', '#7d7062', '#8f8274', '#6a5a4a', '#a58566', '#5e5a5c'];
const stoneTex = canvasTexture(256, 256, (ctx, w, h) => {
  const r = seeded(11);
  ctx.fillStyle = '#3a322c';
  ctx.fillRect(0, 0, w, h);                                  // juntas de barro (escuras)
  const jitter = () => (r() - 0.5) * 3;                      // mexe um canto até 1.5 px
  let y = 0;
  while (y < h) {
    let rowH = 10 + Math.floor(r() * 9);                     // fiada normal: 10 a 18 px
    if (r() < 0.15) rowH = 18 + Math.floor(r() * 9);         // às vezes uma laje grossa: 18 a 26 px
    if (h - y - rowH < 10) rowH = h - y;                     // a última fiada fecha a imagem certinha
    const start = Math.floor(r() * w);
    let x = start;
    while (x < start + w) {
      const stoneW = Math.min(16 + Math.floor(r() * 65), start + w - x);   // 16 a 80 px
      const gap = 1 + Math.floor(r() * 2);                   // junta de 1 a 2 px
      const tilt = (r() - 0.5) * 4;                          // a aresta de cima fica torta (±2 px)
      const top = y + gap;
      const bottom = y + rowH - 1;
      const corners = [
        [x + gap + jitter(), top + tilt + jitter()],         // cima-esquerda
        [x + stoneW + jitter(), top - tilt + jitter()],      // cima-direita
        [x + stoneW + jitter(), bottom + jitter()],          // baixo-direita
        [x + gap + jitter(), bottom + jitter()],             // baixo-esquerda
      ];
      ctx.fillStyle = SCHIST_TONES[Math.floor(r() * SCHIST_TONES.length)];   // um tom ao calhas
      for (const dx of [0, -w]) {                            // dx = -w: a parte que dá a volta
        polygon(ctx, corners, dx);
        ctx.fill();
        line(ctx, corners[0], corners[1], 'rgba(255,240,220,0.25)', dx);   // luz na aresta de cima
        line(ctx, corners[3], corners[2], 'rgba(0,0,0,0.35)', dx);         // sombra na aresta de baixo
      }
      x += stoneW;
    }
    y += rowH;
  }
}, true);

// Cal: uma máscara cinzenta quase branca, com manchas suaves e escorridos da chuva.
// Não tem faixa de humidade em baixo, porque a imagem repete-se pela parede acima.
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
    ctx.fillRect(x, top - h, width, len);                    // a parte que dá a volta (em cima)
  }
});

// Telha de canudo: alternam "capas" (telhas viradas para cima, redondas e claras) com
// "canais" (telhas côncavas, mais escuras). Cada fila fica desencontrada meia telha.
const roofTex = canvasTexture(128, 64, (ctx, w) => {
  const r = seeded(23);
  const channel = 8;                                         // 4 px de capa + 4 px de canal
  for (let row = 0; row < 4; row++) {
    const shift = (row % 2) * (channel / 2);                 // desencontrar as filas
    for (let c = 0; c < w / channel; c++) {
      const capTone = 0.95 + r() * 0.05;
      const panTone = 0.65 + r() * 0.1;
      for (let px = 0; px < channel; px++) {
        const isCap = px < channel / 2;
        const k = px % (channel / 2);
        const round = Math.sin((Math.PI * (k + 0.5)) / (channel / 2));   // 0 nas bordas, 1 no meio
        const tone = isCap ? capTone * (0.75 + 0.25 * round) : panTone * (1 - 0.1 * round);
        ctx.fillStyle = gray(tone);
        ctx.fillRect((c * channel + px + shift) % w, row * 16, 1, 16);
      }
    }
    ctx.fillStyle = gray(0.42);
    ctx.fillRect(0, row * 16 + 14, w, 2);                    // sombra da fila de cima
  }
  ctx.fillStyle = grayA(0.55, 0.6);
  for (let i = 0; i < 4; i++) {                              // 4 manchas escorridas (sujidade, líquenes)
    const x = Math.floor(r() * w);
    ctx.fillRect(x, Math.floor(r() * 20), 1 + Math.floor(r() * 2), 20 + Math.floor(r() * 30));
  }
});

// Lousa (telhado de serra): placas escuras desencontradas, com a aresta de baixo mais clara.
const slateTex = canvasTexture(128, 64, (ctx, w, h) => {
  const r = seeded(41);
  ctx.fillStyle = gray(0.45);
  ctx.fillRect(0, 0, w, h);                                  // juntas entre placas
  const rows = Math.round(h / 10);                           // fiadas de ~10 px
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round((row * h) / rows);
    const y1 = Math.round(((row + 1) * h) / rows);
    const start = Math.floor(r() * w);
    let x = start;
    while (x < start + w) {
      const plateW = Math.min(12 + Math.floor(r() * 13), start + w - x);  // 12 a 24 px
      const tone = 0.7 + r() * 0.25;
      for (const dx of [0, -w]) {
        ctx.fillStyle = gray(tone);
        ctx.fillRect(x + dx, y0, plateW - 2, y1 - y0 - 1);    // a placa (2 px de junta ao lado)
        ctx.fillStyle = gray(1.0);
        ctx.fillRect(x + dx, y1 - 2, plateW - 2, 1);           // aresta de baixo, mais clara
      }
      x += plateW;
    }
  }
});

// Azulejo de fachada (casa de emigrante): quadradinhos de 7 px com 1 px de junta.
function claddingTex(tileColor, groutColor) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tileColor;
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) ctx.fillRect(x, y, 7, 7);
    }
  }, true);
}

// Casca do pinheiro-bravo: laranja-avermelhada com fendas escuras ao comprido.
const pineBarkTex = canvasTexture(32, 64, (ctx, w, h) => {
  const r = seeded(31);
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#5a3424';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 8 + r() * 24);
  }
}, true);

// Painel de azulejos azul e branco com um santo (ao lado da porta).
const azulejoTex = canvasTexture(32, 40, (ctx, w, h) => {
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#9fb4d8';                               // juntas entre azulejos
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = '#1f4e99';
  ctx.strokeStyle = '#1f4e99';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);                        // moldura
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(16, 12, 6, 0, Math.PI * 2); ctx.stroke();      // auréola
  ctx.beginPath(); ctx.arc(16, 12, 3.5, 0, Math.PI * 2); ctx.fill();      // cabeça
  ctx.beginPath();                                                         // manto
  ctx.moveTo(11, 17); ctx.lineTo(21, 17); ctx.lineTo(24, 35); ctx.lineTo(8, 35);
  ctx.fill();
}, true);

// Placa da escola.
const plaqueTex = canvasTexture(256, 64, (ctx, w, h) => {
  ctx.fillStyle = '#c9c2b5';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8b857b';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = '#3a332c';
  ctx.font = 'bold 30px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESCOLA PRIMÁRIA', w / 2, h / 2 + 2, w - 24);   // o último número impede o texto de sair
}, true);

// Bandeira de Portugal: 2/5 verde, 3/5 vermelho, esfera armilar amarela e escudo na divisão.
const flagTex = canvasTexture(120, 80, (ctx, w, h) => {
  const split = w * 0.4;
  ctx.fillStyle = '#006600'; ctx.fillRect(0, 0, split, h);
  ctx.fillStyle = '#ff0000'; ctx.fillRect(split, 0, w - split, h);
  ctx.strokeStyle = '#ffcc00';                                // esfera armilar
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(split, h / 2, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(split, h / 2, 17, 6, 0.3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ff0000'; ctx.fillRect(split - 9, h / 2 - 11, 18, 21);   // escudo: borda vermelha
  ctx.fillStyle = '#ffffff'; ctx.fillRect(split - 6, h / 2 - 8, 12, 15);    // fundo branco
  ctx.fillStyle = '#003399';                                                 // cinco quinas azuis
  for (const [dx, dy] of [[0, -4], [-3, 0], [0, 0], [3, 0], [0, 4]]) {
    ctx.fillRect(split + dx - 1, h / 2 + dy - 1.5, 2, 3);
  }
}, true);

// =====================================================================================
// 4. MATERIAIS (criados uma vez e partilhados por todas as casas e árvores)
// =====================================================================================
const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });

// Pedra: a textura já tem as cores; a cor do material só a "tinge" (branco = cores originais).
// userData.stone = true avisa o ajudante box() para usar pedras sempre do mesmo tamanho.
function stoneMat(tint) {
  const m = mat(tint, { map: stoneTex, roughness: 0.95 });
  m.userData.stone = true;
  return m;
}
// Parede caiada ou pintada: a textura de cal (cinzenta) escurece um bocadinho, por isso
// clareamos a cor 6%. Também usa userData.stone para as manchas terem sempre o mesmo tamanho.
function limeMat(color) {
  const m = mat(new THREE.Color(color).multiplyScalar(1.06), { map: limewashTex });
  m.userData.stone = true;
  return m;
}
// Fachada de azulejo (casa de emigrante): brilha um pouco, como o azulejo verdadeiro.
function claddingMat(tileColor, groutColor) {
  const m = mat(0xffffff, { map: claddingTex(tileColor, groutColor), roughness: 0.35 });
  m.userData.stone = true;
  return m;
}
const roofMat = (color) => mat(new THREE.Color(color).multiplyScalar(1.25), { map: roofTex });

const MATERIALS = {
  // pedra e paredes
  schist: stoneMat(COLORS.schist), quartzite: stoneMat(COLORS.quartzite),
  dryStone: stoneMat(COLORS.dryStone), dryStoneLight: stoneMat(COLORS.dryStoneLight),
  quoin: mat(COLORS.quoin), lintel: mat(COLORS.lintel), woodLintel: mat(COLORS.woodLintel),
  lime: limeMat(COLORS.lime), render: limeMat(COLORS.render), schoolWhite: limeMat(COLORS.schoolWhite),
  paleOchre: limeMat(COLORS.paleOchre), palePink: limeMat(COLORS.palePink),
  granite: mat(COLORS.granite), plinth: mat(COLORS.plinth), yardEarth: mat(COLORS.yardEarth),
  // telhados
  tile: roofMat(COLORS.tile), tileSun: roofMat(COLORS.tileSun), tileMoss: roofMat(COLORS.tileMoss),
  marseille: roofMat(COLORS.marseille), slate: mat(COLORS.slate, { map: slateTex }),
  metal: roofMat(COLORS.metal), rust: roofMat(COLORS.rust),
  ridge: mat(COLORS.ridge), slateRidge: mat(COLORS.slateRidge),
  // barras, madeiras, ferro, vidro
  ochre: mat(COLORS.ochre), cobalt: mat(COLORS.cobalt), slateGrey: mat(COLORS.slateGrey),
  woodDark: mat(COLORS.woodDark), doorPlank: mat(COLORS.doorPlank), shutterTeal: mat(COLORS.shutterTeal),
  bottleGreen: mat(COLORS.bottleGreen), brownShutter: mat(COLORS.brownShutter),
  balconyWood: mat(COLORS.balconyWood), oxblood: mat(COLORS.oxblood),
  iron: mat(COLORS.iron, { roughness: 0.6, metalness: 0.4 }),
  glass: mat(COLORS.glass, { roughness: 0.15, metalness: 0.1 }),   // reflete o céu
  hole: mat(COLORS.hole),
  geranium: mat(COLORS.geranium),
  // casa de emigrante
  cream: limeMat(COLORS.cream), salmon: limeMat(COLORS.salmon), paleYellow: limeMat(COLORS.paleYellow),
  claddingBeige: claddingMat('#d8cbb5', '#b8a088'), claddingBlue: claddingMat('#e8eef5', '#6a8fc0'),
  rollerBox: mat(COLORS.rollerBox), garage: mat(COLORS.garage),
  brick: mat(COLORS.brick), alu: mat(COLORS.alu, { metalness: 0.3 }), concrete: mat(COLORS.concrete),
  // escola
  white: mat(COLORS.white), pole: mat(COLORS.pole, { metalness: 0.3 }),
  gold: mat(COLORS.gold, { metalness: 0.5 }), yard: mat(COLORS.yard),
  azulejo: mat(0xffffff, { map: azulejoTex, roughness: 0.4 }),
  plaque: mat(0xffffff, { map: plaqueTex }),
  flag: mat(0xffffff, { map: flagTex, side: THREE.DoubleSide }),
  // árvores
  euBark: mat(COLORS.euBark), euPatch: mat(COLORS.euPatch),
  euStrip: mat(COLORS.euStrip, { side: THREE.DoubleSide }),
  euLeaf: mat(COLORS.euLeaf), euLeafLit: mat(COLORS.euLeafLit),
  euYoung: mat(COLORS.euYoung), euYoung2: mat(COLORS.euYoung2), stump: mat(COLORS.stump),
  pineBark: mat(0xffffff, { map: pineBarkTex }),
  pineNeedle: mat(COLORS.pineNeedle), pineNeedleLit: mat(COLORS.pineNeedleLit),
  pineCone: mat(COLORS.pineCone), youngPine: mat(COLORS.youngPine), youngTrunk: mat(COLORS.youngTrunk),
  cork: mat(COLORS.cork), corkFresh: mat(COLORS.corkFresh),
  corkAged: mat(COLORS.corkAged), corkAged2: mat(COLORS.corkAged2),
  oak: mat(COLORS.oak), oakLit: mat(COLORS.oakLit),
  chestnutBark: mat(COLORS.chestnutBark), chestnut: mat(COLORS.chestnut),
  chestnutLit: mat(COLORS.chestnutLit), catkin: mat(COLORS.catkin),
  oliveBark: mat(COLORS.oliveBark), olive: mat(COLORS.olive), oliveLit: mat(COLORS.oliveLit),
  // mato
  gorse: mat(COLORS.gorse), gorseDry: mat(COLORS.gorseDry), gorseFlower: mat(COLORS.gorseFlower),
  broom: mat(COLORS.broom), broomDry: mat(COLORS.broomDry), broomFlower: mat(COLORS.broomFlower),
  pod: mat(COLORS.pod),
  heather: mat(COLORS.heather), heatherDry: mat(COLORS.heatherDry),
  treeHeathFlower: mat(COLORS.treeHeathFlower),
  rockrose: mat(COLORS.rockrose), rockroseFlower: mat(COLORS.rockroseFlower),
};

// =====================================================================================
// 5. GEOMETRIAS PARTILHADAS
// =====================================================================================
// Uma caixa de 1x1x1: cada parede, janela ou porta é esta caixa "esticada" com .scale.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

const GEOMETRIES = {
  clumps: [jagged(1, 0, 0.45, 1), jagged(1, 0, 0.45, 2), jagged(1, 0, 0.45, 3)], // copas (raio 1)
  gorse: [jagged(0.17, 1, 0.75, 7), jagged(0.17, 1, 0.75, 8)],                     // tojo espinhoso
  cushion: [jagged(0.16, 1, 0.35, 9), jagged(0.16, 1, 0.35, 10)],                  // almofadas de urze
  // troncos e paus com 1 de altura (o ajudante stick() estica-os até ao comprimento certo)
  euTrunk: new THREE.CylinderGeometry(0.022, 0.036, 1, 5, 1, true),
  euStrip: new THREE.PlaneGeometry(0.014, 0.12),
  twig: new THREE.CylinderGeometry(0.006, 0.01, 1, 3, 1, true),
  pineTrunk: new THREE.CylinderGeometry(0.03, 0.045, 1, 6, 1, true),
  youngTrunk: new THREE.CylinderGeometry(0.02, 0.028, 1, 5, 1, true),
  stump: new THREE.CylinderGeometry(0.05, 0.06, 0.08, 6),
  oakTrunk: new THREE.CylinderGeometry(0.06, 0.075, 1, 6, 1, true),
  limb: new THREE.CylinderGeometry(0.025, 0.04, 1, 5, 1, true),
  chestnutTrunk: new THREE.CylinderGeometry(0.08, 0.11, 1, 6, 1, true),
  oliveTrunk: new THREE.CylinderGeometry(0.022, 0.038, 1, 5, 1, true),
  flagPole: new THREE.CylinderGeometry(0.008, 0.011, 1, 6),
  // pormenores à volta das casas
  vase: new THREE.CylinderGeometry(0.022, 0.016, 0.04, 6),          // vaso de barro
  geranium: new THREE.IcosahedronGeometry(0.014, 0),                // flor de sardinheira
  log: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 5).rotateX(Math.PI / 2),   // lenha, deitada ao longo de z
  finial: new THREE.SphereGeometry(0.015, 6, 4),                    // bola dourada do portão
  // sombra suave no chão debaixo da casa: um quadrado deitado
  contactShadow: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};

// Sombra de contacto: uma mancha escura no meio que desaparece nas bordas.
// Faz a casa "assentar" no chão em vez de parecer que flutua.
const contactShadowTex = canvasTexture(64, 64, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});
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
// Se o material for de pedra, usa uma caixa própria para as pedras não ficarem esticadas.
function box(parent, material, sx, sy, sz, x, y, z) {
  let m;
  if (material.userData.stone) {
    m = new THREE.Mesh(stoneBoxGeometry(sx, sy, sz), material);
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

// Um pontinho colorido (flor, vagem) na superfície de uma "bola" com centro (cx,cy,cz) e raios (rx,ry,rz).
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
//   peitoril por baixo (só janelas); cruz de caixilhos (só vidro); portadas abertas
//   (opts.openShutters); verga por cima (opts.lintel); grade de ferro (opts.grille).
//   Portas (opts.door): uma frincha ao meio (porta de 2 folhas) e uma soleira de granito.
function opening(g, wall, face, along, y, w, h, fill, opts = {}) {
  const f = opts.frame ? (opts.frameSize ?? 0.02) : 0;
  if (opts.frame) {
    onWall(g, wall, face, along, y + (h / 2 + f / 2), w + 2 * f, f, 0.022, opts.frame);   // cima
    onWall(g, wall, face, along, y - (h / 2 + f / 2), w + 2 * f, f, 0.022, opts.frame);   // baixo
    onWall(g, wall, face, along - (w / 2 + f / 2), y, f, h, 0.022, opts.frame);           // esquerda
    onWall(g, wall, face, along + (w / 2 + f / 2), y, f, h, 0.022, opts.frame);           // direita
  }
  onWall(g, wall, face, along, y, w, h, opts.frame ? 0.006 : 0.016, fill);
  const isGlass = fill === MATERIALS.glass;
  if (!opts.door) {
    // peitoril: uma laje que sai da parede por baixo da janela
    const sill = opts.sill ?? opts.frame ?? MATERIALS.granite;
    onWall(g, wall, face, along, y - h / 2 - 0.012, w + 0.04, 0.014, 0.035, sill);
  }
  if (isGlass) {
    // cruz de caixilhos a dividir o vidro em 4
    const bars = opts.frame ?? MATERIALS.white;
    onWall(g, wall, face, along, y, 0.007, h, 0.02, bars);
    onWall(g, wall, face, along, y, w, 0.007, 0.02, bars);
  }
  if (opts.openShutters && isGlass && shuttersFit(wall, face, along, w, f)) {
    // 2 portadas abertas, encostadas à parede de cada lado da janela
    for (const side of [-1, 1]) {
      const leafAlong = along + side * (w / 2 + w / 4 + f + 0.004);
      onWall(g, wall, face, leafAlong, y, w / 2, h, 0.012, opts.openShutters);
    }
  }
  if (opts.door) {
    onWall(g, wall, face, along, y, 0.004, h * 0.9, 0.02, MATERIALS.hole);               // frincha
    const bottom = y - h / 2;
    if (bottom < 0.05) {                                                                  // só portas do rés-do-chão
      onWall(g, wall, face, along, bottom + 0.01, w + 0.04, 0.02, 0.04, MATERIALS.granite);   // soleira
    }
  }
  if (opts.lintel) onWall(g, wall, face, along, y + h / 2 + 0.018, w + 0.05, 0.03, 0.02, opts.lintel);
  if (opts.grille) onWall(g, wall, face, along, y, 0.012, h, 0.022, opts.grille);
}

// As portadas abertas cabem na parede? (não podem passar da esquina da casa)
function shuttersFit(wall, face, along, w, f) {
  const halfWall = (face === 'front' || face === 'back' ? wall.w : wall.d) / 2;
  return Math.abs(along) + w + f + 0.004 <= halfWall - 0.005;
}

// Paredes = uma caixa só.
function walls(g, wall, height, material) {
  return box(g, material, wall.w, height, wall.d, 0, height / 2, 0);
}

// Cunhais: pedras mais claras nos 4 cantos da casa.
function quoins(g, wall, height, material, size) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (wall.w / 2 - size / 2 + 0.005);
      const z = sz * (wall.d / 2 - size / 2 + 0.005);
      box(g, material, size, height, size, x, height / 2, z);
    }
  }
}

// Telhado de 2 águas: um triângulo de parede em cada ponta (empena) + duas lajes inclinadas
// cobertas de telha + a cumeeira. A cumeeira fica ao longo de x.
// Devolve { eave, surfaceY(x, z) } para saber a que altura está o telhado (útil para a chaminé).
function gableRoof(g, wall, eave, pitchDeg, overhang, roofMaterial, gableMaterial, ridgeMaterial) {
  const a = THREE.MathUtils.degToRad(pitchDeg);
  const rise = (wall.d / 2) * Math.tan(a);              // altura do triângulo da empena
  // se a empena for de pedra, a textura repete-se ao mesmo ritmo que nas paredes
  const tile = gableMaterial.userData.stone ? STONE_TILE : 0.8;
  const gableGeo = wedgeGeometry(wall.w, wall.d, rise, wall.w / 2, tile, tile);
  const gable = new THREE.Mesh(gableGeo, gableMaterial);
  gable.position.y = eave;
  g.add(gable);
  const thick = 0.04;
  const run = wall.d / 2 + overhang;                     // distância na horizontal da cumeeira ao beiral
  const L = run / Math.cos(a);                           // comprimento da água (a descer)
  const len = wall.w + 2 * overhang;
  for (const side of [1, -1]) {                          // side 1 = água da frente, -1 = água de trás
    const y = eave + rise - (L / 2) * Math.sin(a) + (thick / 2) * Math.cos(a);
    const z = side * ((L / 2) * Math.cos(a) + (thick / 2) * Math.sin(a));
    const slab = box(g, roofMaterial, len, thick, L, 0, y, z);
    slab.rotation.x = side * a;
    // beirado: a faixa branca de cal mesmo por baixo da ponta do telhado
    const eaveY = eave - overhang * Math.tan(a) - 0.012;
    box(g, MATERIALS.lime, len, 0.025, 0.03, 0, eaveY, side * (wall.d / 2 + overhang - 0.012));
  }
  box(g, ridgeMaterial, len, 0.045, 0.07, 0, eave + rise + thick * 0.8, 0);
  const surfaceY = (x, z) => eave + rise * (1 - Math.abs(z) / (wall.d / 2)) + thick / Math.cos(a);
  return { eave, surfaceY };
}

// Telhado de 4 águas: uma cunha maciça com beiral à volta.
function hipRoof(g, wall, eave, pitchDeg, overhang, roofMaterial, ridgeMaterial) {
  const run = wall.d / 2 + overhang;
  const h = run * Math.tan(THREE.MathUtils.degToRad(pitchDeg));
  const r = Math.max(0, (wall.w - wall.d) / 2);         // metade da cumeeira
  const roof = new THREE.Mesh(wedgeGeometry(wall.w + 2 * overhang, wall.d + 2 * overhang, h, r), roofMaterial);
  roof.position.y = eave;
  g.add(roof);
  if (r > 0) box(g, ridgeMaterial, 2 * r + 0.03, 0.025, 0.035, 0, eave + h, 0);
  // faixa branca (beirado) à volta, logo por baixo da ponta do telhado
  const o = overhang, fasciaY = eave - 0.015;
  for (const s of [-1, 1]) {
    box(g, MATERIALS.lime, wall.w + 2 * o, 0.03, 0.02, 0, fasciaY, s * (wall.d / 2 + o - 0.01));
    box(g, MATERIALS.lime, 0.02, 0.03, wall.d + 2 * o, s * (wall.w / 2 + o - 0.01), fasciaY, 0);
  }
  const surfaceY = (x, z) => eave + h * (1 - Math.max(Math.abs(z), Math.abs(x) - r) / run);
  return { eave, surfaceY };
}

// Chaminé que nasce dentro do telhado e sai `above` acima dele.
// cap: 'slab' (laje de pedra), 'hat' (duas telhas encostadas, o "chapéu" português) ou nada.
function chimney(g, roof, x, z, size, above, bodyMaterial, cap, capMaterial) {
  const top = roof.surfaceY(x, z) + above;
  const bottom = roof.eave - 0.02;
  box(g, bodyMaterial, size, top - bottom, size, x, (top + bottom) / 2, z);
  if (cap === 'slab') box(g, capMaterial, size + 0.035, 0.02, size + 0.035, x, top + 0.01, z);
  if (cap === 'hat') {
    for (const side of [1, -1]) {
      const t = box(g, capMaterial, size + 0.03, 0.012, 0.055, x, top + 0.022, z + side * 0.017);
      t.rotation.x = side * 0.75;
    }
  }
}

// Socalco: muro baixo de pedra seca, feito de 3 troços com alturas e tons um pouco diferentes,
// levemente inclinado para trás (como os muros a sério, que seguram a terra).
function terraceWall(g, rand, length, z) {
  const pieces = 3;
  const pieceLen = length / pieces;
  for (let i = 0; i < pieces; i++) {
    const h = 0.1 + rand() * 0.03;
    const material = i % 2 === 0 ? MATERIALS.dryStoneLight : MATERIALS.dryStone;
    const x = -length / 2 + pieceLen * (i + 0.5);
    const piece = box(g, material, pieceLen + 0.004, h, 0.09, x, h / 2, z);
    piece.rotation.x = Math.sign(z) * 0.08;
  }
}

// =====================================================================================
// 7. CASAS
// =====================================================================================
export function buildHouse(rand) {
  const r = rand();
  let house;
  if (r < 0.3) house = schistCottage(rand);          // casa de xisto (Aldeias do Xisto)
  else if (r < 0.55) house = bandedHouse(rand);      // casa caiada com barra colorida
  else if (r < 0.73) house = graniteTrimHouse(rand); // casa rebocada com cantaria de granito
  else if (r < 0.9) house = emigrantHouse(rand);     // casa de emigrante (anos 70-90)
  else house = ruinedShed(rand);                     // palheiro abandonado
  groundHouse(house, house.userData.lot);
  mergeByMaterial(house);
  house.rotation.y = Math.floor(rand() * 4) * (Math.PI / 2);
  return shadows(house);
}

// "Assenta" a casa no chão: um quintal de terra batida, um caminho de lajes até à porta
// e uma sombra suave por baixo. lot = { w, d, doorX, frontZ } (e noPath = sem caminho).
function groundHouse(house, lot) {
  box(house, MATERIALS.yardEarth, 0.84, 0.012, 0.84, 0, 0.006, 0);         // terra batida
  if (!lot.noPath) {
    for (const dz of [0.07, 0.17, 0.27]) {                                  // lajes de granito
      const z = lot.frontZ + dz;
      if (z <= 0.42) box(house, MATERIALS.granite, 0.1, 0.01, 0.08, lot.doorX, 0.015, z);
    }
  }
  const shadow = new THREE.Mesh(GEOMETRIES.contactShadow, contactShadowMat);
  shadow.position.y = 0.014;
  shadow.scale.set(lot.w + 0.2, 1, lot.d + 0.2);
  shadow.renderOrder = 1;                       // desenhada depois do chão
  shadow.userData.keepSeparate = true;          // não juntar com as outras peças
  shadow.userData.noShadow = true;              // uma sombra não faz sombra
  house.add(shadow);
}

// Pormenores à volta da casa (também mostram que há "combustível" junto às casas: a lenha!).
// Escolhe 2 coisas diferentes ao calhas. O estendal só aparece se não houver socalco atrás.
function props(g, rand, lot) {
  const choices = ['vases', 'woodpile', 'bench'];
  if (!lot.terrace) choices.push('laundry');
  for (let i = 0; i < 2; i++) {
    const index = Math.floor(rand() * choices.length);
    const choice = choices.splice(index, 1)[0];       // tira-a da lista: não se repete
    if (choice === 'vases') vases(g, lot);
    if (choice === 'woodpile') woodpile(g, lot);
    if (choice === 'bench') stoneBench(g, lot);
    if (choice === 'laundry') laundryLine(g, lot);
  }
}

// Um objeto com geometria própria (vaso, flor, lenha...) no ponto (x, y, z).
function place(g, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// 2 vasos de barro com sardinheiras vermelhas, um de cada lado da porta.
function vases(g, lot) {
  for (const side of [-1, 1]) {
    const x = lot.doorX + side * 0.13;
    const z = lot.frontZ + 0.03;
    place(g, GEOMETRIES.vase, MATERIALS.tile, x, 0.02, z);
    place(g, GEOMETRIES.geranium, MATERIALS.geranium, x - 0.007, 0.047, z);
    place(g, GEOMETRIES.geranium, MATERIALS.geranium, x + 0.008, 0.05, z + 0.004);
  }
}

// Monte de lenha encostado à parede da esquerda: 3 camadas de troncos deitados.
// Só pomos os troncos que cabem entre a parede e a borda do quadrado.
function woodpile(g, lot) {
  const outer = Math.max(-(lot.w / 2 + 0.03), -0.43);   // tronco mais afastado da parede
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 4 - layer; i++) {               // em cima há menos troncos (monte)
      const x = outer + i * 0.028;
      if (x + 0.014 > -lot.w / 2) break;                 // já ia entrar na parede
      place(g, GEOMETRIES.log, MATERIALS.woodDark, x, 0.026 + layer * 0.025, 0.05);
    }
  }
}

// Banco de pedra ao lado da porta (assento de granito em 2 pés).
function stoneBench(g, lot) {
  let x = lot.doorX + 0.23;
  if (x > 0.3) x = lot.doorX - 0.23;                     // não cabe à direita: vai para a esquerda
  const z = lot.frontZ + 0.035;
  box(g, MATERIALS.granite, 0.14, 0.025, 0.04, x, 0.045, z);
  for (const dx of [-0.05, 0.05]) box(g, MATERIALS.granite, 0.02, 0.035, 0.035, x + dx, 0.0175, z);
}

// Estendal atrás da casa: 2 postes, um fio e 3 peças de roupa.
function laundryLine(g, lot) {
  const z = -(lot.d / 2 + 0.08);
  for (const x of [-0.22, 0.22]) box(g, MATERIALS.woodDark, 0.01, 0.25, 0.01, x, 0.125, z);
  box(g, MATERIALS.iron, 0.44, 0.003, 0.003, 0, 0.24, z);
  const clothes = [MATERIALS.white, MATERIALS.cobalt, MATERIALS.salmon];
  clothes.forEach((cloth, i) => box(g, cloth, 0.04, 0.05, 0.004, -0.1 + i * 0.1, 0.21, z));
}

// H1 — Casa de xisto: pedra escura à vista, janelas pequeninas, escada de pedra por fora.
function schistCottage(rand) {
  const g = new THREE.Group();
  const tall = rand() < 0.45;                         // 2 pisos (encostada à ladeira) ou 1 piso + sótão
  const mountain = rand() < 0.25;                     // aldeia de serra (Talasnal): telhado de lousa
  const stone = rand() < 0.75 ? MATERIALS.schist : MATERIALS.quartzite;
  const wall = { w: 0.7, d: 0.55 };
  const eave = tall ? 0.85 : 0.6;
  walls(g, wall, eave, stone);
  const roofMaterial = mountain
    ? MATERIALS.slate
    : pick(rand, [MATERIALS.tile, MATERIALS.tileSun, MATERIALS.tileMoss]);
  const ridge = mountain ? MATERIALS.slateRidge : MATERIALS.ridge;
  const overhang = Math.min(0.07, (0.9 - wall.w) / 2);           // o telhado nunca passa de 0.9
  const roof = gableRoof(g, wall, eave, mountain ? 22 : 25, overhang, roofMaterial, stone, ridge);
  const shutter = pick(rand, [MATERIALS.woodDark, MATERIALS.shutterTeal]);
  const door = pick(rand, [MATERIALS.doorPlank, MATERIALS.oxblood, MATERIALS.cobalt, MATERIALS.bottleGreen]);
  // verga de madeira escura por cima e peitoril de pedra clara por baixo
  const small = { lintel: MATERIALS.woodLintel, sill: MATERIALS.dryStoneLight };
  const doorOpts = { ...small, door: true };
  let doorX;

  if (tall) {
    outsideStair(g, wall, stone);
    opening(g, wall, 'front', -0.04, 0.525, 0.14, 0.24, door, doorOpts);              // porta de cima
    opening(g, wall, 'front', 0.2, 0.13, 0.14, 0.26, MATERIALS.doorPlank, doorOpts);  // loja/curral
    opening(g, wall, 'front', 0.2, 0.62, 0.1, 0.12, shutter, small);
    opening(g, wall, 'back', 0, 0.62, 0.1, 0.12, shutter, small);
    opening(g, wall, 'right', 0, 0.62, 0.1, 0.12, shutter, small);
    opening(g, wall, 'left', 0, 0.62, 0.1, 0.12, shutter, small);
    doorX = 0.2;
  } else {
    quoins(g, wall, eave, MATERIALS.quoin, 0.05);
    const sideWindow = rand() < 0.5 ? MATERIALS.glass : shutter;
    const openShutters = rand() < 0.4 ? shutter : null;          // portadas abertas (só se for vidro)
    opening(g, wall, 'front', -0.12, 0.13, 0.14, 0.26, door, doorOpts);
    opening(g, wall, 'front', 0.16, 0.36, 0.1, 0.12, shutter, small);
    opening(g, wall, 'back', 0.1, 0.36, 0.1, 0.12, shutter, small);
    opening(g, wall, 'right', 0, 0.38, 0.1, 0.12, sideWindow, { ...small, openShutters });
    opening(g, wall, 'left', 0, 0.38, 0.1, 0.12, shutter, small);
    doorX = -0.12;
  }
  const side = rand() < 0.5 ? 1 : -1;
  if (mountain) chimney(g, roof, side * 0.22, -0.1, 0.08, 0.12, stone, 'slab', MATERIALS.slate);
  else chimney(g, roof, side * 0.22, -0.1, 0.08, 0.12, stone, 'hat', MATERIALS.tile);
  const terrace = rand() < 0.5;
  if (terrace) terraceWall(g, rand, 0.84, -0.4);
  g.userData.lot = { w: wall.w, d: wall.d, doorX, frontZ: wall.d / 2, terrace };
  props(g, rand, g.userData.lot);
  return g;
}

// Escada de pedra encostada à fachada (5 degraus) até uma varanda de madeira e à porta de cima.
function outsideStair(g, wall, stone) {
  const front = wall.d / 2 + 0.06;                    // os degraus têm 0.12 de fundo
  for (let i = 0; i < 5; i++) {
    const h = (i + 1) * 0.078;                        // cada degrau sobe 0.078
    box(g, stone, 0.05, h, 0.12, -0.33 + i * 0.05, h / 2, front);
  }
  const edge = wall.d / 2 + 0.125;                                                        // borda da varanda
  box(g, MATERIALS.balconyWood, 0.16, 0.03, 0.13, -0.03, 0.375, wall.d / 2 + 0.065);    // estrado
  box(g, MATERIALS.balconyWood, 0.16, 0.012, 0.012, -0.03, 0.47, edge);                  // corrimão
  for (const x of [-0.09, -0.05, -0.01, 0.03]) {                                         // balaústres
    box(g, MATERIALS.balconyWood, 0.008, 0.07, 0.008, x, 0.425, edge);
  }
  for (const x of [-0.08, 0.04]) {                                                       // pilares
    box(g, MATERIALS.balconyWood, 0.025, 0.36, 0.025, x, 0.18, wall.d / 2 + 0.115);
  }
}

// H2 — Casa caiada de branco com barra pintada (ocre, azul ou cinzento) e molduras da mesma cor.
function bandedHouse(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.8, d: 0.6 };
  const eave = 0.75;
  // 1 em cada 4 casas é pintada (ocre clarinho ou rosa) com a barra branca; as outras são caiadas
  const painted = rand() < 0.25;
  let wallMaterial = MATERIALS.lime;
  let band;
  if (painted) {
    wallMaterial = rand() < 0.5 ? MATERIALS.paleOchre : MATERIALS.palePink;
    band = MATERIALS.white;
  } else {
    band = pick(rand, [MATERIALS.ochre, MATERIALS.cobalt, MATERIALS.slateGrey]);
  }
  const shutter = pick(rand, [MATERIALS.bottleGreen, MATERIALS.brownShutter]);
  const door = pick(rand, [MATERIALS.woodDark, MATERIALS.bottleGreen, MATERIALS.oxblood, MATERIALS.cobalt]);
  walls(g, wall, eave, wallMaterial);
  box(g, band, wall.w + 0.008, 0.08, wall.d + 0.008, 0, 0.04, 0);   // a barra à volta da base
  const roofMaterial = pick(rand, [MATERIALS.tile, MATERIALS.tileSun, MATERIALS.tileMoss]);
  const roof = hipRoof(g, wall, eave, 22, Math.min(0.07, (0.9 - wall.w) / 2), roofMaterial, MATERIALS.ridge);
  const framed = { frame: band, frameSize: 0.02 };
  // às vezes as portadas das janelas de vidro estão abertas, encostadas à parede
  const openShutters = rand() < 0.4 ? shutter : null;
  const framedOpen = { ...framed, openShutters };
  // janelas: umas com a portada fechada (por causa do calor), outras com o vidro à vista
  const fill = () => (rand() < 0.55 ? shutter : MATERIALS.glass);

  opening(g, wall, 'front', 0, 0.14, 0.14, 0.28, door, { ...framed, door: true });
  opening(g, wall, 'front', -0.24, 0.24, 0.13, 0.18, fill(), framedOpen);
  opening(g, wall, 'front', 0.24, 0.24, 0.13, 0.18, fill(), framedOpen);
  const balcony = rand() < 0.5;
  opening(g, wall, 'front', -0.24, 0.56, 0.13, 0.18, fill(), framedOpen);
  opening(g, wall, 'front', 0.24, 0.56, 0.13, 0.18, fill(), framedOpen);
  if (balcony) {
    // porta-janela com varandim de ferro por cima da porta
    opening(g, wall, 'front', 0, 0.54, 0.13, 0.24, shutter, framed);
    box(g, MATERIALS.iron, 0.2, 0.015, 0.06, 0, 0.415, wall.d / 2 + 0.03);
    box(g, MATERIALS.iron, 0.2, 0.07, 0.008, 0, 0.46, wall.d / 2 + 0.058);
  } else {
    // a janela do meio fica sem portadas abertas: não haveria espaço entre as janelas
    opening(g, wall, 'front', 0, 0.56, 0.13, 0.18, fill(), framed);
  }
  opening(g, wall, 'back', -0.2, 0.56, 0.13, 0.18, fill(), framed);
  opening(g, wall, 'back', 0.2, 0.56, 0.13, 0.18, fill(), framed);
  opening(g, wall, 'back', 0.25, 0.14, 0.12, 0.26, door, { ...framed, door: true });   // porta das traseiras
  opening(g, wall, 'right', 0, 0.56, 0.13, 0.18, fill(), framedOpen);
  opening(g, wall, 'left', 0, 0.56, 0.13, 0.18, fill(), framedOpen);
  const chimneyX = (rand() < 0.5 ? 1 : -1) * 0.1;
  chimney(g, roof, chimneyX, -0.12, 0.07, 0.16, wallMaterial, 'hat', MATERIALS.tile);
  const terrace = rand() < 0.4;
  if (terrace) terraceWall(g, rand, 0.84, -0.4);
  g.userData.lot = { w: wall.w, d: wall.d, doorX: 0, frontZ: wall.d / 2, terrace };
  props(g, rand, g.userData.lot);
  return g;
}

// H3 — Casa rebocada a branco com cantaria de granito (como em Pedrógão Pequeno),
// com painel de azulejos de um santo ao lado da porta.
function graniteTrimHouse(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.75, d: 0.55 };
  const eave = 0.7;
  walls(g, wall, eave, MATERIALS.render);
  quoins(g, wall, eave, MATERIALS.granite, 0.04);
  box(g, MATERIALS.plinth, wall.w + 0.008, 0.05, wall.d + 0.008, 0, 0.025, 0);   // soco de granito
  const roofMaterial = pick(rand, [MATERIALS.tile, MATERIALS.tileSun, MATERIALS.tileMoss]);
  const overhang = Math.min(0.07, (0.9 - wall.w) / 2);
  const roof = gableRoof(g, wall, eave, 25, overhang, roofMaterial, MATERIALS.render, MATERIALS.ridge);
  const shutter = rand() < 0.5 ? MATERIALS.brownShutter : MATERIALS.glass;
  const openShutters = rand() < 0.4 ? MATERIALS.brownShutter : null;
  const stone = { frame: MATERIALS.granite, frameSize: 0.03, openShutters };
  const withGrille = { frame: MATERIALS.granite, frameSize: 0.03, grille: MATERIALS.iron };

  opening(g, wall, 'front', -0.2, 0.15, 0.14, 0.3, MATERIALS.brownShutter, { ...stone, door: true });   // porta
  onWall(g, wall, 'front', 0, 0.32, 0.12, 0.16, 0.012, MATERIALS.azulejo);            // azulejos
  opening(g, wall, 'front', 0.22, 0.24, 0.13, 0.17, MATERIALS.glass, withGrille);
  opening(g, wall, 'front', -0.2, 0.51, 0.13, 0.17, shutter, stone);
  opening(g, wall, 'front', 0.22, 0.51, 0.13, 0.17, shutter, stone);
  opening(g, wall, 'back', 0.1, 0.51, 0.13, 0.17, MATERIALS.glass, stone);
  opening(g, wall, 'back', -0.15, 0.24, 0.13, 0.17, MATERIALS.glass, stone);
  opening(g, wall, 'left', 0, 0.51, 0.13, 0.17, shutter, stone);
  opening(g, wall, 'right', 0, 0.51, 0.13, 0.17, shutter, stone);
  if (rand() < 0.5) chimney(g, roof, 0.2, -0.1, 0.07, 0.14, MATERIALS.render, 'hat', MATERIALS.tile);
  g.userData.lot = { w: wall.w, d: wall.d, doorX: -0.2, frontZ: wall.d / 2, terrace: false };
  props(g, rand, g.userData.lot);
  return g;
}

// H4 — Casa de emigrante: 2 pisos, cor pastel, rés-do-chão forrado a azulejo/pedra,
// varanda corrida com grade de alumínio, caixas de estore castanhas e porta de garagem.
// Paredes 0.8 + beiral 0.05 de cada lado = telhado com 0.9 (o máximo de um quadrado).
function emigrantHouse(rand) {
  const g = new THREE.Group();
  const wall = { w: 0.8, d: 0.62 };
  const eave = 0.8;
  walls(g, wall, eave, pick(rand, [MATERIALS.cream, MATERIALS.salmon, MATERIALS.paleYellow]));
  const clad = { w: wall.w + 0.012, d: wall.d + 0.012 };       // rés-do-chão forrado a azulejo
  const cladding = rand() < 0.3 ? MATERIALS.claddingBlue : MATERIALS.claddingBeige;
  box(g, cladding, clad.w, 0.38, clad.d, 0, 0.19, 0);
  const roof = hipRoof(g, wall, eave, 20, Math.min(0.07, (0.9 - wall.w) / 2), MATERIALS.marseille, MATERIALS.ridge);

  // rés-do-chão: garagem (com as ripas da porta de enrolar) + porta
  onWall(g, clad, 'front', 0.19, 0.14, 0.26, 0.28, 0.012, MATERIALS.garage);
  for (const y of [0.06, 0.12, 0.18, 0.24]) {
    onWall(g, clad, 'front', 0.19, y, 0.26, 0.006, 0.02, MATERIALS.rollerBox);
  }
  opening(g, clad, 'front', -0.2, 0.135, 0.13, 0.27, MATERIALS.woodDark, { door: true });
  // varanda corrida, com grade de alumínio (corrimão + barrinhas ao alto)
  const front = wall.d / 2;
  box(g, MATERIALS.concrete, wall.w + 0.02, 0.025, 0.09, 0, 0.4, front + 0.045);
  box(g, MATERIALS.alu, wall.w + 0.02, 0.018, 0.018, 0, 0.5, front + 0.084);
  for (const sx of [-1, 1]) {
    box(g, MATERIALS.alu, 0.012, 0.09, 0.012, sx * (wall.w / 2 + 0.004), 0.455, front + 0.084);
  }
  for (let x = -0.4; x <= 0.401; x += 0.04) {
    box(g, MATERIALS.alu, 0.006, 0.09, 0.006, x, 0.455, front + 0.084);
  }
  gardenWall(g);
  // 1.º andar: porta-janela e janela, cada uma com a caixa do estore por cima
  const alu = { frame: MATERIALS.alu, frameSize: 0.015 };
  opening(g, wall, 'front', -0.18, 0.55, 0.14, 0.26, MATERIALS.glass, alu);
  onWall(g, wall, 'front', -0.18, 0.71, 0.17, 0.04, 0.025, MATERIALS.rollerBox);
  opening(g, wall, 'front', 0.19, 0.6, 0.16, 0.18, MATERIALS.glass, alu);
  onWall(g, wall, 'front', 0.19, 0.71, 0.19, 0.04, 0.025, MATERIALS.rollerBox);
  opening(g, wall, 'back', 0, 0.6, 0.16, 0.18, MATERIALS.glass);
  onWall(g, wall, 'back', 0, 0.71, 0.19, 0.04, 0.025, MATERIALS.rollerBox);
  opening(g, clad, 'back', 0.2, 0.22, 0.13, 0.15, MATERIALS.glass);
  opening(g, wall, 'right', 0, 0.6, 0.16, 0.18, MATERIALS.glass);
  opening(g, wall, 'left', 0, 0.6, 0.16, 0.18, MATERIALS.glass, alu);
  onWall(g, wall, 'left', 0, 0.71, 0.19, 0.04, 0.025, MATERIALS.rollerBox);
  chimney(g, roof, -0.2, -0.15, 0.08, 0.15, MATERIALS.brick, 'slab', MATERIALS.concrete);
  // sem caminho de lajes (o muro do jardim já tem portão); só vasos à porta
  g.userData.lot = { w: wall.w, d: clad.d, doorX: -0.2, frontZ: clad.d / 2, noPath: true };
  vases(g, g.userData.lot);
  return g;
}

// Muro baixo de betão à frente da casa de emigrante, com um portão (2 pilares com bolas
// douradas) em frente à porta e uma abertura para o carro em frente à garagem.
function gardenWall(g) {
  const z = 0.43;
  // troços de muro: [início, fim] em x. Buracos: portão (-0.28 a -0.12) e garagem (0.06 a 0.32)
  for (const [a, b] of [[-0.42, -0.28], [-0.12, 0.06], [0.32, 0.42]]) {
    box(g, MATERIALS.concrete, b - a, 0.06, 0.03, (a + b) / 2, 0.03, z);
  }
  for (const x of [-0.2925, -0.1075]) {                     // pilares do portão
    box(g, MATERIALS.concrete, 0.025, 0.09, 0.025, x, 0.045, z);
    place(g, GEOMETRIES.finial, MATERIALS.gold, x, 0.105, z);
  }
}

// H5 — Palheiro/curral abandonado: paredes de xisto sem janelas, telhado meio caído ou de zinco.
function ruinedShed(rand) {
  const g = new THREE.Group();
  const W = 0.5, D = 0.4, t = 0.045;
  const stone = MATERIALS.schist;
  box(g, MATERIALS.hole, W - 0.02, 0.01, D - 0.02, 0, 0.0135, 0);             // chão escuro lá dentro
  box(g, stone, W, 0.4, t, 0, 0.2, D / 2 - t / 2);                             // parede da frente (alta)
  box(g, stone, W, 0.3, t, 0, 0.15, -D / 2 + t / 2);                           // parede de trás (baixa)
  for (const sx of [-1, 1]) box(g, stone, t, 0.34, D - 2 * t, sx * (W / 2 - t / 2), 0.17, 0);
  box(g, MATERIALS.hole, 0.13, 0.24, 0.03, 0.1, 0.12, D / 2 + 0.004);          // buraco da porta
  const a = Math.atan2(0.1, D);                                                 // telhado de uma água
  const collapsed = rand() < 0.5;
  let roofMaterial = MATERIALS.tileMoss;
  if (!collapsed) roofMaterial = rand() < 0.5 ? MATERIALS.metal : MATERIALS.rust;
  if (collapsed) {
    const part = box(g, roofMaterial, 0.3, 0.02, D / Math.cos(a) + 0.06, -0.11, 0.365, 0);
    part.rotation.x = -a;
    const fallen = box(g, roofMaterial, 0.2, 0.02, 0.3, 0.12, 0.17, 0);         // pedaço caído lá dentro
    fallen.rotation.z = 0.9;
  } else {
    const roof = box(g, roofMaterial, W + 0.06, 0.02, D / Math.cos(a) + 0.08, 0, 0.365, 0);
    roof.rotation.x = -a;
  }
  // pedras soltas no chão
  box(g, MATERIALS.dryStone, 0.07, 0.04, 0.05, -0.33, 0.02, 0.15);
  box(g, MATERIALS.dryStone, 0.05, 0.03, 0.06, -0.31, 0.015, 0.26);
  g.userData.lot = { w: W, d: D, doorX: 0.1, frontZ: D / 2, noPath: true };   // sem caminho, sem enfeites
  return g;
}

// =====================================================================================
// 8. ESCOLA PRIMÁRIA (Plano dos Centenários, 1941-69, estilo "Português Suave")
// Um edifício comprido, baixo e simétrico, telhado de 4 águas, duas portas com alpendre
// (rapazes e raparigas), janelas altas viradas para o recreio e a bandeira no pátio.
// Cabe num quadrado (0.9 x 0.9): edifício ao fundo, recreio à frente.
// =====================================================================================
export function buildSchool(rand) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.z = -0.22;                                  // edifício ao fundo, recreio à frente
  g.add(body);
  schoolBuilding(body, rand);
  schoolYard(g, rand);
  const flag = schoolFlag(g);
  mergeByMaterial(g);                                       // a bandeira fica de fora (mexe-se)
  g.userData.animate = flag.animate;
  return shadows(g);
}

// O edifício: soco de granito, paredes brancas, 3 janelas altas por sala, 2 portas com alpendre,
// frontão ao meio com a placa "ESCOLA PRIMÁRIA" e a chaminé da cozinha.
function schoolBuilding(body, rand) {
  const wall = { w: 0.82, d: 0.38 };
  const eave = 0.45;
  box(body, MATERIALS.plinth, wall.w + 0.012, 0.06, wall.d + 0.012, 0, 0.03, 0);   // soco de granito
  walls(body, wall, eave, MATERIALS.schoolWhite);
  quoins(body, wall, eave, MATERIALS.granite, 0.03);
  const roof = hipRoof(body, wall, eave, 25, 0.03, MATERIALS.tile, MATERIALS.ridge);

  const frame = rand() < 0.5 ? MATERIALS.white : MATERIALS.bottleGreen;
  const door = rand() < 0.5 ? MATERIALS.bottleGreen : MATERIALS.woodDark;
  const front = wall.d / 2;
  // as janelas têm peitoril de granito (como as escolas a sério)
  const windowFrame = { frame, frameSize: 0.007, sill: MATERIALS.granite };
  const backFrame = { frame: MATERIALS.white, frameSize: 0.008, sill: MATERIALS.granite };
  const doorFrame = { frame: MATERIALS.granite, frameSize: 0.012, door: true };
  for (const side of [-1, 1]) {
    // 3 janelas altas por sala de aula
    for (const x of [0.1, 0.17, 0.24]) {
      opening(body, wall, 'front', side * x, 0.25, 0.048, 0.16, MATERIALS.glass, windowFrame);
    }
    // porta perto da ponta, com alpendre: 2 pilares de granito e um telhadinho de 2 águas
    const dx = side * 0.33;
    opening(body, wall, 'front', dx, 0.135, 0.07, 0.21, door, doorFrame);
    for (const px of [-0.045, 0.045]) {
      box(body, MATERIALS.granite, 0.03, 0.3, 0.03, dx + px, 0.15, front + 0.09);       // pilar
      box(body, MATERIALS.granite, 0.04, 0.015, 0.04, dx + px, 0.2925, front + 0.09);   // capitel
    }
    const porchRoof = new THREE.Mesh(wedgeGeometry(0.13, 0.14, 0.045, 0.065), MATERIALS.tile);
    porchRoof.rotation.y = Math.PI / 2;                    // a cumeeira sai da parede para a frente
    porchRoof.position.set(dx, 0.3, front + 0.06);
    body.add(porchRoof);
    // janelas de trás (4) com a porta das traseiras ao meio
    for (const x of [0.12, 0.24]) {
      opening(body, wall, 'back', side * x, 0.25, 0.05, 0.14, MATERIALS.glass, backFrame);
    }
  }
  opening(body, wall, 'back', 0, 0.135, 0.07, 0.21, door, doorFrame);
  // frontão ao meio, mais alto que o beiral, com a placa "ESCOLA PRIMÁRIA"
  box(body, MATERIALS.schoolWhite, 0.12, 0.18, 0.06, 0, 0.47, front + 0.02);
  const cap = new THREE.Mesh(wedgeGeometry(0.06, 0.13, 0.05, 0.03), MATERIALS.granite);
  cap.rotation.y = Math.PI / 2;
  cap.position.set(0, 0.56, front + 0.02);
  body.add(cap);
  box(body, MATERIALS.plaque, 0.11, 0.04, 0.01, 0, 0.49, front + 0.054);
  chimney(body, roof, -0.3, -0.06, 0.05, 0.08, MATERIALS.schoolWhite, 'hat', MATERIALS.tile);
}

// O recreio: chão de terra batida, muro baixo caiado, portão de ferro e um castanheiro de sombra.
function schoolYard(g, rand) {
  box(g, MATERIALS.yard, 0.82, 0.01, 0.46, 0, 0.005, 0.2);
  for (const sx of [-1, 1]) {
    box(g, MATERIALS.lime, 0.33, 0.08, 0.035, sx * 0.26, 0.04, 0.425);          // muro da frente
    box(g, MATERIALS.lime, 0.035, 0.08, 0.45, sx * 0.4075, 0.04, 0.2);          // muros dos lados
  }
  schoolGate(g, 0.425);
  const tree = chestnut(rand);
  tree.scale.setScalar(0.45);
  tree.position.set(-0.22, 0, 0.22);
  g.add(tree);
}

// Portão do recreio: 2 pilares de granito com capa, e um portão de grades de ferro.
function schoolGate(g, z) {
  for (const sx of [-1, 1]) {
    box(g, MATERIALS.granite, 0.04, 0.12, 0.04, sx * 0.115, 0.06, z);           // pilar
    box(g, MATERIALS.granite, 0.05, 0.008, 0.05, sx * 0.115, 0.124, z);         // capa do pilar
  }
  for (let i = 0; i < 5; i++) {                                                  // 5 grades
    box(g, MATERIALS.iron, 0.006, 0.07, 0.006, -0.08 + i * 0.04, 0.045, z);
  }
  for (const y of [0.075, 0.015]) box(g, MATERIALS.iron, 0.19, 0.008, 0.008, 0, y, z);   // travessas
}

// Mastro com a bandeira de Portugal. Devolve a função que a faz ondular ao vento.
function schoolFlag(g) {
  const px = 0.2, pz = 0.2, poleTop = 1.0;
  stick(g, GEOMETRIES.flagPole, MATERIALS.pole, px, 0, pz, px, poleTop, pz);
  box(g, MATERIALS.gold, 0.02, 0.02, 0.02, px, poleTop + 0.01, pz);
  const flagW = 0.2, flagH = 0.133;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 8, 1);  // geometria própria: vai ser dobrada
  flagGeo.translate(flagW / 2, 0, 0);                            // o lado verde fica junto ao mastro
  const flag = new THREE.Mesh(flagGeo, MATERIALS.flag);
  flag.position.set(px + 0.01, poleTop - flagH / 2 - 0.01, pz);
  flag.userData.keepSeparate = true;                             // não juntar com as outras peças
  g.add(flag);
  const pos = flagGeo.attributes.position;
  const original = pos.array.slice();
  const animate = (t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = original[i * 3];
      // onda que corre do mastro para a ponta, cada vez mais forte na ponta
      pos.array[i * 3 + 2] = Math.sin(x * 30 - t * 6) * 0.02 * (x / flagW);
    }
    pos.needsUpdate = true;
  };
  return { animate };
}

// =====================================================================================
// 9. ÁRVORES
// 'conifer' = as espécies de plantação que ardem muito (eucalipto e pinheiro-bravo).
// 'broadleaf' = folhosas nativas que travam o fogo (sobreiro, castanheiro, oliveira).
// Alturas (cerca de 0.6 x as reais): eucalipto 1.2-1.4 (o mais alto!), pinheiro 0.9-1.1,
// castanheiro 0.7-0.85, sobreiro 0.6-0.75, oliveira 0.35-0.45, pinheiro novo 0.35-0.5.
// =====================================================================================
export function buildTree(kind, rand) {
  const g = new THREE.Group();
  const r = rand();
  let tree;
  if (kind === 'conifer') {
    if (r < 0.55) tree = eucalyptus(rand);
    else if (r < 0.85) tree = maritimePine(rand);
    else if (r < 0.94) tree = youngPine(rand);
    else tree = eucalyptusRegrowth(rand);
  } else {
    if (r < 0.5) tree = corkOak(rand);
    else if (r < 0.8) tree = chestnut(rand);
    else tree = olive(rand);
  }
  g.add(tree);
  mergeByMaterial(g);
  return shadows(g);
}

// C1 — Eucalipto: o mais alto, tronco fino e claro, copa só no topo, ABERTA:
// 5 a 7 tufos pequenos e pendurados, cada um no seu raminho, com céu a ver-se entre eles.
function eucalyptus(rand) {
  const t = new THREE.Group();
  const H = 1.2 + rand() * 0.2;
  const topX = (rand() - 0.5) * 0.1;                  // inclinação leve
  const topZ = (rand() - 0.5) * 0.1;
  const trunkTop = H * 0.88;
  stick(t, GEOMETRIES.euTrunk, MATERIALS.euBark, 0, 0, 0, topX, trunkTop, topZ);
  // 2 a 3 manchas cinzento-esverdeadas na casca lisa
  const patches = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < patches; i++) {
    const y = H * (0.1 + rand() * 0.4);
    const k = y / trunkTop;                           // 0 na base do tronco, 1 no topo
    const radius = (0.036 - 0.014 * k) * 0.95;        // o tronco é mais fino lá em cima
    const ang = rand() * Math.PI * 2;
    const x = topX * k + Math.cos(ang) * radius;
    const z = topZ * k + Math.sin(ang) * radius;
    const patch = box(t, MATERIALS.euPatch, 0.025, 0.07, 0.006, x, y, z);
    patch.rotation.y = Math.PI / 2 - ang;             // virada para fora do tronco
  }
  // tiras de casca a cair junto à base
  for (const ang of [rand() * 3, 3 + rand() * 3]) {
    const strip = new THREE.Mesh(GEOMETRIES.euStrip, MATERIALS.euStrip);
    strip.position.set(Math.cos(ang) * 0.038, 0.07, Math.sin(ang) * 0.038);
    strip.rotation.set(0, Math.PI / 2 - ang, (rand() - 0.5) * 0.4);
    t.add(strip);
  }
  // copa: tufos espalhados em altura (62% a 95% da árvore) e afastados do tronco
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.7;
    const dist = 0.08 + rand() * 0.12;
    const s = 0.045 + rand() * 0.02;
    const sy = s * 2.2;                               // esticado para baixo: folhas a pender
    const wanted = H * (0.62 + (i / (n - 1)) * 0.27 + rand() * 0.06);
    const cy = Math.min(wanted, H - sy * 1.15);
    const cx = topX + Math.cos(ang) * dist;
    const cz = topZ + Math.sin(ang) * dist;
    const fromY = Math.min(cy - 0.08, trunkTop);      // raminho desde o tronco até ao topo do tufo
    const k = fromY / trunkTop;
    stick(t, GEOMETRIES.twig, MATERIALS.euBark, topX * k, fromY, topZ * k, cx, cy + sy * 0.5, cz);
    const leaf = rand() < 0.6 ? MATERIALS.euLeaf : MATERIALS.euLeafLit;
    clump(t, rand, leaf, cx, cy, cz, s, sy, s);
  }
  return t;
}

// C1b — Rebentos de eucalipto a nascer da touça queimada (o aspeto típico depois do fogo).
// Folhas novas azul-acinzentadas. Altura 0.3-0.45.
function eucalyptusRegrowth(rand) {
  const t = new THREE.Group();
  const stump = new THREE.Mesh(GEOMETRIES.stump, MATERIALS.stump);
  stump.position.y = 0.04;
  t.add(stump);
  const n = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand();
    const dist = i === 0 ? 0 : 0.04 + rand() * 0.05;   // o primeiro tufo fica ao meio
    const s = 0.07 + rand() * 0.025;
    const sy = s * 1.15;
    const y = sy * 1.2 + i * 0.05;                     // o tufo de baixo assenta no chão (y = 0)
    const leaf = rand() < 0.5 ? MATERIALS.euYoung : MATERIALS.euYoung2;
    clump(t, rand, leaf, Math.cos(ang) * dist, y, Math.sin(ang) * dist, s, sy, s);
  }
  return t;
}

// C2 — Pinheiro-bravo: tronco alto, nu e cor de laranja-tijolo, copa achatada só lá em cima.
function maritimePine(rand) {
  const t = new THREE.Group();
  const H = 0.9 + rand() * 0.2;
  const bend = (rand() - 0.5) * 0.08;                                   // tronco às vezes torto
  const midY = H * 0.4;
  const topX = bend * 0.4 + (rand() - 0.5) * 0.04;
  const topY = H * 0.8;
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.pineBark, 0, 0, 0, bend, midY, 0, 1.15);
  stick(t, GEOMETRIES.pineTrunk, MATERIALS.pineBark, bend, midY, 0, topX, topY, 0, 0.8);
  const n = 3 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.6;
    const dist = 0.05 + rand() * 0.06;
    const s = 0.12 + rand() * 0.04;
    const sy = s * 0.5;
    const cx = topX + Math.cos(ang) * dist;
    const cz = Math.sin(ang) * dist;
    const cy = H - sy * 1.15 - rand() * 0.08;
    if (i < 2) stick(t, GEOMETRIES.twig, MATERIALS.pineBark, topX, topY - 0.04, 0, cx, cy, cz, 1.5);
    const needles = rand() < 0.55 ? MATERIALS.pineNeedle : MATERIALS.pineNeedleLit;
    clump(t, rand, needles, cx, cy, cz, s, sy, s);
  }
  if (rand() < 0.5) {                                                   // pinhas
    box(t, MATERIALS.pineCone, 0.03, 0.045, 0.03, topX + 0.06, H - 0.15, 0.03);
    box(t, MATERIALS.pineCone, 0.03, 0.045, 0.03, topX - 0.05, H - 0.16, -0.04);
  }
  return t;
}

// C3 — Pinheiro novo (regeneração natural em campos abandonados e depois do fogo):
// um cone cheio mas irregular, de topo arredondado. Altura 0.35-0.5.
function youngPine(rand) {
  const t = new THREE.Group();
  stick(t, GEOMETRIES.youngTrunk, MATERIALS.youngTrunk, 0, 0, 0, 0, 0.12, 0);
  clump(t, rand, MATERIALS.youngPine, 0, 0.27, 0, 0.15, 0.2, 0.15);       // corpo
  clump(t, rand, MATERIALS.youngPine, 0.01, 0.45, 0, 0.1, 0.14, 0.1);     // ponta
  clump(t, rand, MATERIALS.pineNeedle, 0.06, 0.2, 0.04, 0.09, 0.1, 0.09); // lado mais escuro
  // o desenho acima tem ~0.6 de altura; encolhemos tudo para 0.35-0.5
  t.scale.setScalar((0.35 + rand() * 0.15) / 0.6);
  return t;
}

// B1 — Sobreiro: tronco curto e grosso que se divide em pernadas, copa larga e escura.
// Alguns foram descortiçados: tronco vermelho-ferrugem (fresco) ou castanho-avermelhado (antigo),
// com o algarismo do ano pintado a branco. Os outros têm a cortiça cinzenta.
function corkOak(rand) {
  const t = new THREE.Group();
  const H = 0.6 + rand() * 0.15;
  const lean = (rand() - 0.5) * 0.06;
  const forkY = 0.22;
  const r = rand();
  let bark = MATERIALS.cork;                                            // 60%: cortiça por tirar
  if (r < 0.15) bark = MATERIALS.corkFresh;                             // 15%: tirada este ano
  else if (r < 0.4) bark = pick(rand, [MATERIALS.corkAged, MATERIALS.corkAged2]); // 25%: há uns anos
  stick(t, GEOMETRIES.oakTrunk, bark, 0, 0, 0, lean, forkY, 0);
  if (bark !== MATERIALS.cork) {
    const d = 0.065 * 0.866 + 0.004;                                    // à frente de uma face do tronco
    const x = lean * 0.5 + Math.sin(Math.PI / 6) * d;
    const digit = box(t, MATERIALS.white, 0.02, 0.032, 0.006, x, 0.13, Math.cos(Math.PI / 6) * d);
    digit.rotation.y = Math.PI / 6;
  }
  // pernadas: cada uma acaba no centro de um tufo da copa
  const limbs = 2 + (rand() < 0.5 ? 1 : 0);
  const centres = [];
  for (let i = 0; i < limbs; i++) {
    const ang = (i / limbs) * Math.PI * 2 + rand();
    centres.push({ x: lean + Math.cos(ang) * 0.13, z: Math.sin(ang) * 0.13 });
  }
  centres.push({ x: lean, z: 0 });                                      // mais um tufo ao meio
  centres.forEach((c, i) => {
    const s = 0.17 + rand() * 0.04;
    const sy = 0.1 + rand() * 0.025;
    const cy = H - sy * 1.15;
    if (i < limbs) stick(t, GEOMETRIES.limb, MATERIALS.cork, lean, forkY - 0.02, 0, c.x, cy, c.z);
    const leaf = rand() < 0.6 ? MATERIALS.oak : MATERIALS.oakLit;
    clump(t, rand, leaf, c.x, cy, c.z, s, sy, s);
  });
  return t;
}

// B2 — Castanheiro: tronco gordo e cinzento-escuro, copa grande e redonda, verde mais vivo.
// No início do verão tem amentilhos (flores compridas amarelo-claras).
function chestnut(rand) {
  const t = new THREE.Group();
  const H = 0.7 + rand() * 0.15;
  const tx = (rand() - 0.5) * 0.04;
  stick(t, GEOMETRIES.chestnutTrunk, MATERIALS.chestnutBark, 0, 0, 0, tx, 0.32, 0);
  stick(t, GEOMETRIES.limb, MATERIALS.chestnutBark, tx, 0.28, 0, tx + 0.11, H - 0.27, 0.05);
  // [x, y, z, tamanho] de cada tufo: um grande ao meio e dois mais pequenos dos lados
  const parts = [
    [tx, H - 0.22, 0, 0.22],
    [tx + 0.12, H - 0.27, 0.05, 0.17],
    [tx - 0.11, H - 0.29, -0.06, 0.17],
  ];
  for (const [x, y, z, s] of parts) {
    const leaf = pick(rand, [MATERIALS.chestnut, MATERIALS.chestnutLit]);
    clump(t, rand, leaf, x, y, z, s, s * 0.88, s);
  }
  if (rand() < 0.4) {
    for (let i = 0; i < 4; i++) {
      dot(t, rand, MATERIALS.catkin, 0.025, tx, H - 0.22, 0, 0.22, 0.2, 0.22);
    }
  }
  return t;
}

// B3 — Oliveira: baixa, tronco retorcido e aberto em dois, copa pequena cinzento-prateada.
// Fica muitas vezes num socalco com muro de pedra.
function olive(rand) {
  const t = new THREE.Group();
  const H = 0.35 + rand() * 0.1;
  const forkY = H - 0.17;                                               // onde o tronco se abre
  stick(t, GEOMETRIES.oliveTrunk, MATERIALS.oliveBark, 0, 0, 0, 0.04, forkY, 0.02);
  stick(t, GEOMETRIES.oliveTrunk, MATERIALS.oliveBark, 0.01, 0, 0, -0.04, forkY - 0.02, -0.03, 0.85);
  const n = 3 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand();
    const dist = 0.05 + rand() * 0.05;
    const s = 0.09 + rand() * 0.03;
    const cx = Math.cos(ang) * dist;
    const cz = Math.sin(ang) * dist;
    const cy = H - 0.12;
    stick(t, GEOMETRIES.limb, MATERIALS.oliveBark, 0, forkY - 0.03, 0, cx, cy, cz, 0.5);
    const leaf = rand() < 0.5 ? MATERIALS.olive : MATERIALS.oliveLit;
    clump(t, rand, leaf, cx, cy, cz, s, s * 0.8, s);
  }
  if (rand() < 0.4) terraceWall(t, rand, 0.5, 0.24);                    // muro do socalco
  return t;
}

// =====================================================================================
// 10. ARBUSTOS — o "mato" entre as árvores (o combustível principal do fogo). Cores de verão seco.
// =====================================================================================
export function buildBush(rand) {
  const g = new THREE.Group();
  const r = rand();
  if (r < 0.4) g.add(gorse(rand));
  else if (r < 0.7) g.add(broom(rand));
  else g.add(heather(rand));
  mergeByMaterial(g);
  return shadows(g);
}

// K1 — Tojo: cúpula baixa, densa e espinhosa, verde muito escuro,
// com uma "saia" castanha seca à volta da base.
function gorse(rand) {
  const t = new THREE.Group();
  const s = 0.85 + rand() * 0.3;
  const dome = new THREE.Mesh(pick(rand, GEOMETRIES.gorse), MATERIALS.gorse);
  dome.scale.set(s, s * 0.85, s);
  dome.position.y = 0.17 * s;                         // assenta no chão sem ficar enterrado
  dome.rotation.y = rand() * 6;
  const skirt = new THREE.Mesh(pick(rand, GEOMETRIES.gorse), MATERIALS.gorseDry);
  skirt.scale.set(s * 0.9, s * 0.35, s * 0.9);        // achatado e ao centro: só se vê à volta da base
  skirt.position.y = 0.08;
  t.add(dome, skirt);
  if (rand() < 0.1) {                                 // raramente ainda com flores amarelas
    for (let i = 0; i < 5; i++) {
      dot(t, rand, MATERIALS.gorseFlower, 0.025, 0, 0.17 * s, 0, 0.16 * s, 0.14 * s, 0.16 * s);
    }
  }
  return t;
}

// K2 — Giesta: um molho de MUITAS varas finas a abrir para cima, como uma vassoura,
// com o topo fofo. No verão está seca (verde-oliva acastanhado) e com vagens pretas.
function broom(rand) {
  const t = new THREE.Group();
  const v = rand();
  let state = 'dry';                                  // 60% seca (verão)
  if (v > 0.9) state = 'flower';                      // 10% em flor (maio)
  else if (v > 0.6) state = 'green';                  // 30% ainda verde
  const rodMat = state === 'dry' ? MATERIALS.broomDry : MATERIALS.broom;
  let topMat = rodMat;
  if (state === 'flower') topMat = MATERIALS.broomFlower;

  const h = 0.38 + rand() * 0.17;
  const n = 12 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand() * 0.5;
    const spread = 0.05 + rand() * 0.07;
    const len = h * (0.8 + rand() * 0.2);
    const baseX = Math.cos(ang) * 0.012, baseZ = Math.sin(ang) * 0.012;
    stick(t, GEOMETRIES.twig, rodMat, baseX, 0, baseZ, Math.cos(ang) * spread, len, Math.sin(ang) * spread, 1.2);
  }
  // topo fofo: 1 ou 2 tufos compridos
  const tops = 1 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < tops; i++) {
    const x = (i === 0 ? -1 : 1) * 0.025 * (tops - 1);
    clump(t, rand, topMat, x, h * 0.78, 0, 0.07, 0.16, 0.07);
  }
  if (state === 'dry') {                              // vagens pretas
    for (let i = 0; i < 3; i++) dot(t, rand, MATERIALS.pod, 0.02, 0, h * 0.78, 0, 0.07, 0.16, 0.07);
  }
  return t;
}

// K3 — Urze e esteva: montinhos baixos e fofos, feitos de várias almofadas encostadas.
function heather(rand) {
  const t = new THREE.Group();
  const v = rand();
  if (v < 0.1) cushionMound(t, rand, MATERIALS.heather, MATERIALS.heather);       // urze em flor (raro)
  else if (v < 0.55) cushionMound(t, rand, MATERIALS.rockrose, MATERIALS.heatherDry); // urze seca
  else if (v < 0.85) {                                                             // esteva
    cushionMound(t, rand, MATERIALS.rockrose, MATERIALS.rockrose);
    for (let i = 0; i < 4; i++) {
      dot(t, rand, MATERIALS.rockroseFlower, 0.025, 0, 0.08, 0, 0.13, 0.08, 0.13);
    }
  } else {
    treeHeath(t, rand);                                                            // urze-branca
  }
  return t;
}

// Um montinho de 3-4 almofadas pequenas: a de baixo (base) e as outras por cima/ao lado (top).
function cushionMound(t, rand, baseMat, topMat) {
  const n = 3 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const s = 0.08 + rand() * 0.03;                   // raio da almofada
    const k = s / 0.16;                               // a geometria tem raio 0.16
    const ang = (i / n) * Math.PI * 2 + rand();
    const dist = i === 0 ? 0 : 0.05 + rand() * 0.04;
    const big = i === 0 ? 1.25 : 1;                   // a primeira é maior e fica ao meio
    const m = new THREE.Mesh(pick(rand, GEOMETRIES.cushion), i === 0 ? baseMat : topMat);
    m.scale.set(k * big, k * 0.6 * big, k * big);
    m.position.set(Math.cos(ang) * dist, s * 0.55 * big, Math.sin(ang) * dist);
    m.rotation.y = rand() * 6;
    t.add(m);
  }
}

// Urze-branca: mais alta (~0.5), verde-escura, salpicada de florzinhas brancas.
function treeHeath(t, rand) {
  clump(t, rand, MATERIALS.rockrose, 0, 0.25, 0, 0.12, 0.22, 0.12);
  const dots = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < dots; i++) {
    dot(t, rand, MATERIALS.treeHeathFlower, 0.025, 0, 0.25, 0, 0.12, 0.22, 0.12);
  }
}
