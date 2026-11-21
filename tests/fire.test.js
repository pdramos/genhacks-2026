import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ignitionProbability, runDisaster } from '../src/sim/fire.js';
import { createVillage } from '../src/sim/village.js';
import { createBuildState, applyAction } from '../src/sim/actions.js';

// Cria uma vila de teste a partir de linhas de letras (G relva, W água, H casa, ...).
function villageFrom(...map) {
  return createVillage({ name: 'test', map });
}

// As 4 direções principais, como (dx, dy) na grelha: y cresce para sul.
const NORTH = [0, -1], SOUTH = [0, 1], EAST = [1, 0], WEST = [-1, 0];

test('with zero wind, grass is equally likely to catch fire in the 4 main directions', () => {
  const noWind = { direction: 0, speed: 0 };
  const chances = [NORTH, SOUTH, EAST, WEST].map(([dx, dy]) =>
    ignitionProbability('grass', dx, dy, noWind, 0.05));
  assert.deepEqual(chances, [0.5, 0.5, 0.5, 0.5]);
});

test('a strong wind from the north makes fire more likely to jump south (downwind) than north', () => {
  const northWind = { direction: 0, speed: 30 };
  const downwind = ignitionProbability('grass', ...SOUTH, northWind, 0.05);
  const upwind = ignitionProbability('grass', ...NORTH, northWind, 0.05);
  assert.ok(downwind > upwind, `downwind ${downwind} should be > upwind ${upwind}`);
});

test('a wind from the north-west (315 degrees) pushes fire towards the south-east', () => {
  const nwWind = { direction: 315, speed: 30 };
  const southEast = ignitionProbability('grass', 1, 1, nwWind, 0.05);
  const northWest = ignitionProbability('grass', -1, -1, nwWind, 0.05);
  assert.ok(southEast > northWest, `south-east ${southEast} should be > north-west ${northWest}`);
});

test('firebreak, road and water can never catch fire, even right downwind of a strong wind', () => {
  const stormWind = { direction: 0, speed: 100 };
  for (const type of ['firebreak', 'road', 'water']) {
    assert.equal(ignitionProbability(type, ...SOUTH, stormWind, 0.05), 0, type);
  }
});

test('the probability never goes above 1, even for eucalyptus in a storm', () => {
  const stormWind = { direction: 0, speed: 100 };
  assert.equal(ignitionProbability('eucalyptus', ...SOUTH, stormWind, 0.05), 1);
});

test('a lone patch of grass in a lake burns, and then the fire stops', () => {
  const village = villageFrom(
    'WWW',
    'WGW',
    'WWW',
  );
  const { steps, outcome } = runDisaster(village, {
    ignition: { x: 1, y: 1 }, wind: { direction: 0, speed: 0 }, seed: 1,
  });
  const { step, burning, burned } = steps[0];
  assert.deepEqual({ step, burning, burned }, { step: 0, burning: [[1, 1]], burned: [] });
  assert.deepEqual(steps.at(-1).burning, []);
  assert.deepEqual(steps.at(-1).burned, [[1, 1]]);
  assert.equal(outcome.burnedCount, 1);
});

test('the outcome counts the houses saved and says if the school was saved', () => {
  // A casa da esquerda arde; a casa da direita e a escola estão do outro lado da água.
  const village = villageFrom(
    'HWH',
    'WWW',
    'SWW',
  );
  const { outcome } = runDisaster(village, {
    ignition: { x: 0, y: 0 }, wind: { direction: 0, speed: 0 }, seed: 1,
  });
  assert.equal(outcome.housesTotal, 2);
  assert.equal(outcome.housesSaved, 1);
  assert.equal(outcome.schoolSaved, true);
});

test('the school is lost when it burns', () => {
  const village = villageFrom(
    'HWS',
    'WWW',
  );
  const { outcome } = runDisaster(village, {
    ignition: { x: 2, y: 0 }, wind: { direction: 0, speed: 0 }, seed: 1,
  });
  assert.equal(outcome.housesSaved, 1);
  assert.equal(outcome.schoolSaved, false);
});

