// Gravacao "build-v1" (v1 do video): preparar a vila com DUAS ferramentas.
// 4 cliques de Clear brush e 1 Firebreak (EUR 500), com a camara perto do quartel.
// Grava tambem as coordenadas no ecra de cada clique (para os circulos desenhados no video)
// em scratchpad/video-wf/meta-build-v1.json. Correr SO com nenhum outro browser 3D aberto:
//   node video/scripts/record-clips/buildV1.cjs
const fs = require('fs');
const { launch, URL0, screenPos, budget } = require('./common.cjs');
const { startRec, WF } = require('./rec.cjs');
const H = require('./page.cjs');
(async () => {
  const { browser, page } = await launch();
  await page.goto(URL0);
  await page.waitForSelector('[data-do="start"]', { timeout: 90000 });
  await page.mouse.move(1919, 1079);
  await page.waitForTimeout(1200);
  await page.click('[data-do="start"]');
  await page.mouse.move(1919, 1079);
  await page.waitForTimeout(2500);
  await H.focusTile(page, 17, 9, 0.5);
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => !!document.querySelector('.tool-card.selected'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  // Mato a limpar (EUR 250 cada, encosta) e o corta-fogo (EUR 500, chao plano).
  const plan = [[16, 7, '1'], [17, 7, '1'], [18, 7, '1'], [17, 6, '1'], [19, 7, '2']];
  const pos = []; for (const [x, y] of plan) pos.push(await screenPos(page, x, y));
  console.log('pos', JSON.stringify(pos));
  await page.mouse.move(1500, 900);
  const r = await startRec(page, 'build-v1');
  await page.waitForTimeout(1200);
  await page.keyboard.press('1'); r.mark('tool 1 (Clear brush) chosen, tiles glow');
  await page.waitForTimeout(2200);
  let tool = '1';
  for (let i = 0; i < plan.length; i++) {
    const [x, y, key] = plan[i];
    if (key !== tool) {
      await page.waitForTimeout(500);
      await page.keyboard.press(key); tool = key; r.mark(`tool ${key} (Firebreak) chosen`);
      await page.waitForTimeout(1300);
    }
    const b = await budget(page);
    await page.mouse.move(pos[i].sx, pos[i].sy, { steps: 18 });
    await page.waitForTimeout(350);
    await page.mouse.click(pos[i].sx, pos[i].sy);
    r.mark(`click ${x},${y} key ${key} at ${pos[i].sx.toFixed(0)},${pos[i].sy.toFixed(0)} budget ${b} -> ${await budget(page)}`);
    await page.waitForTimeout(800);
  }
  await page.mouse.move(1500, 900, { steps: 15 });
  await page.waitForTimeout(3000);
  const meta = await r.stop();
  meta.clicks = plan.map(([x, y, key], i) => ({ tile: [x, y], tool: key === '1' ? 'clearBrush' : 'firebreak', sx: Math.round(pos[i].sx), sy: Math.round(pos[i].sy) }));
  fs.writeFileSync(WF + 'meta-build-v1.json', JSON.stringify(meta, null, 1));
  await page.screenshot({ path: WF + 'v1/build-v1-after.png' });
  await browser.close();
})();
