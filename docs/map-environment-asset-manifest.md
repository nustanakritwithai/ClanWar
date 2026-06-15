# Map Environment Asset Manifest

> Catalogue of Phase 3B-B5 map/route/environment SVGs under
> `public/assets/map/**`. **Docs-only inventory** — no runtime loading.
> All assets are `256×256`, transparent, hand-authored SVG.

---

## Route tiles (world-space background / tile layer)

| Asset | Route category | Reads as | Suggested display | Space |
|---|---|---|---|---|
| `main_route_tile.svg` | Main / Army | Worn tan cobble path with center wear | 128–256 px tile repeat | World |
| `high_ground_tile.svg` | High Ground | Elevated stone plateau, cliff shadow | 128–256 px tile | World |
| `shadow_route_tile.svg` | Shadow / Sewer | Dark brick channel | 128–256 px tile | World |
| `road_crossing.svg` | All three | Three-route junction hub | 192–256 px single placement | World |

---

## Lane markers (world-space overlay)

| Asset | Route / team | Reads as | Suggested display | Space |
|---|---|---|---|---|
| `lane_marker_blue.svg` | Main (blue flank) | Blue pennant on stone post | 64–96 px | World |
| `lane_marker_red.svg` | Main (red flank) | Red pennant on stone post | 64–96 px | World |
| `lane_marker_neutral.svg` | Neutral midfield | Gray pennant | 64–96 px | World |

---

## Elevation & sewer transitions (world-space)

| Asset | Route | Reads as | Suggested display | Space |
|---|---|---|---|---|
| `high_ground_ramp_up.svg` | High Ground | Stone steps ascending | 96–128 px | World |
| `high_ground_ramp_down.svg` | High Ground | Stone steps descending | 96–128 px | World |
| `sewer_entrance.svg` | Shadow | Grate opening into darkness | 96–128 px | World |
| `sewer_exit.svg` | Shadow | Ladder to lit surface | 96–128 px | World |

---

## Structures (world-space)

| Asset | Reads as | Suggested display | Space |
|---|---|---|---|
| `battlefield_wall_stone.svg` | Intact crenellated wall segment | 128–192 px wide | World |
| `battlefield_wall_broken.svg` | Collapsed wall rubble | 96–160 px | World |
| `choke_point_marker.svg` | Narrow passage between walls | 128–192 px overlay | World |
| `bridge_stone.svg` | Intact stone bridge | 160–224 px wide | World |
| `bridge_broken.svg` | Bridge with gap | 160–224 px wide | World |

---

## Base & spawn floors (world-space tile)

| Asset | Team | Reads as | Suggested display | Space |
|---|---|---|---|---|
| `spawn_platform_blue.svg` | Blue | Circular rune platform | 160–256 px at spawn | World |
| `spawn_platform_red.svg` | Red | Circular rune platform | 160–256 px at spawn | World |
| `base_floor_blue.svg` | Blue | Blue-tinted stone floor grid | 128–256 px tile repeat | World |
| `base_floor_red.svg` | Red | Red-tinted stone floor grid | 128–256 px tile repeat | World |
| `neutral_ground_patch.svg` | Neutral | Grass/dirt midfield patch | 128–256 px tile | World |

---

## Guide overlays (world-space — visual only)

> ⚠️ These are **markers only**. They do **not** implement gameplay.

| Asset | Intended future use | NOT | Suggested display | Space |
|---|---|---|---|---|
| `danger_zone_marker.svg` | Hazard area hint (turret range, siege AoE preview) | Damage zone | 128–200 px overlay, fade | World |
| `movement_blocker_marker.svg` | Future impassable tile hint | Collision system | 96–128 px overlay | World |
| `path_arrow_blue.svg` | Blue route guide chevron | Pathfinding | 48–80 px, rotate at runtime | World |
| `path_arrow_red.svg` | Red route guide chevron | Pathfinding | 48–80 px | World |
| `path_arrow_neutral.svg` | Neutral/minimap guide | Pathfinding | 48–80 px | World |

---

## Mobile readability notes

- Minimum on-screen size for markers/overlays: **48 px** display width
- Tiles may repeat at **128 px** on phone; ensure wear lines / brick pattern
  remain visible (high contrast strokes ≥ 4 px at 256 source)
- Team blue/red markers differ by **hue + pennant shape** (not color alone)
- Route tiles differ by **surface pattern**: wear ruts (main), plateau shadow
  (high), brick channel (shadow)
- Overlays use dashed rings / X patterns — distinct from skill-button circles

---

## Totals

- **26 SVG assets** in `public/assets/map/`
- **0** runtime files changed
- Pairs with existing objective pack (`public/assets/objectives/**`) for
  full map readability in a future integration pass

---

## Deferred (not in this pack)

- Minimap frame / fog-of-war overlay
- Animated water/lava tiles
- Destructible terrain state variants
- Seasonal/biome alternates
- Procedural tile autotile set (corners/edges) — future if tilemap adopted
