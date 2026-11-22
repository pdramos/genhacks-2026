// AJUDAS DO MAPA: contas (sem Three.js) para o que se marca por cima da vila.
//   - lostHouses / describeLostHouses: que casas arderam e uma linha curta a dizer ONDE
//     (ex.: "Houses lost: 2 at the quinta in the forest"), para o cartão do fim;
//   - serraRoadSpots: um "?" no meio de cada estrada da serra, na fase de construção
//     (o cigarro vai cair perto de uma delas, mas o jogador não sabe qual).
// Não usa Three.js, por isso é testado no Node (tests/mapHints.test.js).
// Quem desenha os marcadores é o mapMarkers.js.

// As casas que arderam (ou ainda ardiam no fim): lista de [x, y].
// lastStep = o último snapshot do runDisaster ({ burned, burning }).
export function lostHouses(village, lastStep) {
  const caught = new Set([...lastStep.burned, ...lastStep.burning].map(([x, y]) => `${x},${y}`));
  const lost = [];
  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) {
      if (village.tiles[y][x] === 'house' && caught.has(`${x},${y}`)) lost.push([x, y]);
    }
  }
  return lost;
}

// A linha do cartão do fim. places = level.places: lista de
//   { name, x0, y0, x1, y1 } (um retângulo; name já traz a preposição: "at the quinta", "in Malveira").
// Cada casa conta no primeiro sítio que a contém; as outras contam como "elsewhere".
// Sem casas perdidas devolve '' (não há linha).
export function describeLostHouses(lost, places = []) {
  if (lost.length === 0) return '';
  if (places.length === 0) return `Houses lost: ${lost.length}`;
  const counts = new Map(); // nome do sítio -> quantas casas
  for (const [x, y] of lost) {
    const place = places.find((p) => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1);
    const name = place ? place.name : 'elsewhere';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  // Os sítios com nome vêm pela ordem do nível; "elsewhere" fica no fim.
  const order = [...places.map((p) => p.name), 'elsewhere'];
  const parts = order.filter((name) => counts.has(name)).map((name) => `${counts.get(name)} ${name}`);
  return `Houses lost: ${parts.join(' · ')}`;
}

// Onde pôr os "?" das estradas da serra: um quadrado no meio de cada estrada que fica a norte
// da estrada principal (a primeira linha que é TODA estrada, ex.: a EN247 em Sintra).
// Devolve [{x, y}, ...], uma por estrada, pela ordem em que aparecem (de cima, da esquerda).
// Sem estrada principal, devolve [] (não sabemos o que é "a serra").
export function serraRoadSpots(village) {
  const mainRow = village.tiles.findIndex((row) => row.every((type) => type === 'road'));
  if (mainRow <= 0) return [];
  const seen = new Set();
  const spots = [];
  for (let y = 0; y < mainRow; y++) {
    for (let x = 0; x < village.width; x++) {
      if (village.tiles[y][x] !== 'road' || seen.has(`${x},${y}`)) continue;
      const road = connectedRoad(village, x, y, mainRow, seen);
      // O quadrado do meio da estrada (ordenada de cima para baixo e da esquerda para a direita).
      road.sort((a, b) => a.y - b.y || a.x - b.x);
      spots.push(road[Math.floor(road.length / 2)]);
    }
  }
  return spots;
}

// Todos os quadrados de estrada ligados a (x, y) (para cima, baixo, esquerda, direita),
// sem passar para a estrada principal. Marca-os em "seen" para não os contar duas vezes.
function connectedRoad(village, startX, startY, mainRow, seen) {
  const road = [];
  const queue = [{ x: startX, y: startY }];
  seen.add(`${startX},${startY}`);
  while (queue.length > 0) {
    const tile = queue.pop();
    road.push(tile);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = tile.x + dx, y = tile.y + dy;
      if (x < 0 || y < 0 || x >= village.width || y >= mainRow) continue;
      if (village.tiles[y][x] !== 'road' || seen.has(`${x},${y}`)) continue;
      seen.add(`${x},${y}`);
      queue.push({ x, y });
    }
  }
  return road;
}
