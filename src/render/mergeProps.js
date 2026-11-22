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
// Truque extra: os materiais "simples" (só uma cor, sem textura) que só diferem na cor viram
// UM material branco, e a cor de cada peça vai guardada nos seus pontos ("cores por vértice").
// O resultado no ecrã é igual (cor do material x cor do ponto), mas são muito menos pedidos.
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
    // Material simples: junta-se com os outros iguais a ele (menos a cor). Senão, vai sozinho.
    const plain = plainKey(mesh.material);
    const material = plain ? plainMaterial(plain, mesh.material) : mesh.material;
    const key = `${material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.renderOrder}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
        renderOrder: mesh.renderOrder, pieces: [],
      });
    }
    buckets.get(key).pieces.push(bakeMesh(mesh, swayOf(mesh), plain ? mesh.material.color : null));
  });
  // cola as peças de cada material deste quadrado (assim o bloco depois só cola quadrados)
  for (const bucket of buckets.values()) {
    bucket.arrays = joinArrays(bucket.pieces);
    delete bucket.pieces;
  }
  return buckets;
}

// ---------- Materiais "simples" ----------
// Um material é simples se for MeshStandardMaterial, sem texturas, sem transparência e sem
// programa especial. Nesse caso devolvemos uma "assinatura" com tudo MENOS a cor
// (dois materiais com a mesma assinatura só diferem na cor). Senão devolvemos null.
function plainKey(m) {
  if (m.type !== 'MeshStandardMaterial' || m.transparent || m.vertexColors) return null;
  if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return null;
  for (const value of Object.values(m)) if (value && value.isTexture) return null; // tem textura
  return JSON.stringify([
    m.roughness, m.metalness, m.flatShading, m.side, m.opacity, m.alphaTest, m.depthWrite, m.depthTest,
    m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.fog, m.wireframe,
    m.emissive.getHex(), m.emissiveIntensity, m.envMapIntensity,
  ]);
}

// O material branco partilhado por todos os materiais simples com a mesma assinatura.
const plainMaterials = new Map();
function plainMaterial(key, example) {
  if (!plainMaterials.has(key)) {
    const material = example.clone();
    material.color.set(0xffffff); // branco x cor do ponto = cor do ponto
    material.vertexColors = true;
    plainMaterials.set(key, material);
  }
  return plainMaterials.get(key);
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
// color = a cor a guardar em cada ponto (só para materiais simples), ou null.
// Para poupar memória, só guardamos o que faz falta:
//   uv    -> só para materiais com textura (os simples não precisam);
//   color -> só para os materiais simples;
//   sway  -> só para as peças das árvores que balançam.
function bakeMesh(mesh, sway, color) {
  // Sem "índices": cada triângulo tem os seus 3 pontos (mais simples de colar).
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const count = geometry.attributes.position.count;
  const pos = geometry.attributes.position, nor = geometry.attributes.normal, tex = geometry.attributes.uv;
  const baked = { position: new Float32Array(count * 3), normal: new Float32Array(count * 3) };
  if (!color) baked.uv = new Float32Array(count * 2);
  if (color) baked.color = new Float32Array(count * 3);
  if (sway) baked.sway = new Float32Array(count * 4);
  normalMatrix.getNormalMatrix(mesh.matrixWorld);
  // Uma peça "ao espelho" (escala negativa) tem os triângulos virados ao contrário:
  // trocamos a ordem dos pontos para a placa gráfica não pensar que estão de costas.
  const mirrored = mesh.matrixWorld.determinant() < 0;
  for (let i = 0; i < count; i++) {
    // no triângulo (a, b, c), ao espelho escrevemos (a, c, b)
    const corner = i % 3, k = mirrored && corner > 0 ? i + (corner === 1 ? 1 : -1) : i;
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    put(baked.position, k * 3, v.x, v.y, v.z);
    if (nor) {
      v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      put(baked.normal, k * 3, v.x, v.y, v.z);
    }
    if (baked.uv && tex) put(baked.uv, k * 2, tex.getX(i), tex.getY(i));
    if (color) put(baked.color, k * 3, color.r, color.g, color.b);
    if (sway) {
      const height = Math.max(0, baked.position[k * 3 + 1] - sway.footY); // altura acima do pé
      put(baked.sway, k * 4, sway.phase, height, sway.dirX, sway.dirZ);
    }
  }
  if (geometry !== mesh.geometry) geometry.dispose();
  return baked;
}

// Escreve 2, 3 ou 4 números seguidos numa lista, a começar na posição `at`.
// (Mais rápido do que lista.set([a, b, c], at), que cria uma lista nova para cada ponto.)
function put(list, at, a, b, c, d) {
  list[at] = a; list[at + 1] = b;
  if (c !== undefined) list[at + 2] = c;
  if (d !== undefined) list[at + 3] = d;
}

// Cola várias listas de pontos numa só (umas a seguir às outras).
// Se uma peça não tiver uma lista (ex.: um arbusto não tem "sway"), ficam zeros no seu lugar.
const SIZES = { position: 3, normal: 3, uv: 2, color: 3, sway: 4 };
function joinArrays(pieces) {
  const out = {};
  let points = 0;
  for (const piece of pieces) points += piece.position.length / 3;
  for (const [name, size] of Object.entries(SIZES)) {
    if (!pieces.some((piece) => piece[name])) continue; // ninguém tem esta lista
    out[name] = new Float32Array(points * size);
    let offset = 0;
    for (const piece of pieces) {
      if (piece[name]) out[name].set(piece[name], offset);
      offset += (piece.position.length / 3) * size;
    }
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
    if (!arrays.sway) arrays.sway = new Float32Array((arrays.position.length / 3) * 4); // nada balança
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', gpuOnly(arrays.position, 3));
    geometry.setAttribute('normal', gpuOnly(arrays.normal, 3));
    if (arrays.uv) geometry.setAttribute('uv', gpuOnly(arrays.uv, 2));
    if (arrays.color) geometry.setAttribute('color', gpuOnly(arrays.color, 3));
    geometry.setAttribute('aSway', gpuOnly(arrays.sway, 4));
    geometry.computeBoundingSphere(); // feito agora, enquanto ainda temos os pontos (serve para não desenhar o que está fora do ecrã)
    const mesh = new THREE.Mesh(geometry, swayMaterial(bucket.material));
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    meshes.push(mesh);
  }
  return meshes;
}

// Uma lista de pontos que, depois de enviada para a placa gráfica, é apagada da memória do
// browser (a placa gráfica fica com a sua cópia). Os pontos de cada quadrado continuam guardados
// em bakeTile, por isso conseguimos refazer o bloco quando quisermos.
function gpuOnly(array, size) {
  const attribute = new THREE.BufferAttribute(array, size);
  attribute.onUpload(function () { this.array = null; });
  return attribute;
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
