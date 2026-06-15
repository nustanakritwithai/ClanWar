# Objective Feedback Asset Manifest

> Catalogue of objective feedback art in `public/assets/objective-feedback/`.
> **Static art only — not wired into the runtime.** Integration is owned by
> the Phase 4B objective runtime track (Agent A). All assets `256×256`,
> transparent, hand-authored SVG primitives, validated well-formed XML.
>
> Naming convention:
> - `objective_<state>.svg` / `objective_<state>_<team>.svg` — world-space
>   ownership/alert overlays
> - `capture_*` / `ownership_*` — world-space one-shot or transient overlays
> - `gate_breached_*` / `core_vulnerable_*` — world-space objective-state
>   visuals
> - `ui_*.svg` — UI-space HUD alert icons (dark rounded frame)

---

## World-space overlays (13)

| Asset path | Category | World/UI | Suggested display size | Persistence | Status |
|---|---|---|---|---|---|
| `objective-feedback/objective_claimed_blue.svg` | Ownership | World | 64–96 wide overlay | Persistent while owned | ✅ |
| `objective-feedback/objective_claimed_red.svg` | Ownership | World | 64–96 wide overlay | Persistent while owned | ✅ |
| `objective-feedback/objective_contested.svg` | Ownership | World | 80–112 wide overlay | Persistent while contested | ✅ |
| `objective-feedback/objective_under_attack.svg` | Alert | World | 72–96 wide overlay | Persistent while pressured | ✅ |
| `objective-feedback/objective_defended.svg` | Alert | World | 72–96 wide overlay | One-shot or short hold | ✅ |
| `objective-feedback/objective_lost.svg` | Ownership | World | 64–96 wide overlay | One-shot or short hold | ✅ |
| `objective-feedback/capture_progress_pulse.svg` | Capture | World (ground) | Scale to capture radius | Persistent while capturing | ✅ |
| `objective-feedback/capture_complete_burst.svg` | Capture | World | 80–120 wide | One-shot effect | ✅ |
| `objective-feedback/ownership_swap_flash.svg` | Ownership | World | 96–128 wide | One-shot effect (~0.3–0.6s) | ✅ |
| `objective-feedback/gate_breached_blue.svg` | Gate state | World | 96–128 wide | Persistent breach state | ✅ |
| `objective-feedback/gate_breached_red.svg` | Gate state | World | 96–128 wide | Persistent breach state | ✅ |
| `objective-feedback/core_vulnerable_blue.svg` | Core state | World | 96–128 wide | Persistent vulnerable state | ✅ |
| `objective-feedback/core_vulnerable_red.svg` | Core state | World | 96–128 wide | Persistent vulnerable state | ✅ |

## UI-space / HUD alert icons (7)

| Asset path | Category | World/UI | Suggested display size | Persistence | Status |
|---|---|---|---|---|---|
| `objective-feedback/ui_objective_under_attack.svg` | HUD alert | UI | 32–48 badge | While alert active | ✅ |
| `objective-feedback/ui_gate_breached.svg` | HUD alert | UI | 32–48 badge | While alert active | ✅ |
| `objective-feedback/ui_core_vulnerable.svg` | HUD alert | UI | 32–48 badge | While alert active | ✅ |
| `objective-feedback/ui_objective_claimed.svg` | HUD alert | UI | 32–48 badge | Short toast / banner | ✅ |
| `objective-feedback/ui_defend_core.svg` | HUD guidance | UI | 32–48 badge | While guidance active | ✅ |
| `objective-feedback/ui_attack_gate.svg` | HUD guidance | UI | 32–48 badge | While guidance active | ✅ |
| `objective-feedback/ui_capture_now.svg` | HUD guidance | UI | 32–48 badge | While guidance active | ✅ |

---

## Objective state mapping (suggested texture/overlay swaps)

> Runtime maps **game state → visual**. This table is guidance only — no
> logic is implemented by this pack.

