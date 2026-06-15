# Phase 3B-B4: Objective Asset Pack

> Lane B (Asset / Content Production) deliverable — **stock art for the
> future Phase 4 objective runtime.** This pack adds team-colored and
> state-variant objective visuals so the runtime track can drop in finished
> art instead of blocking on it. **This pack adds art only — no runtime, no
> objective logic, no map changes.**
>
> Produced in parallel with Agent A's Lane B3 (Runtime Combat Visual
> Integration). It does **not** overlap Agent A's files: Agent A touches
> `src/game/**`; this pack touches only `public/assets/objectives/**` and
> `docs/`. **Do not pull these assets into B3** — they are for the round
> after, when objective/gate/core runtime begins.

Builds on and obeys [`art-style-guide.md`](./art-style-guide.md) and the
existing objective art from PR #4. Read those first.

---

## 1. Goal

Give the future objective runtime (Phase 4: gates, core/nexus, watchtowers,
camps, resources, capture/destroy states) a complete, readable, consistent
visual language **before** it is needed. Every asset is hand-authored SVG
from primitives, transparent background, `256×256` viewBox, no embedded
text, mobile-readable.

---

## 2. What this pack adds (15 new assets)

> The original PR #4 objective set (`core.svg`, `gate.svg`, `watchtower.svg`,
> `resource_camp.svg`, `forward_camp.svg`, `siege_ruins.svg`, `spawn.svg`)
> stays in place. This pack adds **team-colored** and **state** variants on
> top of those neutral originals.

| # | Asset | Reads as |
|---|---|---|
| 1 | `blue_gate.svg` | Blue-owned gate (blue portcullis + pennant) |
| 2 | `red_gate.svg` | Red-owned gate (red portcullis + pennant) |
| 3 | `blue_core.svg` | Blue nexus crystal (blue energy) |
| 4 | `red_core.svg` | Red nexus crystal (red energy) |
| 5 | `watchtower_neutral.svg` | Uncaptured watchtower (gray banner) |
| 6 | `watchtower_blue.svg` | Blue-held watchtower (blue banner + glow) |
| 7 | `watchtower_red.svg` | Red-held watchtower (red banner + glow) |
| 8 | `forward_camp_blue.svg` | Blue forward camp / tent |
| 9 | `forward_camp_red.svg` | Red forward camp / tent |
| 10 | `resource_camp_food.svg` | Food resource node (wheat sheaf) |
| 11 | `resource_camp_ore.svg` | Ore resource node (blue ore crystals) |
| 12 | `resource_camp_wood.svg` | Wood resource node (stacked logs) |
| 13 | `capture_ring.svg` | Neutral capture-progress ring (world overlay) |
| 14 | `objective_warning.svg` | "Under attack" warning marker (amber triangle) |
| 15 | `objective_destroyed.svg` | Destroyed objective state (rubble + smoke) |

### Note on `siege_ruins.svg`
`siege_ruins.svg` was listed in the pack brief but **already exists** from
PR #4 and is already style-consistent. To avoid needlessly modifying
shipped art, it is **reused as-is, not re-authored** — it is referenced by
this pack (see manifest) but is not part of this commit's diff.

---

## 3. Style rules followed

- Top-down 2D, transparent background, SVG primitives only (paths, circles,
  rects, lines, gradients) — no raster, no external fonts, no copyrighted
  marks.
- `256×256` viewBox, centered subject, thick dark outline (`#0b0e13`,
  ~10–13 units), clear silhouette.
- Shared palette with `COLORS` in `src/game/constants.ts`:
  Team Blue `#3b82f6` (+`#2563eb`/`#60a5fa`), Team Red `#ef4444`
  (+`#dc2626`/`#f87171`), Neutral `#9ca3af`, stone `#3a4658`/`#4a5870`,
  dark `#1a2230`, gold `#cfa14a`/`#f4d35e`.
- **No text inside any image** — `objective_warning` uses a drawn bar+dot,
  not a font glyph.
- Blue/red variants are clearly separable at a glance; neutral / captured /
  destroyed states read even at small (map-marker) size.

### Pre-tinted vs neutral
Unlike the combat helper kit (which is neutral + tinted at runtime), the
explicit `blue_*` / `red_*` variants here are **pre-tinted on purpose** so
the runtime can swap whole textures on ownership change without per-pixel
tinting. The neutral overlays (`capture_ring`, `objective_warning`,
`objective_destroyed`) remain **tintable** so one asset serves both teams.

---

## 4. Mobile readability notes

- One concept per asset; recognizable as a solid shape at thumbnail size.
- Thick strokes (≥ ~6 units); no hairlines.
- Team identity carried by **both color and a shape cue** (pennant / banner /
  energy glow) so it survives color-blind viewing and small scale.
- Resource nodes use distinct silhouettes (sheaf vs ore crystals vs logs),
  not just color, so they're told apart instantly.
- `capture_ring` is a large thin ring meant to sit **under** a unit/objective
  as a ground overlay — kept sparse so it doesn't clutter the play field.

---

## 5. What should be deferred (NOT in this pack / not Phase 4-now)

- Any **objective runtime logic** (capture, ownership, gate/core HP, resource
  income) — runtime track, future phase.
- **Animation** — all assets are static; the runtime owns any pulse/sweep/
  fade (e.g. `capture_ring` progress sweep).
- **Map layout / placement** — this pack does not touch the map data.
- **Per-team tint of the pre-colored variants** — already baked; do not
  double-tint.
- **HUD/minimap objective icons** — if a fixed-screen HUD variant is needed,
  that is a separate UI-space set; this pack is world-space map art.

---

## 6. Don'ts (carried from the kit rules)

- ❌ No text/numbers baked into any asset.
- ❌ No raster/embedded images, no icon fonts, no blurs/photoreal shading.
- ❌ No runtime integration, objective logic, balance, or map edits from
  this pack.
- ❌ Do not use these in Phase 3B-B3 — they are stock for the objective
  runtime round that follows.
