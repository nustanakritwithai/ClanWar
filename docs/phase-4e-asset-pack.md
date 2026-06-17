# Phase 4E Asset Pack — Theme 1: Castle Siege Field

> **Agent B** — Visual asset / mock asset pack for Phase 4E (Visual Direction /
> MMORPG 2D Pixel Art Upgrade). **Asset pack + documentation only — not a
> runtime work order.**
>
> **Primary design sources:** `docs/phase-4e-visual-design-spec.md` (Agent C,
> PR #49), `docs/phase-4e-mobile-hud-ux-spec.md` (Agent D, PR #50)

---

## 1. Overview

This pack is the Phase 4E **Theme 1 MVP** visual asset mock pack: a lightweight
**Fantasy Siege MMORPG 2D pixel-art direction** for HUD frames, structures
(Gate/Core/Capture Point), character class concepts, combat VFX, and the
Castle Siege Field environment, plus two annotated safe-zone mockups.

It prepares assets for a **future** Agent A runtime reskin. **Nothing in this
pack is wired into the running game.** No loader, scene, UI, or VFX code is
touched by this PR.

Because this is a coding-agent asset pack, all assets are **SVG** (lightweight
vector files that visually imitate pixel-art silhouettes and palettes) rather
than PNG sprite sheets. This is consistent with the Agent C spec's own note
that "SVG placeholders remain acceptable until the B pack lands," and is the
explicit format accepted for this PR.

## 2. Asset folder path

```
public/assets/phase-4e/theme1/
```

All 49 mock assets plus `manifest.json` live in this single folder. No
existing runtime asset folder (`public/assets/classes/`, `combat/`, `map/`,
`objective-feedback/`, `objectives/`, `player-guidance/`, `skills/`,
`status/`, `ui/`, `vfx/`) is touched, renamed, or overwritten.

## 3. Asset groups

| Group | Count | Files |
|---|---|---|
| A. UI / HUD | 9 | `phase4e_ui_*.svg` |
| B. Structures (Gate / Core / Capture Point) | 14 | `phase4e_obj_*.svg` |
| C. Character class concepts | 7 (5 required + 2 optional) | `phase4e_char_*.svg` |
| D. VFX mocks | 7 | `phase4e_vfx_*.svg` |
| E. Environment / tiles (Castle Siege Field) | 10 | `phase4e_tile_*.svg`, `phase4e_prop_*.svg`, `phase4e_bg_*.svg` |
| F. Annotated mockups | 2 | `phase4e_mockup_915x412.svg`, `phase4e_mockup_800x360.svg` |
| **Total** | **49** | plus `manifest.json` |

### A. UI / HUD (9)

`phase4e_ui_hud_panel.svg`, `phase4e_ui_timer_score_chip.svg`,
`phase4e_ui_objective_plaque.svg`, `phase4e_ui_joystick_frame.svg`,
`phase4e_ui_attack_button_frame.svg`, `phase4e_ui_skill_button_frame.svg`,
`phase4e_ui_capture_hud_panel.svg`, `phase4e_ui_siege_buff_badge.svg`,
`phase4e_ui_result_panel.svg`.

Style: dark glass base (`#10151d` @ ~85% opacity), thin gold/stone trim
(`#cfa14a` / `#3a4658`), flat readable inner ~70% area, no coin shapes, no
shop/currency visual language, no overdecorated controls (44px+ tap targets
preserved on button frames).

### B. Structures (14)

Gate states (idle, hit, damaged, breached, destroyed), Core states
(protected, vulnerable, hit, low, destroyed), Capture Point states (neutral,
player, enemy, contested). Gate is drawn wider/heavier than any prop; Core
crystal silhouette stays visible under its hit-pulse overlay; Capture Point
uses a stone camp base + progress ring, never a coin/chest/quest panel shape.

### C. Character class concepts (7)

Required: `phase4e_char_guardian_idle.svg`, `phase4e_char_warrior_idle.svg`,
`phase4e_char_ranger_idle.svg`, `phase4e_char_mage_idle.svg`,
`phase4e_char_priest_idle.svg` (maps 1:1 to the 5 existing runtime heroes:
guardian, warrior, ranger, mage, priest).

Optional (future-art-only, not added to the runtime class roster in Phase
4E): `phase4e_char_rogue_idle.svg`, `phase4e_char_summoner_idle.svg`.

Each sprite has a distinct class silhouette per Agent C Section E (shield
blob for Guardian, diagonal weapon for Warrior, bow arc for Ranger, pointed
hat + staff for Mage, robe + staff-cross for Priest). A body block is marked
with `id="phase4e-team-slot"` to document where a runtime tint/team-color
overlay would later apply — **team color is not baked into the asset**; it is
intended to be applied the same way the current runtime applies team tinting.

### D. VFX mocks (7)

`phase4e_vfx_normal_hit_spark.svg`, `phase4e_vfx_gate_hit_spark.svg`,
`phase4e_vfx_core_hit_pulse.svg`, `phase4e_vfx_skill_cast_flash.svg`,
`phase4e_vfx_impact_ring.svg`, `phase4e_vfx_denied_flash.svg`,
`phase4e_vfx_capture_pulse.svg`.

Preserves the Phase 4D intensity ladder: normal hit is the smallest/simplest
mark, Gate hit is medium (chunk particles), Core hit is the strongest but
fully contained within its own bounding box, skill cast flash is short/local
at the caster's feet, impact ring is a single short-lived expanding ring. No
asset implies a full-screen effect or persistent particles.

### E. Environment / tiles — Theme 1: Castle Siege Field (10)

`phase4e_tile_ground_grass.svg`, `phase4e_tile_ground_dirt.svg`,
`phase4e_tile_stone_path.svg` (32×32 seamless-style tiles),
`phase4e_tile_broken_wall.svg`, `phase4e_prop_banner_blue.svg`,
`phase4e_prop_banner_red.svg`, `phase4e_prop_crystal_small.svg`,
`phase4e_prop_ruin_stone.svg` (decorative, no collision implied),
`phase4e_bg_castle_parallax.svg`, `phase4e_bg_siege_smoke_parallax.svg`
(480×270 low-contrast parallax layers).

Backgrounds use muted/low-opacity fills so they do not reduce gameplay-layer
contrast. Decorative props (banners, crystal shard, ruin stone) are visually
subordinate to and distinct from Gate/Core/Capture Point silhouettes.

### F. Annotated mockups (2)

`phase4e_mockup_915x412.svg` and `phase4e_mockup_800x360.svg` overlay the
Agent D safe zones (top HUD strip, objective prompt band, joystick area,
attack/skill cluster, Siege Buff badge, Gate/Core placement, Capture Point
placement, center combat-readable zone) with labeled dashed rectangles. These
are **documentation assets** — annotation labels are acceptable here even
though labels are forbidden in player-facing in-game assets.

## 4. Naming convention

Every new file is prefixed `phase4e_` to namespace it away from existing
runtime texture keys (e.g. existing `vfx_gate_hit_spark` vs. this pack's
`phase4e_vfx_gate_hit_spark` — both can coexist without collision). No file in
this pack reuses a final runtime texture key.

## 5. Manifest

`public/assets/phase-4e/theme1/manifest.json` lists every asset (including
itself, for completeness) with: `filename`, `category`, `intended_use`,
`candidate_key`, `runtime_status` (always `"not wired"` or
`"documentation only - not a runtime asset"` in this PR), `safe_zone`,
`source`, and `notes`. See `docs/phase-4e-asset-manifest.md` for a readable
table form of the same data.

`candidate_key` values are proposed future runtime texture keys **only** —
none of them are registered with any Phaser loader by this PR.

## 6. How Agent A should later wire these assets (future, not this PR)

1. Add a `visualTheme` config value (e.g. `'castle_siege'`) — do not change
   any gameplay constant.
2. Extend the asset loader to register the `phase4e_*` files under their
   `candidate_key` texture keys, in a separate manifest pass — do not remove
   or rename existing runtime keys.
3. Swap structure sprites (Gate, Core) first, in place, at existing
   coordinates/depths — no collision/radius change.
4. Swap Capture Point sprites — preserve existing radius (55–75) and existing
   capture/score logic untouched.
5. Reskin HUD frames (`phase4e_ui_*`) behind existing HUD elements — preserve
   existing hit areas, depths, and the Agent D safe-zone rectangles.
6. Swap hero idle art per class, pilot one class first, then roll out to all
   5 (then optionally the 2 future-art-only classes once/if they are
   authorized as real classes in a separate phase).
7. Swap tile/parallax background layers — keep them below the HUD/combat
   layers (Layer 9 per Agent D's z-depth hierarchy) and verify contrast.
8. Swap VFX sprites last, preserving exact 4D timing/scale/trigger rules.
9. Run/extend a `phase-4e-visual-regression.mjs` suite before any merge.

This pack intentionally stops **before** step 1 — no loader, scene, or config
change is included here.

## 7. What is intentionally not included

- No PNG sprite sheets or frame animation (out of scope for this mock pack;
  spec's animation frame budget is a future production target).
- No Theme 2 (Crystal Ruins) or Theme 3 (Demon Warfront) assets — Theme 1
  (Castle Siege Field) only, per this work order.
- No portraits or key art.
- No monster/minion/elite/boss art — no monster AI system exists in the
  runtime yet; that is a separate, larger gameplay scope, not an art-only
  task.
- No wiring, loader changes, texture key registration, or scene/UI/VFX code
  changes of any kind.
- No new gameplay ability implied by any character silhouette.

## 8. Mobile safety constraints honored

- Mockups overlay the exact Agent D Section 3–4 safe zones for both 915×412
  and 800×360.
- UI frame assets keep an inner ~70% flat readable area per Agent D Section 5
  ("flat-enough rule").
- Siege Buff badge and Capture HUD shapes avoid coin/medal/quest-reward
  visual language per Agent D Sections 3 (Zone G), 5, and 6.
- VFX mock sizes stay within the Agent D §7 size/duration table intent
  (normal smallest → Gate medium → Core larger-but-contained → cast/impact
  short) — exact pixel timing/duration is still governed by the existing
  Phase 4D runtime code, untouched here.
- No asset implies a full-screen flash or persistent particle cloud.

## 9. Non-goals

This PR does not start Agent A runtime work, does not start Phase 5A, does
not add any new objective type, bot AI, economy/EXP/Gold/shop/ranking system,
minimap/route/lane UI, respawn, vision/fog, multiplayer/login/clan/payment
feature, or tutorial overhaul. See `docs/phase-4e-asset-manifest.md` and the
PR description for the full scope guard.
