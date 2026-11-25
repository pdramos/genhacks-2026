// A ignição escondida: o jogador não sabe onde o cigarro vai cair.
// O nível traz vários "candidatos" (quadrados de mato colados a uma estrada) e a SEMENTE
// do jogo escolhe um deles. A mesma semente escolhe sempre o mesmo, por isso o
// "Try again (same night)" repete exatamente o mesmo fogo.
import { createRandom } from './random.js';
import { FLAMMABILITY } from './fire.js';
import { CIGARETTE_MIN_FLAMMABILITY } from './balance.js';

// Um número fixo que se junta à semente antes de sortear.
// Porquê? Quando o fogo também usava createRandom(seed), o sal evitava que o primeiro número do
// fogo fosse o mesmo que escolheu a ignição. Hoje o fogo usa outros dados (tileRandom), mas o sal
// fica: tirá-lo mudava o "?" que cada semente escolhe e, com isso, os números de equilíbrio publicados.
const IGNITION_SALT = 7919;

// Escolhe onde começa o fogo. Devolve { x, y }.
//   level.ignitionCandidates = lista de { x, y } (opcional)
//   level.ignition           = o quadrado de sempre, usado se não houver candidatos
export function pickIgnition(level, seed) {
  const candidates = level.ignitionCandidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { x: level.ignition.x, y: level.ignition.y };
  }
  const rand = createRandom(seed + IGNITION_SALT);
  // rand() dá um número entre 0 e 1 (sem chegar a 1); vezes o número de candidatos,
  // e arredondado para baixo, dá uma posição válida da lista: 0, 1, 2, ...
  const index = Math.floor(rand() * candidates.length);
  const chosen = candidates[index];
  return { x: chosen.x, y: chosen.y }; // uma cópia, para ninguém estragar o nível sem querer
}

// Até quantos quadrados de distância procuramos algo que arda, à volta do candidato.
// (Distância como o rei no xadrez: 1 = os 8 vizinhos; 2 = o anel seguinte, 16 quadrados.)
export const IGNITION_SEARCH_RADIUS = 2;

// "Este quadrado pode pegar fogo?" (inflamabilidade maior do que 0: não é corta-fogo,
// estrada nem água). É a mesma regra que o runDisaster usa para começar o fogo.
export function canIgnite(village, x, y) {
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return false;
  return (FLAMMABILITY[village.tiles[y][x]] ?? 0) > 0;
}

// "Uma ponta de cigarro acende este quadrado?" Precisa de combustível seco a sério: erva,
// mato, árvores (inflamabilidade de pelo menos CIGARETTE_MIN_FLAMMABILITY, em balance.js).
// Terra limpa ("cleared", 0.15) ainda pode arder quando o fogo chega, mas um cigarro não a acende.
export function catchesCigarette(village, x, y) {
  if (x < 0 || y < 0 || x >= village.width || y >= village.height) return false;
  return (FLAMMABILITY[village.tiles[y][x]] ?? 0) >= CIGARETTE_MIN_FLAMMABILITY;
}

// Onde começa MESMO o fogo, já com o plano do jogador feito.
// O cigarro cai no candidato que a semente escolheu (pickIgnition). Se o jogador lá pôs um
// corta-fogo, ou limpou o mato, o cigarro não se apaga por magia: rola para o lado
// e o fogo começa no primeiro quadrado com combustível seco à volta, primeiro nos 8 vizinhos
// e depois no anel seguinte.
// A ordem é fixa (linha a linha, de cima para baixo e da esquerda para a direita), por isso
// a mesma vila e a mesma semente dão sempre o mesmo quadrado.
// Atenção: esta ordem NÃO olha para o vento. Começa a norte (de onde vem o vento naquela noite),
// por isso é uma simplificação, declarada nas Limitations do README. Parte da vantagem do
// plano do perito depende dela (com a ordem ao contrário, as noites com 3 estrelas do perito
// caem muito), por isso mudá-la mudava todos os números publicados.
// Porquê? Sem isto, um corta-fogo em cada candidato (€3.390) dava 3 estrelas em todas as noites.
// E na ronda "salvar todas as casas": limpar o mato em volta de cada "?" fazia o fogo morrer
// logo ao nascer (terra limpa arde mal), por isso valia mais do que defender a vila. Agora
// limpar o "?" só muda o sítio onde o fogo começa: o que salva as casas é a defesa da vila.
// Se não houver combustível seco por perto, aceita o primeiro quadrado que arda (ex.: terra
// limpa); se nada arder, devolve o candidato (e o fogo não começa).
export function resolveIgnition(village, level, seed) {
  const picked = pickIgnition(level, seed);
  return nearest(picked, (x, y) => catchesCigarette(village, x, y))
    ?? nearest(picked, (x, y) => canIgnite(village, x, y))
    ?? picked;
}

// O primeiro quadrado (o próprio, depois o anel 1, depois o anel 2) onde fits(x, y) é verdade,
// ou null se não houver nenhum.
function nearest(picked, fits) {
  if (fits(picked.x, picked.y)) return picked;
  for (let radius = 1; radius <= IGNITION_SEARCH_RADIUS; radius++) {
    for (let y = picked.y - radius; y <= picked.y + radius; y++) {
      for (let x = picked.x - radius; x <= picked.x + radius; x++) {
        // Só o "anel" desta distância (os de dentro já foram vistos na volta anterior).
        const ring = Math.max(Math.abs(x - picked.x), Math.abs(y - picked.y));
        if (ring === radius && fits(x, y)) return { x, y };
      }
    }
  }
  return null;
}
