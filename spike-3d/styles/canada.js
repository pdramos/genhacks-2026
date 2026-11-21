// ESTILO CANADÁ — a vila de Jasper, Alberta (Parque Nacional de Jasper, Montanhas Rochosas),
// atingida pelo incêndio de julho de 2024 (358 de 1113 edifícios destruídos, sobretudo na zona oeste).
//
// Como é Jasper (é isto que este ficheiro tenta imitar):
//   - Casas pequenas de madeira escura (castanho, verde-floresta), com telhados MUITO inclinados,
//     base de pedra (soco) inclinada, chaminés de pedra, alpendres com postes de tronco descascado.
//   - O edifício mais famoso: o Centro de Informação do Parque (1913-14), de pedra, troncos e telhas,
//     com vários bicos no telhado que lembram montanhas. É a nossa "escola", com a bandeira do Canadá.
//   - À volta: floresta densa de pinheiro-lodgepole e abeto (ardem muito) misturada com álamo-tremedor.
//
// Segue o CONTRATO descrito em basic.js: palette, buildHouse, buildSchool, buildTree, buildBush.
// Usa SEMPRE o rand() recebido (nunca Math.random) para a vila sair igual de cada vez.
//
// ÍNDICE (se só queres ver as casas, salta para a secção 6):
//   1-3. Ferramentas, texturas e formas partilhadas (a "caixa de ferramentas")
//   4.   Materiais e cores do chão (palette)
//   5.   Peças de casa: paredes, telhados, janelas, alpendres, chaminés
//   6.   As 5 casas de Jasper           7. A "escola" (Centro de Informação)
//   8.   Árvores                         9. Arbustos
import * as THREE from 'three';

// =====================================================================================
// 1. Ferramentas pequenas
// =====================================================================================
const DEG = Math.PI / 180;                                              // graus -> radianos
const pick = (rand, list) => list[Math.floor(rand() * list.length)];    // escolhe um elemento ao acaso
const between = (rand, a, b) => a + rand() * (b - a);                   // número ao acaso entre a e b

// Acaso FIXO, só para desenhar texturas e formas partilhadas (não é o rand do jogo).
// Como tem semente fixa, os desenhos saem sempre iguais.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const texRand = seeded(2024);

// Material "low-poly": facetas planas (flatShading) e pouco brilho.
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });

// =====================================================================================
// 2. Texturas desenhadas por código (num <canvas>), criadas UMA vez e reutilizadas
// =====================================================================================
// isColor = true só para texturas com CORES de verdade (janelas, portas, cascas, bandeira).
// As texturas cinzentas são "máscaras" (só dizem onde escurecer): ficam em espaço linear.
// Se as marcássemos como sRGB, a placa gráfica escurecia-as outra vez e as casas ficavam quase pretas.
function makeTexture(width, height, draw, repeat = true, isColor = false) {
  if (typeof document === 'undefined') return null;   // fora do navegador não há canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;   // texturas nítidas mesmo quando vistas de lado (telhados, paredes ao longe)
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const grey = (v) => `rgb(${v},${v},${v})`;

// Retângulo de cantos arredondados (para as pedras)
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// As texturas são cinzentas: a cor verdadeira vem do material (cinzento x cor = cor com detalhes).
const TEX = {
  // Tábuas horizontais sobrepostas ("lap siding"): 8 tábuas finas, cada uma com um sulco escuro em baixo.
  // (Com tábuas mais largas pareciam troncos.)
  siding: makeTexture(64, 64, (ctx, w, h) => {
    const board = h / 8;
    for (let i = 0; i < 8; i++) {
      const y = i * board;
      const grad = ctx.createLinearGradient(0, y, 0, y + board);
      grad.addColorStop(0, grey(255));
      grad.addColorStop(1, grey(215));
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, board);
      ctx.fillStyle = grey(120);
      ctx.fillRect(0, y + board - 1, w, 1);
    }
  }),
  // Tábua e ripa ("board-and-batten"): ripas verticais claras com sombra ao lado.
  batten: makeTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = grey(222);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = Math.round((i * w) / 6);
      ctx.fillStyle = grey(255);
      ctx.fillRect(x, 0, 3, h);
      ctx.fillStyle = grey(140);
      ctx.fillRect(x + 3, 0, 1, h);
    }
  }),
  // Troncos empilhados: cada tronco é mais claro no meio (parece redondo), com "argamassa" escura entre eles.
  logs: makeTexture(64, 64, (ctx, w, h) => {
    const log = h / 5;
    for (let i = 0; i < 5; i++) {
      const y = i * log;
      const grad = ctx.createLinearGradient(0, y, 0, y + log);
      grad.addColorStop(0, grey(180));
      grad.addColorStop(0.45, grey(255));
      grad.addColorStop(1, grey(150));
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, log);
      ctx.fillStyle = grey(60);
      ctx.fillRect(0, y + log - 2, w, 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';   // pequenas fendas na madeira
    for (let k = 0; k < 14; k++) ctx.fillRect(texRand() * w, texRand() * h, 6 + texRand() * 10, 1);
  }),
  // Pedra do rio ("fieldstone"): pedras redondas de vários cinzentos, com argamassa escura.
  stone: makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = grey(110);
    ctx.fillRect(0, 0, w, h);
    let y = 0;
    while (y < h - 10) {
      const rowH = Math.min(h - y, 22 + Math.floor(texRand() * 12));
      let x = -Math.floor(texRand() * 20);
      while (x < w) {
        const sw = 22 + Math.floor(texRand() * 22);
        const v = 175 + Math.floor(texRand() * 80);
        ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        roundedRect(ctx, x + 2, y + 2, sw - 4, rowH - 4, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';   // sombra por baixo de cada pedra
        ctx.fillRect(x + 5, y + rowH - 6, sw - 10, 2);
        x += sw;
      }
      y += rowH;
    }
  }),
  // Telhas de madeira/asfalto: fiadas com juntas desencontradas e tons diferentes.
  shingles: makeTexture(64, 64, (ctx, w, h) => {
    const rowH = 8;
    for (let r = 0; r < h / rowH; r++) {
      let x = (r % 2) * -6;
      while (x < w) {
        const sw = 8 + Math.floor(texRand() * 7);
        ctx.fillStyle = grey(205 + Math.floor(texRand() * 50));
        ctx.fillRect(x, r * rowH, sw, rowH);
        ctx.fillStyle = grey(120);
        ctx.fillRect(x, r * rowH, 1, rowH);
        x += sw;
      }
      ctx.fillStyle = grey(105);
      ctx.fillRect(0, r * rowH + rowH - 1, w, 1);
    }
  }),
  // Telhas de cedro rachadas à mão ("shakes"): como as telhas acima, mas mais pequenas e estreitas.
  shakes: makeTexture(64, 64, (ctx, w, h) => {
    const rowH = 4;
    for (let r = 0; r < h / rowH; r++) {
      let x = (r % 2) * -3;
      while (x < w) {
        const sw = 4 + Math.floor(texRand() * 4);   // 4 a 7 píxeis de largura
        ctx.fillStyle = grey(205 + Math.floor(texRand() * 50));
        ctx.fillRect(x, r * rowH, sw, rowH);
        ctx.fillStyle = grey(120);
        ctx.fillRect(x, r * rowH, 1, rowH);
        x += sw;
      }
      ctx.fillStyle = grey(105);
      ctx.fillRect(0, r * rowH + rowH - 1, w, 1);
    }
  }),
  // Telhas em "escama de peixe" (meias-luas), no bico da empena do bungalow.
  // Desenhamos de baixo para cima: cada fiada tapa um bocadinho a fiada de baixo, como nas telhas reais.
  fishScale: makeTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = grey(150);   // cor das juntas
    ctx.fillRect(0, 0, w, h);
    const rowH = 8, r = 4;
    for (let row = h / rowH; row >= -1; row--) {
      const y = row * rowH;
      const shift = (((row % 2) + 2) % 2) * r;   // fiadas alternadas desencontradas meia escama
      for (let x = -2 * r + shift; x < w + 2 * r; x += 2 * r) {
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x + r, y + rowH + 2 - r);
        ctx.arc(x, y + rowH + 2 - r, r, 0, Math.PI);   // a ponta redonda em baixo
        ctx.closePath();
        ctx.fillStyle = grey(225 + Math.floor(texRand() * 30));
        ctx.fill();
        ctx.strokeStyle = grey(150);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }),
  // Revestimento de vinil das casas móveis: tábuas muito finas (12 por repetição).
  vinyl: makeTexture(64, 48, (ctx, w, h) => {
    ctx.fillStyle = grey(250);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = grey(175);
      ctx.fillRect(0, i * 4 + 3, w, 1);
    }
  }),
  // Chapa metálica de juntas levantadas (telhados de metal, muito comuns nas Rochosas).
  seams: makeTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = grey(238);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = grey(255);
      ctx.fillRect(i * 16, 0, 2, h);
      ctx.fillStyle = grey(160);
      ctx.fillRect(i * 16 + 2, 0, 1, h);
    }
  }),
  // Casca do álamo-tremedor: quase branca, com "olhos" pretos e a base mais escura.
  aspenBark: makeTexture(32, 128, (ctx, w, h) => {
    ctx.fillStyle = '#DEDCCC';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5A554C';
    ctx.fillRect(0, h - 16, w, 16);
    ctx.fillStyle = '#2A2622';
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.ellipse(texRand() * w, 10 + texRand() * (h - 34), 4 + texRand() * 3, 1.5 + texRand() * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, false, true),
  // Casca da bétula: branca com riscos horizontais escuros.
  birchBark: makeTexture(32, 128, (ctx, w, h) => {
    ctx.fillStyle = '#EDEBE3';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3A3632';
    for (let k = 0; k < 26; k++) ctx.fillRect(texRand() * w, texRand() * h, 3 + texRand() * 7, 1 + Math.floor(texRand() * 2));
  }, false, true),
  // Bandeira do Canadá: vermelho | branco com a folha de ácer | vermelho (faixas 1:2:1).
  flag: makeTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#D52B1E';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(32, 0, 64, h);
    ctx.fillStyle = '#D52B1E';
    drawMapleLeaf(ctx, 64, 33, 24);
  }, false, true),
};

// Folha de ácer simplificada: metade direita (x, y), de cima para baixo; a esquerda é o espelho.
function drawMapleLeaf(ctx, cx, cy, size) {
  const right = [[0, 1], [0.13, 0.74], [0.3, 0.82], [0.24, 0.36], [0.62, 0.62], [0.7, 0.46], [0.95, 0.52],
    [0.84, 0.22], [0.98, 0.12], [0.56, -0.2], [0.64, -0.4], [0.06, -0.3], [0.06, -0.95]];
  const left = right.slice(1).reverse().map(([x, y]) => [-x, y]);
  ctx.beginPath();
  [...right, ...left].forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(cx + x * size, cy - y * size);
    else ctx.lineTo(cx + x * size, cy - y * size);
  });
  ctx.closePath();
  ctx.fill();
}

