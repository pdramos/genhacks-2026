// O VENTO À VISTA no mapa 3D: para o jogador saber de onde vem o vento sem ler a bússola.
// Três coisas, todas feitas em código (nada é descarregado):
//   1) RISCOS DE VENTO: traços brancos, finos e meio transparentes (como nos desenhos animados)
//      que deslizam por cima do mapa A FAVOR do vento. Cada risco nasce, viaja e desaparece,
//      e volta a nascer noutro sítio. A ponta da frente é mais forte: o risco "aponta" para
//      onde o vento vai. Com mais vento andam mais depressa (e há mais riscos).
//   2) A MANGA DE VENTO no quartel dos bombeiros: um mastro com um cone às riscas vermelhas e
//      brancas que aponta para onde o vento vai, fica mais esticada com vento forte e abana.
//      De noite acende-se um pouco (como as mangas dos aeroportos).
//   3) AS ÁRVORES: todas se inclinam a favor do vento (a conta está em mergeProps.js, treeWind).
//      Aqui só lhe dizemos o vento (setTreeWind) e empurramos a "onda" das rajadas.
//
// API:
//   const windFx = createWindFx(scene, { view, village, wind })
//       view    = a vista da vila (village3d.js): altura do chão, topo das árvores, caixa do quartel
//       village = a vila da simulação (tamanho do mapa e onde fica o quartel, 'school')
//       wind    = o vento do início { direction, speed, gust } (a previsão, passo 0)
//   windFx.setWind(direction, speed, gust) -> muda o vento (direction = de onde VEM, em graus,
//                                             0 = norte; speed e gust em km/h, gust pode faltar)
//   windFx.setNight(k)                     -> 0 = dia, 1 = noite (os riscos ficam mais discretos)
//   windFx.update(dt, t)                   -> anima tudo; chamar a cada desenho
//
// Desempenho: TODOS os riscos são UMA só peça (uma "InstancedBufferGeometry": a placa gráfica
// desenha a mesma tira muitas vezes, cada uma no seu sítio), por isso custam 1 pedido de desenho.
// A cada frame só escrevemos uns números em listas que já existem (nada de objetos novos).
import * as THREE from 'three';
import { setTreeWind, treeWind, GUST_WAVE_SCALE } from './mergeProps.js';

// Quantos riscos: menos em telemóveis (ecrã de toque ou ecrã pequeno), para poupar a placa gráfica.
function streakCount() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const small = typeof innerWidth === 'number' && Math.min(innerWidth, innerHeight) < 600;
  return coarse || small ? 36 : 70;
}

