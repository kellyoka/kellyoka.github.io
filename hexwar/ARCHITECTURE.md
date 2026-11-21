# Architecture & Design: Fantasy Hex Strategy (working title)

A top-down, turn-based fantasy strategy game for the web, inspired by *Warlords II* (pace, city capture, stacks, heroes) and *Master of Magic* (economy, variety, items).

This document records **what** we decided, **why**, and **how the code is organized**. Numbers in it are starting values to tune, not final balance.

---

## 1. Design decisions (v1)

| Area | Decision | Later |
|---|---|---|
| Map | Random all-land hex map, 40×40. Plains, forest, mountains (impassable), rivers (impassable except at bridges), roads and bridges. | Sea, coasts, islands and ships; more terrain; larger maps; map editor; scenarios |
| Opponents | You vs. 1 AI | More AIs, hot-seat |
| Units | One shared roster for everyone | Factions/races with their own units |
| Stacks | Max 8 units (a hero counts as one) | — |
| Combat | Auto-resolved, with a battle preview showing odds | More abilities |
| Economy | Food, gold, production. Size grows from food. Buildings and units unlock by size. Armies cost gold only (no food). | More buildings, trade, food upkeep |
| Production | Each city splits production between **one unit type** (Warlords style) and **one building** | Unit-producing buildings, queues |
| Heroes | From the start: leadership, experience, items, ruin exploration | Hero spells for cities and the world |
| Magic | Only magic items found by heroes | Spells, built on the same effect system |
| Fog of war | Yes: unexplored / explored / currently visible | — |
| Victory | Conquest: hold all cities, or eliminate all enemies | Other victory types |
| Art | Simple placeholder shapes and colors | Real tilesets later (art is swappable data) |

---

## 2. Tech stack

- **TypeScript**: type checking catches rules bugs before you run anything.
- **Vite**: dev server with instant reload; builds a static site you can host anywhere.
- **Canvas 2D** (built into the browser) draws the hex map. It handles a 40×40 map easily and needs no library. Everything visual lives in `src/render/`, so if we later need GPU speed for lots of animated units, PixiJS can replace that folder without touching the rules.
- **Plain HTML/CSS** for panels (city screen, hero screen, battle preview, turn bar). UI inside a canvas is painful, and the browser is already good at it.
- **Node's built-in test runner** (`node:test`, run through `tsx`): unit tests for the rules layer, with no extra test framework.
- **Data files** (`src/data/`) are TypeScript modules for now, so a typo in a unit or terrain name is caught by the type checker. They can become JSON later if we want modding.
- **Saves**: browser storage (`localStorage` / IndexedDB) plus JSON export and import.

No server is needed. The whole game runs in the browser.

---

## 3. The four layers

```
┌──────────────────────────────────────────────┐
│ 4. Presentation  (Canvas map + HTML panels)  │  reads state, plays events, sends commands
├──────────────────────────────────────────────┤
│ 3. Players       (Human input  |  AI)        │  both produce the same Commands
├──────────────────────────────────────────────┤
│ 2. Core rules    (pure TypeScript)           │  applyCommand(state, cmd) → events
├──────────────────────────────────────────────┤
│ 1. Data          (units, terrain, names ...) │  numbers and definitions, no logic
└──────────────────────────────────────────────┘
```

**Rule of the codebase:** `src/core` never imports from `render`, `ui` or `ai`, and never touches the browser (no DOM, no `window`, no `Math.random`). That keeps the game logic testable, cloneable and identical for humans and the AI.

### 3.1 Commands and events: the heart of it

Every change to the game goes through one function:

```ts
function applyCommand(state: GameState, cmd: Command): CommandResult
// CommandResult = { ok: true, events: GameEvent[] } | { ok: false, reason: string }
```

The function first **validates** the command (is it your turn, is it your stack, is the path legal, are there enough moves) and then **applies** it.

Example commands:

```ts
type Command =
  | { type: 'moveStack';      stackId: Id; path: Hex[] }
  | { type: 'splitStack';     stackId: Id; unitIds: Id[] }
  | { type: 'mergeStacks';    fromId: Id; intoId: Id }
  | { type: 'attack';         stackId: Id; target: Hex }
  | { type: 'setUnitBuild';   cityId: Id; unitType: string | null }
  | { type: 'setBuilding';    cityId: Id; building: string | null }
  | { type: 'setProductionSplit'; cityId: Id; toBuilding: 0 | 25 | 50 | 75 | 100 }
  | { type: 'rushBuy';        cityId: Id; slot: 'unit' | 'building' }
  | { type: 'searchRuin';     heroId: Id; ruinId: Id }
  | { type: 'equipItem';      heroId: Id; itemId: Id }
  | { type: 'hireHero';       offerId: Id; cityId: Id }
  | { type: 'endTurn' };
```