// Janelas e portas são "autocolantes" colados à parede. O polygonOffset diz à placa gráfica
// "desenha isto sempre um nadinha à frente", para não piscar com a parede quando a câmara está longe.
const DECAL = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };

// Janela de guilhotina ("double-hung"): aro colorido + vidros escuros com um reflexo do céu.
// Guardamos cada combinação (cor do aro, colunas, filas) para não criar a mesma duas vezes.
const windowCache = new Map();
function windowMaterial(frame, cols = 2, rows = 2) {
  const key = `${frame}-${cols}x${rows}`;
  if (!windowCache.has(key)) {
    const tex = makeTexture(32, 48, (ctx, w, h) => {
      ctx.fillStyle = frame;
      ctx.fillRect(0, 0, w, h);
      const border = 4, bar = 2;
      const pw = (w - 2 * border - (cols - 1) * bar) / cols;
      const ph = (h - 2 * border - (rows - 1) * bar) / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = border + c * (pw + bar), y = border + r * (ph + bar);
          ctx.fillStyle = '#3E5566';
          ctx.fillRect(x, y, pw, ph);
          ctx.fillStyle = 'rgba(190,220,255,0.35)';   // reflexo do céu
          ctx.beginPath();
          ctx.moveTo(x, y + ph * 0.55);
          ctx.lineTo(x + pw * 0.55, y);
          ctx.lineTo(x + pw * 0.85, y);
          ctx.lineTo(x, y + ph * 0.85);
          ctx.fill();
        }
      }
    }, false, true);
    // vidro: pouco áspero e um nadinha metálico, para brilhar um pouco ao sol
    windowCache.set(key, new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : 0x3e5566, roughness: 0.25, metalness: 0.1, ...DECAL }));
  }
  return windowCache.get(key);
}

// Porta: aro creme, porta colorida, janelinha em cima, duas almofadas e puxador dourado.
const doorCache = new Map();
function doorMaterial(color) {
  if (!doorCache.has(color)) {
    const tex = makeTexture(32, 64, (ctx, w, h) => {
      ctx.fillStyle = '#E8DCC0';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(3, 3, w - 6, h - 3);
      ctx.fillStyle = '#3E5566';
      ctx.fillRect(9, 8, w - 18, 13);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(8, 27, w - 16, 12);
      ctx.fillRect(8, 44, w - 16, 12);
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(w - 10, 38, 3, 3);
    }, false, true);
    doorCache.set(color, new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : color, roughness: 0.7, ...DECAL }));
  }
  return doorCache.get(color);
}

// =====================================================================================
// 3. Geometrias partilhadas (criadas uma vez)
// =====================================================================================

// Caixas com as medidas verdadeiras, guardadas por tamanho. As coordenadas de textura (UV)
// são esticadas conforme o tamanho, para as tábuas/pedras terem sempre o mesmo tamanho:
// 1 repetição da textura = 0.25 unidades.
const TEX_DENSITY = 4;
const boxCache = new Map();
function boxGeo(w, h, d) {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!boxCache.has(key)) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    // As 6 faces da caixa, por ordem: +x, -x, +y, -y, +z, -z (4 vértices cada)
    const faceSize = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) {
      const [su, sv] = faceSize[Math.floor(i / 4)];
      uv.setXY(i, uv.getX(i) * su * TEX_DENSITY, uv.getY(i) * sv * TEX_DENSITY);
    }
    boxCache.set(key, geo);
  }
  return boxCache.get(key);
}

// Prisma triangular = o "sótão" debaixo de um telhado de duas águas.
// O triângulo (empena) fica no plano Z-Y: base em y=0 com largura `span`, bico em y=`rise`.
// Comprimento 1 ao longo de X (estica-se depois com scale.x, que não estraga a textura da empena).
// apex = onde fica o bico: 0 = ao meio (empena normal), -0.5 = atrás (fica uma "cunha").
// Tal como as caixas, é guardado por tamanho, para as tábuas da empena serem iguais às da parede.
const prismCache = new Map();
function prismGeo(span, rise, apex = 0) {
  const key = `${span.toFixed(3)},${rise.toFixed(3)},${apex}`;
  if (!prismCache.has(key)) {
    const h = span / 2, top = apex * span;
    const A0 = [-0.5, 0, -h], B0 = [-0.5, 0, h], C0 = [-0.5, rise, top];
    const A1 = [0.5, 0, -h], B1 = [0.5, 0, h], C1 = [0.5, rise, top];
    const triangles = [
      A1, C1, B1, A0, B0, C0,         // as duas empenas (pontas triangulares)
      A0, A1, B1, A0, B1, B0,         // fundo
      B0, B1, C1, B0, C1, C0,         // água da frente
      A0, C0, C1, A0, C1, A1,         // água de trás
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(triangles.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(triangles.flatMap(([, y, z]) => [(z + h) * TEX_DENSITY, y * TEX_DENSITY]), 2));
    geo.computeVertexNormals();
    prismCache.set(key, geo);
  }
  return prismCache.get(key);
}

// Soco de pedra "inclinado" (mais largo em baixo): uma pirâmide cortada de 4 lados. Base 1x1, altura 1.
function makePlinthGeometry() {
  const geo = new THREE.CylinderGeometry(0.66, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 0.35);
  return geo;
}

// Junta várias cópias de uma geometria (com posição/escala/rotação) numa só.
// Assim, por exemplo, 8 bagas vermelhas são 1 objeto só (mais rápido de desenhar).
function mergeCopies(base, parts) {
  const src = base.index ? base.toNonIndexed() : base;
  const pos = src.attributes.position;
  const out = [];
  const v = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (const p of parts) {
    const s = typeof p.s === 'number' ? [p.s, p.s, p.s] : (p.s || [1, 1, 1]);
    q.setFromEuler(new THREE.Euler(...(p.rot || [0, 0, 0])));
    m.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(...s));
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      out.push(v.x, v.y, v.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.computeVertexNormals();
  return geo;
}

// Dá a todos os pontos de uma geometria a MESMA coordenada de textura (u, v).
// Serve para usar um material com textura numa forma que não tem UVs (ex.: troncos redondos):
// a forma fica com a cor de um só sítio da textura (escolhemos um sítio claro).
function flatUV(geo, u, v) {
  const count = geo.attributes.position.count;
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { uv[i * 2] = u; uv[i * 2 + 1] = v; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// JUNTAR PEÇAS para o computador desenhar mais depressa (igual ao portugal.js).
// Uma casa tem ~60 peças; desenhar cada uma é um "pedido" à placa gráfica (draw call).
// Aqui juntamos todas as peças com o MESMO material numa só peça: a casa passa a ~15 pedidos.
// Peças com userData.keepSeparate (ex.: a bandeira, que se mexe) ficam de fora.
// Se todas as peças de um material eram "decal" (janelas, portas), a peça junta também é decal (sem sombra).
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();          // material -> { geos: geometrias já na posição certa, decal }
  const kept = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const matrix = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
    if (o.userData.keepSeparate) { kept.push({ mesh: o, matrix }); return; }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(matrix);
    if (!groups.has(o.material)) groups.set(o.material, { geos: [], decal: true });
    const entry = groups.get(o.material);
    entry.geos.push(geo);
    entry.decal = entry.decal && !!o.userData.decal;
  });
  root.clear();
  for (const [material, { geos, decal }] of groups) {
    const merged = new THREE.Mesh(joinGeometries(geos), material);
    merged.userData.decal = decal;
    root.add(merged);
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

const G = {
  plane: new THREE.PlaneGeometry(1, 1),                                   // janelas e portas
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  plinth: makePlinthGeometry(),
  pyramid: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), // telhado da torre
  post: new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0),     // poste reto, base em y=0
  log: new THREE.CylinderGeometry(1, 1, 1, 6),                           // tronco deitado (centrado)
  log8: new THREE.CylinderGeometry(1, 1, 1, 8),                          // tronco mais redondo (paredes da cabana)
  trunk: new THREE.CylinderGeometry(0.65, 1, 1, 6).translate(0, 0.5, 0), // tronco (mais fino em cima)
  blob: new THREE.IcosahedronGeometry(1, 0),                              // copas
  rock: new THREE.DodecahedronGeometry(1, 0),                             // arbustos
  cone: new THREE.ConeGeometry(1, 1, 7),                                  // andares dos abetos
  bit: new THREE.OctahedronGeometry(1, 0),                                // bagas e flores
};

// Pontinhos (bagas/flores) espalhados na metade de cima de uma "bola" (centro cx,cy,cz; raios rx, ry).
function scatterBits(count, cx, cy, cz, rx, ry, size) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const angle = texRand() * Math.PI * 2, up = 0.15 + texRand() * 0.75;
    const ring = Math.sqrt(1 - up * up);
    parts.push({ at: [cx + Math.cos(angle) * ring * rx, cy + up * ry, cz + Math.sin(angle) * ring * rx], s: size });
  }
  return mergeCopies(G.bit, parts);
}
const jitter = (amount) => (texRand() - 0.5) * amount;

// Moita de salgueiro: devolve { stems, leaves } (caules e folhas em 2 geometrias, porque têm cores diferentes).
function makeWillow(count) {
  const stems = [], leaves = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + jitter(0.4);   // para que lado o caule se abre
    const tilt = 0.12 + texRand() * 0.16;                 // quanto se inclina (em radianos)
    const L = 0.27 + texRand() * 0.06;                    // comprimento do caule
    const rx = tilt * Math.sin(a), rz = -tilt * Math.cos(a);
    // direção do caule depois de rodado (para saber onde pôr as folhas)
    const dir = [-Math.sin(rz), Math.cos(rz) * Math.cos(rx), Math.cos(rz) * Math.sin(rx)];
    const base = [Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02];
    const along = (f) => base.map((b, k) => b + dir[k] * L * f);   // ponto a uma fração f do caule
    stems.push({ at: along(0.5), s: [0.008, L, 0.008], rot: [rx, 0, rz] });
    for (const f of [0.62, 0.86]) leaves.push({ at: along(f), s: [0.02, 0.07, 0.02], rot: [rx, texRand() * Math.PI, rz] });
  }
  return { stems: mergeCopies(G.unitBox, stems), leaves: mergeCopies(G.rock, leaves) };
}

// Vedação baixa de madeira (5 postes + 2 tábuas), ao longo de Z, colocada em x = -0.44 da casa.
G.fence = mergeCopies(G.unitBox, [
  ...[-0.4, -0.2, 0, 0.2, 0.4].map((z) => ({ at: [0, 0.045, z], s: [0.02, 0.09, 0.02] })),
  { at: [0, 0.035, 0], s: [0.008, 0.012, 0.82] },
  { at: [0, 0.07, 0], s: [0.008, 0.012, 0.82] },
]);
// Pontas das vigas do telhado ("rafter tails") a espreitar debaixo do beiral do bungalow.
G.rafters = mergeCopies(G.unitBox, [-1, 1].flatMap((sx) =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: [sx * 0.33, 0.315, -0.375 + i * 0.125], s: [0.04, 0.016, 0.016] }))));
// Canteiro de flores (para o relvado do centro de informação)
G.flowers = mergeCopies(G.bit, Array.from({ length: 10 }, () => ({ at: [jitter(0.13), 0.012, jitter(0.035)], s: 0.014 })));

