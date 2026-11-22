// A SEMENTE de cada jogo e o "Try again (same night)".
// A semente fixa o acaso do fogo (e onde cai o cigarro): mesma semente + mesmo plano = mesmo fogo.
//   - Cada jogo novo sorteia uma semente nova (aqui, na interface, com Math.random).
//   - "Try again (same night)" guarda a semente e o plano do jogador e recomeça com os dois.
// A simulação nunca chama Math.random: recebe sempre a semente.
// Não usa Three.js nem o navegador, por isso é testado no Node (tests/runState.test.js).

// Uma semente nova: um número inteiro de 1 a 2147483646.
// random é uma função que dá números de 0 a 1 (nos testes, podemos passar uma fixa).
export function newSeed(random = Math.random) {
  return 1 + Math.floor(random() * 2147483646);
}

// As mudanças da fase de construção ("x,y" -> { actionName, ... }) como uma lista simples
// de ações, de cima para baixo e da esquerda para a direita: [{ x, y, actionName }, ...].
export function planFromChanges(changes) {
  const plan = Object.entries(changes).map(([key, change]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, actionName: change.actionName };
  });
  return plan.sort((a, b) => a.y - b.y || a.x - b.x);
}

// Transforma "nível + semente + plano" em texto, para guardar enquanto a página recarrega.
export function saveRetry(levelName, seed, plan) {
  return JSON.stringify({ level: levelName, seed, plan });
}

// O contrário de saveRetry. Devolve { seed, plan }, ou null se o texto não existir,
// estiver estragado ou for de outro nível.
export function loadRetry(text, levelName) {
  if (!text) return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || data.level !== levelName || !Number.isInteger(data.seed) || !Array.isArray(data.plan)) return null;
  return { seed: data.seed, plan: data.plan };
}
