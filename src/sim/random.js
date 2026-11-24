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

// "Dados por quadrado": um número entre 0 (incluído) e 1 (excluído) que depende SÓ da semente
// e dos números que lhe damos (por exemplo: o passo, a posição do quadrado e a direção).
// Diferença para createRandom: createRandom é uma FILA de números (cada rand() gasta o próximo),
// por isso, se um quadrado mudar, todos os sorteios a seguir mudam e a noite inteira fica
// baralhada. Aqui cada pergunta ("este quadrado pega fogo ao vizinho a sul no passo 7?") tem
// o seu próprio dado, sempre igual. Mudar um quadrado só muda o que esse quadrado toca.
// Uso: tileRandom(seed, 7, 12, 3) -> sempre o mesmo número para (semente, 7, 12, 3).
// Os números têm de ser inteiros (podem ser negativos). Como funciona: mistura cada número
// com multiplicações e trocas de bits (a ideia do "MurmurHash3"), até não sobrar padrão.
export function tileRandom(seed, ...numbers) {
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ 0x2545f491;
  for (const n of numbers) {
    let k = Math.imul(n | 0, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    h ^= Math.imul(k, 0x1b873593);
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  // A mistura final: espalha os bits, para números de entrada parecidos (7 e 8)
  // darem resultados que não se parecem nada.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