// Medidas da cabana de troncos (casa 3). Ficam aqui em cima porque os cantos de troncos são feitos já.
const CABIN = { W: 0.62, D: 0.48, base: 0.05, wallTop: 0.37 };
// Cantos de troncos cruzados: em cada canto, 6 troncos curtos empilhados, alternando
// "ao comprido" (ao longo de X) e "de lado" (ao longo de Z). Cada um sai 0.035 para fora da parede.
G.logCorners = mergeCopies(G.log, [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) =>
  [0, 1, 2, 3, 4, 5].map((k) => {
    const y = CABIN.base + 0.025 + k * 0.05;   // um tronco a cada 0.05 (igual à textura da parede)
    return k % 2 === 0
      ? { at: [sx * (CABIN.W / 2 - 0.015), y, sz * CABIN.D / 2], s: [0.026, 0.1, 0.026], rot: [0, 0, Math.PI / 2] }
      : { at: [sx * CABIN.W / 2, y, sz * (CABIN.D / 2 - 0.015)], s: [0.026, 0.1, 0.026], rot: [Math.PI / 2, 0, 0] };
  }))));

// Paredes de troncos VERDADEIROS da cabana: 6 troncos redondos por parede.
// Os troncos dos lados ficam meio tronco mais acima, para se "encaixarem" com os da frente e de trás.
function makeCabinLogs() {
  const { W, D, base } = CABIN;
  const r = 0.026, parts = [];
  for (let k = 0; k < 6; k++) {
    for (const s of [-1, 1]) {
      // frente e trás: troncos ao longo de X
      parts.push({ at: [0, base + 0.025 + k * 0.05, s * (D / 2 - 0.012)], s: [r, W + 0.04, r], rot: [0, 0, Math.PI / 2] });
      // lados: troncos ao longo de Z
      parts.push({ at: [s * (W / 2 - 0.012), base + 0.05 + k * 0.05, 0], s: [r, D + 0.04, r], rot: [Math.PI / 2, 0, 0] });
    }
  }
  // Os troncos não têm UVs: usamos um sítio claro da textura de troncos (o meio de um tronco).
  return flatUV(mergeCopies(G.log8, parts), 0.5, 0.91);
}
G.cabinLogs = makeCabinLogs();

// ---- Coisas do quintal (feitas uma vez e partilhadas por todas as casas) ----
// Pilha de lenha: 3 filas de 4 toros deitados (ao longo de Z), com um telhadinho por cima.
G.woodpile = mergeCopies(G.log8, [0, 1, 2].flatMap((row) => [0, 1, 2, 3].map((i) => ({
  at: [-0.0375 + i * 0.025, 0.012 + row * 0.022, 0], s: [0.012, 0.1, 0.012], rot: [Math.PI / 2, 0, 0],
}))));
G.woodshedPosts = mergeCopies(G.unitBox, [-1, 1].map((sx) => ({ at: [sx * 0.065, 0.045, -0.055], s: [0.01, 0.09, 0.01] })));
// Cavaletes para a canoa (2 tábuas ao alto)
G.sawhorses = mergeCopies(G.unitBox, [-1, 1].map((sx) => ({ at: [sx * 0.07, 0.025, 0], s: [0.01, 0.05, 0.06] })));
// Mesa de piquenique: tampo, 2 bancos e 2 pernas
G.picnic = mergeCopies(G.unitBox, [
  { at: [0, 0.06, 0], s: [0.14, 0.01, 0.07] },
  { at: [0, 0.034, 0.055], s: [0.14, 0.008, 0.025] },
  { at: [0, 0.034, -0.055], s: [0.14, 0.008, 0.025] },
  { at: [0.055, 0.0275, 0], s: [0.01, 0.055, 0.09] },
  { at: [-0.055, 0.0275, 0], s: [0.01, 0.055, 0.09] },
]);

// Ramos secos partidos no tronco nu do pinheiro (o tronco tem altura 1 aqui; depois estica-se).
G.pineStubs = [0, 1, 2].map(() => mergeCopies(G.unitBox, Array.from({ length: 5 }, (_, i) => {
  const angle = texRand() * Math.PI * 2;
  return {
    at: [Math.cos(angle) * 0.045, 0.15 + i * 0.09 + jitter(0.04), Math.sin(angle) * 0.045],
    s: [0.05, 0.012, 0.012],
    rot: [0, -angle, -0.35],   // virado para fora e um pouco caído
  };
})));

// Copas e arbustos pré-feitos (2-3 variantes de cada), já juntos numa só geometria.
const CROWNS = {
  // Pinheiro-lodgepole: copa estreita e "esfarrapada" só no topo. São 6 tufos achatados
  // (como pratos tortos), cada um um pouco desviado para o lado, e um bico fino no cimo.
  // Altura total da copa: 0.59 (de y=0 até ao bico).
  pine: [0, 1, 2].map(() => mergeCopies(G.blob, [
    ...[0, 1, 2, 3, 4, 5].map((k) => {
      const r = (0.13 - k * 0.012) * (0.85 + texRand() * 0.3);
      return {
        at: [jitter(0.08), 0.05 + k * 0.075, jitter(0.08)],
        s: [r, 0.065, r * (0.75 + texRand() * 0.3)],
        rot: [jitter(0.3), texRand() * Math.PI, jitter(0.3)],
      };
    }),
    { at: [0, 0.47, 0], s: [0.045, 0.12, 0.045] },   // bico
  ])),
  // Abeto (Engelmann/branco): 7 andares de cones, desde quase o chão até ao bico
  spruce: [0, 1].map(() => mergeCopies(G.cone, [
    ...[0, 1, 2, 3, 4, 5].map((k) => ({
      at: [0, 0.22 + k * 0.155, 0], s: [0.22 * (1 - k * 0.14) * (0.92 + texRand() * 0.16), 0.3, 0.22 * (1 - k * 0.14)],
      rot: [0, texRand() * Math.PI, 0],
    })),
    { at: [0, 1.15, 0], s: [0.045, 0.22, 0.045] },
  ])),
  // Abeto-subalpino: coluna muito estreita e pontiaguda
  fir: [mergeCopies(G.cone, [
    { at: [0, 0.62, 0], s: [0.13, 1.0, 0.13] },
    { at: [0, 0.4, 0], s: [0.15, 0.35, 0.15], rot: [0, 0.4, 0] },
    { at: [0, 0.7, 0], s: [0.12, 0.3, 0.12], rot: [0, 0.9, 0] },
  ])],
  // Álamo-tremedor: copa redondinha de 3 bolas
  aspen: [0, 1, 2].map(() => mergeCopies(G.blob, [
    { at: [0, 0, 0], s: [0.17, 0.15, 0.17] },
    { at: [0.09 + jitter(0.04), 0.13, 0.04 + jitter(0.04)], s: 0.13 },
    { at: [-0.07 + jitter(0.04), 0.22, -0.05 + jitter(0.04)], s: 0.12 },
  ])),
  // Choupo-bálsamo: copa larga e irregular
  poplar: [0, 1].map(() => mergeCopies(G.blob, [
    { at: [0, 0, 0], s: [0.24, 0.2, 0.24] },
    { at: [0.14 + jitter(0.04), 0.1, 0.05], s: 0.2 },
    { at: [-0.12, 0.14 + jitter(0.04), -0.06], s: 0.19 },
    { at: [jitter(0.06), 0.27, jitter(0.06)], s: 0.16 },
  ])),
  // Reflexos prateados do choupo: 6 folhinhas claras espalhadas à volta da copa (a parte de baixo das folhas)
  poplarSilver: mergeCopies(G.bit, Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + jitter(0.6);
    return { at: [Math.cos(angle) * 0.25, -0.06 + texRand() * 0.16, Math.sin(angle) * 0.25], s: 0.03, rot: [0, angle, 0] };
  })),
  // Bétula: copa oval, um pouco caída
  birch: [mergeCopies(G.blob, [
    { at: [0, 0, 0], s: [0.14, 0.22, 0.14] },
    { at: [0.05, 0.16, 0.03], s: [0.1, 0.15, 0.1] },
  ])],
};
const BUSHES = {
  buffalo: mergeCopies(G.rock, [
    { at: [0, 0.15, 0], s: [0.16, 0.15, 0.16] },
    { at: [0.11, 0.1, 0.05], s: 0.11 },
    { at: [-0.08, 0.09, -0.07], s: 0.1 },
  ]),
  buffaloBerries: [0, 1, 2].map(() => scatterBits(8, 0, 0.15, 0, 0.16, 0.15, 0.016)),
  // Folhas prateadas por baixo: 7 pontinhos claros na parte de baixo do arbusto
  buffaloSilver: [0, 1].map(() => mergeCopies(G.bit, Array.from({ length: 7 }, () => {
    const angle = texRand() * Math.PI * 2, ring = 0.11 + texRand() * 0.03;
    return { at: [Math.cos(angle) * ring, 0.09 + texRand() * 0.05, Math.sin(angle) * ring], s: 0.024 };
  }))),
  juniper: mergeCopies(G.rock, [
    { at: [0, 0.04, 0], s: [0.17, 0.05, 0.13] },
    { at: [0.1, 0.035, 0.06], s: [0.12, 0.04, 0.1] },
    { at: [-0.09, 0.03, -0.05], s: [0.11, 0.035, 0.09] },
  ]),
  juniperBerries: [0, 1].map(() => scatterBits(6, 0, 0.04, 0, 0.15, 0.05, 0.012)),
  // Salgueiro: moita em forma de vaso, com 12 caules direitos abertos para fora
  // e 2 tufos de folhas estreitas na metade de cima de cada caule.
  willow: [0, 1].map(() => makeWillow(12)),
  rose: mergeCopies(G.rock, [
    { at: [0, 0.11, 0], s: [0.13, 0.11, 0.13] },
    { at: [0.09, 0.08, 0.06], s: 0.08 },
  ]),
  roseFlowers: scatterBits(7, 0, 0.11, 0, 0.13, 0.11, 0.018),
  roseHips: scatterBits(4, 0, 0.1, 0, 0.14, 0.1, 0.012),
};

