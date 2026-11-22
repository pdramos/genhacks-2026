// O CENÁRIO À VOLTA DO MAPA (não se joga lá): montes, mar e povoações ao longe.
// Sem isto o mapa é uma "ilha" a flutuar no céu. Com ele, atrás da vila aparece a serra
// (na Malveira da Serra: a Peninha e o Monge, cobertos de pinhal escuro, com penedos de granito).
// Só desenha. Não tem regras: o fogo nunca chega cá.
//
// API:
//   createBackdrop(scene, village, terrain, spec) -> THREE.Group (já posto na cena)
// spec vem do estilo (ex.: styles/sintra.js, `backdrop`):
//   spec.metresPerLevel, spec.minMetres -> como passar metres reais para a escala do mapa
//   spec.unitsPerKm                     -> quantas unidades 3D tem 1 km (1 quadrado = 65 m -> 15.4)
//   spec.base(x, z)                     -> altura (metros) do terreno "de fundo" num ponto do mundo
//   spec.lift    = { above, factor }      -> exagera a serra acima de `above` metros (é cenário:
//                                          assim o morro "enche" o céu como nas fotos)
//   spec.peaks   = [{ x, z, metres, radius, cover: 'pine'|'scrub'|'bare', sanctuary?, tors?,
//                     bareTop?, bareRadius?, dome? }]  (metres: 0 = só cobertura, sem levantar o chão;
//                                          bareRadius = o tamanho do cume pelado, em partes do raio)
//   spec.range   = até onde vai o cenário (por omissão 130); spec.blend = em quantas unidades o
//                  chão passa da borda do mapa para a serra (por omissão 9)
//   spec.pines   = { range, max, denseScale } -> o pinhal: até onde, quantas árvores no máximo e
//                  quanto maiores são as do pinhal cerrado (por omissão 75, 7000, 1)
//   spec.torClusters = [{ x, z, radius, count, size }] -> montes de penedos de granito soltos
//   spec.hedgeRows = { count, length } -> sebes escuras compridas a dividir os campos
//   spec.coast   = [[x, z], ...]        -> a linha da costa (o mar fica do lado ESQUERDO de quem a
//                                          percorre), ou nada se não houver mar
//   spec.colours = { pine, pineLit, scrub, scrubDark, granite, bare, field, fieldDry, sand, sea,
//                    pineFloor?, hedge? }  (pineFloor = o chão por baixo do pinhal)
//   spec.tracks  = [{ x0, z0, x1, z1, turns }] -> caminhos de terra claros em zigue-zague
//   spec.towns   = [{ x, z, radius, count }]   -> povoações ao longe (casinhas brancas)
// Coordenadas do mundo: o centro do mapa é (0, 0); -z é o norte; +x é o leste.
import * as THREE from 'three';

const HOLE_INSET = 1.5; // por baixo do mapa não desenhamos nada (o mapa tapa)
const EDGE_DROP = 0.02; // junto ao mapa o cenário fica um tudo-nada mais baixo que a borda
const EDGE_FADE = 5;    // nas primeiras 5 unidades fora do mapa, a cor do chão vai passando da do mapa para a do cenário

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (t) => t * t * (3 - 2 * t);

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const top = lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx);
  const bottom = lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx);
  return lerp(top, bottom, fy);
}

