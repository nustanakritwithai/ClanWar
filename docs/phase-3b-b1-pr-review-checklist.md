# Phase 3B-B1 PR Review Checklist — Projectile + Hit Shape Foundation

> QA gate for reviewing Agent A's Phase 3B-B1 runtime PR (projectile
> foundation, Ranger Power Shot, Mage Fireball, melee hit shape helper, AoE
> instant placeholder, minimal VFX feedback). **Docs/spec/QA only** — this
> checklist does not implement or test anything itself; a reviewer fills it
> in against the actual PR diff and a live/preview build.
>
> Reference docs: `docs/phase-3b-b-test-matrix.md`,
> `docs/skill-visual-mapping.md`, `docs/projectile-and-hit-shape-spec.md`,
> `docs/combat-vfx-integration-plan.md`, `docs/phase-3b-b-risk-register.md`.

---

## 1. Scope Gate

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| PR description matches Phase 3B-B1 scope | PR explicitly covers: projectile foundation, Power Shot, Fireball, melee hit shape helper, AoE instant placeholder, minimal VFX feedback — and nothing else | ☐ | |
| No bot/objective/shop/economy work | PR contains no new bot AI, objective damage, shop, or economy code | ☐ | |
| No multiplayer/networking work | PR contains no networking, matchmaking, or multi-client sync code | ☐ | |
| No death/respawn system changes beyond existing `TrainingDummy` reset | Any dummy death/reset behavior matches the existing Phase 3B-A `TrainingDummy.ts` contract (no new player-death system) | ☐ | |
| No balance changes | `src/game/data/skills.ts` and `src/game/data/heroes.ts` values (damage, range, radius, cooldown, manaCost, etc.) are unchanged from base | ☐ | |
| No new gameplay features beyond spec | No new skills, classes, UI screens, or systems beyond what's listed in `skill-visual-mapping.md` for 3B-B | ☐ | |

---

