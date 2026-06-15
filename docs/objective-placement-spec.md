# Objective Placement Spec — Small Twin Fortress

> **Agent C design spec** — where objectives sit relative to routes and how
> they should read before Phase 4B wires icons + gameplay. Coordinates match
> `src/game/data/map-small-twin-fortress.ts`.
>
> References: `docs/objective-asset-manifest.md`,
> `docs/objective-visual-integration-brief.md`, `docs/map-layout-spec.md`.

---

## 1. Design Goal

Every objective marker must answer **"why is this here?"** on the map. Placement
follows route geography so Phase 4B can add sprites without redesigning layout.

---

## 2. Player Experience

| Objective | Player mental model |
|---|---|
| **Core** | "Win by destroying this — deepest in base, behind gate." |
| **Gate** | "I must break this to reach their core — it's on the wall line." |
| **Forward camp** | "Advanced foothold on a side route — closer to mid fights." |
| **Siege ruins** | "Center of the map — everyone fights here." |
| **Watchtower** | "High ground lookout — controls vision of mid (later)." |
| **Resource camps** | "Side income — off the main push path." |

---

## 3. Layout / System Rules

### 3.1 Placement table (authoritative coordinates)

| ID | Type | Team | Position (x, y) | Route context | Terrain underfoot |
|---|---|---|---|---|---|
| `blueSpawn` | spawn | blue | (1500, 3900) | Main — base rear | `spawn_platform_blue` + `base_floor_blue` |
| `blueCore` | core | blue | (1500, 3700) | Main — inside base | `base_floor_blue` |
| `blueGate` | gate | blue | (1500, 3200) | Main — gate choke | `base_floor_blue` → main route south |
| `forwardCampL` | forwardCamp | neutral | (900, 2550) | **High ground** left | `high_ground_tile` |
| `forwardCampR` | forwardCamp | neutral | (2100, 2550) | **Shadow** right | `shadow_route_tile` |
| `siegeRuins` | siegeRuins | neutral | (1500, 2100) | **Main** mid junction | `road_crossing` + broken wall |
| `resourceCampL` | resource | neutral | (850, 1700) | High ground outer | `high_ground_tile` / neutral patch |
| `resourceCampR` | resource | neutral | (2150, 1700) | Shadow outer | `shadow_route_tile` |
| `watchtower` | watchtower | neutral | (1500, 1600) | Main mid — elevated read | `high_ground_tile` or neutral on main |
| `redGate` | gate | red | (1500, 1000) | Main — gate choke | `base_floor_red` → main north |
| `redCore` | core | red | (1500, 500) | Main — inside base | `base_floor_red` |
| `redSpawn` | spawn | red | (1500, 300) | Main — base rear | `spawn_platform_red` + `base_floor_red` |

### 3.2 Scale (world px display width)

| Type | Suggested width | Z-order |
|---|---|---|
| Core | 120–160 | 20 |
| Gate | 96–128 | 20 |
| Spawn platform (terrain) | 200–256 | -10 (floor) |
| Forward camp | 80–110 | 18 |
| Siege ruins | 100–140 | 18 |
| Watchtower | 80–110 | 22 (taller silhouette) |
| Resource camp | 72–96 | 18 |

### 3.3 Label rules (until icons land)

- **Phase 4A:** debug text labels acceptable if objective icons not yet placed.
- **Phase 4B:** remove text labels; icon silhouette must carry meaning.
- Never render objective **names** inside SVG assets (already enforced by Agent B).

### 3.4 Team color at placement

| Location | Initial texture (4B visual pass) |
|---|---|
| Blue core/gate | `blue_core.svg` / `blue_gate.svg` |
| Red core/gate | `red_core.svg` / `red_gate.svg` |
| Neutral objectives | neutral variants per manifest |
| Spawn | `spawn.svg` at both spawns (team floor carries color) |

---

## 4. MVP Scope

**Phase 4B — first objectives to render (in order):**

1. `blue_gate` / `red_gate` — establishes siege target
2. `blue_core` / `red_core` — establishes win condition
3. `siege_ruins` — midfield anchor
4. `spawn` platforms (objective icon optional if terrain platform enough)

**Defer icon placement to 4B.1+:**

- Forward camps, watchtower, resource camps (keep debug circles or omit)

---

## 5. Deferred

- `capture_ring.svg` — needs capture progress %
- `objective_warning.svg` — needs under-attack state
- `objective_destroyed.svg` — needs destroy state machine
- Resource type selection (food/ore/wood) — pick **one** type per camp in MVP

---

## 6. Implementation Brief for Agent A

1. Use marker `x, y` from `MapDefinition` as sprite anchor (center-bottom or
   center-center — pick one, document in code comment).
2. Swap textures per `objective-asset-manifest` state table — no `setTint` on
   `blue_*`/`red_*`.
3. Gate/core sprites must sit **on** gate line y (3200 / 1000) — not floating
   offset into walls.
4. When replacing `drawMarkers()`, keep hit/debug radii in data for future
   interaction — do not delete `radius` field.
5. Forward camp L/R placement validates route teaching: **left = high**,
   **right = shadow** — do not swap.

---

## 7. Asset Brief for Agent B

No new assets for placement pass. If playtest shows ruins vs watchtower confusion
at mid, request **taller watchtower silhouette** revision only — not new types.

---

## 8. Risk

| Risk | Mitigation |
|---|---|
| Gate icon clipped by wall art | Render gate **in front of** wall base, behind portcullis arch if layered |
| Too many mid objectives | MVP show ruins only; hide resource icons until economy phase |
| Forward camps imply capture before system exists | Use neutral `forward_camp.svg` without capture ring |
| Text labels + icons double-read | Remove labels same PR as icons |

---

## 9. Acceptance Criteria

| # | Check | Pass |
|---|---|---|
| O1 | Gate sprites centered on gate gap (x=1500) | ☐ |
| O2 | Core behind gate toward spawn — not past gate toward enemy | ☐ |
| O3 | Siege ruins at mid crossing — visible from all 3 routes | ☐ |
| O4 | Forward camp L on high-ground side, R on shadow side | ☐ |
| O5 | No objective sprite covers joystick/skill UI | ☐ |
| O6 | Icons readable at 915×412 without text labels | ☐ |
