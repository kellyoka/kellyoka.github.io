/**
 * Step 1: terrain. Mountains from ridged noise (thin ranges), forest from
 * smooth noise (patches), everything else plains. Also returns a "height"
 * field that rivers use to run downhill.
 */

import { hexToOffset, indexToHex } from '../hex.ts';
import type { MapState, Tile } from '../map.ts';
import { createValueNoise, fbm, ridged } from '../noise.ts';
import type { RngState } from '../rng.ts';
import type { MapGenOptions } from './types.ts';

/** Noise sample position for a tile, in roughly square units so noise isn't stretched. */
function noisePos(map: MapState, index: number): [number, number] {
  const { col, row } = hexToOffset(indexToHex(map, index));
  return [col + (row & 1) * 0.5, row * 0.866];
}

/** Value at the given quantile (0..1) of a list. Used to hit exact terrain shares. */
function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[i]!;
}

export function generateTerrain(
  opts: MapGenOptions,
  rng: RngState,
): { map: MapState; height: Float64Array } {
  const count = opts.width * opts.height;
  const map: MapState = {
    width: opts.width,
    height: opts.height,
    tiles: Array.from({ length: count }, (): Tile => ({ terrain: 'plains', road: false })),
  };

  const ridgeNoise = createValueNoise(rng);
  const heightNoise = createValueNoise(rng);
  const forestNoise = createValueNoise(rng);

  const ridge = new Float64Array(count);
  const height = new Float64Array(count);
  const forest = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const [x, y] = noisePos(map, i);
    ridge[i] = ridged(ridgeNoise, x / 13, y / 13, 2);
    height[i] = 0.55 * ridge[i]! + 0.45 * fbm(heightNoise, x / 14, y / 14, 3);
    forest[i] = fbm(forestNoise, x / 6, y / 6, 3);
  }

  // Thresholds chosen by quantile, so every map gets the configured share
  // of mountains and forest regardless of how the noise happened to fall.
  const mountainCut = quantile(Array.from(ridge), 1 - opts.mountainShare);
  for (let i = 0; i < count; i++) if (ridge[i]! >= mountainCut) map.tiles[i]!.terrain = 'mountains';

  const lowland: number[] = [];
  for (let i = 0; i < count; i++) if (map.tiles[i]!.terrain !== 'mountains') lowland.push(forest[i]!);
  const forestCut = quantile(lowland, 1 - opts.forestShare);
  for (let i = 0; i < count; i++) {
    const t = map.tiles[i]!;
    if (t.terrain !== 'mountains' && forest[i]! >= forestCut) t.terrain = 'forest';
  }

  return { map, height };
}
