// A CENA DO CIGARRO: como o incêndio começa.
// Um carro passa na estrada ao lado da ignição, o condutor atira uma ponta de cigarro
// acesa pela janela, ela cai no mato seco da berma, sai um fiozinho de fumo... e o fogo começa.
// Se não houver estrada perto da ignição, é uma pessoa a pé (um caminhante) que atira o cigarro.
// É uma DRAMATIZAÇÃO: se o nível tiver ignitionNote (ex.: "a causa real nunca foi confirmada"),
// isso aparece em letra pequena por baixo da legenda.
//
// API:
//   await playIgnition(game)  -> a Promise termina quando o fogo deve começar (cerca de 7 s).
//                                O jogador pode saltar a cena com um clique ou com a tecla Espaço.
// Usa: game.level (ignição e vento), game.village (onde está a estrada), game.view.worldPosition,
//      game.camera e game.renderer. Se existirem, usa também game.scene e game.controls.
// No fim, a câmara volta exatamente para onde o jogador a tinha deixado.
import * as THREE from 'three';
import { findRoadPath } from './roadPath.js';

// ---------- Tempos e medidas da cena ----------
const LAUNCH_TIME = 2.4;     // segundos até a ponta de cigarro sair pela janela (aproximado)
const FLIGHT_TIME = 0.9;     // quanto tempo a ponta de cigarro voa
const SMOKE_TIME = 3.2;      // quanto tempo vemos o fumo a subir e a chama a crescer antes de voltar
const SLOW_MOTION = 0.35;    // durante o voo da ponta de cigarro, o tempo anda a 35% (câmara lenta)
const FIRE_AT = 0.45;        // a meio do fumo, o fogo verdadeiro (fireFx) acende no quadrado da ignição
const RETURN_TIME = 1.1;     // quanto tempo a câmara demora a voltar para o jogador
const INTRO_TIME = 1.3;      // quanto tempo a câmara demora a "voar" do jogador até ao carro
const ROAD_EXTENSION = 1.5;  // o carro aparece um pouco antes da estrada e sai um pouco depois
const LANE_OFFSET = 0.2;     // o carro anda pela faixa da direita (a estrada tem 1 de largura)
const TILE_TOP = 0.25;       // altura do chão quando a vista ainda não tem relevo

export function playIgnition(game) {
  return new Promise((resolve) => {
    let cinematic = null; // a cena só é montada no primeiro desenho (é aí que conhecemos a cena 3D)
    let skipRequested = false;
    let finished = false;
    let lastMs = performance.now();
    const overlay = createOverlay();
    const stopListening = listenForSkip(() => { skipRequested = true; });
    // O carro mexe-se: durante a cena, as sombras são recalculadas a cada desenho.
    const shadowMap = game.renderer.shadowMap;
    const shadowAuto = shadowMap.autoUpdate;
    shadowMap.autoUpdate = true;

    // Corremos o nosso código mesmo antes de cada desenho do jogo (depois dos controlos da câmara),
    // por isso a câmara da cena "ganha" aos controlos do jogador enquanto a cena dura.
    const unhook = runBeforeEachDraw(game.renderer, (scene, camera) => {
      if (camera !== game.camera || finished) return;
      const now = performance.now();
      const dt = Math.min((now - lastMs) / 1000, 0.1); // segundos desde o último desenho
      lastMs = now;
      try {
        if (!cinematic) cinematic = createCinematic(game, game.scene || scene, overlay);
        if (skipRequested || cinematic.update(dt)) finish();
      } catch (error) {
        // Se algo correr mal, o jogo não pode ficar preso: o fogo começa na mesma.
        console.error('Ignition cinematic failed:', error);
        finish();
      }
    });

    function finish() {
      finished = true;
      unhook();
      stopListening();
      overlay.remove();
      if (cinematic) cinematic.dispose(); // tira o carro e o fumo e devolve a câmara ao jogador
      shadowMap.autoUpdate = shadowAuto;
      shadowMap.needsUpdate = true;       // uma última vez, já sem o carro
      resolve();
    }
  });
}

