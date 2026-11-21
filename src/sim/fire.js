// O incêndio: regras de como o fogo passa de um quadrado para os vizinhos.
// Só regras e números, sem desenho. A interface (src/render) apenas "reproduz" o resultado.
import { createRandom } from './random.js';

// Facilidade com que cada tipo de quadrado pega fogo (0 = nunca, 1 = muito fácil).
export const FLAMMABILITY = {
  eucalyptus: 0.9,
  brush: 0.8,
  grass: 0.5,
  house: 0.4,
  school: 0.4,
  broadleaf: 0.3,
  cleared: 0.15,
  firebreak: 0,
  road: 0,
  water: 0,
};

// Quanto o vento conta (k): com vento de 30 km/h, o fogo a favor do vento fica 2.5 vezes
// mais provável e contra o vento quase não avança. Afinado a jogar.
export const DEFAULT_K = 0.05;

// Probabilidade (0 a 1) de um quadrado a arder pegar fogo ao vizinho do tipo targetType,
// durante todo o tempo em que arde (em cada passo usa-se chancePerStep, mais abaixo).
// (dx, dy) = direção do quadrado a arder até ao vizinho (um dos 8 vizinhos).
// wind = { direction, speed }: de onde o vento vem (graus) e a força (km/h).
// k = quanto o vento conta (se faltar, usa DEFAULT_K).
// heightDiff = altura do vizinho menos altura do quadrado a arder (níveis 0-9 do mapa):
//   positivo = o vizinho fica acima (o fogo sobe), negativo = fica abaixo (o fogo desce).
export function ignitionProbability(targetType, dx, dy, wind, k = DEFAULT_K, heightDiff = 0) {
  const flammability = FLAMMABILITY[targetType] ?? 0;

  // Para onde o vento empurra o fogo (downwind), na grelha (y cresce para sul).
  // O vento VEM de "direction", por isso vai para o lado contrário.
  const radians = (wind.direction * Math.PI) / 180;
  const downX = -Math.sin(radians);
  const downY = Math.cos(radians);

  // cos do ângulo entre a direção do vizinho e o downwind:
  //  1 = o vizinho está mesmo a favor do vento, -1 = mesmo contra o vento, 0 = de lado.
  const length = Math.hypot(dx, dy);
  const cosAngle = (dx * downX + dy * downY) / length;

  // Fator do vento: a favor do vento aumenta, contra o vento diminui (mas nunca abaixo de 0.1).
  const windFactor = Math.max(0.1, 1 + k * wind.speed * cosAngle);

  // Os vizinhos na diagonal estão mais longe (cerca de 1.4 quadrados), por isso
  // têm menos probabilidade. Assim o fogo não fica com forma de quadrado.
  const distanceFactor = dx !== 0 && dy !== 0 ? DIAGONAL_FACTOR : 1;

  return clamp(flammability * windFactor * distanceFactor * slopeFactor(heightDiff, length), 0, 1);
}

// Declive: as chamas inclinam-se para cima e aquecem o mato que está mais acima,
// por isso o fogo SOBE uma encosta mais depressa e DESCE mais devagar.
// Por cada nível de altura que o vizinho está acima (por quadrado de distância),
// a probabilidade é multiplicada por SLOPE_BASE; por cada nível abaixo, é dividida.
// Exemplos com 1.3: +1 nível -> x1.3, +2 -> x1.69, -1 -> x0.77, -2 -> x0.59.
export const SLOPE_BASE = 1.3;

// O fator do declive. distance = 1 para os vizinhos ao lado, cerca de 1.4 na diagonal.
export function slopeFactor(heightDiff, distance = 1) {
  return Math.pow(SLOPE_BASE, heightDiff / distance);
}

// Quanto conta um vizinho na diagonal, comparado com um vizinho ao lado.
// Afinado com testes: com 0.55, um fogo sem vento cresce redondo (nem quadrado, nem losango).
// (Com 1, o fogo ficava um quadrado; com 0, ficava um losango.)
export const DIAGONAL_FACTOR = 0.55;

// A probabilidade de ignitionProbability vale para TODO o tempo em que o quadrado arde.
// Um eucalipto que arde 4 passos não tem 4 hipóteses grandes: tem 4 hipóteses pequenas
// que, juntas, dão a mesma probabilidade. Isto faz o fogo avançar aos poucos, de forma
// irregular, em vez de "saltar" sempre 1 quadrado por passo como num tabuleiro.
// Conta: falhar em todos os passos = (1 - chancePorPasso) ^ passos = 1 - wholeChance.
export function chancePerStep(wholeChance, totalSteps) {
  return 1 - Math.pow(1 - wholeChance, 1 / totalSteps);
}

// Quantos passos (de 10 minutos) cada tipo fica a arder antes de ficar queimado.
// As árvores ardem mais tempo do que a relva.
export const BURN_STEPS = {
  eucalyptus: 4,
  broadleaf: 4,
  house: 3,
  school: 3,
  brush: 2,
  grass: 1,
  cleared: 1,
};


