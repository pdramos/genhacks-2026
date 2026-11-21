// O ASPETO DE QUEIMADO: transforma os objetos de um quadrado (árvores, mato, casas)
// no que fica depois de um incêndio. Regra de ouro: queimado = CARVÃO PRETO + CINZA CLARA.
// Nunca castanho (castanho parece lama!).
//
// API:
//   charProp(group, tileType?) -> carboniza o grupo de objetos de um quadrado
//       group    = o THREE.Group com as árvores/casas desse quadrado (o "prop" da vista),
//                  com a base no chão (y = 0 do grupo = altura do chão)
//       tileType = opcional: 'eucalyptus', 'broadleaf', 'brush', 'house', 'school'...
//                  Se faltar, adivinhamos o tipo de cada objeto pela forma e pelas cores.
//   CHAR_COLORS -> as cores do queimado (o terreno pode usar CHAR_COLORS.ground no chão)
//
// O que acontece a cada tipo:
//   árvore -> a copa desaparece; o tronco fica preto e ganha uns ramos secos pretos
//   mato   -> desaparece; ficam uns tocos pretos pequeninos
//   casa   -> paredes enegrecidas; o telhado fica preto, afundado, com vigas queimadas
//   e, por baixo de tudo, uma "mancha" de cinza cinzenta e carvão desenhada em código.
import * as THREE from 'three';

// Cores neutras (sem castanho!): preto de carvão e cinzentos de cinza.
export const CHAR_COLORS = {
  wood: 0x111111,      // madeira carbonizada
  ground: 0x2a2a2b,    // sugestão para o chão queimado (terreno): cinzento-carvão
};

// ---------- Materiais e geometrias partilhados (criados uma vez só) ----------
const WOOD = new THREE.MeshStandardMaterial({ color: CHAR_COLORS.wood, roughness: 1, metalness: 0, flatShading: true });
const STICK = new THREE.CylinderGeometry(0.5, 1, 1, 5); // pau que afina para cima
STICK.translate(0, 0.5, 0);                             // base do pau em y = 0
const STUB = new THREE.ConeGeometry(1, 1, 5);           // toco de mato
STUB.translate(0, 0.5, 0);
const ASH_PLANE = new THREE.PlaneGeometry(1, 1);
ASH_PLANE.rotateX(-Math.PI / 2);                        // deitado no chão
let ashMaterials = null;                                // criados na 1.ª vez (precisam do <canvas>)

// ---------- A função principal ----------
export function charProp(group, tileType) {
  if (!group || group.userData.charred) return; // já está queimado: não fazer duas vezes
  group.userData.charred = true;
  group.updateMatrixWorld(true);
  const random = seededRandom(hashPosition(group.position));

  // Primeiro decidimos o que é cada objeto; só depois mexemos (para não baralhar a lista).
  const jobs = group.children.map((child) => ({ child, kind: kindOf(child, tileType) }));
  for (const { child, kind } of jobs) {
    if (kind === 'tree') charTree(group, child, random);
    else if (kind === 'bush') charBush(group, child, random);
    else charBuilding(group, child, random);
  }
  addAsh(group, random);
}

// ---------- Que objeto é este? ----------
const KIND_BY_TILE = { eucalyptus: 'tree', broadleaf: 'tree', brush: 'bush', house: 'building', school: 'building' };

function kindOf(child, tileType) {
  if (child.userData.kind) return child.userData.kind;          // o estilo disse-nos
  if (KIND_BY_TILE[tileType]) return KIND_BY_TILE[tileType];    // a vista disse-nos
  if (child.userData.lot || child.userData.footprint) return 'building';
  // Adivinhar: pequeno = mato; com muita folhagem = árvore; o resto = edifício.
  const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
  if (size.y < 0.6 && Math.max(size.x, size.z) < 0.55) return 'bush';
  return leafyShare(child) > 0.3 ? 'tree' : 'building';
}

// Que parte do objeto (contada em pontos da geometria) tem cor de folha?
function leafyShare(object) {
  let leafy = 0, total = 0;
  object.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.geometry.attributes.position.count;
    total += n;
    if (isLeafy(o.material)) leafy += n;
  });
  return total ? leafy / total : 0;
}

// Cor de folha = verde ou verde-amarelado, com alguma cor (não cinzento) e não quase branco.
// (Um branco "quente" como o da cal tem muita "saturação" em HSL: por isso o limite da luz.)
const hsl = { h: 0, s: 0, l: 0 };
function isLeafy(material) {
  if (!material || !material.color) return false;
  material.color.getHSL(hsl, THREE.SRGBColorSpace);
  const hue = hsl.h * 360;
  return hue >= 55 && hue <= 170 && hsl.s > 0.12 && hsl.l < 0.8;
}