export function createWindFx(scene, { view, village, wind = { direction: 0, speed: 15 } } = {}) {
  const W = village.width, H = village.height;
  const halfX = (W - 1) / 2, halfZ = (H - 1) / 2;

  // ---------- O vento de agora ----------
  // O vento "alvo" (o último que nos deram) e o vento mostrado, que roda devagar até ao alvo
  // (assim, quando o vento muda de hora para hora, nada salta de repente).
  let targetAngle = 0, angle = 0, speed = 0, gust = 0;
  let dirX = 0, dirZ = 1; // para onde o vento empurra (downwind), no mundo: x = leste, z = sul
  let first = true;

  function setWind(direction, newSpeed, newGust) {
    targetAngle = (direction * Math.PI) / 180;
    speed = Math.max(0, newSpeed || 0);
    gust = Math.max(speed, newGust ?? speed); // sem rajadas: a rajada é o próprio vento
    if (first) { angle = targetAngle; first = false; } // a primeira vez vai logo para lá
    applyAngle();
  }

  // Põe o ângulo de agora nas árvores, nos riscos e na manga.
  function applyAngle() {
    dirX = -Math.sin(angle); // downwind, como no GLOSSARY: x = -sin(d), z = cos(d)
    dirZ = Math.cos(angle);
    setTreeWind((angle * 180) / Math.PI, speed, gust);
  }

  // A velocidade dos riscos no mapa (quadrados por segundo): ~3.4 com 33 km/h.
  const travelSpeed = () => 0.8 + speed * 0.08;
  // A força das rajadas: 0 = sem rajadas, 1 = rajadas do dobro do vento (como nessa noite:
  // 33 e 67 km/h); no máximo 1.5.
  const gustiness = () => Math.min(1.5, (gust - speed) / Math.max(speed, 1));
  // A onda das rajadas num ponto do mundo (0 a 1): a MESMA que dobra as árvores (mergeProps.js).
  const gustWaveAt = (x, z) => {
    const w = 0.5 + 0.5 * Math.sin((x * dirX + z * dirZ) * GUST_WAVE_SCALE - treeWind.wave.value);
    return w * w;
  };

  // ---------- 1. A "altura de voo" dos riscos ----------
  // Para cada quadrado (e uma margem de 2 à volta do mapa) guardamos a altura mais alta do chão,
  // das árvores e das casas por perto. Os riscos voam um pouco acima disso: passam por cima das
  // copas e seguem o relevo (sobem a serra, descem para a vila). Calcula-se só uma vez.
  const M = 2, GW = W + 2 * M, GH = H + 2 * M;
  const floor = new Float32Array(GW * GH);
  {
    const raw = new Float32Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const x = gx - M, y = gy - M;
        const ground = view.terrain.heightAtWorld(x - halfX, y - halfZ);
        const inside = x >= 0 && y >= 0 && x < W && y < H;
        raw[gy * GW + gx] = Math.max(ground, (inside && view.propTop(x, y)) || -Infinity);
      }
    }
    // O mais alto dos 9 quadrados à volta (um risco não pode raspar na árvore do vizinho).
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        let high = -Infinity;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const sx = Math.min(GW - 1, Math.max(0, gx + ox)), sy = Math.min(GH - 1, Math.max(0, gy + oy));
            high = Math.max(high, raw[sy * GW + sx]);
          }
        }
        floor[gy * GW + gx] = high;
      }
    }
  }
  // A altura de voo num ponto qualquer do mundo: mistura os 4 quadrados mais perto (como o terreno).
  function floorAt(wx, wz) {
    const fx = Math.min(GW - 1.001, Math.max(0, wx + halfX + M));
    const fy = Math.min(GH - 1.001, Math.max(0, wz + halfZ + M));
    const ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
    const i = iy * GW + ix;
    const top = floor[i] + (floor[i + 1] - floor[i]) * ax;
    const bottom = floor[i + GW] + (floor[i + GW + 1] - floor[i + GW]) * ax;
    return top + (bottom - top) * ay;
  }

  // ---------- 2. Os riscos de vento ----------
  const N = streakCount();
  // Uma tira comprida: u vai de 0 (a cauda, do lado de onde o vento vem) a 1 (a ponta da frente);
  // v vai de -1 a 1 (de um lado ao outro da tira). O "vertex shader" dobra-a no sítio certo.
  const SEGMENTS = 12;
  const strip = new THREE.InstancedBufferGeometry();
  {
    const points = [], triangles = [];
    for (let i = 0; i <= SEGMENTS; i++) points.push(i / SEGMENTS, -1, 0, i / SEGMENTS, 1, 0);
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2;
      triangles.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    strip.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    strip.setIndex(triangles);
  }
  // Os números de cada risco (mudam a cada frame): onde está a cauda, onde está a ponta e o aspeto.
  const tailAttr = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const headAttr = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const lookAttr = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); // (transparência, largura, fase da onda)
  for (const attr of [tailAttr, headAttr, lookAttr]) attr.setUsage(THREE.DynamicDrawUsage);
  strip.setAttribute('aTail', tailAttr);
  strip.setAttribute('aHead', headAttr);
  strip.setAttribute('aLook', lookAttr);
  strip.instanceCount = N;

  const streakMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(1, 1, 1) },
      uEdgeColor: { value: new THREE.Color(0.42, 0.5, 0.6) },
      uOpacity: { value: 0.9 },
      uViewportH: { value: 800 }, // a altura do desenho em píxeis (para a largura mínima)
      uWavePhase: { value: 0 },   // para a onda correr ao longo do risco (muda com o tempo)
    },
    vertexShader: /* glsl */ `
      attribute vec3 aTail;
      attribute vec3 aHead;
      attribute vec3 aLook;
      uniform float uViewportH;
      uniform float uWavePhase;
      varying float vU;
      varying float vV;
      varying float vAlpha;
      void main() {
        float u = position.x;
        vec3 axis = aHead - aTail;
        float len = max(length(axis), 0.0001);
        axis /= len;
        // Ponto ao longo do risco, com uma curvinha para cima no meio (como um traço desenhado à mão)
        vec3 p = mix(aTail, aHead, u);
        p.y += sin(3.14159 * u) * 0.06 * len;
        // ...e uma ONDA para os lados que corre da cauda para a ponta, como uma fita ao vento.
        // É isto que faz o risco parecer vento e não chuva, mesmo quando vem direito à câmara.
        vec3 across = normalize(vec3(-axis.z, 0.0, axis.x) + vec3(0.0001, 0.0, 0.0));
        p += across * sin(u * 7.5 - uWavePhase + aLook.z) * 0.07 * len * (1.0 - 0.6 * u);
        // A tira vira-se sempre para a câmara (roda à volta do seu comprimento): vê-se de qualquer lado.
        vec3 toCamera = normalize(cameraPosition - p);
        vec3 side = normalize(cross(axis, toCamera) + vec3(0.0, 0.0001, 0.0));
        // Largura: fina na cauda, mais grossa perto da ponta, e pontiaguda nas duas pontas.
        float shape = sin(3.14159 * pow(u, 1.5));
        // Nunca mais fina do que ~3 píxeis no ecrã (de longe, ou num telemóvel, continuava a ver-se).
        float pixel = 2.0 * length(cameraPosition - p) / (projectionMatrix[1][1] * uViewportH);
        float width = max(aLook.y, 2.0 * pixel);
        p += side * position.y * width * shape;
        vU = u;
        vV = position.y;
        vAlpha = aLook.x;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uEdgeColor;
      uniform float uOpacity;
      varying float vU;
      varying float vV;
      varying float vAlpha;
      void main() {
        // A cauda desvanece e a ponta da frente é forte: o risco "aponta" para onde o vento vai.
        float along = smoothstep(0.0, 0.5, vU) * (1.0 - smoothstep(0.94, 1.0, vU));
        // De um lado ao outro: o meio é branco e forte; a beira é azul-acinzentada (um "contorno"
        // suave, para o risco branco se ver também em cima de chão claro, casas e caminhos).
        float across = 1.0 - vV * vV;
        vec3 color = mix(uEdgeColor, uColor, smoothstep(0.3, 0.75, across));
        gl_FragColor = vec4(color, vAlpha * along * smoothstep(0.0, 0.35, across) * uOpacity);
      }`,
    transparent: true,
    depthWrite: false, // não tapa o que está atrás (fumo, chamas)
    fog: false,        // o nevoeiro não os apaga
  });
  const streaks = new THREE.Mesh(strip, streakMaterial);
  streaks.frustumCulled = false; // os riscos andam pelo mapa todo (a "caixa" da tira não serve)
  streaks.raycast = () => {};    // o rato atravessa-os: nunca tapam um clique num quadrado
  streaks.renderOrder = 7;       // depois das marcas no chão da construção (4 a 6): voam por cima delas
  streaks.onBeforeRender = (renderer) => { streakMaterial.uniforms.uViewportH.value = renderer.domElement.height || 800; };
  scene.add(streaks);

  // O estado de cada risco, em listas de números (nada de objetos novos a cada frame):
  //   x, z = a ponta da frente no mundo; life/duration = idade e quanto vive (segundos);
  //   length = o comprimento máximo; pace = mais rápido ou mais lento que o vento (cada um o seu);
  //   lift = a quanto voa acima das copas; on = 1 se aparece nesta volta, 0 se fica escondido.
  const sx = new Float32Array(N), sz = new Float32Array(N), life = new Float32Array(N);
  const duration = new Float32Array(N), length = new Float32Array(N), pace = new Float32Array(N);
  const lift = new Float32Array(N), on = new Float32Array(N), widthOf = new Float32Array(N);
  // Acaso com semente (os riscos não mudam nada no jogo, mas assim cada abertura é igual).
  let seed = 12345;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // A área onde os riscos nascem e vivem: o mapa (até à beira dos quadrados da borda).
  const minX = -halfX - 0.5, maxX = halfX + 0.5, minZ = -halfZ - 0.5, maxZ = halfZ + 0.5;

  function respawn(i, startAge) {
    sx[i] = minX + rand() * (maxX - minX);
    sz[i] = minZ + rand() * (maxZ - minZ);
    duration[i] = 1.6 + rand() * 1.2;
    life[i] = startAge ? rand() * duration[i] : 0;
    length[i] = 1.6 + rand() * 1.6;
    pace[i] = 0.8 + rand() * 0.45;
    lift[i] = 0.25 + rand() * 0.7;
    widthOf[i] = 0.07 + rand() * 0.04; // metade da largura
    // Com pouco vento há poucos riscos; com vento forte quase todos aparecem (e mais nas rajadas).
    const share = Math.min(1, 0.15 + speed / 40) * (0.85 + 0.3 * gustWaveAt(sx[i], sz[i]));
    on[i] = rand() < share ? 1 : 0;
  }

  // Quão "dentro" do mapa está um ponto: 1 no meio, 0 na margem (os riscos desvanecem na borda).
  function edgeFade(x, z) {
    const d = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
    return Math.min(1, Math.max(0, d / 1.5));
  }

  function updateStreaks(dt) {
    const base = travelSpeed(), gusty = gustiness();
    const tail = tailAttr.array, head = headAttr.array, look = lookAttr.array;
    for (let i = 0; i < N; i++) {
      life[i] += dt;
      if (life[i] >= duration[i]) respawn(i, false);
      // Mais rápido onde passa a rajada (a mesma onda que dobra as árvores).
      const v = base * pace[i] * (1 + 0.5 * gusty * gustWaveAt(sx[i], sz[i]));
      sx[i] += dirX * v * dt;
      sz[i] += dirZ * v * dt;
      // Nasce (cresce e aparece), viaja, e morre (encolhe e desaparece): 0 -> 1 -> 0.
      const grow = Math.sin((Math.PI * life[i]) / duration[i]);
      const len = length[i] * (0.35 + 0.65 * grow);
      const hx = sx[i], hz = sz[i], tx = hx - dirX * len, tz = hz - dirZ * len;
      tail[i * 3] = tx; tail[i * 3 + 1] = floorAt(tx, tz) + lift[i]; tail[i * 3 + 2] = tz;
      head[i * 3] = hx; head[i * 3 + 1] = floorAt(hx, hz) + lift[i]; head[i * 3 + 2] = hz;
      look[i * 3] = on[i] * grow * edgeFade(hx, hz);
      look[i * 3 + 1] = widthOf[i];
      look[i * 3 + 2] = i * 2.4; // cada risco ondula no seu tempo
    }
    tailAttr.needsUpdate = true;
    headAttr.needsUpdate = true;
    lookAttr.needsUpdate = true;
  }

  // ---------- 3. A manga de vento do quartel ----------
  const sock = buildWindsock();

  // Procura o quartel ('school', pode ocupar vários quadrados) e põe a manga num canto dele,
  // do lado de fora do edifício, no canto que dá para o sítio mais aberto (estrada, erva...).
  function buildWindsock() {
    let x0 = -1, y0 = -1;
    for (let y = 0; y < H && x0 < 0; y++) {
      for (let x = 0; x < W; x++) if (village.tiles[y][x] === 'school') { x0 = x; y0 = y; break; }
    }
    if (x0 < 0) return null; // este mapa não tem quartel
    let w = 1, h = 1;
    while (village.tiles[y0][x0 + w] === 'school') w++;
    while (village.tiles[y0 + h]?.[x0] === 'school') h++;

    // Os 4 cantos: (sx, sy) = para que lado fica o canto (-1 = oeste/norte, 1 = leste/sul).
    // Pontos para cada canto: os 3 quadrados de fora que lhe tocam, se forem abertos.
    // Em empate ganha o primeiro: sudeste e sudoeste primeiro, porque a câmara olha de sul.
    const open = new Set(['road', 'grass', 'cleared', 'firebreak', 'brush', 'water']);
    const isOpen = (x, y) => open.has(village.tiles[y]?.[x]);
    let best = null;
    for (const [cx, cy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ox = cx > 0 ? x0 + w : x0 - 1, oy = cy > 0 ? y0 + h : y0 - 1; // o quadrado na diagonal
      const ix = cx > 0 ? x0 + w - 1 : x0, iy = cy > 0 ? y0 + h - 1 : y0;  // o quadrado do quartel no canto
      const score = isOpen(ox, oy) + isOpen(ox, iy) + isOpen(ix, oy);
      if (!best || score > best.score) best = { cx, cy, score };
    }

    // O canto do bloco do quartel no mundo, e a "caixa" do edifício (para não lhe entrar dentro).
    const cornerX = (best.cx > 0 ? x0 + w - 0.5 : x0 - 0.5) - halfX;
    const cornerZ = (best.cy > 0 ? y0 + h - 0.5 : y0 - 0.5) - halfZ;
    const box = view.propBounds(x0, y0);
    let px = cornerX - best.cx * 0.08, pz = cornerZ - best.cy * 0.08; // um pouco para dentro do canto
    if (box) {
      // logo a seguir à caixa do edifício, mas sem sair muito do quadrado do quartel
      const bx = best.cx > 0 ? box.max.x + 0.05 : box.min.x - 0.05;
      const bz = best.cy > 0 ? box.max.z + 0.05 : box.min.z - 0.05;
      px = best.cx > 0 ? Math.min(Math.max(px, bx), cornerX + 0.12) : Math.max(Math.min(px, bx), cornerX - 0.12);
      pz = best.cy > 0 ? Math.min(Math.max(pz, bz), cornerZ + 0.12) : Math.max(Math.min(pz, bz), cornerZ - 0.12);
    }
    const ground = view.terrain.heightAtWorld(px, pz);
    // O mastro é mais alto do que o telhado: a manga nunca bate no edifício, rode para onde rodar.
    const roof = box ? box.max.y : ground + 1;
    const poleHeight = Math.max(1.3, roof - ground + 0.35);
    return makeWindsock(scene, px, ground, pz, poleHeight);
  }

  // ---------- Dia e noite ----------
  const dayColor = new THREE.Color(1, 1, 1), nightColor = new THREE.Color(0.72, 0.8, 1);
  function setNight(k) {
    const n = Math.min(1, Math.max(0, k));
    streakMaterial.uniforms.uColor.value.copy(dayColor).lerp(nightColor, n);
    streakMaterial.uniforms.uOpacity.value = 0.9 - 0.5 * n; // de noite, mais discretos
    sock?.setNight(n);
  }

  // ---------- A cada desenho ----------
  function update(dt, t) {
    // O vento mostrado roda devagar até ao vento novo (pelo caminho mais curto).
    let diff = targetAngle - angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) > 0.0005) {
      angle += diff * Math.min(1, dt * 1.5);
      applyAngle();
    }
    // A onda das rajadas anda a favor do vento, à velocidade dos riscos.
    treeWind.wave.value += dt * travelSpeed() * GUST_WAVE_SCALE;
    // A fase da onda anda 6 radianos por segundo e volta a 0 em cada volta (2 pi): é sempre um
    // número pequeno, para as contas da placa gráfica continuarem certas com o jogo aberto muito tempo.
    streakMaterial.uniforms.uWavePhase.value = (t * 6) % (Math.PI * 2);
    updateStreaks(dt);
    if (sock) {
      // A força que a manga sente agora: o vento médio + a rajada, quando a onda passa por ela.
      const felt = speed + (gust - speed) * gustWaveAt(sock.x, sock.z);
      sock.update(dt, t, dirX, dirZ, felt);
    }
  }

  setWind(wind.direction ?? 0, wind.speed ?? 15, wind.gust);
  for (let i = 0; i < N; i++) respawn(i, true); // já começam espalhados pelo mapa, com idades diferentes
  setNight(0);
  return { setWind, setNight, update };
}

