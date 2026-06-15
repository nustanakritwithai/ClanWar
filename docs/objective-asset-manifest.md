# Objective Asset Manifest

> Catalogue of objective map art in `public/assets/objectives/`. Covers the
> original PR #4 neutral set **and** the Phase 3B-B4 team/state pack. **Static
> art only — not wired into the runtime.** Integration is owned by the
> runtime track (future Phase 4). All assets `256×256`, transparent,
> hand-authored SVG primitives, validated well-formed XML.
>
> Naming convention:
> - `<objective>.svg` — neutral / default (PR #4)
> - `<objective>_<team>.svg` — pre-tinted team variant (`blue` / `red`)
> - `<objective>_<kind>.svg` — typed variant (e.g. `resource_camp_ore`)
> - `<state>.svg` / `objective_<state>.svg` — shared state overlays

## Phase 3B-B4 pack (new)

| Asset path | Category | World/UI | Suggested scale (world px) | State / variant | Status |
|---|---|---|---|---|---|
| `objectives/blue_gate.svg` | Gate | World | ~96–128 wide | Blue-owned | ✅ |
| `objectives/red_gate.svg` | Gate | World | ~96–128 wide | Red-owned | ✅ |
| `objectives/blue_core.svg` | Core/nexus | World | ~120–160 wide | Blue-owned | ✅ |
| `objectives/red_core.svg` | Core/nexus | World | ~120–160 wide | Red-owned | ✅ |
| `objectives/watchtower_neutral.svg` | Watchtower | World | ~80–110 wide | Uncaptured | ✅ |
| `objectives/watchtower_blue.svg` | Watchtower | World | ~80–110 wide | Blue-held | ✅ |
| `objectives/watchtower_red.svg` | Watchtower | World | ~80–110 wide | Red-held | ✅ |
| `objectives/forward_camp_blue.svg` | Camp | World | ~80–110 wide | Blue | ✅ |
| `objectives/forward_camp_red.svg` | Camp | World | ~80–110 wide | Red | ✅ |
| `objectives/resource_camp_food.svg` | Resource | World | ~72–96 wide | Food node | ✅ |
| `objectives/resource_camp_ore.svg` | Resource | World | ~72–96 wide | Ore node | ✅ |
| `objectives/resource_camp_wood.svg` | Resource | World | ~72–96 wide | Wood node | ✅ |
| `objectives/capture_ring.svg` | Overlay | World (ground) | scale to capture radius | Neutral, tintable | ✅ |
| `objectives/objective_warning.svg` | Overlay | World (above obj) | ~40–56 wide | Neutral/amber | ✅ |
| `objectives/objective_destroyed.svg` | State | World | match base footprint | Destroyed | ✅ |

## Original neutral set (PR #4 — reused, unchanged)

| Asset path | Category | World/UI | State / variant | Status |
|---|---|---|---|---|
| `objectives/core.svg` | Core/nexus | World | Neutral default | ✅ (PR #4) |
| `objectives/gate.svg` | Gate | World | Neutral default | ✅ (PR #4) |
| `objectives/watchtower.svg` | Watchtower | World | Neutral default | ✅ (PR #4) |
| `objectives/resource_camp.svg` | Resource | World | Neutral generic | ✅ (PR #4) |
| `objectives/forward_camp.svg` | Camp | World | Neutral default | ✅ (PR #4) |
| `objectives/siege_ruins.svg` | Ruins | World | Neutral default | ✅ (PR #4, reused as-is) |
| `objectives/spawn.svg` | Spawn | World | Neutral/blue portal | ✅ (PR #4) |

## Suggested state-set groupings (for the runtime to swap textures)

| Objective | Intact (neutral) | Blue | Red | Destroyed |
|---|---|---|---|---|
| Gate | `gate.svg` | `blue_gate.svg` | `red_gate.svg` | `objective_destroyed.svg` |
| Core | `core.svg` | `blue_core.svg` | `red_core.svg` | `objective_destroyed.svg` |
| Watchtower | `watchtower_neutral.svg` | `watchtower_blue.svg` | `watchtower_red.svg` | `objective_destroyed.svg` |
| Forward camp | `forward_camp.svg` | `forward_camp_blue.svg` | `forward_camp_red.svg` | `objective_destroyed.svg` |
| Resource | `resource_camp_food/ore/wood.svg` | (n/a) | (n/a) | `objective_destroyed.svg` |

> Overlays `capture_ring.svg` (progress) and `objective_warning.svg`
> (under-attack) layer on **top of** any of the above at runtime.

## Documentation (`docs/`)

| Path | Purpose | Status |
|---|---|---|
| `docs/phase-3b-b4-objective-asset-pack.md` | Pack art direction & rules | ✅ |
| `docs/objective-asset-manifest.md` | This catalogue | ✅ |
| `docs/objective-visual-integration-brief.md` | Future runtime integration brief | ✅ |

## Integration notes (for the runtime track, future)

- All assets are **world-space map objects** — they belong on the main
  camera and must be `uiCamera.ignore()`-d (same `registerWorldObject()`
  pattern Agent A uses for combat VFX).
- Pre-tinted `blue_*`/`red_*` variants are **texture swaps** on ownership
  change — do not runtime-tint them.
- Neutral overlays (`capture_ring`, `objective_warning`,
  `objective_destroyed`) **may** be runtime-tinted per team.
- These assets must **not** drive gameplay logic until the Phase 4
  objective runtime exists — see the integration brief.
- This pack does **not** touch `src/game/**`, `scripts/**`, `README.md`,
  `package.json`, `public/manifest.webmanifest`, or any
  `vfx/`/`combat/`/`status/`/`icons/` assets.