// ---------- Árvore: tronco preto, sem copa, com ramos secos ----------
function charTree(group, tree, random) {
  const box = new THREE.Box3().setFromObject(tree);
  const base = box.min.y, height = box.max.y - box.min.y;
  let trunkTop = base;
  tree.traverse((o) => {
    if (!o.isMesh) return;
    const part = new THREE.Box3().setFromObject(o);
    const isCrown = isLeafy(o.material) || part.min.y > base + height * 0.45;
    if (isCrown) { o.visible = false; return; }  // a copa ardeu
    o.material = WOOD;                            // tronco e ramos ficam carvão
    trunkTop = Math.max(trunkTop, part.max.y);
  });
  // O "esqueleto": o tronco continua para cima e tem uns ramos secos.
  const foot = group.worldToLocal(tree.getWorldPosition(new THREE.Vector3()));
  const toLocalY = (worldY) => group.worldToLocal(new THREE.Vector3(0, worldY, 0)).y;
  const topY = toLocalY(base) + height * (0.7 + random() * 0.1);
  const startY = Math.min(toLocalY(trunkTop), topY - 0.1);
  const thick = Math.max(0.018, height * 0.025);
  addStick(group, foot.x, startY - 0.05, foot.z, topY - startY + 0.05, thick, 0, 0);
  const branches = 3 + Math.floor(random() * 3);
  for (let i = 0; i < branches; i++) {
    const y = startY + (topY - startY) * (0.2 + random() * 0.7);
    const length = height * (0.12 + random() * 0.15);
    const tilt = 0.6 + random() * 0.5;           // inclinação: para cima e para fora
    addStick(group, foot.x, y, foot.z, length, thick * 0.5, random() * Math.PI * 2, tilt);
  }
}

// Um pau preto: começa em (x, y, z), com o comprimento e a grossura dados,
// rodado `turn` à volta do eixo vertical e inclinado `tilt` (0 = de pé).
function addStick(group, x, y, z, length, thickness, turn, tilt) {
  const stick = new THREE.Mesh(STICK, WOOD);
  stick.position.set(x, y, z);
  stick.scale.set(thickness, length, thickness);
  stick.rotation.set(0, turn, tilt, 'YXZ');
  stick.castShadow = true;
  group.add(stick);
  return stick;
}

// ---------- Mato: desaparece e deixa tocos pretos ----------
function charBush(group, bush, random) {
  bush.visible = false;
  const foot = group.worldToLocal(bush.getWorldPosition(new THREE.Vector3()));
  const stubs = 4 + Math.floor(random() * 3);
  for (let i = 0; i < stubs; i++) {
    const stub = new THREE.Mesh(STUB, WOOD);
    const r = 0.012 + random() * 0.01, h = 0.06 + random() * 0.09;
    stub.scale.set(r, h, r);
    stub.position.set(foot.x + (random() - 0.5) * 0.16, foot.y, foot.z + (random() - 0.5) * 0.16);
    stub.rotation.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6);
    stub.castShadow = true;
    group.add(stub);
  }
}

// ---------- Casa: paredes enegrecidas, telhado preto e afundado, vigas queimadas ----------
const charredCache = new Map(); // material original -> material queimado (reutilizado)

function charBuilding(group, building, random) {
  const box = new THREE.Box3().setFromObject(building);
  const base = box.min.y, height = box.max.y - box.min.y;
  let wallTop = base;
  building.traverse((o) => {
    if (!o.isMesh) return;
    if (isLeafy(o.material)) { o.visible = false; return; } // plantas do quintal arderam
    const part = new THREE.Box3().setFromObject(o);
    const isRoof = part.min.y > base + height * 0.45;
    o.material = charredMaterial(o.material, isRoof);
    if (isRoof) collapse(o, base);
    else wallTop = Math.max(wallTop, part.max.y);
  });
  addBeams(group, box, wallTop, random);
}

// Copia o material, mas escuro: guarda a textura (pedra, tijolo), que fica enegrecida.
function charredMaterial(original, isRoof) {
  const key = original.uuid + (isRoof ? ':roof' : ':wall');
  if (charredCache.has(key)) return charredCache.get(key);
  const material = original.clone();
  // Paredes claras ficam um pouco menos escuras do que as escuras (ainda se vê a casa).
  const light = original.color ? original.color.getHSL(hsl, THREE.SRGBColorSpace).l : 0.5;
  const grey = isRoof ? 0.06 : 0.12 + light * 0.14;
  if (material.color) material.color.setRGB(grey, grey, grey, THREE.SRGBColorSpace); // cinzento neutro
  if (material.emissive) material.emissive.setRGB(0, 0, 0);
  material.roughness = 1;
  material.metalness = 0;
  charredCache.set(key, material);
  return material;
}

