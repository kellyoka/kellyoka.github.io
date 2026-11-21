/**
 * Draws a generated map on a <canvas> with the browser's built-in 2D API.
 *
 * Placeholder art: flat colors and simple shapes. Everything about *looks*
 * lives in this folder, so swapping in real tiles later doesn't touch the
 * rules.
 *
 * How drawing works: we set one canvas transform (camera zoom + pan, times
 * the screen's pixel ratio for sharpness), then draw everything in world
 * coordinates. Each frame redraws only hexes inside the visible area.
 * 1,600 hexes is cheap for Canvas 2D. If we later need hundreds of animated
 * units at once, this file is the one to swap for a GPU renderer like PixiJS.
 */

import { hexToIndex, indexToHex, type Hex } from '../core/hex.ts';
import type { GeneratedMap } from '../core/mapgen/index.ts';
import type { Tile } from '../core/map.ts';
import { Camera, type Bounds } from './camera.ts';
import { HEX_CORNERS, HEX_SIZE, hexToWorld, worldToHex, type Point } from './layout.ts';

const COLORS = {
  background: '#1d2228',
  plains: '#cfd88f',
  forest: '#a9c47a',
  tree: '#3f7a3a',
  treeDark: '#2d5c2a',
  mountains: '#a8a198',
  peak: '#746c63',
  snow: '#f3f1ec',
  riverbank: '#b7d3a0',
  water: '#3d85c6',
  road: '#9b6b3c',
  bridge: '#6b4423',
  grid: 'rgba(40, 40, 30, 0.13)',
  hover: '#ffd84a',
  player: ['#d9483b', '#3b6fd9'] as const,
  neutral: '#ebe5d4',
  cityBorder: '#2b2b2b',
  ruin: '#7b7b85',
  lair: '#8c2f2f',
  label: '#1b1b1b',
  labelBg: 'rgba(255, 255, 255, 0.78)',
};