Example events: `stackMoved`, `battleResolved` (with a round-by-round log), `cityCaptured`, `unitBuilt`, `buildingCompleted`, `cityGrew`, `heroLeveled`, `itemFound`, `playerEliminated`, `gameWon`.

**What this buys us:**
- **Fair AI.** The AI can only do what a human can do, through the same validation.
- **AI look-ahead.** The AI clones the state, tries commands and scores the results, without touching the real game.
- **Animation without coupling.** The renderer plays events ("move along this path", "battle: show result"). The rules never wait on graphics.
- **Saves.** The state is plain JSON-serializable data.
- **Replays, undo, hot-seat and later networking.** These are all a matter of recording, replaying or sending commands.
- **Tests.** Build a state, apply a command, assert on the result.

### 3.2 Determinism

All randomness (map generation and combat rolls) comes from a **seeded PRNG** (e.g. mulberry32 or sfc32) whose state lives **inside `GameState`**. The same seed plus the same commands always gives the same game, so bugs reproduce exactly and replays work.

The **battle preview** runs its simulations on a *separate, throwaway* RNG, so looking at odds never changes the real outcome.

### 3.3 State shape (starting model)

```ts
type Id = string;
interface Hex { q: number; r: number }          // axial coordinates

interface GameState {
  seed: number;
  rng: RngState;                                 // advances on every random roll
  turn: number;
  currentPlayer: Id;
  players: Record<Id, Player>;
  map: MapState;
  cities: Record<Id, City>;
  stacks: Record<Id, Stack>;
  units: Record<Id, Unit>;                       // includes heroes
  ruins: Record<Id, Ruin>;
  items: Record<Id, Item>;                       // items on heroes or lying in ruins
  heroOffers: HeroOffer[];
  winner: Id | null;
}

interface Player {
  id: Id; name: string; color: string;
  kind: 'human' | 'ai' | 'neutral';
  gold: number;
  explored: BitSet;                              // fog of war: tiles ever seen
  eliminated: boolean;
}

interface MapState {
  width: number; height: number;                 // 40 × 40, stored by axial coords
  tiles: Tile[];                                 // index = hexToIndex(q, r)
}
type TerrainId = 'plains' | 'forest' | 'mountains' | 'river';
interface Tile {
  terrain: TerrainId;
  road: boolean;                                 // a road on a river tile = a bridge
}
// Ruins and lairs are kept in their own list (state.ruins), not on tiles.

interface City {
  id: Id; name: string; owner: Id; hex: Hex;
  size: number;                                  // 1..10
  foodStored: number;
  buildings: string[];
  unitBuild: { type: string | null; progress: number };
  buildingBuild: { type: string | null; progress: number };
  productionSplit: 0 | 25 | 50 | 75 | 100;       // % of production to the building slot
}

interface Stack { id: Id; owner: Id; hex: Hex; unitIds: Id[] }   // 1..8 units

interface Unit {
  id: Id; type: string; owner: Id; stackId: Id;
  hp: number; movesLeft: number;
  hero?: HeroData;
}
interface HeroData { name: string; level: number; xp: number; itemIds: Id[] }

interface Item { id: Id; type: string }          // definition lives in data/items.json
interface Ruin { id: Id; hex: Hex; explored: boolean; guardian?: string; reward: RewardSpec }
```

**Why IDs and records instead of nested objects:** flat maps keyed by ID are easy to clone, diff, save and look up. "The unit inside the stack inside the tile" nesting makes all of those harder.

---

## 4. Hex grid

- **Pointy-top hexes, axial coordinates (q, r).** Use cube coordinates (x = q, z = r, y = −q − r) for distance, lines and rings.
- **Distance:** `(|dq| + |dr| + |dq + dr|) / 2`
- **Neighbors:** the six fixed offsets `(+1,0) (+1,−1) (0,−1) (−1,0) (−1,+1) (0,+1)`
- **Map shape:** a rectangle in "odd-r offset" layout, converted to axial for all the math.
- **Pathfinding:** A* over terrain movement costs. Mountains and unbridged rivers are blocked. Hexes holding enemy stacks are blocked, except as the final "attack" step.
- **Movement in half-points:** roads cost ½ a move, so the rules store movement internally as **half-points** (a unit with 4 moves has 8 half-points). The UI always shows whole moves. This avoids floating-point rounding bugs in path costs.
- **Reference:** Red Blob Games' guide to hexagonal grids. Everything above comes from it.