// ---------- A cena: carro, ponta de cigarro, fumo e câmara, passo a passo ----------
// Fases: 'drive' (o carro chega) -> 'flight' (o cigarro voa) -> 'smoke' (fumo na berma)
//        -> 'return' (a câmara volta ao jogador) -> fim.
function createCinematic(game, scene, overlay) {
  const route = buildRoute(game);
  // Com estrada: um carro. Sem estrada: um caminhante (mais pequeno e mais lento).
  const car = route.onFoot ? buildWalker() : buildCar();
  const butt = buildCigaretteButt();
  const flicker = buildFlicker(route.landing);
  const smoke = createSmoke(scene, game.level.wind);
  const cameraRig = createCameraRig(game, route);
  const restoreBushes = shrinkBushesNear(game, route.landing); // nada tapa o sítio onde a ponta cai
  scene.add(car.group, butt.group, flicker.group);
  if (!route.onFoot) playSound('car');

  const speed = route.onFoot
    ? THREE.MathUtils.clamp(route.launchDistance / LAUNCH_TIME, 0.45, 0.9)
    : THREE.MathUtils.clamp(route.launchDistance / LAUNCH_TIME, 1.2, 2.8);
  let fireStarted = false;
  let carDistance = 0;   // quanto o carro já andou ao longo do caminho
  let phase = 'drive';
  let phaseTime = 0;     // segundos desde o início da fase atual
  let puffTimer = 0;     // para largar um bocadinho de fumo de vez em quando
  let flightStart = null;

  function update(realDt) {
    const dt = phase === 'flight' ? realDt * SLOW_MOTION : realDt; // câmara lenta no voo
    phaseTime += dt;
    carDistance += speed * dt;
    moveCar(car, route, carDistance, dt * speed);
    smoke.update(dt);

    if (phase === 'drive') {
      cameraRig.followCar(car.group.position, dt);
      if (carDistance >= route.launchDistance) {
        flightStart = car.group.localToWorld(car.driverWindow.clone());
        startPhase('flight');
      }
    } else if (phase === 'flight') {
      const progress = Math.min(phaseTime / FLIGHT_TIME, 1);
      flyButt(butt, flightStart, route, progress, dt);
      emitEvery(0.012, dt, () => smoke.emitTrail(butt.group.position));
      cameraRig.followCarThenIgnition(car.group.position, progress, dt);
      if (progress >= 1) {
        landButt(butt, route.landing);
        playSound('ignite');
        overlay.showCaption('One careless cigarette can be all it takes.', dramatisationNote(game.level));
        startPhase('smoke');
      }
    } else if (phase === 'smoke') {
      emitEvery(0.08, dt, () => smoke.emitWisp(route.landing));
      glowButt(butt, phaseTime);
      flicker.update(phaseTime / SMOKE_TIME, phaseTime);
      cameraRig.watchIgnition(dt);
      // O fogo a sério acende ANTES de a câmara voltar: quando ela volta, já se vê a chama.
      if (!fireStarted && phaseTime >= SMOKE_TIME * FIRE_AT) {
        fireStarted = true;
        const { x, y } = game.level.ignition;
        game.fireFx?.setIntensity?.(x, y, 0.45);
        game.fireFx?.ignite?.(x, y);
      }
      if (phaseTime >= SMOKE_TIME) {
        cameraRig.startReturn();
        startPhase('return');
      }
    } else if (phase === 'return') {
      emitEvery(0.08, dt, () => smoke.emitWisp(route.landing));
      flicker.update(1, phaseTime + SMOKE_TIME);
      cameraRig.returnToPlayer(phaseTime / RETURN_TIME);
      if (phaseTime >= RETURN_TIME) return true; // acabou: o fogo pode começar
    }
    return false;
  }

  function startPhase(name) {
    phase = name;
    phaseTime = 0;
  }

  // Chama `action` a cada `interval` segundos (ex.: largar uma nuvem de fumo).
  function emitEvery(interval, dt, action) {
    puffTimer += dt;
    while (puffTimer >= interval) {
      puffTimer -= interval;
      action();
    }
  }

  function dispose() {
    restoreBushes();
    for (const group of [car.group, butt.group, flicker.group]) {
      scene.remove(group);
      disposeObject(group);
    }
    smoke.dispose();
    cameraRig.restore();
  }

  return { update, dispose };
}

// ---------- O caminho do carro no mundo 3D ----------
// Transforma os quadrados de estrada (roadPath.js) numa linha 3D por onde o carro anda.
function buildRoute(game) {
  const { village, level, view } = game;
  const roadPath = findRoadPath(village, level.ignition);
  const onFoot = !roadPath; // sem estrada perto: um caminhante num carreiro
  const path = roadPath || fallbackPath(village, level.ignition);
  const ignition = groundPoint(view, level.ignition.x, level.ignition.y);
  const road = path.tiles[path.dropIndex];
  const roadPoint = groundPoint(view, road.x, road.y);

  // "forward" = para onde o carro anda; "left" = o lado do condutor, onde fica a ignição.
  const forward = travelDirection(view, path, roadPoint, ignition);
  const left = new THREE.Vector3(forward.z, 0, -forward.x);

  // Pontos do caminho: os centros das estradas, na faixa da direita, mais um bocadinho
  // antes do início e depois do fim (para o carro entrar e sair de cena).
  const points = path.tiles.map((t) => groundPoint(view, t.x, t.y));
  points.unshift(points[0].clone().addScaledVector(forward, -ROAD_EXTENSION));
  points.push(points[points.length - 1].clone().addScaledVector(forward, ROAD_EXTENSION));
  for (const p of points) p.addScaledVector(left, onFoot ? -0.32 : -LANE_OFFSET);

  // Distância acumulada até cada ponto (para saber onde está o carro depois de andar "s").
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + points[i].distanceTo(points[i - 1]));

  // O cigarro cai na berma: no quadrado da ignição, um pouco mais perto da estrada.
  const landing = ignition.clone().addScaledVector(left, onFoot ? 0.05 : -0.22);
  const ground = view.terrain?.heightAtWorld;
  landing.y = ground ? ground(landing.x, landing.z) + 0.015 : landing.y + 0.015;
  return {
    points, distances, forward, left, landing, onFoot,
    length: distances[distances.length - 1],
    // O condutor atira o cigarro um pouco antes de passar pela ignição (o cigarro voa para a frente).
    launchDistance: Math.max(0.3, distances[path.dropIndex + 1] - 0.35),
  };
}

