// Efeitos visuais do fogo: chamas, fumo e luz a tremeluzir em cima de um quadrado.
// Só desenha — QUEM decide o que arde é a simulação (src/sim).
//
// API:
//   const fx = createFireFx(scene, view)
//   fx.ignite(x, y)     -> começa a mostrar fogo nesse quadrado
//   fx.extinguish(x, y) -> tira o fogo desse quadrado (ex.: já ardeu)
//   fx.clear()          -> tira todo o fogo
//   fx.update(dt, t)    -> anima as partículas; chamar a cada desenho
import * as THREE from 'three';

export function createFireFx(scene, view) {
  const fires = new Map(); // "x,y" -> { flame, smoke, light }

  // Luzes do fogo: um número FIXO de luzes, criadas já aqui e "desligadas" (intensidade 0).
  // Porquê? Sempre que o número de luzes da cena muda, o three.js recompila os shaders
  // de todos os materiais e o jogo congela 1 a 2 segundos. Assim o número nunca muda.
  // Só os primeiros MAX_LIGHTS fogos acesos ao mesmo tempo têm luz; os outros só partículas.
  const MAX_LIGHTS = 8;
  const freeLights = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const light = new THREE.PointLight(0xff7a2a, 0, 3);
    scene.add(light);
    freeLights.push(light);
  }

  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function makeParticles(n, color, size, isSmoke) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), life = new Float32Array(n);
    for (let i = 0; i < n; i++) { resetParticle(pos, i); life[i] = rand(); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, transparent: true, opacity: isSmoke ? 0.45 : 0.9,
      blending: isSmoke ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false,
    }));
    p.userData = { life, isSmoke };
    return p;
  }
  function resetParticle(pos, i) {
    pos[i * 3] = (rand() - 0.5) * 0.6; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (rand() - 0.5) * 0.6;
  }

  function ignite(x, y) {
    const key = `${x},${y}`;
    if (fires.has(key)) return;
    const { x: wx, z: wz } = view.worldPosition(x, y);
    const flame = makeParticles(40, 0xff7a1a, 0.18, false);
    const smoke = makeParticles(25, 0x555555, 0.35, true);
    flame.position.set(wx, 0.3, wz);
    smoke.position.set(wx, 0.5, wz);
    const light = freeLights.pop() || null; // pode não haver luz livre
    if (light) light.position.set(wx, 0.8, wz);
    scene.add(flame, smoke);
    fires.set(key, { flame, smoke, light, x });
  }

  function extinguish(x, y) {
    const key = `${x},${y}`;
    const f = fires.get(key);
    if (!f) return;
    scene.remove(f.flame, f.smoke);
    f.flame.geometry.dispose(); f.smoke.geometry.dispose();
    if (f.light) {
      f.light.intensity = 0; // desliga a luz e devolve-a para outro fogo usar
      freeLights.push(f.light);
    }
    fires.delete(key);
  }

  function clear() {
    for (const key of [...fires.keys()]) {
      const [x, y] = key.split(',').map(Number);
      extinguish(x, y);
    }
  }

  function update(dt, t) {
    for (const f of fires.values()) {
      for (const p of [f.flame, f.smoke]) {
        const pos = p.geometry.attributes.position.array, life = p.userData.life;
        for (let i = 0; i < life.length; i++) {
          life[i] += dt * (p.userData.isSmoke ? 0.4 : 1.4);
          pos[i * 3 + 1] = life[i] * (p.userData.isSmoke ? 1.8 : 0.9);
          if (life[i] > 1) { life[i] = 0; resetParticle(pos, i); }
        }
        p.geometry.attributes.position.needsUpdate = true;
      }
      if (f.light) f.light.intensity = 2 + Math.sin(t * 20 + f.x) * 0.6;
    }
  }

  return { ignite, extinguish, clear, update };
}
