// O CHÃO da vila: um terreno contínuo (nada de "tabuleiro de quadradinhos").
//   - relevo suave, a partir de village.heights (0-9 em cada quadrado);
//   - cores que se misturam devagar entre tipos de chão, com manchas (nada de bordas quadradas);
//   - estradas como fitas bem marcadas, pousadas por cima do relevo;
//   - rio: o leito é mais fundo e a água é uma superfície própria, mais baixa e a ondular;
//   - a borda da "ilha" é irregular, com uma ribanceira com camadas de terra e rocha.
// Só desenha. As regras (o que arde, etc.) estão em src/sim.
//
// API (o que o resto do jogo pode usar):
//   const terrain = createTerrain(scene, village, palette, options)
//                                     options.verticalScale = quanto sobe cada nível de altura
//                                     (por omissão LEVEL_HEIGHT; o nível pode pedir mais relevo)
//                                     options.uplift = { above, factor, top? } (opcional, só desenho):
//                                     os níveis entre `above` e `top` (9) sobem `factor` vezes mais depressa
//                                     (a serra fica mais íngreme por trás da vila; as regras não mudam)
//                                     options.cliff = false -> sem ribanceira (quando há cenário à
//                                     volta, o chão continua para lá do mapa e não há "ilha")
//   terrain.groundHeight(x, y)     -> altura do chão (unidades 3D) no CENTRO do quadrado (x, y).
//                                     Nos quadrados de água devolve a altura da superfície da água.
//   terrain.heightAtWorld(wx, wz)  -> altura do chão num ponto qualquer do mundo (para pôr árvores)
//   terrain.colourAtWorld(wx, wz, out) -> a cor do chão nesse ponto (o cenário usa-a junto à borda)
//   terrain.setSurface(x, y, type) -> muda o aspeto do chão num quadrado
//                                     (um tipo de quadrado, ou 'burned' = carvão preto e cinza)
//   terrain.pickTile(raycaster)    -> {x, y} do quadrado onde o "raio" bate, ou null
//   terrain.update(t)              -> anima a água; chamar a cada desenho
//   terrain.levelHeight, terrain.baseY -> a escala vertical usada (para o cenário à volta, backdrop.js)
//   terrain.levelToY(level)        -> a altura no mundo de um nível (0-9, ou mais), já com o uplift
//
// Coordenadas: o quadrado (x, y) tem o centro no mundo em (x - halfX, ?, y - halfZ).
// Dentro deste ficheiro também usamos "coordenadas de quadrado" (gx, gy): números com vírgula,
// em que o centro do quadrado (3, 5) é exatamente gx = 3, gy = 5.
import * as THREE from 'three';

// ---------- Números que mandam no aspeto (podes mexer!) ----------
const LEVEL_HEIGHT = 0.28;  // cada nível de altura (0-9) sobe 0.28 unidades (9 níveis = 2.5)
                            // (é o valor por omissão: um nível pode pedir outro com "terrainScale")
const BASE_Y = 0.25;        // altura do chão no nível 0 (igual ao topo dos antigos blocos)
const STEPS = 4;            // cada quadrado é dividido em 4 x 4 bocadinhos
const RIVER_DEPTH = 0.42;   // quanto o leito do rio é mais fundo que a margem
const WATER_BELOW = 0.2;    // a superfície da água fica 0.2 abaixo da margem
const ROAD_WIDTH = 0.5;     // largura da estrada fora da vila (o quadrado tem 1)
const STREET_WIDTH = 0.4;   // largura da rua na vila (com passeio de cada lado)
const SIDEWALK = 0.08;      // largura de cada passeio
const CLIFF_BOTTOM = -1.7;  // até onde desce a ribanceira da ilha
const CHARCOAL = 0x141518;  // cor do carvão (queimado), um pouco azulada: nunca castanha
const ASH = 0x9a9ea3;       // cor da cinza (queimado): cinzento frio

// =====================================================================================
// 1. Pequenas ferramentas de matemática
// =====================================================================================
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (t) => t * t * (3 - 2 * t); // curva em "S": começa e acaba devagar

// Número "aleatório" FIXO para cada ponto inteiro (ix, iy): sai sempre o mesmo. Entre 0 e 1.
function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// "Ruído suave": como o hash, mas muda devagar de um ponto para o vizinho (dá manchas e ondulações).
// Devolve um número entre 0 e 1.
function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const top = lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx);
  const bottom = lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx);
  return lerp(top, bottom, fy);
}

// Cor a partir de um número hexadecimal (ex.: 0x79b94f).
const color = (hex) => new THREE.Color(hex);
// Mistura duas cores: t = 0 dá a primeira, t = 1 dá a segunda.
const mixHex = (a, b, t) => color(a).lerp(color(b), t);
// Escurece (f < 1) ou clareia (f > 1) uma cor.
const shade = (c, f) => c.clone().multiplyScalar(f);

