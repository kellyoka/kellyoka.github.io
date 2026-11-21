/**
 * Seeded pseudo-random number generator (sfc32).
 *
 * Why not Math.random(): it can't be seeded or saved. Every random decision
 * in the rules (map generation now, combat rolls later) draws from this
 * generator instead. Its whole state is four 32-bit numbers in a plain
 * object, so it can live inside GameState, be saved to JSON, and be cloned.
 * The same seed plus the same commands then always replays the same game.
 *
 * The functions take the state object and advance it in place. Cloning the
 * game state clones the RNG too, so an AI "what if" simulation never
 * disturbs the real game's dice.
 */

export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Create a generator from any integer seed. */
export function createRng(seed: number): RngState {
  // splitmix32 spreads the seed bits out so seeds 1, 2, 3... don't start out
  // looking similar to each other.
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const rng: RngState = { a: next(), b: next(), c: next(), d: next() };
  for (let i = 0; i < 12; i++) nextUint32(rng); // warm up
  return rng;
}

export function nextUint32(rng: RngState): number {
  const t = (((rng.a + rng.b) >>> 0) + rng.d) >>> 0;
  rng.d = (rng.d + 1) >>> 0;
  rng.a = rng.b ^ (rng.b >>> 9);
  rng.b = (rng.c + (rng.c << 3)) >>> 0;
  rng.c = ((rng.c << 21) | (rng.c >>> 11)) >>> 0;
  rng.c = (rng.c + t) >>> 0;
  return t;
}

/** Float in [0, 1). */
export function random(rng: RngState): number {
  return nextUint32(rng) / 4294967296;
}

/** Integer in [min, max], both inclusive. */
export function randInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(random(rng) * (max - min + 1));
}

export function chance(rng: RngState, probability: number): boolean {
  return random(rng) < probability;
}

export function pick<T>(rng: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() from an empty list');
  return items[Math.floor(random(rng) * items.length)] as T;
}

/** Shuffled copy (Fisher–Yates). */
export function shuffle<T>(rng: RngState, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(rng) * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function cloneRng(rng: RngState): RngState {
  return { ...rng };
}
