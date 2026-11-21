// Efeitos visuais do fogo: chamas animadas, brilho, colunas de fumo, brasas a voar
// e brasas a fumegar depois de arder. Só desenha — QUEM decide o que arde é a simulação (src/sim).
//
// API:
//   const fx = createFireFx(scene, view, { wind })   // wind = { direction, speed } (opcional)
//   fx.ignite(x, y)              -> começa a mostrar fogo nesse quadrado (cresce aos poucos)
//   fx.setIntensity(x, y, v)     -> força do fogo nesse quadrado, de 0 (fraco) a 1 (fogo de copas)
//   fx.extinguish(x, y)          -> o fogo desse quadrado vai-se apagando
//   fx.smolder(x, y)             -> brasas a brilhar e fumo fino durante ~20 s (depois de arder)
//   fx.ember(fromX, fromY, toX, toY) -> uma brasa voa em arco de um quadrado para outro
//   fx.setWind(direction, speed) -> de onde vem o vento (graus) e a força (km/h): inclina o fumo
//   fx.clear()                   -> tira tudo (fogo, fumo, brasas)
//   fx.update(dt, t)             -> anima tudo; chamar a cada desenho
//
// COMO FUNCIONA (a ideia): cada "camada" (chamas, brilho, fumo, brasas) é UM só objeto
// THREE.Points com milhares de pontos. Cada ponto é desenhado como um quadradinho virado
// para a câmara, com uma imagem (textura) desenhada aqui em código num <canvas>.
// Um objeto por camada = poucos "pedidos" à placa gráfica, mesmo com 100 quadrados a arder.
import * as THREE from 'three';

// ---------- Números para afinar ----------
const FLAME_FRAMES = 16;      // imagens da animação das chamas
const MAX_LIGHTS = 8;         // número FIXO de luzes (ver explicação em createLights)
const SMOKE_CELL = 3;         // fogos num bloco de 3x3 quadrados partilham uma coluna de fumo
const SMOLDER_SECONDS = 20;   // quanto tempo um quadrado queimado fica a fumegar
const DEFAULT_GROUND_Y = 0.25; // altura do chão se a vista não disser (vista antiga sem terreno)

