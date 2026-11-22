// O incêndio: regras de como o fogo passa de um quadrado para os vizinhos.
// Só regras e números, sem desenho. A interface (src/render) apenas "reproduz" o resultado.
// As regras: inflamabilidade de cada tipo, vento (a favor = mais depressa), declive
// (a subir = mais depressa), brasas que saltam 2-3 quadrados com vento forte, e cada
// quadrado arde um número de passos com um pouco de acaso.
import { createRandom } from './random.js';

// Facilidade com que cada tipo de quadrado pega fogo (0 = nunca, 1 = muito fácil).
export const FLAMMABILITY = {
  eucalyptus: 0.9,
  brush: 0.8,
  grass: 0.5,
  house: 0.5, // era 0.4; subiu no equilíbrio (tests/balance.test.js): o fogo que entra
  school: 0.5, // na vila tem de conseguir passar de casa em casa
  broadleaf: 0.3,
  cleared: 0.15,
  firebreak: 0,
  road: 0,
  water: 0,
};

// Quanto o vento conta (k): com vento de 30 km/h, o fogo a favor do vento fica 2.5 vezes
// mais provável, e de lado (flancos) ou contra o vento fica ~6 vezes mais lento do que
// na cabeça (ver windSpreadFactor). Afinado a jogar e a medir a forma do fogo.
export const DEFAULT_K = 0.05;

// Nenhum vizinho pega fogo com CERTEZA: mesmo um eucalipto num temporal tem 15% de hipótese
// de não arder (humidade, uma rocha, um caminho...). Sem isto, a frente avançava uma linha
// inteira e reta por passo, como num tabuleiro.
export const MAX_SPREAD_CHANCE = 0.85;

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

  // Fator do vento (ver windSpreadFactor): forte na cabeça, fraco nos flancos e atrás.
  const windFactor = windSpreadFactor(cosAngle, wind.speed, k);

  // Os vizinhos na diagonal estão mais longe (cerca de 1.4 quadrados), por isso
  // têm menos probabilidade. Assim o fogo não fica com forma de quadrado.
  const distanceFactor = dx !== 0 && dy !== 0 ? DIAGONAL_FACTOR : 1;

  // O limite vale para o vizinho "de frente"; a diagonal (mais longe) fica sempre abaixo dele.
  const direct = clamp(flammability * windFactor * slopeFactor(heightDiff, length), 0, MAX_SPREAD_CHANCE);
  return direct * distanceFactor;
}

// O fator do vento para um vizinho na direção com este cos (1 = a favor, -1 = contra).
// - "head" (1 + k·v) é o empurrão do vento na CABEÇA do fogo;
// - exp(WIND_SHAPE·k·v·(cos − 1)) vale 1 na cabeça e cai muito depressa para os lados:
//   assim a diagonal da frente fica bem mais lenta do que a cabeça e o fogo cresce como uma
//   ELIPSE comprida a favor do vento (como os incêndios reais), não como uma mancha redonda;
// - BACKING_SHARE é a parte que não depende da direção: os flancos e a "cauda" continuam
//   a avançar devagar (um fogo nunca morre só por ter o vento de lado).
// Ex. com 30 km/h: cabeça x2.5, diagonal da frente x0.66, flanco x0.38, contra o vento x0.38.
// Sem vento dá sempre 1 (o fogo cresce redondo).
export const WIND_SHAPE = 5;
export const BACKING_SHARE = 0.15;
export function windSpreadFactor(cosAngle, speed, k = DEFAULT_K) {
  const head = 1 + k * speed;
  const shape = Math.exp(WIND_SHAPE * k * speed * (cosAngle - 1));
  return head * ((1 - BACKING_SHARE) * shape + BACKING_SHARE);
}

