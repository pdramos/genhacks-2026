const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL0 = 'https://pdramos.github.io/genhacks-2026/?seed=1960';
async function launch(init) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((retry) => { try { localStorage.setItem('brace-muted', '1'); if (retry && !sessionStorage.getItem('rec-done')) { sessionStorage.setItem('brace-retry', retry); sessionStorage.setItem('rec-done','1'); } } catch {} }, init || null);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  return { browser, ctx, page };
}
const G = `const { game } = await import(new URL('src/render/main.js', location.href).href);`;
async function screenPos(page, x, y) {
  return page.evaluate(async ({ x, y }) => {
    const { game } = await import(new URL('src/render/main.js', location.href).href);
    const THREE = await import('three');
    const canvas = game.renderer.domElement, r = canvas.getBoundingClientRect();
    game.camera.updateMatrixWorld();
    const p = game.view.worldPosition(x, y);
    const v = new THREE.Vector3(p.x, p.y, p.z).project(game.camera);
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    const onCanvas = document.elementFromPoint(sx, sy) === canvas && Math.abs(v.x) < 0.97 && Math.abs(v.y) < 0.97;
    return { sx, sy, onCanvas };
  }, { x, y });
}
const budget = (page) => page.evaluate(async () => (await import(new URL('src/render/main.js', location.href).href)).game.buildState?.budget);
module.exports = { launch, URL0, screenPos, budget };
