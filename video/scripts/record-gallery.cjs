// Grava a galeria do estilo sintra (site publicado), quadro a quadro, com tempo virtual.
// node video/scripts/record-gallery.cjs stills  -> umas imagens de teste do caminho da camara
// node video/scripts/record-gallery.cjs record  -> 30 fps, DUR s, quadros jpg em OUT/frames
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const OUT = require('path').join(require('os').tmpdir(), 'genhacks-gallery') + '/';
const URL = 'https://pdramos.github.io/genhacks-2026/gallery.html?style=sintra';
const mode = process.argv[2] || 'stills';
const FPS = 30, DUR = Number(process.argv[3] || 7.5);
const PATH = JSON.parse(fs.readFileSync(__dirname + '/record-gallery-path.json', 'utf8'));

(async () => {
  fs.mkdirSync(OUT + 'frames', { recursive: true });
  for (const f of fs.readdirSync(OUT + 'frames')) fs.unlinkSync(OUT + 'frames/' + f);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // tempo virtual: as bandeiras ondulam a 30 fps "verdadeiros", mesmo que cada quadro demore mais a tirar
  await ctx.addInitScript(() => {
    window.__vt = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.__raf = raf;
    window.requestAnimationFrame = (cb) => raf(() => cb(window.__vt));
  });
  // so no navegador da gravacao: expor a camara e esconder o rotulo "Style: sintra" (o ficheiro do repo nao muda)
  await ctx.route('**/gallery.html*', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    body = body.replace('controls.target.set(3.5, 0.3, 2);', 'controls.target.set(3.5, 0.3, 2); window.__camera = camera; window.__controls = controls;');
    body = body.replace('</style>', '#label{display:none!important}</style>');
    if (!body.includes('window.__camera')) throw new Error('gallery.html changed: hook not inserted');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__camera && window.__controls, null, { timeout: 60000 });
  await page.waitForTimeout(2500);

  const setFrame = (t) => page.evaluate(({ t, P, FPS }) => {
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    // P.keys = [{ t, pos:[x,y,z], target:[x,y,z] }]; interpola com ease entre chaves
    const k = P.keys;
    let i = 0; while (i < k.length - 2 && t > k[i + 1].t) i++;
    const a = k[i], b = k[i + 1];
    const u = ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
    const lerp = (p, q) => p.map((v, j) => v + (q[j] - v) * u);
    const pos = lerp(a.pos, b.pos), tg = lerp(a.target, b.target);
    window.__camera.position.set(...pos);
    window.__controls.target.set(...tg);
    window.__vt = 5000 + t * 1000;
    return new Promise((r) => window.__raf(() => window.__raf(() => r())));
  }, { t, P: PATH, FPS });

  if (mode === 'stills') {
    const times = PATH.keys.map((k) => k.t).concat([(PATH.keys[0].t + PATH.keys[1].t) / 2]);
    for (const t of times) { await setFrame(t); await page.screenshot({ path: `${OUT}still-${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 85 }); }
  } else {
    const n = Math.round(DUR * FPS);
    for (let f = 0; f < n; f++) {
      await setFrame(f / FPS);
      await page.screenshot({ path: `${OUT}frames/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
    }
    console.log('frames', n);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