// Cada quadrado tem um pouco mais ou menos combustível e humidade do que o vizinho:
// um número fixo (pela semente e pela posição) entre 0.7 e 1.15 que multiplica a chance.
// Não gasta o acaso da simulação (é um "hash"), por isso a mesma semente dá o mesmo fogo.
export const FUEL_VARIATION = { min: 0.7, max: 1.15 };
export function fuelVariation(x, y, seed) {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 7, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  const unit = (h >>> 0) / 4294967296;
  return FUEL_VARIATION.min + unit * (FUEL_VARIATION.max - FUEL_VARIATION.min);
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

// Quantos passos (de 10 minutos) cada tipo fica a arder antes de ficar queimado, em média.
// As árvores ardem mais tempo do que a relva. Cada quadrado arde 1 passo a menos,
// igual ou 1 passo a mais (ver burnSteps), nunca menos de 1.
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
// - wind: { direction, speed, gust? } fixo, OU uma função (stepIndex) => { direction, speed, gust? }
//         (gust = rajadas em km/h, opcional: levam as brasas mais longe e mais vezes)
//         para o vento mudar com o tempo (stepIndex 0 = primeiros 10 minutos)
// - seed: semente do acaso (o mesmo seed dá sempre o mesmo fogo)
// - k: quanto o vento conta; maxSteps: número máximo de passos (144 passos = 24 horas)
// Cada passo (snapshot) é { step, burning: [[x,y]...], burned: [[x,y]...],
//   intensity: { "x,y": 0..1 } (força do fogo em cada quadrado a arder),
//   spots: [[fromX, fromY, toX, toY]...] (brasas que saltaram neste passo) }.
// village.heights (opcional) dá o relevo; sem ele, o terreno é plano.
export function runDisaster(village, { ignition, wind, seed = 1, k = DEFAULT_K, maxSteps = 144 }) {
  const windAt = typeof wind === 'function' ? wind : () => wind;

  // Estado do fogo, guardado à parte para não mexer em village.tiles.
  // burning: "x,y" -> { stepsLeft, totalSteps } (quanto falta arder e quanto arde ao todo).
  // burned: conjunto de "x,y" que já arderam.
  const fire = { village, k, seed, rand: createRandom(seed), burning: new Map(), burned: new Set() };

  // O fogo só começa se o quadrado da ignição puder arder.
  // Um corta-fogo, estrada ou água na ignição = o fogo nunca começa.
  if (canBurn(village, ignition.x, ignition.y)) startFire(fire, key(ignition.x, ignition.y));

  const steps = [snapshot(0, fire, windAt(0), [])];

  for (let step = 1; step <= maxSteps && fire.burning.size > 0; step++) {
    const currentWind = windAt(step - 1);
    const newFires = spreadToNeighbours(fire, currentWind);   // 1) o fogo passa aos vizinhos
    const spots = throwEmbers(fire, currentWind, newFires);   // 2) brasas saltam com o vento
    burnOneStep(fire);                                         // 3) quem arde gasta um passo
    for (const tileKey of newFires) startFire(fire, tileKey); // 4) os fogos novos começam
    steps.push(snapshot(step, fire, currentWind, spots));
  }

  return { steps, outcome: countOutcome(village, fire.burning, fire.burned, steps.length - 1) };
}

// Um quadrado pode arder se o tipo dele tiver inflamabilidade maior do que 0.
function canBurn(village, x, y) {
  return (FLAMMABILITY[village.tiles[y][x]] ?? 0) > 0;
}

// Passo 1: cada quadrado a arder pode pegar fogo a cada um dos 8 vizinhos.
// Devolve o conjunto (Set) de "x,y" que vão começar a arder.
function spreadToNeighbours(fire, wind) {
  const { village, burning, burned, rand, k, seed } = fire;
  const newFires = new Set();
  for (const [tileKey, { totalSteps }] of burning) {
    const [x, y] = fromKey(tileKey);
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx, ny = y + dy;
      if (!isInside(village, nx, ny)) continue;
      const neighbourKey = key(nx, ny);
      if (burning.has(neighbourKey) || burned.has(neighbourKey)) continue;
      const heightDiff = heightOf(village, nx, ny) - heightOf(village, x, y);
      const wholeChance = ignitionProbability(village.tiles[ny][nx], dx, dy, wind, k, heightDiff)
        * fuelVariation(nx, ny, seed);
      if (rand() < chancePerStep(wholeChance, totalSteps)) newFires.add(neighbourKey);
    }
  }
  return newFires;
}

// ---------- Brasas (spotting) ----------
// Com vento forte, pedaços de casca e folhas a arder voam e caem 2 ou 3 quadrados à frente,
// a favor do vento. Por isso uma estrada estreita (1 quadrado) nem sempre trava o fogo!
// Uma brasa nunca acende água, estrada ou corta-fogo (inflamabilidade 0).
// Decisão: casas e a ESCOLA podem pegar fogo com brasas (são edifícios, têm inflamabilidade
// 0.5). Na vida real, muitas casas ardem por causa das brasas, não das chamas.

// Abaixo desta velocidade do vento (km/h) não voam brasas.
// Conta a RAJADA (gust) quando o nível a tem: são as rajadas que levantam as brasas.
// (Era 20; passou a 25 no equilíbrio, junto com SPOT_CHANCE_PER_KMH: assim as brasas vêm
// sobretudo das RAJADAS fortes, e um vento certinho de 30 km/h quase não as larga.)
export const SPOT_MIN_WIND_KMH = 25;
// Por cada km/h acima do mínimo, a chance de um quadrado a arder largar uma brasa num passo
// aumenta 0.6% (vezes a força do fogo). Ex.: rajadas de 68 km/h e eucalipto (0.98) -> ~25%.
// Era 0.003 (~14%); passou a 0.006 no equilíbrio (tests/balance.test.js): antes o fogo de Sintra
// quase nunca saltava a EN247, e não preparar nada ainda dava quase 2 estrelas.
// Naquela noite as rajadas chegaram a 70 km/h: muitas brasas foi o que aconteceu de verdade.
export const SPOT_CHANCE_PER_KMH = 0.006;
// A chance nunca passa disto, nem num temporal.
export const SPOT_MAX_CHANCE = 0.3;
// As brasas não vão em linha reta: desviam-se até 25 graus para cada lado do vento.
export const SPOT_SPREAD_DEGREES = 25;

// O vento que conta para as brasas: a rajada, se houver; senão a velocidade média.
function emberWind(wind) {
  return Math.max(wind.speed, wind.gust ?? 0);
}

