// Tira fotogramas soltos do video (para rever sem fazer o render todo).
// 1) npx remotion bundle --out-dir=<pasta-do-bundle>
// 2) node scripts/stills.mjs <pasta-do-bundle> <pasta-de-saida> <segundo> [<segundo> ...]
// Cada imagem chama-se t<segundos>.jpg. Usa um so browser para todos os fotogramas.
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [serveUrl, outDir, ...secs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await openBrowser("chrome");
const composition = await selectComposition({ serveUrl, id: "SameNight", inputProps: { voiceSrc: null }, puppeteerInstance: browser });
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * composition.fps));
  const output = path.join(outDir, `t${Number(s).toFixed(1).padStart(5, "0")}.jpg`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 85, inputProps: { voiceSrc: null }, puppeteerInstance: browser });
  console.log("ok", s, output);
}
await browser.close({ silent: true });