---

## 5. Rules (v1 starting values)

### 5.1 Terrain

The map is all land in v1.

| Terrain | Move cost | Food | Prod | Gold | Defense bonus |
|---|---|---|---|---|---|
| Plains | 1 | 2 | 1 | 0 | 0 |
| Forest | 2 | 1 | 2 | 0 | +1 |
| Mountains | impassable | 0 | 1 | 1 | — |
| River | impassable (except at a bridge) | 3 | 0 | 1 | — |

- **Impassable tiles can still be worked by cities.** A city beside a river grows fast, and one beside mountains earns a little extra gold. Cities can't be founded on mountains or rivers.
- **Roads:** any plains or forest hex can carry a road. Moving along a road costs **½** a move whatever the terrain, but the forest defense bonus still applies.
- **Bridges:** a road across a river hex. A bridge is the only way over a river and costs ½ a move. A stack **defending on a bridge gets +1 defense**. This makes bridges natural chokepoints worth holding.
- Roads and bridges are created only by the map generator. Players **can't build or destroy** them.

### 5.2 Cities and economy

- **Worked tiles:** a city works its center plus its `size` best tiles within radius 2, chosen automatically and weighted toward food. (Manual tile assignment could come later.)
- **Food:** food from worked tiles minus `2 × size` goes into `foodStored`. When `foodStored ≥ 10 + 5 × size`, the city grows and the store resets (a Granary keeps 50%). A food deficit shrinks the city.
- **Production:** the sum from worked tiles, plus 1 for the city center, plus building bonuses. Each turn it is split by `productionSplit` between the **unit slot** and the **building slot**. If one slot is empty, everything goes to the other.
- **Unit slot (Warlords style):** a city picks one unit type and keeps producing it, one after another.
- **Building slot:** one building at a time. When it finishes, the slot empties.
- **Gold:** a nation-wide treasury. Income comes from worked tiles plus `size` per city plus building bonuses. Expenses are unit upkeep plus building upkeep.
- **Rush buy:** pay 2 gold per missing production point to finish a slot this turn (3 gold per point if the slot has no progress yet).
- **Bankruptcy:** if gold drops below 0, the most expensive non-hero unit is disbanded until the treasury is back at 0 or above.

### 5.3 Size tiers (what size unlocks)

| Size | Tier | Unlocks |
|---|---|---|
| 1 | Village | Militia, Scouts |
| 2 | — | Granary, Walls, Barracks |
| 3 | Town | Market, Workshop, Archery Range |
| 4 | — | Stables, Heavy Infantry (needs Barracks) |
| 6 | City | Knights (needs Stables), Fortress Walls |
| 8 | Metropolis | (reserved for later content) |

### 5.4 Buildings (starter set)

| Building | Min size | Cost (prod) | Upkeep | Effect |
|---|---|---|---|---|
| Granary | 2 | 30 | 1 | Keeps 50% of food when the city grows |
| Walls | 2 | 40 | 1 | +2 defense to defending units in the city |
| Barracks | 2 | 30 | 1 | Unlocks Spearmen; Heavy Infantry at size 4 |
| Market | 3 | 50 | 0 | +50% gold from this city |
| Workshop | 3 | 50 | 1 | +2 production |
| Archery Range | 3 | 40 | 1 | Unlocks Archers |
| Stables | 4 | 50 | 1 | Unlocks Cavalry; Knights at size 6 (needs at least 4 plains hexes within radius 2) |
| Fortress Walls | 6 | 80 | 2 | Replaces Walls: +3 defense |

### 5.5 Units (shared roster)

| Unit | Str | HP | Moves | Cost | Upkeep | Requires | Ability |
|---|---|---|---|---|---|---|---|
| Militia | 2 | 2 | 4 | 10 | 0 | — | +1 defending in its own city |
| Scouts | 1 | 2 | 8 | 12 | 1 | — | Sees +2 hexes |
| Spearmen | 3 | 2 | 4 | 18 | 1 | Barracks | +2 vs. Cavalry and Knights |
| Archers | 3 | 2 | 4 | 20 | 1 | Archery Range | First strike: free attack before the duel |
| Heavy Infantry | 5 | 3 | 3 | 30 | 2 | Barracks, size 4 | — |
| Cavalry | 4 | 2 | 7 | 28 | 2 | Stables | +1 attacking a stack on plains |
| Knights | 6 | 3 | 6 | 45 | 3 | Stables, size 6 | +1 attacking a stack on plains |
| Hero | 5 | 3 | 6 | — | 2 | Hired | Leadership; carries items |

