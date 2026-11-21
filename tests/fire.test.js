import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ignitionProbability, runDisaster } from '../src/sim/fire.js';
import { createVillage } from '../src/sim/village.js';

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
  assert.deepEqual(steps[0], { step: 0, burning: [[1, 1]], burned: [] });
  assert.deepEqual(steps.at(-1).burning, []);
  assert.deepEqual(steps.at(-1).burned, [[1, 1]]);
  assert.equal(outcome.burnedCount, 1);
});
