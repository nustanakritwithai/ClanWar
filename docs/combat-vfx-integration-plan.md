# Combat VFX Integration Plan

> Plan for how Agent A's runtime track should integrate the static assets
> from PR #6 (`docs/combat-visual-kit.md`, `docs/asset-inventory-combat.md`).
> **Docs/spec only** — no runtime integration is performed here. All assets
> referenced already exist in `public/assets/vfx/`, `public/assets/combat/`,
> and `public/assets/status/`; no new assets are introduced by this plan.

General conventions used below:
- **World object**: positioned in world space, follows the main camera
  (the gameplay camera), should be added to the main camera's render list
  and excluded (`ignore()`) from the UI camera.
- **UI object**: positioned in screen space, follows the UI camera, should
  be `ignore()`-d by the main camera.
- **Lifetime**: how long the object/effect should exist before cleanup.
- **Cleanup rule**: how the object is removed to avoid leaks.
- **Mobile perf risk**: notes on cost for low-end mobile (draw calls, tween
  count, simultaneous instances).

---

## VFX (`public/assets/vfx/`)

| Asset | Use | Object type | Camera | Lifetime / tween | Cleanup rule | Mobile perf risk |
|---|---|---|---|---|---|---|
| `hit_spark.svg` | Normal hit feedback | World object | Main camera | Spawn at contact point; scale up + fade out, ~150–200ms | Destroy on tween complete | Low — short-lived, single instance per hit; cap concurrent instances if multi-hit skills spawn many at once |
| `slash_arc.svg` | Melee attack / cleave swing trail | World object | Main camera | Spawn oriented to facing; quick fade, ~120–180ms | Destroy on tween complete | Low |
| `impact_burst.svg` | Heavy hit / ultimate impact | World object | Main camera | Spawn at impact point; scale-up burst, ~200–300ms | Destroy on tween complete | Low–Medium — larger sprite than `hit_spark`; avoid stacking many on AoE ultimates (cap or stagger) |
| `damage_number_burst.svg` | Backing flare behind runtime damage number text | World object | Main camera | Spawn with the number; rise + fade together, ~400–600ms | Destroy both flare and text on shared tween complete | Low — pair 1:1 with damage text, no extra overhead |
| `heal_spark.svg` | Heal tick feedback | World object | Main camera | Spawn on healed unit; rise + fade, ~250–400ms | Destroy on tween complete | Low |
| `heal_cross_burst.svg` | Big heal proc (Holy Circle, Revival Prayer, big Heal cast) | World object | Main camera | Spawn on cast; burst + fade, ~300–400ms | Destroy on tween complete | Low — infrequent (ultimates/skill2-3 cooldowns) |
| `mana_spark.svg` | Mana spend/regen cue (future) | World object or UI object | Main camera (on caster) or UI camera (on mana bar) | Short fade, ~200ms | Destroy on tween complete | Low — deferred until mana UI feedback is prioritized |
| `cooldown_swirl.svg` | Cooldown UI sweep (future) | UI object | UI camera | Persists for the cooldown duration; runtime redraws/rotates the sweep group each frame or on a timer | Destroy/hide when cooldown reaches zero | Low–Medium if redrawn every frame for multiple buttons — prefer updating a single rotation property rather than regenerating geometry |
| `skill_ready_flash.svg` | Skill button ready pulse (future) | UI object | UI camera | One-shot flash on the button, ~200–300ms | Destroy on tween complete | Low |
| `denied_flash.svg` | No-mana / on-cooldown input denial | UI object | UI camera | One-shot flash on the attempted skill button, ~150–250ms | Destroy on tween complete | Low |

---

## Combat helpers (`public/assets/combat/`)