// A direção em que o carro anda. Com 2 ou mais quadrados, é do primeiro para o último.
// Com um só quadrado de estrada, é a direção que deixa a ignição à esquerda.
function travelDirection(view, path, roadPoint, ignition) {
  const tiles = path.tiles;
  if (tiles.length >= 2) {
    const first = groundPoint(view, tiles[0].x, tiles[0].y);
    const last = groundPoint(view, tiles[tiles.length - 1].x, tiles[tiles.length - 1].y);
    return last.sub(first).setY(0).normalize();
  }
  const side = ignition.clone().sub(roadPoint).setY(0).normalize(); // = a esquerda do carro
  return new THREE.Vector3(-side.z, 0, side.x);
}

// Se não houver estrada perto da ignição, o caminhante segue um carreiro a sul dela
// (pelo meio do mato ou da floresta, como quem faz uma caminhada).
function fallbackPath(village, ignition) {
  const y = ignition.y + 1 < village.height ? ignition.y + 1 : ignition.y - 1;
  const tiles = [];
  for (let x = Math.max(0, ignition.x - 2); x <= Math.min(village.width - 1, ignition.x + 3); x++) {
    tiles.push({ x, y });
  }
  const dropIndex = tiles.findIndex((t) => t.x === ignition.x);
  // Estrada a sul -> o carro vai para leste (norte à esquerda). Estrada a norte -> vai para oeste.
  if (y > ignition.y) return { tiles, dropIndex };
  return { tiles: tiles.reverse(), dropIndex: tiles.length - 1 - dropIndex };
}

// O centro de um quadrado no mundo 3D, à altura do chão.
function groundPoint(view, x, y) {
  const p = view.worldPosition(x, y);
  return new THREE.Vector3(p.x, p.y ?? TILE_TOP, p.z);
}

// Onde está o carro depois de andar `distance` ao longo do caminho, e para onde aponta.
function pointOnRoute(route, distance, out) {
  const { points, distances } = route;
  let i = 1;
  while (i < points.length - 1 && distances[i] < distance) i++;
  const a = points[i - 1], b = points[i];
  const t = THREE.MathUtils.clamp((distance - distances[i - 1]) / (distances[i] - distances[i - 1] || 1), 0, 1);
  out.lerpVectors(a, b, t);
  // Inclinação do troço (para o carro subir e descer as encostas de nariz para cima/baixo).
  const flat = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return Math.atan2(b.y - a.y, flat);
}

// ---------- O carro (low-poly, feito só com caixas e cilindros) ----------
// Construído a olhar para +z, com as rodas no chão (y = 0). Mede ~0.46 de comprido.
function buildCar() {
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, ...extra });
  const paint = mat(0xc23b22, { roughness: 0.35, metalness: 0.2 });
  const glass = mat(0x23303d, { roughness: 0.15, metalness: 0.5 });
  const dark = mat(0x1d1d1f, { roughness: 0.8 });
  const chrome = mat(0xcfd3d6, { roughness: 0.3, metalness: 0.8 });
  const headlight = mat(0xfff4cc, { emissive: 0xfff0b0, emissiveIntensity: 1.6 });
  const taillight = mat(0xd81b1b, { emissive: 0xff2020, emissiveIntensity: 1.2 });

  const group = new THREE.Group();
  group.rotation.order = 'YXZ'; // primeiro vira (y), depois inclina na encosta (x)
  const box = (w, h, l, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Carroçaria, cabine e tejadilho
  box(0.22, 0.085, 0.46, paint, 0, 0.09, 0);
  box(0.19, 0.075, 0.22, paint, 0, 0.17, -0.03);
  box(0.2, 0.016, 0.21, paint, 0, 0.214, -0.03);
  // Janelas (placas de vidro escuro coladas à cabine): lados, para-brisas e vidro de trás
  box(0.004, 0.048, 0.18, glass, 0.096, 0.175, -0.03);
  box(0.004, 0.048, 0.18, glass, -0.096, 0.175, -0.03);
  box(0.165, 0.05, 0.004, glass, 0, 0.175, 0.081);
  box(0.165, 0.05, 0.004, glass, 0, 0.175, -0.141);
  // Para-choques, grelha e faróis
  box(0.225, 0.03, 0.02, dark, 0, 0.06, 0.235);
  box(0.225, 0.03, 0.02, dark, 0, 0.06, -0.235);
  box(0.1, 0.03, 0.006, chrome, 0, 0.1, 0.232);
  box(0.045, 0.024, 0.008, headlight, 0.072, 0.105, 0.231);
  box(0.045, 0.024, 0.008, headlight, -0.072, 0.105, 0.231);
  box(0.045, 0.022, 0.008, taillight, 0.075, 0.105, -0.231);
  box(0.045, 0.022, 0.008, taillight, -0.075, 0.105, -0.231);

  const wheels = [];
  for (const [x, z] of [[0.105, 0.145], [-0.105, 0.145], [0.105, -0.145], [-0.105, -0.145]]) {
    wheels.push(buildWheel(group, x, z, dark, chrome));
  }

  // A janela do condutor: à esquerda (+x, para quem olha para +z), à frente da cabine.
  const driverWindow = new THREE.Vector3(0.11, 0.18, 0.02);
  return { group, wheels, driverWindow, wheelRadius: 0.05 };
}

