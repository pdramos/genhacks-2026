import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ignitionProbability } from '../src/sim/fire.js';

// As 4 direções principais, como (dx, dy) na grelha: y cresce para sul.
const NORTH = [0, -1], SOUTH = [0, 1], EAST = [1, 0], WEST = [-1, 0];

test('with zero wind, grass is equally likely to catch fire in the 4 main directions', () => {
  const noWind = { direction: 0, speed: 0 };
  const chances = [NORTH, SOUTH, EAST, WEST].map(([dx, dy]) =>
    ignitionProbability('grass', dx, dy, noWind, 0.05));
  assert.deepEqual(chances, [0.5, 0.5, 0.5, 0.5]);
});
