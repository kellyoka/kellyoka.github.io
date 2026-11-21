/**
 * Map state: the part of GameState that describes the land itself.
 * Plain data only, so it serializes straight to JSON for saves.
 */

import type { Grid, Hex } from './hex.ts';
import { hexToIndex } from './hex.ts';
import { ROAD_MOVE_COST, TERRAIN, type TerrainId } from '../data/terrain.ts';

export interface Tile {
  terrain: TerrainId;
  /** A road on a river tile is a bridge. */
  road: boolean;
}

export interface MapState extends Grid {
  /** One tile per hex, row by row. Index with hexToIndex(map, hex). */
  tiles: Tile[];
}

export function tileAt(map: MapState, h: Hex): Tile | undefined {
  const i = hexToIndex(map, h);
  return i < 0 ? undefined : map.tiles[i];
}

export const isBridge = (t: Tile): boolean => t.terrain === 'river' && t.road;

/** Half-points needed to enter this tile, or null if it can't be entered. */
export function moveCost(t: Tile): number | null {
  if (t.road) return ROAD_MOVE_COST; // roads on plains/forest, and bridges over rivers
  return TERRAIN[t.terrain].moveCost;
}

export const isPassable = (t: Tile): boolean => moveCost(t) !== null;