// ---------- A manga de vento (feita só com peças simples do three.js) ----------
// Um mastro cinzento, um aro no topo e um cone de pano às riscas vermelhas e brancas, feito de
// 5 pedaços presos uns aos outros (como uma corrente): cada pedaço pode dobrar um bocadinho,
// e é isso que faz a manga ondular e cair quando há pouco vento.
// Devolve { x, z, update(dt, t, dirX, dirZ, speed), setNight(k) }.
const SOCK_PIECES = 5, SOCK_LENGTH = 0.8, SOCK_MOUTH = 0.12, SOCK_END = 0.055;
function makeWindsock(scene, x, groundY, z, poleHeight) {
  const group = new THREE.Group();
  group.position.set(x, groundY, z);

  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.5, metalness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, poleHeight, 8), metal);
  pole.position.y = poleHeight / 2;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 1 }));
  foot.position.y = 0.02;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), metal);
  cap.position.y = poleHeight + 0.02;
  group.add(pole, foot, cap);

  // O ponto de onde a manga roda: no topo do mastro. Roda em y (para onde aponta) e em z (cai).
  const pivot = new THREE.Group();
  pivot.position.y = poleHeight - 0.04;
  group.add(pivot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(SOCK_MOUTH, 0.012, 6, 16), metal);
  ring.rotation.y = Math.PI / 2; // o aro fica de pé, virado para o comprimento da manga (+x)
  pivot.add(ring);

  // Os pedaços de pano, alternando vermelho e branco. Emissive: de noite acendem-se um pouco.
  const red = new THREE.MeshStandardMaterial({ color: 0xd8322a, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xd8322a, emissiveIntensity: 0.05 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xf3efe6, emissiveIntensity: 0.03 });
  const pieceLength = SOCK_LENGTH / SOCK_PIECES;
  const pieces = [];
  let parent = pivot;
  for (let i = 0; i < SOCK_PIECES; i++) {
    const r0 = SOCK_MOUTH + (SOCK_END - SOCK_MOUTH) * (i / SOCK_PIECES);
    const r1 = SOCK_MOUTH + (SOCK_END - SOCK_MOUTH) * ((i + 1) / SOCK_PIECES);
    // Um tubo cónico aberto. O cilindro do three.js fica de pé (eixo y): deitamo-lo no eixo x
    // e empurramo-lo para começar no ponto (0, 0, 0) do pedaço (a junta com o anterior).
    const geometry = new THREE.CylinderGeometry(r1, r0, pieceLength, 12, 1, true);
    geometry.rotateZ(-Math.PI / 2);
    geometry.translate(pieceLength / 2, 0, 0);
    const piece = new THREE.Mesh(geometry, i % 2 === 0 ? red : white);
    if (i > 0) piece.position.x = pieceLength; // a junta fica no fim do pedaço anterior
    parent.add(piece);
    pieces.push(piece);
    parent = piece;
  }
  scene.add(group);

  // A manga não "salta" quando o vento muda: roda e endireita-se devagar.
  let yaw = null, droop = 1.2;
  function update(dt, t, dirX, dirZ, speed) {
    // Para onde aponta: rodar em y leva o eixo +x da manga para (cos, -sin) no mundo (x, z).
    const targetYaw = Math.atan2(-dirZ, dirX);
    if (yaw === null) yaw = targetYaw;
    yaw += Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw)) * Math.min(1, dt * 3);
    // Quanto cai (radianos abaixo da horizontal): pendurada sem vento, quase direita a ~28 km/h,
    // como as mangas verdadeiras dos aeródromos.
    const strength = Math.min(1, speed / 28);
    const targetDroop = 1.3 - 1.22 * strength;
    droop += (targetDroop - droop) * Math.min(1, dt * 2);
    pivot.rotation.y = yaw;
    pivot.rotation.z = -droop * 0.7;
    // Cada pedaço cai mais um pouco e abana para os lados; abana mais depressa com mais vento.
    const flap = 5 + speed * 0.25;
    for (let i = 0; i < SOCK_PIECES; i++) {
      const k = (i + 1) / SOCK_PIECES; // a ponta abana mais do que a boca
      pieces[i].rotation.z = -droop * 0.075 + Math.sin(t * flap * 0.8 + i * 1.3) * 0.04 * k;
      pieces[i].rotation.y = Math.sin(t * flap - i * 0.9) * (0.05 + 0.06 * strength) * k;
    }
  }

  function setNight(k) {
    red.emissiveIntensity = 0.05 + 0.4 * k;
    white.emissiveIntensity = 0.03 + 0.25 * k;
  }

  return { x, z, update, setNight };
}