export function createFireFx(scene, view, options = {}) {
  const fires = new Map();      // "x,y" -> fogo a arder (ver newFire)
  const pendingIntensity = new Map(); // setIntensity antes de ignite: guardamos para depois
  const smolders = [];          // quadrados a fumegar
  const flyingEmbers = [];      // brasas a voar em arco
  const sparks = [];            // faúlhas que sobem das chamas
  const smoke = [];             // partículas de fumo
  const smokeSpawn = new Map(); // bloco de fumo -> "fumo por soltar" (acumulado)
  const wind = { x: 0, z: 1, speed: 0 };
  setWind(options.wind?.direction ?? 315, options.wind?.speed ?? 15);

  // As 4 camadas, desenhadas por esta ordem: fumo, brilho, chamas, brasas.
  const layers = {
    smoke: createLayer(scene, { capacity: 1400, texture: makeSmokeTexture(), frames: 4, additive: false, order: 1 }),
    glow: createLayer(scene, { capacity: 500, texture: makeGlowTexture(), frames: 1, additive: true, order: 2 }),
    flame: createLayer(scene, { capacity: 3000, texture: makeFlameTexture(), frames: FLAME_FRAMES, additive: true, order: 3 }),
    ember: createLayer(scene, { capacity: 4000, texture: makeEmberTexture(), frames: 1, additive: true, order: 4 }),
  };
  const lights = createLights(scene);

  // ======================= API =======================
  function ignite(x, y) {
    const key = `${x},${y}`;
    const existing = fires.get(key);
    if (existing) { existing.dying = false; return; } // estava a apagar-se: volta a arder
    fires.set(key, newFire(x, y, pendingIntensity.get(key) ?? 0.6));
  }

  function setIntensity(x, y, value) {
    const v = Math.min(1, Math.max(0, value));
    const fire = fires.get(`${x},${y}`);
    if (fire) fire.target = v;
    else pendingIntensity.set(`${x},${y}`, v);
  }

  function extinguish(x, y) {
    const fire = fires.get(`${x},${y}`);
    if (fire) fire.dying = true; // não desaparece de repente: encolhe durante ~1.5 s
  }

  function smolder(x, y) {
    const p = groundPosition(x, y);
    const dots = [];
    for (let i = 0; i < 6; i++) {
      dots.push({ ox: (Math.random() - 0.5) * 0.8, oz: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * 10, size: 0.05 + Math.random() * 0.06 });
    }
    smolders.push({ ...p, age: 0, dots, smokeToSpawn: 0 });
  }

  function ember(fromX, fromY, toX, toY) {
    const from = groundPosition(fromX, fromY), to = groundPosition(toX, toY);
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    flyingEmbers.push({
      from: { x: from.x, y: from.y + 0.9, z: from.z }, to,
      age: 0, duration: 0.9 + distance * 0.18, peak: 0.8 + distance * 0.35,
    });
  }

  // De onde vem o vento (graus, 0 = norte) e força (km/h). No mundo 3D: x = leste, z = sul.
  function setWind(direction, speed) {
    const radians = (direction * Math.PI) / 180;
    wind.x = -Math.sin(radians); // para onde o vento EMPURRA (downwind), como no GLOSSARY
    wind.z = Math.cos(radians);
    wind.speed = speed;
  }

  function clear() {
    fires.clear();
    pendingIntensity.clear();
    smokeSpawn.clear();
    for (const list of [smolders, flyingEmbers, sparks, smoke]) list.length = 0;
    for (const light of lights) light.intensity = 0;
    for (const layer of Object.values(layers)) { layer.begin(); layer.end(); }
  }

  function update(dt, t) {
    updateFires(dt);
    const clusters = findClusters();
    spawnSmoke(clusters, dt);
    updateLights(clusters, t);
    updateParticles(dt);
    drawEverything(t);
  }

  // ======================= Fogos =======================
  // Posição do centro de um quadrado, já com a altura do chão (y).
  function groundPosition(x, y) {
    const p = view.worldPosition(x, y);
    return { x: p.x, y: p.y ?? DEFAULT_GROUND_Y, z: p.z };
  }

  function newFire(x, y, intensity) {
    const p = groundPosition(x, y);
    const tongues = [];  // chamas baixas (fogo no chão)
    for (let i = 0; i < 4; i++) tongues.push(newTongue(0.32));
    const crown = [];    // chamas altas (fogo de copas, só com árvores altas e fogo forte)
    for (let i = 0; i < 3; i++) crown.push(newTongue(0.22));
    const fuelHeight = measureFuelHeight(p);
    return { ...p, target: intensity, intensity: 0, grow: 0, dying: false, tongues, crown, fuelHeight, sparkTimer: 0 };
  }

  // Que altura têm as coisas (árvores, casas) neste quadrado? Procuramos na cena os grupos
  // que estão no centro do quadrado e medimos o topo. Devolve null se não encontrar nada
  // (aí decidimos só pela intensidade).
  function measureFuelHeight(p) {
    let top = null;
    for (const object of scene.children) {
      if (!object.isGroup) continue;
      if (Math.abs(object.position.x - p.x) > 0.3 || Math.abs(object.position.z - p.z) > 0.3) continue;
      const box = new THREE.Box3().setFromObject(object);
      if (!box.isEmpty()) top = Math.max(top ?? -Infinity, box.max.y);
    }
    return top === null ? null : top - p.y;
  }

  // Este fogo é um fogo de copas? (árvores altas OU, sem medida, fogo muito forte)
  function crownPowerOf(fire, p) {
    if (fire.fuelHeight === null) return (p - 0.8) / 0.2;
    if (fire.fuelHeight < 0.9) return 0;            // relva, mato, árvores baixas: só chamas baixas
    return (p - 0.5) / 0.5;
  }

  // Uma "língua" de fogo: posição dentro do quadrado e o seu ritmo próprio.
  function newTongue(spread) {
    return {
      ox: (Math.random() - 0.5) * 2 * spread, oz: (Math.random() - 0.5) * 2 * spread,
      phase: Math.random() * 10, fps: 14 + Math.random() * 8, scale: 0.8 + Math.random() * 0.4,
    };
  }

  // Cresce ao acender, encolhe ao apagar; a intensidade muda devagar (sem saltos).
  function updateFires(dt) {
    for (const [key, fire] of fires) {
      fire.grow += (fire.dying ? -dt / 1.5 : dt / 1.2);
      fire.grow = Math.min(1, fire.grow);
      if (fire.grow <= 0) { fires.delete(key); continue; }
      fire.intensity += (fire.target - fire.intensity) * Math.min(1, dt * 1.5);
      emitSparks(fire, dt);
    }
  }

  // Força visível de um fogo agora (0 a 1).
  const power = (fire) => fire.intensity * fire.grow;

  // ======================= Fumo =======================
  // Junta os fogos em blocos de 3x3 quadrados: cada bloco faz UMA coluna de fumo.
  function findClusters() {
    const clusters = new Map();
    for (const fire of fires.values()) {
      const key = `${Math.floor(fire.x / SMOKE_CELL)},${Math.floor(fire.z / SMOKE_CELL)}`;
      if (!clusters.has(key)) clusters.set(key, { key, fires: [], strength: 0, x: 0, y: 0, z: 0 });
      const c = clusters.get(key);
      const w = power(fire);
      c.fires.push(fire);
      c.strength += w;
      c.x += fire.x * w; c.y += fire.y * w; c.z += fire.z * w;
    }
    for (const c of clusters.values()) {
      const total = c.strength || 1;
      c.x /= total; c.y /= total; c.z /= total; // centro "pesado" pela força dos fogos
    }
    return [...clusters.values()];
  }

  function spawnSmoke(clusters, dt) {
    for (const c of clusters) {
      const perSecond = Math.min(10, 2 + c.strength * 2.5);
      let toSpawn = (smokeSpawn.get(c.key) || 0) + perSecond * dt;
      while (toSpawn >= 1) {
        const fire = c.fires[Math.floor(Math.random() * c.fires.length)];
        addSmoke(fire, Math.min(1, c.strength / 3));
        toSpawn -= 1;
      }
      smokeSpawn.set(c.key, toSpawn);
    }
    // smolders: fumo fino que vai acabando
    // (só se houver espaço: o fumo dos incêndios tem prioridade)
    const roomForThin = smoke.length < layers.smoke.capacity * 0.6;
    for (const s of smolders) {
      if (!roomForThin) break;
      s.smokeToSpawn += dt * 0.5 * (1 - s.age / SMOLDER_SECONDS);
      while (s.smokeToSpawn >= 1) { addThinSmoke(s); s.smokeToSpawn -= 1; }
    }
  }

  // Fumo grosso de um incêndio: sai do topo das chamas, escuro em baixo, mais claro em cima.
  function addSmoke(fire, columnStrength) {
    if (smoke.length >= layers.smoke.capacity) return;
    const p = power(fire);
    smoke.push({
      x: fire.x + (Math.random() - 0.5) * 0.6, y: fire.y + 0.4 + p * 0.9, z: fire.z + (Math.random() - 0.5) * 0.6,
      rise: 0.55 + Math.random() * 0.3 + columnStrength * 0.35,
      age: 0, life: 6 + Math.random() * 3,
      size: 0.6 + p * 0.5, growth: 0.35 + columnStrength * 0.25,
      spin: Math.random() * 6, spinSpeed: (Math.random() - 0.5) * 0.6,
      frame: Math.floor(Math.random() * 4), alpha: 0.36, thin: false,
    });
  }

  // Fumo fino e claro de um quadrado a fumegar.
  function addThinSmoke(s) {
    if (smoke.length >= layers.smoke.capacity) return;
    smoke.push({
      x: s.x + (Math.random() - 0.5) * 0.7, y: s.y + 0.05, z: s.z + (Math.random() - 0.5) * 0.7,
      rise: 0.3 + Math.random() * 0.15, age: 0, life: 4 + Math.random() * 2,
      size: 0.15, growth: 0.22, spin: Math.random() * 6, spinSpeed: (Math.random() - 0.5) * 0.8,
      frame: Math.floor(Math.random() * 4), alpha: 0.18 * (1 - s.age / SMOLDER_SECONDS), thin: true,
    });
  }

  // ======================= Faúlhas e brasas =======================
  // Faúlhas: pontinhos que saltam das chamas, sobem e são levados pelo vento.
  function emitSparks(fire, dt) {
    if (fire.dying) return;
    fire.sparkTimer -= dt;
    if (fire.sparkTimer > 0 || sparks.length > 1500) return;
    fire.sparkTimer = (0.15 + Math.random() * 0.5) / (0.3 + power(fire));
    const height = 0.3 + power(fire) * 1.2;
    sparks.push({
      x: fire.x + (Math.random() - 0.5) * 0.5, y: fire.y + height * Math.random(), z: fire.z + (Math.random() - 0.5) * 0.5,
      vx: (Math.random() - 0.5) * 0.3, vy: 0.7 + Math.random() * 1.0, vz: (Math.random() - 0.5) * 0.3,
      age: 0, life: 0.8 + Math.random() * 1.4, size: 0.04 + Math.random() * 0.04, phase: Math.random() * 10,
    });
  }

  // Quando uma brasa a voar aterra, solta umas faúlhas e um bocadinho de fumo.
  function landEmber(e) {
    for (let i = 0; i < 8; i++) {
      sparks.push({
        x: e.to.x, y: e.to.y + 0.05, z: e.to.z,
        vx: (Math.random() - 0.5) * 1.2, vy: 0.4 + Math.random() * 0.9, vz: (Math.random() - 0.5) * 1.2,
        age: 0, life: 0.4 + Math.random() * 0.6, size: 0.04 + Math.random() * 0.03, phase: Math.random() * 10,
      });
    }
    addThinSmoke({ x: e.to.x, y: e.to.y, z: e.to.z, age: 0 });
  }

  // Posição de uma brasa a voar: em linha reta de "from" para "to", mais um arco para cima.
  function emberPosition(e, s) {
    const arc = e.peak * 4 * s * (1 - s); // parábola: 0 no início e no fim, máximo a meio
    return {
      x: e.from.x + (e.to.x - e.from.x) * s,
      y: e.from.y + (e.to.y - e.from.y) * s + arc,
      z: e.from.z + (e.to.z - e.from.z) * s,
    };
  }

  // ======================= Mexer as partículas =======================
  function updateParticles(dt) {
    const drift = 0.15 + (wind.speed / 30) * 0.9; // quanto o vento arrasta (unidades por segundo)
    moveAll(smoke, dt, (p, k) => {
      p.y += p.rise * dt * (1 - 0.4 * k);          // sobe, cada vez mais devagar
      const push = drift * dt * (0.3 + k * 1.2);    // lá em cima o vento é mais forte: a coluna inclina
      p.x += wind.x * push; p.z += wind.z * push;
      p.spin += p.spinSpeed * dt;
    });
    moveAll(sparks, dt, (p) => {
      p.vy -= 0.4 * dt;                              // a gravidade trava-as um pouco
      p.x += (p.vx + wind.x * drift * 1.5) * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + wind.z * drift * 1.5) * dt;
    });
    for (let i = flyingEmbers.length - 1; i >= 0; i--) {
      const e = flyingEmbers[i];
      e.age += dt;
      if (e.age >= e.duration) { landEmber(e); flyingEmbers.splice(i, 1); }
    }
    for (let i = smolders.length - 1; i >= 0; i--) {
      smolders[i].age += dt;
      if (smolders[i].age >= SMOLDER_SECONDS) smolders.splice(i, 1);
    }
  }

  // Envelhece cada partícula; tira as que chegaram ao fim da vida.
  // move(p, k) recebe k = idade de 0 (nova) a 1 (a acabar).
  function moveAll(list, dt, move) {
    let kept = 0;
    for (const p of list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      move(p, p.age / p.life);
      list[kept++] = p;
    }
    list.length = kept;
  }

  // ======================= Desenhar =======================
  function drawEverything(t) {
    for (const layer of Object.values(layers)) layer.begin();
    for (const fire of fires.values()) drawFire(fire, t);
    for (const p of smoke) drawSmoke(p);
    for (const p of sparks) drawSpark(p, t);
    for (const e of flyingEmbers) drawFlyingEmber(e);
    for (const s of smolders) drawSmolder(s, t);
    for (const layer of Object.values(layers)) layer.end();
  }

  function drawFire(fire, t) {
    const p = power(fire);
    if (p <= 0.01) return;
    const flicker = 0.85 + 0.15 * Math.sin(t * 13 + fire.x * 3) * Math.sin(t * 7.3 + fire.z);
    // Brilho: um halo laranja grande e suave à volta das chamas.
    layers.glow.push(fire.x, fire.y + 0.3 + p * 0.3, fire.z, 1.2 + p * 2.4, 1, 0.42, 0.12, 0.33 * flicker, 0, 0);
    // Chamas baixas: a altura depende da força (relva ~0.5, mato forte ~1).
    const redder = 1 - p; // fogos fracos são mais vermelhos, fortes mais amarelos
    for (const tongue of fire.tongues) {
      const height = (0.3 + p * 0.8) * tongue.scale * (1 + 0.1 * Math.sin(t * 6 + tongue.phase));
      drawTongue(fire, tongue, fire.y - 0.04, height, redder, t);
    }
    // Fogo de copas: árvores altas com fogo forte = chamas muito mais altas do que as árvores.
    const crownPower = crownPowerOf(fire, p);
    if (crownPower <= 0) return;
    const treeHeight = fire.fuelHeight ?? 1.2;
    for (const tongue of fire.crown) {
      const height = (0.6 + crownPower * 1.3) * treeHeight * tongue.scale * (1 + 0.12 * Math.sin(t * 5 + tongue.phase));
      drawTongue(fire, tongue, fire.y + treeHeight * 0.35, height, 0, t);
    }
  }

  // Uma chama: o quadradinho tem o tamanho da chama e fica com a BASE em baseY.
  function drawTongue(fire, tongue, baseY, height, redder, t) {
    const lean = Math.min(0.35, wind.speed / 100) * height; // o vento deita um pouco as chamas
    const frame = Math.floor(t * tongue.fps + tongue.phase * FLAME_FRAMES) % FLAME_FRAMES;
    layers.flame.push(
      fire.x + tongue.ox + wind.x * lean * 0.5, baseY + height * 0.48, fire.z + tongue.oz + wind.z * lean * 0.5,
      height, 1, 0.8 - redder * 0.25, 0.7 - redder * 0.35, Math.min(1, fire.grow * 1.5), frame, 0,
    );
  }

  function drawSmoke(p) {
    const k = p.age / p.life;
    const fadeIn = Math.min(1, k / 0.08), fadeOut = 1 - smoothstep(0.45, 1, k);
    const alpha = p.alpha * fadeIn * fadeOut;
    let r, g, b;
    if (p.thin) { r = 0.62; g = 0.61; b = 0.6; } // fumo fino: cinzento claro
    else {
      // escuro e acastanhado em baixo, cinzento claro em cima
      const m = Math.pow(k, 0.6);
      r = 0.2 + m * 0.42; g = 0.18 + m * 0.41; b = 0.17 + m * 0.41;
      const lit = Math.max(0, 1 - k / 0.12); // em baixo, o fogo ilumina o fumo de laranja
      r += lit * 0.45; g += lit * 0.16;
    }
    layers.smoke.push(p.x, p.y, p.z, p.size + p.growth * p.age, r, g, b, alpha, p.frame, p.spin);
  }

  function drawSpark(p, t) {
    const k = p.age / p.life;
    const twinkle = 0.6 + 0.4 * Math.sin(t * 25 + p.phase);
    layers.ember.push(p.x, p.y, p.z, p.size, 1, 0.55 - k * 0.25, 0.15, (1 - k) * twinkle, 0, 0);
  }

  // Brasa a voar: a "cabeça" brilhante e um rasto de 5 pontos atrás dela.
  function drawFlyingEmber(e) {
    const s = e.age / e.duration;
    for (let i = 0; i < 6; i++) {
      const back = Math.max(0, s - i * 0.025);
      const pos = emberPosition(e, back);
      const fade = 1 - i / 6;
      layers.ember.push(pos.x, pos.y, pos.z, (i === 0 ? 0.16 : 0.09) * fade + 0.03, 1, 0.6 + 0.3 * fade, 0.25, fade, 0, 0);
    }
    if (s < 0.95) {
      const pos = emberPosition(e, s);
      layers.glow.push(pos.x, pos.y, pos.z, 0.6, 1, 0.45, 0.1, 0.25, 0, 0);
    }
  }

  // Quadrado a fumegar: pontinhos vermelhos que pulsam e se vão apagando.
  function drawSmolder(s, t) {
    const left = 1 - s.age / SMOLDER_SECONDS;
    for (const d of s.dots) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + d.phase);
      const alpha = (0.35 + 0.65 * pulse * pulse) * Math.pow(left, 1.3);
      layers.ember.push(s.x + d.ox, s.y + 0.03, s.z + d.oz, d.size, 1, 0.32 + 0.2 * pulse, 0.08, alpha, 0, 0);
    }
  }

  // ======================= Luzes =======================
  // As luzes vão para os maiores blocos de fogo, a tremeluzir.
  function updateLights(clusters, t) {
    clusters.sort((a, b) => b.strength - a.strength);
    lights.forEach((light, i) => {
      const c = clusters[i];
      if (!c || c.strength < 0.02) { light.intensity = 0; return; }
      const s = Math.min(3, c.strength);
      const flicker = 0.8 + 0.2 * Math.sin(t * 17 + i * 2) * Math.sin(t * 9.1 + i);
      light.position.set(c.x, c.y + 0.9, c.z);
      light.intensity = (3 + s * 4) * flicker;
      light.distance = 4 + s * 1.5;
    });
  }

  return { ignite, setIntensity, extinguish, smolder, ember, setWind, clear, update };
}

