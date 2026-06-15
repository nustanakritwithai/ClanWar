# Phase 3B-B2 VFX Asset Manifest

> Catalogue of the **already-authored** combat visual assets available for
> future runtime integration. **Docs-only** — this file does not add,
> modify, or load any asset; it inventories what PR #4 / PR #6 already
> shipped so a future integration pass can wire them in without re-authoring.
>
> Source dirs: `public/assets/vfx/**`, `public/assets/combat/**`,
> `public/assets/status/**`. All assets are `256×256`, transparent,
> hand-authored SVG (see `docs/combat-visual-kit.md` /
> `docs/asset-inventory-combat.md`). **No new assets are introduced here.**
>
> Current runtime state (Phase 3B-B1): combat VFX uses **Phaser primitive
> placeholders** in `src/game/ui/CombatVfx.ts` (circles/text), **not** these
> SVGs. These assets are the planned replacements.

---

## 1. Projectile

| Asset | Reads as | Intended skill use | Tint at runtime? |
|---|---|---|---|
| `combat/projectile_arrow.svg` | Arrow body | Ranger Power Shot | Optional (team) |
| `combat/projectile_fireball.svg` | Fireball body | Mage Fireball | No (self-colored) |
| `combat/projectile_holy_light.svg` | Holy light body | Priest holy projectile (future / 3C) | Optional |

> Runtime currently draws projectiles as colored `Phaser.GameObjects.Arc`
> (arrow = `0xfde68a` r10, fireball = `0xf97316` r14). These SVGs replace
> the arc sprite; rotate to travel direction.

---

## 2. Hit impact

| Asset | Reads as | Intended use | Current placeholder |
|---|---|---|---|
| `vfx/hit_spark.svg` | Physical hit flash | Normal melee/projectile hit | `0xfbbf24` circle, scale+fade 180ms |
| `vfx/impact_burst.svg` | Heavy/explosive impact | Fireball impact, heavy/ultimate hits | `0xfb923c` circle, scale+fade 260ms |
| `vfx/slash_arc.svg` | Melee swing trail | Cleave / melee arc swing | (none yet) |
| `vfx/damage_number_burst.svg` | Backing flare behind damage number | Behind runtime `CombatText` value | (none — text only) |

---

## 3. AoE marker

| Asset | Reads as | Intended use | Current placeholder |
|---|---|---|---|
| `combat/aoe_marker.svg` | Ground AoE target (ring + crosshair) | Arrow Rain / Frost Zone / Meteor Siege / War Taunt / Leap Strike landing | `Arc` fill 0.12 + stroke, alpha-fade 450ms |
| `combat/skill_range_circle.svg` | Cast-range boundary (dashed ring) | Range preview while targeting (future) | (none yet) |
| `combat/attack_cone.svg` | Melee cone preview (wedge) | Melee aim preview (future) | (none yet) |
| `combat/target_reticle.svg` | Lock-on reticle | Selected/locked target (future / 3C) | (none yet) |

---

## 4. Heal effect

| Asset | Reads as | Intended use | Current placeholder |
|---|---|---|---|
| `vfx/heal_spark.svg` | Small heal mote | Heal tick / Priest Heal | `+` text, rise+fade 350ms |
| `vfx/heal_cross_burst.svg` | Big heal proc | Holy Circle / Revival Prayer / big heal | `0x4ade80` circle, scale+fade 320ms |

---

## 5. Status icon (all DEFERRED to Phase 3C)

> ⚠️ These are **static glyphs only**. No real status-effect system exists.
> Showing them must **not** imply a working stun/slow/burn/etc. They are
> inventoried here for completeness and 3C planning — **do not wire to
> gameplay in 3B-B2/3B-B3.**

| Asset | Reads as | Phase |
|---|---|---|
| `status/stun.svg` | Stunned | 3C |
| `status/slow.svg` | Slowed | 3C |
| `status/taunt.svg` | Taunted | 3C |
| `status/shielded.svg` | Damage shield | 3C |
| `status/burn.svg` | Burning (DoT) | 3C |
| `status/frozen.svg` | Frozen / rooted | 3C |
| `status/healing.svg` | Heal-over-time | 3C |
| `status/buff_attack.svg` | Attack up | 3C |
| `status/buff_armor.svg` | Armor up | 3C |
| `status/dead.svg` | Defeated / respawning | 3B-A dummy state / 3C |

---

## 6. Cooldown / ready / denied feedback (UI-space)

| Asset | Reads as | Intended use | Space |
|---|---|---|---|
| `vfx/cooldown_swirl.svg` | Recharge sweep | Skill button recharging | UI |
| `vfx/skill_ready_flash.svg` | Skill refreshed pulse | Button off-cooldown flash | UI |
| `vfx/denied_flash.svg` | Action refused | No-mana / on-cooldown input | UI |
| `vfx/mana_spark.svg` | Mana gain/spend cue | Mana feedback (future) | World or UI |
| `status/cooldown.svg` | Ability on cooldown glyph | Button cooldown glyph | UI |
| `status/low_mana.svg` | Low mana warning | HUD/mana warning | UI |

---

## Totals

- **Projectile**: 3 · **Hit impact**: 4 · **AoE/targeting markers**: 4 ·
  **Heal**: 2 · **Status icons (3C-deferred)**: 12 (10 listed above + `slow`/`shielded` etc.) ·
  **Cooldown/ready/denied + mana UI**: 6
- **30 SVG assets total** already exist (10 vfx + 8 combat + 12 status) —
  **zero new assets needed** for the next visual integration pass.
