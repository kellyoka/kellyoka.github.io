# Hexwar

A turn-based fantasy hex strategy game for the web, in the spirit of *Warlords II* and *Master of Magic*.
Design and code structure: see [ARCHITECTURE.md](ARCHITECTURE.md).

**Status:** milestone 1 of 8. Random 40×40 maps with plains, forest, mountains, rivers, roads,
bridges, cities and ruins. You can pan, zoom and inspect hexes. No units or turns yet.

## Run it

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install      # once: installs Vite, TypeScript and tsx
npm run dev      # starts the dev server; open the URL it prints (usually http://localhost:5173)
```

Other commands:

```bash
npm test         # run the test suite (77 tests, including 60 random maps checked against the rules)
npm run typecheck
npm run build    # production build into dist/ (a static site you can host anywhere)
```

## Controls

- **Drag** to pan, **scroll** to zoom (around the cursor), **F** to fit the map, **+ / −** to zoom.
- **Hover** a hex to see its terrain, movement cost, defense bonus, yields, and any city or ruin.
- **Seed:** type a number and press Generate. The same seed always gives the same map.
  The seed is also kept in the URL (`?seed=123`), so you can bookmark or share a map.
- **L** or the Legend button shows what the colors mean.

## Where things are

```
src/core/          game rules: pure TypeScript, no browser code
  hex.ts           hex grid math (axial coordinates)
  rng.ts           seeded random numbers
  noise.ts         value/fractal/ridged noise for terrain
  astar.ts         A* pathfinding (roads now, unit movement next)
  map.ts           tile and map types, movement cost
  mapgen/          the map generator: terrain → rivers → cities → roads → ruins → validation
src/data/          terrain numbers and city names (balance lives here)
src/render/        Canvas drawing: layout, camera, map renderer
src/ui/            hover panel and CSS
src/main.ts        wires mouse, keyboard and buttons to the generator and renderer
tests/             unit tests (node:test)
```
