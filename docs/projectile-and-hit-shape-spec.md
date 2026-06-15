# Projectile & Hit Shape Spec — Phase 3B-B

> Spec for Agent A's runtime implementation of skill hit shapes and the
> projectile foundation. **Docs/spec only** — describes expected behavior
> and data shapes; does not implement anything in `src/game/**`. References
> existing `SkillDefinition` fields from `src/game/data/skills.ts` (read-only
> here, not modified).

---

## 1. Melee Arc

**Used by**: Guardian Shield Bash, Warrior Cleave, Warrior Gate Breaker
(and the existing Phase 3B-A basic attack cone, for reference).

- **Shape**: A cone/arc originating at the caster's position, oriented to
  the caster's facing direction.
- **Parameters**:
  - `range` — the cone's radius (distance from caster).
  - `arc` — the cone's total angle in degrees, centered on the facing
    direction (e.g. `arc: 90` = ±45° from facing). If a skill has no `arc`
    field (e.g. Shield Bash, Gate Breaker), reuse the existing basic-attack
    cone angle (90°) as the default.
- **Hit test**: A target (the `TrainingDummy`) is hit if it is within
  `range` of the caster **and** within the angular half-width of `arc`
  relative to the caster's facing vector. This mirrors the existing
  Phase 3B-A basic attack cone check — reuse that logic rather than
  reimplementing.
- **Trigger timing**: Instant, on skill cast (no wind-up/travel time
  required for 3B-B).
- **Multi-hit**: Each cast applies damage **at most once** per target,
  regardless of how long the cone visual persists.

---

## 2. Projectile

**Used by**: Ranger Power Shot, Mage Fireball.

- **Spawn**: On cast, spawn a projectile object at the caster's position,
  moving in the caster's aim/facing direction.
- **Fields** (suggested shape for the projectile entity/object):
  - `position: {x, y}` — current world position, updated each frame.
  - `velocity: {x, y}` — derived from the skill's `projectileSpeed` and the
    aim direction at cast time (direction is fixed at spawn; no homing).
  - `range` — the skill's `range` value; the maximum travel distance from
    the spawn point.
  - `ownerTeam` — the casting player's team, used to prevent friendly-fire
    (see Targeting rule below; with only one player + one dummy in 3B-B,
    this field can be set but has limited effect until multiplayer/bots
    exist).
  - `radius` / hitbox — a small collision radius for contact detection
    against the dummy (suggest a fixed small radius, e.g. 12–20 units,
    independent of the skill's `radius` field which describes the
    on-hit AoE, not the projectile body).
- **Movement**: Each frame, advance `position` by `velocity * deltaTime`.
- **Hit detection**: If the projectile's position comes within its hitbox
  radius of the `TrainingDummy`, apply the skill's damage once and destroy
  the projectile.
- **Max range**: Track distance traveled from spawn point. If it exceeds
  `range` without hitting anything, destroy the projectile.
- **On-hit AoE (Fireball only)**: When Fireball's projectile hits, apply
  damage within `radius: 90` of the impact point (in 3B-B with a single
  dummy, this is equivalent to a single-target hit, but implement the
  radius check so it generalizes correctly when more targets exist).
- **Visuals**: Use `combat/projectile_arrow.svg` (Power Shot) and
  `combat/projectile_fireball.svg` (Fireball) as the moving sprite, rotated
  to the travel direction. On destroy (hit or max-range), optionally play
  `vfx/hit_spark.svg` / `vfx/impact_burst.svg`.

---

## 3. AoE Circle Placeholder

**Used by**: Ranger Arrow Rain, Mage Frost Zone, Priest Holy Circle (and
optionally Guardian War Taunt, Warrior Leap Strike landing, Mage Meteor
Siege — see `skill-visual-mapping.md` for the full list).

- **Shape**: A circle defined by a `center: {x, y}` point and a `radius`
  (from the skill's `radius` field).
- **Center point determination**:
  - For self-centered skills (e.g. War Taunt, Holy Circle): `center` =
    caster's position at cast time.
  - For targeted-point skills (e.g. Arrow Rain, Frost Zone, Meteor Siege,
    Leap Strike landing): `center` = a point in front of the caster up to
    the skill's `range`, in the caster's aim/facing direction (no separate
    aiming UI required for 3B-B — a fixed point at max range in the facing
    direction is an acceptable placeholder).
- **Hit test**: A target is hit if the distance from `center` to the
  target's position is ≤ `radius`.
- **Duration** (optional): If the skill has a `duration` field
  (e.g. Arrow Rain `duration: 2`, Frost Zone `duration: 3`, Holy Circle
  `duration: 3`), Phase 3B-B may treat the AoE as an **instant single hit
  on cast** (apply damage/heal once immediately, ignore `duration` for
  now) rather than a persisting zone. A persisting zone with periodic
  ticking is a **3C** refinement.
- **Tick** (optional, deferred): Per-second damage/heal (`damagePerSecond`,
  `healPerSecond`) and repeated hit-testing over `duration` are **not
  required for 3B-B** — see Risk Register for the performance concern if
  implemented naively.
- **Visuals**: `combat/aoe_marker.svg` for the ground marker, with
  `vfx/impact_burst.svg` (damage) or `vfx/heal_cross_burst.svg` (heal) on
  the instant-hit moment.

---

## 4. Self/Ally Heal Placeholder

**Used by**: Priest Heal, Priest Holy Circle (self-portion), Priest Revival
Prayer (self-portion).

- **Target**: Self (the caster) only — **no ally target exists in 3B-B**.
- **Amount**: The skill's `heal` (Heal: 140, Revival Prayer: 300) or a
  single application of `healPerSecond` (Holy Circle: 45) as an instant
  placeholder tick.
- **Cap**: The resulting HP must not exceed the player's max HP — clamp,
  do not overflow.
- **No-op case**: If the caster is already at max HP, the heal still
  consumes mana and triggers cooldown (consistent with TC-06 in the test
  matrix) but results in no HP change; this must not throw or warn.
- **Visuals**: `vfx/heal_spark.svg` (small) / `vfx/heal_cross_burst.svg`
  (big, for Holy Circle / Revival Prayer).

---

## 5. Targeting Rule for Phase 3B-B

- **Valid targets**: `TrainingDummy` only. No bot units exist.
- **No friendly-fire**: Since the only other entity is the neutral
  `TrainingDummy`, friendly-fire is not currently reachable, but
  `ownerTeam` should still be set on projectiles/AoE so the check is
  correct once additional units exist.
- **No objective damage**: Skills must not apply damage/effects to gates,
  cores, camps, or any other objective — those entities are out of scope
  for 3B-B and any `gateDamageBonus` fields are inert.
- **Single target per cast**: Each skill cast resolves against at most the
  set of valid targets within its hit shape at the moment of the hit test
  (melee: on cast; projectile: on contact; AoE: on cast for the instant
  placeholder). No retroactive or repeated hits from a single cast beyond
  what's described above.

---

## 6. Cleanup Rule

- **No orphan projectiles**: Every spawned projectile must be destroyed
  either on hit, on exceeding max `range`, or on scene shutdown — never
  left running after its lifecycle ends.
- **No infinite tweens**: Any tween/animation attached to a projectile,
  AoE marker, or VFX must have a defined end (duration-based or
  hit/destroy-triggered) and be stopped/destroyed alongside its owning
  object.
- **Scene shutdown**: On `MatchScene` shutdown (e.g. returning to Menu),
  all active projectiles, AoE markers, and any associated VFX/tweens must
  be removed so a fresh Match starts with no leftover state (see TC-14 in
  the test matrix).
