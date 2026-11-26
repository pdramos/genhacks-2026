// A ordem e a duracao de cada cena do video, em segundos.
// Para encurtar ou alongar uma cena, muda o numero aqui: as cenas seguintes andam sozinhas
// (o TransitionSeries em SameNight.tsx poe-nas umas atras das outras).
// Se mudares uma duracao, confirma no Studio que o clip da cena ainda chega ao fim
// (cada cena diz no topo do seu codigo quantos segundos de gravacao usa) e corre
// node scripts/check-captions.mjs (as legendas tem de caber na cena).

export const FPS = 30;

export const SCENE_SECONDS = {
  coldOpen: 10.6, // o fogo da noite sem plano a passar pela aldeia
  title: 11.5, // "Same Night" sobre a aldeia de dia: o que e e para quem
  proofMini: 6.2, // mini-cartao de prova: o mapa oficial ao lado do nosso fogo, 0.65
  teaser: 7, // as tres barras do cartao do jogo (181 / 100 / 194)
  build: 16.4, // preparar: a lei, os "?", o vento; 4 x Clear brush e 1 Firebreak
  planReady: 2.5, // o plano sensato pronto e o clique em "Start disaster"
  cigarette: 4.5, // o cigarro (Dramatization)
  fire: 8.3, // o fogo do plano sensato, acelerado
  result: 9.4, // o cartao do plano sensato: 2 estrelas, a licao, "Try again"
  expertPlan: 6.2, // cortina do plano sensato para o do perito, no "?" norte
  threePlans: 8.2, // ecra dividido: tres noites lado a lado, ao mesmo segundo
  villageSaved: 4.6, // o cartao do perito: "Village saved!" e 194/194
  luck: 10.4, // 120 noites: o perito salva a aldeia toda em 68%, nada fazer em 10%
  proof: 20.4, // o mapa oficial contra o nosso fogo (com e sem vento) e o circulo
  howBuilt: 6.6, // como foi feito: dados reais -> regras testadas -> mesma noite
  terminal: 6.6, // saida real de npm test e npm run validate
  gallery: 4, // a galeria: cada peca 3D feita em codigo
  close: 15.8, // "Look around" e o cartao final
};

// Passagens suaves (fade) entre algumas cenas, em fotogramas.
// Cada fade sobrepoe as duas cenas, por isso encurta o video total.
export const FADES = {
  coldOpenToTitle: 12,
  teaserToBuild: 10,
  luckToProof: 12,
  galleryToClose: 12,
};

export const totalFrames = (fps: number): number => {
  const scenes = Object.values(SCENE_SECONDS).reduce(
    (sum, s) => sum + Math.round(s * fps),
    0,
  );
  const fades = Object.values(FADES).reduce((sum, f) => sum + f, 0);
  return scenes - fades;
};
