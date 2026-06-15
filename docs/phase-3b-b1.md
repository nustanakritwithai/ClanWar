# Phase 3B-B1: Projectile + Hit Shape Foundation

## What was built

Runtime foundation for Phase 3B-B skill combat shapes:

- **Melee arc** helper (`HitShapes.testMeleeArc`) — shared by basic attack and melee skills
- **Projectile system** — spawn, swept collision, max-range cleanup, scene shutdown destroy
- **AoE circle placeholder** — instant single-hit (no per-frame ticking)
- **Minimal VFX** — circle/text placeholders (SVG asset integration deferred)

## Skills supported this phase

| Skill | Class | Runtime type | Notes |
|-------|-------|--------------|-------|
| Basic attack | All | `melee_arc` | 90° cone, existing armor formula |
| Shield Bash | Guardian | `melee_arc` | range 120, default 90° arc |
| Cleave | Warrior | `melee_arc` | range 90, arc 90° |
| Power Shot | Ranger | `projectile` | arrow placeholder, speed 650, range 450 |
| Fireball | Mage | `projectile` | fireball placeholder + AoE-on-hit radius 90 |
| Arrow Rain | Ranger | `aoe_circle` | instant damage at point in facing direction |
| Frost Zone | Mage | `aoe_circle` | instant `damagePerSecond` placeholder hit |
| Holy Circle | Priest | `aoe_circle` | self-centered instant `healPerSecond` on caster |
| Heal | Priest | `heal` | self-heal unchanged |

## Deferred to 3B-B2 / 3C

- Leap Strike, War Taunt, Meteor Siege, Gate Breaker (mapped but not priority-tested)
- Trap, Cleanse, Eagle Barrage multi-wave
- Arcane Wall collision
- Real status effects (stun/slow/burn/frozen/taunt)
- SVG asset loading from `public/assets/**` (placeholders used)
- AoE duration ticking / damage-over-time
- Ally targeting, bots, objectives, gate damage

## Projectile rules

- Spawn at caster position along facing vector at `projectileSpeed`
- **Swept segment** collision each frame (previous → current position)
- **Destroy on first hit** — single damage application
- **Destroy on max range** — no orphan projectiles
- **Scene shutdown** — `ProjectileSystem.destroy()` clears all
- `ownerTeam` set to `blue` (friendly-fire ready for future)
- Fireball applies AoE radius check at impact point

## Hit shape rules

### Melee arc

- Parameters: `range`, `arc` (degrees, default 90)
- Hit if target within range **and** inside frontal cone
- Returns `hit | out_of_range | outside_arc` for debug overlay

### AoE circle

- Instant single hit on cast
- Center: caster position (Holy Circle) or point at `range` in facing direction
- Hit if `distance(center, target) ≤ radius + targetRadius`

## Limitations

- Visuals are **placeholder circles** — Agent B SVG assets not loaded yet
- Only **TrainingDummy** is a valid combat target
- No bot/objective/shop/death/multiplayer
- `skills.ts` / `heroes.ts` balance unchanged

## Test checklist

- [x] `npm run build` passes
- [x] Guardian attack melee arc hit/miss
- [x] Guardian Shield Bash melee arc
- [x] Warrior Cleave melee arc
- [x] Ranger Power Shot projectile → dummy hit
- [x] Mage Fireball projectile → dummy hit (+ AoE check)
- [x] Projectile expires at max range without multi-hit
- [x] Priest Heal still works
- [x] Arrow Rain / Holy Circle AoE placeholder
- [x] Desktop WASD + keyboard regression
- [x] Mobile multi-touch regression (915×412 automated)
- [x] Menu ↔ Match 3 cycles — no projectile leak

## Files

- `src/game/combat/HitShapes.ts`
- `src/game/combat/SkillRuntimeType.ts`
- `src/game/entities/Projectile.ts`
- `src/game/systems/ProjectileSystem.ts`
- `src/game/ui/CombatVfx.ts`
- `src/game/scenes/MatchScene.ts` (combat routing)
