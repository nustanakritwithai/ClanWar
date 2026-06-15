# Phase 3B-B5: Map / Route / Environment Asset Pack

> **Asset-only deliverable** — stock art for the future map/route runtime.
> Adds route tiles, environment pieces, lane markers, and guide overlays
> for Clan Siege Arena's **three-route battlefield** (Main / High Ground /
> Shadow). **No runtime, no Phaser code, no map logic, no collision.**
>
> Produced while Agent B is temporarily unavailable. Lane separation is
> preserved: this PR touches only `public/assets/map/**` and `docs/`.
> **Do not mix with runtime integration** — future map work is a separate PR.

Builds on [`art-style-guide.md`](./art-style-guide.md), the combat visual
kit (PR #6), and the objective pack (PR #13).

---

## 1. Goal

Give the future map/route runtime a complete visual language for the
**three-route siege arena** before gameplay integration begins:

1. **Main / Army Route** — warm worn path, primary lane
2. **High Ground Route** — elevated stone, tactical overlook
3. **Shadow / Sewer Route** — dark brick channel, stealth flank

Assets support future map points: Blue/Red Spawn, Core, Gate, Forward Camps,
Siege Ruins, Resource Camps, Watchtower — using **objective art from PR #13**
for objective markers; this pack supplies **terrain/route/environment** only.

---

## 2. What this pack adds (26 new assets)

All files live under `public/assets/map/`. See
[`map-environment-asset-manifest.md`](./map-environment-asset-manifest.md)
for the full catalogue.

| Category | Count | Examples |
|---|---|---|
| Route tiles | 4 | `main_route_tile`, `high_ground_tile`, `shadow_route_tile`, `road_crossing` |
| Lane markers | 3 | `lane_marker_blue/red/neutral` |
| Elevation / sewer | 4 | `high_ground_ramp_up/down`, `sewer_entrance/exit` |
| Walls / choke / bridge | 5 | `battlefield_wall_stone/broken`, `choke_point_marker`, `bridge_stone/broken` |
| Base / spawn floors | 4 | `spawn_platform_blue/red`, `base_floor_blue/red` |
| Ground | 1 | `neutral_ground_patch` |
| Guide overlays | 5 | `danger_zone_marker`, `movement_blocker_marker`, `path_arrow_*` |

---

## 3. Style rules (followed)

- Top-down 2D, `256×256` viewBox, transparent background
- Hand-authored SVG primitives only — no raster, no base64, no fonts, no text
- `#0b0e13` outlines per art style guide
- Route type readable by **shape + color** (not color alone):
  - Main = warm tan wear lines
  - High ground = elevated plateau + cliff shadow
  - Shadow = dark brick channel
- Blue `#3b82f6` / Red `#ef4444` / Neutral `#9ca3af` team markers
- Silhouettes bold enough for mobile at 48–96 px display
- Map assets shaped as terrain/markers — **not** rounded UI buttons

---

## 4. Future map points (runtime, not this PR)

| Point | Terrain from this pack | Objective icon (PR #13) |
|---|---|---|
| Blue Spawn | `spawn_platform_blue`, `base_floor_blue` | `spawn.svg` |
| Blue Core / Gate | `base_floor_blue` | `blue_core.svg`, `blue_gate.svg` |
| Forward Camps | `neutral_ground_patch` | `forward_camp_blue/red.svg` |
| Siege Ruins | `battlefield_wall_broken` | `siege_ruins.svg` |
| Resource Camps | `neutral_ground_patch` | `resource_camp_*.svg` |
| Watchtower | `high_ground_tile` | `watchtower_*.svg` |
| Red Gate / Core | `base_floor_red` | `red_gate.svg`, `red_core.svg` |
| Red Spawn | `spawn_platform_red`, `base_floor_red` | `spawn.svg` |

---

## 5. Must NOT do (this pack)

- ❌ No runtime / Phaser integration
- ❌ No collision, pathfinding, or movement-blocker logic
- ❌ No danger-zone damage
- ❌ No objective/bot/shop/multiplayer systems
- ❌ No changes to existing asset packs (`vfx/`, `combat/`, `objectives/`)
- ❌ No README / phase label changes

---

## 6. References

- [`map-environment-asset-manifest.md`](./map-environment-asset-manifest.md) — per-asset catalogue
- [`map-visual-integration-brief.md`](./map-visual-integration-brief.md) — future runtime brief for Agent A
