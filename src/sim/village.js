// A "simulação" da vila: só regras e dados, sem nada de desenho (Phaser).
// Assim funciona igual no navegador e nos testes do Node.

// Cada letra do mapa do nível corresponde a um tipo de quadrado.
export const TILE_CODES = {
  G: 'grass',      // relva
  B: 'brush',      // mato
  E: 'eucalyptus', // eucalipto (em Portugal) / pinheiro (no Canadá)
  O: 'broadleaf',  // folhosa, por exemplo carvalho
  H: 'house',      // casa
  S: 'school',     // escola ou centro de saúde
  R: 'road',       // estrada
  W: 'water',      // água
  C: 'cleared',    // terreno limpo
  F: 'firebreak',  // corta-fogo
};

// Cria a vila a partir dos dados de um nível: { name, map: [20 linhas de letras] }.
// Se os dados estiverem errados, lança um erro que diz exatamente o que está mal.
export function createVillage(level) {
  if (!Array.isArray(level.map) || level.map.length === 0) {
    throw new Error(`Level "${level.name}": level has no map`);
  }
  const height = level.map.length;
  const width = level.map[0].length;

  const tiles = level.map.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Level "${level.name}": row ${y} has ${row.length} tiles, expected ${width}`);
    }
    // Transforma cada letra no nome do tipo de quadrado.
    return [...row].map((letter, x) => {
      const type = TILE_CODES[letter];
      if (!type) {
        throw new Error(`Level "${level.name}": unknown tile "${letter}" at column ${x}, row ${y}`);
      }
      return type;
    });
  });

  return { name: level.name, width, height, tiles };
}

// Diz que tipo de quadrado está na coluna x, linha y.
export function tileAt(village, x, y) {
  return village.tiles[y][x];
}
