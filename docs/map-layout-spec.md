# Map Layout Spec — Small Twin Fortress

> **Agent C design spec** for `smallTwinFortress` (3000×4200 px). Defines how
> the three-route siege arena should **read** to the player. Runtime placement
> is owned by Agent A; terrain art is owned by Agent B (`public/assets/map/**`).
>
> References: `src/game/data/map-small-twin-fortress.ts` (marker coordinates),
> `docs/map-environment-asset-manifest.md`, `docs/map-visual-integration-brief.md`.

---

## 1. Design Goal

Make the battlefield instantly legible as a **vertical siege** with **three
distinct routes** between Blue (bottom) and Red (top). A new player should
answer within 30 seconds of moving:

- Where is my base?
- Where is the enemy base?
- Which path is the main fight?
- Where could I flank later (even if flank has no bonus yet)?

---

## 2. Player Experience

| Moment | Player should feel / understand |
|---|---|
| Spawn (first 10 s) | "I start on a blue fortress floor; the wide tan path ahead is the main push." |
| First branch (~y 3400) | "Left stone ridge = high ground; right dark channel = sewer flank." |
| Mid push (~y 2100–2600) | "This is where teams meet — ruins in the middle, camps on the sides." |
| Enemy gate (~y 1000) | "The gate is the wall — I must go through the opening or find another route." |
| Camera pan | Map fits in memory as **bottom = home, top = enemy**, center = main lane. |

---

## 3. Layout / System Rules

### 3.1 Orientation & symmetry

- **Map size:** 3000 × 4200 px (`MAP_WIDTH` × `MAP_HEIGHT`).
- **Mirror axis:** vertical center line **x = 1500**.
- **Blue team:** bottom (spawn y ≈ 3900). **Red team:** top (spawn y ≈ 300).
- **Main route spine:** x = 1500 ± 200 px corridor (400 px wide visual band).

### 3.2 Three routes (terrain identity)

Routes are defined by **tile type**, not by invisible lanes. Each route must
use a different surface pattern so they read at mobile zoom (~0.45–0.6).

| Route | Tile asset | World band (approx.) | Reads as |
|---|---|---|---|
| **Main / Army** | `main_route_tile.svg` | x = 1300–1700, full height | Warm tan cobble, center wear lines — the obvious path |
| **High Ground** | `high_ground_tile.svg` + ramps | x = 600–1050 (left flank) | Cool elevated stone, cliff shadow on south edge |
| **Shadow / Sewer** | `shadow_route_tile.svg` + sewer IO | x = 1950–2400 (right flank) | Dark brick channel, narrow feel |

**Rule:** Main route must be **wider and brighter** than the other two. Shadow
route should feel **~30% narrower** visually (tile placement can inset edges).

### 3.3 Route junctions (`road_crossing.svg`)

Place one `road_crossing` hub at each major branch (not every tile corner):

| Junction ID | Center (x, y) | Purpose |
|---|---|---|
| `blueFork` | (1500, 3550) | First split leaving blue base — teaches 3 routes |
| `midCross` | (1500, 2100) | Siege ruins hub — all routes converge for fights |
| `redFork` | (1500, 650) | Mirror split before red base |

At each junction, main runs **vertical**, high spur aims **left/up-left**,
shadow spur aims **right/down-right** (match `road_crossing.svg` art orientation).

### 3.4 High ground transitions

| Asset | Placement | Facing |
|---|---|---|
| `high_ground_ramp_up.svg` | (820, 3400), (820, 2300) | Ramp faces **up-map** (toward y=0) |
| `high_ground_ramp_down.svg` | (820, 1200) | Ramp faces **down-map** toward red gate |

High-ground **watchtower** objective sits on high-ground tile at (1500, 1600)
— tower art on `high_ground_tile` band extension or neutral patch at center
midfield (see objective-placement-spec).

### 3.5 Shadow / sewer transitions

| Asset | Placement | Notes |
|---|---|---|
| `sewer_entrance.svg` | (2150, 3550), (2150, 2300) | Grate at surface — reads "drop in" |
| `sewer_exit.svg` | (2150, 1200) | Ladder up near red flank |

Shadow corridor runs **parallel to main** on the right; it does **not** need
collision or stealth in MVP — only visual legibility.

### 3.6 Choke points (fight geography)

| Choke | Location | Visual marker | Design intent |
|---|---|---|---|
| **Gate openings** | y = 3200 (blue), y = 1000 (red) | `battlefield_wall_stone.svg` flanks + gap | Primary siege choke — only ~720 px opening (x 1140–1860) |
| **Siege ruins** | (1500, 2100) | `battlefield_wall_broken.svg` + ruins objective | Midfield brawl zone — broken walls suggest contested ground |
| **Forward camp lane** | y ≈ 2550, x = 900 / 2100 | `choke_point_marker.svg` optional | Side-route pinch before mid — encourages camp control later |
| **Sewer pinch** | x ≈ 2150, y 1800–2400 | Narrow shadow tiles only | Future flank route — should feel tighter than main |

### 3.7 Structures & walls

- **Base floors:** `base_floor_blue` below y ≈ 3350; `base_floor_red` above y ≈ 850.
- **Spawn platforms:** at (1500, 3900) and (1500, 300).
- **Gate walls:** use `battlefield_wall_stone.svg` segments tiling the gate line
  (collision rects stay as data — art is cosmetic overlay in Phase 4A).