| Asset | Use | Object type | Camera | Lifetime / tween | Cleanup rule | Mobile perf risk |
|---|---|---|---|---|---|---|
| `attack_cone.svg` | Melee attack preview (while aiming a melee skill) | World object | Main camera | Visible while skill is being aimed/held; oriented to facing, tinted neutral or per-class | Destroy/hide on release or cast | Low — single instance, only while aiming |
| `skill_range_circle.svg` | Range preview for ranged/AoE skills during targeting | World object | Main camera | Visible while targeting; scaled to skill `range` | Destroy/hide on cast or cancel | Low — single instance |
| `aoe_marker.svg` | AoE ground marker (placeholder hit area for Arrow Rain, Frost Zone, Holy Circle, War Taunt, Meteor Siege, Leap Strike landing) | World object | Main camera | Spawn at AoE center on cast; persist for the instant-hit moment (or for `duration` if a persisting zone is implemented in 3C), then fade | Destroy on hit-resolution / duration end | Low–Medium — keep to one marker per active AoE; avoid leaving markers if a skill is spammed |
| `projectile_arrow.svg` | Ranger Power Shot projectile body | World object | Main camera | Exists for the projectile's flight duration (until hit or max range) | Destroy on hit or max-range (per `projectile-and-hit-shape-spec.md`) | Low — one instance per active projectile; cap simultaneous projectiles per player if needed |
| `projectile_fireball.svg` | Mage Fireball projectile body | World object | Main camera | Exists for the projectile's flight duration | Destroy on hit or max-range | Low — same as arrow; impact also spawns `impact_burst.svg`, so account for both when capping concurrent VFX |
| `projectile_holy_light.svg` | Priest holy projectile body (future, once Priest gets a projectile skill) | World object | Main camera | Same pattern as above | Destroy on hit or max-range | Low — not used by any 3B-B skill yet (Priest skills are melee/self/heal in 3B-B); reserved for 3C |
| `target_reticle.svg` | Lock-on / selected-target indicator (future) | World object | Main camera | Persists while a target is locked/selected | Destroy/hide when target is cleared or destroyed | Low — single instance, follows target position each frame |
| `training_dummy.svg` | Dummy sprite (already integrated by Phase 3B-A's `TrainingDummy.ts`) | World object | Main camera | Persistent for the dummy's lifetime | Managed by `TrainingDummy.ts` (Phase 3B-A, out of scope here) | n/a — already integrated |

---

## Status icons (`public/assets/status/`)

All status icons are **deferred to Phase 3C** for runtime status
application (per `skill-visual-mapping.md`). For Phase 3B-B, they may
optionally be referenced as **static** status-bar glyphs for visual QA
(e.g. showing `status/cooldown.svg` on a skill button, or `status/dead.svg`
on the dummy's defeated state from Phase 3B-A) without any new
stun/slow/burn/frozen/taunt/shield logic.

| Asset | Use | Object type | Camera | Notes |
|---|---|---|---|---|
| `status/cooldown.svg` | Ability on cooldown glyph | UI object | UI camera | Can pair with `vfx/cooldown_swirl.svg` for the sweep; usable in 3B-B for cooldown UI. |
| `status/low_mana.svg` | Low mana warning | UI object | UI camera | Usable in 3B-B alongside `vfx/denied_flash.svg` for TC-09. |
| `status/dead.svg` | Defeated/respawning glyph | World object or UI object | Main or UI camera | May reflect `TrainingDummy`'s defeated state from Phase 3B-A (TC-10). |
| `status/stun.svg`, `status/slow.svg`, `status/taunt.svg`, `status/shielded.svg`, `status/burn.svg`, `status/frozen.svg`, `status/healing.svg`, `status/buff_attack.svg`, `status/buff_armor.svg` | Status-bar glyphs for real status effects | World/UI object | Main or UI camera | **3C** — no runtime status system exists yet; do not wire these to gameplay logic in 3B-B. |

---

## Integration sequencing recommendation

1. **3B-B priority (core feedback loop)**: `hit_spark.svg`, `slash_arc.svg`,
   `impact_burst.svg`, `damage_number_burst.svg` (extends existing
   `CombatText` from Phase 3B-A), `heal_spark.svg`/`heal_cross_burst.svg`,
   `attack_cone.svg`/`skill_range_circle.svg` (targeting previews),
   `aoe_marker.svg`, `projectile_arrow.svg`/`projectile_fireball.svg`.
2. **3B-B if time allows**: `denied_flash.svg` + `status/low_mana.svg` /
   `status/cooldown.svg` for mana/cooldown denial feedback (TC-09).
3. **3C**: `cooldown_swirl.svg`, `skill_ready_flash.svg`, `mana_spark.svg`,
   `target_reticle.svg`, `projectile_holy_light.svg`, and all remaining
   `status/*.svg` icons tied to a real status-effect system.
