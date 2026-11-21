// ESTILO BÁSICO (referência) — formas simples. Cada região (portugal.js, canada.js...)
// exporta exatamente as mesmas funções, com a arquitetura e as árvores do lugar real.
//
// CONTRATO DE UM ESTILO (todas as funções recebem `rand`, um gerador de acaso com semente:
// chamar rand() devolve um número entre 0 e 1; usar SEMPRE rand() em vez de Math.random(),
// para a vila sair igual de cada vez):
//   palette               -> cores do chão: { grass, brush, dirt, road, cleared, firebreak, water, burned }
//   buildHouse(rand)      -> THREE.Group, uma casa
//   buildSchool(rand)     -> THREE.Group, a escola/centro de saúde (tem de se distinguir das casas)
//   buildTree(kind, rand) -> THREE.Group; kind = 'conifer' (eucalipto/pinheiro, arde muito) ou 'broadleaf' (folhosa)
//   buildBush(rand)       -> THREE.Group, um tufo de mato/arbusto
// Regras de tamanho: 1 quadrado = 1 unidade. Cada objeto fica centrado em x=0,z=0, com a base em y=0.
//   Casas/escola: pegada até 0.9 x 0.9, altura até ~1.2. Árvores: até ~1.3 de altura. Arbustos: pequenos.
// Desempenho: há ~400 quadrados; reutilizar geometrias e materiais (criar uma vez, fora das funções).
// Para algo animar (ex.: bandeira), pôr no grupo: group.userData.animate = (t) => { ... }.
import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });
const M = {
  trunk: mat(0x6b4426), conifer: mat(0x2e6b3a), leaf: mat(0x4f9a46), bush: mat(0x7a8c35),
  wall: mat(0xf1e6d2), roof: mat(0xc0462d), school: mat(0xf0b04a), dark: mat(0x2c3e50), flag: mat(0xd23c2c),
};
const G = {
  trunk: new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6),
  cone: new THREE.ConeGeometry(0.25, 0.45, 7),
  crown: new THREE.IcosahedronGeometry(0.32, 0),
  bush: new THREE.DodecahedronGeometry(0.14, 0),
};

export const palette = {
  grass: 0x79b94f, brush: 0x9c8f3e, dirt: 0x7a5634, road: 0x6f6f73,
  cleared: 0xc9b38a, firebreak: 0x6b4a2c, water: 0x3b8fd9, burned: 0x2a2522,
};

function shadows(group) {
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

export function buildHouse(rand) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.5), M.wall);
  body.position.y = 0.2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.47, 0.28, 4), M.roof);
  roof.position.y = 0.54; roof.rotation.y = Math.PI / 4;
  g.add(body, roof);
  g.rotation.y = Math.floor(rand() * 4) * (Math.PI / 2);
  return shadows(g);
}

export function buildSchool(rand) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.7), M.school);
  body.position.y = 0.275;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8), M.dark);
  pole.position.set(0.4, 0.4, 0.4);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.01), M.flag);
  flag.position.set(0.5, 0.72, 0.4);
  g.add(body, pole, flag);
  g.userData.animate = (t) => { flag.rotation.y = Math.sin(t * 6) * 0.3; };
  return shadows(g);
}

export function buildTree(kind, rand) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(G.trunk, M.trunk);
  trunk.position.y = 0.15;
  g.add(trunk);
  if (kind === 'conifer') {
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(G.cone, M.conifer);
      c.position.y = 0.35 + k * 0.2; c.scale.setScalar(1 - k * 0.25);
      g.add(c);
    }
  } else {
    const crown = new THREE.Mesh(G.crown, M.leaf);
    crown.position.y = 0.5;
    g.add(crown);
  }
  g.scale.setScalar(0.85 + rand() * 0.3);
  return shadows(g);
}

export function buildBush(rand) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.bush, M.bush);
  b.position.y = 0.08;
  g.add(b);
  g.scale.setScalar(0.8 + rand() * 0.5);
  return shadows(g);
}
