// Confere o ritmo de cada legenda (o rascunho da narracao):
//   - no maximo 2,5 palavras por segundo, mais 0,5 s de margem;
//   - a legenda cabe dentro da sua cena e nao se sobrepoe a seguinte.
// Uso: node scripts/check-captions.mjs   (sai com erro se alguma falhar)
// (O Node 24 le os ficheiros .ts diretamente.)
import { SCENE_SECONDS } from "../src/timeline.ts";
import { NARRATION } from "../src/narration.ts";

const WORDS_PER_SEC = 2.5;
const MARGIN = 0.5;
let bad = 0;
let words = 0;
for (const [scene, lines] of Object.entries(NARRATION)) {
  const dur = SCENE_SECONDS[scene];
  if (dur === undefined) {
    console.log(`?? cena "${scene}" nao existe em timeline.ts`);
    bad++;
    continue;
  }
  lines.forEach((l, i) => {
    const n = l.text.split(/\s+/).filter(Boolean).length;
    words += n;
    const need = n / WORDS_PER_SEC + MARGIN;
    const have = l.to - l.from;
    const problems = [];
    if (have + 1e-9 < need) problems.push(`curta: tem ${have.toFixed(1)} s, precisa ${need.toFixed(1)} s`);
    if (l.to > dur + 1e-9) problems.push(`passa do fim da cena (${dur} s)`);
    const next = lines[i + 1];
    if (next && next.from < l.to) problems.push("sobrepoe-se a seguinte");
    const mark = problems.length ? "XX" : "ok";
    if (problems.length) bad++;
    console.log(
      `${mark} ${scene.padEnd(12)} ${String(n).padStart(2)} palavras ${have.toFixed(1).padStart(4)} s (${(n / have).toFixed(2)}/s) ${problems.join("; ")}  "${l.text}"`,
    );
  });
}
console.log(`\n${words} palavras de narracao. ${bad ? bad + " problema(s)." : "Tudo dentro do ritmo."}`);
process.exit(bad ? 1 : 0);