// =====================================================================================
// LUZES — um número FIXO, criadas já aqui e "desligadas" (intensidade 0).
// Porquê? Sempre que o número de luzes da cena muda, o three.js recompila os shaders
// de todos os materiais e o jogo congela 1 a 2 segundos. Assim o número nunca muda.
// =====================================================================================
function createLights(scene) {
  const lights = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const light = new THREE.PointLight(0xff7a2a, 0, 5);
    scene.add(light);
    lights.push(light);
  }
  return lights;
}

// =====================================================================================
// CAMADA DE PARTÍCULAS: um THREE.Points com um "shader" pequenino (programa da placa gráfica).
// Cada ponto tem: posição, tamanho (em unidades do mundo), cor, transparência,
// número da imagem (frame) na tira de imagens da textura e rotação.
// Uso: layer.begin(); layer.push(...) para cada ponto; layer.end();
// =====================================================================================
const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aFrame;
  attribute float aSpin;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFrame;
  varying float vSpin;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    // tamanho em píxeis = tamanho no mundo, mais pequeno quando está longe
    gl_PointSize = aSize * uScale / -viewPosition.z;
    vColor = aColor; vAlpha = aAlpha; vFrame = aFrame; vSpin = aSpin;
  }
`;
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFrames;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFrame;
  varying float vSpin;
  void main() {
    // roda o quadradinho (para o fumo não parecer sempre igual)
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vSpin), s = sin(vSpin);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
    // escolhe a imagem certa na tira (as imagens estão lado a lado)
    vec2 uv = vec2((p.x + vFrame) / uFrames, 1.0 - p.y);
    vec4 image = texture2D(uMap, uv);
    gl_FragColor = vec4(image.rgb * vColor, image.a * vAlpha);
    if (gl_FragColor.a < 0.004) discard;
  }
`;