// Uma roda: um pneu (cilindro deitado) com um tampão. Fica dentro de um "eixo" que roda.
function buildWheel(group, x, z, tireMaterial, hubMaterial) {
  const axle = new THREE.Group();
  axle.position.set(x, 0.05, z);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 12), tireMaterial);
  tire.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.038, 8), hubMaterial);
  hub.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  axle.add(tire, hub);
  group.add(axle);
  return axle;
}

// ---------- O caminhante (para níveis sem estrada perto da ignição) ----------
// Uma pessoa low-poly (~0.3 de altura, à escala das casas), com pernas e braços que balançam.
// Tem a mesma "forma" que o carro ({ group, wheels, driverWindow, ... }) para o resto da cena
// não precisar de saber se é um carro ou uma pessoa: driverWindow é a mão que atira o cigarro.
function buildWalker() {
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const shirt = mat(0x3d6fb6), trousers = mat(0x3a3a44), skin = mat(0xe0b08a), hair = mat(0x3b2a1e), bag = mat(0x7a5a32);
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  const part = (geo, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // pernas e braços dentro de "articulações" (grupos) que rodam na anca e no ombro
  const limb = (x, y, length, material) => {
    const joint = new THREE.Group();
    joint.position.set(x, y, 0);
    group.add(joint);
    part(new THREE.BoxGeometry(0.035, length, 0.035), material, 0, -length / 2, 0, joint);
    return joint;
  };
  const legs = [limb(0.025, 0.14, 0.14, trousers), limb(-0.025, 0.14, 0.14, trousers)];
  part(new THREE.BoxGeometry(0.09, 0.11, 0.05), shirt, 0, 0.195, 0);          // tronco
  part(new THREE.BoxGeometry(0.07, 0.09, 0.04), bag, 0, 0.2, -0.045);         // mochila
  part(new THREE.SphereGeometry(0.032, 8, 6), skin, 0, 0.285, 0);              // cabeça
  part(new THREE.SphereGeometry(0.034, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 0.29, -0.004);
  const arms = [limb(0.06, 0.245, 0.11, shirt), limb(-0.06, 0.245, 0.11, shirt)];
  let swing = 0;
  return {
    group, wheels: [], wheelRadius: 1,
    // a mão esquerda (+x), à altura do ombro: é daqui que o cigarro sai
    driverWindow: new THREE.Vector3(0.07, 0.2, 0.03),
    animate(travelled) {
      swing += travelled * 22;
      const a = Math.sin(swing) * 0.6;
      legs[0].rotation.x = a; legs[1].rotation.x = -a;
      arms[0].rotation.x = -a * 0.8; arms[1].rotation.x = a * 0.8;
    },
  };
}

// Põe o carro no sítio certo do caminho, virado para a frente, e faz as rodas girar.
const carPoint = new THREE.Vector3();
function moveCar(car, route, distance, travelled) {
  const slope = pointOnRoute(route, distance, carPoint);
  car.group.position.copy(carPoint);
  car.group.rotation.y = Math.atan2(route.forward.x, route.forward.z);
  car.group.rotation.x = -slope;
  // Aparece e desaparece a encolher nas pontas do caminho, para não "saltar" para a cena.
  const fade = Math.min(1, distance / 0.6, (route.length - distance) / 0.6);
  car.group.visible = fade > 0;
  car.group.scale.setScalar(Math.max(fade, 0.001));
  for (const wheel of car.wheels) wheel.rotation.x += travelled / car.wheelRadius;
  car.animate?.(travelled); // o caminhante mexe as pernas
  car.group.updateMatrixWorld();
}

// ---------- A ponta de cigarro ----------
function buildCigaretteButt() {
  const group = new THREE.Group();
  const filter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8963f, roughness: 0.8 }),
  );
  filter.position.y = -0.012;
  const paper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8 }),
  );
  paper.position.y = 0.015;
  const ember = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.011, 0.008, 8),
    new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4a00, emissiveIntensity: 2.5 }),
  );
  ember.position.y = 0.029;
  // O brilho laranja à volta da brasa (um "sprite" que olha sempre para a câmara)
  const glow = makeGlowSprite(0xff7a1a, 0.13);
  glow.position.y = 0.03;
  group.add(filter, paper, ember, glow);
  group.visible = false; // só aparece quando sai pela janela
  return { group, glow };
}