// =====================================================================================
// 4. Materiais (cores do guia de cores do Parque Nacional de Jasper)
// =====================================================================================
const matCache = new Map();
function texturedMat(texName, color) {
  const key = texName + color;
  if (!matCache.has(key)) matCache.set(key, mat(color, { map: TEX[texName] }));
  return matCache.get(key);
}
// A textura cinzenta é uma "máscara" quase branca (fica em espaço linear, ver makeTexture),
// por isso a cor do material é a cor que se vê, só com sulcos e juntas um pouco mais escuros.
// Escolhemos tons de madeira com valores médios, para as casas se lerem bem ao sol.
const sidingMat = (c) => texturedMat('siding', c);
const battenMat = (c) => texturedMat('batten', c);
const logMat = (c) => texturedMat('logs', c);
const stoneMat = (c) => texturedMat('stone', c);
const shingleMat = (c) => texturedMat('shingles', c);
const seamMat = (c) => texturedMat('seams', c);
const vinylMat = (c) => texturedMat('vinyl', c);

const M = {
  stone: stoneMat(0xa6a193), stoneDark: stoneMat(0x9c978a), veneer: stoneMat(0xb7b1a6), schoolStone: stoneMat(0xc2bba9),
  chimneyCap: mat(0x5e5a52), trim: mat(0xe8dcc0), trimRust: mat(0x8c3b2a), darkTrim: mat(0x2b2b2b),
  deck: mat(0x4a3426), deckPlanks: sidingMat(0x7a5840), logPost: mat(0xa07a50), rafter: mat(0x3a2a1e), fence: mat(0x6b4a32),
  logEnds: mat(0x8a5e3c), awning: mat(0x8c8a80),
  skirting: mat(0x6b6458), propane: mat(0xe8e8e2), metal: mat(0x3a3d42), concrete: mat(0x9c988e),
  // Centro de Informação: piso de cima em troncos cor de mel, telhado de telhas de cedro (quentes)
  schoolWood: logMat(0x8a5c3a), schoolRoof: texturedMat('shakes', 0x8f6c4a), fishScale: texturedMat('fishScale', 0xe6d9b4),
  lawn: mat(0x648550), soil: mat(0x4a3a2c), gravel: mat(0x9a9488),
  // quintal: lenha, canoas e mesa de piquenique
  firewood: mat(0x9a6842), canoeRed: mat(0xb0392b), canoeGreen: mat(0x2f5d3a), picnic: mat(0x8a6a4a),
  flowerRed: mat(0xc0392b), flowerYellow: mat(0xe8c440), pole: mat(0xf4f4f0), poleBall: mat(0xd4af37),
  flag: new THREE.MeshStandardMaterial({ map: TEX.flag, color: TEX.flag ? 0xffffff : 0xd52b1e, side: THREE.DoubleSide, roughness: 0.8 }),
  // árvores
  pineNeedles: [mat(0x4f6b35), mat(0x3c5429), mat(0x56703a)],
  pineRed: [mat(0xa0522d), mat(0xb5652e)],          // pinheiros mortos pelo escaravelho (agulhas vermelhas)
  pineBark: [mat(0x8a5a3a), mat(0x6e5a4a)], deadBranch: mat(0x5a4636),
  spruce: [mat(0x2e4a3a), mat(0x253d30)], fir: [mat(0x2c4632), mat(0x33503a)], spruceBark: mat(0x4a3828),
  aspenLeaf: [mat(0xa8c65a), mat(0xc2cf62)], aspenGold: mat(0xe2b93b),
  aspenBark: mat(TEX.aspenBark ? 0xffffff : 0xd8d6c8, { map: TEX.aspenBark }),
  poplarLeaf: mat(0x3f6a3a), poplarSilver: mat(0xa9b896), poplarBark: mat(0x7d7a70),
  birchLeaf: mat(0x9cbf58), birchBark: mat(TEX.birchBark ? 0xffffff : 0xedebe3, { map: TEX.birchBark }),
  // arbustos
  buffalo: mat(0x4e6a3e), buffaloSilver: mat(0xa4ae94), berryRed: mat(0xc8321e, { roughness: 0.4 }),
  juniper: mat(0x4d6b5a), juniperBerry: mat(0x5b6e8c),
  willowStem: mat(0x7a3e2a), willowLeaf: mat(0x7e9466), roseLeaf: mat(0x5e7a45), rosePink: mat(0xe07a9a), roseHip: mat(0xb22a1e),
};

// Telhados das casas: metal vermelho ou verde, telhas de cedro ou cinzentas (cores bem diferentes entre si,
// para a vila não parecer toda igual vista de cima).
const ROOF = {
  red: seamMat(0xa8452f), green: seamMat(0x4f7a5c), cedar: shingleMat(0x8a6a4a), grey: shingleMat(0x7a7870),
};
const ROOFS = [ROOF.red, ROOF.green, ROOF.cedar, ROOF.grey];

// Sombra suave por baixo de cada casa ("sombra de contacto"): um quadrado com um degradê redondo,
// preto no meio e transparente nas pontas. Faz a casa parecer assente no chão.
const CONTACT_SHADOW = {
  geo: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  mat: new THREE.MeshBasicMaterial({
    map: makeTexture(64, 64, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }, false, true),
    color: 0xffffff, transparent: true, depthWrite: false, ...DECAL,
  }),
};

// Cores do chão: prado de montanha, mato baixo, chão de floresta com agulhas, rio glaciar turquesa.
export const palette = {
  grass: 0x72915a, brush: 0x5a6a42, dirt: 0x6b5a44, road: 0x4a4b4d,
  cleared: 0xb4a57a, firebreak: 0x8e7b5c, water: 0x5fb3b0, burned: 0x2a2420,
};

// =====================================================================================
// 5. Peças de casa (paredes, telhados, janelas, chaminés...)
// =====================================================================================
// Liga as sombras em todas as peças. As janelas/portas (marcadas como "decal") não fazem sombra:
// estão coladas à parede, a sombra delas não se via e só dava trabalho extra à placa gráfica.
// A sombra de contacto (userData.noReceiveShadow) também não RECEBE sombras: é só uma mancha escura.
function shadows(group) {
  group.traverse((o) => {
    if (o.isMesh) { o.castShadow = !o.userData.decal; o.receiveShadow = !o.userData.noReceiveShadow; }
  });
  return group;
}

function addMesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

// Caixa com a BASE em y (mais fácil de empilhar: paredes em cima do soco, etc.)
function addBox(group, material, w, h, d, x, y, z) {
  return addMesh(group, boxGeo(w, h, d), material, x, y + h / 2, z);
}

// Soco de pedra inclinado debaixo das paredes
function addPlinth(group, material, w, h, d, z = 0) {
  addMesh(group, G.plinth, material, 0, 0, z).scale.set(w, h, d);
}

// Janela ou porta: um quadradinho plano colado à parede, 0.004 para fora (para não "piscar").
// face = 'front' (+z), 'back' (-z), 'right' (+x), 'left' (-x)
const FACE_TURN = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 };
const FACE_OUT = { front: [0, 1], right: [1, 0], back: [0, -1], left: [-1, 0] };
function addPanel(group, material, w, h, x, y, z, face) {
  const [ox, oz] = FACE_OUT[face];
  const panel = addMesh(group, G.plane, material, x + ox * 0.004, y, z + oz * 0.004);
  panel.rotation.y = FACE_TURN[face];
  panel.scale.set(w, h, 1);
  panel.userData.decal = true;
  return panel;
}

// Aro de janela/porta: 4 ripas (cima, baixo, esquerda, direita) à volta de um buraco de w x h,
// com 0.012 de espessura e 0.012 de fundo. As portas não têm a ripa de baixo (seria a soleira).
// Guardado por tamanho, porque há muitas janelas iguais.
const frameCache = new Map();
function frameGeo(w, h, withBottom) {
  const key = `${w},${h},${withBottom}`;
  if (!frameCache.has(key)) {
    const t = 0.012;
    const bars = [
      { at: [0, h / 2 + t / 2, 0], s: [w + 2 * t, t, t] },     // cima
      { at: [-(w / 2 + t / 2), 0, 0], s: [t, h, t] },          // esquerda
      { at: [w / 2 + t / 2, 0, 0], s: [t, h, t] },             // direita
    ];
    if (withBottom) bars.push({ at: [0, -(h / 2 + t / 2), 0], s: [w + 2 * t, t, t] });   // baixo
    frameCache.set(key, mergeCopies(G.unitBox, bars));
  }
  return frameCache.get(key);
}

// Janela "a sério": o vidro (addPanel) + um aro saliente + um peitoril por baixo.
// Para portas: sill = false (sem peitoril e sem ripa de baixo).
function addWindow(group, material, w, h, x, y, z, face, frameMat = M.trim, sill = true) {
  addPanel(group, material, w, h, x, y, z, face);
  const [ox, oz] = FACE_OUT[face];
  const frame = addMesh(group, frameGeo(w, h, sill), frameMat, x + ox * 0.006, y, z + oz * 0.006);
  frame.rotation.y = FACE_TURN[face];
  if (sill) {
    const ledge = addMesh(group, boxGeo(w + 0.03, 0.012, 0.025), frameMat, x + ox * 0.0125, y - h / 2 - 0.006, z + oz * 0.0125);
    ledge.rotation.y = FACE_TURN[face];
  }
}

// Floreira debaixo de uma janela da frente (parede em z): caixa escura com 3 flores vermelhas/amarelas.
function addFlowerBox(group, w, h, x, y, z) {
  const boxY = y - h / 2 - 0.012 - 0.02;   // logo abaixo do peitoril
  addBox(group, M.rafter, w + 0.01, 0.02, 0.02, x, boxY, z + 0.012);
  [-1, 0, 1].forEach((i) => {
    const flower = addMesh(group, G.bit, i === 0 ? M.flowerYellow : M.flowerRed, x + i * (w / 3), boxY + 0.026, z + 0.012);
    flower.scale.setScalar(0.012);
  });
}

