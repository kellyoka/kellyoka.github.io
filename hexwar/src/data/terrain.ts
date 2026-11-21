/**
 * Terrain definitions. Balance numbers live here, not in the rules code.
 *
 * Movement is in HALF-POINTS: a cost of 2 = one whole move. Roads cost 1
 * (half a move). Storing whole numbers avoids floating-point drift when we
 * add up path costs (0.5 + 0.5 + ... can end up as 2.9999999).
 * `null` means impassable.
 */

export type TerrainId = 'plains' | 'forest' | 'mountains' | 'river';

export interface TerrainDef {
  id: TerrainId;
  name: string;
  /** Half-points to enter, or null if impassable. */
  moveCost: number | null;
  food: number;
  production: number;
  gold: number;
  /** Bonus strength for a stack defending here. */
  defense: number;
  /** Can a city be founded on this terrain? */
  cityAllowed: boolean;
}

export const TERRAIN: Record<TerrainId, TerrainDef> = {
  plains: {
    id: 'plains', name: 'Plains',
    moveCost: 2, food: 2, production: 1, gold: 0, defense: 0, cityAllowed: true,
  },
  forest: {
    id: 'forest', name: 'Forest',
    moveCost: 4, food: 1, production: 2, gold: 0, defense: 1, cityAllowed: true,
  },
  mountains: {
    id: 'mountains', name: 'Mountains',
    moveCost: null, food: 0, production: 1, gold: 1, defense: 0, cityAllowed: false,
  },
  river: {
    id: 'river', name: 'River',
    moveCost: null, food: 3, production: 0, gold: 1, defense: 0, cityAllowed: false,
  },
};

/** Moving along a road (or over a bridge) costs this many half-points, whatever the terrain. */
export const ROAD_MOVE_COST = 1;

/** Defense bonus for a stack standing on a bridge. */
export const BRIDGE_DEFENSE = 1;
