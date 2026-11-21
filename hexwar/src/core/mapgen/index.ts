/**
 * Map generator entry point.
 *
 * generateMap(seed) is a pure function: the same seed and options always
 * give exactly the same map. Every random choice comes from one seeded RNG,
 * in a fixed order.
 *
 * Some seeds produce unusable maps (no fair starts, a city walled off by
 * mountains and rivers...). Instead of patching those, we throw the map
 * away and try seed + 1, then seed + 2, and so on. The result records which
 * seed actually worked.
 */

import { hexToIndex, neighborIndices } from '../hex.ts';
import { isPassable, type MapState } from '../map.ts';
import { createRng } from '../rng.ts';
import { generateRivers } from './rivers.ts';
import { buildRoads } from './roads.ts';
import { placeCities, placeRuins } from './sites.ts';
import { generateTerrain } from './terrain.ts';
import { DEFAULT_MAPGEN, MapGenFailure, type CitySite, type GeneratedMap, type MapGenOptions, type RuinSite } from './types.ts';

export * from './types.ts';

export function generateMap(seed: number, overrides: Partial<MapGenOptions> = {}): GeneratedMap {
  const opts: MapGenOptions = { ...DEFAULT_MAPGEN, ...overrides };
  const requestedSeed = Math.trunc(seed) >>> 0;
  let lastError = '';

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    const trySeed = (requestedSeed + attempt) >>> 0;
    try {
      const result = generateOnce(trySeed, opts);
      return { ...result, requestedSeed, seed: trySeed, attempts: attempt + 1 };
    } catch (err) {
      if (!(err instanceof MapGenFailure)) throw err; // a real bug: don't hide it
      lastError = err.message;
    }
  }
  throw new Error(`map generation failed after ${opts.maxAttempts} attempts (last: ${lastError})`);
}

function generateOnce(seed: number, opts: MapGenOptions) {
  const rng = createRng(seed);
  const { map, height } = generateTerrain(opts, rng);
  const rivers = generateRivers(opts, rng, map, height);
  if (rivers.length < opts.riverCount[0]) throw new MapGenFailure('too few rivers');
  const cities = placeCities(opts, rng, map);
  const roadSegments = buildRoads(rng, map, cities);
  const ruins = placeRuins(opts, rng, map, cities);
  validate(map, cities, ruins);
  return { map, cities, ruins, rivers, roadSegments };
}

/** Every city and ruin must be reachable on foot from the first start. */
function validate(map: MapState, cities: readonly CitySite[], ruins: readonly RuinSite[]): void {
  const start = hexToIndex(map, cities[0]!.hex);
  const seen = new Uint8Array(map.tiles.length);
  const queue = [start];
  seen[start] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    for (const n of neighborIndices(map, i)) {
      if (!seen[n] && isPassable(map.tiles[n]!)) {
        seen[n] = 1;
        queue.push(n);
      }
    }
  }
  for (const c of cities) if (!seen[hexToIndex(map, c.hex)]) throw new MapGenFailure(`${c.name} unreachable`);
  for (const r of ruins) if (!seen[hexToIndex(map, r.hex)]) throw new MapGenFailure('ruin unreachable');
}