function createLayer(scene, { capacity, texture, frames, additive, order }) {
  const geometry = new THREE.BufferGeometry();
  const attribute = (name, size) => {
    const attr = new THREE.BufferAttribute(new Float32Array(capacity * size), size);
    attr.setUsage(THREE.DynamicDrawUsage); // muda a cada desenho
    geometry.setAttribute(name, attr);
    return attr.array;
  };
  const data = {
    position: attribute('position', 3), size: attribute('aSize', 1), color: attribute('aColor', 3),
    alpha: attribute('aAlpha', 1), frame: attribute('aFrame', 1), spin: attribute('aSpin', 1),
  };
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: texture }, uFrames: { value: frames }, uScale: { value: 500 } },
    vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER,
    transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // os pontos mexem-se: não vale a pena calcular se estão à vista
  points.renderOrder = order;
  // Antes de desenhar: converter "tamanho no mundo" para píxeis, conforme a câmara e o ecrã.
  const bufferSize = new THREE.Vector2();
  points.onBeforeRender = (renderer, _scene, camera) => {
    renderer.getDrawingBufferSize(bufferSize);
    material.uniforms.uScale.value = bufferSize.y * 0.5 * camera.projectionMatrix.elements[5];
  };
  scene.add(points);

  let count = 0;
  return {
    capacity,
    begin() { count = 0; },
    push(x, y, z, size, r, g, b, alpha, frame, spin) {
      if (count >= capacity) return; // cheio: ignorar o resto
      data.position.set([x, y, z], count * 3);
      data.color.set([r, g, b], count * 3);
      data.size[count] = size; data.alpha[count] = alpha;
      data.frame[count] = frame; data.spin[count] = spin;
      count++;
    },
    end() {
      geometry.setDrawRange(0, count);
      for (const name of Object.keys(geometry.attributes)) {
        const attr = geometry.attributes[name];
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, count * attr.itemSize); // só envia a parte usada
        attr.needsUpdate = true;
      }
    },
  };
}

