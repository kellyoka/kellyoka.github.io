/**
 * Steps 3, 4 and 6: where cities and ruins go.
 *
 * Fairness is the hard part. Starts must be far apart and on decent land,
 * and neutral cities are placed so neither player ends up with noticeably
 * more of them nearby.
 */

import { edgeDistance, hexDistance, hexesInRange, indexToHex, neighbors, type Hex } from '../hex.ts';
import { tileAt, type MapState } from '../map.ts';
import { TERRAIN } from '../../data/terrain.ts';
import { CITY_NAMES } from '../../data/names.ts';
import { randInt, random, shuffle, type RngState } from '../rng.ts';
import { MapGenFailure, type CitySite, type MapGenOptions, type RuinSite } from './types.ts';

interface Candidate {
  hex: Hex;
  quality: number;
  plains: number;
  riverOrForest: number;
}

/** Score the land a city here could work (radius 2), using terrain yields. */
function evaluate(map: MapState, h: Hex): Candidate {
  let quality = 0;
  let plains = 0;
  let riverOrForest = 0;
  for (const n of hexesInRange(h, 2)) {
    if (n.q === h.q && n.r === h.r) continue;
    const t = tileAt(map, n);
    if (!t) continue;
    const def = TERRAIN[t.terrain];
    quality += def.food * 1.2 + def.production + def.gold * 0.8;
    if (t.terrain === 'plains') plains++;
    if (t.terrain === 'river' || t.terrain === 'forest') riverOrForest++;
  }
  return { hex: h, quality, plains, riverOrForest };
}

function cityCandidates(map: MapState): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    const h = indexToHex(map, i);
    const t = map.tiles[i]!;
    if (!TERRAIN[t.terrain].cityAllowed) continue;
    if (edgeDistance(map, h) < 2) continue;
    // A city needs a passable neighbor, or it could never be entered or left.
    if (!neighbors(h).some((n) => { const nt = tileAt(map, n); return nt && TERRAIN[nt.terrain].cityAllowed; })) continue;
    out.push(evaluate(map, h));
  }
  return out;
}

export function placeCities(opts: MapGenOptions, rng: RngState, map: MapState): CitySite[] {
  const all = cityCandidates(map);

  // --- Starts: the best-scoring far-apart pair from a random sample of good spots.
  const good = shuffle(rng, all.filter((c) => c.plains >= 6 && c.riverOrForest >= 1)).slice(0, 80);
  let bestPair: [Candidate, Candidate] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < good.length; i++) {
    for (let j = i + 1; j < good.length; j++) {
      const a = good[i]!;
      const b = good[j]!;
      const d = hexDistance(a.hex, b.hex);
      if (d < opts.startSpacing) continue;
      // Prefer distance, good land, and two starts of *similar* quality.
      const score = d + (a.quality + b.quality) * 0.15 - Math.abs(a.quality - b.quality) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestPair = [a, b];
      }
    }
  }
  if (!bestPair) throw new MapGenFailure('no fair pair of starting positions');

  const names = shuffle(rng, CITY_NAMES);
  let nameIndex = 0;
  const nextName = (): string => names[nameIndex++ % names.length]!;

  const starts = bestPair.map((c) => c.hex);
  const cities: CitySite[] = starts.map((h, p) => ({ hex: h, name: nextName(), start: p }));

  // --- Neutral cities: best land first (with jitter), respecting spacing, balanced between players.
  const target = randInt(rng, opts.neutralCities[0], opts.neutralCities[1]);
  const ranked = all
    .map((c) => ({ c, score: c.quality + random(rng) * 12 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);

  const side = (h: Hex): 0 | 1 | null => {
    const d0 = hexDistance(h, starts[0]!);
    const d1 = hexDistance(h, starts[1]!);
    return d0 < d1 ? 0 : d1 < d0 ? 1 : null;
  };
  const sideCount = [0, 0];

  for (const c of ranked) {
    if (cities.length - 2 >= target) break;
    if (cities.some((x) => hexDistance(x.hex, c.hex) < opts.citySpacing)) continue;
    if (starts.some((s) => hexDistance(s, c.hex) < opts.citySpacing + 1)) continue;
    const s = side(c.hex);
    // If one side is already 2 ahead, only accept cities on the other side (or exactly between).
    if (s !== null && sideCount[s]! - sideCount[1 - s]! >= 2) continue;
    if (s !== null) sideCount[s]!++;
    cities.push({ hex: c.hex, name: nextName(), start: null });
  }

  if (cities.length - 2 < opts.neutralCities[0]) throw new MapGenFailure('not enough room for neutral cities');
  if (Math.abs(sideCount[0]! - sideCount[1]!) > 2) throw new MapGenFailure('neutral cities unbalanced');
  return cities;
}

export function placeRuins(
  opts: MapGenOptions,
  rng: RngState,
  map: MapState,
  cities: readonly CitySite[],
): RuinSite[] {
  const starts = cities.filter((c) => c.start !== null).map((c) => c.hex);
  const target = randInt(rng, opts.ruins[0], opts.ruins[1]);

  const candidates: { hex: Hex; score: number }[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    const t = map.tiles[i]!;
    if (t.road || (t.terrain !== 'plains' && t.terrain !== 'forest')) continue;
    const h = indexToHex(map, i);
    if (edgeDistance(map, h) < 1) continue;
    if (cities.some((c) => hexDistance(c.hex, h) < 4)) continue;
    if (starts.some((s) => hexDistance(s, h) < 7)) continue;
    const nearRoad = neighbors(h).some((n) => tileAt(map, n)?.road);
    const score = random(rng) + (nearRoad ? -0.6 : 0) + (t.terrain === 'forest' ? 0.25 : 0);
    candidates.push({ hex: h, score });
  }
  candidates.sort((a, b) => b.score - a.score);

  const picked: Hex[] = [];
  for (const c of candidates) {
    if (picked.length >= target) break;
    if (picked.some((p) => hexDistance(p, c.hex) < 4)) continue;
    picked.push(c.hex);
  }
  if (picked.length < opts.ruins[0]) throw new MapGenFailure('not enough room for ruins');

  // The sites farthest from both starts become lairs (tougher, richer).
  const lairCount = Math.round(picked.length * opts.lairShare);
  const byRemoteness = [...picked].sort(
    (a, b) => Math.min(...starts.map((s) => hexDistance(s, b))) - Math.min(...starts.map((s) => hexDistance(s, a))),
  );
  const lairs = new Set(byRemoteness.slice(0, lairCount));
  return picked.map((h) => ({ hex: h, kind: lairs.has(h) ? 'lair' : 'ruin' }));
}
