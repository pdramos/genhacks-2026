// Gerador de números "aleatórios" com SEMENTE: a mesma semente dá sempre a mesma sequência.
// É isto que torna o jogo justo e testável: o mesmo plano com o mesmo vento dá sempre o mesmo fogo.
// Uso: const rand = createRandom(42); rand() -> número entre 0 (incluído) e 1 (excluído).
export function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
