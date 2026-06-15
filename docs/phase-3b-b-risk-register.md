# Phase 3B-B Risk Register — Skill Hit Shapes + Projectile Foundation

> Risks for Agent A's Phase 3B-B runtime implementation, identified during
> spec/QA planning. **Docs/spec only** — no mitigations are implemented
> here; this register tracks ownership and follow-up.

| # | Risk | Impact | Mitigation | Owner |
|---|---|---|---|---|
| 1 | Projectile leak — a projectile that never hits and never reaches max range keeps running indefinitely (e.g. spawned with zero/invalid velocity). | Memory growth, ghost objects, eventual performance degradation or crash during long sessions. | Always compute velocity from a valid direction at spawn; enforce a hard max-range/distance check every frame regardless of velocity; add a fallback max-lifetime timer as a safety net. | Agent A |
| 2 | Tween leak — VFX tweens (hit spark, impact burst, heal effects, AoE markers) that don't clean up their associated game object after completing. | Accumulating invisible/zero-alpha objects still consuming update cycles; mobile frame drops over a long match. | Ensure every tween's `onComplete` destroys the owning object; verify via TC-14 (3 Menu↔Match cycles) that object counts don't grow. | Agent A |
| 3 | UI camera / world camera mixup — a world-space effect (projectile, AoE marker, hit spark) accidentally rendered on the UI camera (or vice versa for cooldown/denied flashes), breaking the existing dual-camera `ignore()` pattern from Phase 2. | Effects appear in wrong position (screen-fixed vs world-fixed), or are visible to the wrong camera, causing visual bugs especially on mobile viewports. | Follow the camera assignment table in `combat-vfx-integration-plan.md`; add new world objects to the main camera's list and `ignore()` them on the UI camera, and vice versa for UI objects — consistent with the existing MatchScene pattern. | Agent A |
| 4 | Projectile hits the dummy multiple times from a single cast (e.g. hit test runs every frame while projectile overlaps the dummy before being destroyed). | Inflated/incorrect damage numbers, broken armor-formula expectations, confusing QA results (TC-04/TC-05). | Destroy the projectile (or mark it consumed) immediately on the first successful hit, before the next frame's hit test can run. | Agent A |
| 5 | Projectile clipping through the dummy at high speed (tunneling) — at `projectileSpeed: 650` (Power Shot) or `520` (Fireball), a large per-frame movement step could skip over the dummy's hitbox entirely on low frame rates. | Projectile silently misses a target it visually appears to pass through; inconsistent hit/miss results between devices with different frame rates (TC-08). | Use a swept/segment collision check (test the line segment from previous to current position against the dummy's hitbox) rather than a single point-in-radius check at the new position only. | Agent A |
| 6 | AoE placeholder becomes too expensive if implemented with per-frame ticking (e.g. Frost Zone/Holy Circle/Arrow Rain checking distance to all targets every frame for `duration` seconds). | CPU cost scales with number of active AoE zones × targets × frames; risk of frame drops on mobile during skill-heavy sequences. | For Phase 3B-B, implement AoE as a single instant hit-test on cast (per `projectile-and-hit-shape-spec.md` §3) rather than a per-frame ticking zone; defer true DoT/HoT ticking to Phase 3C with an explicit tick-rate budget (e.g. once per 0.5s, not per frame). | Agent A |
| 7 | Mobile clutter — multiple simultaneous VFX (hit spark + impact burst + damage number + AoE marker) on a small 412–915px-wide viewport could visually overwhelm the play area or overlap the joystick/skill buttons. | Reduced readability and usability on mobile (TC-11), potential to obscure controls. | Keep VFX centered on their world-space trigger points (per `combat-visual-kit.md` mobile readability rules); verify in TC-11 that effects don't render over the UI camera's joystick/button region; cap concurrent VFX instances per skill cast if needed. | Both |
| 8 | Skill effects visually hiding controls — a large AoE marker, projectile trail, or burst VFX rendered at a position that happens to coincide with the on-screen joystick or skill buttons (UI camera region) in certain layouts. | Player temporarily unable to see/use controls during combat, especially on 800×360 and 915×412 viewports. | World-space VFX should never be added to the UI camera's render list (see Risk 3); confirm during TC-11/TC-12 that no world VFX appears within the UI control safe-zone. | Agent A |
| 9 | Scope creep into bot/objective/shop systems — while implementing projectile/AoE targeting, it may be tempting to add placeholder bot units or objective hit-testing "for completeness." | Violates Phase 3B-B's strict scope (dummy-only targeting), expands review surface, risks conflicts with other in-progress tracks (bot AI, objectives, shop/economy). | Strictly follow the Targeting Rule in `projectile-and-hit-shape-spec.md` §5 (TrainingDummy only); any bot/objective/shop work must be a separate, explicitly-scoped task. | Both |
| 10 | Skill balance not final — damage/range/radius/cooldown/mana values in `skills.ts` are current placeholders and may be tuned later; hard-coding assumptions based on today's exact numbers could require rework. | Future balance passes could require re-touching projectile/hit-shape code if values are referenced too rigidly (e.g. magic numbers instead of reading from `SkillDefinition`). | Always read damage/range/radius/etc. from the `SkillDefinition` object at cast time rather than hardcoding; this spec and the visual mapping reference current values for illustration only — no balance changes are made by this docs task. | Agent A |

---

## Summary — Top 5 risks by priority

1. **#5 Projectile clipping (tunneling)** — directly affects hit/miss
   correctness for both projectile skills (TC-04/TC-05/TC-08); needs a
   swept collision check, not just a point check.
2. **#4 Multi-hit per cast** — directly affects damage correctness and is
   easy to get wrong with naive per-frame hit testing.
3. **#1 Projectile leak** — affects stability over multiple Menu↔Match
   cycles (TC-14) and long sessions.
4. **#6 AoE per-frame ticking cost** — affects mobile performance; easy to
   avoid by using the instant-hit placeholder approach in 3B-B.
5. **#3 UI/world camera mixup** — affects correctness of where effects
   render, building directly on the established Phase 2 dual-camera
   pattern; getting this wrong breaks mobile layouts (TC-11/TC-12).
