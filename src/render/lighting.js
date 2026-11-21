// Iluminação e "aspeto de cinema" partilhados pela vila (main.js) e pela galeria.
// Mudar aqui muda o brilho, as cores e as sombras em todo o lado.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Guardamos o renderizador para mais tarde: addLights() precisa dele para criar
// a "luz ambiente do ambiente" (environment map). setupRenderer() é chamado primeiro.
let _renderer = null;

// Afina o renderizador: sombras, cores e exposição (brilho geral).
export function setupRenderer(renderer) {
  _renderer = renderer;
  renderer.shadowMap.enabled = true;
  // PCFShadowMap (e não PCFSoftShadowMap, que está obsoleto e ignora shadow.radius).
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Neutral mantém as cores dos telhados fiéis (ACES/AgX mudam-nas ou tiram-lhes a cor).
  renderer.toneMapping = THREE.NeutralToneMapping;
  // Medido no ecrã: parede de cal ao sol ~230, à sombra ~140 (sem "queimar" a 255).
  renderer.toneMappingExposure = 1.05;
}

// Céu em degradê: azul forte em cima, quase branco no horizonte.
// É uma imagem de 2x256 píxeis desenhada em código (nada é descarregado).
function makeSkyBackground() {
  if (typeof document === 'undefined') return new THREE.Color(0xa9d4f5); // sem navegador: cor lisa
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#5fa8e6');    // topo do céu
  gradient.addColorStop(0.55, '#a9d4f5'); // meio
  gradient.addColorStop(1, '#e2eff6');    // horizonte
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Luz ambiente "de estúdio" (IBL): dá brilho suave e reflexos às superfícies,
// sem descarregar nenhuma imagem. Só ilumina — o fundo continua a ser o céu.
function addEnvironment(scene) {
  if (!_renderer) return; // setupRenderer() ainda não foi chamado
  const pmrem = new THREE.PMREMGenerator(_renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  // Fraquinha: só para levantar as sombras. A "sala" é muito clara — com 0.35 o lado
  // à sombra das casas ficava quase tão claro como o lado ao sol (casas "lisas").
  scene.environmentIntensity = 0.15;
  pmrem.dispose();
  if (room.dispose) room.dispose();
}

// Sol: luz quente que vem da esquerda/frente e projeta sombras.
// A câmara está em (+22, +20, +22), por isso vemos as faces +z (porta) e +x.
// Este sol ilumina bem a frente (+z) e deixa o lado +x na sombra (dá contraste).
function makeSun(size) {
  const sun = new THREE.DirectionalLight(0xffe6c2, 3.0);
  sun.position.set(-10, 20, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size });
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0004;     // evita "acne" (riscas) nas superfícies
  sun.shadow.normalBias = 0.02;  // idem, sobretudo nos telhados inclinados
  sun.shadow.radius = 3;         // bordas das sombras um pouco mais suaves
  sun.shadow.camera.updateProjectionMatrix();
  return sun;
}

// Céu, nevoeiro e luzes. `size` = metade do tamanho da área que tem de ter sombras.
// Devolve { sun, fill } para quem quiser mexer nas luzes (ex.: hora do dia).
export function addLights(scene, size = 16) {
  scene.background = makeSkyBackground();
  // Nevoeiro na cor do horizonte: o canto mais longe do tabuleiro fica levemente enevoado.
  scene.fog = new THREE.Fog(0xdcecf5, 36, 90);
  // Luz do céu (azul fresco) + reflexo do chão (castanho claro e quente).
  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x9c8a66, 1.0));
  addEnvironment(scene);

  const sun = makeSun(size);
  scene.add(sun);

  // Luz de enchimento azul-céu do outro lado: clareia as paredes na sombra (lado +x),
  // para se distinguirem das sombras projetadas no chão. Não faz sombras.
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.3);
  fill.position.set(14, 8, -10);
  fill.castShadow = false;
  scene.add(fill);

  return { sun, fill };
}
