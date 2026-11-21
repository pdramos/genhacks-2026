// O CHÃO da vila: um terreno contínuo (nada de "tabuleiro de quadradinhos").
//   - relevo suave, a partir de village.heights (0-9 em cada quadrado);
//   - cores que se misturam devagar entre tipos de chão, com manchas (nada de bordas quadradas);
//   - estradas como fitas bem marcadas, pousadas por cima do relevo;
//   - rio: o leito é mais fundo e a água é uma superfície própria, mais baixa e a ondular;
//   - a borda da "ilha" é irregular, com uma ribanceira com camadas de terra e rocha.
// Só desenha. As regras (o que arde, etc.) estão em src/sim.
//
// API (o que o resto do jogo pode usar):
//   const terrain = createTerrain(scene, village, palette)
//   terrain.groundHeight(x, y)     -> altura do chão (unidades 3D) no CENTRO do quadrado (x, y).
//                                     Nos quadrados de água devolve a altura da superfície da água.
//   terrain.heightAtWorld(wx, wz)  -> altura do chão num ponto qualquer do mundo (para pôr árvores)
//   terrain.setSurface(x, y, type) -> muda o aspeto do chão num quadrado
//                                     (um tipo de quadrado, ou 'burned' = carvão preto e cinza)
//   terrain.pickTile(raycaster)    -> {x, y} do quadrado onde o "raio" bate, ou null
//   terrain.update(t)              -> anima a água; chamar a cada desenho
//
// Coordenadas: o quadrado (x, y) tem o centro no mundo em (x - halfX, ?, y - halfZ).
// Dentro deste ficheiro também usamos "coordenadas de quadrado" (gx, gy): números com vírgula,
// em que o centro do quadrado (3, 5) é exatamente gx = 3, gy = 5.
import * as THREE from 'three';

// ---------- Números que mandam no aspeto (podes mexer!) ----------
const LEVEL_HEIGHT = 0.28;  // cada nível de altura (0-9) sobe 0.28 unidades (9 níveis = 2.5)
const BASE_Y = 0.25;        // altura do chão no nível 0 (igual ao topo dos antigos blocos)
const STEPS = 4;            // cada quadrado é dividido em 4 x 4 bocadinhos
const RIVER_DEPTH = 0.42;   // quanto o leito do rio é mais fundo que a margem
const WATER_BELOW = 0.2;    // a superfície da água fica 0.2 abaixo da margem
const ROAD_WIDTH = 0.56;    // largura da estrada (o quadrado tem 1)
const CLIFF_BOTTOM = -1.7;  // até onde desce a ribanceira da ilha
const CHARCOAL = 0x171615;  // cor do carvão (queimado)
const ASH = 0x8e8c89;       // cor da cinza (queimado)

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
    house:      { base: mixHex(P.grass, P.dirt, 0.25), patch: color(P.cleared), amount: 0.4 },  // quintal
    school:     { base: mixHex(P.cleared, 0xd9d2c3, 0.6), patch: color(P.cleared), amount: 0.3 }, // pátio
    road:       { base: mixHex(P.dirt, P.grass, 0.35), patch: color(P.brush), amount: 0.4 },     // berma
    water:      { base: shade(mixHex(P.dirt, P.water, 0.35), 0.8), patch: color(0x9a8e6e), amount: 0.35 }, // leito
    // queimado: carvão preto com manchas de cinza cinzenta (NÃO é castanho, para não parecer lama)
    burned:     { base: color(CHARCOAL), patch: color(ASH), amount: 0.8, fine: true },
  };
}

