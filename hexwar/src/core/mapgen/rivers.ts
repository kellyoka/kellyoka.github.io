/**
 * Step 2: rivers. Each river starts beside a mountain and walks to the
 * nearest map edge, preferring lower ground, with some random wobble and a
 * bit of "momentum" so it meanders instead of zig-zagging.
 *
 * A river is a one-hex-wide line of river tiles. To keep it one hex wide,
 * a new river tile may only touch the tile it came from. It can't touch any
 * other river tile, including earlier parts of itself or other rivers.
 */

import { DIRECTIONS, edgeDistance, hexAdd, hexDistance, hexToIndex, hexToOffset, indexToHex, neighborIndices, type Hex } from '../hex.ts';
import type { MapState } from '../map.ts';
import { randInt, random, shuffle, type RngState } from '../rng.ts';
import type { MapGenOptions } from './types.ts';

type Edge = 'top' | 'bottom' | 'left' | 'right';

function distToEdge(map: MapState, h: Hex, edge: Edge): number {
  const { col, row } = hexToOffset(h);
  switch (edge) {
    case 'top': return row;
    case 'bottom': return map.height - 1 - row;
    case 'left': return col;
    case 'right': return map.width - 1 - col;
  }
}

function nearestEdge(map: MapState, h: Hex): Edge {
  const edges: Edge[] = ['top', 'bottom', 'left', 'right'];
  return edges.reduce((best, e) => (distToEdge(map, h, e) < distToEdge(map, h, best) ? e : best));
}

export function generateRivers(
  opts: MapGenOptions,
  rng: RngState,
  map: MapState,
  height: Float64Array,
): Hex[][] {
  const target = randInt(rng, opts.riverCount[0], opts.riverCount[1]);
  const isRiver = (i: number): boolean => map.tiles[i]!.terrain === 'river';
  const isMountain = (i: number): boolean => map.tiles[i]!.terrain === 'mountains';

  // Candidate sources: lowland tiles next to mountains, away from the edges, highest first.
  const sources: number[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    if (isMountain(i)) continue;
    if (edgeDistance(map, indexToHex(map, i)) < 7) continue;
    if (neighborIndices(map, i).some(isMountain)) sources.push(i);
  }
  const ordered = shuffle(rng, sources).sort((a, b) => height[b]! - height[a]!);

  const rivers: Hex[][] = [];
  const usedSources: Hex[] = [];

  for (const src of ordered) {
    if (rivers.length >= target) break;
    const srcHex = indexToHex(map, src);
    if (usedSources.some((u) => hexDistance(u, srcHex) < 10)) continue;
    if (isRiver(src) || neighborIndices(map, src).some(isRiver)) continue;

    const path = walkRiver(map, rng, height, src);
    if (path) {
      for (const i of path) map.tiles[i]!.terrain = 'river';
      rivers.push(path.map((i) => indexToHex(map, i)));
      usedSources.push(srcHex);
    }
  }
  return rivers;
}

/** Walk from `src` to the nearest edge. Returns tile indices, or null if the river got stuck. */
function walkRiver(map: MapState, rng: RngState, height: Float64Array, src: number): number[] | null {
  const edge = nearestEdge(map, indexToHex(map, src));
  const path = [src];
  const inPath = new Set(path);
  let lastDir = -1;

  for (let step = 0; step < 90; step++) {
    const cur = path[path.length - 1]!;
    const curHex = indexToHex(map, cur);
    if (distToEdge(map, curHex, edge) === 0) return path.length >= 8 ? path : null;

    let best = -1;
    let bestScore = -Infinity;
    let bestDir = -1;
    for (let d = 0; d < 6; d++) {
      const nHex = hexAdd(curHex, DIRECTIONS[d]!);
      const n = hexToIndex(map, nHex);
      if (n < 0 || inPath.has(n)) continue;
      const t = map.tiles[n]!;
      if (t.terrain === 'mountains' || t.terrain === 'river') continue;
      // Stay one hex wide: the new tile may touch only `cur` among river/path tiles.
      const touches = neighborIndices(map, n).some(
        (m) => m !== cur && (inPath.has(m) || map.tiles[m]!.terrain === 'river'),
      );
      if (touches) continue;

      const progress = distToEdge(map, curHex, edge) - distToEdge(map, nHex, edge); // -1, 0 or +1
      const downhill = height[cur]! - height[n]!;
      const momentum = d === lastDir ? 0.35 : 0;
      const score = progress * 1.0 + downhill * 3 + momentum + random(rng) * 0.9;
      if (score > bestScore) {
        bestScore = score;
        best = n;
        bestDir = d;
      }
    }
    if (best < 0) return null; // boxed in
    path.push(best);
    inPath.add(best);
    lastDir = bestDir;
  }
  return null;
}
