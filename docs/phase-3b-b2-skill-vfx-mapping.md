# Phase 3B-B2 Skill → VFX Mapping (next pass)

> Maps each currently-implemented (or placeholder-mapped) skill to the SVG
> asset(s) that should replace its Phaser-primitive placeholder in a future
> integration pass. **Docs-only** — no runtime change, no asset change.
>
> Builds on `docs/phase-3b-b2-vfx-asset-manifest.md` (what exists) and
> `docs/combat-vfx-integration-plan.md` (camera/lifetime conventions).
> Current runtime placeholders live in `src/game/ui/CombatVfx.ts`.
>
> Space legend: **World** = main camera, `uiCamera.ignore()`-d.
> **UI** = UI camera, main-camera-ignored.

## Active skills (implemented in 3B-B1)

| Skill | Runtime type | Suggested VFX asset(s) | Space | Lifetime | Camera rule | Cleanup rule | Mobile clutter risk |
|---|---|---|---|---|---|---|---|
| Power Shot | projectile | `combat/projectile_arrow.svg` (body) + `vfx/hit_spark.svg` (on hit) | World | Body: until hit/max-range; spark: ~180ms | Main camera; `registerWorldObject` (uiCamera.ignore) | Destroy body on hit/expire; spark on tween complete | Low — 1 body + brief spark |
| Fireball | projectile + AoE-on-hit | `combat/projectile_fireball.svg` (body) + `vfx/impact_burst.svg` (impact) | World | Body: until hit/max-range; burst: ~260ms | Main camera | Destroy body on hit/expire; burst on tween complete | Low–Med — impact burst is larger; don't stack |
| Shield Bash | melee_arc | `vfx/hit_spark.svg` + optional `vfx/slash_arc.svg` (swing) | World | ~150–200ms | Main camera | Destroy on tween complete | Low |
| Cleave | melee_arc | `vfx/slash_arc.svg` (oriented to facing) + `vfx/hit_spark.svg` | World | ~120–200ms | Main camera | Destroy on tween complete | Low |
| Arrow Rain | aoe_circle (instant) | `combat/aoe_marker.svg` + `vfx/impact_burst.svg` | World | Marker ~450ms fade; burst ~260ms | Main camera | Destroy marker + burst on tween complete | Med — large radius marker; one per cast |
| Frost Zone | aoe_circle (instant placeholder) | `combat/aoe_marker.svg` (cyan tint) + `vfx/impact_burst.svg` | World | Marker ~450ms | Main camera | Destroy on tween complete | Med — large radius; instant only, no persisting zone |
| Holy Circle | aoe_circle (self-heal) | `combat/aoe_marker.svg` (green tint) + `vfx/heal_cross_burst.svg` | World | Marker ~450ms; burst ~320ms | Main camera | Destroy on tween complete | Low–Med |
| Priest Heal | heal | `vfx/heal_spark.svg` (+ rising `+N` text) | World | ~350ms rise+fade | Main camera | Destroy on tween complete | Low |

## Placeholder-mapped skills (mapped, not priority-tested in 3B-B1)

> These have a runtime type assigned but were deferred from 3B-B1 priority
> testing. VFX suggestions below are for when they are exercised; **do not
> add real status effects** (taunt/slow/armor) — visual only.

| Skill | Runtime type | Suggested VFX asset(s) | Space | Lifetime | Camera rule | Cleanup rule | Mobile clutter risk |
|---|---|---|---|---|---|---|---|
| Gate Breaker | melee_arc | `vfx/impact_burst.svg` (heavy) + `vfx/slash_arc.svg` | World | ~260ms | Main camera | Destroy on tween complete | Low–Med — ultimate, infrequent |
| War Taunt | aoe_circle (no damage) | `combat/aoe_marker.svg` (orange tint) | World | ~450ms | Main camera | Destroy marker on tween complete | Med — radius 160; visual only, no taunt logic |
| Leap Strike | aoe_circle (landing) | `combat/aoe_marker.svg` + `vfx/impact_burst.svg` at landing | World | ~260–450ms | Main camera | Destroy on tween complete | Med — landing marker; no dash anim required |
| Meteor Siege | aoe_circle | `combat/aoe_marker.svg` + `vfx/impact_burst.svg` (large) | World | ~300–450ms | Main camera | Destroy on tween complete | Med–High — radius 190; cap concurrent bursts |
| Revival Prayer | heal | `vfx/heal_cross_burst.svg` (big) | World | ~320ms | Main camera | Destroy on tween complete | Low — ultimate, infrequent |

## UI-space feedback (future, not skill-specific)

| Use | Suggested asset | Space | Lifetime | Camera rule | Cleanup rule |
|---|---|---|---|---|---|
| Skill on cooldown | `vfx/cooldown_swirl.svg` / `status/cooldown.svg` | UI | Cooldown duration | UI camera; main-camera ignore | Hide/destroy at cooldown end |
| Skill ready | `vfx/skill_ready_flash.svg` | UI | ~200–300ms | UI camera | Destroy on tween complete |
| Denied (no mana / cooldown) | `vfx/denied_flash.svg` + `status/low_mana.svg` | UI | ~150–250ms | UI camera | Destroy on tween complete |

---

## Notes
- **All gameplay VFX are World-space** and must go through the existing
  `registerWorldObject()` → `uiCamera.ignore()` path so they never render on
  the fixed UI layer (the joystick/skill-button camera).
- **All UI feedback is UI-space** and must be ignored by the main camera.
- Every effect needs a bounded tween with `onComplete: destroy()` — matches
  the pattern already in `CombatVfx.ts`.
- Replacing primitives with SVGs is a **like-for-like swap** of the visual
  only; hit/heal logic stays in the runtime and is out of scope for the
  visual pass.