// =====================================================================================
// 2. Receitas do chão: para cada tipo, uma cor base, uma cor de "manchas" e quanto se misturam
// =====================================================================================
function makeSurfaceRecipes(P) {
  return {
    grass:      { base: color(P.grass), patch: color(P.brush), amount: 0.45 },
    brush:      { base: color(P.brush), patch: shade(color(P.brush), 0.72), amount: 0.6 },
    // chão de eucaliptal/pinhal: folhas e cascas secas
    eucalyptus: { base: shade(mixHex(P.brush, P.dirt, 0.45), 0.85), patch: color(P.dirt), amount: 0.4 },
    broadleaf:  { base: shade(color(P.grass), 0.82), patch: color(P.brush), amount: 0.3 },
    cleared:    { base: color(P.cleared), patch: color(P.dirt), amount: 0.3 },
    firebreak:  { base: color(P.firebreak), patch: color(P.dirt), amount: 0.35 },
    // quintal: um estilo pode dar a sua cor (P.yard, ex.: jardim regado verde-azeitona)
    house:      P.yard !== undefined
      ? { base: color(P.yard), patch: shade(color(P.yard), 0.8), amount: 0.45 }
      : { base: mixHex(P.grass, P.dirt, 0.25), patch: color(P.cleared), amount: 0.4 },
    school:     { base: mixHex(P.cleared, 0xd9d2c3, 0.6), patch: color(P.cleared), amount: 0.3 }, // pátio
    road:       { base: mixHex(P.dirt, P.grass, 0.35), patch: color(P.brush), amount: 0.4 },     // berma
    water:      { base: shade(mixHex(P.dirt, P.water, 0.35), 0.8), patch: color(0x9a8e6e), amount: 0.35 }, // leito
    // queimado: carvão preto com poucas manchas de cinza fria (NÃO é castanho, para não parecer
    // lama). O pormenor fino (salpicos de cinza, carvão aos bocados) é desenhado no shader.
    burned:     { base: color(CHARCOAL), patch: color(ASH), amount: 0.3, fine: true },
  };
}