// Floresta de eucaliptos cortada por uma faixa de corta-fogo, estrada e água (colunas 3 a 5).
// O vento de oeste (270) empurra o fogo para leste, contra a faixa.
// A faixa tem 3 quadrados de largura: as brasas voam no máximo 3 quadrados, por isso
// caem sempre dentro da faixa. (Uma linha de 1 quadrado pode ser saltada: ver os testes das brasas.)
const forestWithBarrier = () => villageFrom(
  'EEEFFFEEH',
  'EEERRRBEE',
  'EEEWWWEEH',
  'EEEFFFEEE',
  'EEERRRBEH',
);
const westWind = { direction: 270, speed: 40 };

test('firebreak, road and water tiles never burn in a disaster', () => {
  const village = forestWithBarrier();
  for (let seed = 1; seed <= 20; seed++) {
    const { steps } = runDisaster(village, { ignition: { x: 0, y: 2 }, wind: westWind, seed });
    for (const { burning, burned } of steps) {
      for (const [x, y] of [...burning, ...burned]) {
        const type = village.tiles[y][x];
        assert.ok(!['firebreak', 'road', 'water'].includes(type), `seed ${seed}: ${type} at (${x}, ${y}) burned`);
      }
    }
  }
});

test('a line of firebreak, road and water saves the houses behind it', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { outcome } = runDisaster(forestWithBarrier(), { ignition: { x: 0, y: 2 }, wind: westWind, seed });
    assert.equal(outcome.housesSaved, 3, `seed ${seed}`);
  }
});

// Uma vila mista de 12 x 8 para os testes que precisam de um fogo "a sério".
const mixedVillage = () => villageFrom(
  'EEEBBGGGHHGG',
  'EEBBGGGGHHGG',
  'EBBGGOOGGGBB',
  'BBGGOOGGHGBB',
  'BGGHHGGGGGEE',
  'GGGHHGGRRRRR',
  'GGGGGGGRGSSG',
  'GGBBGGGRGSSG',
);

test('the same village, wind and seed always give an identical disaster', () => {
  const options = { ignition: { x: 0, y: 0 }, wind: { direction: 315, speed: 30 }, seed: 42 };
  const first = runDisaster(mixedVillage(), options);
  const second = runDisaster(mixedVillage(), options);
  assert.deepEqual(second, first);
});

test('running a disaster does not change the village tiles', () => {
  const village = mixedVillage();
  runDisaster(village, { ignition: { x: 0, y: 0 }, wind: { direction: 315, speed: 30 }, seed: 42 });
  assert.deepEqual(village.tiles, mixedVillage().tiles);
});

test('the wind can be a function of the step, so it can change over time', () => {
  const steadyWind = { direction: 315, speed: 30 };
  const options = { ignition: { x: 0, y: 0 }, seed: 42 };
  const withObject = runDisaster(mixedVillage(), { ...options, wind: steadyWind });
  const withFunction = runDisaster(mixedVillage(), { ...options, wind: () => steadyWind });
  assert.deepEqual(withFunction, withObject);
});

test('with a strong wind from the west, the fire reaches further east (downwind) than west', () => {
  // Um campo de mato de 21 x 21 com o fogo a começar no meio (10, 10).
  // No fim o campo todo arde, por isso olhamos para o passo em que o fogo chega à borda leste.
  const field = villageFrom(...Array(21).fill('B'.repeat(21)));
  for (let seed = 1; seed <= 10; seed++) {
    const { steps } = runDisaster(field, { ignition: { x: 10, y: 10 }, wind: { direction: 270, speed: 30 }, seed });
    const xsAt = ({ burning, burned }) => [...burning, ...burned].map(([x]) => x);
    const atEastEdge = steps.find((snapshot) => xsAt(snapshot).includes(20));
    const westReach = 10 - Math.min(...xsAt(atEastEdge));
    assert.ok(westReach < 10, `seed ${seed}: the fire went ${westReach} tiles west by the time it reached the east edge`);
  }
});

test('the fire stops after maxSteps even if something is still burning', () => {
  const { steps, outcome } = runDisaster(mixedVillage(), {
    ignition: { x: 0, y: 0 }, wind: { direction: 315, speed: 30 }, seed: 42, maxSteps: 3,
  });
  assert.equal(steps.length, 4); // passo 0 (a ignição) + 3 passos
  assert.equal(outcome.stepCount, 3);
});