// Os 8 vizinhos de um quadrado: (dx, dy) a partir do quadrado do meio.
const NEIGHBOURS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], /* meio */ [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Corre o incêndio do início ao fim e devolve todos os passos (snapshots) e o resultado.
// - village: a vila (não é alterada!)
// - ignition: { x, y } onde o fogo começa
// - wind: { direction, speed } fixo, OU uma função (stepIndex) => { direction, speed }
//         para o vento mudar com o tempo (stepIndex 0 = primeiros 10 minutos)
// - seed: semente do acaso (o mesmo seed dá sempre o mesmo fogo)
// - k: quanto o vento conta; maxSteps: número máximo de passos (144 passos = 24 horas)
export function runDisaster(village, { ignition, wind, seed = 1, k = DEFAULT_K, maxSteps = 144 }) {
  const windAt = typeof wind === 'function' ? wind : () => wind;

  // Estado do fogo, guardado à parte para não mexer em village.tiles.
  // burning: "x,y" -> { stepsLeft, totalSteps } (quanto falta arder e quanto arde ao todo).
  // burned: conjunto de "x,y" que já arderam.
  const fire = { village, k, rand: createRandom(seed), burning: new Map(), burned: new Set() };

  // O fogo só começa se o quadrado da ignição puder arder.
  // Um corta-fogo, estrada ou água na ignição = o fogo nunca começa.
  if (canBurn(village, ignition.x, ignition.y)) startFire(fire, key(ignition.x, ignition.y));

  const steps = [snapshot(0, fire)];

  for (let step = 1; step <= maxSteps && fire.burning.size > 0; step++) {
    const currentWind = windAt(step - 1);
    const newFires = spreadToNeighbours(fire, currentWind); // 1) o fogo passa aos vizinhos
    burnOneStep(fire);                                       // 2) quem arde gasta um passo
    for (const tileKey of newFires) startFire(fire, tileKey); // 3) os fogos novos começam
    steps.push(snapshot(step, fire));
  }

  return { steps, outcome: countOutcome(village, fire.burning, fire.burned, steps.length - 1) };
}

// Um quadrado pode arder se o tipo dele tiver inflamabilidade maior do que 0.
function canBurn(village, x, y) {
  return (FLAMMABILITY[village.tiles[y][x]] ?? 0) > 0;
}

// Passo 1: cada quadrado a arder pode pegar fogo a cada um dos 8 vizinhos.
// Devolve a lista de "x,y" que vão começar a arder.
function spreadToNeighbours(fire, wind) {
  const { village, burning, burned, rand, k } = fire;
  const newFires = [];
  for (const [tileKey, { totalSteps }] of burning) {
    const [x, y] = fromKey(tileKey);
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx, ny = y + dy;
      if (!isInside(village, nx, ny)) continue;
      const neighbourKey = key(nx, ny);
      if (burning.has(neighbourKey) || burned.has(neighbourKey)) continue;
      const heightDiff = heightOf(village, nx, ny) - heightOf(village, x, y);
      const wholeChance = ignitionProbability(village.tiles[ny][nx], dx, dy, wind, k, heightDiff);
      if (rand() < chancePerStep(wholeChance, totalSteps)) newFires.push(neighbourKey);
    }
  }
  return newFires;
}

// Passo 2: os que estão a arder gastam um passo; quando chegam a 0 ficam queimados.
function burnOneStep(fire) {
  for (const [tileKey, tile] of fire.burning) {
    if (tile.stepsLeft <= 1) {
      fire.burning.delete(tileKey);
      fire.burned.add(tileKey);
    } else {
      tile.stepsLeft--;
    }
  }
}

// Passo 3: um quadrado começa a arder (se ainda não estiver a arder).
// Dois vizinhos podem acender o mesmo quadrado no mesmo passo: só conta uma vez.
function startFire(fire, tileKey) {
  if (fire.burning.has(tileKey)) return;
  const [x, y] = fromKey(tileKey);
  const totalSteps = burnSteps(fire.village, x, y, fire.rand);
  fire.burning.set(tileKey, { stepsLeft: totalSteps, totalSteps });
}

// O quadrado (x, y) está dentro do mapa?
function isInside(village, x, y) {
  return x >= 0 && y >= 0 && x < village.width && y < village.height;
}

// O resultado final. Um quadrado que ainda arde no fim também conta como perdido.
// schoolSaved = nenhum quadrado de escola pegou fogo.
function countOutcome(village, burning, burned, stepCount) {
  let housesTotal = 0, housesSaved = 0, schoolSaved = true;
  for (let y = 0; y < village.height; y++) {
    for (let x = 0; x < village.width; x++) {
      const type = village.tiles[y][x];
      const caughtFire = burning.has(key(x, y)) || burned.has(key(x, y));
      if (type === 'house') {
        housesTotal++;
        if (!caughtFire) housesSaved++;
      }
      if (type === 'school' && caughtFire) schoolSaved = false;
    }
  }
  return { housesTotal, housesSaved, schoolSaved, burnedCount: burned.size + burning.size, stepCount };
}

// "x,y" <-> [x, y]: uma forma simples de guardar quadrados num Map ou Set.
function key(x, y) {
  return `${x},${y}`;
}
function fromKey(tileKey) {
  return tileKey.split(',').map(Number);
}

// A altura (0-9) de um quadrado. Uma vila sem "heights" é plana (altura 0).
function heightOf(village, x, y) {
  return village.heights?.[y]?.[x] ?? 0;
}

// Quantos passos um quadrado vai arder: o valor de BURN_STEPS, com um pouco de acaso
// (1 passo a menos, igual, ou 1 passo a mais; nunca menos de 1).
// Assim a frente do fogo fica irregular, como num incêndio verdadeiro.
function burnSteps(village, x, y, rand) {
  const base = BURN_STEPS[village.tiles[y][x]] ?? 1;
  const change = Math.floor(rand() * 3) - 1; // -1, 0 ou +1
  return Math.max(1, base + change);
}

// Uma "fotografia" do fogo num passo: listas de [x, y].
function snapshot(step, fire) {
  return {
    step,
    burning: [...fire.burning.keys()].map(fromKey),
    burned: [...fire.burned].map(fromKey),
  };
}

// Prende um número entre min e max.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
