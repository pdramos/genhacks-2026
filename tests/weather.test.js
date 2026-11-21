import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windForLevel, STEP_MINUTES } from '../src/sim/weather.js';

// Um nível com vento por hora (como o sintra.json, dados do Open-Meteo).
const hourlyLevel = {
  date: '2018-10-06T22:50',
  wind: {
    direction: 5, speed: 33, gust: 68,
    hourly: [
      { time: '2018-10-06T22:00', direction: 8, speed: 33.1, gust: 67.7 },
      { time: '2018-10-06T23:00', direction: 6, speed: 32.6, gust: 67.0 },
      { time: '2018-10-07T00:00', direction: 4, speed: 35.0, gust: 65.9 },
    ],
  },
};

test('each step of the fire is 10 minutes', () => {
  assert.equal(STEP_MINUTES, 10);
});

test('a level without hourly wind always gives its fixed wind (with the gust)', () => {
  const wind = windForLevel({ wind: { direction: 315, speed: 30, gust: 50 } });
  for (const step of [0, 5, 100]) assert.deepEqual(wind(step), { direction: 315, speed: 30, gust: 50 });
});

test('the hourly wind starts at the hour of the ignition (22:50 -> the 22:00 hour)', () => {
  const wind = windForLevel(hourlyLevel);
  assert.equal(wind(0).time, '2018-10-06T22:00');
  assert.equal(wind(0).speed, 33.1);
  assert.equal(wind(0).gust, 67.7);
});

test('the hourly wind changes when the clock passes the hour', () => {
  const wind = windForLevel(hourlyLevel);
  // 22:50 + 1 passo (10 min) = 23:00 -> a hora seguinte
  assert.equal(wind(1).time, '2018-10-06T23:00');
  assert.equal(wind(6).time, '2018-10-06T23:00');  // 23:50
  assert.equal(wind(7).time, '2018-10-07T00:00');  // 00:00
});

test('after the last hour of data, the last hour is kept', () => {
  const wind = windForLevel(hourlyLevel);
  assert.equal(wind(500).time, '2018-10-07T00:00');
});

test('without a date, the hourly wind starts at the first hour', () => {
  const { date, ...noDate } = hourlyLevel;
  const wind = windForLevel(noDate);
  assert.equal(wind(0).time, '2018-10-06T22:00');
  assert.equal(wind(6).time, '2018-10-06T23:00');
});
