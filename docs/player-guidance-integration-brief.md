# Player Guidance Integration Brief (for Agent A — future Phase 4B)

> Forward-looking brief for the runtime track to integrate the Phase 4B-B2
> Player Guidance Marker Asset Pack when the **Phase 4B objective runtime**
> begins. **This is not a work order — do not start runtime work from this
> doc.** Authored by Lane B (Agent B); execution belongs to Lane A (Agent A).
>
> Aligns with conventions from Phase 4A (map visual), Phase 3B-B4 (objective
> bases), and Phase 4B-B (objective feedback, PR #18):
> - World-space markers → main camera, `uiCamera.ignore()`
> - HUD alerts → use PR #18 `ui_*` icons on UI camera (do not duplicate)
> - Scene shutdown → destroy all guidance markers

References: `docs/phase-4b-b2-player-guidance-marker-asset-pack.md`,
`docs/player-guidance-asset-manifest.md`,
`docs/objective-feedback-integration-brief.md`,
`docs/objective-feedback-asset-manifest.md`, `docs/art-style-guide.md`.

---

## 1. Allowed scope (when Phase 4B runtime is approved)

- Load guidance SVGs from `public/assets/player-guidance/**` via Phaser
  loader alongside existing objective and feedback assets.
- Render markers as world-space sprites at guidance anchor positions.
- Show/hide markers based on guidance state (tutorial, priority objective,
  defend/attack prompts).
- Pair world markers with PR #18 HUD icons for the same guidance event
  (e.g. `attack_gate_marker` in world + `ui_attack_gate` on HUD).
- Animate `proximity_hint_ring` and `main_route_guidance_pulse` via
  runtime tweens (scale/opacity).
- Respect marker priority table — only one directional marker per objective.

## 2. Assets to integrate first (priority)

1. `go_to_gate_marker.svg` — basic onboarding / first-match direction
2. `attack_gate_marker.svg` + PR #18 `ui_attack_gate.svg` — attack prompt
3. `defend_core_marker.svg` + PR #18 `ui_defend_core.svg` — defend prompt
4. `objective_priority_marker.svg` — top-priority objective highlight
5. `retreat_to_core_marker.svg` — fall-back guidance

## 3. Assets to integrate second

- `rally_point_marker.svg`, `fallback_defense_marker.svg` — team reposition
- `interact_here_marker.svg`, `proximity_hint_ring.svg` — capture proximity
- `route_hint_arrow.svg`, `main_route_guidance_pulse.svg` — route tutorial
- `danger_edge_warning.svg` — edge hazard hint

## 4. Files the runtime agent would touch (future)

- Preload/boot step — register `player-guidance/*` textures
- Guidance module under `src/game/**` (e.g. `PlayerGuidanceRenderer.ts`)
- Pair with existing `ObjectiveFeedbackRenderer` (PR #18 runtime)
- **No changes** to `skills.ts`, `heroes.ts`, balance, or input files

## 5. Preload / render / cleanup expectations

### Preload

```text
// Pseudocode — Agent A implements in Phaser preload
this.load.svg('pg_go_gate', 'assets/player-guidance/go_to_gate_marker.svg');
// ... all 12 keys under a consistent prefix, e.g. pg_*
```

### World-space markers

| Step | Action |
|---|---|
| Create | Spawn marker sprite at guidance anchor `(x, y)`; rotate `route_hint_arrow` to facing |
| Update | Swap texture on guidance type change; respect priority table |
| Animate | `proximity_hint_ring`, `main_route_guidance_pulse` — runtime scale/opacity tween |
| Temporary | Tween alpha 1→0, destroy when guidance event ends |
| Camera | `registerWorldObject(marker)` → `uiCamera.ignore(marker)` |
| Shutdown | Destroy all guidance markers on `MatchScene` shutdown |

### Pairing with PR #18 HUD icons

| World marker | HUD companion (PR #18) |
|---|---|
| `attack_gate_marker` | `ui_attack_gate` |
| `defend_core_marker` | `ui_defend_core` |
| `go_to_gate_marker` | `ui_capture_now` (optional) |
| `retreat_to_core_marker` | `ui_defend_core` (optional) |
| `objective_priority_marker` | `ui_objective_claimed` (optional) |

HUD icons render on UI camera; world markers on main camera. Never parent
HUD icons to world objects.

### Layering with PR #18 feedback

When both feedback overlay and guidance marker are active on the same
objective:
1. Feedback overlay (PR #18) at objective depth
2. Guidance marker offset or above feedback (higher `setDepth()`)
3. Only one directional guidance marker at a time

## 6. Suggested scale (starting points)

| Marker | Display size (world px) | Notes |
|---|---|---|
| Direction markers (go/attack/defend) | 56–88 | Anchor near objective |
| Priority marker | 72–96 | Centered on top-priority objective |
| Proximity ring | Scale to hint radius | Ground-level, semi-transparent |
| Route arrow | 48–72 | Rotate to route direction |
| Route pulse | 80–120 along route segment | Multiple instances along path |
| Danger edge warning | 96–128 | Place at map boundary / edge |
| Rally / fallback | 64–88 | At rally/fallback anchor point |

## 7. Tests that should pass (when integrated)

- Build passes (`npm run build`).
- Guidance markers render without covering joystick/skill buttons on
  915×412 / 800×360 mobile.
- Only one directional marker visible per objective at a time.
- Temporary markers destroy after tween — no leak across matches.
- Guidance markers visually distinct from PR #18 feedback overlays.
- PR #18 HUD icons pair correctly with world markers.
- Menu ↔ Match × 3 — no guidance art leak; no texture 404s.
- No console errors.
- Existing map (4A), combat (3B-B3), and feedback (4B-B) regressions pass.

## 8. Forbidden runtime behavior

- ❌ `route_hint_arrow.svg` must **not** implement pathfinding or AI routing.
- ❌ `proximity_hint_ring.svg` must **not** implement capture radius or
  collision detection — visual proximity hint only.
- ❌ `danger_edge_warning.svg` must **not** apply damage or enforce screen
  bounds — visual edge warning only.
- ❌ `interact_here_marker.svg` must **not** trigger capture or interaction
  logic — visual approach hint only.
- ❌ `attack_gate_marker.svg` must **not** apply gate damage — visual
  attack direction only.
- ❌ `defend_core_marker.svg` must **not** implement core HP or immunity.
- ❌ `rally_point_marker.svg` must **not** implement bot rally or spawn.
- ❌ `retreat_to_core_marker.svg` must **not** teleport or force movement.
- ❌ `main_route_guidance_pulse.svg` must **not** define lane routing logic.
- ❌ Do not duplicate PR #18 HUD icons — reference existing `ui_*` assets.
- ❌ No guidance gameplay logic in a pure visual pass unless explicitly scoped.
- ❌ No changes to existing asset packs.
- ❌ No Phase-label / README status change unless formally advanced.

---

## Sequencing note

This brief assumes PR #18 (objective feedback) and Phase 4A (map visual)
are merged. Player guidance markers are stock art for the **same Phase 4B
runtime PR** or a follow-on guidance sub-pass — but only when a separate
work order is issued. Lane B will prepare additional QA docs when approved.