### 5.6 Combat (auto-resolve, Warlords style)

1. The attacker moves into a hex with an enemy stack or city. **Attacking costs 2 moves for every unit type** in place of the normal cost of entering that hex. A stack with less than 2 moves left can still attack, but its moves drop to 0. The cost is a tunable value in the data files.
2. Both stacks are ordered **weakest to strongest**. Heroes fight last on their side.
3. The front units **duel**. In each round, the attacker hits with probability `A / (A + D)`, where A and D are the *modified* strengths. Each hit removes 1 HP. The loser is removed and the next unit steps up.
4. Repeat until one side is empty. If the attacker wins, the stack moves in and **can keep moving with whatever moves it has left**. Each unit's moves are tracked separately, so the stack's moves are those of its slowest unit.
5. **City capture:** the city changes owner, loses **1 size** (minimum 1), and each building has a **10% chance** of being destroyed. Both slots are cleared, so the new owner picks fresh builds.
6. **Strength modifiers** (strength capped at 9 after modifiers):
   - Hero leadership: +1 to every unit in the hero's stack (+2 from level 4).
   - Defender terrain bonus (table above; +1 on a bridge), or city walls in place of terrain.
   - Unit abilities and item effects.
7. **Battle preview:** simulate the battle 500 times on a throwaway RNG and show the win chance and expected survivors. The AI calls the same function.
8. **Events:** `battleResolved` carries the full duel log, so the UI can show a quick battle readout.

Neutral cities start with 1–4 random garrison units, scaled to their distance from player capitals.

### 5.7 Heroes, ruins and items

- **Start:** each player begins with one hero in their capital.
- **Hiring:** every few turns, a hero may offer to join for gold (the cost rises with the number of heroes you already have). Accept or decline.
- **Experience:** from battles won and ruins explored. Levels give +1 strength (to a max) and better leadership.
- **Ruins and lairs:** only a hero (alone or leading a stack) can search one. A guardian fight (auto-resolved) gives a reward: gold, an item or allied units. Lairs are tougher and pay better.
- **Items:** up to 4 per hero. They're defined in `data/items.json` as a list of effects:

```json
{ "id": "boots_of_speed", "name": "Boots of Speed",
  "effects": [{ "kind": "stackMoves", "amount": 2 }] }
{ "id": "banner_of_valor", "name": "Banner of Valor",
  "effects": [{ "kind": "stackStrength", "amount": 1 }] }
```

### 5.8 The effect system (why items are data)

An **effect** is a small, typed record (`{ kind, amount, condition? }`). Core rules ask "what effects apply to this unit in this situation?" and add them up. They never check item names.

This is the foundation for later work:
- **Spells** are effects with a cost and a target: a hero casts "Bountiful Harvest" (`cityFood +3` for 5 turns) on a city.
- **Factions** are racial abilities expressed as effects on their units.
- **Buildings** become effects too, over time.

### 5.9 Fog of war

Each player has an `explored` bitset (tiles ever seen). Currently visible tiles are computed each turn from the sight radius of their units (2, or 4 for Scouts) and cities (3). Explored-but-not-visible tiles show terrain and cities, but not enemy stacks. **The AI obeys fog of war too.** It only reads what its player can see.

### 5.10 Turn structure

```
startTurn(player):
  for each city: grow/shrink (food) → add production → complete unit/building → (unit spawns in or beside city)
  pay upkeep (bankruptcy check) → reset movesLeft → recompute visibility → maybe hero offer
player issues commands …
endTurn → next player (neutral never acts) → turn++ after the last player
win check after every battle: all non-neutral cities owned by one player, or only one player left
```

---

## 6. AI (v1 approach)

A **utility-based** AI. It doesn't search deep; each turn it scores options with simple rules:

