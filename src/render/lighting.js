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

// As cores do céu (topo, meio, horizonte) de dia e de noite. A noite tem um brilho
// alaranjado no horizonte: é o reflexo do incêndio no fumo.
const SKY_DAY = ['#5fa8e6', '#a9d4f5', '#e2eff6'];
const SKY_NIGHT = ['#060a18', '#141c36', '#3a2630'];

// Céu em degradê: azul forte em cima, quase branco no horizonte.
// É uma imagem de 2x256 píxeis desenhada em código (nada é descarregado).
// Devolve { texture, paint(t) }: paint(t) redesenha o céu entre o dia (t = 0) e a noite (t = 1).
function makeSky() {
  if (typeof document === 'undefined') return { texture: new THREE.Color(0xa9d4f5), paint() {} }; // sem navegador
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const a = new THREE.Color(), b = new THREE.Color();
  const mix = (day, night, t) => '#' + a.set(day).lerp(b.set(night), t).getHexString();
  function paint(t) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, mix(SKY_DAY[0], SKY_NIGHT[0], t));    // topo do céu
    gradient.addColorStop(0.55, mix(SKY_DAY[1], SKY_NIGHT[1], t)); // meio
    gradient.addColorStop(1, mix(SKY_DAY[2], SKY_NIGHT[2], t));    // horizonte
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    texture.needsUpdate = true;
  }
  paint(0);
  return { texture, paint };
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

// Os valores de dia e de noite de cada luz. setTimeOfDay(t) mistura-os (t = 0 dia, 1 noite).
// De noite: o sol passa a ser um luar fraco e azulado, e são as luzes do FOGO que mandam
// (chamas aditivas, brilho e fumo iluminado por baixo só se veem bem no escuro).
const DAY = {
  sun: { color: 0xffe6c2, intensity: 3.0 }, fill: { color: 0xbfd8ff, intensity: 0.3 },
  hemiSky: 0xcfe4ff, hemiGround: 0x9c8a66, hemi: 1.0, env: 0.15,
  fog: { color: 0xdcecf5, near: 36, far: 90 },
};
const NIGHT = {
  sun: { color: 0x8fa6d8, intensity: 0.45 }, fill: { color: 0x4a5a8a, intensity: 0.15 },
  hemiSky: 0x2a3a66, hemiGround: 0x15110e, hemi: 0.45, env: 0.05,
  fog: { color: 0x10131f, near: 30, far: 80 },
};

// Céu, nevoeiro e luzes. `size` = metade do tamanho da área que tem de ter sombras.
// options.dayFog = { color, near, far } (opcional): o nevoeiro de DIA que um estilo prefere
// (ex.: Sintra, com a serra ao fundo, quer o ar limpo e azul das fotos, e não uma neblina branca).
// Devolve { sun, fill, hemi, setTimeOfDay(t) }: t = 0 é dia (sol forte), t = 1 é noite.
export function addLights(scene, size = 16, options = {}) {
  const dayFog = options.dayFog ?? DAY.fog;
  const sky = makeSky();
  scene.background = sky.texture;
  // Nevoeiro na cor do horizonte: o canto mais longe do tabuleiro fica levemente enevoado.
  scene.fog = new THREE.Fog(dayFog.color, dayFog.near, dayFog.far);
  // Luz do céu (azul fresco) + reflexo do chão (castanho claro e quente).
  const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemi);
  scene.add(hemi);
  addEnvironment(scene);

  const sun = makeSun(size);
  scene.add(sun);

  // Luz de enchimento azul-céu do outro lado: clareia as paredes na sombra (lado +x),
  // para se distinguirem das sombras projetadas no chão. Não faz sombras.
  const fill = new THREE.DirectionalLight(DAY.fill.color, DAY.fill.intensity);
  fill.position.set(14, 8, -10);
  fill.castShadow = false;
  scene.add(fill);

  // Muda a hora do dia: 0 = dia, 1 = noite (valores pelo meio = crepúsculo).
  const tmp = new THREE.Color();
  const lerpColor = (target, day, night, t) => target.copy(tmp.set(day)).lerp(new THREE.Color(night), t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function setTimeOfDay(t) {
    const k = Math.min(1, Math.max(0, t));
    lerpColor(sun.color, DAY.sun.color, NIGHT.sun.color, k);
    sun.intensity = lerp(DAY.sun.intensity, NIGHT.sun.intensity, k);
    lerpColor(fill.color, DAY.fill.color, NIGHT.fill.color, k);
    fill.intensity = lerp(DAY.fill.intensity, NIGHT.fill.intensity, k);
    lerpColor(hemi.color, DAY.hemiSky, NIGHT.hemiSky, k);
    lerpColor(hemi.groundColor, DAY.hemiGround, NIGHT.hemiGround, k);
    hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, k);
    scene.environmentIntensity = lerp(DAY.env, NIGHT.env, k);
    lerpColor(scene.fog.color, dayFog.color, NIGHT.fog.color, k);
    scene.fog.near = lerp(dayFog.near, NIGHT.fog.near, k);
    scene.fog.far = lerp(dayFog.far, NIGHT.fog.far, k);
    sky.paint(k);
  }

  return { sun, fill, hemi, setTimeOfDay };
}
