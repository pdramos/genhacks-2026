// O caminho do carro na cena do cigarro: que quadrados de estrada o carro percorre.
// Não usa Three.js (é só uma lista de quadrados), por isso pode ser testado no Node.
//
// API:
//   findRoadPath(village, ignition, { maxReach }) -> { tiles: [{x, y}, ...], dropIndex } ou null
//     tiles     = os quadrados de estrada, POR ORDEM, do sítio onde o carro entra até onde sai.
//                 É um troço de estrada reto que passa ao lado da ignição.
//     dropIndex = posição em `tiles` do quadrado de estrada colado à ignição
//                 (é ali que a ponta de cigarro é atirada pela janela).
//     O carro anda no sentido em que a ignição lhe fica à ESQUERDA, do lado do condutor
//     (em Portugal e no Canadá conduz-se pela direita, com o condutor à esquerda).
import { tileAt } from '../sim/village.js';

const MAX_SEARCH = 2; // até que distância (em quadrados) procuramos uma estrada à volta da ignição

export function findRoadPath(village, ignition, { maxReach = 6 } = {}) {
  const road = nearestRoad(village, ignition);
  if (!road) return null;

  // De que lado da estrada está a ignição (ex.: {dx: 0, dy: -1} = a ignição fica a norte).
  const side = { dx: ignition.x - road.x, dy: ignition.y - road.y };
  const axis = chooseAxis(village, road, side, maxReach);

  // Percorremos a estrada de uma ponta à outra, na direção do eixo escolhido.
  let tiles = [];
  for (let i = -axis.back; i <= axis.forward; i++) {
    tiles.push({ x: road.x + axis.dx * i, y: road.y + axis.dy * i });
  }
  let dropIndex = axis.back;

  // A "esquerda" de quem anda na direção (dx, dy) é (dy, -dx) na grelha
  // (ex.: quem vai para leste tem o norte à esquerda). Se a ignição ficar à direita, invertemos.
  const leftness = side.dx * axis.dy + side.dy * -axis.dx;
  if (leftness < 0) {
    tiles = tiles.reverse();
    dropIndex = tiles.length - 1 - dropIndex;
  }
  return { tiles, dropIndex };
}

// Escolhe o eixo da estrada (horizontal ou vertical) por onde o carro vai passar.
// Normalmente a estrada corre "ao comprido" ao lado da ignição (perpendicular ao lado onde ela está).
// Se nessa direção a estrada for só um quadrado (a estrada vem de frente), usa a outra direção.
function chooseAxis(village, road, side, maxReach) {
  const horizontal = measureRun(village, road, 1, 0, maxReach);
  const vertical = measureRun(village, road, 0, 1, maxReach);
  const ignitionIsBeside = Math.abs(side.dx) >= Math.abs(side.dy); // a ignição está a leste ou oeste
  const preferred = ignitionIsBeside ? vertical : horizontal;
  const other = ignitionIsBeside ? horizontal : vertical;
  if (preferred.length >= 2 || other.length <= preferred.length) return preferred;
  return other;
}

// Mede quantos quadrados de estrada seguidos há para trás e para a frente de `road`.
function measureRun(village, road, dx, dy, maxReach) {
  const back = countRoad(village, road, -dx, -dy, maxReach);
  const forward = countRoad(village, road, dx, dy, maxReach);
  return { dx, dy, back, forward, length: back + forward + 1 };
}

// Conta os quadrados de estrada seguidos a partir de `road` (sem o contar), até `maxReach`.
function countRoad(village, road, dx, dy, maxReach) {
  let count = 0;
  while (count < maxReach && isRoad(village, road.x + dx * (count + 1), road.y + dy * (count + 1))) {
    count++;
  }
  return count;
}

// A estrada mais perto da ignição: primeiro as 4 vizinhas, depois até MAX_SEARCH quadrados.
function nearestRoad(village, ignition) {
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    if (isRoad(village, ignition.x + dx, ignition.y + dy)) return { x: ignition.x + dx, y: ignition.y + dy };
  }
  let best = null;
  let bestDistance = Infinity;
  for (let dy = -MAX_SEARCH; dy <= MAX_SEARCH; dy++) {
    for (let dx = -MAX_SEARCH; dx <= MAX_SEARCH; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance && isRoad(village, ignition.x + dx, ignition.y + dy)) {
        best = { x: ignition.x + dx, y: ignition.y + dy };
        bestDistance = distance;
      }
    }
  }
  return best;
}

function isRoad(village, x, y) {
  const inside = x >= 0 && y >= 0 && x < village.width && y < village.height;
  return inside && tileAt(village, x, y) === 'road';
}
