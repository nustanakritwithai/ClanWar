# Combat Visual Kit

> Standalone art kit for Phase 3B / 3C combat feedback — hit sparks, damage
> markers, heal effects, attack/AoE indicators, projectile placeholders, and
> status-effect icons. **Not yet integrated into the runtime.** Wiring these into
> scenes/systems is owned by the runtime track; this kit only prepares the assets.
>
> Builds on and obeys [`art-style-guide.md`](./art-style-guide.md) (palette,
> outline rule, mobile readability, sizing). Read that first.

---

## 1. Goal

Give combat readable, consistent visual language **before** the runtime needs it,
so Phase 3B-B / 3C can drop in finished art instead of blocking on it. Every asset
is hand-authored SVG from primitives, transparent background, `256×256` viewBox,
no embedded text, and tuned to read on a phone mid-fight.

---

## 2. Asset Groups

### VFX (`public/assets/vfx/`)
Short-lived feedback flashes spawned at a world position and tweened/faded by the
runtime.

| File | Reads as |
|---|---|
| `hit_spark.svg` | Physical hit landed (white/gold radial spark) |
| `slash_arc.svg` | Melee swing trail (crescent) |
| `impact_burst.svg` | Heavy/explosive impact (jagged orange burst) |
| `damage_number_burst.svg` | Backing flare behind a runtime damage number (red) |
| `heal_spark.svg` | Small restorative motes (green) |
| `heal_cross_burst.svg` | Big heal proc (green cross + burst) |
| `mana_spark.svg` | Mana gained/spent (blue motes) |
| `cooldown_swirl.svg` | Ability recharging sweep (neutral gray) |
| `skill_ready_flash.svg` | Ability came off cooldown (gold pulse) |
| `denied_flash.svg` | Action refused — no mana / on cooldown (red no-entry) |

### Combat helpers (`public/assets/combat/`)
Targeting/indicator art and projectile bodies. **Team-neutral — the runtime tints
them** per team/skill at use time.

| File | Reads as |
|---|---|
| `training_dummy.svg` | Practice dummy (straw + target rings) — clearly **not** a real enemy |
| `attack_cone.svg` | Melee cone preview (wedge) |
| `skill_range_circle.svg` | Cast-range boundary (dashed ring) |
| `aoe_marker.svg` | Ground AoE target (ring + crosshair) |
| `projectile_arrow.svg` | Arrow projectile body |
| `projectile_fireball.svg` | Fireball projectile body |
| `projectile_holy_light.svg` | Holy light projectile body |
| `target_reticle.svg` | Lock-on reticle |

### Status icons (`public/assets/status/`)
Small buff/debuff glyphs for a status-effect bar above units or on the HUD. Clear
silhouette, one status color each.

| File | Reads as | Color cue |
|---|---|---|
| `stun.svg` | Stunned | Yellow stars |
| `slow.svg` | Slowed | Cyan down-chevrons |
| `taunt.svg` | Taunted / forced target | Orange shout |
| `shielded.svg` | Damage shield active | Blue shield |
| `burn.svg` | Burning (DoT) | Orange/red flame |
| `frozen.svg` | Frozen / rooted | Cyan crystal |
| `healing.svg` | Heal-over-time | Green cross |
| `buff_attack.svg` | Attack up | Sword + gold up-arrow |
| `buff_armor.svg` | Armor up | Shield + gold up-arrow |
| `low_mana.svg` | Low mana warning | Dim blue droplet |
| `cooldown.svg` | Ability on cooldown | Gray clock |
| `dead.svg` | Defeated / awaiting respawn | Gray skull |

---

## 3. Intended Future Use

These are usage *intentions* for the runtime track — not implemented here.

- **Damage number** — spawn `damage_number_burst.svg` at the hit point, draw the
  numeric value (runtime text) on top, tween up + fade. Tint by crit/normal.
- **Hit spark** — spawn `hit_spark.svg` (or `impact_burst.svg` for heavy hits) at
  the contact point, quick scale-up + fade (~150–250 ms).
- **Heal effect** — `heal_spark.svg` for ticks, `heal_cross_burst.svg` for a big
  heal cast; rise + fade on the healed unit.
- **Attack cone preview** — show `attack_cone.svg` oriented to facing while a melee
  skill is being aimed; hide on release.
- **AoE marker** — place `aoe_marker.svg` / `skill_range_circle.svg` on the ground
  during targeting; scale to skill radius/range.
- **Projectile placeholder** — use `projectile_*.svg` as the moving sprite, rotated
  to travel direction, until bespoke art exists.
- **Status effect UI** — render the matching `status/*.svg` in a small icon strip;
  stack a `cooldown.svg`-style sweep for remaining duration if desired.
- **Feedback flashes** — `skill_ready_flash.svg` when a skill button refreshes;
  `denied_flash.svg` + `cooldown_swirl.svg` when an input is refused.

---

## 4. Mobile Readability Rules

(Inherits everything from `art-style-guide.md` §6–7.)

1. **One concept per asset.** A glance must read it during a fight.
2. **Thick strokes** (≥ ~6 units at 256 viewBox); never hairlines.
3. **Silhouette test** — recognizable as a solid shape.
4. **Status color cues** are distinct and not crowded; ≤ ~2 accents + outline.
5. **No embedded text** — numbers/letters are drawn by the runtime, never baked in.
6. **Transparent background** so assets composite over any unit/scene.
7. Keep VFX **centered** in the canvas so runtime can position by center point.

---

## 5. Runtime Integration Rules (future)

- **Don't bake team color** into helpers/indicators/projectiles — tint at runtime
  (`setTint`) so one asset serves both teams.
- **VFX are transient**: the runtime owns spawn/tween/cleanup; assets carry no
  animation. Where motion is implied (e.g. `cooldown_swirl`, `cooldown` wedge),
  the runtime rotates/redraws the relevant group.
- **Damage numbers**: art is only the backing flare; the value text is runtime.
- Load via Phaser's loader as textures/atlas entries; sizes are power-of-two
  friendly (256). Do not hardcode world scale into the SVG.
- Integration must live in the runtime track (`src/game/**`). This kit never
  imports or edits runtime code.

---

## 6. Don'ts

- ❌ **No text inside any icon** (numbers, letters, labels).
- ❌ **No team color** baked into objective/helper/indicator/projectile art —
  neutral by default, tint at runtime.
- ❌ **No oversized assets** that hurt mobile load — keep SVG hand-authored and
  lightweight (simple primitives, one gradient max); no embedded raster data.
- ❌ No external/downloaded art, icon fonts, blurs, or photoreal shading.
- ❌ No runtime integration, balance, or gameplay changes from this kit.
