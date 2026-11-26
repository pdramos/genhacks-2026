// Uma noite: node night.cjs <nome> [plano.json] [look]
const fs = require('fs');
const { launch, URL0, budget } = require('./common.cjs');
const { startRec } = require('./rec.cjs');
const H = require('./page.cjs');
const [name, planFile, look] = process.argv.slice(2);
(async () => {
  const retry = planFile ? JSON.stringify({ level: 'sintra', seed: 1960, plan: JSON.parse(fs.readFileSync(planFile, 'utf8')) }) : null;
  const { browser, page } = await launch(retry);
  await page.goto(URL0);
  if (!retry) { await page.waitForSelector('[data-do="start"]', { timeout: 90000 }); await page.waitForTimeout(800); await page.click('[data-do="start"]'); }
  const startBtn = page.getByRole('button', { name: 'Start disaster', exact: true });
  await startBtn.waitFor({ timeout: 90000 });
  await page.mouse.move(1919, 1079);
  await page.waitForTimeout(retry ? 3500 : 2000); // deixa o aviso "Same night, same plan" sair
  console.log('budget before', await budget(page), 'seed', await page.evaluate(async () => (await import(new URL('src/render/main.js', location.href).href)).game.seed));
  await H.installHooks(page);
  const r = await startRec(page, name);
  await page.waitForTimeout(2200);
  r.mark('click Start disaster');
  await startBtn.click();
  await page.mouse.move(1919, 1079);
  await page.waitForSelector('.result-card:not(.fatal-card)', { state: 'visible', timeout: 240000 });
  r.mark('result card visible (playwright)');
  await page.waitForTimeout(7000);
  await H.pullEvents(page, r);
  const card = await page.evaluate(() => document.querySelector('.result-card:not(.fatal-card)')?.innerText);
  const info = await page.evaluate(() => document.getElementById('info')?.innerText);
  await r.stop();
  console.log('CARD', JSON.stringify(card)); console.log('INFO', info);
  await page.screenshot({ path: name + '-card.png' });
  if (look) {
    await page.click('[data-do="look"]');
    await page.mouse.move(1919, 1079);
    await page.waitForTimeout(1500);
    const r2 = await startRec(page, 'look-around');
    await page.waitForTimeout(1000); r2.mark('orbit starts');
    await H.orbit(page, 70, 16, 0.8); r2.mark('orbit ends');
    await page.waitForTimeout(1000);
    await r2.stop();
  }
  await browser.close();
})();