// O voo em arco: uma curva que sai da janela, sobe um pouco e cai na berma.
const arcControl = new THREE.Vector3();
function flyButt(butt, start, route, progress, dt) {
  butt.group.visible = true;
  arcControl.lerpVectors(start, route.landing, 0.5);
  arcControl.addScaledVector(route.forward, 0.3); // o cigarro ainda leva a velocidade do carro
  arcControl.y += 0.55;
  quadraticBezier(start, arcControl, route.landing, progress, butt.group.position);
  butt.group.rotation.x += dt * 15; // vai a rodopiar no ar
  butt.group.rotation.z += dt * 9;
  butt.glow.material.opacity = 0.8 + Math.random() * 0.2;
  butt.glow.scale.setScalar(0.2); // a brasa a voar brilha bem (vê-se de longe, de noite)
}

function landButt(butt, landing) {
  butt.group.position.copy(landing);
  butt.group.rotation.set(0, Math.random() * Math.PI, Math.PI / 2); // deitada no chão
}

// Depois de cair, a brasa brilha mais e menos, como se respirasse.
function glowButt(butt, time) {
  const pulse = 0.75 + Math.sin(time * 9) * 0.15 + Math.random() * 0.1;
  butt.glow.material.opacity = pulse;
  butt.glow.scale.setScalar(0.13 + pulse * 0.05);
}

function quadraticBezier(a, b, c, t, out) {
  const u = 1 - t;
  out.set(0, 0, 0)
    .addScaledVector(a, u * u)
    .addScaledVector(b, 2 * u * t)
    .addScaledVector(c, t * t);
  return out;
}

// ---------- A primeira chamazinha ----------
// No fim do fumo, o mato começa a brilhar e aparece uma chama pequenina a tremer.
function buildFlicker(landing) {
  const group = new THREE.Group();
  group.position.copy(landing);
  const glow = makeGlowSprite(0xff5a10, 0.4);
  glow.position.y = 0.04;
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeFlameTexture(), color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
  }));
  flame.center.set(0.5, 0); // a chama cresce a partir da base
  group.add(glow, flame);
  glow.material.opacity = 0;

  // progress: 0 no início do fumo, 1 no fim. A chama só nasce na segunda metade.
  function update(progress, time) {
    const strength = THREE.MathUtils.smoothstep(progress, 0.45, 1);
    const shake = 0.8 + Math.sin(time * 23) * 0.12 + Math.random() * 0.15;
    flame.material.opacity = strength;
    flame.scale.set(0.09 * strength * shake, 0.17 * strength * shake, 1);
    glow.material.opacity = strength * 0.6 * shake;
  }
  return { group, update };
}

// ---------- Fumo ----------
// Pequenas nuvens (sprites) que sobem, crescem, são levadas pelo vento e desaparecem.
function createSmoke(scene, wind) {
  const texture = makeSoftCircleTexture();
  const drift = windDrift(wind);
  const puffs = [];

  function emit(position, { life, rise, size, grow, opacity, color, glow = false }) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color, transparent: true, depthWrite: false, opacity: 0,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    sprite.position.copy(position);
    sprite.position.x += (Math.random() - 0.5) * 0.02;
    sprite.position.z += (Math.random() - 0.5) * 0.02;
    sprite.scale.setScalar(size);
    scene.add(sprite);
    puffs.push({ sprite, age: 0, life, rise, size, grow, opacity, wobble: Math.random() * 6 });
  }

  // Rasto brilhante (faúlhas laranja) atrás da ponta de cigarro a voar
  const emitTrail = (position) => emit(position, { life: 0.5, rise: 0.02, size: 0.05, grow: -0.04, opacity: 0.9, color: 0xff8a2a, glow: true });
  // O fiozinho de fumo que sobe do mato
  const emitWisp = (position) => emit(position, { life: 2.6, rise: 0.3, size: 0.05, grow: 0.3, opacity: 0.65, color: 0xd8d4cc });

  function update(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const puff = puffs[i];
      puff.age += dt;
      const p = puff.age / puff.life; // 0 = acabou de nascer, 1 = desapareceu
      if (p >= 1) {
        scene.remove(puff.sprite);
        puff.sprite.material.dispose();
        puffs.splice(i, 1);
        continue;
      }
      puff.sprite.position.y += puff.rise * dt;
      puff.sprite.position.addScaledVector(drift, dt * p); // quanto mais alto, mais o vento o leva
      puff.sprite.position.x += Math.sin(puff.age * 3 + puff.wobble) * 0.08 * dt;
      puff.sprite.scale.setScalar(Math.max(0.005, puff.size + puff.grow * p));
      puff.sprite.material.opacity = puff.opacity * Math.min(1, p * 6) * (1 - p);
    }
  }

  function dispose() {
    for (const puff of puffs) {
      scene.remove(puff.sprite);
      puff.sprite.material.dispose();
    }
    puffs.length = 0;
    texture.dispose();
  }
  return { emitTrail, emitWisp, update, dispose };
}

