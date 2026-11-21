/**
 * Entry point: wires the browser (mouse, keyboard, buttons, URL) to the map
 * generator and the renderer.
 *
 * This file is the only place that touches Math.random(), and only to pick
 * a fresh seed. Once there's a seed, everything else is deterministic, and
 * the seed goes into the URL (?seed=123) so you can share or reload a map.
 */

import { generateMap, type GeneratedMap } from './core/mapgen/index.ts';
import { MapRenderer } from './render/mapRenderer.ts';
import { describeHex } from './ui/hoverInfo.ts';

const canvas = document.getElementById('map') as HTMLCanvasElement;
const seedInput = document.getElementById('seed') as HTMLInputElement;
const applyBtn = document.getElementById('apply-seed') as HTMLButtonElement;
const randomBtn = document.getElementById('random-seed') as HTMLButtonElement;
const statsEl = document.getElementById('stats') as HTMLElement;
const hoverEl = document.getElementById('hover-info') as HTMLElement;
const legendEl = document.getElementById('legend') as HTMLElement;
const legendBtn = document.getElementById('toggle-legend') as HTMLButtonElement;

const renderer = new MapRenderer(canvas);
let current: GeneratedMap | null = null;

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function load(seed: number): void {
  const t0 = performance.now();
  current = generateMap(seed);
  const ms = performance.now() - t0;
  renderer.setMap(current);
  seedInput.value = String(current.seed);

  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(current.seed));
  history.replaceState(null, '', url);

  const bridges = current.map.tiles.filter((t) => t.terrain === 'river' && t.road).length;
  const retried = current.attempts > 1 ? ` (seed ${current.requestedSeed} was unusable, used ${current.seed})` : '';
  const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
  statsEl.textContent =
    `${plural(current.cities.length, 'city', 'cities')} · ${plural(current.rivers.length, 'river')} · ` +
    `${plural(bridges, 'bridge')} · ${current.ruins.length} ruins & lairs · generated in ${ms.toFixed(0)} ms${retried}`;
  hoverEl.innerHTML = '';
}

// --- Window size -----------------------------------------------------------
const onResize = (): void => renderer.resize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', onResize);
onResize();

// --- Pan (drag) and hover --------------------------------------------------
let drag: { x: number; y: number; moved: boolean } | null = null;

canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: false };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      drag.moved = true;
      canvas.classList.add('dragging');
    }
    if (drag.moved) {
      renderer.camera.pan(dx, dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      renderer.requestDraw();
    }
  }
  const h = renderer.hexAtScreen({ x: e.clientX, y: e.clientY });
  renderer.setHover(h);
  hoverEl.innerHTML = h && current ? describeHex(current, h) : '';
});

const endDrag = (): void => {
  drag = null;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => {
  renderer.setHover(null);
  hoverEl.innerHTML = '';
});

// --- Zoom (wheel, around the cursor) ----------------------------------------
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    renderer.camera.zoomAt({ x: e.clientX, y: e.clientY }, factor);
    renderer.requestDraw();
  },
  { passive: false },
);

// --- Keyboard --------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  if (e.key === 'f' || e.key === 'F') renderer.fit();
  else if (e.key === 'l' || e.key === 'L') legendEl.hidden = !legendEl.hidden;
  else if (e.key === '+' || e.key === '=') renderer.camera.zoomAt(center, 1.2);
  else if (e.key === '-' || e.key === '_') renderer.camera.zoomAt(center, 1 / 1.2);
  else return;
  renderer.requestDraw();
});

// --- Seed controls -----------------------------------------------------------
applyBtn.addEventListener('click', () => {
  const n = Number(seedInput.value);
  load(Number.isFinite(n) ? n : randomSeed());
});
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyBtn.click();
});
randomBtn.addEventListener('click', () => load(randomSeed()));
legendBtn.addEventListener('click', () => {
  legendEl.hidden = !legendEl.hidden;
});

// --- Start -----------------------------------------------------------------
const fromUrl = Number(new URL(window.location.href).searchParams.get('seed'));
load(Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : randomSeed());
