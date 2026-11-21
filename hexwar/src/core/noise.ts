/**
 * Seeded 2D value noise, used by the map generator.
 *
 * Value noise: put a random value at every integer grid point, then smoothly
 * blend between the four nearest points. That gives one soft "lumpy" layer.
 * Fractal noise (fbm) stacks several layers ("octaves"), each at twice the
 * detail and half the strength, so you get big shapes with small wobbles on
 * top. That's what makes terrain look natural instead of blobby.
 *
 * Ridged noise folds the values around the middle (1 - |2n - 1|), which turns
 * soft hills into sharp lines. That's what we use for mountain ranges.
 */

import { nextUint32, type RngState } from './rng.ts';

export type Noise2D = (x: number, y: number) => number; // returns roughly [0, 1]

export function createValueNoise(rng: RngState): Noise2D {
  const SIZE = 256;
  const MASK = SIZE - 1;
  const values = new Float64Array(SIZE);
  const perm = new Uint8Array(SIZE * 2);
  for (let i = 0; i < SIZE; i++) values[i] = nextUint32(rng) / 4294967296;
  const p = Array.from({ length: SIZE }, (_, i) => i);
  for (let i = SIZE - 1; i > 0; i--) {
    const j = nextUint32(rng) % (i + 1);
    [p[i], p[j]] = [p[j] as number, p[i] as number];
  }
  for (let i = 0; i < SIZE * 2; i++) perm[i] = p[i & MASK] as number;

  const lattice = (ix: number, iy: number): number =>
    values[perm[(perm[ix & MASK] as number) + (iy & MASK)] as number] as number;
  const smooth = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const a = lattice(x0, y0);
    const b = lattice(x0 + 1, y0);
    const c = lattice(x0, y0 + 1);
    const d = lattice(x0 + 1, y0 + 1);
    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;
    return top + (bottom - top) * ty;
  };
}

/** Fractal noise: several octaves of a base noise added together, normalized to ~[0, 1]. */
export function fbm(noise: Noise2D, x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq + o * 31.7, y * freq + o * 17.3) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Ridged fractal noise: high values form thin connected lines (mountain ranges). */
export function ridged(noise: Noise2D, x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = noise(x * freq + o * 13.1, y * freq + o * 47.9);
    sum += (1 - Math.abs(2 * n - 1)) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