/** Tiny deterministic hash for decoration placement (not game randomness). */
function hash(n: number): number {
  let x = (n * 374761393) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export class MapRenderer {
  readonly camera = new Camera();
  private readonly ctx: CanvasRenderingContext2D;
  private data: GeneratedMap | null = null;
  private centers: Point[] = [];
  private worldBounds: Bounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  private hover: Hex | null = null;
  private frameRequested = false;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
  }

  setMap(data: GeneratedMap): void {
    this.data = data;
    const { map } = data;
    this.centers = map.tiles.map((_, i) => hexToWorld(indexToHex(map, i)));
    const xs = this.centers.map((p) => p.x);
    const ys = this.centers.map((p) => p.y);
    this.worldBounds = {
      minX: Math.min(...xs) - HEX_SIZE,
      minY: Math.min(...ys) - HEX_SIZE,
      maxX: Math.max(...xs) + HEX_SIZE,
      maxY: Math.max(...ys) + HEX_SIZE,
    };
    this.hover = null;
    this.fit();
  }

  /** Call when the window size changes. */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = width;
    this.cssHeight = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.requestDraw();
  }

  /** Screen space covered by UI panels, so "fit" keeps the map clear of them. */
  insets = { top: 64, right: 16, bottom: 16, left: 16 };

  fit(): void {
    this.camera.fit(this.worldBounds, this.cssWidth, this.cssHeight, this.insets);
    this.requestDraw();
  }

  /** Which map hex is under this screen point (null if off the map). */
  hexAtScreen(p: Point): Hex | null {
    if (!this.data) return null;
    const h = worldToHex(this.camera.screenToWorld(p));
    return hexToIndex(this.data.map, h) >= 0 ? h : null;
  }

  setHover(h: Hex | null): void {
    const same = h && this.hover ? h.q === this.hover.q && h.r === this.hover.r : h === this.hover;
    if (same) return;
    this.hover = h;
    this.requestDraw();
  }

  /** Batch redraws into the next animation frame (many mouse events → one draw). */
  requestDraw(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.draw();
    });
  }

  draw(): void {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.data) return;

    const cam = this.camera;
    ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * cam.offsetX, dpr * cam.offsetY);

    const view = cam.visibleWorld(this.cssWidth, this.cssHeight);
    const visible = this.visibleTiles(view);
    const { map } = this.data;

    for (const i of visible) this.drawTileBase(i, map.tiles[i]!);
    this.drawRivers();
    for (const i of visible) this.drawTileDecoration(i, map.tiles[i]!);
    this.drawGrid(visible);
    this.drawRoads();
    this.drawRuins();
    this.drawCities();
    if (this.hover) this.outlineHex(this.hover, COLORS.hover, 3 / cam.zoom);
  }

  private visibleTiles(view: Bounds): number[] {
    const out: number[] = [];
    const pad = HEX_SIZE;
    for (let i = 0; i < this.centers.length; i++) {
      const c = this.centers[i]!;
      if (c.x < view.minX - pad || c.x > view.maxX + pad || c.y < view.minY - pad || c.y > view.maxY + pad) continue;
      out.push(i);
    }
    return out;
  }

  private hexPath(center: Point, scale = 1): void {
    const { ctx } = this;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const c = HEX_CORNERS[k]!;
      const x = center.x + c.x * scale;
      const y = center.y + c.y * scale;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawTileBase(i: number, t: Tile): void {
    const { ctx } = this;
    const color =
      t.terrain === 'plains' ? COLORS.plains
      : t.terrain === 'forest' ? COLORS.forest
      : t.terrain === 'mountains' ? COLORS.mountains
      : COLORS.riverbank;
    this.hexPath(this.centers[i]!, 1.02); // slight overlap hides hairline gaps between hexes
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawTileDecoration(i: number, t: Tile): void {
    const c = this.centers[i]!;
    if (t.terrain === 'forest') this.drawTrees(c, i);
    else if (t.terrain === 'mountains') this.drawPeaks(c, i);
  }

  private drawTrees(c: Point, seed: number): void {
    const { ctx } = this;
    const spots: [number, number][] = [[-0.38, 0.2], [0.36, 0.18], [0, -0.3], [-0.05, 0.42]];
    for (let k = 0; k < spots.length; k++) {
      const [sx, sy] = spots[k]!;
      const jx = (hash(seed * 7 + k) - 0.5) * 0.18;
      const jy = (hash(seed * 13 + k) - 0.5) * 0.18;
      const x = c.x + (sx + jx) * HEX_SIZE;
      const y = c.y + (sy + jy) * HEX_SIZE;
      const s = HEX_SIZE * (0.22 + hash(seed * 3 + k) * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.3);
      ctx.lineTo(x + s * 0.8, y + s * 0.5);
      ctx.lineTo(x - s * 0.8, y + s * 0.5);
      ctx.closePath();
      ctx.fillStyle = k % 2 ? COLORS.treeDark : COLORS.tree;
      ctx.fill();
    }
  }

  private drawPeaks(c: Point, seed: number): void {
    const { ctx } = this;
    const peaks: [number, number, number][] = [[-0.28, 0.25, 0.55], [0.25, 0.3, 0.45]];
    for (const [ox, oy, size] of peaks) {
      const s = HEX_SIZE * (size + hash(seed + ox * 10) * 0.12);
      const x = c.x + ox * HEX_SIZE;
      const y = c.y + oy * HEX_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.25);
      ctx.lineTo(x + s * 0.85, y);
      ctx.lineTo(x - s * 0.85, y);
      ctx.closePath();
      ctx.fillStyle = COLORS.peak;
      ctx.fill();
      // snowcap
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.25);
      ctx.lineTo(x + s * 0.3, y - s * 0.8);
      ctx.lineTo(x - s * 0.3, y - s * 0.8);
      ctx.closePath();
      ctx.fillStyle = COLORS.snow;
      ctx.fill();
    }
  }

  /** Rivers as one smooth blue line through their hex centers, running off the map edge at the mouth. */
  private drawRivers(): void {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.water;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = HEX_SIZE * 0.75;
    for (const river of this.data!.rivers) {
      const pts = river.map(hexToWorld);
      if (pts.length < 2) continue;
      // Extend past the last hex so the river visibly runs off the map.
      const a = pts[pts.length - 2]!;
      const b = pts[pts.length - 1]!;
      pts.push({ x: b.x + (b.x - a.x), y: b.y + (b.y - a.y) });
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let k = 1; k < pts.length - 1; k++) {
        const mid = { x: (pts[k]!.x + pts[k + 1]!.x) / 2, y: (pts[k]!.y + pts[k + 1]!.y) / 2 };
        ctx.quadraticCurveTo(pts[k]!.x, pts[k]!.y, mid.x, mid.y);
      }
      ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
      ctx.stroke();
    }
  }

  private drawGrid(visible: number[]): void {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1 / this.camera.zoom;
    for (const i of visible) {
      this.hexPath(this.centers[i]!);
      ctx.stroke();
    }
  }

  private drawRoads(): void {
    const { ctx } = this;
    const { map, roadSegments } = this.data!;
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.road;
    ctx.lineWidth = HEX_SIZE * 0.16;
    ctx.beginPath();
    for (const [a, b] of roadSegments) {
      const pa = hexToWorld(a);
      const pb = hexToWorld(b);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();

    // Bridges: a wooden deck along the road direction across the river hex.
    for (const [a, b] of roadSegments) {
      for (const [h, other] of [[a, b], [b, a]] as const) {
        const t = map.tiles[hexToIndex(map, h)]!;
        if (t.terrain !== 'river') continue;
        const p = hexToWorld(h);
        const o = hexToWorld(other);
        const ang = Math.atan2(o.y - p.y, o.x - p.x);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.fillStyle = COLORS.bridge;
        ctx.fillRect(0, -HEX_SIZE * 0.2, HEX_SIZE * 0.9, HEX_SIZE * 0.4);
        ctx.fillStyle = COLORS.road;
        ctx.fillRect(0, -HEX_SIZE * 0.12, HEX_SIZE * 0.9, HEX_SIZE * 0.24);
        ctx.restore();
      }
    }
  }

  private drawRuins(): void {
    const { ctx } = this;
    for (const r of this.data!.ruins) {
      const c = hexToWorld(r.hex);
      const s = HEX_SIZE * 0.32;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - s);
      ctx.lineTo(c.x + s, c.y);
      ctx.lineTo(c.x, c.y + s);
      ctx.lineTo(c.x - s, c.y);
      ctx.closePath();
      ctx.fillStyle = r.kind === 'lair' ? COLORS.lair : COLORS.ruin;
      ctx.fill();
      ctx.lineWidth = HEX_SIZE * 0.07;
      ctx.strokeStyle = '#222';
      ctx.stroke();
    }
  }

  private drawCities(): void {
    const { ctx } = this;
    const showLabels = this.camera.zoom >= 0.55;
    for (const city of this.data!.cities) {
      const c = hexToWorld(city.hex);
      const s = HEX_SIZE * 0.5;
      ctx.fillStyle = city.start === null ? COLORS.neutral : COLORS.player[city.start as 0 | 1];
      ctx.strokeStyle = COLORS.cityBorder;
      ctx.lineWidth = HEX_SIZE * 0.09;
      // A little crenellated keep shape.
      ctx.beginPath();
      ctx.moveTo(c.x - s, c.y + s * 0.8);
      for (let k = 0; k < 3; k++) {
        // Three merlons (0.4s wide) with two gaps (0.4s wide) across the 2s top.
        const x0 = c.x - s + k * 0.8 * s;
        ctx.lineTo(x0, c.y - s * 0.9);
        ctx.lineTo(x0 + s * 0.4, c.y - s * 0.9);
        if (k < 2) {
          ctx.lineTo(x0 + s * 0.4, c.y - s * 0.6);
          ctx.lineTo(x0 + s * 0.8, c.y - s * 0.6);
        }
      }
      ctx.lineTo(c.x + s, c.y + s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (showLabels) {
        const fontPx = 11 / this.camera.zoom; // constant on-screen size at any zoom
        ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
        const pad = fontPx * 0.3;
        const w = ctx.measureText(city.name).width + pad * 2;
        const y = c.y + s * 0.8 + pad;
        ctx.fillStyle = COLORS.labelBg;
        ctx.fillRect(c.x - w / 2, y, w, fontPx + pad * 2);
        ctx.fillStyle = COLORS.label;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(city.name, c.x, y + pad);
      }
    }
  }

  private outlineHex(h: Hex, color: string, width: number): void {
    const { ctx } = this;
    this.hexPath(hexToWorld(h), 0.92);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