// Telhado de duas águas. A cumeeira (linha do topo) vai ao longo de X; com alongZ: true vai ao longo de Z.
//   span = largura debaixo do telhado, length = comprimento da cumeeira, wallTop = altura onde o telhado começa,
//   pitch = inclinação em graus, overhang = beiral (quanto o telhado sai para fora das paredes).
// Devolve ridgeY = altura da cumeeira.
function addGableRoof(group, o) {
  const pitch = o.pitch * DEG;
  const rise = (o.span / 2) * Math.tan(pitch);           // quanto o telhado sobe
  const overhang = o.overhang;
  const overhangFront = o.overhangFront ?? overhang;
  const thick = o.thick ?? 0.04;
  const trimMat = o.trimMat ?? M.trim;
  const roof = new THREE.Group();
  roof.position.set(o.x ?? 0, o.wallTop, o.z ?? 0);
  if (o.alongZ) roof.rotation.y = Math.PI / 2;
  group.add(roof);

  // o triângulo do sótão (empenas)
  if (o.gableMat) addMesh(roof, prismGeo(o.span, rise), o.gableMat).scale.x = o.length;

  // as duas águas: placas finas inclinadas
  for (const side of [1, -1]) {
    const reach = o.span / 2 + (side === 1 ? overhangFront : overhang);   // da cumeeira até à beira
    const slab = addMesh(roof, boxGeo(o.length + 2 * overhang, thick, reach / Math.cos(pitch)), o.roofMat);
    slab.rotation.x = side * pitch;
    const lift = 0.01 - thick / 2;   // a placa fica por cima do sótão (assim não há faces sobrepostas)
    slab.position.set(0, rise - (reach / 2) * Math.tan(pitch) + lift * Math.cos(pitch), side * (reach / 2 + lift * Math.sin(pitch)));

    // Remates de madeira nas beiras (as trapeiras pequenas não levam):
    if (o.span >= 0.2) {
      // tábua da beira ("fascia") ao longo da parte de baixo do telhado.
      // Com fascia: false não se põe (ex.: o bungalow mostra as pontas das vigas debaixo da beira).
      if (o.fascia !== false) {
        addMesh(roof, boxGeo(o.length + 2 * overhang, 0.035, 0.012), trimMat,
          0, rise - reach * Math.tan(pitch) - 0.0175, side * reach);
      }
      // tábuas da empena ("barge boards") nas duas pontas, com a mesma inclinação da água
      for (const end of [-1, 1]) {
        const barge = addMesh(roof, boxGeo(0.012, 0.035, reach / Math.cos(pitch)), trimMat,
          end * (o.length / 2 + overhang + 0.006), slab.position.y, slab.position.z);
        barge.rotation.x = slab.rotation.x;
      }
    }
  }
  // cobre-junta da cumeeira, um pouco mais escuro do que o telhado
  addMesh(roof, boxGeo(o.length + 2 * overhang, 0.03, 0.05), o.ridgeMat ?? ridgeMaterial(o.roofMat), 0, rise + 0.008, 0);
  return { ridgeY: o.wallTop + rise };
}

// Cópia mais escura (70%) da cor de um telhado, para a cumeeira. Guardada para não repetir.
const ridgeCache = new Map();
function ridgeMaterial(roofMat) {
  if (!ridgeCache.has(roofMat.uuid)) ridgeCache.set(roofMat.uuid, mat(roofMat.color.clone().multiplyScalar(0.7)));
  return ridgeCache.get(roofMat.uuid);
}

// Telhado de uma água (alpendres, trapeiras "shed"): desce de (zBack, yBack) para a frente (zFront, yFront).
function addShedRoof(group, material, w, x, zBack, yBack, zFront, yFront, thick = 0.025) {
  const run = zFront - zBack, drop = yBack - yFront;
  const slab = addMesh(group, boxGeo(w, thick, Math.hypot(run, drop)), material, x, (yBack + yFront) / 2, (zBack + zFront) / 2);
  slab.rotation.x = Math.atan2(drop, run);
  return slab;
}

// Chaminé de pedra (desde o chão até topY) com uma "tampa" escura
function addChimney(group, x, z, topY, size = 0.08) {
  addBox(group, M.stone, size, topY, size, x, 0, z);
  addBox(group, M.chimneyCap, size + 0.02, 0.02, size + 0.02, x, topY, z);
}

// Poste redondo (tronco descascado) entre as alturas y0 e y1
function addPost(group, x, z, y0, y1, radius = 0.012, material = M.logPost) {
  addMesh(group, G.post, material, x, y0, z).scale.set(radius, y1 - y0, radius);
}

// Estrado de alpendre: uma placa fina de tábuas (topo em y=top), assente numa "saia" escura até ao chão
// (assim não parece flutuar). Se stepX não for null, põe 2 degraus à frente (do lado +z) nessa posição x.
function addDeck(group, w, d, x, z, top, stepX = null) {
  const thick = 0.025;
  addBox(group, M.deckPlanks, w, thick, d, x, top - thick, z);
  addBox(group, M.rafter, w - 0.01, top - thick, d - 0.01, x, 0, z);   // saia
  if (stepX !== null) {
    addMesh(group, boxGeo(0.12, top * 0.66, 0.03), M.deckPlanks, stepX, (top * 0.66) / 2, z + d / 2 + 0.015);   // degrau de cima
    addMesh(group, boxGeo(0.12, top * 0.33, 0.03), M.deckPlanks, stepX, (top * 0.33) / 2, z + d / 2 + 0.045);   // degrau de baixo
  }
}

// Corrimão da frente do alpendre (de x0 a x1, em z), com 2 barras e um poste em cada ponta.
function addRail(group, x0, x1, z, top) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  for (const h of [0.05, 0.09]) addMesh(group, boxGeo(len, 0.008, 0.008), M.logPost, cx, top + h, z);
  for (const x of [x0, x1]) addPost(group, x, z, top, top + 0.1, 0.008);
}

// Corrimão ao longo da frente de um alpendre (largura w, centro x), com uma abertura de 0.14 para o degrau.
function addPorchRail(group, w, x, z, top, stepX) {
  const left = x - w / 2 + 0.01, right = x + w / 2 - 0.01;
  const gap0 = stepX - 0.07, gap1 = stepX + 0.07;
  if (gap0 - left > 0.02) addRail(group, left, gap0, z, top);
  if (right - gap1 > 0.02) addRail(group, gap1, right, z, top);
}

// Mísula: pequeno suporte de madeira escura debaixo do beiral (típico do estilo rústico do parque).
// out = para onde aponta: 'x' ou 'z'
function addBracket(group, x, yTop, z, out) {
  const [w, d] = out === 'x' ? [0.04, 0.015] : [0.015, 0.04];
  addBox(group, M.rafter, w, 0.04, d, x, yTop - 0.04, z);
}

// Tábuas de canto creme nas 4 esquinas
function addCornerBoards(group, material, w, d, y0, h) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(group, material, 0.028, h, 0.028, (sx * w) / 2, y0, (sz * d) / 2);
}

// ---- Coisas do quintal (as traseiras e os lados das casas veem-se muito na vista de cima) ----
// Cada função recebe um grupo pequeno já colocado no sítio certo e desenha à volta de (0, 0, 0).
function addWoodpile(prop) {
  addMesh(prop, G.woodpile, M.firewood);
  addMesh(prop, G.woodshedPosts, M.rafter);
  addMesh(prop, boxGeo(0.14, 0.008, 0.12), M.rafter, 0, 0.09, 0);   // telhadinho
}
function addCanoe(prop, rand) {
  addMesh(prop, G.sawhorses, M.rafter);
  addMesh(prop, G.blob, rand() < 0.5 ? M.canoeRed : M.canoeGreen, 0, 0.06, 0).scale.set(0.14, 0.025, 0.035);   // de barriga para cima
}
function addPicnicTable(prop) {
  addMesh(prop, G.picnic, M.picnic);
}
const YARD_PROPS = [addWoodpile, addCanoe, addPicnicTable];

// Põe 0 a 2 coisas do quintal (diferentes) numa faixa da casa.
//   slots = os 2 sítios possíveis [[x, z], [x, z]]; turn = rotação (para as faixas dos lados).
function addYardProps(group, rand, slots, turn = 0) {
  const count = Math.floor(rand() * 3);
  const kinds = [...YARD_PROPS];
  const freeSlots = [...slots];
  for (let i = 0; i < count; i++) {
    const kind = kinds.splice(Math.floor(rand() * kinds.length), 1)[0];
    const [x, z] = freeSlots.splice(Math.floor(rand() * freeSlots.length), 1)[0];
    const prop = new THREE.Group();
    prop.position.set(x, 0, z);
    prop.rotation.y = turn;
    group.add(prop);
    kind(prop, rand);
  }
}

// O terreno da casa: relva aparada, entrada de gravilha para o carro (do lado da rua, +z)
// e uma sombra suave por baixo. footprint = { W, D, z } = tamanho das paredes da casa.
function addLot(group, footprint) {
  addBox(group, M.lawn, 0.86, 0.01, 0.86, 0, 0, 0);
  addBox(group, M.gravel, 0.1, 0.012, 0.17, 0.36, 0, 0.36);
  const shadow = addMesh(group, CONTACT_SHADOW.geo, CONTACT_SHADOW.mat, 0, 0.012, footprint.z ?? 0);
  shadow.scale.set(footprint.W + 0.2, 1, footprint.D + 0.2);
  shadow.renderOrder = 1;
  shadow.userData.keepSeparate = true;   // não juntar com as outras peças (é transparente)
  shadow.userData.decal = true;          // não faz sombra
  shadow.userData.noReceiveShadow = true;
}

// =====================================================================================
// 6. Casas (5 tipos de Jasper). A frente da casa olha para +z.
// =====================================================================================

// Casa 1 — Chalé rústico da "Old Town" (1,5 pisos, o tipo mais comum):
// madeira castanha-escura, telhado íngreme com trapeira, soco e chaminé de pedra, alpendre com troncos.
function buildCottage(rand) {
  const g = new THREE.Group();
  const W = 0.7, D = 0.55, base = 0.08, wallTop = 0.42;
  const walls = sidingMat(pick(rand, [0x8a5c42, 0x8a5c42, 0x9a6a4c, 0x6a8560]));
  const roofMat = pick(rand, ROOFS);
  const win = windowMaterial(pick(rand, ['#E8DCC0', '#E8DCC0', '#3E5B3A']));
  const door = doorMaterial(pick(rand, ['#8C3B2A', '#2F4A3A', '#6B4A32']));
  g.userData.footprint = { W, D };

  addPlinth(g, M.stone, W + 0.06, base, D + 0.06);
  addBox(g, walls, W, wallTop - base, D, 0, base, 0);
  addCornerBoards(g, M.trim, W, D, base, wallTop - base - 0.02);   // um pouco mais baixas, para não furarem o beiral
  const { ridgeY } = addGableRoof(g, { span: D, length: W, wallTop, pitch: 50, overhang: 0.07, roofMat, gableMat: walls });

  // trapeira (janela no telhado) com o seu próprio bico
  const dx = -0.15;
  addBox(g, walls, 0.16, 0.16, 0.26, dx, 0.44, 0.15);
  addGableRoof(g, { span: 0.16, length: 0.26, wallTop: 0.6, pitch: 50, overhang: 0.02, roofMat, gableMat: walls, alongZ: true, x: dx, z: 0.15 });
  addWindow(g, win, 0.07, 0.09, dx, 0.53, 0.28, 'front');

  // porta e janelas (com aro e peitoril)
  addWindow(g, door, 0.09, 0.19, 0.05, base + 0.095, D / 2, 'front', M.trim, false);
  const flowers = rand() < 0.5;   // metade dos chalés tem floreiras nas janelas da frente
  for (const x of [-0.22, 0.26]) {
    addWindow(g, win, 0.08, 0.12, x, 0.26, D / 2, 'front');
    if (flowers) addFlowerBox(g, 0.08, 0.12, x, 0.26, D / 2);
  }
  addWindow(g, win, 0.08, 0.12, 0, 0.26, -D / 2, 'back');
  for (const face of ['left', 'right']) {
    const x = face === 'left' ? -W / 2 : W / 2;
    addWindow(g, win, 0.08, 0.12, x, 0.26, 0.08, face);     // piso de baixo
    addWindow(g, win, 0.07, 0.09, x, 0.53, 0.06, face);     // sótão (na empena)
  }
  // porta das traseiras com um degrau de betão
  addWindow(g, door, 0.09, 0.19, 0.2, base + 0.095, -D / 2, 'back', M.trim, false);
  addBox(g, M.concrete, 0.14, 0.03, 0.08, 0.2, 0, -D / 2 - 0.04);

  // chaminé de pedra encostada à empena direita
  addChimney(g, W / 2 + 0.04, -0.12, ridgeY + 0.12);

  // alpendre: estrado de tábuas, 2 postes de tronco, corrimão e um telhadinho
  addDeck(g, 0.3, 0.13, 0.05, D / 2 + 0.065, 0.07, 0.05);
  addPorchRail(g, 0.3, 0.05, D / 2 + 0.12, 0.07, 0.05);
  addPost(g, -0.08, D / 2 + 0.115, 0.07, 0.31);
  addPost(g, 0.18, D / 2 + 0.115, 0.07, 0.31);
  addShedRoof(g, roofMat, 0.32, 0.05, D / 2 - 0.01, 0.35, D / 2 + 0.15, 0.3);

  if (rand() < 0.35) addMesh(g, G.fence, M.fence, -0.44, 0, 0);   // vedação do quintal
  addYardProps(g, rand, [[-0.27, -0.37], [-0.03, -0.37]]);         // só do lado esquerdo (à direita está a porta de trás)
  return g;
}