1. **City management:** set the production split and builds from city size, threats nearby and the treasury. For example, "threatened → walls and defenders", "safe and growing → economy buildings".
2. **Goals:** generate candidate goals (capture a neutral or enemy city, defend a threatened city, explore a ruin with the hero, scout unexplored land) and score each by value, distance and the battle-preview win chance.
3. **Assignment:** greedily assign stacks to their best goals. Merge stacks to reach a target win chance (e.g. ≥ 70%) before attacking.
4. **Execution:** issue `moveStack` and `attack` commands through `applyCommand`, the same as a human.

The AI is built **early** (right after cities and combat exist) and improved alongside the rules, so it never falls behind the game it has to play.

---

## 7. Map generation (v1)

A 40 × 40 map has 1,600 hexes.

1. **Height noise** (seeded simplex/value noise): the highest areas become **mountain ranges** (around 10–15% of the map). A second noise layer places **forest** patches (around 25–30%). Everything else is **plains**.
2. **Rivers:** 3–5 rivers start next to mountains and run downhill to the map edge, as one-hex-wide lines of river tiles. They act as long natural walls.
3. **Start positions:** two hexes far apart, each with enough plains and at least one river or forest hex within radius 2.
4. **Neutral cities:** about 12–16, placed with a minimum spacing, with a roughly equal number near each player.
5. **Roads and bridges:** connect all cities with a minimum spanning tree plus a few extra links for loops, so there are alternate routes. Each road is laid with A*, which prefers plains, avoids mountains, and lays a **bridge** wherever a road crosses a river. Rivers are then crossable only at those bridges.
6. **Ruins and lairs:** about 8–12, away from the starts and usually off the roads.
7. **Validation:** every city must be reachable from both starts using only passable tiles and bridges, and each player must get a fair share of nearby cities. If not, regenerate with seed + 1.

---

## 8. Project layout

```
src/
  core/            # pure rules: no DOM, no Pixi, no Math.random
    hex.ts         # axial/cube math, neighbors, distance, rings
    rng.ts         # seeded PRNG (state stored in GameState)
    state.ts       # GameState types, newGame()
    commands.ts    # Command/Event types, applyCommand()
    movement.ts    # move costs, A* pathfinding
    combat.ts      # resolveBattle(), previewBattle()
    economy.ts     # food, production, gold, upkeep
    turn.ts        # startTurn(), endTurn(), victory check
    heroes.ts      # experience, ruins, items, offers
    effects.ts     # effect aggregation
    visibility.ts  # fog of war
    mapgen/        # noise, rivers, placement, validation
  data/            # terrain.ts, names.ts (later units, buildings, items): typed data, no logic
  ai/              # utility AI, goals, city manager
  render/          # Canvas 2D: layout (hex <-> pixels), camera, map renderer; later units and animations
  ui/              # HTML panels: city, hero, battle preview, turn bar, menus
  save/            # serialize/deserialize, storage, export/import
  main.ts          # wiring: game loop, input → commands → events → render
tests/             # node:test tests for core/ and ai/
```

---

## 9. Build order (milestones)

Each milestone ends with something you can play or watch.

1. **Map on screen:** ✅ done. Project setup, hex math, seeded RNG, map generator, Canvas rendering, pan and zoom, hover info.
2. **Things that move:** stacks, selection, A* path preview, movement points, split/merge, fog of war, end turn.
3. **Cities that grow:** cities on the map, the economy, a city panel (split slider, unit and building slots, rush buy), units spawning.
4. **Fighting:** auto-resolve combat, battle preview, battle readout, neutral garrisons, city capture, victory screen.
5. **AI v0:** manages its cities and attacks weak targets, so it's a real opponent from here on.
6. **Heroes:** leadership, experience, ruins and lairs, items and the effect system, hero offers.
7. **AI v1:** goals and scoring, stack merging, defense, hero use.
8. **Save/load and polish:** saves, export/import, game setup screen (seed, map size), balance pass.

Later: factions and races, hero spells, unit-producing buildings, bigger maps, more AIs, hot-seat, real art.

---

## 10. Open questions (to settle as we go)

None right now. New ones get added here as playtesting raises them.

### Settled
- Roads and bridges can't be built or destroyed by players (v1).
- A stack defending on a bridge gets +1 defense.
- Attacking costs the same 2 moves for every unit (v1).
- Armies cost gold only, no food (v1).
- Captured cities lose 1 size, and each building has a 10% chance to be destroyed.
- Units can keep moving after winning an attack; attacking costs 2 moves.
- The v1 map is all land. Sea, coasts and islands come later.
- The map is 40 × 40, with plains, forest, mountains (impassable), rivers (impassable except at bridges), roads and bridges.