// =====================================================================================
// 3. O terreno
// =====================================================================================
export function createTerrain(scene, village, palette) {
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
    return BASE_Y + sampleGrid(levels, gx, gy) * LEVEL_HEIGHT;
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
  function colourAt(gx, gy, out) {
    const qx = gx + (noise(gx * 1.6, gy * 1.6, 3) - 0.5) * 0.55;
    const qy = gy + (noise(gx * 1.6, gy * 1.6, 4) - 0.5) * 0.55;
    out.setRGB(0, 0, 0);
    let total = 0;
    const tx0 = Math.round(qx), ty0 = Math.round(qy);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) {
      for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
        if (!inside(tx, ty)) continue;
        const w = blendWeight(qx - tx, qy - ty);
        if (w <= 0) continue;
        surfaceColour(surfaces[ty][tx], gx, gy, tmpColor);
        out.r += tmpColor.r * w; out.g += tmpColor.g * w; out.b += tmpColor.b * w;
        total += w;
      }
    }
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
    const c = new THREE.Color();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const [gx, gy] = gridToTile(i, j);
        const [wx, wz] = rimOffset(i, j, gx, gy);
        const edgeDrop = isRim(i, j) ? 0.06 : 0; // a borda arredonda um pouco para baixo
        positions.set([wx, heightAt(gx, gy) - edgeDrop, wz], k * 3);
        colourAt(gx, gy, c);
        colours.set([c.r, c.g, c.b], k * 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.setIndex(gridIndices(() => true));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true; // as encostas fazem sombra
    return { mesh, positions, colours };
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
    if (!isRim(i, j)) return [wx, wz];
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
  let roads = buildRoads();
  scene.add(roads);

  function buildRoads() {
    const ribbon = { positions: [], colours: [], index: [] };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (isRoad(x, y)) addRoadTile(ribbon, x, y);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(ribbon.positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(ribbon.colours, 3));
    geo.setIndex(ribbon.index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, // fica sempre por cima do chão
    }));
    mesh.receiveShadow = true;
    return mesh;
  }

  // Um quadrado de estrada: um bocado no meio + um "braço" para cada estrada vizinha.
  // Se a estrada chega à borda da ilha, continua até à beira.
  function addRoadTile(ribbon, x, y) {
    const h = ROAD_WIDTH / 2;
    const asphalt = color(palette.road), paint = color(0xe8e2cf);
    addRect(ribbon, x - h, y - h, x + h, y + h, 0.03, asphalt);
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const linked = dirs.map(([dx, dy]) => isRoad(x + dx, y + dy) || leavesMap(x, y, dx, dy));
    dirs.forEach(([dx, dy], n) => {
      if (!linked[n]) return;
      if (dx !== 0) addRect(ribbon, dx > 0 ? x + h : x - 0.5, y - h, dx > 0 ? x + 0.5 : x - h, y + h, 0.03, asphalt);
      else addRect(ribbon, x - h, dy > 0 ? y + h : y - 0.5, x + h, dy > 0 ? y + 0.5 : y - h, 0.03, asphalt);
    });
    // Risco branco no meio, só nos troços a direito (norte-sul ou este-oeste).
    if (linked[0] && linked[2] && !linked[1] && !linked[3]) addRect(ribbon, x - 0.025, y - 0.17, x + 0.025, y + 0.17, 0.045, paint);
    if (linked[1] && linked[3] && !linked[0] && !linked[2]) addRect(ribbon, x - 0.17, y - 0.025, x + 0.17, y + 0.025, 0.045, paint);
  }

  // A estrada sai do mapa por este lado? (está na borda e continua do lado oposto)
  function leavesMap(x, y, dx, dy) {
    return !inside(x + dx, y + dy) && isRoad(x - dx, y - dy);
  }

  // Um retângulo (em coordenadas de quadrado) dividido em bocadinhos, pousado no relevo.
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
      }
    }
    for (let b = 0; b < ny; b++) {
      for (let a = 0; a < nx; a++) {
        const p = start + b * (nx + 1) + a;
        ribbon.index.push(p, p + nx + 1, p + 1, p + 1, p + nx + 1, p + nx + 2);
      }
    }
  }

  function rebuildRoads() {
    scene.remove(roads);
    roads.geometry.dispose();
    roads.material.dispose();
    roads = buildRoads();
    scene.add(roads);
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
      }
    }
    top.mesh.geometry.attributes.color.needsUpdate = true;
  }

  // Que quadrado está debaixo do raio? (chão, água, estrada, ou a ribanceira = quadrado da beira)
  function pickTile(raycaster) {
    const targets = [top.mesh, roads, cliff];
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

  return { groundHeight, heightAtWorld, setSurface, pickTile, update };
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
