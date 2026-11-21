/**
 * Step 5: roads and bridges.
 *
 * 1. Decide which cities to connect: a minimum spanning tree (the shortest
 *    set of links that connects every city), plus a few extra links so the
 *    network has loops and there's more than one way to reach a city.
 * 2. Lay each link with A*. It prefers plains, reuses existing roads, can't
 *    cross mountains, and makes a bridge where it crosses a river.
 *
 * Because rivers are impassable except at bridges, these bridges are the
 * only river crossings on the map.
 */

import { aStar } from '../astar.ts';
import { hexDistance, hexToIndex, indexToHex, neighborIndices, type Hex } from '../hex.ts';
import type { MapState } from '../map.ts';
import { shuffle, type RngState } from '../rng.ts';
import { MapGenFailure, type CitySite } from './types.ts';

const COST_EXISTING_ROAD = 0.4;
const COST_PLAINS = 1;
const COST_FOREST = 1.7;
const COST_NEW_BRIDGE = 6; // bridges are expensive, so roads share them

/** Prim's algorithm on hex distance. Returns pairs of city indices. */
function spanningTree(cities: readonly CitySite[]): [number, number][] {
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < cities.length) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const a of inTree) {
      for (let b = 0; b < cities.length; b++) {
        if (inTree.has(b)) continue;
        const d = hexDistance(cities[a]!.hex, cities[b]!.hex);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    }
    edges.push(best!);
    inTree.add(best![1]);
  }
  return edges;
}

export function buildRoads(rng: RngState, map: MapState, cities: readonly CitySite[]): [Hex, Hex][] {
  const links = spanningTree(cities);
  const linked = new Set(links.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));

  // Extra links for loops: short pairs not already linked, a random few of them.
  const extras: [number, number][] = [];
  for (let a = 0; a < cities.length; a++) {
    for (let b = a + 1; b < cities.length; b++) {
      const d = hexDistance(cities[a]!.hex, cities[b]!.hex);
      if (d <= 11 && !linked.has(`${a}-${b}`)) extras.push([a, b]);
    }
  }
  const extraCount = Math.round(cities.length / 4);
  links.push(...shuffle(rng, extras).slice(0, extraCount));

  // Lay short links first, so longer roads can join and reuse them.
  links.sort((x, y) =>
    hexDistance(cities[x[0]]!.hex, cities[x[1]]!.hex) - hexDistance(cities[y[0]]!.hex, cities[y[1]]!.hex));

  const isRiver = (i: number): boolean => map.tiles[i]!.terrain === 'river';
  const segments = new Map<string, [Hex, Hex]>();

  for (const [a, b] of links) {
    const start = hexToIndex(map, cities[a]!.hex);
    const goal = hexToIndex(map, cities[b]!.hex);
    const goalHex = cities[b]!.hex;
    const result = aStar({
      start,
      goal,
      neighbors: (i) => neighborIndices(map, i),
      cost: (from, to) => {
        const t = map.tiles[to]!;
        if (t.terrain === 'mountains') return null;
        // A bridge is exactly one river hex: you can't step from river to river.
        if (isRiver(from) && isRiver(to)) return null;
        if (t.road) return COST_EXISTING_ROAD;
        if (t.terrain === 'river') return COST_NEW_BRIDGE;
        return t.terrain === 'forest' ? COST_FOREST : COST_PLAINS;
      },
      heuristic: (i) => hexDistance(indexToHex(map, i), goalHex) * COST_EXISTING_ROAD,
    });
    if (!result) throw new MapGenFailure(`cities ${a} and ${b} can't be linked by road`);
    for (let k = 0; k < result.path.length; k++) {
      const i = result.path[k]!;
      map.tiles[i]!.road = true;
      if (k > 0) {
        const j = result.path[k - 1]!;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!segments.has(key)) segments.set(key, [indexToHex(map, j), indexToHex(map, i)]);
      }
    }
  }
  return [...segments.values()];
}