test('a firebreak built on the ignition tile never burns, so the fire never starts', () => {
  // O jogador constrói um corta-fogo mesmo no quadrado onde o fogo ia começar.
  const village = villageFrom(
    'GGG',
    'GEG',
    'GGG',
  );
  const state = createBuildState(village, 1000);
  assert.equal(applyAction(state, 1, 1, 'firebreak').ok, true);

  const { steps, outcome } = runDisaster(village, {
    ignition: { x: 1, y: 1 }, wind: { direction: 0, speed: 0 }, seed: 1,
  });
  for (const { burning, burned } of steps) {
    assert.ok(![...burning, ...burned].some(([x, y]) => x === 1 && y === 1), 'the firebreak burned');
  }
  assert.equal(outcome.burnedCount, 0);
});

// ---------- Declive: o fogo sobe a encosta mais depressa ----------

test('fire is more likely to spread uphill than on flat ground, and less likely downhill', () => {
  const noWind = { direction: 0, speed: 0 };
  // Último argumento: quanto o vizinho está mais alto (+) ou mais baixo (-), em níveis 0-9.
  const uphill = ignitionProbability('grass', ...EAST, noWind, 0.05, 2);
  const flat = ignitionProbability('grass', ...EAST, noWind, 0.05, 0);
  const downhill = ignitionProbability('grass', ...EAST, noWind, 0.05, -2);
  assert.ok(uphill > flat, `uphill ${uphill} should be > flat ${flat}`);
  assert.ok(downhill < flat, `downhill ${downhill} should be < flat ${flat}`);
  assert.ok(downhill > 0, 'fire can still go downhill, only slower');
});

test('on a hillside with no wind, the fire climbs to the top faster than it runs down to the bottom', () => {
  // Uma encosta de relva de 21 x 7 que sobe para leste (altura 0 a oeste, 9 a leste).
  const slopeRow = '001122334455667788999';
  const hillside = createVillage({
    name: 'hill',
    map: Array(7).fill('G'.repeat(21)),
    heights: Array(7).fill(slopeRow),
  });
  let eastSteps = 0, westSteps = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { steps } = runDisaster(hillside, { ignition: { x: 10, y: 3 }, wind: { direction: 0, speed: 0 }, seed });
    // Em que passo o fogo chega pela primeira vez à coluna pedida?
    // Se nunca lá chegar, conta como o fim + 1 (o mais lento possível).
    const reaches = (column) => {
      const index = steps.findIndex(({ burning, burned }) =>
        [...burning, ...burned].some(([x]) => x === column));
      return index === -1 ? steps.length : index;
    };
    eastSteps += reaches(20);
    westSteps += reaches(0);
  }
  assert.ok(eastSteps < westSteps, `uphill (east) took ${eastSteps} steps in total, downhill (west) ${westSteps}`);
});

// ---------- Duração variável: cada quadrado arde um tempo um pouco diferente ----------

// Quantos passos cada quadrado passou a arder: "x,y" -> número de snapshots em que aparece em burning.
function burnDurations(steps) {
  const durations = new Map();
  for (const { burning } of steps) {
    for (const [x, y] of burning) durations.set(`${x},${y}`, (durations.get(`${x},${y}`) ?? 0) + 1);
  }
  return durations;
}

test('tiles of the same type burn for slightly different times, between 1 and 3 steps for brush', () => {
  // Um campo de mato: o mato arde cerca de 2 passos (20 minutos), às vezes 1, às vezes 3.
  const field = villageFrom(...Array(9).fill('B'.repeat(9)));
  const { steps } = runDisaster(field, { ignition: { x: 4, y: 4 }, wind: { direction: 0, speed: 0 }, seed: 7 });
  assert.deepEqual(steps.at(-1).burning, [], 'the fire burned out');

  const values = [...burnDurations(steps).values()];
  assert.ok(values.every((steps) => steps >= 1 && steps <= 3), `durations ${values}`);
  assert.ok(new Set(values).size > 1, 'not every tile burned for the same time');
});

// ---------- Forma do fogo: sem vento, cresce como um círculo (nem quadrado, nem losango) ----------

