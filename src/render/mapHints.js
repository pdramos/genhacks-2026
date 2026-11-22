// AJUDAS DO MAPA: contas (sem Three.js) para o que se marca por cima da vila.
//   - lostHouses / describeLostHouses: que casas arderam e uma linha curta a dizer ONDE
//     (ex.: "Houses lost: 2 at the quinta in the forest"), para o cartão do fim;
//   - ignitionSpots: um "?" em cada sítio onde o cigarro PODE cair, na fase de construção
//     (o fogo começa num deles, mas o jogador não sabe qual).
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

// Onde pôr os "?": cada sítio onde o cigarro PODE cair (level.ignitionCandidates).
// São os sítios VERDADEIROS (antes punha-se um "?" no meio de cada estrada, que não era onde o
// fogo começava, e só quem lia o ficheiro do nível sabia onde valia a pena limpar).
// Devolve [{x, y}, ...] (cópias). Com um só sítio (ou nenhum) não há mistério: devolve [].
export function ignitionSpots(level) {
  const candidates = level.ignitionCandidates ?? [];
  if (candidates.length <= 1) return [];
  return candidates.map(({ x, y }) => ({ x, y }));
}
