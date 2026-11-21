import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, DEFAULT_MAPGEN } from '../src/core/mapgen/index.ts';
import { hexDistance, hexToIndex, neighborIndices } from '../src/core/hex.ts';
import { isPassable } from '../src/core/map.ts';
import { TERRAIN } from '../src/data/terrain.ts';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);

test('same seed gives an identical map', () => {
  const a = generateMap(12345);
  const b = generateMap(12345);
  assert.deepEqual(a, b);
});

test('different seeds give different maps', () => {
  const a = generateMap(1);
  const b = generateMap(2);
  assert.notDeepEqual(a.map.tiles, b.map.tiles);
});

test('map is 40x40 and survives a JSON round-trip', () => {
  const g = generateMap(77);
  assert.equal(g.map.width, 40);
  assert.equal(g.map.height, 40);
  assert.equal(g.map.tiles.length, 1600);
  assert.deepEqual(JSON.parse(JSON.stringify(g)), g);
});

for (const seed of SEEDS) {
  test(`seed ${seed}: map obeys the rules`, () => {
    const g = generateMap(seed);
    const { map, cities, ruins } = g;

    // Counts within configured ranges.
    const neutrals = cities.filter((c) => c.start === null).length;
    assert.ok(neutrals >= DEFAULT_MAPGEN.neutralCities[0] && neutrals <= DEFAULT_MAPGEN.neutralCities[1]);
    assert.equal(cities.filter((c) => c.start !== null).length, 2);
    assert.ok(ruins.length >= DEFAULT_MAPGEN.ruins[0] && ruins.length <= DEFAULT_MAPGEN.ruins[1]);
    assert.ok(g.rivers.length >= DEFAULT_MAPGEN.riverCount[0]);

    // Mountain share close to target.
    const mountains = map.tiles.filter((t) => t.terrain === 'mountains').length / map.tiles.length;
    assert.ok(Math.abs(mountains - DEFAULT_MAPGEN.mountainShare) < 0.03, `mountain share ${mountains}`);

    // Cities on legal terrain, spaced out, on the road network.
    for (const c of cities) {
      const t = map.tiles[hexToIndex(map, c.hex)]!;
      assert.ok(TERRAIN[t.terrain].cityAllowed, `${c.name} on ${t.terrain}`);
      assert.ok(t.road, `${c.name} has no road`);
    }
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        assert.ok(hexDistance(cities[i]!.hex, cities[j]!.hex) >= DEFAULT_MAPGEN.citySpacing);
      }
    }
    const [s0, s1] = cities.filter((c) => c.start !== null);
    assert.ok(hexDistance(s0!.hex, s1!.hex) >= DEFAULT_MAPGEN.startSpacing);

    // Rivers are one hex wide: a river tile touches at most 2 other river tiles.
    for (let i = 0; i < map.tiles.length; i++) {
      if (map.tiles[i]!.terrain !== 'river') continue;
      const riverNeighbors = neighborIndices(map, i).filter((n) => map.tiles[n]!.terrain === 'river').length;
      assert.ok(riverNeighbors <= 2, `river blob at tile ${i}`);
    }

    // Roads never run along a river: a bridge never touches another bridge.
    for (let i = 0; i < map.tiles.length; i++) {
      const t = map.tiles[i]!;
      if (t.terrain !== 'river' || !t.road) continue;
      for (const n of neighborIndices(map, i)) {
        const nt = map.tiles[n]!;
        assert.ok(!(nt.terrain === 'river' && nt.road), 'two bridges in a row');
      }
    }

    // No road on mountains.
    assert.ok(map.tiles.every((t) => !(t.terrain === 'mountains' && t.road)));

    // Ruins on plain/forest tiles, off-road.
    for (const r of ruins) {
      const t = map.tiles[hexToIndex(map, r.hex)]!;
      assert.ok((t.terrain === 'plains' || t.terrain === 'forest') && !t.road);
    }

    // Every city and ruin reachable on foot from each start.
    for (const start of [s0!, s1!]) {
      const seen = new Set([hexToIndex(map, start.hex)]);
      const queue = [...seen];
      while (queue.length) {
        const i = queue.pop()!;
        for (const n of neighborIndices(map, i)) {
          if (!seen.has(n) && isPassable(map.tiles[n]!)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      for (const c of cities) assert.ok(seen.has(hexToIndex(map, c.hex)), `${c.name} unreachable`);
      for (const r of ruins) assert.ok(seen.has(hexToIndex(map, r.hex)), 'ruin unreachable');
    }
  });
}
