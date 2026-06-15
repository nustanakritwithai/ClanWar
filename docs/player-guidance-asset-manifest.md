# Player Guidance Asset Manifest

> Catalogue of player guidance markers in `public/assets/player-guidance/`.
> **Static art only — not wired into the runtime.** Integration is owned by
> the Phase 4B objective runtime track (Agent A). All assets `256×256`,
> transparent, hand-authored SVG primitives, validated well-formed XML.
>
> **World-space only.** HUD alert icons remain in PR #18
> (`public/assets/objective-feedback/ui_*.svg`).

---

## World-space guidance markers (12)

| Asset path | Category | World/UI | Suggested display size | Persistence | Priority |
|---|---|---|---|---|---|
| `player-guidance/go_to_gate_marker.svg` | Direction | World | 56–80 wide | Temporary (tutorial/onboarding) | Medium |
| `player-guidance/attack_gate_marker.svg` | Combat hint | World | 64–88 wide | Temporary (while gate is target) | High |
| `player-guidance/defend_core_marker.svg` | Defense hint | World | 64–88 wide | Temporary (while core threatened) | High |
| `player-guidance/rally_point_marker.svg` | Rally | World | 72–96 wide | Temporary (event-driven) | Medium |
| `player-guidance/retreat_to_core_marker.svg` | Retreat | World | 64–88 wide | Temporary (low HP / overrun) | High |
| `player-guidance/objective_priority_marker.svg` | Priority | World | 72–96 wide | Persistent while top priority | Highest |
| `player-guidance/route_hint_arrow.svg` | Route | World | 48–72 wide | Temporary (route tutorial) | Low |
| `player-guidance/danger_edge_warning.svg` | Edge warning | World | 96–128 wide | Temporary (edge proximity) | Medium |
| `player-guidance/interact_here_marker.svg` | Interaction | World | 64–80 wide | Temporary (near interactable) | Medium |
| `player-guidance/proximity_hint_ring.svg` | Proximity | World (ground) | Scale to hint radius | While player near objective | Low |
| `player-guidance/main_route_guidance_pulse.svg` | Route pulse | World | 80–120 along route | Temporary (main route tutorial) | Low |
| `player-guidance/fallback_defense_marker.svg` | Fallback | World | 64–88 wide | Temporary (defense fallback) | Medium |

---

## Marker priority (when multiple markers could show)

> Runtime decides which marker wins. This table is guidance only.

| Priority | Marker | When (future) |
|---|---|---|
| 1 (highest) | `objective_priority_marker` | Top objective flagged by guidance system |
| 2 | `defend_core_marker` / `retreat_to_core_marker` | Core threatened or player should fall back |
| 3 | `attack_gate_marker` | Gate is current attack target |
| 4 | `go_to_gate_marker` | Player needs direction toward gate |
| 5 | `rally_point_marker` / `fallback_defense_marker` | Team reposition events |
| 6 | `interact_here_marker` / `proximity_hint_ring` | Near objective interaction zone |
| 7 (lowest) | `route_hint_arrow` / `main_route_guidance_pulse` / `danger_edge_warning` | Ambient route/edge hints |

Only one **directional** marker (go/attack/defend/retreat/rally) should be
visible per objective at a time. Rings and pulses may layer beneath.

---

## Suggested depth / layer order (bottom → top)

1. Map terrain (Phase 4A)
2. `proximity_hint_ring` / `main_route_guidance_pulse` (ground-level)
3. Objective base sprite (`objectives/*.svg`)
4. PR #18 feedback overlays (`objective-feedback/*.svg`)
5. **Player guidance markers** (this pack)
6. Units / combat VFX
7. PR #18 HUD alerts (UI camera, separate)

---

## Interaction with PR #18 objective feedback assets

| Scenario | PR #18 (feedback) | PR 4B-B2 (guidance) |
|---|---|---|
| Gate under attack | `objective_under_attack.svg` on gate | `attack_gate_marker.svg` near gate (if player should engage) |
| Core vulnerable | `core_vulnerable_blue/red.svg` on core | `defend_core_marker.svg` near core |
| Gate breached | `gate_breached_*.svg` replaces gate visual | `go_to_gate_marker.svg` toward enemy gate |
| Capture in progress | `capture_progress_pulse.svg` | `interact_here_marker.svg` at capture point |
| HUD alert | `ui_attack_gate.svg` etc. on UI camera | (no duplicate — use PR #18 HUD icons) |

Guidance markers and feedback overlays are **complementary** — feedback
shows objective state; guidance shows player action direction.

---

## Persistent vs temporary classification

| Type | Assets | Runtime behavior (future) |
|---|---|---|
| **Persistent while condition** | `objective_priority_marker`, `proximity_hint_ring` | Show/hide with guidance condition |
| **Temporary / event-driven** | All others | Spawn on event, tween fade, destroy |
| **Animatable** | `proximity_hint_ring`, `main_route_guidance_pulse` | Runtime tweens scale/opacity |

---

## Documentation (`docs/`)

| Path | Purpose | Status |
|---|---|---|
| `docs/phase-4b-b2-player-guidance-marker-asset-pack.md` | Pack art direction & rules | ✅ |
| `docs/player-guidance-asset-manifest.md` | This catalogue | ✅ |
| `docs/player-guidance-integration-brief.md` | Future runtime integration brief | ✅ |
| `docs/mobile-player-guidance-checklist.md` | Mobile readability QA checklist | ✅ |

---

## Integration notes (for the runtime track, future)

- All markers are **world-space** — main camera, `uiCamera.ignore()`.
- Use guidance cyan markers as-is; do not runtime-tint unless scoped.
- Attack (red) and defend (blue) markers are pre-colored — texture swap only.
- These assets must **not** drive gameplay logic — see integration brief.
- This pack does **not** touch `src/game/**`, `scripts/**`, `README.md`,
  `package.json`, or any existing asset packs.
