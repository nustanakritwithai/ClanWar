# Map Visual Integration Brief (for Agent A — future)

> Forward-looking brief for integrating the Phase 3B-B5 Map Environment
> Asset Pack when **map/route runtime** is approved. **This is not a work
> order — do not start runtime work from this doc.** Asset-only pack; execution
> belongs to a **separate runtime PR** (Lane A).
>
> Aligns with conventions from Phase 3B-B3/B4:
> - World-space map art → main camera, `uiCamera.ignore()`
> - UI minimap (if any) → UI camera, main camera ignores

References: `docs/phase-3b-b5-map-environment-asset-pack.md`,
`docs/map-environment-asset-manifest.md`, `docs/art-style-guide.md`,
`docs/objective-visual-integration-brief.md`.

---

## 1. Allowed scope (when map runtime is approved)

- Load map SVGs from `public/assets/map/**` via Phaser loader
- Render route tiles, walls, bridges, spawn platforms as **world-space**
  sprites or tilemap layers on the main camera
- Place lane markers, path arrows, choke/danger overlays as world objects
- Pair terrain with **objective icons** from `public/assets/objectives/**`
  (PR #13) at map points — objectives stay separate textures
- Rotate `path_arrow_*.svg` to match route direction at placement time
- Tint team floors sparingly if needed; base art already encodes team hue

## 2. Integration priority (suggested)

1. **Base loop terrain** — `base_floor_blue/red`, `spawn_platform_blue/red`,
   `main_route_tile`, `road_crossing`
2. **Three-route identity** — `high_ground_tile`, `shadow_route_tile`,
   ramps + sewer entrance/exit
3. **Structures** — walls, bridges, choke markers
4. **Guide overlays** — path arrows (tutorial/minimap), danger/blocker markers

## 3. Camera / cleanup expectations

| Object type | Camera | Cleanup |
|---|---|---|
| Tile layers (route/base) | Main | Destroy on scene shutdown / map unload |
| Structures (wall, bridge) | Main | Persistent per map instance; destroy on map replace |
| Lane markers, path arrows | Main | Destroy when route guide hidden or scene ends |
| Danger / blocker overlays | Main | Tween fade + destroy when hint dismissed |
| Minimap clones (future) | UI | Separate UI-camera sprites; never on main HUD buttons |

All world objects must pass through `registerWorldObject()` (or equivalent)
so they never render over joystick / skill buttons.

## 4. Suggested scale (starting points)

| Category | Display size (px) | Notes |
|---|---|---|
| Route/base tiles | 128–256 | Repeat or snap to grid |
| Spawn platform | 200–256 | One per spawn point |
| Lane marker | 64–96 | At route branch points |
| Path arrow | 48–80 | Rotate to facing |
| Wall segment | 128–192 width | Tile horizontally |
| Bridge | 160–224 width | Span gaps |
| Overlays | 96–200 | Semi-transparent, short lifetime |

## 5. Forbidden runtime behavior

- ❌ `movement_blocker_marker.svg` must **not** auto-create collision —
  collision is a separate physics/map-data system
- ❌ `danger_zone_marker.svg` must **not** apply damage — visual hint only
- ❌ `path_arrow_*.svg` must **not** drive pathfinding or AI routing
- ❌ High ground / sewer tiles must **not** imply gameplay modifiers until
  a scoped elevation/stealth system exists
- ❌ No changes to combat VFX, skills, objectives logic in the map PR
- ❌ No Phase 4 objective damage/gate/core integration unless that phase
  is explicitly approved as a separate work order

## 6. Files the runtime agent would touch (future)

- Preload step (e.g. `MatchScene.preload()` or dedicated `MapScene`)
- New map module under `src/game/**` (e.g. `MapRenderer.ts`, tile layer setup)
- **Not** this asset pack PR

## 7. Tests that should pass (future runtime PR)

- Build passes; no SVG 404s for `public/assets/map/**`
- Map tiles render on main camera only — joystick/buttons unobstructed
- Menu ↔ Match ×3 — no tile/marker leak
- Mobile 915×412 — three route types distinguishable
- Existing combat/objective regression suites still pass

---

## Sequencing note

Integrate this pack in a **dedicated map-visual PR**, separate from combat
(B3) and objective (B4/Phase 4) runtime work. One concern per PR keeps
review and rollback safe.
