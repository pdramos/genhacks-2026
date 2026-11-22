// JUNTAR PEÇAS para o jogo correr depressa em mapas grandes.
//
// O problema: cada peça (Mesh) é um "pedido de desenho" à placa gráfica. Um mapa 32x32 de Sintra
// tem mais de 6000 peças (troncos, copas, telhados, janelas...) e o computador fica lento,
// mesmo que cada peça seja pequenina. Muitos pedidos pequenos custam mais do que poucos grandes.
//
// A solução: as peças com o MESMO material (ex.: todas as copas de eucalipto de uma zona do mapa)
// são coladas numa só peça grande. A placa gráfica desenha-as todas de uma vez.
//
// Como funciona, em 2 passos:
//   1. bakeTile(group, swaying)  -> "coze" um quadrado: copia os pontos de cada peça já no sítio
//                                  certo do mundo e separa-os por material. Faz-se 1 vez por quadrado
//                                  (e outra vez quando o quadrado muda ou arde).
//   2. buildMeshes(bakedTiles)   -> cola os quadrados cozidos de uma zona (um "bloco" do mapa)
//                                  em poucas peças grandes: uma por material.
//
// E as árvores a balançar ao vento? Antes, cada árvore rodava sozinha. Agora estão coladas,
// por isso o balanço é feito pela placa gráfica: cada ponto da árvore guarda (no atributo
// "aSway") a sua fase, a altura acima do pé da árvore e para que lado se inclina.
// A cada frame só mudamos UM número: o tempo (swayTime.value).
import * as THREE from 'three';

// O relógio partilhado por todos os materiais que balançam. A vista muda-o em update(t).
export const swayTime = { value: 0 };

// ---------- 1. Cozer um quadrado ----------
// group    = o grupo do quadrado (com as casas, árvores, mato...), já posto no mundo
// swaying  = lista de { obj, phase } com as árvores que balançam (pode estar vazia)
// Devolve um Map: chave -> { material, castShadow, receiveShadow, renderOrder, arrays: {...} }
// A chave junta o material e as sombras: peças com sombras diferentes não podem ir juntas.
export function bakeTile(group, swaying) {
  group.updateMatrixWorld(true);
  const swayOf = swayLookup(group, swaying);
  const buckets = new Map();
  group.traverseVisible((mesh) => {
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.renderOrder}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        material: mesh.material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
        renderOrder: mesh.renderOrder, pieces: [],
      });
    }
    buckets.get(key).pieces.push(bakeMesh(mesh, swayOf(mesh)));
  });
  // cola as peças de cada material deste quadrado (assim o bloco depois só cola quadrados)
  for (const bucket of buckets.values()) {
    bucket.arrays = joinArrays(bucket.pieces);
    delete bucket.pieces;
  }
  return buckets;
}

// Para cada peça, descobre se pertence a uma árvore que balança e devolve os dados do balanço:
// { phase, footY, dirX, dirZ } ou null (não balança).
function swayLookup(group, swaying) {
  const byObject = new Map();
  for (const s of swaying) {
    const tree = s.obj;
    // O pé da árvore, no mundo
    const foot = tree.getWorldPosition(new THREE.Vector3());
    // A árvore rodava à volta do seu eixo z (rotation.z): o topo ia para o lado do seu eixo x.
    // Aqui calculamos para onde aponta esse eixo x no mundo (depende da rotação da árvore).
    const dir = new THREE.Vector3(1, 0, 0).transformDirection(tree.matrixWorld);
    byObject.set(tree, { phase: s.phase, footY: foot.y, dirX: dir.x, dirZ: dir.z });
  }
  return (mesh) => {
    for (let o = mesh; o && o !== group; o = o.parent) if (byObject.has(o)) return byObject.get(o);
    return null;
  };
}

