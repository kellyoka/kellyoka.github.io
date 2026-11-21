import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hex, hexDistance, hexesInRange, hexRound, hexToIndex, hexToOffset, indexToHex,
  neighbors, offsetToHex, neighborIndices,
} from '../src/core/hex.ts';

test('every neighbor is distance 1', () => {
  const c = hex(3, -2);
  for (const n of neighbors(c)) assert.equal(hexDistance(c, n), 1);
});

test('distance is symmetric and matches known values', () => {
  assert.equal(hexDistance(hex(0, 0), hex(3, -3)), 3);
  assert.equal(hexDistance(hex(0, 0), hex(2, 1)), 3);
  assert.equal(hexDistance(hex(-1, 4), hex(2, 1)), hexDistance(hex(2, 1), hex(-1, 4)));
});

test('a radius-2 range has 19 hexes', () => {
  assert.equal(hexesInRange(hex(0, 0), 2).length, 19);
  assert.equal(hexesInRange(hex(0, 0), 1).length, 7);
});

test('offset <-> axial round-trips', () => {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      assert.deepEqual(hexToOffset(offsetToHex(col, row)), { col, row });
    }
  }
});

test('index <-> hex round-trips and off-map is -1', () => {
  const grid = { width: 40, height: 40 };
  for (let i = 0; i < 1600; i++) assert.equal(hexToIndex(grid, indexToHex(grid, i)), i);
  assert.equal(hexToIndex(grid, offsetToHex(-1, 0)), -1);
  assert.equal(hexToIndex(grid, offsetToHex(0, 40)), -1);
});

test('corner tile has fewer neighbors, interior has six', () => {
  const grid = { width: 40, height: 40 };
  assert.equal(neighborIndices(grid, 0).length, 2);
  assert.equal(neighborIndices(grid, 5 * 40 + 5).length, 6);
});

test('hexRound picks the containing hex', () => {
  assert.deepEqual(hexRound(0.1, 0.1), hex(0, 0));
  assert.deepEqual(hexRound(0.9, -0.1), hex(1, 0));
  assert.deepEqual(hexRound(-0.2, 0.0), hex(0, 0));
});
