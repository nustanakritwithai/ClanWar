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
| Blue base (bottom) | `base_floor_blue`, `spawn_platform_blue`, `lane_marker_blue`, `path_arrow_blue` |
| Red base (top) | `base_floor_red`, `spawn_platform_red`, `lane_marker_red`, `path_arrow_red` |
| Main route (center) | `main_route_tile`, `road_crossing` |
| High ground (left) | `high_ground_tile`, `high_ground_ramp_up/down`, path arrows |
| Shadow/sewer (right) | `shadow_route_tile`, `sewer_entrance/exit`, path arrows |
| Structures | `battlefield_wall_stone/broken`, `bridge_stone/broken`, `choke_point_marker` |
| Midfield | `neutral_ground_patch`, `lane_marker_neutral` |

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