// Casa 2 — Bungalow verde de tábua-e-ripa: a empena vira-se para a rua, alpendre a toda a largura
// debaixo do telhado, remates cor de ferrugem, escamas creme no bico e pontas das vigas à vista.
function buildBungalow(rand) {
  const g = new THREE.Group();
  const W = 0.6, base = 0.06, wallTop = 0.38;
  const zBack = -0.39, zFront = 0.21, zPorch = 0.37;     // parede de trás, parede da frente, beira do alpendre
  const wallD = zFront - zBack, wallZ = (zFront + zBack) / 2;
  const walls = battenMat(pick(rand, [0x5f7a55, 0x5f7a55, 0x6b8660, 0x8a979c]));   // verde-floresta discreto
  const useRust = rand() < 0.7;
  const trim = useRust ? M.trimRust : M.trim;
  const trimCss = useRust ? '#8C3B2A' : '#E8DCC0';
  const roofMat = pick(rand, [shingleMat(0x86847c), shingleMat(0x74726a), ROOF.cedar]);
  g.userData.footprint = { W, D: wallD, z: wallZ };

  addPlinth(g, M.stoneDark, W + 0.05, base, wallD + 0.05, wallZ);
  addBox(g, walls, W, wallTop - base, wallD, 0, base, wallZ);
  const { ridgeY } = addGableRoof(g, {
    span: W, length: zPorch - zBack, wallTop, pitch: 40, overhang: 0.05, roofMat, gableMat: walls,
    alongZ: true, z: (zPorch + zBack) / 2,
    fascia: false,   // sem tábua na beira: assim vêem-se as pontas das vigas (marca do estilo Craftsman)
  });
  const rise = ridgeY - wallTop;
  // escamas creme no bico da empena da frente
  const peak = addMesh(g, prismGeo(W * 0.52, rise * 0.52), M.fishScale, 0, wallTop + rise * 0.48, zPorch + 0.002);
  peak.rotation.y = Math.PI / 2;
  peak.scale.x = 0.012;
  addWindow(g, windowMaterial(trimCss), 0.06, 0.07, 0, 0.45, zPorch, 'front');

  // alpendre aberto: estrado, viga e 2 postes quadrados
  addDeck(g, W, zPorch - zFront, 0, (zFront + zPorch) / 2, base, 0.13);
  addBox(g, trim, W, 0.03, 0.03, 0, wallTop - 0.03, zPorch - 0.02);
  for (const sx of [-1, 1]) addBox(g, trim, 0.03, wallTop - 0.03 - base, 0.03, sx * (W / 2 - 0.02), base, zPorch - 0.02);

  // porta, janela dupla na frente, janelas dos lados
  addWindow(g, doorMaterial(pick(rand, ['#8C3B2A', '#6B4A32'])), 0.09, 0.19, 0.13, base + 0.095, zFront, 'front', M.trim, false);
  addWindow(g, windowMaterial(trimCss, 4, 2), 0.15, 0.12, -0.13, 0.24, zFront, 'front');
  const sideWin = windowMaterial(trimCss);
  for (const z of [-0.24, 0.04]) {
    addWindow(g, sideWin, 0.08, 0.12, W / 2, 0.24, z, 'right');
    addWindow(g, sideWin, 0.08, 0.12, -W / 2, 0.24, z, 'left');
  }

  addMesh(g, G.rafters, M.rafter);                                           // pontas das vigas
  if (rand() < 0.5) addPost(g, 0.12, -0.2, 0.5, 0.66, 0.012, M.metal);      // chaminé de salamandra (tubo)
  if (rand() < 0.35) addMesh(g, G.fence, M.fence, -0.44, 0, 0);
  // coisas do quintal na faixa da esquerda (só se não houver vedação)
  else addYardProps(g, rand, [[-0.37, -0.17], [-0.37, 0.17]], Math.PI / 2);
  return g;
}

// Casa 3 — Cabana de troncos (casa de património): troncos cor de mel com juntas escuras,
// pontas dos troncos a sair nos cantos, telhado de metal muito íngreme, alpendre a toda a frente
// e chaminé de pedra por fora da parede lateral.
function buildLogCabin(rand) {
  const g = new THREE.Group();
  const { W, D, base, wallTop } = CABIN;   // medidas definidas lá em cima, junto dos cantos de troncos
  const logs = logMat(pick(rand, [0x9a6842, 0x8e5e3a, 0xa8764a]));
  const roofMat = pick(rand, [ROOF.red, ROOF.red, ROOF.green]);
  const win = windowMaterial(pick(rand, ['#E8DCC0', '#3E5B3A']));
  g.userData.footprint = { W, D };

  addPlinth(g, M.stone, W + 0.05, base, D + 0.05);
  // "miolo" da parede (tapa os buracos entre os troncos) + os troncos redondos à volta
  addBox(g, logs, W - 0.03, wallTop - base, D - 0.03, 0, base, 0);
  addMesh(g, G.cabinLogs, logs);
  // pontas dos troncos cruzados nos 4 cantos (já feitas numa só geometria, G.logCorners)
  addMesh(g, G.logCorners, M.logEnds);
  // telhado sem beiral à frente: o alpendre continua-o. Remates escuros (fica bem com os troncos).
  const { ridgeY } = addGableRoof(g, { span: D, length: W, wallTop, pitch: 55, overhang: 0.06, overhangFront: 0, roofMat, gableMat: logs, trimMat: M.rafter });

  // alpendre a toda a largura, com corrimão
  addDeck(g, W, 0.16, 0, D / 2 + 0.08, base, -0.1);
  addPorchRail(g, W, 0, D / 2 + 0.15, base, -0.1);
  addShedRoof(g, roofMat, W + 0.12, 0, D / 2 - 0.02, 0.38, D / 2 + 0.17, 0.31);
  addPost(g, -0.28, D / 2 + 0.14, base, 0.32, 0.014);
  addPost(g, 0.28, D / 2 + 0.14, base, 0.32, 0.014);

  // janelas e porta à face dos troncos (que saem 0.012 para fora da parede)
  const front = D / 2 + 0.012, side = W / 2 + 0.012;
  addWindow(g, doorMaterial(pick(rand, ['#5A3B26', '#2F4A3A'])), 0.09, 0.18, -0.1, base + 0.09, front, 'front', M.trim, false);
  addWindow(g, win, 0.09, 0.11, 0.15, 0.22, front, 'front');
  if (rand() < 0.5) addFlowerBox(g, 0.09, 0.11, 0.15, 0.22, front);
  addWindow(g, win, 0.08, 0.1, side, 0.22, -0.05, 'right');
  addWindow(g, win, 0.06, 0.08, W / 2, 0.46, 0, 'right');       // sótão (na empena, que não tem troncos)
  addWindow(g, win, 0.06, 0.08, -W / 2, 0.46, 0.08, 'left');
  addWindow(g, win, 0.08, 0.1, 0, 0.22, -front, 'back');

  addChimney(g, -(W / 2 + 0.045), -0.1, ridgeY + 0.09, 0.09);
  addYardProps(g, rand, [[-0.17, -0.37], [0.17, -0.37]]);
  return g;
}

// Casa 4 — Duplex novo (reconstrução depois de 2024): 2 pisos, mas o de cima fica DENTRO do telhado
// (regra de Jasper: o telhado é pelo menos 1/3 da altura). Faixa de pedra em baixo, fibrocimento a imitar
// madeira, telhado de metal cinzento-carvão, 2 trapeiras "shed" com as janelas do piso de cima,
// 2 portas (azul-petróleo ou bronze), cada uma com um alpendre pequeno de 2 postes.
function buildDuplex(rand) {
  const g = new THREE.Group();
  const W = 0.76, D = 0.52, stoneTop = 0.12, wallTop = 0.4;
  const siding = sidingMat(pick(rand, [0xb4a386, 0x6a767c, 0x9c8e78]));
  const roofMat = seamMat(0x5f6368);
  const win = windowMaterial('#2B2B2B');
  const wideWin = windowMaterial('#2B2B2B', 3, 1);
  const door = doorMaterial(pick(rand, ['#2F5D5A', '#6B4F2E']));
  const front = D / 2 + 0.006;
  const dark = M.darkTrim;   // aros pretos (estilo moderno)
  g.userData.footprint = { W, D };

  addBox(g, M.veneer, W + 0.012, stoneTop, D + 0.012, 0, 0, 0);                // faixa de pedra
  addBox(g, siding, W, wallTop - stoneTop, D, 0, stoneTop, 0);
  addBox(g, M.darkTrim, W + 0.02, 0.015, D + 0.02, 0, stoneTop - 0.005, 0);    // remate entre pedra e madeira
  addBox(g, M.darkTrim, 0.012, wallTop - stoneTop, D + 0.008, 0, stoneTop, 0); // divisão entre as 2 casas
  addGableRoof(g, { span: D, length: W, wallTop, pitch: 50, overhang: 0.05, roofMat, gableMat: siding });

  for (const sx of [-1, 1]) {
    const dx = sx * 0.19;
    // trapeira "shed" = caixa + "cunha" por cima (fecha os lados) + telhado de uma água
    addBox(g, siding, 0.22, 0.22, 0.22, dx, 0.385, 0.14);
    addMesh(g, prismGeo(0.22, 0.072, -0.5), siding, dx, 0.605, 0.14).scale.x = 0.22;
    addShedRoof(g, roofMat, 0.26, dx, 0, 0.7, 0.31, 0.6);
    addWindow(g, wideWin, 0.15, 0.1, dx, 0.5, 0.25, 'front', dark);          // janela do piso de cima
    // porta, alpendre (2 postes + telhadinho) e degrau de betão
    const doorX = sx * 0.12;
    addWindow(g, door, 0.09, 0.2, doorX, 0.1, front, 'front', dark, false);
    addShedRoof(g, roofMat, 0.16, doorX, D / 2, 0.26, D / 2 + 0.1, 0.235, 0.015);
    addBox(g, M.concrete, 0.16, 0.025, 0.1, doorX, 0, D / 2 + 0.05);
    for (const px of [-0.065, 0.065]) addPost(g, doorX + px, D / 2 + 0.085, 0.025, 0.24, 0.012);
    // janelas do rés-do-chão
    addWindow(g, win, 0.09, 0.11, sx * 0.27, 0.19, D / 2, 'front', dark);
    addWindow(g, win, 0.08, 0.11, sx * (W / 2), 0.2, -0.1, sx === 1 ? 'right' : 'left', dark);
    addWindow(g, win, 0.07, 0.09, sx * (W / 2), 0.5, 0, sx === 1 ? 'right' : 'left', dark);   // sótão, na empena
    addWindow(g, win, 0.09, 0.11, dx, 0.2, -D / 2, 'back', dark);
  }
  addPost(g, 0.25, -0.12, 0.55, 0.76, 0.014, M.darkTrim);    // tubo de exaustão em metal
  addYardProps(g, rand, [[-0.17, -0.37], [0.17, -0.37]]);
  return g;
}