// =====================================================================================
// 3. O terreno
// =====================================================================================
export function createTerrain(scene, village, palette, options = {}) {
  const levelHeight = options.verticalScale ?? LEVEL_HEIGHT;
  const uplift = options.uplift;
  const hasCliff = options.cliff !== false;
  const W = village.width, H = village.height;
  const halfX = (W - 1) / 2, halfZ = (H - 1) / 2;
  const recipes = makeSurfaceRecipes(palette);

  // O tipo de chão de cada quadrado (começa igual ao tipo do quadrado).
  const surfaces = village.tiles.map((row) => row.slice());
  const isWater = (x, y) => village.tiles[y][x] === 'water';
  const isRoad = (x, y) => inside(x, y) && surfaces[y][x] === 'road';
  function inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }

  // Grelhas de números por quadrado, que depois "alisamos" entre quadrados.
  const levels = blurGrid(village.heights);                             // alturas um pouco suavizadas
  const wetness = village.tiles.map((row) => row.map((t) => (t === 'water' ? 1 : 0))); // 1 = rio

  // ---------- 3a. Alturas ----------
  // Lê uma grelha (um número por quadrado) num ponto qualquer, misturando os 4 centros mais próximos.
  function sampleGrid(grid, gx, gy) {
    const cx = clamp(gx, 0, W - 1), cy = clamp(gy, 0, H - 1);
    const ix = Math.min(Math.floor(cx), W - 2), iy = Math.min(Math.floor(cy), H - 2);
    const fx = cx - ix, fy = cy - iy;
    const top = lerp(grid[iy][ix], grid[iy][ix + 1], fx);
    const bottom = lerp(grid[iy + 1][ix], grid[iy + 1][ix + 1], fx);
    return lerp(top, bottom, fy);
  }

  // Distância (em quadrados) do ponto até à borda da ilha.
  function distanceToEdge(gx, gy) {
    return Math.min(gx + 0.5, W - 0.5 - gx, gy + 0.5, H - 0.5 - gy);
  }

  // Altura da "margem": o relevo do nível, sem o rio e sem pedrinhas.
  function bankHeight(gx, gy) {
    return levelToY(sampleGrid(levels, gx, gy));
  }

  // Um nível (0-9) -> altura no mundo. Com options.uplift, a parte alta (a serra) sobe mais
  // depressa: é só desenho, para o "morro" se ver como nas fotos (a simulação usa os níveis
  // verdadeiros). A curva é suave (sem "joelho"): a vila em baixo quase não muda.
  function levelToY(level) {
    if (!uplift) return BASE_Y + level * levelHeight;
    // "softplus": ~0 bem abaixo de 0, ~v bem acima, e uma curva suave no meio (sem "joelho")
    const softplus = (v) => (v > 6 ? v : Math.log1p(Math.exp(v)));
    // Só entre `above` e `top` (por omissão 9, o cimo do mapa) a subida é mais rápida; acima de
    // `top` (a serra do cenário, backdrop.js) volta ao normal, senão os picos ficavam enormes.
    const top = uplift.top ?? 9;
    const extra = softplus(level - uplift.above) - softplus(level - top);
    return BASE_Y + (level + extra * (uplift.factor - 1)) * levelHeight;
  }

  // Pequenas ondulações do chão, para não ser uma mesa de bilhar.
  function bumps(gx, gy) {
    return (noise(gx * 0.35, gy * 0.35, 1) - 0.5) * 0.14 + (noise(gx * 1.3, gy * 1.3, 2) - 0.5) * 0.05;
  }

  // Quanto o chão desce por causa do rio (0 longe do rio). Junto à borda da ilha não desce,
  // para ficar uma "beirinha" de terra que segura a água.
  function riverDip(gx, gy) {
    const edgeFade = smooth(clamp((distanceToEdge(gx, gy) - 0.2) / 0.35, 0, 1));
    const wx = gx + (noise(gx * 0.7, gy * 0.7, 13) - 0.5) * 0.7; // entorta a margem: o rio faz curvas
    const wy = gy + (noise(gx * 0.7, gy * 0.7, 14) - 0.5) * 0.7;
    return sampleGrid(wetness, wx, wy) * edgeFade * RIVER_DEPTH;
  }

  // ALTURA DO CHÃO num ponto qualquer (coordenadas de quadrado).
  function heightAt(gx, gy) {
    return bankHeight(gx, gy) + bumps(gx, gy) - riverDip(gx, gy);
  }

  // Altura da superfície da água (segue o relevo do rio, mais abaixo que a margem).
  function waterHeight(gx, gy) {
    return bankHeight(gx, gy) - WATER_BELOW;
  }

  // ---------- 3b. Cores do chão ----------
  // A cor de um ponto mistura os quadrados vizinhos. Antes "entortamos" um pouco o ponto
  // com ruído, para as fronteiras entre tipos ficarem irregulares (e não linhas retas).
  const tmpColor = new THREE.Color();
  let lastBurn = 0; // quanto do ponto calculado por colourAt é "queimado" (0 a 1)
  function colourAt(gx, gy, out) {
    const qx = gx + (noise(gx * 1.6, gy * 1.6, 3) - 0.5) * 0.55;
    const qy = gy + (noise(gx * 1.6, gy * 1.6, 4) - 0.5) * 0.55;
    out.setRGB(0, 0, 0);
    let total = 0, burned = 0;
    const tx0 = Math.round(qx), ty0 = Math.round(qy);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) {
      for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
        if (!inside(tx, ty)) continue;
        const w = blendWeight(qx - tx, qy - ty);
        if (w <= 0) continue;
        surfaceColour(surfaces[ty][tx], gx, gy, tmpColor);
        out.r += tmpColor.r * w; out.g += tmpColor.g * w; out.b += tmpColor.b * w;
        total += w;
        if (surfaces[ty][tx] === 'burned') burned += w;
      }
    }
    lastBurn = total > 0 ? burned / total : 0;
    if (total > 0) out.multiplyScalar(1 / total);
    else surfaceColour(surfaces[clamp(ty0, 0, H - 1)][clamp(tx0, 0, W - 1)], gx, gy, out);
    return wetBank(gx, gy, out);
  }

  // Junto à água o chão fica escuro e molhado (areia húmida), e debaixo de água ainda mais.
  const wetColour = shade(mixHex(palette.dirt, palette.water, 0.25), 0.7);
  function wetBank(gx, gy, out) {
    const aboveWater = heightAt(gx, gy) - waterHeight(gx, gy);
    if (aboveWater > 0.1) return out;
    return out.lerp(wetColour, clamp(1 - aboveWater / 0.1, 0, 1) * 0.7);
  }

  // Peso de um quadrado para um ponto a (dx, dy) do seu centro: 1 dentro do quadrado,
  // a cair para 0 até 0.3 fora dele.
  function blendWeight(dx, dy) {
    const w = Math.max(0, 1 - distanceOutside(dx, dy) / 0.3);
    return w * w;
  }

  // Distância de um ponto a (dx, dy) do centro de um quadrado até ao quadrado (0 se está dentro).
  function distanceOutside(dx, dy) {
    return Math.hypot(Math.max(0, Math.abs(dx) - 0.5), Math.max(0, Math.abs(dy) - 0.5));
  }

  // Cor de UM tipo de chão num ponto: cor base + manchas + um bocadinho de grão.
  function surfaceColour(type, gx, gy, out) {
    const r = recipes[type] || recipes.grass;
    const scale = r.fine ? 2.4 : 1.1; // o queimado tem manchas mais pequenas (cinza aos bocados)
    const patches = smooth(noise(gx * scale, gy * scale, 5));
    out.copy(r.base).lerp(r.patch, patches * r.amount);
    const grain = 0.9 + noise(gx * 7, gy * 7, 6) * 0.2;
    return out.multiplyScalar(grain);
  }

  // ---------- 3c. A malha do chão (uma só, com 4x4 bocadinhos por quadrado) ----------
  const cols = W * STEPS + 1, rows = H * STEPS + 1;
  const top = buildTopMesh();
  scene.add(top.mesh);

  // Coordenadas de quadrado do vértice (i, j) da grelha.
  function gridToTile(i, j) { return [i / STEPS - 0.5, j / STEPS - 0.5]; }

  function buildTopMesh() {
    const positions = new Float32Array(cols * rows * 3);
    const colours = new Float32Array(cols * rows * 3);
    const burn = new Float32Array(cols * rows); // 0 = chão normal, 1 = queimado (para o shader)
    const c = new THREE.Color();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const [gx, gy] = gridToTile(i, j);
        const [wx, wz] = rimOffset(i, j, gx, gy);
        // a borda arredonda um pouco para baixo (sem ribanceira não: o chão continua lá fora)
        const edgeDrop = isRim(i, j) && hasCliff ? 0.06 : 0;
        positions.set([wx, heightAt(gx, gy) - edgeDrop, wz], k * 3);
        colourAt(gx, gy, c);
        colours.set([c.r, c.g, c.b], k * 3);
        burn[k] = lastBurn;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.setAttribute('aBurn', new THREE.BufferAttribute(burn, 1));
    geo.setIndex(gridIndices(() => true));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    addBurnedDetail(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true; // as encostas fazem sombra
    return { mesh, positions, colours, burn };
  }

  // Os triângulos da grelha: 2 por bocadinho. include(i, j) diz se o bocadinho (i, j) entra.
  function gridIndices(include) {
    const idx = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        if (!include(i, j)) continue;
        const a = j * cols + i, b = a + 1, d = a + cols, e = d + 1;
        // alterna a diagonal, para o relevo não ficar todo "riscado" na mesma direção
        if ((i + j) % 2 === 0) idx.push(a, d, b, b, d, e);
        else idx.push(a, d, e, a, e, b);
      }
    }
    return idx;
  }

  // ---------- 3d. Borda irregular da ilha ----------
  // O vértice (i, j) está na borda da ilha?
  function isRim(i, j) { return i === 0 || j === 0 || i === cols - 1 || j === rows - 1; }

  // Posição no mundo de um vértice. Os da borda são empurrados para fora (ao acaso, mas suave)
  // e os cantos são arredondados para dentro: assim a ilha não é um quadrado perfeito.
  function rimOffset(i, j, gx, gy) {
    let wx = gx - halfX, wz = gy - halfZ;
    if (!isRim(i, j) || !hasCliff) return [wx, wz]; // sem ribanceira, a borda é reta (o cenário continua-a)
    const [nx, nz] = outwardDirection(i, j);
    const push = 0.04 + noise(gx * 0.9, gy * 0.9, 7) * 0.32 - cornerPull(gx, gy);
    return [wx + nx * push, wz + nz * push];
  }

  // Para onde é "fora" num vértice da borda (nos cantos, na diagonal).
  function outwardDirection(i, j) {
    let nx = 0, nz = 0;
    if (i === 0) nx = -1;
    if (i === cols - 1) nx = 1;
    if (j === 0) nz = -1;
    if (j === rows - 1) nz = 1;
    const len = Math.hypot(nx, nz) || 1;
    return [nx / len, nz / len];
  }

  // Perto de um canto, puxa a borda para dentro (canto arredondado).
  function cornerPull(gx, gy) {
    const dx = Math.min(gx + 0.5, W - 0.5 - gx), dy = Math.min(gy + 0.5, H - 0.5 - gy);
    const nearCorner = Math.max(0, 1 - Math.max(dx, dy) / 1.4);
    return nearCorner * nearCorner * 0.9;
  }

  // ---------- 3e. Ribanceira com camadas de terra ----------
  const cliff = buildCliff();
  cliff.visible = hasCliff;
  scene.add(cliff);

  // A volta da ilha, em ordem: lista de índices (i, j) dos vértices da borda.
  function rimLoop() {
    const loop = [];
    for (let i = 0; i < cols - 1; i++) loop.push([i, 0]);
    for (let j = 0; j < rows - 1; j++) loop.push([cols - 1, j]);
    for (let i = cols - 1; i > 0; i--) loop.push([i, rows - 1]);
    for (let j = rows - 1; j > 0; j--) loop.push([0, j]);
    return loop;
  }

  // As camadas, de cima para baixo: [até que fração da altura vai, cor].
  function cliffLayers() {
    const dirt = color(palette.dirt);
    return [
      [0.1, shade(mixHex(palette.dirt, 0x2a1d12, 0.5), 1)], // terra escura com raízes
      [0.3, dirt],                                          // terra
      [0.42, shade(mixHex(palette.dirt, 0xd8c39a, 0.45), 1)], // faixa de barro claro
      [0.62, shade(dirt, 0.78)],                            // terra mais funda
      [1.0, color(0x6f6a64)],                               // rocha
    ];
  }

  function buildCliff() {
    const loop = rimLoop();
    const layers = cliffLayers();
    const ringT = [0, ...layers.map((l) => l[0])]; // fração da altura de cada "anel"
    // rings[r][k] = ponto do anel r no vértice k da volta
    const rings = ringT.map((t, r) => loop.map(([i, j]) => cliffPoint(i, j, t, r)));
    const positions = [], colours = [];
    for (let r = 0; r < layers.length; r++) {
      for (let k = 0; k < loop.length; k++) {
        const k2 = (k + 1) % loop.length;
        const a = rings[r][k], b = rings[r][k2], c = rings[r + 1][k], d = rings[r + 1][k2];
        const tint = shade(layers[r][1], 0.88 + hash(k, r, 8) * 0.24); // cada face um pouco diferente
        for (const p of [a, c, b, b, c, d]) {
          positions.push(p[0], p[1], p[2]);
          colours.push(tint.r, tint.g, tint.b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide,
    }));
    mesh.receiveShadow = true;
    return mesh;
  }

  // Um ponto da ribanceira: t = 0 é a borda de cima, t = 1 é o fundo.
  // Cada anel sai um pouco para dentro ou para fora ao acaso (parece rocha partida)
  // e o fundo fica mais estreito (a ilha "afunila").
  function cliffPoint(i, j, t, ring) {
    const k = (j * cols + i) * 3;
    const tp = top.positions;
    const [nx, nz] = outwardDirection(i, j);
    const jitter = t === 0 ? 0 : (hash(i * 7 + j, ring, 9) - 0.5) * 0.22 - t * t * 0.5;
    const y = lerp(tp[k + 1], CLIFF_BOTTOM + (hash(i, j, 10) - 0.5) * 0.3, t);
    return [tp[k] + nx * jitter, y, tp[k + 2] + nz * jitter];
  }

  // ---------- 3f. Água ----------
  const water = buildWater();
  if (water) scene.add(water.mesh);

  // Um bocadinho (i, j) leva água se estiver num quadrado de rio, ou a menos de meio quadrado
  // dele (a água passa por baixo da margem, e é o relevo que desenha a linha da água).
  function cellHasWater(i, j) {
    const gx = (i + 0.5) / STEPS - 0.5, gy = (j + 0.5) / STEPS - 0.5;
    if (distanceToEdge(gx, gy) < 0.3) return false; // a beirinha da ilha segura a água
    const tx0 = Math.round(gx), ty0 = Math.round(gy);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) {
      for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
        if (inside(tx, ty) && isWater(tx, ty) && distanceOutside(gx - tx, gy - ty) < 0.75) return true;
      }
    }
    return false;
  }

  function buildWater() {
    const index = gridIndices(cellHasWater);
    if (index.length === 0) return null; // nível sem rio
    const positions = new Float32Array(cols * rows * 3);
    const baseY = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const [gx, gy] = gridToTile(i, j);
        baseY[k] = waterHeight(gx, gy);
        positions.set([gx - halfX, baseY[k], gy - halfZ], k * 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(index);
    const mat = new THREE.MeshStandardMaterial({
      color: palette.water, roughness: 0.15, metalness: 0.05, flatShading: true,
      transparent: true, opacity: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return { mesh, positions, baseY };
  }

  // Ondinhas: cada vértice sobe e desce um pouco, com duas ondas cruzadas.
  function animateWater(t) {
    if (!water) return;
    const p = water.positions;
    for (let k = 0; k < water.baseY.length; k++) {
      const x = p[k * 3], z = p[k * 3 + 2];
      p[k * 3 + 1] = water.baseY[k] + Math.sin(x * 2.3 + t * 1.4) * 0.012 + Math.sin(z * 3.1 - t * 1.1) * 0.01;
    }
    water.mesh.geometry.attributes.position.needsUpdate = true;
    water.mesh.material.opacity = 0.78 + Math.sin(t * 0.8) * 0.03;
  }

  // ---------- 3g. Estradas (fitas por cima do chão) ----------
  // Fora da vila: estrada de asfalto. Na vila: rua mais estreita com passeio claro de cada lado.
  // Onde há um bloco de 2x2 (ou mais) quadrados de estrada, é um LARGO: calçada portuguesa
  // (pedra clara com ondas pretas), com um chafariz e candeeiros.
  const isPlaza = (x, y) => isRoad(x, y) && [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dy]) =>
    isRoad(x + dx, y + dy) && isRoad(x + dx + 1, y + dy) && isRoad(x + dx, y + dy + 1) && isRoad(x + dx + 1, y + dy + 1));
  const URBAN = new Set(['house', 'school']);
  function isUrban(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (inside(x + dx, y + dy) && URBAN.has(village.tiles[y + dy][x + dx])) return true;
      }
    }
    return false;
  }
  const calcada = makeCalcadaMaterial();
  let roads = buildRoads();
  scene.add(roads);
  const plazaDecor = buildPlazaDecor();
  if (plazaDecor) scene.add(plazaDecor);

  function buildRoads() {
    const ribbon = { positions: [], colours: [], index: [] };
    const plaza = { positions: [], colours: [], index: [], uvs: [] };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isRoad(x, y)) continue;
        if (isPlaza(x, y)) addRect(plaza, x - 0.5, y - 0.5, x + 0.5, y + 0.5, 0.035, color(0xffffff));
        else addRoadTile(ribbon, x, y);
      }
    }
    const group = new THREE.Group();
    group.add(ribbonMesh(ribbon, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, // fica sempre por cima do chão
    })));
    if (plaza.index.length) group.add(ribbonMesh(plaza, calcada));
    return group;
  }

  function ribbonMesh(ribbon, material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(ribbon.positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(ribbon.colours, 3));
    if (ribbon.uvs) geo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbon.uvs, 2));
    geo.setIndex(ribbon.index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Um quadrado de estrada: um bocado no meio + um "braço" para cada estrada vizinha
  // + os cantos entre duas ruas que se cruzam (senão ficava um buraco de terra no canto).
  // Se a estrada chega à borda da ilha, continua até à beira.
  function addRoadTile(ribbon, x, y) {
    const asphalt = color(palette.road), paint = color(0xe8e2cf);
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const linked = dirs.map(([dx, dy]) => isRoad(x + dx, y + dy) || leavesMap(x, y, dx, dy));
    const urban = isUrban(x, y);
    if (urban) roadShape(ribbon, x, y, linked, STREET_WIDTH / 2 + SIDEWALK, 0.025, color(0xd8d2c2)); // passeio
    roadShape(ribbon, x, y, linked, (urban ? STREET_WIDTH : ROAD_WIDTH) / 2, 0.03, asphalt);
    // Risco branco no meio, só nos troços a direito (norte-sul ou este-oeste) fora da vila.
    if (urban) return;
    if (linked[0] && linked[2] && !linked[1] && !linked[3]) addRect(ribbon, x - 0.025, y - 0.17, x + 0.025, y + 0.17, 0.045, paint);
    if (linked[1] && linked[3] && !linked[0] && !linked[2]) addRect(ribbon, x - 0.17, y - 0.025, x + 0.17, y + 0.025, 0.045, paint);
  }

  // A forma da estrada num quadrado, com meia-largura h: meio + braços + cantos cheios.
  // linked = [norte, leste, sul, oeste]: há estrada desse lado?
  function roadShape(ribbon, x, y, linked, h, lift, colour) {
    // Curva: só 2 ligações e em esquina (ex.: norte e leste). Em vez de um "L" de quadrados,
    // desenhamos um quarto de círculo à volta do canto do quadrado. Assim uma estrada em
    // escada (que sobe a serra em zigue-zague) fica com curvas suaves, como as verdadeiras.
    const sides = [0, 1, 2, 3].filter((k) => linked[k]);
    if (sides.length === 2 && (sides[1] - sides[0]) % 2 === 1) {
      const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const [a, b] = sides.map((k) => DIRS[k]);
      addArc(ribbon, x + (a[0] + b[0]) / 2, y + (a[1] + b[1]) / 2, a, b, h, lift, colour);
      return;
    }
    addRect(ribbon, x - h, y - h, x + h, y + h, lift, colour);
    if (linked[0]) addRect(ribbon, x - h, y - 0.5, x + h, y - h, lift, colour);
    if (linked[1]) addRect(ribbon, x + h, y - h, x + 0.5, y + h, lift, colour);
    if (linked[2]) addRect(ribbon, x - h, y + h, x + h, y + 0.5, lift, colour);
    if (linked[3]) addRect(ribbon, x - 0.5, y - h, x - h, y + h, lift, colour);
    // Canto: as ruas vizinhas em x e em y, e a da diagonal, também são estrada.
    for (const [sx, sy, a, b] of [[1, 1, 1, 2], [-1, 1, 3, 2], [1, -1, 1, 0], [-1, -1, 3, 0]]) {
      if (!linked[a] || !linked[b] || !isRoad(x + sx, y + sy)) continue;
      const x0 = sx > 0 ? x + h : x - 0.5, x1 = sx > 0 ? x + 0.5 : x - h;
      const y0 = sy > 0 ? y + h : y - 0.5, y1 = sy > 0 ? y + 0.5 : y - h;
      addRect(ribbon, x0, y0, x1, y1, lift, colour);
    }
  }

  // A estrada sai do mapa por este lado? (está na borda e continua do lado oposto)
  function leavesMap(x, y, dx, dy) {
    return !inside(x + dx, y + dy) && isRoad(x - dx, y - dy);
  }

  // Um quarto de círculo de estrada à volta do canto (cx, cy): vai do meio do lado "a" ao meio
  // do lado "b" (a e b = direções [dx, dy]), com raio 0.5 e meia-largura h, pousado no relevo.
  function addArc(ribbon, cx, cy, a, b, h, lift, baseColour) {
    // os pontos do meio dos dois lados, vistos do canto
    let a0 = Math.atan2(-b[1] * 0.5, -b[0] * 0.5); // o meio do lado "a" está a -b/2 do canto
    let a1 = Math.atan2(-a[1] * 0.5, -a[0] * 0.5);   // o meio do lado "b" está a -a/2 do canto
    if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    if (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    // os triângulos só se veem de cima se o ângulo crescer: se for ao contrário, troca as pontas
    if (a1 < a0) [a0, a1] = [a1, a0];
    const SEG = 8, start = ribbon.positions.length / 3;
    const c = new THREE.Color();
    for (let i = 0; i <= SEG; i++) {
      const ang = lerp(a0, a1, i / SEG);
      for (const r of [0.5 - h, 0.5, 0.5 + h]) {
        const gx = cx + Math.cos(ang) * r, gy = cy + Math.sin(ang) * r;
        ribbon.positions.push(gx - halfX, heightAt(gx, gy) + lift, gy - halfZ);
        c.copy(baseColour).multiplyScalar(0.92 + noise(gx * 5, gy * 5, 12) * 0.16);
        ribbon.colours.push(c.r, c.g, c.b);
        if (ribbon.uvs) ribbon.uvs.push(gx, gy);
      }
    }
    for (let i = 0; i < SEG; i++) {
      for (let k = 0; k < 2; k++) {
        const p = start + i * 3 + k, q = p + 3;
        ribbon.index.push(p, q, p + 1, p + 1, q, q + 1);
      }
    }
  }

  // Um retângulo (em coordenadas de quadrado) dividido em bocadinhos, pousado no relevo.
  // Se o ribbon tiver "uvs", guarda também onde fica a imagem (uma imagem por quadrado).
  function addRect(ribbon, gx0, gy0, gx1, gy1, lift, baseColour) {
    const nx = Math.max(1, Math.ceil((gx1 - gx0) / 0.14)), ny = Math.max(1, Math.ceil((gy1 - gy0) / 0.14));
    const start = ribbon.positions.length / 3;
    const c = new THREE.Color();
    for (let b = 0; b <= ny; b++) {
      for (let a = 0; a <= nx; a++) {
        const gx = lerp(gx0, gx1, a / nx), gy = lerp(gy0, gy1, b / ny);
        ribbon.positions.push(gx - halfX, heightAt(gx, gy) + lift, gy - halfZ);
        c.copy(baseColour).multiplyScalar(0.92 + noise(gx * 5, gy * 5, 12) * 0.16);
        ribbon.colours.push(c.r, c.g, c.b);
        if (ribbon.uvs) ribbon.uvs.push(gx, gy);
      }
    }
    for (let b = 0; b < ny; b++) {
      for (let a = 0; a < nx; a++) {
        const p = start + b * (nx + 1) + a;
        ribbon.index.push(p, p + nx + 1, p + 1, p + 1, p + nx + 1, p + nx + 2);
      }
    }
  }

  // Um chafariz no meio de cada largo e um candeeiro em cada canto.
  function buildPlazaDecor() {
    const seen = new Set();
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.9, flatShading: true });
    const iron = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.4 });
    const bulb = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc46b, emissiveIntensity: 1.4 });
    const water = new THREE.MeshStandardMaterial({ color: palette.water, roughness: 0.15 });
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isPlaza(x, y) || seen.has(`${x},${y}`)) continue;
        const cells = floodPlaza(x, y, seen);
        const cx = cells.reduce((sum, [px]) => sum + px, 0) / cells.length;
        const cy = cells.reduce((sum, [, py]) => sum + py, 0) / cells.length;
        addFountain(group, cx, cy, stone, water);
        const xs = cells.map(([px]) => px), ys = cells.map(([, py]) => py);
        const x0 = Math.min(...xs) - 0.38, x1 = Math.max(...xs) + 0.38;
        const y0 = Math.min(...ys) - 0.38, y1 = Math.max(...ys) + 0.38;
        for (const [lx, ly] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) addLamp(group, lx, ly, iron, bulb);
      }
    }
    return group.children.length ? group : null;
  }

  // Todos os quadrados do mesmo largo (os vizinhos que também são largo).
  function floodPlaza(x, y, seen) {
    const cells = [], todo = [[x, y]];
    seen.add(`${x},${y}`);
    while (todo.length) {
      const [px, py] = todo.pop();
      cells.push([px, py]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy, k = `${nx},${ny}`;
        if (!seen.has(k) && isPlaza(nx, ny)) { seen.add(k); todo.push([nx, ny]); }
      }
    }
    return cells;
  }

  // Chafariz: tanque octogonal de pedra com água, e uma coluna com uma taça.
  function addFountain(group, gx, gy, stone, water) {
    const y = heightAt(gx, gy) + 0.035;
    const add = (geo, material, dy) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(gx - halfX, y + dy, gy - halfZ);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    };
    add(new THREE.CylinderGeometry(0.3, 0.32, 0.1, 8), stone, 0.05);
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 8), water, 0.09);
    add(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 8), stone, 0.22);
    add(new THREE.CylinderGeometry(0.11, 0.05, 0.05, 8), stone, 0.37);
  }

  // Candeeiro de ferro (de noite, a lâmpada brilha).
  function addLamp(group, gx, gy, iron, bulb) {
    const y = heightAt(gx, gy) + 0.035;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 6), iron);
    pole.position.set(gx - halfX, y + 0.21, gy - halfZ);
    pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), bulb);
    head.position.set(gx - halfX, y + 0.44, gy - halfZ);
    group.add(pole, head);
  }
  function rebuildRoads() {
    scene.remove(roads);
    roads.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== calcada) o.material.dispose(); } });
    roads = buildRoads();
    scene.add(roads);
  }

  // ---------- 3h. Tufos de erva (pequenos, aos milhares, para o chão ter "textura") ----------
  // Usamos UMA InstancedMesh: a mesma forma desenhada muitas vezes de uma só vez (é rápido).
  // Cada quadrado tem TUFTS_PER_TILE lugares; um tufo que não deve aparecer fica com tamanho 0.
  const TUFTS_PER_TILE = 7;
  const TUFT_SIZE = { grass: 1, broadleaf: 0.85, brush: 0.9, house: 0.6, cleared: 0.35, burned: 0.45 };
  const tufts = new THREE.InstancedMesh(
    makeTuftGeometry(),
    new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
    W * H * TUFTS_PER_TILE,
  );
  tufts.receiveShadow = true;
  scene.add(tufts);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) placeTufts(x, y);

  // ---------- 3i. Penedos de granito nas partes altas (como na Serra de Sintra) ----------
  // Uma só InstancedMesh (rápido). Os penedos não ardem: ficam depois do fogo.
  const rocks = buildRocks();
  if (rocks) scene.add(rocks);

  function buildRocks() {
    const ROCKY = new Set(['brush', 'grass', 'cleared', 'eucalyptus', 'broadleaf']);
    const spots = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const level = village.heights[y][x];
        if (level < 6 || !ROCKY.has(village.tiles[y][x])) continue;
        const count = Math.floor(hash(x, y, 30) * (level >= 8 ? 3.2 : 1.8));
        for (let n = 0; n < count; n++) spots.push([x, y, n, level]);
      }
    }
    if (spots.length === 0) return null;
    const mesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.08, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      spots.length,
    );
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    spots.forEach(([x, y, n, level], i) => {
      const id = (y * W + x) * 4 + n;
      const gx = x + (hash(id, 1, 31) - 0.5) * 0.8, gy = y + (hash(id, 2, 31) - 0.5) * 0.8;
      const big = level >= 8 && hash(id, 3, 31) > 0.6 ? 2.2 : 1; // penedos grandes no cume
      const sx = big * (0.8 + hash(id, 4, 31) * 1.4), sy = big * (0.5 + hash(id, 5, 31) * 0.6);
      const sz = big * (0.8 + hash(id, 6, 31) * 1.2);
      q.setFromEuler(e.set(hash(id, 7, 31) * 0.4, hash(id, 8, 31) * 6.28, hash(id, 9, 31) * 0.4));
      m.compose(new THREE.Vector3(gx - halfX, heightAt(gx, gy) + 0.02 * sy, gy - halfZ), q, new THREE.Vector3(sx, sy, sz));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(0x8f8b84).multiplyScalar(0.8 + hash(id, 10, 31) * 0.35)); // granito
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Põe (ou esconde) os tufos de um quadrado, conforme o tipo de chão.
  function placeTufts(x, y) {
    const type = surfaces[y][x];
    const size = TUFT_SIZE[type] || 0;
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let n = 0; n < TUFTS_PER_TILE; n++) {
      const id = (y * W + x) * TUFTS_PER_TILE + n;
      const gx = x + (hash(id, 1, 20) - 0.5) * 0.9, gy = y + (hash(id, 2, 20) - 0.5) * 0.9;
      const s = size * (0.6 + hash(id, 3, 20) * 0.8);
      m.compose(
        new THREE.Vector3(gx - halfX, heightAt(gx, gy) + 0.04 * s, gy - halfZ),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(id, 4, 20) * 6.28),
        new THREE.Vector3(s, s, s),
      );
      tufts.setMatrixAt(id, m);
      surfaceColour(type, gx, gy, c);
      tufts.setColorAt(id, type === 'burned' ? c.setHex(CHARCOAL) : c.multiplyScalar(0.72));
    }
    tufts.instanceMatrix.needsUpdate = true;
    if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  }

  // =====================================================================================
  // 4. A API
  // =====================================================================================

  // Altura no CENTRO do quadrado (x, y). Na água, a altura da superfície da água.
  function groundHeight(x, y) {
    if (inside(x, y) && isWater(x, y)) return waterHeight(x, y);
    return heightAt(x, y);
  }

  // Altura do chão num ponto do mundo (wx, wz).
  function heightAtWorld(wx, wz) {
    return heightAt(wx + halfX, wz + halfZ);
  }

  // Muda o aspeto do chão num quadrado e repinta só os vértices à volta dele.
  function setSurface(x, y, type) {
    if (!inside(x, y) || surfaces[y][x] === type) return;
    const wasRoad = surfaces[y][x] === 'road';
    surfaces[y][x] = type;
    repaint(x, y);
    placeTufts(x, y);
    if (wasRoad || type === 'road') rebuildRoads();
  }

  // Volta a calcular a cor dos vértices perto do quadrado (x, y) (até 1 quadrado de distância,
  // porque as cores se misturam com os vizinhos).
  function repaint(x, y) {
    const c = new THREE.Color();
    const i0 = Math.max(0, (x - 1) * STEPS), i1 = Math.min(cols - 1, (x + 2) * STEPS);
    const j0 = Math.max(0, (y - 1) * STEPS), j1 = Math.min(rows - 1, (y + 2) * STEPS);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const [gx, gy] = gridToTile(i, j);
        colourAt(gx, gy, c);
        top.colours.set([c.r, c.g, c.b], (j * cols + i) * 3);
        top.burn[j * cols + i] = lastBurn;
      }
    }
    top.mesh.geometry.attributes.color.needsUpdate = true;
    top.mesh.geometry.attributes.aBurn.needsUpdate = true;
  }

  // Que quadrado está debaixo do raio? (chão, água, estrada, ou a ribanceira = quadrado da beira)
  function pickTile(raycaster) {
    const targets = [top.mesh, ...roads.children, cliff];
    if (water) targets.push(water.mesh);
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? tileAtWorld(hit.point.x, hit.point.z) : null;
  }

  // O quadrado de um ponto do mundo. A borda irregular sai um pouco do mapa: conta como a beira.
  function tileAtWorld(wx, wz) {
    const x = Math.round(wx + halfX), y = Math.round(wz + halfZ);
    if (x < -1 || y < -1 || x > W || y > H) return null;
    return { x: clamp(x, 0, W - 1), y: clamp(y, 0, H - 1) };
  }

  function update(t) {
    animateWater(t);
  }

  // A cor do chão num ponto do mundo (o mesmo que a malha usa).
  function colourAtWorld(wx, wz, out) {
    return colourAt(wx + halfX, wz + halfZ, out);
  }

  return { groundHeight, heightAtWorld, colourAtWorld, setSurface, pickTile, update, levelHeight, baseY: BASE_Y, levelToY };
}