| Game state (future) | Primary world overlay | Optional one-shot | HUD icon |
|---|---|---|---|
| Neutral / uncaptured | (none — use base `objectives/*.svg`) | — | — |
| Blue-owned | `objective_claimed_blue.svg` | `ownership_swap_flash.svg` on flip | `ui_objective_claimed.svg` |
| Red-owned | `objective_claimed_red.svg` | `ownership_swap_flash.svg` on flip | `ui_objective_claimed.svg` |
| Contested | `objective_contested.svg` | — | `ui_capture_now.svg` |
| Under attack | `objective_under_attack.svg` | — | `ui_objective_under_attack.svg` |
| Successfully defended | `objective_defended.svg` (brief) | — | `ui_defend_core.svg` |
| Ownership lost | `objective_lost.svg` (brief) | `ownership_swap_flash.svg` | — |
| Capturing (in progress) | `capture_progress_pulse.svg` | — | `ui_capture_now.svg` |
| Capture complete | — | `capture_complete_burst.svg` | `ui_objective_claimed.svg` |
| Gate breached (blue) | `gate_breached_blue.svg` | — | `ui_gate_breached.svg` |
| Gate breached (red) | `gate_breached_red.svg` | — | `ui_gate_breached.svg` |
| Core vulnerable (blue) | `core_vulnerable_blue.svg` | — | `ui_core_vulnerable.svg` |
| Core vulnerable (red) | `core_vulnerable_red.svg` | — | `ui_core_vulnerable.svg` |
| Attack gate (guidance) | — | — | `ui_attack_gate.svg` |
| Defend core (guidance) | — | — | `ui_defend_core.svg` |

### Pairing with Phase 3B-B4 base sprites

| Objective type | Base sprite (PR #13) | Feedback overlay (this pack) |
|---|---|---|
| Gate (intact) | `gate.svg` / `blue_gate.svg` / `red_gate.svg` | `objective_claimed_*`, `objective_under_attack`, etc. |
| Gate (breached) | Replace base with `gate_breached_blue/red.svg` | Optional `objective_under_attack` on top |
| Core (protected) | `core.svg` / `blue_core.svg` / `red_core.svg` | — |
| Core (vulnerable) | Keep base sprite | `core_vulnerable_blue/red.svg` overlay |
| Watchtower / camp | `watchtower_*.svg` / `forward_camp_*.svg` | `objective_claimed_*`, `objective_contested`, `capture_progress_pulse` |
| Destroyed | `objective_destroyed.svg` (PR #13) | Remove all feedback overlays |

---

## Overlay vs HUD vs one-shot classification

| Type | Assets | Runtime behavior (future) |
|---|---|---|
| **Persistent overlay** | `objective_claimed_*`, `objective_contested`, `objective_under_attack`, `capture_progress_pulse`, `gate_breached_*`, `core_vulnerable_*` | Show/hide with state; parent to objective world position |
| **One-shot effect** | `capture_complete_burst`, `ownership_swap_flash`, `objective_defended`, `objective_lost` | Spawn, tween fade/scale, destroy |
| **HUD alert** | All `ui_*.svg` | UI camera sprite; main camera ignores |

---

## Documentation (`docs/`)

| Path | Purpose | Status |
|---|---|---|
| `docs/phase-4b-b-objective-feedback-asset-pack.md` | Pack art direction & rules | ✅ |
| `docs/objective-feedback-asset-manifest.md` | This catalogue | ✅ |
| `docs/objective-feedback-integration-brief.md` | Future runtime integration brief | ✅ |
| `docs/mobile-objective-feedback-checklist.md` | Mobile readability QA checklist | ✅ |

---

## Integration notes (for the runtime track, future)

- World-space overlays belong on the **main camera** and must be
  `uiCamera.ignore()`-d (same `registerWorldObject()` pattern as combat
  VFX and objective bases).
- UI icons belong on the **UI camera** and must be ignored by the main
  camera — never parented to world objects.
- Pre-tinted `*_blue` / `*_red` variants are **texture swaps** — do not
  runtime-tint them.
- Neutral overlays (`objective_contested`, `capture_progress_pulse`) **may**
  be runtime-tinted per team if desired.
- These assets must **not** drive gameplay logic — see integration brief.
- This pack does **not** touch `src/game/**`, `scripts/**`, `README.md`,
  `package.json`, `public/manifest.webmanifest`, or any existing asset
  packs under `objectives/`, `map/`, `vfx/`, `combat/`, `status/`.