// O quadrado a arder (ou queimado) mais longe do centro (cx, cy) num "cone" de ±15 graus
// à volta de angleDegrees (0 = leste, 90 = sul, porque y cresce para sul).
function farthestInDirection(tiles, cx, cy, angleDegrees) {
  let farthest = 0;
  for (const [x, y] of tiles) {
    const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    const difference = Math.abs(((angle - angleDegrees) % 360 + 540) % 360 - 180);
    if (difference <= 15) farthest = Math.max(farthest, Math.hypot(x - cx, y - cy));
  }
  return farthest;
}

for (const [letter, fuel] of [['E', 'eucalyptus'], ['B', 'brush'], ['G', 'grass']]) {
  test(`with no wind, a fire in a ${fuel} field grows round: as far along the diagonals as along the axes`, () => {
    // Um quadrado em losango teria rácio ~0.7; um fogo em forma de quadrado teria ~1.4.
    const field = villageFrom(...Array(41).fill(letter.repeat(41)));
    let ratioSum = 0;
    const seeds = 10;
    for (let seed = 1; seed <= seeds; seed++) {
      const { steps } = runDisaster(field, { ignition: { x: 20, y: 20 }, wind: { direction: 0, speed: 0 }, seed });
      // O primeiro passo em que o fogo está a 12 quadrados (ou mais) do centro.
      const fireTiles = ({ burning, burned }) => [...burning, ...burned];
      const snapshot = steps.find((s) => fireTiles(s).some(([x, y]) => Math.hypot(x - 20, y - 20) >= 12));
      const tiles = fireTiles(snapshot);
      const axes = [0, 90, 180, 270].map((angle) => farthestInDirection(tiles, 20, 20, angle));
      const diagonals = [45, 135, 225, 315].map((angle) => farthestInDirection(tiles, 20, 20, angle));
      const average = (list) => list.reduce((a, b) => a + b, 0) / list.length;
      ratioSum += average(diagonals) / average(axes);
    }
    const ratio = ratioSum / seeds;
    assert.ok(ratio > 0.9 && ratio < 1.1, `diagonal / axis reach was ${ratio.toFixed(2)}`);
  });
}

// ---------- Intensidade: a força do fogo em cada quadrado a arder ----------

// O fogo num único quadrado do tipo letter, rodeado de água.
function loneTile(letter) {
  return villageFrom('WWW', `W${letter}W`, 'WWW');
}

test('every snapshot gives an intensity between 0 and 1 for each burning tile, and only for those', () => {
  const storm = { direction: 315, speed: 100 };
  const { steps } = runDisaster(mixedVillage(), { ignition: { x: 0, y: 0 }, wind: storm, seed: 3 });
  for (const { burning, intensity } of steps) {
    assert.deepEqual(Object.keys(intensity).sort(), burning.map(([x, y]) => `${x},${y}`).sort());
    for (const value of Object.values(intensity)) assert.ok(value > 0 && value <= 1, `intensity ${value}`);
  }
});

test('eucalyptus burns with a stronger fire than grass', () => {
  const calm = { direction: 0, speed: 0 };
  const eucalyptus = runDisaster(loneTile('E'), { ignition: { x: 1, y: 1 }, wind: calm, seed: 1 });
  const grass = runDisaster(loneTile('G'), { ignition: { x: 1, y: 1 }, wind: calm, seed: 1 });
  assert.ok(eucalyptus.steps[0].intensity['1,1'] > grass.steps[0].intensity['1,1']);
});

test('a strong wind makes the same fire stronger', () => {
  const options = { ignition: { x: 1, y: 1 }, seed: 1 };
  const calm = runDisaster(loneTile('B'), { ...options, wind: { direction: 0, speed: 0 } });
  const windy = runDisaster(loneTile('B'), { ...options, wind: { direction: 0, speed: 40 } });
  assert.ok(windy.steps[0].intensity['1,1'] > calm.steps[0].intensity['1,1']);
});

test('a fire dies down in its last step before the tile is burned', () => {
  // Um eucalipto arde 3 a 5 passos: no último passo a arder, as chamas são mais fracas.
  const { steps } = runDisaster(loneTile('E'), { ignition: { x: 1, y: 1 }, wind: { direction: 0, speed: 0 }, seed: 1 });
  const values = steps.filter(({ burning }) => burning.length > 0).map(({ intensity }) => intensity['1,1']);
  assert.ok(values.length >= 3);
  assert.ok(values.at(-1) < values[0], `first ${values[0]}, last ${values.at(-1)}`);
});

