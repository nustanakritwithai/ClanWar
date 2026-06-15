# Phase 3B-B3 Visual Integration Brief (for Agent A — future)

> A **forward-looking brief** for the runtime track to integrate the
> authored SVG VFX assets, replacing the current Phaser-primitive
> placeholders. **This is not a work order — do not start runtime work from
> this doc.** It is staged so that when the next phase is approved, scope is
> already clear. Authored by the QA/Spec track (Agent B); execution belongs
> to the runtime track (Agent A).
>
> References: `docs/phase-3b-b2-vfx-asset-manifest.md`,
> `docs/phase-3b-b2-skill-vfx-mapping.md`,
> `docs/phase-3b-b2-visual-qa-checklist.md`,
> `docs/phase-3b-b2-visual-risk-register.md`,
> `docs/combat-vfx-integration-plan.md`.

---

## 1. Allowed scope

- Load the existing SVG assets from `public/assets/vfx/**` and
  `public/assets/combat/**` via the Phaser loader.
- **Like-for-like swap** of the current primitive placeholders in
  `src/game/ui/CombatVfx.ts` for the corresponding SVG sprites
  (per the skill→VFX mapping).
- Keep all existing hit/heal/projectile **logic unchanged** — visual only.
- Maintain the world/UI camera split via the existing
  `registerWorldObject()` path.

## 2. Assets to integrate first (priority)

These back skills already live in 3B-B1, so they give immediate value:

1. `combat/projectile_arrow.svg` → Power Shot body
2. `combat/projectile_fireball.svg` → Fireball body
3. `vfx/hit_spark.svg` → normal hit (melee + projectile)
4. `vfx/impact_burst.svg` → Fireball impact + heavy hits
5. `combat/aoe_marker.svg` → Arrow Rain / Frost Zone / Holy Circle markers
6. `vfx/heal_spark.svg` + `vfx/heal_cross_burst.svg` → Priest Heal / Holy Circle
7. `vfx/slash_arc.svg` → Cleave / melee swing (optional, nice-to-have)

## 3. Assets to defer

- `vfx/cooldown_swirl.svg`, `vfx/skill_ready_flash.svg`,
  `vfx/denied_flash.svg`, `vfx/mana_spark.svg` — UI feedback; integrate only
  if the skill-button UI work is in scope for that phase.
- `combat/skill_range_circle.svg`, `combat/attack_cone.svg`,
  `combat/target_reticle.svg` — targeting previews; need an aiming UI first.
- `combat/projectile_holy_light.svg` — no Priest projectile skill exists yet.
- **All `status/*.svg`** — deferred to **Phase 3C** with the real
  status-effect system. Do **not** wire to gameplay.

## 4. Files the runtime agent would touch (future)

- `src/game/ui/CombatVfx.ts` — swap primitive draws for SVG sprites.
- A scene `preload()` (e.g. `src/game/scenes/MatchScene.ts` or a boot/preload
  scene) — register the SVG textures with the loader.
- `src/game/entities/Projectile.ts` — replace the `Arc` body with the SVG
  sprite (rotate to travel direction).
- Possibly `src/game/systems/ProjectileSystem.ts` if the spawn signature
  needs a texture key.
- **No changes** to `skills.ts`, `heroes.ts`, input files, or balance.

## 5. Tests that must pass

- Full `docs/phase-3b-b2-visual-qa-checklist.md` (all rows).
- Build passes (`npm run build` — tsc + vite).
- Projectile hit/miss + destroy-on-hit/expire still correct (3B-B1 behavior).
- AoE instant placeholder still single-hit (no per-frame ticking).
- Priest Heal still caps at max HP.
- Mobile multi-touch (PR #8) regression still passes.
- Menu ↔ Match × 3 — no VFX/projectile/marker/texture leak.
- No console errors / no asset 404s.

## 6. Must NOT do

- ❌ No real status effects (stun / slow / burn / frozen / taunt / shield /
  armor / attack buffs) — those are **Phase 3C**.
- ❌ No bot AI.
- ❌ No objective / gate / core damage or interaction.
- ❌ No shop / economy / leveling.
- ❌ No multiplayer / networking.
- ❌ No new gameplay skills or balance changes.
- ❌ No new assets — use only what already exists under `public/assets/**`.
- ❌ No change to the Phase label / README status as part of asset wiring
  unless the phase is formally advanced.

---

## Sequencing note
This brief assumes 3B-B1 is closed and live. The visual integration should
be its own PR, separate from any runtime-cleanup work, so the two tracks
don't collide. QA (Agent B) reviews against the checklist + risk register
above before that PR merges.
