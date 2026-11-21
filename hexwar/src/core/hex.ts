/**
 * Hex grid math. Pointy-top hexes, axial coordinates (q, r).
 *
 * Why axial: every hex has six neighbors at the same six fixed offsets, and
 * distance is a simple formula. That's not true with "offset" (row/column)
 * coordinates, where the neighbor offsets change on odd and even rows.
 *
 * We still *store* the map as a rectangle of rows and columns (odd-r offset
 * layout: odd rows are shoved half a hex to the right) because a rectangular
 * map is what players expect to see. The two helpers below convert between
 * the storage view and the math view.
 *
 * Cube coordinates are axial with a third value s = -q - r. They're used for
 * rounding and lines. Reference: Red Blob Games, "Hexagonal Grids".
 */

export interface Hex {
  readonly q: number;
  readonly r: number;
}

export const hex = (q: number, r: number): Hex => ({ q, r });

export const hexEquals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;

export const hexKey = (h: Hex): string => `${h.q},${h.r}`;

/** The six neighbor directions, starting east and going counter-clockwise. */
export const DIRECTIONS: readonly Hex[] = [
  hex(1, 0),
  hex(1, -1),
  hex(0, -1),
  hex(-1, 0),
  hex(-1, 1),
  hex(0, 1),
];

export const hexAdd = (a: Hex, b: Hex): Hex => hex(a.q + b.q, a.r + b.r);

export function neighbors(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => hexAdd(h, d));
}

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** All hexes within `radius` steps of `center`, including the center. */
export function hexesInRange(center: Hex, radius: number): Hex[] {
  const out: Hex[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    const rMin = Math.max(-radius, -dq - radius);
    const rMax = Math.min(radius, -dq + radius);
    for (let dr = rMin; dr <= rMax; dr++) out.push(hex(center.q + dq, center.r + dr));
  }
  return out;
}

/** Round fractional axial coordinates to the nearest real hex (used for mouse picking). */
export function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  // Fix whichever coordinate had the largest rounding error so q + r + s = 0.
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return hex(rq + 0, rr + 0); // "+ 0" turns -0 into 0, so keys and equality stay clean
}

// ---------------------------------------------------------------------------
// Offset (storage) <-> axial (math) conversion, odd-r layout.
// ---------------------------------------------------------------------------

export interface Offset {
  col: number;
  row: number;
}

export function offsetToHex(col: number, row: number): Hex {
  return hex(col - (row - (row & 1)) / 2, row);
}

export function hexToOffset(h: Hex): Offset {
  return { col: h.q + (h.r - (h.r & 1)) / 2, row: h.r };
}

/** Dimensions of a rectangular map, plus index helpers for flat tile arrays. */
export interface Grid {
  readonly width: number;
  readonly height: number;
}

export function inBounds(grid: Grid, h: Hex): boolean {
  const { col, row } = hexToOffset(h);
  return col >= 0 && col < grid.width && row >= 0 && row < grid.height;
}

/** Flat array index for a hex, or -1 if it's off the map. */
export function hexToIndex(grid: Grid, h: Hex): number {
  const { col, row } = hexToOffset(h);
  if (col < 0 || col >= grid.width || row < 0 || row >= grid.height) return -1;
  return row * grid.width + col;
}

export function indexToHex(grid: Grid, index: number): Hex {
  const row = Math.floor(index / grid.width);
  const col = index - row * grid.width;
  return offsetToHex(col, row);
}

/** Neighbor indices of a tile, skipping any that fall off the map. */
export function neighborIndices(grid: Grid, index: number): number[] {
  const h = indexToHex(grid, index);
  const out: number[] = [];
  for (const d of DIRECTIONS) {
    const i = hexToIndex(grid, hexAdd(h, d));
    if (i >= 0) out.push(i);
  }
  return out;
}

/** How many steps a hex is from the nearest map edge (0 = on the edge). */
export function edgeDistance(grid: Grid, h: Hex): number {
  const { col, row } = hexToOffset(h);
  return Math.min(col, row, grid.width - 1 - col, grid.height - 1 - row);
}
