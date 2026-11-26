// Escreve o storyboard (cena a cena: tempo, imagem, legenda exata, gravacao de origem)
// a partir de src/timeline.ts e src/narration.ts, para nunca ficar desatualizado.
// Uso: node scripts/storyboard.mjs > storyboard.md
// (O Node 24 le os ficheiros .ts diretamente.)
import { SCENE_SECONDS, FADES, FPS } from "../src/timeline.ts";
import { NARRATION } from "../src/narration.ts";

// O que se ve em cada cena e de que gravacao vem (tempos dentro da gravacao).
const SCENES = {
  coldOpen: ["O fogo da noite sem plano a passar pela aldeia, ja com chamas desde o 1.o fotograma, com zoom lento (1.30 a 1.42) que deixa de fora o HUD e a legenda do jogo. Etiqueta 'Game footage · a what-if night · 2× speed'. A legenda do video esta no ecra desde o fotograma 0.", "night-nothing.mp4, 13.6-34.8 s, a 2x"],
  title: ["'Same Night' em letra grande sobre a aldeia de dia (a camara roda devagar). Duas legendas: o que e e para quem; o que fazes.", "opening.mp4, 0.5-12.6 s, a 1.05x"],
  proofMini: ["Mini-cartao de prova desenhado em codigo (os mesmos mapas do cartao completo): 'Official burn map (ICNF)' a vermelho ao lado de 'Our fire, real wind' a laranja, com o contorno creme da area oficial, e um '0.65 overlap' grande.", "codigo (src/scenes/Proof.tsx ProofMini + src/data/proof.json)"],
  teaser: ["So as tres barras do cartao do jogo, ampliadas e centradas: Your plan 181/194, Doing nothing 100/194 (Fire station lost), Expert plan 194/194.", "night-sensible.mp4, cartao parado aos 46 s (placa)"],
  build: ["Camara perto do quartel (zoom 1.14 preso em baixo, sem 'FORECAST'). Clear brush fica marcado e os quadrados da lei brilham; os 5 '?' ficam com um contorno laranja; 4 cliques de Clear brush (toasts '-€250') e, depois de escolher Firebreak, 1 clique de corta-fogo ('-€500'). Cada clique tem um circulo laranja que cresce. Canto de baixo a direita: o porta-moedas do jogo ampliado, de €20,000 a €18,500. Nos ultimos 1.8 s: zoom de 1.85 nos quadrados mudados, 'Before' e 'After'.", "build-v1.mp4, 0.6-15.2 s ao vivo, a 1x; Before = 3.6 s, After = 15.6 s (congelados)"],
  planReady: ["O plano sensato inteiro (vista larga) e o clique em 'Start disaster' (contorno laranja no botao).", "night-sensible.mp4, 0-2.4 s, a 0.95x"],
  cigarette: ["Cena de cinema: o carro vermelho, o cigarro voa e cai no mato. Barra de cima: 'DRAMATIZATION the real cause was never confirmed'. A barra de baixo (175 px) tapa a legenda do jogo; acaba antes da borda azul do terreno.", "night-sensible.mp4, 3.35-7.85 s"],
  fire: ["O fogo no mapa de noite, a descer para a aldeia; o fumo deriva. Zoom 1.25 a 1.32. Etiqueta 'Game footage · 3.5× speed'. Corta antes do cartao.", "night-sensible.mp4, 12.5-41.55 s, a 3.5x"],
  result: ["Cartao do plano sensato em 3 placas (cartao parado): 0-3.5 s 'The fire is out', 2 estrelas, 181/194 e 'Safe'; 3.5-7.1 s so a frase 'On this same night the expert plan saved 13 more houses:', com 'the expert plan saved 13 more houses' sublinhado; 7.1-9.4 s a fila de botoes, com 'Try again (same night)' a pulsar. Sem o paragrafo 'What really happened'.", "night-sensible.mp4, cartao parado aos 46 s"],
  expertPlan: ["Zoom 2x no '?' norte (17,3). 0-1.2 s o plano sensato (etiqueta 'Your plan'); 1.2-1.9 s cortina da esquerda para a direita para o plano do perito (etiqueta 'Expert plan'): o mato a volta do '?' passa a terra nua. Aos 2.1 s, um anel laranja a volta dos corta-fogos, com 'Expert firebreaks'.", "night-sensible.mp4 e night-expert.mp4, fotograma de 1.0 s de cada (congelados)"],
  threePlans: ["Ecra dividido em 3 colunas sincronizadas: 'Doing nothing' | 'Your plan' | 'Expert plan', cada uma recortada a aldeia. Em cima, o painel de vento do jogo ampliado (muda de hora a hora) e 'Same real wind · ERA5 via Open-Meteo'; etiqueta '3× speed'. A noite do perito apaga-se aos 1.0 s: fotograma congelado com 'Fire out'. As outras ardem ate 6.2 s e ficam paradas. Aos 6.0 s, por baixo de cada coluna: 100/194 (fire station lost), 181/194, 194/194, 'houses saved'.", "night-nothing / night-sensible / night-expert.mp4, 12.5-31.1 s, a 3x"],
  villageSaved: ["Cartao do perito ampliado (placa): 'Village saved!', 3 estrelas, 194/194, 'Safe' e as barras. Sem a frase 'You matched the expert plan on this night!'.", "night-expert.mp4, cartao parado aos 18.5 s"],
  luck: ["Cartao desenhado em codigo: 'Over 120 replays of this night: whole village saved', 'every house and the fire station', e duas barras: Expert plan 68% (verde) e Doing nothing 10% (vermelho). O numero so aparece quando a barra chega ao fim.", "codigo (src/scenes/Cards.tsx Luck)"],
  proof: ["Cartao desenhado em codigo (src/data/proof.json): tres mapas 32x32 com o 'N' e uma seta para cima a esquerda. 'What really burned' (ICNF, vermelho; 'Official map (ICNF), only the part inside our map'), 'Our fire, real wind' (laranja, 0.65, seta 'wind from N') e 'Our fire, no wind' (laranja, 0.47); um ponto 'village' nos 3 mapas; o contorno creme da area oficial. Por baixo: 'cream line = official burned area' e 'tiles that burned in at least half of the runs'.", "codigo (src/scenes/Proof.tsx + src/data/proof.json)"],
  howBuilt: ["Tres setas, uma de cada vez: 'OpenStreetMap roads + buildings, Copernicus elevation' -> '3D village on 65 m tiles (Three.js, all in code)'; 'ERA5 hourly wind of that night (Open-Meteo)' -> 'fire rules, tested in Node'; 'Same seed = same night' -> 'your plan, doing nothing, expert plan'.", "codigo (src/scenes/Cards.tsx HowBuilt)"],
  terminal: ["Etiqueta 'Real output'. As duas janelas; aos 1-1.8 s zoom 2x no resumo do npm test (tests 251, pass 251, fail 0, a laranja); aos 3.2-4.1 s desce para a tabela do npm run validate inteira (real wind 0.65 e no wind 0.47 a laranja; 'Baseline B: circle, same area' 0.68 a cinzento).", "codigo (src/scenes/Terminal.tsx + src/data/terminal-*.txt)"],
  gallery: ["A galeria: quartel com carros, casas de azulejo, cafe, capela, escola, casa senhorial, arvores.", "gallery.mp4, 1.5-7.5 s, a 1.5x"],
  close: ["'Look around' da noite sem plano: mancha negra e aneis vermelhos (zoom 1.25 a volta do centro: sem HUD em cima nem botao em baixo); legendas em cima. Aos 9.6 s escurece e aparece o cartao final: 'Same Night', 'One real wildfire. Three plans.', 'Play the same night:', o link (73 px), 'For teens in villages next to forest, and their teachers.', 'Source: github.com/pdramos/genhacks-2026', 'Made by a 16-year-old in Portugal, learning to code with AI (Claude Code).' e a linha de dados/creditos.", "look-around.mp4, 1-17.4 s"],
};