// Copia os pontos de UMA peça para listas simples (Float32Array), já no sítio certo do mundo.
const normalMatrix = new THREE.Matrix3();
const v = new THREE.Vector3();
function bakeMesh(mesh, sway) {
  // Sem "índices": cada triângulo tem os seus 3 pontos (mais simples de colar).
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const count = geometry.attributes.position.count;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const swayData = new Float32Array(count * 4);
  const pos = geometry.attributes.position, nor = geometry.attributes.normal, tex = geometry.attributes.uv;
  normalMatrix.getNormalMatrix(mesh.matrixWorld);
  // Uma peça "ao espelho" (escala negativa) tem os triângulos virados ao contrário:
  // trocamos a ordem dos pontos para a placa gráfica não pensar que estão de costas.
  const mirrored = mesh.matrixWorld.determinant() < 0;
  for (let i = 0; i < count; i++) {
    // no triângulo (a, b, c), ao espelho escrevemos (a, c, b)
    const corner = i % 3, out = mirrored && corner > 0 ? i + (corner === 1 ? 1 : -1) : i;
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    position[out * 3] = v.x; position[out * 3 + 1] = v.y; position[out * 3 + 2] = v.z;
    if (nor) {
      v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      normal[out * 3] = v.x; normal[out * 3 + 1] = v.y; normal[out * 3 + 2] = v.z;
    }
    if (tex) { uv[out * 2] = tex.getX(i); uv[out * 2 + 1] = tex.getY(i); }
    if (sway) {
      swayData[out * 4] = sway.phase;
      swayData[out * 4 + 1] = Math.max(0, position[out * 3 + 1] - sway.footY); // altura acima do pé
      swayData[out * 4 + 2] = sway.dirX;
      swayData[out * 4 + 3] = sway.dirZ;
    }
  }
  if (geometry !== mesh.geometry) geometry.dispose();
  return { position, normal, uv, sway: swayData };
}

// Cola várias listas de pontos numa só (umas a seguir às outras).
const ATTRIBUTES = [['position', 3], ['normal', 3], ['uv', 2], ['sway', 4]];
function joinArrays(pieces) {
  const out = {};
  for (const [name] of ATTRIBUTES) {
    let total = 0;
    for (const piece of pieces) total += piece[name].length;
    out[name] = new Float32Array(total);
    let offset = 0;
    for (const piece of pieces) { out[name].set(piece[name], offset); offset += piece[name].length; }
  }
  return out;
}

// ---------- 2. Colar os quadrados de um bloco ----------
// bakedTiles = lista de Maps devolvidos por bakeTile. Devolve uma lista de Meshes (uma por chave).
export function buildMeshes(bakedTiles) {
  const byKey = new Map();
  for (const baked of bakedTiles) {
    for (const [key, bucket] of baked) {
      if (!byKey.has(key)) byKey.set(key, { ...bucket, list: [] });
      byKey.get(key).list.push(bucket.arrays);
    }
  }
  const meshes = [];
  for (const bucket of byKey.values()) {
    const arrays = joinArrays(bucket.list);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(arrays.normal, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(arrays.uv, 2));
    geometry.setAttribute('aSway', new THREE.BufferAttribute(arrays.sway, 4));
    const mesh = new THREE.Mesh(geometry, swayMaterial(bucket.material));
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    meshes.push(mesh);
  }
  return meshes;
}

// ---------- O material que balança ----------
// Uma cópia do material original que sabe inclinar os pontos com o vento (no "vertex shader",
// o programa da placa gráfica que põe cada ponto no sítio). Fazemos 1 cópia por material.
// A conta é a mesma de antes: inclinação = sin(tempo * 1.6 + fase) * 0.04,
// e cada ponto anda para o lado tanto mais quanto mais alto estiver na árvore.
const swayCopies = new Map();
function swayMaterial(original) {
  if (swayCopies.has(original)) return swayCopies.get(original);
  const material = original.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSway;\nuniform float uSwayTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // aSway = (fase, altura acima do pé, direção x, direção z); sem árvore, tudo 0 = não mexe
        float swayAngle = sin(uSwayTime * 1.6 + aSway.x) * 0.04;
        transformed.xz -= aSway.zw * swayAngle * aSway.y;`);
  };
  material.customProgramCacheKey = () => 'sway';
  swayCopies.set(original, material);
  return material;
}
