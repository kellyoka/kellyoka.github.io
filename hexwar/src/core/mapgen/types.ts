import type { Hex } from '../hex.ts';
import type { MapState } from '../map.ts';

export interface MapGenOptions {
  width: number;
  height: number;
  /** Share of tiles that become mountains (0..1). */
  mountainShare: number;
  /** Share of the remaining (non-mountain) tiles that become forest. */
  forestShare: number;
  riverCount: [min: number, max: number];
  neutralCities: [min: number, max: number];
  ruins: [min: number, max: number];
  /** Share of ruin sites that are tougher, richer lairs. */
  lairShare: number;
  /** Minimum hex distance between any two cities. */
  citySpacing: number;
  /** Minimum hex distance between the two starting cities. */
  startSpacing: number;
  /** How many seeds to try (seed, seed+1, ...) before giving up. */
  maxAttempts: number;
}

export const DEFAULT_MAPGEN: MapGenOptions = {
  width: 40,
  height: 40,
  mountainShare: 0.12,
  forestShare: 0.28,
  riverCount: [3, 5],
  neutralCities: [12, 16],
  ruins: [8, 12],
  lairShare: 0.35,
  citySpacing: 5,
  startSpacing: 25,
  maxAttempts: 50,
};

export interface CitySite {
  hex: Hex;
  name: string;
  /** Player index (0 = you, 1 = AI) for a starting city; null for a neutral city. */
  start: number | null;
}

export interface RuinSite {
  hex: Hex;
  kind: 'ruin' | 'lair';
}

export interface GeneratedMap {
  /** The seed you asked for. */
  requestedSeed: number;
  /** The seed that actually produced this map (requested + retries). */
  seed: number;
  attempts: number;
  map: MapState;
  cities: CitySite[];
  ruins: RuinSite[];
  /** Each river as an ordered list of hexes from source to map edge (for drawing). */
  rivers: Hex[][];
  /** Road segments as pairs of adjacent hexes (for drawing; movement only looks at tile.road). */
  roadSegments: [Hex, Hex][];
}

/** Thrown inside one attempt when a map turns out unusable; the generator retries. */
export class MapGenFailure extends Error {}