// Casa 5 — Casa móvel do parque de Cabin Creek (o bairro de casas móveis que ardeu):
// caixa comprida e baixa, telhado quase plano, saia escura em baixo, deque de madeira com degrau.
function buildMobileHome(rand) {
  const g = new THREE.Group();
  const W = 0.8, D = 0.34, z0 = -0.07, skirt = 0.05, wallTop = 0.25;
  const front = z0 + D / 2;
  const walls = vinylMat(pick(rand, [0xd6c7a4, 0xa6b496, 0xc4bdab]));   // bege, verde-claro, cinzento-bege
  const roofMat = seamMat(pick(rand, [0xc4c2b8, 0x9a9a92]));
  const win = windowMaterial('#D8D8D0', 2, 1);
  const dark = M.darkTrim;
  g.userData.footprint = { W, D, z: z0 };

  addBox(g, M.skirting, W - 0.02, skirt, D - 0.02, 0, 0, z0);
  addBox(g, walls, W, wallTop - skirt, D, 0, skirt, z0);
  addBox(g, pick(rand, [M.trimRust, M.deck, M.fence]), W + 0.008, 0.015, D + 0.008, 0, 0.105, z0);   // risca colorida (por baixo das janelas)
  addGableRoof(g, { span: D, length: W, wallTop, pitch: 18, overhang: 0.03, roofMat, gableMat: walls, thick: 0.02, z: z0 });

  // deque com degrau, palinha por cima da porta
  addDeck(g, 0.26, 0.14, 0.17, front + 0.07, skirt, 0.17);
  addShedRoof(g, roofMat, 0.26, 0.17, front, 0.245, front + 0.15, 0.225, 0.015);
  addPost(g, 0.06, front + 0.13, skirt, 0.23, 0.007, M.trim);
  addPost(g, 0.28, front + 0.13, skirt, 0.23, 0.007, M.trim);

  addWindow(g, doorMaterial(pick(rand, ['#F2EEE2', '#6B4A32'])), 0.07, 0.15, 0.17, skirt + 0.075, front, 'front', dark, false);
  addWindow(g, win, 0.11, 0.07, -0.28, 0.165, front, 'front', dark);
  addWindow(g, win, 0.11, 0.07, -0.08, 0.165, front, 'front', dark);
  // palas de alumínio por cima das janelas da frente (muito típicas das casas móveis)
  for (const x of [-0.28, -0.08]) addBox(g, M.awning, 0.13, 0.01, 0.03, x, 0.212, front + 0.015);
  addWindow(g, win, 0.08, 0.07, W / 2, 0.165, z0, 'right', dark);
  addWindow(g, win, 0.08, 0.07, -W / 2, 0.165, z0, 'left', dark);
  addWindow(g, win, 0.11, 0.07, 0, 0.165, z0 - D / 2, 'back', dark);

  // botija de gás (propano) deitada ao lado da casa
  const tank = addMesh(g, G.post, M.propane, -0.33, 0.035, front + 0.04);
  tank.rotation.z = Math.PI / 2;
  tank.scale.set(0.032, 0.1, 0.032);
  addYardProps(g, rand, [[-0.17, -0.37], [0.17, -0.37]]);
  return g;
}

export function buildHouse(rand) {
  const r = rand();
  let house;
  if (r < 0.3) house = buildCottage(rand);
  else if (r < 0.52) house = buildBungalow(rand);
  else if (r < 0.7) house = buildLogCabin(rand);
  else if (r < 0.85) house = buildDuplex(rand);
  else house = buildMobileHome(rand);
  // Não rodamos a casa ao acaso: em Jasper as casas olham todas para a rua, por isso a frente
  // (porta e alpendre) fica sempre virada para +z. Quem monta a vila pode rodá-la para a estrada.
  addLot(house, house.userData.footprint);   // relva, entrada de gravilha e sombra suave
  mergeByMaterial(house);                    // juntar peças iguais = desenhar mais depressa
  return shadows(house);
}

// =====================================================================================
// 7. "Escola" = Centro de Informação do Parque de Jasper (1913-14, arquiteto A.M. Calderon)
//    Pedra em baixo, madeira escura em cima, vários bicos no telhado (como montanhas),
//    torre com telhado em pirâmide, alpendre de troncos, relvado com canteiros e bandeira do Canadá.
// =====================================================================================
export function buildSchool(rand) {
  const g = new THREE.Group();
  addBox(g, M.lawn, 0.9, 0.012, 0.9, 0, 0, 0);    // relvado aparado

  // Bloco principal (comprido e baixo, como um pavilhão de montanha): rés-do-chão em pedra,
  // cornija creme, meio piso de cima em troncos escuros, telhado muito inclinado.
  const MW = 0.64, MD = 0.4;
  const upperFront = MD / 2 - 0.01;   // a parede de cima é um bocadinho mais estreita
  addBox(g, M.schoolStone, MW, 0.28, MD, 0, 0, 0);
  addBox(g, M.trim, MW + 0.012, 0.02, MD + 0.012, 0, 0.28, 0);
  addBox(g, M.schoolWood, MW - 0.02, 0.14, MD - 0.02, 0, 0.3, 0);   // meio piso de troncos (baixo, para o telhado dominar)
  const { ridgeY } = addGableRoof(g, { span: MD - 0.02, length: MW - 0.02, wallTop: 0.44, pitch: 55, overhang: 0.05, roofMat: M.schoolRoof, gableMat: M.schoolWood });

  // 2 trapeiras com bico + 1 trapeira "shed" no meio (os "bicos de montanha" do telhado)
  const dormerZ = upperFront - 0.0875;   // trapeira com 0.175 de fundo, a face rente à parede
  const dormerWin = windowMaterial('#E5D8B8');
  for (const dx of [-0.17, 0.17]) {
    addBox(g, M.schoolWood, 0.11, 0.13, 0.175, dx, 0.42, dormerZ);
    addGableRoof(g, { span: 0.11, length: 0.175, wallTop: 0.55, pitch: 55, overhang: 0.015, roofMat: M.schoolRoof, gableMat: M.schoolWood, alongZ: true, x: dx, z: dormerZ });
    addWindow(g, dormerWin, 0.06, 0.07, dx, 0.485, upperFront, 'front');
  }
  addBox(g, M.schoolWood, 0.13, 0.125, 0.175, 0, 0.42, dormerZ);
  addShedRoof(g, M.schoolRoof, 0.16, 0, -0.01, 0.6, upperFront + 0.03, 0.54);
  addWindow(g, windowMaterial('#E5D8B8', 3, 1), 0.1, 0.06, 0, 0.485, upperFront, 'front');

  // Ala de 2 pisos a noroeste, com telhado em pirâmide baixa (mesma inclinação do telhado principal)
  const tx = -0.29, tz = -0.2;
  addBox(g, M.schoolStone, 0.24, 0.28, 0.24, tx, 0, tz);
  addBox(g, M.trim, 0.252, 0.02, 0.252, tx, 0.28, tz);
  addBox(g, M.schoolWood, 0.23, 0.26, 0.23, tx, 0.3, tz);
  addMesh(g, G.pyramid, M.schoolRoof, tx, 0.56, tz).scale.set(0.32, 0.21, 0.32);   // beiral de 0.04 à volta
  // mísulas de madeira escura debaixo do beiral da ala e das empenas
  for (const d of [-0.07, 0.07]) {
    addBracket(g, tx - 0.135, 0.56, tz + d, 'x');      // lado esquerdo da ala
    addBracket(g, tx + d, 0.56, tz - 0.135, 'z');      // traseira da ala
  }
  addBracket(g, MW / 2 + 0.005, 0.49, 0.15, 'x');       // empena direita
  addBracket(g, -MW / 2 - 0.005, 0.49, 0.15, 'x');      // empena esquerda

  // Ala de 1 piso a sudeste, com bico virado para a frente
  const wx = 0.3, wz = 0.19;
  addBox(g, M.schoolStone, 0.22, 0.24, 0.22, wx, 0, wz);
  addGableRoof(g, { span: 0.22, length: 0.22, wallTop: 0.24, pitch: 50, overhang: 0.02, roofMat: M.schoolRoof, gableMat: M.schoolWood, alongZ: true, x: wx, z: wz });

  // Janelas todas diferentes (aros verde-escuro e creme, muitos vidrinhos)
  const green33 = windowMaterial('#2F4A3A', 3, 3), green32 = windowMaterial('#2F4A3A', 3, 2);
  const cream = windowMaterial('#E5D8B8'), green = windowMaterial('#2F4A3A');
  addWindow(g, green33, 0.11, 0.13, 0.1, 0.15, MD / 2, 'front');
  addWindow(g, cream, 0.07, 0.12, -0.27, 0.15, MD / 2, 'front');
  // (o piso de cima da frente não leva janelas: ficavam escondidas pela beira do telhado;
  //  as janelas desse piso estão nas trapeiras)
  addWindow(g, green32, 0.12, 0.1, wx, 0.13, wz + 0.11, 'front');       // ala sudeste
  addWindow(g, green, 0.08, 0.1, wx + 0.11, 0.13, wz, 'right');
  addWindow(g, green, 0.07, 0.12, MW / 2, 0.15, 0.025, 'right');        // entre a chaminé e a ala
  addWindow(g, cream, 0.07, 0.09, MW / 2 - 0.01, 0.37, 0.025, 'right');
  addWindow(g, green, 0.08, 0.12, -MW / 2, 0.15, 0.08, 'left');
  addWindow(g, cream, 0.07, 0.09, -MW / 2 + 0.01, 0.37, 0.08, 'left');
  addWindow(g, green33, 0.11, 0.13, 0.05, 0.15, -MD / 2, 'back');
  addWindow(g, green, 0.07, 0.1, tx - 0.12, 0.15, tz, 'left');          // ala noroeste
  addWindow(g, cream, 0.06, 0.1, tx - 0.115, 0.43, tz, 'left');
  addWindow(g, cream, 0.06, 0.1, tx, 0.43, tz - 0.115, 'back');

  // Grande chaminé de pedra (lá dentro há uma lareira de pedra enorme)
  addChimney(g, 0.36, -0.08, ridgeY + 0.08, 0.08);

  // Alpendre de troncos descascados com a porta de entrada
  addDeck(g, 0.22, 0.12, -0.09, MD / 2 + 0.06, 0.04, -0.09);
  addPost(g, -0.19, MD / 2 + 0.105, 0.04, 0.27, 0.013);
  addPost(g, 0.01, MD / 2 + 0.105, 0.04, 0.27, 0.013);
  addShedRoof(g, M.schoolRoof, 0.26, -0.09, MD / 2 - 0.01, 0.31, MD / 2 + 0.14, 0.26);
  addWindow(g, doorMaterial('#5A3B26'), 0.09, 0.19, -0.09, 0.135, MD / 2, 'front', M.trim, false);
  addBox(g, M.gravel, 0.09, 0.008, 0.08, -0.09, 0.012, 0.4);          // caminho de gravilha

  // Placa junto ao caminho: 2 postes, tabuleta creme com moldura escura por trás
  for (const x of [0.18, 0.32]) addPost(g, x, 0.4, 0, 0.1, 0.008);
  addMesh(g, boxGeo(0.17, 0.055, 0.008), M.rafter, 0.25, 0.075, 0.4);
  addMesh(g, boxGeo(0.16, 0.045, 0.012), M.trim, 0.25, 0.075, 0.41);

  // Canteiros de flores vermelhas e amarelas
  addBox(g, M.soil, 0.16, 0.02, 0.05, 0.1, 0.012, MD / 2 + 0.035);
  addMesh(g, G.flowers, M.flowerRed, 0.1, 0.032, MD / 2 + 0.035);
  addBox(g, M.soil, 0.16, 0.02, 0.05, wx, 0.012, 0.36);
  addMesh(g, G.flowers, M.flowerYellow, wx, 0.032, 0.36);

  // Mastro branco com a bandeira do Canadá, que ondula
  const px = -0.37, pz = 0.36;
  addPost(g, px, pz, 0.012, 1.1, 0.009, M.pole);
  addMesh(g, G.blob, M.poleBall, px, 1.11, pz).scale.setScalar(0.016);
  const flagGeo = new THREE.PlaneGeometry(0.22, 0.11, 10, 1).translate(0.11, 0, 0);   // cada escola tem a sua (porque mexe)
  addMesh(g, flagGeo, M.flag, px + 0.009, 1.03, pz).userData.keepSeparate = true;   // mexe: não se junta
  const flagPos = flagGeo.attributes.position;
  const phase = rand() * 6;
  g.userData.animate = (t) => {
    for (let i = 0; i < flagPos.count; i++) {
      const x = flagPos.getX(i);   // distância ao mastro: quanto mais longe, mais ondula
      flagPos.setZ(i, Math.sin(x * 30 - t * 5 + phase) * 0.018 * (x / 0.22));
    }
    flagPos.needsUpdate = true;
  };
  mergeByMaterial(g);   // juntar peças iguais (a bandeira fica de fora)
  return shadows(g);
}

