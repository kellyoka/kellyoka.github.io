/**
 * Generic A* pathfinding over tile indices.
 *
 * A* explores outward from the start, always expanding the tile with the
 * lowest "cost so far + estimated cost to the goal". The estimate (heuristic)
 * must never overestimate, or A* can miss the cheapest path. With hexes the
 * natural estimate is hex distance × the cheapest possible step cost.
 *
 * The map generator uses it to lay roads. Milestone 2 reuses it for unit
 * movement with different cost rules: you pass the rules in as functions,
 * so the algorithm itself never changes.
 */

export interface AStarQuery {
  start: number;
  goal: number;
  /** Tiles reachable in one step from `index`. */
  neighbors: (index: number) => readonly number[];
  /** Cost to step from `from` to `to`, or null if that step isn't allowed. */
  cost: (from: number, to: number) => number | null;
  /** Lower bound on the remaining cost from `index` to the goal. */
  heuristic: (index: number) => number;
}

export interface AStarResult {
  /** Tile indices from start to goal, both included. */
  path: number[];
  cost: number;
}

export function aStar(q: AStarQuery): AStarResult | null {
  const open = new MinHeap();
  const gScore = new Map<number, number>([[q.start, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  open.push(q.start, q.heuristic(q.start));

  while (open.size > 0) {
    const current = open.pop();
    if (current === q.goal) return { path: rebuild(cameFrom, current), cost: gScore.get(current)! };
    if (closed.has(current)) continue; // a stale heap entry: we already found a cheaper route here
    closed.add(current);

    const g = gScore.get(current)!;
    for (const next of q.neighbors(current)) {
      if (closed.has(next)) continue;
      const step = q.cost(current, next);
      if (step === null) continue;
      const tentative = g + step;
      if (tentative < (gScore.get(next) ?? Infinity)) {
        gScore.set(next, tentative);
        cameFrom.set(next, current);
        open.push(next, tentative + q.heuristic(next));
      }
    }
  }
  return null;
}

function rebuild(cameFrom: Map<number, number>, end: number): number[] {
  const path = [end];
  let cur = end;
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur)!;
    path.push(cur);
  }
  return path.reverse();
}

/**
 * Binary min-heap of (item, priority). Ties break on insertion order, so the
 * result never depends on engine quirks. Determinism matters everywhere.
 */
class MinHeap {
  private items: number[] = [];
  private prios: number[] = [];
  private order: number[] = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  push(item: number, prio: number): void {
    this.items.push(item);
    this.prios.push(prio);
    this.order.push(this.counter++);
    this.up(this.items.length - 1);
  }

  pop(): number {
    const top = this.items[0]!;
    const lastItem = this.items.pop()!;
    const lastPrio = this.prios.pop()!;
    const lastOrder = this.order.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.prios[0] = lastPrio;
      this.order[0] = lastOrder;
      this.down(0);
    }
    return top;
  }

  private less(i: number, j: number): boolean {
    const pi = this.prios[i]!;
    const pj = this.prios[j]!;
    return pi < pj || (pi === pj && this.order[i]! < this.order[j]!);
  }

  private swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j]!, this.items[i]!];
    [this.prios[i], this.prios[j]] = [this.prios[j]!, this.prios[i]!];
    [this.order[i], this.order[j]] = [this.order[j]!, this.order[i]!];
  }

  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  private down(i: number): void {
    const n = this.items.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.less(l, m)) m = l;
      if (r < n && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
  }
}
