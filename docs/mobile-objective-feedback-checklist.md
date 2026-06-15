# Mobile Objective Feedback Readability Checklist

> QA checklist for the future Phase 4B objective feedback integration pass.
> **Docs-only** — a reviewer fills this in against a build once Agent A
> wires these assets. No runtime/asset change is made by this file.
>
> Reference: `docs/objective-feedback-asset-manifest.md`,
> `docs/objective-feedback-integration-brief.md`,
> `docs/phase-4b-b-objective-feedback-asset-pack.md`.

---

## Asset readability (static art review — can be done before runtime)

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Claimed blue readable at 64 px | Pennant + seal distinguishable from red at thumbnail | ☐ | |
| Claimed red readable at 64 px | Pennant + seal distinguishable from blue at thumbnail | ☐ | |
| Contested readable at 80 px | Split ring + clash bar visible; not confused with skill AoE | ☐ | |
| Under attack readable at 72 px | Inward chevrons + ripple rings visible; not confused with combat hit VFX | ☐ | |
| Defended readable at 72 px | Green shield + check reads as "protected" | ☐ | |
| Lost readable at 64 px | Torn pennant + X reads as "ownership lost" | ☐ | |
| Capture pulse readable at capture radius | Arc segments visible at 96 px ring diameter | ☐ | |
| Capture complete burst readable | Green completion spokes visible; not confused with `impact_burst` | ☐ | |
| Ownership swap flash readable | Diagonal sweep + split color hint visible in brief flash | ☐ | |
| Gate breached blue/red at 96 px | Broken arch + breach opening distinguishable by team color | ☐ | |
| Core vulnerable blue/red at 96 px | Cracked crystal + amber threat ring visible | ☐ | |
| UI under attack at 32 px | Warning triangle legible inside dark frame | ☐ | |
| UI gate breached at 32 px | Broken gate + amber breach arc legible | ☐ | |
| UI core vulnerable at 32 px | Cracked crystal + dashed ring legible | ☐ | |
| UI objective claimed at 32 px | Pennant + check seal legible | ☐ | |
| UI defend core at 32 px | Shield + cross guard legible | ☐ | |
| UI attack gate at 32 px | Gate + red arrow legible | ☐ | |
| UI capture now at 32 px | Ring + inward chevrons legible | ☐ | |
| No text in any asset | Zero `<text>`, `<tspan>`, font references | ☐ | |
| No raster/base64 | Zero `<image>`, `data:`, embedded PNG/JPG | ☐ | |

---

## Runtime integration checks (fill when Agent A wires assets)

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Overlays do not block joystick | No world feedback renders over joystick; joystick stays tappable | ☐ | |
| Overlays do not block skill buttons | No world feedback renders over skill buttons | ☐ | |
| World overlays on main camera only | All `objective_*`, `capture_*`, `gate_breached_*`, `core_vulnerable_*` are world-space and `uiCamera.ignore()`-d | ☐ | |
| HUD icons on UI camera only | All `ui_*` icons are UI-space; main camera ignores them | ☐ | |
| Ownership overlay swaps correctly | Blue claimed ↔ red claimed ↔ contested — only one active at a time | ☐ | |
| One-shot effects destroy | `capture_complete_burst`, `ownership_swap_flash`, `objective_defended`, `objective_lost` fade and destroy — no linger | ☐ | |
| Gate breached visual distinct from destroyed | `gate_breached_*` reads as "open breach"; `objective_destroyed` reads as "rubble" | ☐ | |
| Core vulnerable distinct from under attack | `core_vulnerable_*` (cracked + threat ring) vs `objective_under_attack` (chevrons) | ☐ | |
| Capture pulse does not clutter | `capture_progress_pulse` semi-transparent; units visible inside ring | ☐ | |
| Feedback not confused with skill VFX | Overlays use rings/pennants — not jagged combat bursts | ☐ | |
| HUD icons not confused with map tiles | Dark rounded frame distinguishes UI icons from terrain | ☐ | |
| 915×412 mobile | Full objective feedback cycle readable at 915×412 | ☐ | |
| 800×360 compact | Compact layout still readable; overlays scaled appropriately | ☐ | |
| Menu ↔ Match × 3, no leak | After 3 cycles with ownership/attack/breach states, no leftover overlays or HUD badges | ☐ | |
| No console errors | No asset-load or render errors across the above | ☐ | |
| Mobile multi-touch unaffected | Joystick + skill simultaneous use still works | ☐ | |
| No forbidden logic implied | Capture/gate HP/core HP/damage/minimap not auto-implemented by visuals alone | ☐ | |

---

## Pass criteria

Static art review may pass before runtime integration. Full integration may
proceed to review if **all** rows pass, with special attention to:

- No UI/world camera mixup
- No lingering one-shot effects
- No clutter over mobile controls
- Team colors distinguishable by shape **and** hue
- Visual feedback clearly **not** implementing gameplay systems

Any leak, camera mixup, control occlusion, or gameplay-logic creep from
visual-only assets is a blocker.