// =====================================================================================
// 8. Árvores. Cada árvore fica num grupo interior ("tree") que pode inclinar um pouco,
//    porque o main.js usa a rotação do grupo de fora para as fazer balançar.
// =====================================================================================

// Pinheiro-lodgepole (o combustível principal do fogo de 2024): tronco alto, direito e nu,
// com ramos secos partidos, e uma copa estreita e esfarrapada só no topo.
// Às vezes está morto pelo escaravelho do pinheiro (agulhas vermelhas) — havia muitos à volta de Jasper.
// Altura até 1.3 (o limite do contrato): continua mais alto do que as casas (cumeeira ~0.7-0.95).
function buildLodgepolePine(rand) {
  const tree = new THREE.Group();
  const H = between(rand, 1.08, 1.3);
  addMesh(tree, G.trunk, pick(rand, M.pineBark)).scale.set(0.03, H * 0.9, 0.03);
  addMesh(tree, pick(rand, G.pineStubs), M.deadBranch).scale.set(1, H, 1);
  const needles = rand() < 0.15 ? pick(rand, M.pineRed) : pick(rand, M.pineNeedles);
  const s = (H * 0.42) / 0.59;             // a copa (0.59 de altura) ocupa os 42% de cima
  const crown = addMesh(tree, pick(rand, CROWNS.pine), needles, 0, H - 0.59 * s, 0);
  const wide = between(rand, 1.05, 1.35);
  crown.scale.set(s * wide, s, s * wide);
  return tree;
}

// Abeto (Engelmann / branco): agulha densa desde quase o chão, verde-azulado escuro.
function buildSpruce(rand) {
  const tree = new THREE.Group();
  const s = between(rand, 1.0, 1.3) / 1.27;
  addMesh(tree, G.trunk, M.spruceBark).scale.set(0.035, 0.3, 0.035);
  const crown = addMesh(tree, pick(rand, CROWNS.spruce), pick(rand, M.spruce));
  const wide = between(rand, 0.85, 1.1);
  crown.scale.set(s * wide, s, s * wide);
  return tree;
}

// Abeto-subalpino: coluna muito estreita e bicuda.
function buildFir(rand) {
  const tree = new THREE.Group();
  const s = between(rand, 1.0, 1.3) / 1.12;
  addMesh(tree, G.trunk, M.spruceBark).scale.set(0.03, 0.2, 0.03);
  addMesh(tree, CROWNS.fir[0], pick(rand, M.fir)).scale.set(s, s, s);
  return tree;
}

// Álamo-tremedor: tronco quase branco com "olhos" pretos, copa amarelo-esverdeada (dourada no outono).
// Arde menos — serve de corta-fogo natural.
function buildAspen(rand) {
  const tree = new THREE.Group();
  const H = between(rand, 1.0, 1.25);
  addMesh(tree, G.trunk, M.aspenBark).scale.set(0.03, H * 0.8, 0.03);
  // O fogo foi em julho (verão): quase todos verde-amarelados; só 3% já dourados (árvore com sede).
  const leaves = rand() < 0.03 ? M.aspenGold : pick(rand, M.aspenLeaf);
  const s = H;                               // a copa (~0.5 de altura) ocupa a metade de cima
  addMesh(tree, pick(rand, CROWNS.aspen), leaves, 0, H - 0.34 * s, 0).scale.setScalar(s);
  return tree;
}

// Choupo-bálsamo (junto ao rio): tronco cinzento grosso, copa larga verde-escura com reflexos prateados.
function buildPoplar(rand) {
  const tree = new THREE.Group();
  const H = between(rand, 1.05, 1.25);
  addMesh(tree, G.trunk, M.poplarBark).scale.set(0.045, H * 0.65, 0.045);
  const s = (H * 0.55) / 0.63;
  const y = H - 0.43 * s;
  addMesh(tree, pick(rand, CROWNS.poplar), M.poplarLeaf, 0, y, 0).scale.setScalar(s);
  addMesh(tree, CROWNS.poplarSilver, M.poplarSilver, 0, y, 0).scale.setScalar(s);   // folhinhas prateadas
  return tree;
}

// Bétula-de-papel: dois troncos brancos com riscas escuras, copa oval.
function buildBirch(rand) {
  const tree = new THREE.Group();
  const H = between(rand, 0.9, 1.05);
  for (const side of [-1, 1]) {
    const stem = addMesh(tree, G.trunk, M.birchBark, side * 0.03, 0, 0);
    stem.scale.set(0.022, H * 0.8, 0.022);
    stem.rotation.z = -side * 0.08;
  }
  const s = (H * 0.5) / 0.55;
  addMesh(tree, CROWNS.birch[0], M.birchLeaf, 0, H - 0.33 * s, 0).scale.setScalar(s);
  return tree;
}

export function buildTree(kind, rand) {
  const g = new THREE.Group();
  const r = rand();
  let tree;
  if (kind === 'conifer') tree = r < 0.5 ? buildLodgepolePine(rand) : r < 0.83 ? buildSpruce(rand) : buildFir(rand);
  else tree = r < 0.55 ? buildAspen(rand) : r < 0.8 ? buildPoplar(rand) : buildBirch(rand);
  tree.rotation.x = (rand() - 0.5) * 0.08;   // inclinação natural
  tree.rotation.z = (rand() - 0.5) * 0.08;
  g.add(tree);
  return shadows(g);
}

// =====================================================================================
// 9. Arbustos
// =====================================================================================
export function buildBush(rand) {
  const g = new THREE.Group();
  const bush = new THREE.Group();
  // Um só número ao acaso decide o tipo: 50% shepherdia, 30% zimbro, 10% salgueiro, 10% rosa-silvestre.
  const r = rand();
  if (r < 0.5) {
    // Shepherdia (buffaloberry), o arbusto mais comum: verde-escuro, folhas prateadas por baixo, bagas vermelhas
    addMesh(bush, BUSHES.buffalo, M.buffalo);
    addMesh(bush, pick(rand, BUSHES.buffaloSilver), M.buffaloSilver);
    addMesh(bush, pick(rand, BUSHES.buffaloBerries), M.berryRed);
  } else if (r < 0.8) {
    // Zimbro-comum: tapete baixo e espalhado, verde-azulado, com bagas azuis
    addMesh(bush, BUSHES.juniper, M.juniper);
    addMesh(bush, pick(rand, BUSHES.juniperBerries), M.juniperBerry);
  } else if (r < 0.9) {
    // Salgueiro (sítios húmidos): moita em vaso de caules avermelhados e folhas estreitas cinzento-verdes
    const willow = pick(rand, BUSHES.willow);
    addMesh(bush, willow.stems, M.willowStem);
    addMesh(bush, willow.leaves, M.willowLeaf);
  } else {
    // Rosa-silvestre: flores cor-de-rosa e bagas vermelhas
    addMesh(bush, BUSHES.rose, M.roseLeaf);
    addMesh(bush, BUSHES.roseFlowers, M.rosePink);
    addMesh(bush, BUSHES.roseHips, M.roseHip);
  }
  bush.scale.setScalar(between(rand, 0.85, 1.2));
  g.add(bush);
  return shadows(g);
}
