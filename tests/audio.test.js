// Testes do módulo de som. O Node não tem Web Audio, por isso aqui só testamos
// as contas simples e que o módulo nunca rebenta quando não há som disponível.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initAudio, setAmbience, setFireLevel, play, setMuted, isMuted, fireLevelFromCount,
} from '../src/render/audio.js';

test('no fire gives fire level 0', () => {
  assert.equal(fireLevelFromCount(0), 0);
});

test('more burning tiles give a higher fire level', () => {
  assert.ok(fireLevelFromCount(10) > fireLevelFromCount(3));
});

test('fire level never goes above 1', () => {
  assert.equal(fireLevelFromCount(5000), 1);
});

test('without Web Audio (like in Node) nothing throws and initAudio says false', () => {
  assert.equal(initAudio(), false);
  setAmbience('build');
  setAmbience('disaster');
  setFireLevel(0.5);
  for (const name of ['click', 'build', 'error', 'car', 'ignite', 'siren', 'win', 'lose', 'nope']) play(name);
});

test('setMuted remembers the choice', () => {
  setMuted(true);
  assert.equal(isMuted(), true);
  setMuted(false);
  assert.equal(isMuted(), false);
});
