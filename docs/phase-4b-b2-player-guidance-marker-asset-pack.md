# Phase 4B-B2: Player Guidance Marker Asset Pack

> Lane B (Asset / Content Production) deliverable — **stock world-space
> guidance markers for the future Phase 4B objective runtime.** This pack
> adds player-direction visuals (go here, attack, defend, rally, retreat)
> so the runtime track can show onboarding and in-match guidance without
> blocking on art. **This pack adds art and docs only — no runtime, no
> objective logic, no HUD wiring.**
>
> Builds on Phase 4B-B (`public/assets/objective-feedback/**`, PR #18) and
> obeys [`art-style-guide.md`](./art-style-guide.md). **Do not modify**
> existing asset packs.

---

## 1. Goal

Give the future objective runtime (Phase 4B: player guidance, onboarding
hints, route nudges) a complete, readable **guidance visual language**
before it is needed. Every asset is hand-authored SVG from primitives,
transparent background, `256×256` viewBox, no embedded text,
mobile-readable.

This pack answers: *"Where should the player go, attack, defend, rally,
or retreat right now?"* — without implementing pathfinding, capture,
gate/core HP, or any guidance logic.

---

## 2. What this pack adds (12 new assets)

All assets live in `public/assets/player-guidance/`. **World-space only**
— no UI icons (PR #18 already provides HUD alert icons).

| # | Asset | Reads as |
|---|---|---|
| 1 | `go_to_gate_marker.svg` | Walk toward the gate (footsteps + waypoint diamond) |
| 2 | `attack_gate_marker.svg` | Attack the gate (strike chevron + target ring) |
| 3 | `defend_core_marker.svg` | Return to defend the core (shield + crystal) |
| 4 | `rally_point_marker.svg` | Rally / gather here (inward chevrons + flag) |
| 5 | `retreat_to_core_marker.svg` | Retreat back to core/base (curved arrow + safe ring) |
| 6 | `objective_priority_marker.svg` | Highest-priority objective now (gold star diamond) |
| 7 | `route_hint_arrow.svg` | World-space route direction (cyan chevron trail) |
| 8 | `danger_edge_warning.svg` | Danger at map/screen edge (diagonal hazard band) |
| 9 | `interact_here_marker.svg` | Approach and interact here (concentric tap rings) |
| 10 | `proximity_hint_ring.svg` | Player is near objective (expanding proximity rings) |
| 11 | `main_route_guidance_pulse.svg` | Main route pulse along path (dot trail) |
| 12 | `fallback_defense_marker.svg` | Fall back and hold defensive position (shield + back arrow) |

---

## 3. Style rules followed

- Top-down 2D, transparent background, SVG primitives only — no raster,
  no external fonts, no copyrighted marks, no embedded base64.
- `256×256` viewBox, centered subject, thick dark outline (`#0b0e13`,
  ~5–12 units), clear silhouette.
- **Guidance cyan** (`#22d3ee` / `#67e8f9`) as the primary guidance hue —
  distinct from team blue/red, amber warnings (PR #18), and combat
  orange/gold bursts.
- Contextual accents: red for attack, blue for defend/fallback, gold for
  priority, orange for danger edge.
- **No text inside any image** — all glyphs are drawn shapes.
- Markers use **waypoints, footsteps, chevrons, rings, and flags** —
  deliberately **not** ownership seals, contested split rings, or combat
  jagged bursts.
- Ground shadow ellipse under markers for world anchoring — not terrain tiles.

### Relationship to PR #18 (Objective Feedback)

| PR #18 (objective-feedback) | PR 4B-B2 (this pack) |
|---|---|
| Objective **state** feedback (claimed, under attack, vulnerable) | Player **direction** guidance (go here, attack, defend) |
| Ownership overlays on objectives | Waypoint markers near/at objectives |
| HUD alert icons (`ui_*`) | World-space only — reuse PR #18 HUD icons |
| Pennants, seals, pressure ripples | Footsteps, chevrons, rally rings, priority stars |

Both packs may be visible simultaneously. Guidance markers sit at a
**higher depth** than feedback overlays when both are active.

---

## 4. Mobile readability notes

- One concept per marker; recognizable at **48–96 px** display size.
- Thick strokes (≥ 5 units); no hairlines.
- Guidance cyan + shape cue (diamond, chevron, star) — not color alone.
- Markers kept semi-transparent so they do not obscure units or objectives.
- `proximity_hint_ring` and `main_route_guidance_pulse` designed for
  runtime animation (scale/opacity tween) — static art is the keyframe.

---

## 5. What should be deferred (NOT in this pack)

- Any **guidance runtime logic** (when to show/hide markers, priority
  scoring, bot hints) — runtime track, Phase 4B runtime PR.
- **Animation implementation** — static art; runtime owns tweens.
- **HUD icons** — PR #18 already provides `ui_attack_gate`,
  `ui_defend_core`, `ui_capture_now`, etc.
- **Minimap** — no minimap frame, dots, or route indicators.
- **Pathfinding / collision** — markers are visual hints only.
- **Tutorial text / voiceover** — separate content scope.
- **Modifying** any existing asset packs.

---

## 6. Don'ts (carried from kit rules)

- ❌ No text/numbers baked into any asset.
- ❌ No raster/embedded images, no icon fonts.
- ❌ No runtime integration, objective logic, or map edits from this pack.
- ❌ Markers must **not** be mistaken for skill effects, terrain tiles,
  or objective ownership overlays.
- ❌ Do not duplicate PR #18 asset names or visual language.

---

## 7. Documentation in this deliverable

| Path | Purpose |
|---|---|
| `docs/phase-4b-b2-player-guidance-marker-asset-pack.md` | This pack art direction & rules |
| `docs/player-guidance-asset-manifest.md` | Full asset catalogue |
| `docs/player-guidance-integration-brief.md` | Future runtime integration brief for Agent A |
| `docs/mobile-player-guidance-checklist.md` | Mobile readability QA checklist |