// =====================================================================================
// TEXTURAS desenhadas em código (nada é descarregado)
// =====================================================================================

// CHAMAS: 16 imagens lado a lado. Cada píxel é calculado: uma forma de gota
// "rasgada" por ruído (noise) que sobe. A última imagem liga com a primeira (loop).
function makeFlameTexture() {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S * FLAME_FRAMES, S);
  const image = ctx.createImageData(S * FLAME_FRAMES, S);
  const noise = makeLoopingNoise(8, 7);
  for (let f = 0; f < FLAME_FRAMES; f++) {
    const scroll = (f / FLAME_FRAMES) * 8; // o ruído sobe uma "volta" inteira em 16 imagens
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const u = ((px + 0.5) / S) * 2 - 1;   // -1 (esquerda) a 1 (direita)
        const v = 1 - (py + 0.5) / S;         // 0 (base) a 1 (topo)
        const heat = flameHeat(u, v, noise, scroll);
        const [r, g, b] = fireColor(heat);
        const i = (py * S * FLAME_FRAMES + f * S + px) * 4;
        image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas, false);
}

// Quão "quente" é um ponto da chama (0 = nada, 1 = centro branco).
function flameHeat(u, v, noise, scroll) {
  const n = noise.fbm(u * 2 + 4, v * 3.5 - scroll);       // ruído grande, a subir
  const wobble = noise.fbm(u * 1.5 + 1, v * 2 - scroll);
  const width = 0.46 * Math.pow(Math.max(0, 1 - v), 0.7) * Math.min(1, (v + 0.06) * 5);
  if (width <= 0) return 0;
  const bent = u + (wobble - 0.5) * 0.7 * v;              // a chama dobra-se mais lá em cima
  const edge = Math.abs(bent) / width;                    // 0 no meio, 1 na borda
  return (1 - edge) * (1.3 - v * 0.75) - (n - 0.35) * 0.9 * v;
}

