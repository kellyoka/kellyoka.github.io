/** Builds the text for the hover panel: everything the rules know about one hex. */

import { hexEquals, hexToOffset, type Hex } from '../core/hex.ts';
import type { GeneratedMap } from '../core/mapgen/index.ts';
import { isBridge, moveCost, tileAt } from '../core/map.ts';
import { BRIDGE_DEFENSE, TERRAIN } from '../data/terrain.ts';

const escape = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function movesText(halfPoints: number | null): string {
  if (halfPoints === null) return 'impassable';
  const moves = halfPoints / 2;
  const label = moves === 0.5 ? '½' : String(moves);
  return `${label} move${moves === 1 || moves === 0.5 ? '' : 's'}`;
}

export function describeHex(data: GeneratedMap, h: Hex): string {
  const t = tileAt(data.map, h);
  if (!t) return '';
  const def = TERRAIN[t.terrain];
  const { col, row } = hexToOffset(h);
  const bridge = isBridge(t);

  const name = bridge ? 'Bridge over river' : t.road ? `${def.name} with road` : def.name;
  const defense = bridge ? BRIDGE_DEFENSE : def.defense;
  const lines = [
    `<div class="hi-title">${escape(name)}</div>`,
    `<div>Movement: <b>${movesText(moveCost(t))}</b>${defense ? ` · Defense <b>+${defense}</b>` : ''}</div>`,
    `<div>Yields when worked: food ${def.food} · prod ${def.production} · gold ${def.gold}</div>`,
  ];

  const city = data.cities.find((c) => hexEquals(c.hex, h));
  if (city) {
    const owner = city.start === 0 ? 'your start' : city.start === 1 ? 'AI start' : 'neutral';
    lines.push(`<div class="hi-feature">City: <b>${escape(city.name)}</b> (${owner})</div>`);
  }
  const ruin = data.ruins.find((r) => hexEquals(r.hex, h));
  if (ruin) {
    lines.push(`<div class="hi-feature">${ruin.kind === 'lair' ? 'Lair (dangerous, rich)' : 'Ruin'}: heroes can search here</div>`);
  }
  lines.push(`<div class="hi-coords">axial (${h.q}, ${h.r}) · col ${col}, row ${row}</div>`);
  return lines.join('');
}