## 2. Files Allowed / Forbidden

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| `src/game/**` changes are runtime-only and in-scope | Changes limited to projectile/hit-shape/AoE/VFX systems, entities, scenes — consistent with `projectile-and-hit-shape-spec.md` | ☐ | |
| No changes to `public/assets/**` | `git diff --name-only` shows no new/modified files under `public/assets/**` (existing PR #4/#6 assets only, referenced not replaced) | ☐ | |
| No changes to `public/icons/**` | No files under `public/icons/**` touched | ☐ | |
| No changes to `README.md` | `README.md` unchanged | ☐ | |
| No changes to `package.json` / lockfile | `package.json` and `package-lock.json`/`pnpm-lock.yaml`/etc. unchanged unless a clearly justified, minimal dependency is documented in the PR description | ☐ | |
| No changes to `public/manifest.webmanifest` | Unchanged | ☐ | |
| No changes to `vite.config.ts` | Unchanged unless explicitly justified (e.g. carried over from PR #8 hotfix, not new) | ☐ | |
| No changes to `scripts/**` | Unchanged unless explicitly justified | ☐ | |
| No changes to QA/docs files from PR #7 | `docs/phase-3b-b-*.md`, `docs/skill-visual-mapping.md`, `docs/projectile-and-hit-shape-spec.md`, `docs/combat-vfx-integration-plan.md` unchanged (Agent A may reference but should not need to edit) | ☐ | |

---

## 3. Projectile Runtime Checklist

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Projectile spawns on cast | Power Shot and Fireball each spawn a projectile object at the caster's position on cast | ☐ | |
| Projectile moves at correct speed | Power Shot moves at `projectileSpeed: 650`, Fireball at `projectileSpeed: 520` (per `skills.ts`, values unchanged) | ☐ | |
| Projectile hit/miss works | Projectile aimed at dummy within range hits and applies damage; projectile aimed away misses (no damage to dummy) | ☐ | |
| Projectile does not double-hit | A single cast applies damage to the dummy **at most once**, even if overlap persists for multiple frames | ☐ | |
| Projectile destroyed on hit | On contact with dummy, projectile is removed/destroyed immediately | ☐ | |
| Projectile destroyed at max range | If projectile travels its skill's `range` without hitting anything, it is destroyed (no orphan) | ☐ | |
| No tunneling at high speed | Fast-moving projectile (650/520 px-per-second equivalent) reliably hits the dummy when aimed at it — does not visually pass through without registering a hit (swept/segment check or equivalent) | ☐ | |
| Fireball AoE-on-hit behaves sanely | Fireball applies damage within `radius: 90` of impact point (with one dummy, single-hit-equivalent result is acceptable) | ☐ | |

---

## 4. Melee Hit Shape Checklist

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Basic attack regression unaffected | Existing Phase 3B-A basic attack cone still works against the dummy (no regression from new hit-shape helper) | ☐ | |
| Melee hit shape helper is reusable | New helper function/module is usable for cone/arc tests (range + arc) rather than duplicating the basic-attack cone logic inline | ☐ | |
| Range + arc parameters respected | A melee skill (if exercised in this PR, e.g. Cleave/Shield Bash) hits only within its `range` and `arc`/default 90° cone | ☐ | |
| Single hit per cast | Melee hit shape applies damage at most once per cast, not once per frame while the cone is "active" | ☐ | |

---

## 5. AoE Placeholder Checklist

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| AoE placeholder is instant-hit (not per-frame tick) | If an AoE skill is exercised (e.g. Arrow Rain/Frost Zone/Meteor Siege placeholder), it applies damage once on cast — no per-frame ticking loop introduced | ☐ | |
| AoE center point is correct | Self-centered AoE uses caster position; targeted-point AoE uses a point within `range` in facing direction (per `projectile-and-hit-shape-spec.md` §3) | ☐ | |
| AoE radius respected | Only targets within the AoE's `radius` are affected | ☐ | |
| AoE marker cleans up | Any `aoe_marker.svg`-based visual is removed after its instant-hit moment — no persistent leftover marker | ☐ | |

---

## 6. VFX / Camera Checklist

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| World-space VFX on main camera only | Hit spark, slash arc, impact burst, projectile sprites, AoE markers are added to the main camera and `ignore()`-d by the UI camera | ☐ | |
| UI-space VFX on UI camera only | Any cooldown/denied/mana UI feedback (if touched) is added to the UI camera and `ignore()`-d by the main camera | ☐ | |
| No camera mixup | No world-space effect renders in screen-fixed position (or vice versa) — verify visually at multiple viewport sizes | ☐ | |
| VFX matches `combat-vfx-integration-plan.md` mapping | Assets used (e.g. `hit_spark.svg`, `projectile_arrow.svg`, `projectile_fireball.svg`, `impact_burst.svg`, `aoe_marker.svg`) match the planned object type / camera assignment | ☐ | |
| VFX is minimal, not overdesigned | Feedback is limited to "minimal VFX feedback" as scoped — no elaborate new animation systems | ☐ | |

---

## 7. Mobile Multi-touch Regression

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Joystick still works after PR #8 hotfix | Virtual joystick movement (left thumb) continues to work correctly with this PR's changes | ☐ | |
| Skill buttons still work after PR #8 hotfix | Skill buttons (right thumb), including Power Shot / Fireball / Attack, remain tappable and responsive | ☐ | |
| Simultaneous joystick + skill input works | Holding the joystick (movement) while tapping a skill button (Power Shot/Fireball/Attack) does not break either input — both continue to function (per PR #8's multi-touch fix) | ☐ | |
| Releasing one finger doesn't break the other | Releasing the skill-button finger while still holding the joystick keeps movement active; releasing the joystick finger stops movement cleanly without affecting skill buttons | ☐ | |
| No new input regressions introduced | This PR does not modify `InputSystem.ts` / `VirtualJoystick.ts` / `SkillButtons.ts` in ways that regress the PR #8 fix (or if it does, the mobile test script in `phase-3b-b1-mobile-test-script.md` has been re-run and passes) | ☐ | |

---

## 8. Dummy / Combat Regression

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| Basic attack regression (TC-01) | Walking into melee range and attacking the dummy still applies damage correctly with the armor formula | ☐ | |
| Dummy HP bar updates correctly | HP bar reflects damage from basic attacks, melee skills, and new projectile skills | ☐ | |
| Dummy death/reset regression (TC-10) | Repeatedly killing the dummy still triggers its defeated state and reset/respawn per Phase 3B-A behavior, unaffected by new projectile/AoE code | ☐ | |
| Mana/cooldown regression (TC-09) | Casting Power Shot/Fireball correctly deducts mana and starts cooldown; recast blocked until cooldown elapses; insufficient mana blocks cast | ☐ | |
| Range check (TC-07) | Power Shot (range 450) and Fireball (range 420) projectiles behave correctly when target is outside vs inside range | ☐ | |

---

## 9. Leak / Cleanup Checklist

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| No orphan projectiles | After a projectile hits or exceeds max range, it is fully destroyed (not just hidden) | ☐ | |
| No orphan AoE markers | AoE placeholder markers are destroyed after their instant-hit moment | ☐ | |
| No tween leaks | All VFX tweens (hit spark, impact burst, projectile trail effects) have `onComplete` cleanup that destroys the associated object | ☐ | |
| Menu ↔ Match × 3 cycles clean (TC-14) | After 3 full Menu→Match→Menu cycles (each casting Power Shot and Fireball at least once), no leftover projectiles/AoE markers/VFX persist into the next match; dummy resets to full HP each cycle | ☐ | |
| No console errors across cycles (TC-15) | Browser devtools console shows no new errors/warnings related to projectile spawn/destroy, AoE, or VFX across the above cycles | ☐ | |

---

## 10. Merge Decision

### Merge OK if ALL of the following are true:
- [ ] Projectile hit/miss works correctly (Section 3)
- [ ] Projectile does not apply damage more than once per cast (Section 3)
- [ ] Projectile is destroyed on hit or when exceeding max range — no orphans (Section 3, 9)
- [ ] Menu ↔ Match × 3 cycles show no projectile/AoE/tween leaks (Section 9)
- [ ] Mobile joystick + skill button input continues to work simultaneously (Section 7)
- [ ] World/UI camera assignment is correct, no mixup (Section 6)
- [ ] Scope Gate and Files Allowed/Forbidden sections are fully Pass (Sections 1, 2)
- [ ] Dummy/combat regression tests pass (Section 8)

### Merge NOT OK (blocker) if ANY of the following are true:
- [ ] PR touches bot, objective, shop, economy, multiplayer, or player-death/respawn systems (out of scope)
- [ ] Mobile joystick + skill button simultaneous use is broken (regresses PR #8)
- [ ] World-space VFX/projectiles render on the UI camera, or UI elements render on the main camera (camera mixup)
- [ ] Projectile leaks (orphan objects) or tween leaks are observed across Menu ↔ Match cycles
- [ ] Projectile applies damage more than once per cast
- [ ] `public/assets/**`, `public/icons/**`, `README.md`, `package.json`, or `public/manifest.webmanifest` are modified without prior agreement

### Final verdict

| Field | Value |
|---|---|
| PR number reviewed | |
| Reviewer | |
| Date | |
| Verdict (Merge / Merge with follow-ups / Blocked) | |
| Blocking items (if any) | |
