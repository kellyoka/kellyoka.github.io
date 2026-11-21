import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloneRng, createRng, randInt, random, shuffle } from '../src/core/rng.ts';

test('same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 1000; i++) assert.equal(random(a), random(b));
});

test('different seeds give different sequences', () => {
  const a = createRng(1);
  const b = createRng(2);
  const sa = Array.from({ length: 10 }, () => random(a));
  const sb = Array.from({ length: 10 }, () => random(b));
  assert.notDeepEqual(sa, sb);
});

test('a cloned RNG continues identically and independently', () => {
  const a = createRng(7);
  random(a);
  const b = cloneRng(a);
  assert.equal(random(a), random(b));
  random(b); // advancing the clone must not affect the original
  const c = cloneRng(a);
  assert.equal(random(a), random(c));
});

test('state survives a JSON round-trip (saves)', () => {
  const a = createRng(99);
  random(a);
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 100; i++) assert.equal(random(a), random(b));
});

test('randInt stays in range and covers it', () => {
  const r = createRng(3);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = randInt(r, 1, 6);
    assert.ok(v >= 1 && v <= 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6);
});

test('random() is roughly uniform', () => {
  const r = createRng(5);
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) sum += random(r);
  assert.ok(Math.abs(sum / n - 0.5) < 0.02);
});

test('shuffle keeps all elements', () => {
  const r = createRng(11);
  const s = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...s].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8]);
});