// Do "calor" para a cor: preto -> vermelho -> laranja -> amarelo -> quase branco.
function fireColor(heat) {
  const h = Math.max(0, Math.min(1, heat));
  const stops = [
    [0.0, 0, 0, 0], [0.12, 0, 0, 0], [0.25, 150, 25, 5], [0.42, 240, 90, 15],
    [0.62, 255, 170, 40], [0.82, 255, 225, 120], [1.0, 255, 250, 215],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i], k = (h - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
  }
  return stops[stops.length - 1].slice(1);
}

// FUMO: 4 "nuvenzinhas" fofas diferentes, cada uma feita de vários círculos esbatidos.
function makeSmokeTexture() {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S * 4, S);
  const random = seededRandom(11);
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i < 9; i++) {
      const angle = random() * Math.PI * 2, dist = random() * S * 0.18;
      const cx = f * S + S / 2 + Math.cos(angle) * dist, cy = S / 2 + Math.sin(angle) * dist;
      const r = S * (0.18 + random() * 0.14);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.32)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.14)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(f * S, 0, S, S);
    }
  }
  return canvasTexture(canvas, false);
}

// BRILHO: um círculo de luz esbatido (preto = não soma nada, porque é "aditivo").
function makeGlowTexture() {
  return radialTexture([[0, '#ffffff'], [0.25, '#7a7a7a'], [0.6, '#1e1e1e'], [1, '#000000']]);
}

