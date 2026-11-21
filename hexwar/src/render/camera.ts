/**
 * Camera: maps world coordinates to screen pixels with a zoom and an offset.
 *   screen = world * zoom + offset
 * Zooming "around the cursor" means: keep the world point under the mouse
 * at the same screen spot while the zoom changes.
 */

import type { Point } from './layout.ts';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Camera {
  zoom = 1;
  offsetX = 0;
  offsetY = 0;
  readonly minZoom = 0.35;
  readonly maxZoom = 3;

  worldToScreen(p: Point): Point {
    return { x: p.x * this.zoom + this.offsetX, y: p.y * this.zoom + this.offsetY };
  }

  screenToWorld(p: Point): Point {
    return { x: (p.x - this.offsetX) / this.zoom, y: (p.y - this.offsetY) / this.zoom };
  }

  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  zoomAt(screen: Point, factor: number): void {
    const before = this.screenToWorld(screen);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    this.offsetX = screen.x - before.x * this.zoom;
    this.offsetY = screen.y - before.y * this.zoom;
  }

  /**
   * Zoom and center so the whole area fits in the viewport. `inset` reserves
   * screen space that UI panels cover (e.g. the top bar).
   */
  fit(world: Bounds, viewWidth: number, viewHeight: number, inset = { top: 16, right: 16, bottom: 16, left: 16 }): void {
    const availW = viewWidth - inset.left - inset.right;
    const availH = viewHeight - inset.top - inset.bottom;
    const w = world.maxX - world.minX;
    const h = world.maxY - world.minY;
    const z = Math.min(availW / w, availH / h);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, z));
    this.offsetX = inset.left + (availW - w * this.zoom) / 2 - world.minX * this.zoom;
    this.offsetY = inset.top + (availH - h * this.zoom) / 2 - world.minY * this.zoom;
  }

  /** The world-space rectangle currently on screen (for skipping off-screen hexes). */
  visibleWorld(viewWidth: number, viewHeight: number): Bounds {
    const a = this.screenToWorld({ x: 0, y: 0 });
    const b = this.screenToWorld({ x: viewWidth, y: viewHeight });
    return { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
  }
}