// O telhado "abate": é esmagado em direção ao chão da casa (base)
// e fica afundado entre as paredes, um pouco torto.
function collapse(mesh, base) {
  const SQUASH = 0.55;
  const here = mesh.getWorldPosition(new THREE.Vector3());
  // a altura do chão da casa, medida nas coordenadas do "pai" do telhado
  const floorY = mesh.parent.worldToLocal(new THREE.Vector3(here.x, base, here.z)).y;
  mesh.position.y = floorY + (mesh.position.y - floorY) * SQUASH;
  mesh.scale.y *= SQUASH;
  mesh.rotation.z += 0.06;
}

// Vigas do telhado queimadas, tortas, a sair do topo das paredes.
function addBeams(group, box, wallTop, random) {
  const min = group.worldToLocal(box.min.clone()), max = group.worldToLocal(box.max.clone());
  const topY = group.worldToLocal(new THREE.Vector3(0, wallTop, 0)).y;
  const width = Math.max(max.x - min.x, max.z - min.z);
  for (let i = 0; i < 3; i++) {
    const x = min.x + (max.x - min.x) * (0.2 + random() * 0.6);
    const z = min.z + (max.z - min.z) * (0.2 + random() * 0.6);
    const length = width * (0.25 + random() * 0.2);
    addStick(group, x, topY - 0.12, z, length, 0.02, random() * Math.PI * 2, 0.7 + random() * 0.6);
  }
}

// ---------- Cinza no chão ----------
// Um quadrado com uma imagem de cinza e carvão (com bordas esbatidas) deitado no chão.
function addAsh(group, random) {
  if (!ashMaterials) ashMaterials = [1, 2, 3, 4].map((seed) => makeAshMaterial(seed));
  const ash = new THREE.Mesh(ASH_PLANE, ashMaterials[Math.floor(random() * ashMaterials.length)]);
  ash.position.y = 0.006;
  ash.rotation.y = Math.floor(random() * 4) * (Math.PI / 2);
  ash.scale.setScalar(1.05);
  ash.receiveShadow = true;
  ash.renderOrder = -1; // antes das outras coisas transparentes
  group.add(ash);
}

function makeAshMaterial(seed) {
  const texture = new THREE.CanvasTexture(drawAsh(seed));
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: texture, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, // sem "tremer" no chão
  });
}

// Desenha a cinza num <canvas>: uma base de carvão com bordas suaves,
// montinhos de cinza clara e salpicos de cinza e de carvão.
function drawAsh(seed) {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed * 7919);
  const blob = (x, y, r, inner, outer) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // 1) base de carvão: várias manchas escuras sobrepostas, esbatidas nas bordas
  for (let i = 0; i < 14; i++) {
    blob(S * (0.25 + random() * 0.5), S * (0.25 + random() * 0.5), S * (0.25 + random() * 0.15),
      'rgba(22,22,23,0.55)', 'rgba(22,22,23,0)');
  }
  // 2) montinhos de cinza clara (onde a madeira ardeu toda)
  for (let i = 0; i < 9; i++) {
    const light = 150 + Math.floor(random() * 60);
    blob(S * (0.15 + random() * 0.7), S * (0.15 + random() * 0.7), S * (0.05 + random() * 0.09),
      `rgba(${light},${light},${light - 3},0.75)`, `rgba(${light},${light},${light - 3},0)`);
  }
  // 3) salpicos pequenos: cinza e bocadinhos de carvão
  for (let i = 0; i < 260; i++) {
    // num círculo, mais juntos ao meio (assim a mancha não fica quadrada)
    const angle = random() * Math.PI * 2, dist = S * 0.46 * Math.sqrt(random()) * (0.6 + random() * 0.4);
    const x = S / 2 + Math.cos(angle) * dist, y = S / 2 + Math.sin(angle) * dist;
    const v = random() < 0.6 ? 110 + Math.floor(random() * 110) : 10 + Math.floor(random() * 20);
    ctx.fillStyle = `rgba(${v},${v},${v},${0.35 + random() * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + random() * 3.5, 1 + random() * 2, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// ---------- Acaso com semente (o mesmo quadrado queima sempre igual) ----------
function seededRandom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashPosition(p) {
  return Math.floor(p.x * 73856093) ^ Math.floor(p.z * 19349663) ^ 0x5bd1e995;
}
