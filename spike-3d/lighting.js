// Iluminação e "aspeto de cinema" partilhados pela vila (main.js) e pela galeria.
// Mudar aqui muda o brilho, as cores e as sombras em todo o lado.
import * as THREE from 'three';

// Afina o renderizador: sombras, cores e exposição (brilho geral).
export function setupRenderer(renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
}

// Céu, nevoeiro e luzes. `size` = metade do tamanho da área que tem de ter sombras.
// Devolve { sun } para quem quiser mexer no sol (ex.: hora do dia).
export function addLights(scene, size = 16) {
  scene.background = new THREE.Color(0x9fd3ff);
  scene.fog = new THREE.Fog(0x9fd3ff, 40, 80);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x5a4a30, 1.2)); // luz do céu + reflexo do chão
  const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
  sun.position.set(-14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size });
  scene.add(sun);
  return { sun };
}
