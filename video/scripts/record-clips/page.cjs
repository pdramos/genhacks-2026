// Ajudas que correm dentro da página (não mexem nos ficheiros do jogo).
const IMP = `(await import(new URL('src/render/main.js', location.href).href))`;
async function installHooks(page) {
  await page.evaluate(async () => {
    const M = await import(new URL('src/render/main.js', location.href).href);
    const g = M.game; window.__ev = []; const now = () => performance.timeOrigin + performance.now();
    const push = (label) => window.__ev.push({ label, epoch: now() / 1000 });
    M.onPhaseChange((p) => push('phase:' + p));
    const STATION = new Set(['19,15', '20,15']);
    const ign = g.fireFx.ignite.bind(g.fireFx); let n = 0, st = false;
    g.fireFx.ignite = (x, y, ...r) => { n++; if (n === 1) push('first flame on map (' + x + ',' + y + ')'); if (!st && STATION.has(x + ',' + y)) { st = true; push('fire reaches fire station (' + x + ',' + y + ')'); } return ign(x, y, ...r); };
    const sb = g.view.setBurned.bind(g.view); let sbs = false;
    g.view.setBurned = (x, y, ...r) => { if (!sbs && STATION.has(x + ',' + y)) { sbs = true; push('fire station tile burned'); } return sb(x, y, ...r); };
    const mo = new MutationObserver(() => { const c = document.querySelector('.result-card:not(.fatal-card)'); if (c && !c.hidden && c.offsetParent && !window.__rc) { window.__rc = 1; push('result card appears'); } });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true });
  });
}
async function pullEvents(page, rec) { const ev = await page.evaluate(() => window.__ev || []); for (const e of ev) rec.events.push(e); }
async function orbit(page, deg, seconds, zoom = 1) {
  await page.evaluate(async ({ deg, seconds, zoom }) => {
    const { game } = await import(new URL('src/render/main.js', location.href).href);
    const { camera, controls } = game; const T = controls.target.clone();
    const off0 = camera.position.clone().sub(T); const r0 = Math.hypot(off0.x, off0.z); const a0 = Math.atan2(off0.z, off0.x);
    const t0 = performance.now(); const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await new Promise((res) => { const step = () => { const t = Math.min(1, (performance.now() - t0) / (seconds * 1000)); const e = ease(t);
      const a = a0 + deg * Math.PI / 180 * e; const k = 1 + (zoom - 1) * e;
      camera.position.set(T.x + Math.cos(a) * r0 * k, T.y + off0.y * k, T.z + Math.sin(a) * r0 * k); camera.lookAt(T);
      if (t < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  }, { deg, seconds, zoom });
}
async function saveCam(page) { return page.evaluate(async () => { const { game } = await import(new URL('src/render/main.js', location.href).href); return { p: game.camera.position.toArray(), t: game.controls.target.toArray() }; }); }
async function setCam(page, c) { await page.evaluate(async (c) => { const { game } = await import(new URL('src/render/main.js', location.href).href); game.controls.target.fromArray(c.t); game.camera.position.fromArray(c.p); game.camera.lookAt(game.controls.target); game.controls.update(); }, c); }
// Aproxima a câmara de um quadrado (fator < 1 = mais perto), mantendo o ângulo.
async function focusTile(page, x, y, factor) {
  await page.evaluate(async ({ x, y, factor }) => { const { game } = await import(new URL('src/render/main.js', location.href).href);
    const p = game.view.worldPosition(x, y); const off = game.camera.position.clone().sub(game.controls.target).multiplyScalar(factor);
    game.controls.target.set(p.x, p.y, p.z); game.camera.position.copy(game.controls.target).add(off); game.camera.lookAt(game.controls.target); game.controls.update(); }, { x, y, factor });
}
async function hideUI(page, hide) {
  await page.evaluate((hide) => { let s = document.getElementById('__rec_hide'); if (!s) { s = document.createElement('style'); s.id = '__rec_hide'; document.head.appendChild(s); }
    s.textContent = hide ? 'body > *:not(#game):not(script):not(style) { visibility: hidden !important; } #game > :not(canvas) { visibility:hidden !important; }' : ''; }, hide);
}
module.exports = { installHooks, pullEvents, orbit, saveCam, setCam, focusTile, hideUI };