// Um tufo de erva: 4 folhas finas e compridas em leque (e não um cone, que parecia um espigão).
// Cada folha é um triângulo que sai do chão e se inclina para fora.
function makeTuftGeometry() {
  const positions = [];
  const blades = 4;
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + i * 0.4;
    const cx = Math.cos(angle), cz = Math.sin(angle);
    const px = -cz * 0.012, pz = cx * 0.012;            // meia-largura da base da folha
    const lean = 0.035 + (i % 2) * 0.02, height = 0.1 + (i % 3) * 0.025;
    positions.push(px, 0, pz, -px, 0, -pz, cx * lean, height, cz * lean);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// A calçada portuguesa desenhada num canvas: pedrinhas claras de calcário com ondas de
// basalto preto (como no Rossio, em Lisboa). A imagem repete-se sem costuras.
function makeCalcadaMaterial() {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: 0xe6e0d2 });
  const S = 256, CELL = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8f8a80'; // a junta entre as pedras
  ctx.fillRect(0, 0, S, S);
  for (let cy = 0; cy < S; cy += CELL) {
    for (let cx = 0; cx < S; cx += CELL) {
      const mx = cx + CELL / 2, my = cy + CELL / 2;
      // duas ondas por imagem (um número inteiro de ondas, para a imagem repetir sem costuras)
      const wave = Math.sin((mx / S) * Math.PI * 4) * 22;
      const band = (((my - wave) % 128) + 128) % 128;
      const dark = band < 26;
      const v = Math.round(dark ? 40 + hash(cx, cy, 3) * 25 : 222 + hash(cx, cy, 4) * 22);
      ctx.fillStyle = dark ? `rgb(${v},${v},${v + 2})` : `rgb(${v},${v - 4},${v - 12})`;
      const jx = (hash(cx, cy, 1) - 0.5) * 2, jy = (hash(cx, cy, 2) - 0.5) * 2;
      ctx.fillRect(cx + 1 + jx, cy + 1 + jy, CELL - 2, CELL - 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map: texture, vertexColors: true, roughness: 0.8,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
}

// O pormenor do chão QUEIMADO, desenhado na placa gráfica (shader): carvão aos bocados com
// salpicos e montinhos de cinza clara, com muito mais detalhe do que as cores dos vértices
// (que só têm 4x4 pontos por quadrado). A máscara aBurn (0 a 1) diz onde está queimado.
// onBeforeCompile deixa-nos acrescentar umas linhas ao shader do MeshStandardMaterial.
const BURN_NOISE_GLSL = `
  varying float vBurn;
  varying vec3 vGroundPos;
  float burnHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float burnNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(burnHash(i), burnHash(i + vec2(1.0, 0.0)), f.x),
               mix(burnHash(i + vec2(0.0, 1.0)), burnHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }`;
const BURN_COLOR_GLSL = `
  if (vBurn > 0.01) {
    vec2 q = vGroundPos.xz;
    float big = burnNoise(q * 2.7 + 3.1);
    float mid = burnNoise(q * 9.0);
    float fine = burnNoise(q * 31.0 + 7.3);
    // carvão: quase preto, um pouco azulado, com pedaços mais claros
    vec3 burnt = mix(vec3(0.010, 0.011, 0.013), vec3(0.035, 0.036, 0.040), mid);
    // montinhos de cinza clara (fria, nada de castanho)
    float pile = smoothstep(0.66, 0.82, big * 0.65 + mid * 0.45);
    burnt = mix(burnt, vec3(0.30, 0.31, 0.33) * (0.7 + 0.5 * fine), pile * 0.8);
    // salpicos finos de cinza por todo o lado
    burnt = mix(burnt, vec3(0.22, 0.225, 0.235), step(0.82, fine) * 0.55 * (1.0 - pile));
    diffuseColor.rgb = mix(diffuseColor.rgb, burnt, smoothstep(0.05, 0.95, vBurn));
  }`;
function addBurnedDetail(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBurn;\nvarying float vBurn;\nvarying vec3 vGroundPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBurn = aBurn;\nvGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + BURN_NOISE_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + BURN_COLOR_GLSL);
  };
}


// Suaviza um pouco as alturas: cada quadrado fica com metade da sua altura
// e metade da média dos 4 vizinhos. Evita "degraus" muito bruscos.
function blurGrid(grid) {
  const h = grid.length, w = grid[0].length;
  const at = (x, y) => grid[clamp(y, 0, h - 1)][clamp(x, 0, w - 1)];
  return grid.map((row, y) => row.map((v, x) => {
    const around = at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1);
    return v * 0.5 + (around / 4) * 0.5;
  }));
}
