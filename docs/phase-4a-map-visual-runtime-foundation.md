# Phase 4A — Map Visual Runtime Foundation

> **Runtime integration** of the Phase 3B-B5 map environment asset pack.
> Renders the three-route battlefield (Main / High Ground / Shadow) as
> world-space SVG sprites in MatchScene. **Visual only** — no collision,
> pathfinding, objective logic, or gameplay changes.

## Delivered

- `MapRenderer` (`src/game/systems/MapRenderer.ts`) — loads 26 map SVG
  textures, tiles route lanes, places structures and guide markers
- `MatchScene` — preloads map assets, builds map on create, destroys on shutdown
- Phase label → `Phase 4A: Map Visual Runtime Foundation`

## Map layout (visual)

| Zone | Assets |
|---|---|
| Blue base (bottom, y < 3350) | `base_floor_blue`, `spawn_platform_blue` |
| Red base (top, y > 850) | `base_floor_red`, `spawn_platform_red` |
| Main route (center, **400 px**) | `main_route_tile` x 1300–1700 |
| High ground (left, **450 px**) | `high_ground_tile` x 600–1050, ramps @ x≈820 |
| Shadow/sewer (right, **280 px inset**) | `shadow_route_tile` x 2070–2350, sewer @ x≈2150 |
| Junctions (×3) | `road_crossing` @ (1500,3550), (1500,2100), (1500,650) |
| Gate walls | `battlefield_wall_stone` flanking gap x 1140–1860 @ y=3200/1000 |

## Design gate alignment (Agent C / PR #17)

- 3× `road_crossing` per `docs/map-layout-spec.md` §3.3
- Main route wider than flank routes (400 px vs 450/280 effective bands)
- Gate wall art outside playable opening — no false corridors
- Reduced overlays: 3 main-route arrows, 2 lane pennants; midfield labels hidden

## Loaded but not rendered (by design)

- `danger_zone_marker` — texture preloaded; not placed (no damage zone)
- `movement_blocker_marker` — texture preloaded; not placed (no collision)

## Camera / cleanup

- All map sprites are world-space, depth -55 to -18 (below markers/player)
- Captured in `worldObjects` snapshot → `uiCamera.ignore()`
- `mapRenderer.destroy()` on scene shutdown

## Must NOT do (this phase)

- ❌ No objective assets from PR #13
- ❌ No collision / pathfinding / gate HP / capture / economy
- ❌ No changes to `public/assets/**`

## Tests

```bash
npm run build
npm run preview
node scripts/mobile-multitouch-verify.mjs http://127.0.0.1:4173
node scripts/phase-3b-b2-regression.mjs http://127.0.0.1:4173
node scripts/phase-3b-b3-visual-regression.mjs http://127.0.0.1:4173
node scripts/phase-4a-map-visual-regression.mjs http://127.0.0.1:4173
```
