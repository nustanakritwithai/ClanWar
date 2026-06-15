# Phase 3B-B Test Matrix — Skill Hit Shapes + Projectile Foundation

> QA test plan for Agent A's Phase 3B-B runtime work (skill hit shapes,
> melee arcs, projectile placeholders, AoE placeholders). **Docs/spec only —
> this file does not implement or run tests.** Fill in Pass/Fail during
> manual QA on desktop and mobile viewports.

Scope reminder: Phase 3B-B targets the `TrainingDummy` only. No bot, no
objective/shop/economy, no real status-effect runtime (stun/slow/burn/frozen
are visual/data only until Phase 3C).

| Test ID | Scenario | Steps | Expected Result | Related Asset | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | Basic attack regression | 1. Enter Match. 2. Walk into melee range of `TrainingDummy`. 3. Trigger basic attack repeatedly. | Dummy takes damage per the Phase 3B-A armor formula; floating damage numbers appear; dummy HP bar decreases; no console errors. | `combat/training_dummy.svg`, `vfx/hit_spark.svg`, `vfx/damage_number_burst.svg` | ☐ |
| TC-02 | Guardian melee skill shape (Shield Bash) | 1. Select Guardian. 2. Face `TrainingDummy` within `range: 120`. 3. Cast Shield Bash (skill1). | Skill applies damage (80 base, armor-adjusted) only to targets inside the melee hit shape in front of the player; stun flag recorded (visual/data only, no movement lock required yet); cooldown (8s) and mana cost (40) deducted. | `skills/shield_bash.svg`, `vfx/hit_spark.svg`, `vfx/impact_burst.svg` | ☐ |
| TC-03 | Warrior melee arc / leap placeholder (Cleave / Leap Strike) | 1. Select Warrior. 2. Stand near `TrainingDummy`. 3. Cast Cleave (skill1, `arc: 90`, `range: 90`). 4. Reposition and cast Leap Strike (skill2, `range: 220`, `radius: 80`) toward the dummy. | Cleave damages dummy only when inside the 90° frontal arc at 90 range. Leap Strike either repositions the player toward the target point or applies an AoE-placeholder hit at the landing point (radius 80) — whichever Agent A implements first; damage (110 / 100) applied once per cast. | `skills/cleave.svg`, `skills/leap_strike.svg`, `combat/attack_cone.svg`, `vfx/slash_arc.svg`, `combat/aoe_marker.svg` | ☐ |
| TC-04 | Ranger projectile arrow (Power Shot) | 1. Select Ranger. 2. Stand at range (up to `range: 450`) from `TrainingDummy`. 3. Cast Power Shot (skill1). | A projectile placeholder sprite travels from caster toward target/aim direction at `projectileSpeed: 650`; on contact with dummy, applies 120 base damage once, then the projectile is destroyed; projectile is destroyed if it exceeds `range: 450` without a hit. | `combat/projectile_arrow.svg`, `skills/power_shot.svg`, `vfx/hit_spark.svg` | ☐ |
| TC-05 | Mage fireball projectile (Fireball) | 1. Select Mage. 2. Stand at range (up to `range: 420`) from `TrainingDummy`. 3. Cast Fireball (skill1). | Fireball projectile placeholder travels at `projectileSpeed: 520`; on contact, applies 130 base damage within `radius: 90` of impact point (AoE-on-hit or single-target placeholder, per Agent A's choice noted in `projectile-and-hit-shape-spec.md`); projectile destroyed on hit or at max range. | `combat/projectile_fireball.svg`, `skills/fireball.svg`, `vfx/impact_burst.svg` | ☐ |
| TC-06 | Priest heal / holy effect | 1. Select Priest. 2. Damage self or note current HP (e.g. via dummy counter-hit if available, or take any existing damage source). 3. Cast Heal (skill1, `heal: 140`, `range: 320`). | Heal applies to self (no ally target exists yet), capped at max HP; HP bar increases; floating heal number/heal VFX shown; mana (55) and cooldown (6s) applied. If no damage was taken, heal is a no-op or capped at max HP without overflow/errors. | `skills/heal.svg`, `vfx/heal_spark.svg`, `vfx/heal_cross_burst.svg` | ☐ |
| TC-07 | Skill range check | 1. For each skill with a `range` value, position player just outside that range from `TrainingDummy`. 2. Cast the skill. 3. Move just inside the range and cast again. | Outside range: skill either fails to find a valid target/effect area or visibly misses the dummy (per spec, no damage applied to dummy). Inside range: skill connects normally. Mana/cooldown still consumed on cast in both cases (cast itself is not blocked by range, only the effect). | `combat/skill_range_circle.svg` | ☐ |
| TC-08 | Hit/miss behavior | 1. Cast a melee skill (e.g. Cleave) while facing away from `TrainingDummy`. 2. Cast a projectile skill (e.g. Power Shot) aimed away from the dummy. | Melee arc cast facing away: no damage applied to dummy (dummy outside arc). Projectile aimed away: projectile travels and is destroyed at max range without hitting dummy, no damage applied, no console error. | `combat/attack_cone.svg`, `combat/projectile_arrow.svg` | ☐ |
| TC-09 | Mana/cooldown regression | 1. Cast any skill until mana is insufficient. 2. Attempt to cast again with insufficient mana. 3. Cast a skill and immediately attempt to recast before cooldown expires. | Insufficient mana: cast is blocked, mana unchanged, `vfx/denied_flash.svg` (if wired) or existing denial feedback shown. Cooldown: recast blocked until cooldown timer (per skill's `cooldown` value) elapses; skill button/UI reflects cooldown state. | `vfx/denied_flash.svg`, `ui/cooldown_overlay.svg`, `status/cooldown.svg`, `status/low_mana.svg` | ☐ |
| TC-10 | Dummy death/reset regression | 1. Repeatedly damage `TrainingDummy` (basic attacks and/or skills) until HP reaches 0. | Dummy plays a defeated state (per `TrainingDummy.ts` from Phase 3B-A) and resets/respawns per existing 3B-A behavior; no new behavior required from 3B-B skills beyond not breaking this reset; no console errors during repeated kills. | `status/dead.svg`, `combat/training_dummy.svg` | ☐ |
| TC-11 | Mobile 915×412 | 1. Set viewport/emulated device to 915×412 (landscape phone). 2. Enter Match. 3. Repeat TC-01 through TC-06 in this viewport. | All skill casts, melee arcs, projectiles, and AoE placeholders render correctly within the visible play area; skill buttons and joystick remain usable and do not overlap with combat VFX; no clipping of UI by world-space effects. | All combat/vfx/skill assets above | ☐ |
| TC-12 | Mobile 800×360 ClassSelect regression | 1. Set viewport to 800×360. 2. Open ClassSelect screen. 3. Confirm class portraits, skill icons, and Start button remain visible and tappable. | ClassSelect layout is unaffected by Phase 3B-B changes — class icons (`classes/*.svg`) and skill icons (`skills/*.svg`) render at correct size with no overlap/cropping; selection and Start flow work. | `classes/*.svg`, `skills/*.svg` | ☐ |
| TC-13 | Portrait rotate hint | 1. Set viewport to a portrait orientation (e.g. 412×915). 2. Observe Menu/Match scenes. | Existing "rotate device to landscape" hint (from earlier phases) still appears and is not obscured or broken by any new skill/projectile/VFX elements added in 3B-B. | n/a (existing UI) | ☐ |
| TC-14 | Menu ↔ Match, 3 cycles | 1. From Menu, start a Match. 2. Return to Menu (or restart). 3. Repeat for a total of 3 Menu→Match→Menu cycles, casting at least one skill of each type (melee, projectile, AoE, heal) per cycle. | Each cycle starts cleanly: no leftover projectiles, VFX, or AoE markers from the previous match persist into the next; `TrainingDummy` resets to full HP each new Match; no console errors accumulate across cycles. | `combat/projectile_arrow.svg`, `combat/projectile_fireball.svg`, `combat/aoe_marker.svg`, `vfx/*` | ☐ |
| TC-15 | No console error | 1. Open browser devtools console. 2. Repeat TC-01 through TC-14. | No uncaught errors or warnings related to skill casting, projectile spawn/destroy, AoE placeholders, or asset loading appear in the console at any point. | n/a | ☐ |
| TC-16 | No bot/shop/objective runtime | 1. Inspect the running Match scene (visually and via devtools if needed) after Phase 3B-B changes. | No bot-controlled units, shop UI, or objective (core/gate/camp) damage/interaction logic is present or triggered — Phase 3B-B introduces skill hit shapes and projectiles only, scoped to the player and `TrainingDummy`. | n/a | ☐ |

---

## Notes for Agent A

- This matrix assumes Phase 3B-A (`TrainingDummy`, `CombatSystem`, `CombatText`,
  basic attack cone) is live and working as the baseline (TC-01).
- Where a skill's exact hit-shape implementation is ambiguous (e.g. Leap
  Strike: dash vs. AoE-on-landing), pick one approach and note it in
  `projectile-and-hit-shape-spec.md` / commit message so QA can re-test
  against the chosen behavior.
- AoE/projectile skills not yet covered by a dedicated test case here
  (Arrow Rain, Frost Zone, Holy Circle, ultimates) follow the same
  patterns as TC-04/TC-05/TC-06 and can reuse this matrix's structure —
  see `skill-visual-mapping.md` for their Phase 3B-B vs. 3C status.
