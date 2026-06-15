# Phase 4B-B: Objective Feedback / Ownership State Asset Pack

> Lane B (Asset / Content Production) deliverable — **stock visual feedback
> art for the future Phase 4B objective runtime.** This pack adds
> ownership-state overlays, capture feedback, gate/core alert visuals, and
> HUD alert icons so the runtime track can wire objective feedback without
> blocking on art. **This pack adds art and docs only — no runtime, no
> objective logic, no map changes.**
>
> Builds on Phase 3B-B4 (`public/assets/objectives/**`, PR #13) and obeys
> [`art-style-guide.md`](./art-style-guide.md). **Do not modify** the
> existing objective, map, combat, vfx, or status packs.

---

## 1. Goal

Give the future objective runtime (Phase 4B: capture, ownership, gate/core
states, player guidance) a complete, readable, consistent **feedback
visual language** before it is needed. Every asset is hand-authored SVG
from primitives, transparent background, `256×256` viewBox, no embedded
text, mobile-readable.

This pack answers: *"What should the player see when an objective is
claimed, contested, under attack, defended, lost, capturing, or when a
gate is breached / core is vulnerable?"* — without implementing any of
those systems.

---

## 2. What this pack adds (20 new assets)

All assets live in `public/assets/objective-feedback/`.

### World-space overlays (13)

| # | Asset | Reads as |
|---|---|---|
| 1 | `objective_claimed_blue.svg` | Blue team owns objective (pennant + seal ring) |
| 2 | `objective_claimed_red.svg` | Red team owns objective (pennant + seal ring) |
| 3 | `objective_contested.svg` | Both teams fighting for objective (split ring + clash) |
| 4 | `objective_under_attack.svg` | Objective taking pressure (inward chevrons + ripples) |
| 5 | `objective_defended.svg` | Objective successfully protected (green shield + check) |
| 6 | `objective_lost.svg` | Ownership lost (torn pennant + X mark) |
| 7 | `capture_progress_pulse.svg` | Active capture progress visual only (pulsing arc ring) |
| 8 | `capture_complete_burst.svg` | Capture completed visual only (green completion burst) |
| 9 | `ownership_swap_flash.svg` | Ownership changed visual only (diagonal flash sweep) |
| 10 | `gate_breached_blue.svg` | Blue gate breached/opened visual state |
| 11 | `gate_breached_red.svg` | Red gate breached/opened visual state |
| 12 | `core_vulnerable_blue.svg` | Blue core can now be attacked (cracked crystal + threat ring) |
| 13 | `core_vulnerable_red.svg` | Red core can now be attacked (cracked crystal + threat ring) |

### UI-space / HUD alert icons (7)

| # | Asset | Reads as |
|---|---|---|
| 14 | `ui_objective_under_attack.svg` | HUD alert: objective under attack |
| 15 | `ui_gate_breached.svg` | HUD alert: gate breached |
| 16 | `ui_core_vulnerable.svg` | HUD alert: core vulnerable |
| 17 | `ui_objective_claimed.svg` | HUD alert: objective claimed |
| 18 | `ui_defend_core.svg` | HUD alert: defend core |
| 19 | `ui_attack_gate.svg` | HUD alert: attack gate |
| 20 | `ui_capture_now.svg` | HUD alert: capture now |

---

## 3. Style rules followed

- Top-down 2D, transparent background, SVG primitives only (paths, circles,
  rects, lines, gradients) — no raster, no external fonts, no copyrighted
  marks, no embedded base64.
- `256×256` viewBox, centered subject, thick dark outline (`#0b0e13`,
  ~6–13 units), clear silhouette.
- Shared palette with existing packs:
  Team Blue `#3b82f6` / `#2563eb`, Team Red `#ef4444` / `#dc2626`,
  Neutral `#9ca3af`, Warning amber `#f59e0b`, Success green `#4ade80`,
  Core gold `#f4d35e` / `#cfa14a`, stone `#3a4658` / `#4a5870`,
  dark `#1a2230` / `#0b0e13`.
- **No text inside any image** — all glyphs are drawn shapes (bars, dots,
  chevrons, checkmarks).
- World-space overlays use **sparse rings, pennants, and ground markers**
  — deliberately **not** jagged combat bursts or skill rays.
- UI icons use a **dark rounded square frame** (`#1a2230`) so they read
  as HUD glyphs, not map terrain tiles.

### Relationship to Phase 3B-B4 objective pack

| Phase 3B-B4 (PR #13) | Phase 4B-B (this pack) |
|---|---|
| Objective **base sprites** (`gate.svg`, `blue_core.svg`, …) | Objective **feedback overlays** on top of bases |
| `capture_ring.svg` (neutral ground ring) | `capture_progress_pulse.svg` (active pulse variant) |
| `objective_warning.svg` (amber triangle) | `objective_under_attack.svg` (pressure ripples) + HUD variants |
| `objective_destroyed.svg` (rubble state) | `gate_breached_*.svg` (breach-specific gate state) |

The runtime may use both packs together. This pack does **not** replace
or modify PR #13 assets.

---

## 4. Mobile readability notes

- One concept per asset; recognizable as a solid shape at **48–96 px**
  display size.
- Thick strokes (≥ 6 units); no hairlines.
- Team identity carried by **both color and shape cue** (pennant, seal,
  split ring, portcullis color) — not color alone.
- World overlays kept **sparse and semi-transparent** so they do not
  obscure units or the objective base sprite beneath.
- UI icons use high-contrast frame + central glyph for legibility at
  **32–48 px** HUD badge size.
- `capture_progress_pulse` and `ownership_swap_flash` are designed for
  runtime animation (opacity/scale tween) — static art is the keyframe.

---

## 5. What should be deferred (NOT in this pack)

- Any **objective runtime logic** (capture progress, ownership rules,
  gate/core HP, damage) — runtime track, Phase 4B runtime PR.
- **Animation implementation** — all assets are static; runtime owns
  pulse/sweep/fade tweens.
- **Minimap** — no minimap frame, dots, or route indicators in this pack.
- **Status / buff / debuff icons** — separate future pack.
- **Tutorial / player guidance markers** (go here, attack this) — separate
  future pack.
- **Respawn-safe zone visual** — deferred until respawn guidance scope is
  defined by Agent C.
- **HUD runtime wiring** — icons are stock art only; no HUD layout changes.
- **Modifying** `public/assets/objectives/**`, `map/**`, `vfx/**`,
  `combat/**`, or `status/**`.

---

## 6. Don'ts (carried from kit rules)

- ❌ No text/numbers baked into any asset.
- ❌ No raster/embedded images, no icon fonts, no blurs/photoreal shading.
- ❌ No runtime integration, objective logic, balance, or map edits from
  this pack.
- ❌ World overlays must **not** be mistaken for skill effects or damage
  zones.
- ❌ UI icons must **not** be mistaken for map terrain tiles.
- ❌ Do not use these assets to imply working capture, gate HP, core HP,
  ownership logic, or minimap systems.

---

## 7. Documentation in this deliverable

| Path | Purpose |
|---|---|
| `docs/phase-4b-b-objective-feedback-asset-pack.md` | This pack art direction & rules |
| `docs/objective-feedback-asset-manifest.md` | Full asset catalogue |
| `docs/objective-feedback-integration-brief.md` | Future runtime integration brief for Agent A |
| `docs/mobile-objective-feedback-checklist.md` | Mobile readability QA checklist |
