// Sessão A: briefing, opening (mapa de dia a rodar, sem UI) e build-live.
const { launch, URL0, screenPos, budget } = require('./common.cjs');
const { startRec } = require('./rec.cjs');
const H = require('./page.cjs');
(async () => {
  const { browser, page } = await launch();
  await page.goto(URL0);
  await page.waitForSelector('[data-do="start"]', { timeout: 90000 });
  await page.mouse.move(1919, 1079);
  await page.waitForTimeout(1200);
  let r = await startRec(page, 'briefing'); r.mark('briefing card on screen');
  await page.waitForTimeout(5000); await r.stop();

  await page.click('[data-do="start"]');
  await page.mouse.move(1919, 1079);
  await page.waitForTimeout(2500);
  const cam0 = await H.saveCam(page);
  await H.hideUI(page, true);
  await page.waitForTimeout(800);
  r = await startRec(page, 'opening');
  await page.waitForTimeout(500); r.mark('orbit starts');
  await H.orbit(page, -35, 12, 0.85); r.mark('orbit ends');
  await page.waitForTimeout(700); await r.stop();
  await H.hideUI(page, false);
  await H.setCam(page, cam0);
  await H.focusTile(page, 17, 9, 0.5);
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => !!document.querySelector('.tool-card.selected'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  const tiles = [[16,7],[17,7],[18,7],[19,7],[17,6],[18,6]];
  const pos = []; for (const [x,y] of tiles) pos.push(await screenPos(page, x, y));
  console.log('pos', JSON.stringify(pos));
  await page.screenshot({ path: 'a-focus.png' });
  await page.mouse.move(1500, 900);
  r = await startRec(page, 'build-live');
  await page.waitForTimeout(1200);
  await page.keyboard.press('1'); r.mark('tool 1 (Clear brush) chosen, tiles glow');
  await page.waitForTimeout(1500);
  for (let i = 0; i < tiles.length; i++) {
    const b = await budget(page);
    await page.mouse.move(pos[i].sx, pos[i].sy, { steps: 18 });
    await page.waitForTimeout(350);
    await page.mouse.click(pos[i].sx, pos[i].sy); r.mark(`click ${tiles[i]} budget ${b} -> ${await budget(page)}`);
    await page.waitForTimeout(650);
  }
  await page.mouse.move(1500, 900, { steps: 15 });
  await page.waitForTimeout(2000);
  await r.stop();
  await page.screenshot({ path: 'a-after.png' });
  await browser.close();
})();
