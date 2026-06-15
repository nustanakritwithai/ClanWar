# Skill Visual Mapping — Phase 3B-B / 3C

> Maps each `SkillDefinition` in `src/game/data/skills.ts` to its intended
> runtime hit-shape behavior and visual assets. **Docs/spec only** — this is
> guidance for Agent A's runtime implementation, not an implementation
> itself. This kit does not edit `src/game/**`, `skills.ts`, or balance
> numbers.
>
> Runtime Type legend:
> - `melee_arc` — cone/arc check in front of the caster (Phase 3B-B)
> - `projectile` — moving placeholder sprite, hits on contact (Phase 3B-B)
> - `aoe_circle` — placeholder ground circle at a point, instant or
>   short-duration (Phase 3B-B: instant/no-tick placeholder is acceptable)
> - `self_buff` — applies a stat change to the caster, no target needed
> - `heal` — applies HP restore to self (no ally target yet)
> - `wall/zone placeholder` — visual-only placeholder for a wall/zone effect;
>   no collision/blocking logic required in 3B-B
>
> Phase 3B-B scope: **dummy-target only**. Real status effects (stun, slow,
> burn, frozen, taunt-forced-target, etc.) are **deferred to Phase 3C** —
> in 3B-B these are data fields only (already present on `SkillDefinition`)
> with no runtime status application; status icons may be shown statically
> for visual QA but do not need to drive gameplay behavior yet.

## Guardian

| Class | Skill | Slot | Runtime Type | Hit Shape | Suggested VFX Asset | Suggested Skill Icon | Phase | Notes |
|---|---|---|---|---|---|---|---|---|
| Guardian | Shield Bash | skill1 | `melee_arc` | Frontal cone, `range: 120`, narrow angle (suggest ~60–90°) | `vfx/hit_spark.svg`, `vfx/impact_burst.svg` | `skills/shield_bash.svg` | 3B-B | `stun: 0.5` is data-only in 3B-B; stun application deferred to 3C (`status/stun.svg` reserved for 3C). |
| Guardian | Guard Wall | skill2 | `self_buff` | No target shape — applies `damageReduction: 0.4` to caster for `duration: 3` | `vfx/skill_ready_flash.svg` (on activation pulse) | `skills/guard_wall.svg` | 3B-B (buff value), 3C (visual zone/wall) | A visible "wall" placeholder (`mage_arcane_wall.svg`-style zone) is 3C; 3B-B only needs the self-buff to apply. |
| Guardian | War Taunt | skill3 | `aoe_circle` | Placeholder circle, `radius: 160`, centered on caster | `vfx/impact_burst.svg`, `combat/aoe_marker.svg` | `skills/war_taunt.svg` | 3B-B (circle + dummy hit detection), 3C (taunt/slow effect) | `slow: 0.3` / forced-taunt behavior deferred to 3C (`status/taunt.svg`, `status/slow.svg` reserved). |
| Guardian | Fortress Stand | ultimate | `self_buff` + `aoe_circle` | Placeholder circle, `radius: 220`, centered on caster, for visual only | `vfx/impact_burst.svg`, `vfx/skill_ready_flash.svg` | `skills/fortress_stand.svg` | 3B-B (self-buff: `armorBonus: 20`, `damageReduction: 0.25`), 3C (ally-radius application) | `duration: 5`. No allies exist yet, so radius effect on others is 3C; self-buff only in 3B-B. |

## Warrior

