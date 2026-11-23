import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windForLevel, STEP_MINUTES, compassWord } from '../src/sim/weather.js';

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

// ---------- compassWord: graus -> palavra da bússola ----------

test('compassWord gives the 8 points of the compass in plain words', () => {
  assert.equal(compassWord(0), 'north');
  assert.equal(compassWord(45), 'north-east');
  assert.equal(compassWord(90), 'east');
  assert.equal(compassWord(135), 'south-east');
  assert.equal(compassWord(180), 'south');
  assert.equal(compassWord(225), 'south-west');
  assert.equal(compassWord(270), 'west');
  assert.equal(compassWord(315), 'north-west');
});

test('compassWord rounds to the nearest point (the real night: 4 to 11 degrees is north)', () => {
  assert.equal(compassWord(8), 'north');
  assert.equal(compassWord(11), 'north');
  assert.equal(compassWord(350), 'north');
  assert.equal(compassWord(22.4), 'north');
  assert.equal(compassWord(200), 'south');
});

test('compassWord: a boundary always goes to the next point clockwise', () => {
  assert.equal(compassWord(22.5), 'north-east');
  assert.equal(compassWord(67.5), 'east');
  assert.equal(compassWord(337.4), 'north-west');
  assert.equal(compassWord(337.5), 'north');
  // o mesmo ângulo escrito de outra maneira dá a mesma palavra
  assert.equal(compassWord(-22.5), compassWord(337.5));
  assert.equal(compassWord(382.5), compassWord(22.5));
});

test('compassWord wraps negative angles and angles of 360 or more', () => {
  assert.equal(compassWord(360), 'north');
  assert.equal(compassWord(-90), 'west');
  assert.equal(compassWord(-45), 'north-west');
  assert.equal(compassWord(450), 'east');
  assert.equal(compassWord(720 + 180), 'south');
});

test('compassWord: where the fire goes is the opposite word (direction + 180)', () => {
  assert.equal(compassWord(8 + 180), 'south');
  assert.equal(compassWord(315 + 180), 'south-east');
});

test('compassWord gives null for a number that does not exist', () => {
  assert.equal(compassWord(NaN), null);
  assert.equal(compassWord(undefined), null);
});