// Onde comeca cada cena (os fades sobrepoem as cenas).
const FADE_AFTER = {
  coldOpen: FADES.coldOpenToTitle,
  teaser: FADES.teaserToBuild,
  luck: FADES.luckToProof,
  gallery: FADES.galleryToClose,
};

const mmss = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

let frame = 0;
const out = [];
out.push("# Storyboard do video v0 (Same Night)\n");
out.push("Gerado por `node scripts/storyboard.mjs` a partir de src/timeline.ts e src/narration.ts.");
out.push("Tempos no video final (min:seg). Sem voz: as legendas sao o rascunho da narracao.\n");
let n = 1;
for (const [key, seconds] of Object.entries(SCENE_SECONDS)) {
  const dur = Math.round(seconds * FPS);
  const start = frame / FPS;
  const end = (frame + dur) / FPS;
  const [what, src] = SCENES[key];
  out.push(`## ${n}. ${key} (${mmss(start)} - ${mmss(end)})\n`);
  out.push(`- **Imagem:** ${what}`);
  out.push(`- **Gravacao:** ${src}`);
  const lines = NARRATION[key] ?? [];
  if (lines.length === 0) out.push("- **Legenda:** (nenhuma)");
  for (const l of lines) {
    out.push(`- **Legenda ${mmss(start + l.from)} - ${mmss(start + l.to)}** (${l.pos ?? "bottom"}): "${l.text}"`);
  }
  out.push("");
  frame += dur - (FADE_AFTER[key] ?? 0);
  n++;
}
const words = Object.values(NARRATION).flat().reduce((sum, l) => sum + l.text.split(/\s+/).length, 0);
out.push(`**Duracao total:** ${mmss(frame / FPS)} (${frame} fotogramas a ${FPS} fps). **Palavras de narracao:** ${words}.`);
console.log(out.join("\n"));