| Class | Skill | Slot | Runtime Type | Hit Shape | Suggested VFX Asset | Suggested Skill Icon | Phase | Notes |
|---|---|---|---|---|---|---|---|---|
| Warrior | Cleave | skill1 | `melee_arc` | Frontal cone, `range: 90`, `arc: 90` | `vfx/slash_arc.svg`, `vfx/hit_spark.svg` | `skills/cleave.svg` | 3B-B | Direct analog to basic attack cone but wider/shorter per `arc`/`range` values. |
| Warrior | Leap Strike | skill2 | `aoe_circle` (landing) | Placeholder circle, `radius: 80`, at landing point up to `range: 220` from caster | `vfx/impact_burst.svg`, `combat/aoe_marker.svg` | `skills/leap_strike.svg` | 3B-B (placeholder: choose either dash-to-point or instant AoE at aimed point within range; document choice in `projectile-and-hit-shape-spec.md`) | "Leap" movement/dash animation is optional in 3B-B — the AoE hit + damage is the required part. |
| Warrior | Rage | skill3 | `self_buff` | No target shape — applies `attackSpeedBonus: 0.35` to caster for `duration: 4` | `vfx/skill_ready_flash.svg` | `skills/rage.svg` | 3B-B | `status/buff_attack.svg` may be shown as a static status-bar icon while active (visual only). |
| Warrior | Gate Breaker | ultimate | `melee_arc` or `aoe_circle` | Frontal cone/circle, `radius: 120`, centered on or in front of caster | `vfx/impact_burst.svg` | `skills/gate_breaker.svg` | 3B-B (damage to dummy, base `damage: 180`), 3C (gate damage) | `gateDamageBonus: 0.5` only applies once objectives exist — out of scope for 3B-B, dummy takes base damage only. |

## Ranger

| Class | Skill | Slot | Runtime Type | Hit Shape | Suggested VFX Asset | Suggested Skill Icon | Phase | Notes |
|---|---|---|---|---|---|---|---|---|
| Ranger | Power Shot | skill1 | `projectile` | Single projectile, `range: 450`, `projectileSpeed: 650`, small hit radius | `combat/projectile_arrow.svg`, `vfx/hit_spark.svg` | `skills/power_shot.svg` | 3B-B | Core projectile reference case — see `projectile-and-hit-shape-spec.md` Projectile section. |
| Ranger | Arrow Rain | skill2 | `aoe_circle` | Placeholder circle, `radius: 140`, at target point up to `range: 420` | `combat/aoe_marker.svg`, `vfx/impact_burst.svg` | `skills/arrow_rain.svg` | 3B-B (instant placeholder hit), 3C (over-time tick via `duration: 2`) | 3B-B may apply damage once on cast within the circle; per-tick damage over `duration` is a 3C refinement. |
| Ranger | Trap | skill3 | `aoe_circle` (deferred trigger) | Placeholder circle, `radius: 80`, placed at caster's position or short range | `combat/aoe_marker.svg` | `skills/trap.svg` | 3C | Trap-arming/triggering logic and `slow: 0.45` deferred to 3C; 3B-B may skip implementing this skill's effect entirely (icon/data only). |
| Ranger | Eagle Barrage | ultimate | `aoe_circle` (multi-wave) | Placeholder circle, `radius: 180`, at target point up to `range: 500`, repeated for `waves: 5` | `combat/aoe_marker.svg`, `vfx/impact_burst.svg` | `skills/eagle_barrage.svg` | 3C | Multi-wave timing/sequencing is more involved than 3B-B scope; recommend deferring full implementation to 3C, optionally stub as single `aoe_circle` hit in 3B-B if desired. |

## Mage