// O vento empurra o fumo para "downwind" (ver GLOSSARY: dx = -sin(d), dy = cos(d)).
function windDrift(wind) {
  if (!wind) return new THREE.Vector3();
  const radians = (wind.direction * Math.PI) / 180;
  const strength = 0.12 * Math.min((wind.speed || 0) / 30, 2);
  return new THREE.Vector3(-Math.sin(radians) * strength, 0, Math.cos(radians) * strength);
}

// ---------- Câmara ----------
// Guarda a câmara do jogador, segue o carro, olha para a berma e no fim volta ao sítio.
function createCameraRig(game, route) {
  const camera = game.camera;
  const controls = game.controls;
  const saved = {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    target: controls ? controls.target.clone() : null,
    controlsEnabled: controls ? controls.enabled : null,
  };
  if (controls) controls.enabled = false;

  // Onde a câmara está e para onde olha (vão-se aproximando suavemente do que queremos).
  const position = camera.position.clone();
  const look = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const { forward, left, landing } = route;
  const returnFrom = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

  // Plano do carro: ao lado do carro, do lado da berma, um pouco atrás e acima dos telhados.
  const onFoot = route.onFoot;
  function carShot(carPosition, outPosition, outLook) {
    outPosition.copy(carPosition).addScaledVector(left, onFoot ? 1.2 : 2.0).addScaledVector(forward, onFoot ? -0.6 : -0.8);
    outPosition.y += onFoot ? 0.9 : 1.7;
    outLook.copy(carPosition).addScaledVector(forward, 0.5);
    outLook.y += 0.08;
  }
  // Plano da berma: perto do chão, a olhar para o fumo, num sítio sem casas nem árvores à frente.
  const ignitionCamera = chooseIgnitionCamera(game, route);
  function ignitionShot(outPosition, outLook) {
    outPosition.copy(ignitionCamera);
    outLook.copy(landing);
    outLook.y += 0.08;
  }

  // Move a câmara para o plano desejado (quanto maior `rate`, mais depressa o segue).
  // No início (INTRO_TIME) faz uma viagem suave desde a câmara do jogador até ao plano.
  let introTime = 0;
  const savedLook = pointPlayerIsLookingAt(camera, saved.target);
  function approach(dt, rate) {
    introTime += dt;
    if (introTime < INTRO_TIME) {
      const s = THREE.MathUtils.smootherstep(introTime / INTRO_TIME, 0, 1);
      position.lerpVectors(saved.position, desiredPosition, s);
      look.lerpVectors(savedLook, desiredLook, s);
      camera.position.copy(position);
      camera.lookAt(look);
      return;
    }
    const k = 1 - Math.exp(-rate * dt);
    position.lerp(desiredPosition, k);
    look.lerp(desiredLook, k);
    camera.position.copy(position);
    camera.lookAt(look);
  }

  const shotA = { position: new THREE.Vector3(), look: new THREE.Vector3() };
  const shotB = { position: new THREE.Vector3(), look: new THREE.Vector3() };
  return {
    followCar(carPosition, dt) {
      carShot(carPosition, desiredPosition, desiredLook);
      approach(dt, 2.6);
    },
    // Durante o voo, passa aos poucos do plano do carro para o plano da berma.
    followCarThenIgnition(carPosition, progress, dt) {
      carShot(carPosition, shotA.position, shotA.look);
      ignitionShot(shotB.position, shotB.look);
      const mix = THREE.MathUtils.smoothstep(progress, 0, 1);
      desiredPosition.lerpVectors(shotA.position, shotB.position, mix);
      desiredLook.lerpVectors(shotA.look, shotB.look, mix);
      approach(dt, 3);
    },
    watchIgnition(dt) {
      ignitionShot(desiredPosition, desiredLook);
      approach(dt, 2.2);
    },
    startReturn() {
      returnFrom.position.copy(camera.position);
      returnFrom.quaternion.copy(camera.quaternion);
    },
    // progress: 0 = onde a cena deixou a câmara, 1 = onde o jogador a tinha.
    returnToPlayer(progress) {
      const s = THREE.MathUtils.smootherstep(Math.min(progress, 1), 0, 1);
      camera.position.lerpVectors(returnFrom.position, saved.position, s);
      camera.quaternion.slerpQuaternions(returnFrom.quaternion, saved.quaternion, s);
    },
    restore() {
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      if (controls) {
        controls.target.copy(saved.target);
        controls.enabled = saved.controlsEnabled;
      }
    },
  };
}