// ---------- Brasas (spotting): com vento forte, o fogo salta 2-3 quadrados ----------

// Um campo de mato cortado por uma estrada de 1 quadrado (coluna 4). O fogo começa a oeste.
const fieldWithRoad = () => villageFrom(...Array(7).fill('BBBBRBBBB'));
const roadOptions = (speed, seed) => ({ ignition: { x: 1, y: 3 }, wind: { direction: 270, speed }, seed });
const crossedTheRoad = ({ steps }) => steps.at(-1).burned.some(([x]) => x > 4);

test('with no wind, embers never fly, so the fire never crosses a 1-tile road', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const result = runDisaster(fieldWithRoad(), roadOptions(0, seed));
    assert.equal(crossedTheRoad(result), false, `seed ${seed}`);
    assert.ok(result.steps.every(({ spots }) => spots.length === 0), `seed ${seed}: an ember flew`);
  }
});

test('with a strong wind, embers can jump over a 1-tile road and start a new fire on the other side', () => {
  let crossings = 0;
  for (let seed = 1; seed <= 20; seed++) {
    if (crossedTheRoad(runDisaster(fieldWithRoad(), roadOptions(50, seed)))) crossings++;
  }
  assert.ok(crossings > 0, 'the fire never crossed the road');
});

test('each ember goes from a tile that was burning to a new fire 2 or 3 tiles away, never onto road, water or firebreak', () => {
  let embers = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { steps } = runDisaster(mixedVillage(), { ignition: { x: 0, y: 0 }, wind: { direction: 315, speed: 50 }, seed });
    assert.deepEqual(steps[0].spots, []);
    for (let i = 1; i < steps.length; i++) {
      const has = (list, x, y) => list.some(([ax, ay]) => ax === x && ay === y);
      for (const [fromX, fromY, toX, toY] of steps[i].spots) {
        embers++;
        assert.ok(has(steps[i - 1].burning, fromX, fromY), 'the ember came from a burning tile');
        assert.ok(has(steps[i].burning, toX, toY), 'the ember started a fire');
        assert.ok(!has(steps[i - 1].burning, toX, toY) && !has(steps[i - 1].burned, toX, toY), 'the target was not on fire before');
        const distance = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
        assert.ok(distance === 2 || distance === 3, `the ember flew ${distance} tiles`);
        assert.ok(!['road', 'water', 'firebreak'].includes(mixedVillage().tiles[toY][toX]));
      }
    }
  }
  assert.ok(embers > 0, 'no ember flew in 20 windy fires');
});

test('embers fly with the wind: they land downwind of the tile they came from', () => {
  // Vento de oeste (270): as brasas vão para leste (x maior).
  const field = villageFrom(...Array(15).fill('E'.repeat(15)));
  for (let seed = 1; seed <= 10; seed++) {
    const { steps } = runDisaster(field, { ignition: { x: 2, y: 7 }, wind: { direction: 270, speed: 50 }, seed });
    for (const { spots } of steps) {
      for (const [fromX, , toX] of spots) assert.ok(toX > fromX, `seed ${seed}: ember went from x=${fromX} to x=${toX}`);
    }
  }
});

test('the stronger the wind, the more embers fly', () => {
  const field = villageFrom(...Array(15).fill('E'.repeat(15)));
  const countEmbers = (speed) => {
    let count = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { steps } = runDisaster(field, { ignition: { x: 2, y: 7 }, wind: { direction: 270, speed }, seed, maxSteps: 6 });
      for (const { spots } of steps) count += spots.length;
    }
    return count;
  };
  assert.ok(countEmbers(60) > countEmbers(25), `60 km/h: ${countEmbers(60)} embers, 25 km/h: ${countEmbers(25)}`);
});

test('a fire with embers is still the same every time with the same seed', () => {
  const options = { ignition: { x: 1, y: 3 }, wind: { direction: 270, speed: 60 }, seed: 9 };
  const first = runDisaster(fieldWithRoad(), options);
  const second = runDisaster(fieldWithRoad(), options);
  assert.ok(first.steps.some(({ spots }) => spots.length > 0), 'this test needs at least one ember');
  assert.deepEqual(second, first);
});
