// Cores e letra do video. Sao as mesmas do jogo (cartoes cor de creme, castanho escuro, laranja).
import { loadFont } from "@remotion/google-fonts/Fredoka";

// Fredoka: a mesma letra do jogo (SIL Open Font License).
export const { fontFamily: FONT } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Letra de "terminal" para a saida real dos comandos (fontes do sistema, nada descarregado).
export const MONO = "Consolas, 'Cascadia Mono', 'Courier New', monospace";

export const COLORS = {
  night: "#15110e", // fundo escuro dos cartoes do video
  cream: "#fff4dc", // texto claro
  creamMuted: "#cbbba3", // texto secundario
  brown: "#3b2a1f", // bordas dos cartoes do jogo
  orange: "#f28c28", // destaque (como os botoes do jogo)
  fireRed: "#d9482b", // area ardida oficial
  fireOrange: "#f6a031", // area ardida pelo nosso fogo
  forest: "#2c3a28", // quadrado que nao ardeu
  captionBg: "rgba(22, 15, 10, 0.92)", // fundo das legendas
};
