# Mobile Player Guidance Readability Checklist

> QA checklist for the future Phase 4B player guidance integration pass.
> **Docs-only** — a reviewer fills this in against a build once Agent A
> wires these assets. No runtime/asset change is made by this file.
>
> Reference: `docs/player-guidance-asset-manifest.md`,
> `docs/player-guidance-integration-brief.md`,
> `docs/phase-4b-b2-player-guidance-marker-asset-pack.md`.

---

## Asset readability (static art review — can be done before runtime)

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Go to gate readable at 64 px | Footsteps + waypoint diamond + gate silhouette legible | ☐ | |
| Attack gate readable at 64 px | Strike chevron + target ring legible; not confused with combat VFX | ☐ | |
| Defend core readable at 64 px | Shield + crystal legible; not confused with PR #18 `ui_defend_core` | ☐ | |
| Rally point readable at 72 px | Inward chevrons + flag legible | ☐ | |
| Retreat to core readable at 64 px | Curved arrow + core crystal legible | ☐ | |
| Priority marker readable at 72 px | Gold star diamond legible; distinct from PR #18 ownership seal | ☐ | |
| Route hint arrow readable at 48 px | Cyan chevron trail legible; distinct from map `path_arrow_*` | ☐ | |
| Danger edge warning readable at 96 px | Diagonal hazard band + chevrons legible | ☐ | |
| Interact here readable at 64 px | Concentric rings + caret legible; not confused with UI button | ☐ | |
| Proximity ring readable at 96 px diameter | Expanding rings legible; distinct from PR #18 `capture_progress_pulse` | ☐ | |
| Route pulse readable at 80 px | Dot trail along line legible | ☐ | |
| Fallback defense readable at 64 px | Shield + backward arrow legible | ☐ | |
| Guidance cyan distinct from team colors | Cyan markers distinguishable from blue/red team assets | ☐ | |
| Not confused with PR #18 feedback | No ownership seals, contested splits, or pressure ripples | ☐ | |
| Not confused with terrain tiles | Markers float above ground; shadow ellipse only | ☐ | |
| No text in any asset | Zero `<text>`, `<tspan>`, font references | ☐ | |
| No raster/base64 | Zero `<image>`, `data:`, embedded PNG/JPG | ☐ | |
| No duplicate PR #18 asset names | Zero filename collisions with `objective-feedback/` | ☐ | |

---

## Runtime integration checks (fill when Agent A wires assets)

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Markers do not block joystick | No guidance marker renders over joystick | ☐ | |
| Markers do not block skill buttons | No guidance marker renders over skill buttons | ☐ | |
| World markers on main camera only | All `player-guidance/*` are world-space and `uiCamera.ignore()`-d | ☐ | |
| HUD uses PR #18 icons only | No duplicate HUD icons from this pack; `ui_*` from PR #18 on UI camera | ☐ | |
| One directional marker per objective | Only one of go/attack/defend/retreat/rally visible at a time | ☐ | |
| Priority marker wins over route hints | `objective_priority_marker` visible when top priority set | ☐ | |
| Temporary markers destroy | Event-driven markers fade and destroy — no linger | ☐ | |
| Guidance distinct from PR #18 feedback | Cyan waypoints vs ownership seals / pressure ripples | ☐ | |
| Guidance distinct from combat VFX | Chevrons/rings vs jagged combat bursts | ☐ | |
| Route arrow rotation works | `route_hint_arrow` rotates to route direction correctly | ☐ | |
| Proximity ring scales correctly | `proximity_hint_ring` scales to hint radius | ☐ | |
| 915×412 mobile | Full guidance cycle readable at 915×412 | ☐ | |
| 800×360 compact | Compact layout still readable | ☐ | |
| Menu ↔ Match × 3, no leak | After 3 cycles with guidance events, no leftover markers | ☐ | |
| No console errors | No asset-load or render errors | ☐ | |
| Mobile multi-touch unaffected | Joystick + skill simultaneous use still works | ☐ | |
| No forbidden logic implied | Pathfinding/capture/collision/damage not auto-implemented | ☐ | |

---

## Pass criteria

Static art review may pass before runtime integration. Full integration may
proceed to review if **all** rows pass, with special attention to:

- Guidance markers visually distinct from PR #18 feedback overlays
- Guidance markers visually distinct from map terrain and combat VFX
- No UI/world camera mixup
- No lingering temporary markers
- No control occlusion on mobile
- PR #18 HUD icons reused (not duplicated)

Any leak, camera mixup, visual confusion with feedback/terrain/VFX, or
gameplay-logic creep from visual-only markers is a blocker.
