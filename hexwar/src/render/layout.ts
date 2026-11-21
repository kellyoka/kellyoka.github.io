/**
 * Converting between hexes and "world" pixels (before camera zoom/pan).
 * Pointy-top layout: each row is offset by half a hex, and rows are 1.5 hex
 * radii apart vertically.
 */

import { hexRound, type Hex } from '../core/hex.ts';

/** Hex radius (center to corner) in world units. */
export const HEX_SIZE = 24;
const SQRT3 = Math.sqrt(3);

export interface Point {
  x: number;
  y: number;
}

export function hexToWorld(h: Hex): Point {
  return {
    x: HEX_SIZE * SQRT3 * (h.q + h.r / 2),
    y: HEX_SIZE * 1.5 * h.r,
  };
}

export function worldToHex(p: Point): Hex {
  const q = ((SQRT3 / 3) * p.x - (1 / 3) * p.y) / HEX_SIZE;
  const r = ((2 / 3) * p.y) / HEX_SIZE;
  return hexRound(q, r);
}

/** The six corners of a pointy-top hex, relative to its center. */
export const HEX_CORNERS: readonly Point[] = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return { x: HEX_SIZE * Math.cos(angle), y: HEX_SIZE * Math.sin(angle) };
});

export const HEX_WIDTH = SQRT3 * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;