// A chance (0 a 1) de um quadrado a arder com esta força (0..1) largar uma brasa num passo.
// wind = { speed, gust? } (km/h).
export function spotChance(wind, intensity) {
  const extraWind = Math.max(0, emberWind(wind) - SPOT_MIN_WIND_KMH);
  return Math.min(SPOT_MAX_CHANCE, extraWind * SPOT_CHANCE_PER_KMH * intensity);
}

// Passo 2: cada quadrado a arder pode largar uma brasa. Se a brasa cair num quadrado que
// pode arder, há uma chance (a inflamabilidade dele) de começar um fogo novo.
// Acrescenta os fogos novos a newFires e devolve a lista [[fromX, fromY, toX, toY], ...].
function throwEmbers(fire, wind, newFires) {
  const { village, burning, burned, rand } = fire;
  const spots = [];
  if (emberWind(wind) <= SPOT_MIN_WIND_KMH) return spots; // vento fraco: sem brasas (e sem gastar acaso)
  for (const [tileKey, tile] of burning) {
    const [x, y] = fromKey(tileKey);
    const intensity = tileIntensity(village.tiles[y][x], tile, wind);
    if (rand() >= spotChance(wind, intensity)) continue;

    const [toX, toY] = emberLanding(x, y, wind, rand);
    if (!isInside(village, toX, toY) || !canBurn(village, toX, toY)) continue;
    const targetKey = key(toX, toY);
    if (burning.has(targetKey) || burned.has(targetKey) || newFires.has(targetKey)) continue;
    if (rand() < FLAMMABILITY[village.tiles[toY][toX]]) {
      newFires.add(targetKey);
      spots.push([x, y, toX, toY]);
    }
  }
  return spots;
}

// Onde cai uma brasa que sai de (x, y): 2 ou 3 quadrados a favor do vento, com um desvio.
function emberLanding(x, y, wind, rand) {
  const distance = rand() < 0.5 ? 2 : 3;
  const swerve = (rand() * 2 - 1) * SPOT_SPREAD_DEGREES; // de -25 a +25 graus
  // Direção downwind (ver GLOSSARY): dx = -sin(d), dy = cos(d), com o desvio somado.
  const radians = ((wind.direction + swerve) * Math.PI) / 180;
  const dirX = -Math.sin(radians);
  const dirY = Math.cos(radians);
  // Esticamos a direção para que o maior dos dois passos seja exatamente "distance" quadrados.
  // Assim, mesmo na diagonal, a brasa cai a 2 ou 3 quadrados (e nunca num vizinho).
  const stretch = distance / Math.max(Math.abs(dirX), Math.abs(dirY));
  return [x + Math.round(dirX * stretch), y + Math.round(dirY * stretch)];
}

// Passo 3: os que estão a arder gastam um passo; quando chegam a 0 ficam queimados.
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

// Passo 4: um quadrado começa a arder (se ainda não estiver a arder).
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

// Uma "fotografia" do fogo num passo: listas de [x, y], e a força do fogo em cada
// quadrado a arder (intensity: "x,y" -> 0..1), para a animação desenhar chamas maiores ou menores.
// spots = as brasas que saltaram neste passo e acenderam um fogo novo: [[fromX, fromY, toX, toY], ...].
function snapshot(step, fire, wind, spots) {
  const intensity = {};
  for (const [tileKey, tile] of fire.burning) {
    const [x, y] = fromKey(tileKey);
    intensity[tileKey] = tileIntensity(fire.village.tiles[y][x], tile, wind);
  }
  return {
    step,
    burning: [...fire.burning.keys()].map(fromKey),
    burned: [...fire.burned].map(fromKey),
    intensity,
    spots,
  };
}

// A força do fogo (0 a 1) que cada tipo faz, sem vento.
// Os eucaliptos (cheios de óleo) e o mato seco fazem chamas altas; a relva, chamas baixas.
export const FIRE_INTENSITY = {
  eucalyptus: 0.75,
  brush: 0.6,
  house: 0.55,
  school: 0.55,
  broadleaf: 0.45,
  grass: 0.3,
  cleared: 0.2,
};

// O vento dá mais oxigénio ao fogo: a 100 km/h a força duplica (mas nunca passa de 1).
// Ex.: com 30 km/h, eucalipto 0.75 -> 0.98, mato 0.6 -> 0.78, relva 0.3 -> 0.39.
export const WIND_INTENSITY_KMH = 100;

// No último passo antes de ficar queimado, o fogo já está a apagar-se: fica com 60% da força.
export const DYING_FACTOR = 0.6;

// A força do fogo num quadrado a arder: pelo tipo, pelo vento e por estar (ou não) a apagar-se.
function tileIntensity(type, tile, wind) {
  const base = FIRE_INTENSITY[type] ?? 0.3;
  const windBoost = 1 + wind.speed / WIND_INTENSITY_KMH;
  const dying = tile.stepsLeft === 1 && tile.totalSteps > 1 ? DYING_FACTOR : 1;
  return clamp(base * windBoost * dying, 0.05, 1);
}

// Prende um número entre min e max.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