export function createBackdrop(scene, village, terrain, spec) {
  const halfW = village.width / 2, halfH = village.height / 2;
  const R = spec.range ?? 130;    // até onde vai o cenário (depois disso, só nevoeiro)
  const BLEND = spec.blend ?? 9;  // em quantas unidades o cenário passa da borda do mapa para a serra
  const toY = (metres) => terrain.baseY + ((metres - spec.minMetres) / spec.metresPerLevel) * terrain.levelHeight;
  const seaY = toY(0) + 0.05;

  // ---------- A forma do terreno ----------
  // Distância (com sinal) até à costa: positiva em terra, negativa no mar.
  function coastDistance(x, z) {
    if (!spec.coast) return Infinity;
    let best = Infinity, sign = 1;
    for (let i = 0; i < spec.coast.length - 1; i++) {
      const [ax, az] = spec.coast[i], [bx, bz] = spec.coast[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < best) {
        best = d;
        sign = dx * (z - az) - dz * (x - ax) > 0 ? -1 : 1; // à esquerda da linha = mar
      }
    }
    return best * sign;
  }

  // Os montes: cada pico "levanta" o terreno à sua volta (sem baixar o que já é alto).
  // p.dome = true: um morro REDONDO (cume largo e abaulado), e não um pico em bico.
  function peakInfluence(x, z, p) {
    const d = Math.hypot(x - p.x, z - p.z) / p.radius;
    const e = d * d;
    return Math.exp(p.dome ? -(e * e * 1.1 + e * 0.5) : -e * 1.6);
  }

  // Altura em METROS (antes de passar para a escala do mapa).
  function metresAt(x, z) {
    let m = spec.base(x, z);
    for (const p of spec.peaks) m += Math.max(0, p.metres - m) * peakInfluence(x, z, p);
    // cumeadas e ravinas: mais fortes onde é alto
    const rough = clamp((m - 120) / 200, 0, 1);
    m += ((noise(x * 0.11, z * 0.11, 41) - 0.5) * 70 + (noise(x * 0.35, z * 0.35, 42) - 0.5) * 18) * rough;
    // junto ao mar o terreno desce até à praia (e fica debaixo de água no mar)
    if (spec.lift && m > spec.lift.above) m = spec.lift.above + (m - spec.lift.above) * spec.lift.factor;
    const c = coastDistance(x, z);
    if (c < 10) m = lerp(-25, m, smooth(clamp((c + 1) / 11, 0, 1)));
    return m;
  }

  // Distância de um ponto até ao retângulo do mapa (0 ou negativa = por cima do mapa).
  function outside(x, z) {
    const dx = Math.abs(x) - halfW, dz = Math.abs(z) - halfH;
    if (dx <= 0 && dz <= 0) return Math.max(dx, dz);
    return Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  }

  // Altura no MUNDO: junto ao mapa segue a borda do mapa; mais longe, a serra.
  function heightAt(x, z) {
    const d = outside(x, z);
    // escondido por baixo do mapa, mas só um pouco (senão, junto à borda, via-se uma "dobra")
    if (d <= 0) return terrain.heightAtWorld(x, z) - 0.05;
    // a altura da BORDA do mapa mesmo ao lado (e não meio quadrado para dentro): assim não fica degrau
    const [ex, ez] = edgePoint(x, z);
    const edge = terrain.heightAtWorld(ex, ez) - EDGE_DROP;
    return lerp(edge, toY(metresAt(x, z)), smooth(clamp(d / BLEND, 0, 1)));
  }

  // O ponto da borda do mapa mais perto de (x, z).
  function edgePoint(x, z) {
    return [clamp(x, -halfW + 0.02, halfW - 0.02), clamp(z, -halfH + 0.02, halfH - 0.02)];
  }

  // ---------- A cor ----------
  const C = Object.fromEntries(Object.entries(spec.colours).map(([k, v]) => [k, new THREE.Color(v)]));
  const tmp = new THREE.Color();
  // Quanto de cada "cobertura" há num ponto (0 a 1), a partir dos picos mais próximos.
  function coverAt(x, z) {
    const cover = { pine: 0, scrub: 0, bare: 0 };
    for (const p of spec.peaks) {
      const w = peakInfluence(x, z, { ...p, radius: p.radius * 1.6 });
      cover[p.cover] = Math.max(cover[p.cover], w);
      if (p.bareTop) cover.bare = Math.max(cover.bare, peakInfluence(x, z, { ...p, radius: p.radius * (p.bareRadius ?? 0.35) }));
    }
    return cover;
  }
  function colourAt(x, z, m, out) {
    const n = noise(x * 0.4, z * 0.4, 43), n2 = noise(x * 1.3, z * 1.3, 44);
    // campos e quintas (o que está longe dos montes): verdes, com manchas de restolho seco
    out.copy(C.field).lerp(C.fieldDry, smooth(clamp((n - 0.5) * 2.5, 0, 1)));
    const cover = coverAt(x, z);
    const westScrub = spec.scrubWest ? clamp((spec.scrubWest - x) / 12, 0, 1) * clamp((m - 60) / 80, 0, 1) : 0;
    const scrub = Math.max(cover.scrub, westScrub);
    if (scrub > 0) out.lerp(tmp.copy(C.scrub).lerp(C.scrubDark, n2), smooth(clamp(scrub * 1.4, 0, 1)));
    // debaixo do pinhal o chão é caruma escura (as clareiras leem-se como mata, não como campo)
    if (cover.pine > 0) out.lerp(tmp.copy(C.pineFloor ?? C.pine).lerp(C.pine, n2 * 0.6), smooth(clamp(cover.pine * 1.5 - n * 0.3, 0, 1)));
    // granito à vista nas partes mais altas
    if (m > 380) out.lerp(C.granite, clamp((m - 380) / 120, 0, 1) * smooth(clamp((n2 - 0.45) * 3, 0, 1)) * 0.8);
    if (cover.bare > 0) out.lerp(C.bare, smooth(clamp(cover.bare * 1.6 - n2 * 0.4, 0, 1)));
    // areia e rocha molhada junto ao mar
    const c = coastDistance(x, z);
    if (c < 2.5) out.lerp(C.sand, smooth(clamp(1 - c / 2.5, 0, 1)));
    out.multiplyScalar(0.9 + noise(x * 3, z * 3, 45) * 0.18);
    // junto ao mapa, a cor continua a do chão do mapa (assim não se vê a borda do "tabuleiro")
    const d = outside(x, z);
    if (d < EDGE_FADE && terrain.colourAtWorld) {
      const [ex, ez] = edgePoint(x, z);
      out.lerp(terrain.colourAtWorld(ex, ez, edgeColour), 1 - smooth(clamp(d / EDGE_FADE, 0, 1)));
    }
    return out;
  }
  const edgeColour = new THREE.Color();

  // ---------- A malha ----------
  // Uma grelha com quadradinhos de 0.5 perto do mapa, cada vez maiores para longe (até 4).
  function axis() {
    const list = [];
    let v = -R;
    while (v < R) {
      list.push(v);
      const away = Math.max(0, Math.abs(v) - (Math.max(halfW, halfH) + 4));
      v += Math.min(4, 0.5 + away * 0.07);
    }
    list.push(R);
    return list;
  }
  const xs = axis(), zs = axis();
  const positions = [], colours = [], index = [];
  const c = new THREE.Color();
  for (const z of zs) {
    for (const x of xs) {
      const y = heightAt(x, z);
      positions.push(x, y, z);
      colourAt(x, z, metresAt(x, z), c);
      colours.push(c.r, c.g, c.b);
    }
  }
  const nx = xs.length;
  const hidden = (x, z) => Math.abs(x) < halfW - HOLE_INSET && Math.abs(z) < halfH - HOLE_INSET;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      if (hidden(xs[i], zs[j]) && hidden(xs[i + 1], zs[j + 1])) continue;
      const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true;
  ground.name = 'backdrop';

  const group = new THREE.Group();
  group.name = 'backdrop';
  group.add(ground);
  if (spec.coast) group.add(buildSea());
  group.add(buildPines());
  const tors = buildTors();
  if (tors) group.add(tors);
  if (spec.hedgeRows) group.add(buildHedgeRows());
  for (const p of spec.peaks) if (p.sanctuary) group.add(buildSanctuary(p));
  for (const t of spec.tracks ?? []) group.add(buildTrack(t));
  if (spec.towns?.length) group.add(buildTowns());
  scene.add(group);
  return group;

  // O mar: um plano grande ao nível do mar (só se vê onde o terreno desce abaixo dele).
  function buildSea() {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 2, R * 2).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: spec.colours.sea, roughness: 0.25, metalness: 0.05 }),
    );
    sea.position.y = seaY;
    return sea;
  }

  // Pinhal ao longe: milhares de cones verde-escuros (UMA peça só, desenhada de uma vez).
  function buildPines() {
    const range = spec.pines?.range ?? 75, max = spec.pines?.max ?? 7000;
    const denseScale = spec.pines?.denseScale ?? 1;
    // quantos sítios experimentamos: ~3 por unidade quadrada (o pinhal cerrado fica mesmo cerrado)
    const tries = Math.max(40000, Math.round(range * range * 4 * 3));
    const spots = [];
    for (let k = 0; k < tries && spots.length < max; k++) {
      const x = (hash(k, 1, 50) - 0.5) * 2 * range, z = (hash(k, 2, 50) - 0.5) * 2 * range;
      if (outside(x, z) < 1.2) continue;
      const cover = coverAt(x, z);
      const westScrub = spec.scrubWest ? clamp((spec.scrubWest - x) / 12, 0, 1) : 0;
      // nos campos, as árvores juntam-se em pequenos bosques (manchas do ruído), não soltas
      const grove = noise(x * 0.14, z * 0.14, 46) > 0.64 ? 12 : 0;
      // no pinhal cerrado as copas juntam-se em maciços, com pequenas clareiras entre eles
      const clump = cover.pine > 0.5 ? 0.5 + noise(x * 0.6, z * 0.6, 47) * 1.1 : 1;
      const chance = cover.pine * 1.3 * clump - cover.bare * 2 - westScrub * 0.8 + (spec.lowlandTrees ?? 0) * grove;
      if (hash(k, 3, 50) > chance) continue;
      if (coastDistance(x, z) < 3) continue;
      spots.push([x, z, k]);
    }
    const cone = new THREE.ConeGeometry(0.3, 1, 5).translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    spots.forEach(([x, z, k], i) => {
      const pine = coverAt(x, z).pine;
      // pinhal cerrado: copas grandes; nos campos, árvores mais pequenas
      // (as copas grandes só na serra: nos vales em frente à câmara tapavam a vila)
      const big = pine > 0.5 && metresAt(x, z) > 220;
      const s = (0.7 + hash(k, 4, 50) * 0.7) * (big ? denseScale : pine > 0.3 ? 1 : 0.6);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.05, z), q, new THREE.Vector3(s * 1.1, s * (0.8 + hash(k, 5, 50) * 0.5), s * 1.1));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.copy(C.pine).lerp(C.pineLit, hash(k, 6, 50)).multiplyScalar(0.85));
    });
    return mesh;
  }

  // Penedos de granito nas cumeadas (os "caos de blocos" da serra).
  function buildTors() {
    const spots = [];
    for (const p of spec.peaks) {
      if (!p.tors) continue;
      for (let k = 0; k < p.tors; k++) {
        const ang = hash(k, 1, p.metres) * Math.PI * 2, r = Math.sqrt(hash(k, 2, p.metres)) * p.radius * 0.7;
        const x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
        if (outside(x, z) < 1) continue;
        spots.push([x, z, k + p.metres * 1000, 1]);
      }
    }
    // montes de penedos soltos (ex.: no ombro da cúpula, a nordeste)
    (spec.torClusters ?? []).forEach((t, ti) => {
      for (let k = 0; k < t.count; k++) {
        const ang = hash(k, 1, 70 + ti) * Math.PI * 2, r = Math.sqrt(hash(k, 2, 70 + ti)) * t.radius;
        const x = t.x + Math.cos(ang) * r, z = t.z + Math.sin(ang) * r;
        if (outside(x, z) < 1) continue;
        spots.push([x, z, k + 9000 + ti * 100, t.size ?? 1]);
      }
    });
    if (!spots.length) return null;
    const mesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    spots.forEach(([x, z, k, size], i) => {
      const s = (0.6 + hash(k, 3, 51) * 1.4) * size;
      q.setFromEuler(e.set(hash(k, 4, 51), hash(k, 5, 51) * 6, 0));
      m.compose(new THREE.Vector3(x, heightAt(x, z) + 0.1 * s, z), q, new THREE.Vector3(s, s * 0.75, s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.copy(C.granite).multiplyScalar(0.8 + hash(k, 6, 51) * 0.35));
    });
    return mesh;
  }

  // Sebes compridas e escuras (cipreste, loureiro) a dividir os campos e as quintas.
  // Cada sebe é uma fila de "caixinhas" verde-escuras que segue o chão.
  function buildHedgeRows() {
    const segs = [];
    const count = spec.hedgeRows.count ?? 40, length = spec.hedgeRows.length ?? 5;
    for (let h = 0, tries = 0; h < count && tries < count * 20; tries++) {
      const cx = (hash(tries, 1, 80) - 0.5) * 120, cz = (hash(tries, 2, 80) - 0.5) * 120;
      if (outside(cx, cz) < 6 || coastDistance(cx, cz) < 4) continue;
      const cover = coverAt(cx, cz);
      if (cover.pine > 0.35 || cover.scrub > 0.4 || metresAt(cx, cz) > 300) continue; // só nos campos
      h++;
      // as sebes seguem mais ou menos as mesmas direções (como os limites das propriedades)
      const ang = (hash(tries, 3, 80) < 0.5 ? 0.35 : 1.92) + (hash(tries, 4, 80) - 0.5) * 0.4;
      const len = length * (0.6 + hash(tries, 5, 80) * 0.8);
      const dx = Math.cos(ang), dz = Math.sin(ang);
      for (let t = -len / 2; t < len / 2; t += 0.35) {
        const x = cx + dx * t, z = cz + dz * t;
        if (outside(x, z) < 1.5) continue;
        segs.push([x, z, ang, tries * 50 + Math.round(t * 3)]);
      }
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.4, 0.22, 0.15).translate(0, 0.11, 0),
      new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), segs.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const hedge = new THREE.Color(spec.colours.hedge ?? 0x2f4a34);
    const up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scale = new THREE.Vector3();
    segs.forEach(([x, z, ang, k], i) => {
      q.setFromAxisAngle(up, -ang);
      m.compose(pos.set(x, heightAt(x, z) - 0.04, z), q, scale.set(1, 0.85 + hash(k, 1, 81) * 0.3, 1));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.copy(hedge).multiplyScalar(0.85 + hash(k, 2, 81) * 0.3));
    });
    return mesh;
  }

  // Santuário no cume (na Peninha: uma capela branca com uma torre, em cima dos penedos).
  function buildSanctuary(p) {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9, flatShading: true });
    const roof = new THREE.MeshStandardMaterial({ color: 0xb5532f, roughness: 0.9, flatShading: true });
    const y = heightAt(p.x, p.z);
    const nave = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.6), white);
    nave.position.set(0, 0.3, 0);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), white);
    tower.position.set(0.5, 0.5, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 4).rotateY(Math.PI / 4), roof);
    cap.position.set(0.5, 1.15, 0);
    const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.25, 4).rotateY(Math.PI / 4).scale(1.4, 1, 0.75), roof);
    naveRoof.position.set(-0.1, 0.72, 0);
    g.add(nave, tower, cap, naveRoof);
    g.position.set(p.x, y - 0.1, p.z);
    g.rotation.y = 0.4;
    return g;
  }

  // Caminho de terra clara em zigue-zague a subir a encosta (os aceiros e carreiros da serra).
  function buildTrack(t) {
    const pts = [];
    const turns = t.turns ?? 5;
    const dx = t.x1 - t.x0, dz = t.z1 - t.z0;
    const len = Math.hypot(dx, dz), sx = -dz / len, sz = dx / len; // para o lado
    for (let i = 0; i <= turns * 8; i++) {
      const k = i / (turns * 8);
      const side = Math.sin(k * turns * Math.PI) * (t.width ?? 3);
      pts.push([t.x0 + dx * k + sx * side, t.z0 + dz * k + sz * side]);
    }
    const positions = [], idx = [];
    const half = 0.13;
    pts.forEach(([x, z], i) => {
      const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(bx - ax, bz - az) || 1;
      const ox = (-(bz - az) / l) * half, oz = ((bx - ax) / l) * half;
      for (const s of [-1, 1]) {
        const px = x + ox * s, pz = z + oz * s;
        positions.push(px, heightAt(px, pz) + 0.06, pz);
      }
      if (i > 0) { const p = i * 2; idx.push(p - 2, p - 1, p, p, p - 1, p + 1); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: spec.colours.track ?? 0xcdbf9a, roughness: 1, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
  }

  // Povoações ao longe: casinhas brancas de telhado laranja (uma peça só, com cores por vértice).
  function buildTowns() {
    const body = new THREE.BoxGeometry(0.34, 0.24, 0.28).translate(0, 0.12, 0);
    const roof = new THREE.ConeGeometry(0.27, 0.12, 4).rotateY(Math.PI / 4).scale(1.2, 1, 1).translate(0, 0.3, 0);
    const paint = (geo, hex) => {
      const col = new THREE.Color(hex), n = geo.attributes.position.count, arr = [];
      for (let i = 0; i < n; i++) arr.push(col.r, col.g, col.b);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      return geo.toNonIndexed ? geo.toNonIndexed() : geo;
    };
    const house = mergeTwo(paint(body, 0xf3efe6), paint(roof, 0xc8643c));
    const spots = [];
    spec.towns.forEach((town, ti) => {
      for (let k = 0; k < town.count; k++) {
        const ang = hash(k, 1, 60 + ti) * Math.PI * 2, r = Math.sqrt(hash(k, 2, 60 + ti)) * town.radius;
        const x = town.x + Math.cos(ang) * r, z = town.z + Math.sin(ang) * r;
        if (outside(x, z) < 1.5 || coastDistance(x, z) < 2) continue;
        spots.push([x, z, k * 31 + ti]);
      }
    });
    const mesh = new THREE.InstancedMesh(house, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    spots.forEach(([x, z, k], i) => {
      const s = 0.55 + hash(k, 3, 61) * 0.3;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(k, 4, 61) * 6.28);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.03, z), q, new THREE.Vector3(s, s * (hash(k, 5, 61) < 0.4 ? 1.5 : 1), s));
      mesh.setMatrixAt(i, m);
    });
    return mesh;
  }
}

// Junta duas geometrias (já sem índices) numa só.
function mergeTwo(a, b) {
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const x = a.attributes[name].array, y = b.attributes[name].array;
    const arr = new Float32Array(x.length + y.length);
    arr.set(x); arr.set(y, x.length);
    geo.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return geo;
}