// BRASA: um ponto pequeno muito brilhante com um halo curto.
function makeEmberTexture() {
  return radialTexture([[0, '#ffffff'], [0.18, '#ffffff'], [0.4, '#5a5a5a'], [1, '#000000']]);
}

function radialTexture(stops) {
  const S = 64;
  const { canvas, ctx } = makeCanvas(S, S);
  const gradient = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, S, S);
  return canvasTexture(canvas, true);
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

// Tiras de imagens não podem usar "mipmaps" (as imagens vizinhas misturavam-se).
function canvasTexture(canvas, mipmaps) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = mipmaps;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// =====================================================================================
// RUÍDO (noise): números ao acaso "suaves". Repete-se de `period` em `period`,
// para a animação das chamas dar a volta sem salto.
// =====================================================================================
function makeLoopingNoise(period, seed) {
  const random = seededRandom(seed);
  const grid = [];
  for (let i = 0; i < period * period; i++) grid.push(random());
  const at = (ix, iy) => grid[mod(iy, period) * period + mod(ix, period)];
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return top + (bottom - top) * fy;
  }
  // fbm = várias camadas de ruído (grande + médio + pequeno), como nas nuvens
  const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2, y * 2) * 0.3 + noise(x * 4, y * 4) * 0.15;
  return { fbm };
}

const mod = (a, n) => ((a % n) + n) % n;
const smooth = (t) => t * t * (3 - 2 * t);
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function seededRandom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
