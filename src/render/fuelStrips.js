// As FAIXAS DE GESTÃO DE COMBUSTÍVEL, vistas na fase de construção.
// A lei portuguesa (DL 82/2021) manda limpar o mato em faixas à volta das casas e das estradas;
// o resto é Parque Natural e o jogo fecha-o (escolha do jogo, não da lei). A REGRA (que quadrados são trabalháveis) vive na simulação
// (isWorkable em src/sim/actions.js). Aqui só fazemos as contas para o DESENHO:
//   - que quadrados pintar com um tom suave (faixa) e quais levam cadeado (parque);
//   - por onde passa o contorno entre os dois;
//   - o texto "steep +30%" quando o declive torna a ação mais cara;
//   - que quadrados brilham com a ferramenta escolhida (onde ela pode ser usada agora).
// Não usa Three.js, por isso é testado no Node (tests/fuelStrips.test.js).

// Os tipos onde faz sentido trabalhar (vegetação, incluindo o que o jogador já mudou).
// Casas, escola, estradas e água não levam tom nem cadeado: não há mato para limpar ali.
const WORK_GROUND = new Set(['grass', 'brush', 'eucalyptus', 'broadleaf', 'cleared', 'firebreak']);

// Devolve uma grelha map[y][x] com:
//   'strip'  = vegetação numa faixa trabalhável (pode-se limpar);
//   'locked' = vegetação no Parque Natural (cadeado);
//   null     = casa, escola, estrada ou água.
// isWorkable(village, x, y) é a regra da simulação.
export function stripMap(village, isWorkable) {
  const map = [];
  for (let y = 0; y < village.height; y++) {
    const row = [];
    for (let x = 0; x < village.width; x++) {
      if (!WORK_GROUND.has(village.tiles[y][x])) row.push(null);
      else row.push(isWorkable(village, x, y) ? 'strip' : 'locked');
    }
    map.push(row);
  }
  return map;
}

// O contorno das faixas: os lados de quadrado que separam uma faixa ('strip') de um quadrado
// com cadeado ('locked'). Cada lado é { from: {x, y}, to: {x, y} } em coordenadas da grelha,
// onde o quadrado (x, y) vai de x-0.5 a x+0.5 (e o mesmo para y): os lados ficam nos .5.
export function stripEdges(map) {
  const edges = [];
  const isBorder = (a, b) => (a === 'strip' && b === 'locked') || (a === 'locked' && b === 'strip');
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      // Vizinho a leste: o lado entre eles é uma linha vertical em x + 0.5.
      if (x + 1 < map[y].length && isBorder(map[y][x], map[y][x + 1])) {
        edges.push({ from: { x: x + 0.5, y: y - 0.5 }, to: { x: x + 0.5, y: y + 0.5 } });
      }
      // Vizinho a sul: o lado é uma linha horizontal em y + 0.5.
      if (y + 1 < map.length && isBorder(map[y][x], map[y + 1][x])) {
        edges.push({ from: { x: x - 0.5, y: y + 0.5 }, to: { x: x + 0.5, y: y + 0.5 } });
      }
    }
  }
  return edges;
}

// "steep +30%" se o custo com declive (cost) for maior do que o preço base; senão, nada.
// Arredonda para cima, para nunca dizer "+0%" quando custa mais.
export function slopeNote(baseCost, cost) {
  if (cost <= baseCost) return '';
  return `steep +${Math.ceil(((cost - baseCost) / baseCost) * 100)}%`;
}

// Os quadrados onde a ferramenta escolhida pode ser usada AGORA (para os fazer brilhar).
// check(x, y) é a verificação da simulação (checkAction com a ferramenta): diz { ok } ou { ok, reason }.
// Devolve { tiles, noMoney }:
//   tiles   = lista de {x, y} onde a ação dá;
//   noMoney = quantos quadrados só falham por falta de dinheiro (para explicar porque não há nenhum).
export function usableTiles(width, height, check) {
  const tiles = [];
  let noMoney = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const result = check(x, y);
      if (result.ok) tiles.push({ x, y });
      else if (result.reason === 'not-enough-money') noMoney++;
    }
  }
  return { tiles, noMoney };
}