| Class | Skill | Slot | Runtime Type | Hit Shape | Suggested VFX Asset | Suggested Skill Icon | Phase | Notes |
|---|---|---|---|---|---|---|---|---|
| Mage | Fireball | skill1 | `projectile` (AoE-on-hit) | Projectile, `range: 420`, `projectileSpeed: 520`; on contact, AoE `radius: 90` | `combat/projectile_fireball.svg`, `vfx/impact_burst.svg` | `skills/fireball.svg` | 3B-B | Second core projectile reference case — projectile travel + AoE-on-impact. With only one dummy as target, AoE radius can be functionally equivalent to single-target in 3B-B. |
| Mage | Frost Zone | skill2 | `aoe_circle` (zone, deferred tick) | Placeholder circle, `radius: 150`, at target point | `combat/aoe_marker.svg`, `vfx/impact_burst.svg` | `skills/frost_zone.svg` | 3B-B (instant placeholder hit), 3C (`damagePerSecond: 35` over `duration: 3`, `slow: 0.4`) | Same pattern as Arrow Rain — instant placeholder now, DoT/slow tick later. |
| Mage | Arcane Wall | skill3 | `wall/zone placeholder` | No hit shape — visual-only zone, `width: 220`, `duration: 3` | `vfx/skill_ready_flash.svg` (cast pulse) | `skills/arcane_wall.svg` | 3C | No collision/blocking logic in 3B-B; may be skipped entirely or shown as a static placeholder graphic only. |
| Mage | Meteor Siege | ultimate | `aoe_circle` | Placeholder circle, `radius: 190`, at target point up to `range: 520` | `combat/aoe_marker.svg`, `vfx/impact_burst.svg` | `skills/meteor_siege.svg` | 3B-B (damage to dummy, base `damage: 240`), 3C (gate damage) | `gateDamageBonus: 0.25` deferred — same pattern as Gate Breaker. |

## Priest

| Class | Skill | Slot | Runtime Type | Hit Shape | Suggested VFX Asset | Suggested Skill Icon | Phase | Notes |
|---|---|---|---|---|---|---|---|---|
| Priest | Heal | skill1 | `heal` | No target shape — applies `heal: 140` to self, capped at max HP, `range: 320` unused (no ally target) | `vfx/heal_spark.svg` | `skills/heal.svg` | 3B-B | Self-heal only in 3B-B since no ally exists; `range` field is reserved for future ally-targeting in 3C. |
| Priest | Holy Circle | skill2 | `aoe_circle` (self-centered, deferred tick) | Placeholder circle, `radius: 150`, centered on caster | `vfx/heal_cross_burst.svg`, `combat/aoe_marker.svg` | `skills/holy_circle.svg` | 3B-B (instant self-heal placeholder), 3C (`healPerSecond: 45` over `duration: 3`, ally coverage) | 3B-B: apply a single heal tick to self on cast as placeholder. |
| Priest | Cleanse | skill3 | `aoe_circle` (deferred effect) | Placeholder circle, `radius: 120`, `range: 280` | `vfx/heal_spark.svg` | `skills/cleanse.svg` | 3C | Cleanse removes debuffs — meaningless until status effects exist (3C). 3B-B may skip implementing this skill's effect entirely (icon/data only). |
| Priest | Revival Prayer | ultimate | `heal` (+ `aoe_circle` later) | No target shape in 3B-B — applies `heal: 300` to self, capped at max HP; `radius: 180` reserved for ally coverage | `vfx/heal_cross_burst.svg` | `skills/revival_prayer.svg` | 3B-B (self-heal), 3C (ally/revival logic) | "Revival" of downed allies is meaningless until allies/death-states for players exist (3C); 3B-B treats this as a big self-heal. |

---

## Summary

- **Phase 3B-B implements**: `melee_arc` (Shield Bash, Cleave, Gate Breaker),
  `projectile` (Power Shot, Fireball), `aoe_circle` placeholders (War Taunt,
  Leap Strike, Arrow Rain, Frost Zone, Meteor Siege, Holy Circle), `self_buff`
  (Guard Wall, Rage, Fortress Stand self-portion), and `heal` (Heal, Revival
  Prayer self-portion).
- **Deferred to Phase 3C**: Trap, Cleanse, Eagle Barrage's multi-wave
  sequencing, Arcane Wall collision, all real status-effect application
  (stun/slow/burn/frozen/taunt), ally-targeted heals, and objective/gate
  damage bonuses.
- All "Suggested VFX Asset" / "Suggested Skill Icon" entries reference assets
  already present from PR #4 (`public/assets/skills/**`) and PR #6
  (`public/assets/vfx/**`, `public/assets/combat/**`, `public/assets/status/**`)
  — no new assets are required for 3B-B.
