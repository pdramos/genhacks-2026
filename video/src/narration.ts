// O RASCUNHO DA NARRACAO: cada frase que aparece como legenda, cena a cena.
// "from" e "to" sao segundos DENTRO da cena (0 = o inicio da cena).
// "pos" diz onde fica a legenda: "bottom" (em baixo), "top" (em cima) ou "bar" (na barra preta
// de cinema, so na cena do cigarro). Escolhemos a posicao para nao tapar o que importa.
// "instant": a legenda ja esta no ecra no primeiro fotograma (so na abertura).
//
// Regras:
// - Ingles simples, frases curtas, no maximo 2 linhas.
// - Ritmo: no maximo 2,5 palavras por segundo, mais 0,5 s de margem
//   (16 palavras pedem ~7 s). Confirma com: node scripts/check-captions.mjs
// - So numeros que estao na pagina (docs/devpost.md) ou no ecra do jogo.
// - Dizer "same night" (a palavra do jogo), nunca "exact same fire".
// Quando gravares a tua voz, le estas frases e acerta "from"/"to" ao que disseste.

export type Line = {
  from: number;
  to: number;
  text: string;
  pos?: "bottom" | "top" | "bar";
  instant?: boolean;
};

export const NARRATION: Record<string, Line[]> = {
  coldOpen: [
    {
      from: 0,
      to: 6.1,
      text: "October 2018. A real wildfire came down these hills, past this village, near Lisbon.",
      instant: true,
    },
    { from: 6.2, to: 10.3, text: "347 people had to be evacuated. No one died." },
  ],
  title: [
    {
      from: 0.5,
      to: 6.6,
      text: "Same Night is a free 3D game for teens in villages next to forests.",
    },
    {
      from: 6.8,
      to: 11.3,
      text: "You prepare this real village for that night's real wind.",
    },
  ],
  proofMini: [
    {
      from: 0.3,
      to: 6.0,
      text: "Checked against the official burn map: 0.65 overlap (1 = a perfect match).",
    },
  ],
  teaser: [
    {
      from: 0.3,
      to: 6.8,
      text: "Then you see your plan, no plan and an expert plan, on the same night.",
    },
  ],
  build: [
    {
      from: 0.3,
      to: 4.8,
      text: "By law, you may only work on the glowing strips.",
      pos: "top",
    },
    {
      from: 5.0,
      to: 8.7,
      text: "Each ? is where a cigarette could land.",
      pos: "top",
    },
    {
      from: 8.9,
      to: 16.2,
      text: "The wind came from the north, so you clear brush between the ? spots and the houses.",
      pos: "top",
    },
  ],
  planReady: [{ from: 0, to: 2.5, text: "Plan ready. Now, the night.", pos: "top" }],
  cigarette: [
    {
      from: 0,
      to: 4.5,
      text: "A cigarette from a passing car lands in dry scrub.",
      pos: "bar",
    },
  ],
  fire: [
    {
      from: 0.2,
      to: 4.7,
      text: "That night's real wind drives the fire toward the houses.",
    },
    { from: 4.9, to: 8.2, text: "This time, most of the village holds." },
  ],
  result: [
    { from: 0.1, to: 3.4, text: "Two stars. The fire station is safe.", pos: "top" },
    { from: 3.6, to: 6.9, text: "The expert plan saved 13 more houses.", pos: "top" },
    { from: 7.1, to: 9.3, text: "Try again, same night.", pos: "top" },
  ],
  expertPlan: [
    {
      from: 0.2,
      to: 5.9,
      text: "Same wind, same cigarette. But the expert cut firebreaks right where it lands.",
      pos: "top",
    },
  ],
  threePlans: [{ from: 0.3, to: 2.6, text: "Same night, three plans." }],
  villageSaved: [
    {
      from: 0.2,
      to: 4.4,
      text: "On this night, the expert plan saves every house.",
      pos: "top",
    },
  ],
  luck: [
    { from: 0.2, to: 2.7, text: "One night can be luck." },
    {
      from: 2.9,
      to: 10.2,
      text: "Over 120 replays, the expert plan saves the whole village 68% of the time. Doing nothing: 10%.",
    },
  ],
  proof: [
    {
      from: 0.3,
      to: 6.4,
      text: "We ran our fire 1,000 times from near the real start, with no player.",
    },
    {
      from: 6.6,
      to: 12.3,
      text: "With that night's real wind, the overlap is 0.65. With no wind, 0.47.",
    },
    {
      from: 12.5,
      to: 20.2,
      text: "A plain circle of the right size scores 0.68. So we claim the direction, not the exact shape.",
    },
  ],
  howBuilt: [{ from: 0.3, to: 4.0, text: "Real data in. Game rules tested in code." }],
  terminal: [
    {
      from: 0.3,
      to: 4.4,
      text: "These numbers come from two commands anyone can rerun.",
    },
  ],
  gallery: [{ from: 0.2, to: 3.9, text: "Every 3D piece is built in code." }],
  close: [
    {
      from: 0.2,
      to: 5.9,
      text: "Same night, no plan: 100 of 194 houses saved, the fire station lost.",
      pos: "top",
    },
    { from: 6.1, to: 9.4, text: "Each red ring is a house lost.", pos: "top" },
  ],
};