// De onde filmar a berma? Experimentamos 8 sítios à volta do cigarro e ficamos com o que
// tem menos coisas altas (casas, árvores) debaixo da câmara ou entre a câmara e o cigarro.
// Em caso de empate, ganha o mais perto do plano preferido (do lado da berma, um pouco atrás).
const TALL_TILES = new Set(['house', 'school', 'eucalyptus', 'broadleaf', 'brush']);
function chooseIgnitionCamera(game, route) {
  const { landing, left, forward } = route;
  const preferredAngle = Math.atan2(-0.9, 1.35); // 0 = mesmo do lado da berma; negativo = para trás
  let best = null;
  let bestScore = Infinity;
  for (let k = 0; k < 8; k++) {
    const turn = k <= 4 ? k : k - 8; // 0, 1, 2, 3, 4, -3, -2, -1 (quanto se afasta do preferido)
    const angle = preferredAngle + (turn * Math.PI) / 4;
    const camera = landing.clone()
      .addScaledVector(left, Math.cos(angle) * 1.15)
      .addScaledVector(forward, Math.sin(angle) * 1.15);
    camera.y += 0.5; // baixa e perto: a ponta de cigarro e a primeira chama veem-se bem
    let score = Math.abs(turn);
    // Coisas altas entre a câmara e o cigarro tapam a vista: muito mau.
    for (const along of [1, 0.66, 0.33]) {
      const point = landing.clone().lerp(camera, along);
      if (sameTile(game, point, landing)) continue; // o mato do próprio quadrado é encolhido (shrinkBushesNear)
      if (TALL_TILES.has(tileTypeAt(game, point))) score += 10;
    }
    // Coisas altas mesmo ao lado da câmara enchem metade do ecrã: mau.
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const point = camera.clone().add(new THREE.Vector3(dx, 0, dz));
      if (TALL_TILES.has(tileTypeAt(game, point))) score += 3;
    }
    if (score < bestScore) {
      best = camera;
      bestScore = score;
    }
  }
  return best;
}

// Os dois pontos do mundo estão no mesmo quadrado?
function sameTile(game, a, b) {
  const origin = game.view.worldPosition(0, 0);
  return Math.round(a.x - origin.x) === Math.round(b.x - origin.x) && Math.round(a.z - origin.z) === Math.round(b.z - origin.z);
}

// Encolhe (durante a cena) os arbustos e árvores a menos de 0.45 do sítio onde a ponta cai,
// para não taparem a câmara. Devolve uma função que os põe como estavam.
function shrinkBushesNear(game, landing) {
  const changed = [];
  const here = new THREE.Vector3();
  for (const prop of game.scene?.children ?? []) {
    if (!prop.isGroup || prop.userData.x === undefined) continue;
    if (Math.abs(prop.position.x - landing.x) > 1.2 || Math.abs(prop.position.z - landing.z) > 1.2) continue;
    if (game.village.tiles[prop.userData.y][prop.userData.x] === 'house') continue;
    for (const child of prop.children) {
      child.getWorldPosition(here);
      if (Math.hypot(here.x - landing.x, here.z - landing.z) > 0.45) continue;
      changed.push([child, child.scale.clone()]);
      child.scale.multiplyScalar(0.35);
    }
  }
  return () => { for (const [child, scale] of changed) child.scale.copy(scale); };
}

// O tipo do quadrado que está debaixo de um ponto do mundo 3D (ou null, fora do mapa).
function tileTypeAt(game, point) {
  const origin = game.view.worldPosition(0, 0); // o centro do quadrado (0, 0) no mundo
  const x = Math.round(point.x - origin.x);
  const y = Math.round(point.z - origin.z);
  const { village } = game;
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return null;
  return village.tiles[y][x];
}

// O ponto do chão para onde o jogador está a olhar (o alvo dos controlos, se os conhecermos;
// senão, onde o "olhar" da câmara bate no chão).
function pointPlayerIsLookingAt(camera, controlsTarget) {
  if (controlsTarget) return controlsTarget.clone();
  const ray = new THREE.Ray(camera.position.clone(), camera.getWorldDirection(new THREE.Vector3()));
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_TOP);
  return ray.intersectPlane(ground, new THREE.Vector3()) || ray.at(15, new THREE.Vector3());
}

