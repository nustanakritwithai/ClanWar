# Clan Siege Arena

Browser-based 2D top-down siege arena (MVP). Built with **Vite + TypeScript + Phaser 3**.

> Status: **Phase 0-1** — project setup, scenes, Small Twin Fortress placeholder
> map, desktop WASD movement, camera follow, and basic collision.
> No combat / skills / shop / bot / economy / multiplayer yet (later phases).

## Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## What works now (Phase 0-1)

- Menu → **Start** → Match scene; **Select Class** opens a placeholder list.
- Small Twin Fortress map drawn from `src/game/data/map-small-twin-fortress.ts`
  (coordinates from the planning doc): Blue/Red Spawn, Core, Gate, Forward Camps,
  Siege Ruins, Resource Camps, Watchtower.
- Player placeholder (circle) at Blue Spawn, **WASD / arrow keys** movement.
- Smooth camera follow, clamped to map bounds; mobile-friendly zoom.
- Collision against map edges and gate-flanking walls.
- Touch scaffold: dragging the lower-left quadrant moves the player (the polished
  ROV virtual joystick is Phase 2).

## Project layout

```
src/
  main.ts                  # Phaser bootstrap
  game/
    config.ts              # game config + scene list
    constants.ts           # scene keys, map size, colors
    types.ts               # map/marker/wall types
    scenes/                # Boot, Menu, ClassSelect*, Match, Result*
    systems/InputSystem.ts # WASD + joystick scaffold
    entities/Player.ts     # placeholder player
    data/map-small-twin-fortress.ts
```
`*` = placeholder scene for a later phase.

Files are created per-phase on purpose (no empty stubs); the full module tree in
the planning doc is the end-state target, not day-one scaffolding.
