# Asset Inventory — Combat Visual Kit

> Catalogue of the combat VFX / helper / status assets. **Static, standalone art**
> — not yet wired into the runtime. Integration is owned by the runtime track.
> A separate file from `asset-inventory.md` to avoid merge conflicts with the
> base visual kit.
>
> **Totals:** 30 SVG assets — 10 VFX · 8 combat helpers · 12 status icons.
> All `256×256`, transparent, hand-authored from SVG primitives, validated as
> well-formed XML (30/30).
>
> Status legend: ✅ done

## VFX (`public/assets/vfx/`)

| Asset path | Type | Purpose | Intended phase | Runtime integration note | Status |
|---|---|---|---|---|---|
| `vfx/hit_spark.svg` | VFX | Physical hit flash | 3B-B | Spawn at contact, scale+fade ~200ms | ✅ |
| `vfx/slash_arc.svg` | VFX | Melee swing trail | 3B-B | Orient to facing; quick fade | ✅ |
| `vfx/impact_burst.svg` | VFX | Heavy/explosive impact | 3B-B / 3C | Scale-up burst for big hits | ✅ |
| `vfx/damage_number_burst.svg` | VFX | Damage number backing flare | 3B-B | Draw runtime number on top; rise+fade | ✅ |
| `vfx/heal_spark.svg` | VFX | Small heal mote | 3C | Rise+fade on healed unit | ✅ |
| `vfx/heal_cross_burst.svg` | VFX | Big heal proc | 3C | Burst on heal cast | ✅ |
| `vfx/mana_spark.svg` | VFX | Mana gain/spend cue | 3C | Small fade on cast/regen | ✅ |
| `vfx/cooldown_swirl.svg` | VFX | Recharge sweep | 3B-B | Runtime rotates the sweep group | ✅ |
| `vfx/skill_ready_flash.svg` | VFX | Skill refreshed pulse | 3B-B | Flash on button when off cooldown | ✅ |
| `vfx/denied_flash.svg` | VFX | Action refused cue | 3B-B | Flash on no-mana / on-cooldown input | ✅ |

## Combat helpers (`public/assets/combat/`)

| Asset path | Type | Purpose | Intended phase | Runtime integration note | Status |
|---|---|---|---|---|---|
| `combat/training_dummy.svg` | Helper | Practice dummy sprite | 3B-A/3B-B | Non-team; static target. Real dummy is runtime-driven | ✅ |
| `combat/attack_cone.svg` | Indicator | Melee cone preview | 3B-B | Neutral; tint + rotate to facing | ✅ |
| `combat/skill_range_circle.svg` | Indicator | Cast-range boundary | 3B-B / 3C | Neutral; scale to range | ✅ |
| `combat/aoe_marker.svg` | Indicator | Ground AoE target | 3C | Neutral; scale to radius, tint friend/foe | ✅ |
| `combat/projectile_arrow.svg` | Projectile | Arrow body placeholder | 3B-B / 3C | Rotate to travel dir; tint optional | ✅ |
| `combat/projectile_fireball.svg` | Projectile | Fireball body placeholder | 3C | Rotate to travel dir | ✅ |
| `combat/projectile_holy_light.svg` | Projectile | Holy light body placeholder | 3C | Rotate to travel dir | ✅ |
| `combat/target_reticle.svg` | Indicator | Lock-on reticle | 3B-B / 3C | Neutral; tint friend/foe | ✅ |

## Status icons (`public/assets/status/`)

| Asset path | Type | Purpose | Intended phase | Runtime integration note | Status |
|---|---|---|---|---|---|
| `status/stun.svg` | Status icon | Stunned | 3C | Status-bar glyph; optional duration sweep | ✅ |
| `status/slow.svg` | Status icon | Slowed | 3C | Status-bar glyph | ✅ |
| `status/taunt.svg` | Status icon | Taunted | 3C | Status-bar glyph | ✅ |
| `status/shielded.svg` | Status icon | Damage shield | 3C | Status-bar glyph | ✅ |
| `status/burn.svg` | Status icon | Burning (DoT) | 3C | Status-bar glyph | ✅ |
| `status/frozen.svg` | Status icon | Frozen/rooted | 3C | Status-bar glyph | ✅ |
| `status/healing.svg` | Status icon | Heal-over-time | 3C | Status-bar glyph | ✅ |
| `status/buff_attack.svg` | Status icon | Attack up | 3C | Status-bar glyph | ✅ |
| `status/buff_armor.svg` | Status icon | Armor up | 3C | Status-bar glyph | ✅ |
| `status/low_mana.svg` | Status icon | Low mana warning | 3C | HUD warning glyph | ✅ |
| `status/cooldown.svg` | Status icon | Ability on cooldown | 3B-B | HUD/button glyph | ✅ |
| `status/dead.svg` | Status icon | Defeated/respawning | 3C | Unit/HUD glyph | ✅ |

## Documentation (`docs/`)

| Asset path | Type | Purpose | Status |
|---|---|---|---|
| `docs/combat-visual-kit.md` | Doc | Combat kit art direction & future-use rules | ✅ |
| `docs/asset-inventory-combat.md` | Doc | This catalogue | ✅ |

## Integration notes (for the runtime track)

- All assets have **transparent backgrounds** and a centered subject — safe to
  composite and to position by center point.
- **Helpers, indicators, and projectiles are team-neutral** — tint at runtime;
  do not assume a team color from the art.
- **VFX carry no animation** — the runtime owns spawn/tween/fade/cleanup. Where
  motion is implied (`cooldown_swirl`, `cooldown` wedge), rotate/redraw at runtime.
- **Damage numbers**: art is the backing flare only; the value is runtime text.
- This kit does **not** touch `src/game/**`, `package.json`, `README.md`, or
  `public/manifest.webmanifest`.