// ---------- Ecrã: barras de cinema, legenda e "Click or press Space to skip" ----------
function createOverlay() {
  const makeBar = (edge) => {
    const bar = document.createElement('div');
    bar.style.cssText = `position:fixed; left:0; right:0; ${edge}:0; height:0; background:#000; z-index:50;` +
      'transition:height .5s ease; pointer-events:none;';
    return bar;
  };
  const top = makeBar('top');
  const bottom = makeBar('bottom');
  const textStyle = 'position:fixed; z-index:51; pointer-events:none; color:#fff; transition:opacity .6s ease; opacity:0;' +
    'font-family:system-ui, sans-serif; text-shadow:0 1px 3px #000;';
  const hint = document.createElement('div');
  hint.textContent = 'Click or press Space to skip';
  hint.style.cssText = textStyle + 'right:18px; bottom:2.5vh; font-size:13px; letter-spacing:.04em; color:#bbb;';
  const caption = document.createElement('div');
  caption.style.cssText = textStyle + 'left:0; right:0; bottom:calc(9vh + 30px); text-align:center;' +
    'font-size:20px; font-weight:600; font-style:italic;';
  // Letra pequena por baixo da legenda: "isto é uma dramatização" (a causa real nunca foi confirmada).
  const note = document.createElement('div');
  note.style.cssText = textStyle + 'left:16px; right:16px; bottom:calc(9vh + 8px); text-align:center;' +
    'font-size:12px; color:#d8d8d8; letter-spacing:.02em;';
  document.body.append(top, bottom, hint, caption, note);

  // Espera um desenho para a transição (barras a deslizar) funcionar.
  requestAnimationFrame(() => {
    top.style.height = bottom.style.height = '9vh';
    hint.style.opacity = '1';
  });

  return {
    showCaption(text, smallPrint = '') {
      caption.textContent = text;
      caption.style.opacity = '1';
      note.textContent = smallPrint;
      note.style.opacity = smallPrint ? '1' : '0';
    },
    remove() {
      top.style.height = bottom.style.height = '0';
      hint.style.opacity = caption.style.opacity = note.style.opacity = '0';
      setTimeout(() => { top.remove(); bottom.remove(); hint.remove(); caption.remove(); note.remove(); }, 600);
    },
  };
}

// A letra pequena da legenda: as duas primeiras frases de level.ignitionNote
// (ex.: "Dramatisation. The real cause was never confirmed; the police investigated arson.").
function dramatisationNote(level) {
  if (!level.ignitionNote) return 'Dramatisation';
  return level.ignitionNote.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
}

// Saltar a cena: um clique em qualquer lado ou a tecla Espaço.
function listenForSkip(onSkip) {
  const onKey = (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault(); // o Espaço não deve carregar noutro botão nem fazer scroll
    onSkip();
  };
  addEventListener('keydown', onKey);
  addEventListener('pointerdown', onSkip);
  return () => {
    removeEventListener('keydown', onKey);
    removeEventListener('pointerdown', onSkip);
  };
}

// ---------- Ferramentas ----------

// "Engata" uma função em cada desenho do jogo: corre `before(scene, camera)` mesmo antes de
// renderer.render(...). Devolve uma função que desfaz o engate.
function runBeforeEachDraw(renderer, before) {
  const originalRender = renderer.render;
  renderer.render = function (scene, camera) {
    before(scene, camera);
    return originalRender.call(this, scene, camera);
  };
  return () => { renderer.render = originalRender; };
}

// Som do carro e da ignição, se o módulo de som existir (é opcional).
let audioModule = null;
function playSound(name) {
  audioModule ??= import('./audio.js').catch(() => null);
  audioModule.then((audio) => {
    try { audio?.play?.(name); } catch { /* sem som, a cena continua */ }
  });
}

// Liberta a memória da placa gráfica (geometrias, materiais e texturas) de um grupo.
function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    }
  });
}

function makeGlowSprite(color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSoftCircleTexture(), color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sprite.scale.setScalar(size);
  return sprite;
}

// Um círculo branco que se desvanece para as bordas (desenhado num canvas).
function makeSoftCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// Uma chama em forma de gota: amarela em baixo, laranja e transparente em cima.
function makeFlameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.scale(1, 2); // esticamos um círculo na vertical para parecer uma gota
  const gradient = ctx.createRadialGradient(32, 46, 2, 32, 40, 30);
  gradient.addColorStop(0, 'rgba(255,250,200,1)');
  gradient.addColorStop(0.35, 'rgba(255,190,60,0.95)');
  gradient.addColorStop(0.7, 'rgba(255,90,10,0.6)');
  gradient.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