- **Bridges:** `bridge_stone.svg` only if a route crosses a gap; MVP map has
  no water — **defer bridges** unless Agent A adds decorative gaps.

### 3.8 Guide overlays (Phase 4A optional, recommended first match only)

| Overlay | Max count | When |
|---|---|---|
| `path_arrow_blue.svg` | 3–5 | First 60 s or tutorial flag — main route only |
| `lane_marker_blue.svg` | 1 | At `blueFork` |
| `lane_marker_neutral.svg` | 1 | At `midCross` |
| `danger_zone_marker.svg` | 0 in 4A | Defer until turret/siege AoE exists |

**Rule:** Overlays are **hints**, not gameplay. Hide or fade after player
leaves spawn band (y > 3400) to avoid visual noise.

### 3.9 Depth & camera

- Ground tiles: depth **-100 to -50**.
- Route tiles: **-50 to 0**.
- Structures / walls: **0–10**.
- Lane markers / arrows: **5–15** (below objectives in 4B).
- Combat VFX / player: existing depths unchanged.

---

## 4. MVP Scope (Phase 4A)

**In scope for map visual runtime:**

1. Replace flat `COLORS.ground` rectangle with tiled terrain.
2. Paint three distinguishable routes per sections 3.2–3.5.
3. Place base floors + spawn platforms at team bases.
4. Cosmetic wall art on existing collision segments (gate lines minimum).
5. 3× `road_crossing` junction hubs.
6. Camera-safe rendering (`uiCamera.ignore` on all world tiles).
7. Clean shutdown — no tile leak on Menu ↔ Match ×3.

**Out of scope for 4A:**

- Objective SVG sprites (Phase 4B).
- New collision / pathfinding / elevation gameplay.
- Minimap, fog, animated tiles.
- Removing debug text markers (can overlap in 4A — remove in 4B).

---

## 5. Deferred

| Item | Target phase | Reason |
|---|---|---|
| Objective icons at markers | 4B | Separate PR — art pack ready |
| `capture_ring` / `objective_warning` | 4B+ | Needs objective state machine |
| Gate/core HP & damage | 4C | Gameplay loop |
| Watchtower capture | 4.x | Not core win loop |
| Resource camps economy | 5+ | Scope |
| Stealth / elevation modifiers | Post-MVP | Visual-only first |
| Minimap | Post-MVP | Needs fog + player positions |
| Forward camp respawn | Post-MVP | Needs bot/multiplayer |

---

## 6. Implementation Brief for Agent A

1. **Data:** Add optional `MapVisualLayout` (or extend `MapDefinition`) with
   route polylines / tile regions — keep marker coordinates **unchanged** from
   `map-small-twin-fortress.ts`.
2. **Loader:** Preload `public/assets/map/**` in `MatchScene.preload()` (mirror
   combat asset loading pattern).
3. **Renderer:** Dedicated module (e.g. `MapVisualRenderer.ts`) that:
   - Stamps tiles on a grid (128 px step recommended).
   - Places junction sprites at §3.3 coordinates.
   - Registers every object via `registerWorldObject()`.
4. **Priority order:** base floors → main route → flank routes → walls →
   junctions → optional arrows.
5. **Mobile test:** 915×412 and 800×360 — player at spawn must see tan main
   path without panning; left/right flanks distinguishable within 2 screen widths.
6. **Do not** remove `drawMarkers()` until 4B — or gate behind flag so QA can
   compare positions.
7. **Do not** tie `movement_blocker_marker` to physics.

---

## 7. Asset Brief for Agent B

**No new assets required for Phase 4A MVP.** Existing 26-map pack covers spec.

Optional polish (only if 4A playtest fails readability):

| Request | Trigger | Notes |
|---|---|---|
| Wider main-route wear contrast | Main path confused with neutral ground | Boost `#cfa14a` stripe opacity on `main_route_tile.svg` |
| Stronger cliff shadow on high ground | High route not feeling elevated | Darken south-edge shadow path |
| Sewer grate silhouette | Entrance not visible at 48 px | Thicken grate bars on `sewer_entrance.svg` |

---

## 8. Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Three routes same width | Player sees one blob lane | Main corridor 400 px; shadow inset to ~280 px |
| Tile repeat moiré on mobile | Visual noise | 128 px grid + slight rotation variance off (keep axis-aligned) |
| Text debug markers + tiles | Clutter | Plan 4B removal; reduce label font in 4A if kept |
| Arrows left permanently | Noise / childish | Time-limit or first-match only |
| Cosmetic walls misalign collision | Trust break | Gate gap must align with playable opening |
| High-ground purple tint vs Mage VFX | Hue collision | High ground uses stone blue-gray, not arcane purple |

---

## 9. Acceptance Criteria

| # | Check | Pass |
|---|---|---|
| L1 | Standing at blue spawn, main route obvious without UI text | ☐ |
| L2 | Left flank reads "high/elevated"; right reads "dark/narrow" | ☐ |
| L3 | `road_crossing` visible at mid (siege ruins y ≈ 2100) | ☐ |
| L4 | Blue/red base floors read as team territory | ☐ |
| L5 | Gate wall art matches playable gap (no false openings) | ☐ |
| L6 | 915×412: three tile types distinguishable in one screenshot | ☐ |
| L7 | Joystick + skill buttons never covered by map art | ☐ |
| L8 | Menu ↔ Match ×3 — no ghost tiles | ☐ |
| L9 | Combat VFX + projectiles still visible on all routes | ☐ |
