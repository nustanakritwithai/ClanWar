# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-15  
> **Base:** `claude/game-file-analysis-a20xup` @ `23ee8cb`

## Summary

ตอนนี้มี open PR สี่ตัว (รวม Agent E) ทั้งหมดเป็น Draft ไม่มีตัวไหน Ready ทั้งสาม prep PR (#19–#21) mergeable (CLEAN) และ sync กับ base แล้ว ไม่ต้อง rebase

---

## PR #19 — Agent D (UX / Onboarding)

**Phase 4B-D: Objective onboarding and player guidance spec**  
https://github.com/nustanakritwithai/ClanWar/pull/19

Branch `cursor/phase-4b-d-objective-onboarding-guidance-spec` @ head `75e9ac8`  
Base `claude/game-file-analysis-a20xup` @ `23ee8cb`  
State: OPEN · Draft: true · Mergeable: MERGEABLE (CLEAN)

Scope guard: PASS — docs-only ไม่มี runtime/assets

Agent E แนะนำ: **HOLD — NEED REVIEW** — อย่า Ready/Merge จน GPT/User review UX spec

ไฟล์ที่เปลี่ยน:
- `docs/mobile-hud-ux-spec.md`
- `docs/objective-explanation-flow.md`
- `docs/player-guidance-system.md`
- `docs/player-onboarding-flow.md`
- `docs/tutorial-first-3-minutes.md`
- `docs/ux-copy-and-message-guide.md`
- `docs/ux-risk-register.md`

---

## PR #20 — Agent B (Assets)

**Phase 4B-B2: Player guidance marker asset pack**  
https://github.com/nustanakritwithai/ClanWar/pull/20

Branch `cursor/phase-4b-b2-player-guidance-marker-asset-pack` @ head `d194bd8`  
Base `claude/game-file-analysis-a20xup` @ `23ee8cb`  
State: OPEN · Draft: true · Mergeable: MERGEABLE (CLEAN)

Scope guard: PASS — asset/docs only ไม่มี `src/game/**`

Agent E แนะนำ: **HOLD — NEED REVIEW** — merge ได้หลัง Product approval (ไม่ depend บน #19)

หมายเหตุ: `public/assets/player-guidance/` **ยังไม่อยู่บน base** จนกว่า PR นี้จะ merge

---

## PR #21 — Agent C (Design / Spec)

**Phase 4B-C: Gate/Core objective runtime design spec**  
https://github.com/nustanakritwithai/ClanWar/pull/21

Branch `cursor/phase-4b-c-gate-core-objective-runtime-spec` @ head `b4d1b56`  
Base `claude/game-file-analysis-a20xup` @ `23ee8cb`  
State: OPEN · Draft: true · Mergeable: MERGEABLE (CLEAN)

Scope guard: PASS — docs-only ไม่มี runtime/assets

Agent E แนะนำ: **HOLD — NEED REVIEW** — **critical gate** สำหรับ Agent A 4B runtime

ไฟล์ที่เปลี่ยน:
- `docs/phase-4b-objective-runtime-spec.md`
- `docs/gate-core-loop-spec.md`
- `docs/objective-state-machine-spec.md`
- `docs/objective-damage-and-win-condition.md`
- `docs/objective-runtime-acceptance-gate.md`
- `docs/phase-4b-design-risk-register.md`

---

## PR #22 — Agent E (Audit)

**Agent E: Phase 4A closure and final gate dashboard**  
https://github.com/nustanakritwithai/ClanWar/pull/22

Branch `cursor/agent-e-phase-4a-closure-dashboard`  
State: OPEN · Draft · docs-only

---

## Recently merged (reference)

- **PR #16 (Agent A)** — Map visual runtime @ `23ee8cb`
- **PR #17 (Agent C)** — Phase 4A level design docs @ `266bc91`
- **PR #18 (Agent B)** — Objective feedback assets @ `9de58e5`

---

## Merge readiness

**#19** — synced, scope OK, review pending, ยัง Draft → Hold  
**#20** — synced, scope OK, review pending, ยัง Draft → Hold  
**#21** — synced, scope OK, review pending, ยัง Draft → Hold (critical สำหรับ runtime)

---

## Agent A 4B runtime — prerequisites

**พร้อมแล้ว:** Phase 4A merged (#16), design docs (#17), objective feedback assets (#18)

**ยังไม่พร้อม:** Gate/Core design spec (#21 — Draft), UX spec (#19 — Draft), player guidance assets (#20 — Draft), Product work order (ยังไม่ออก)

Agent A เริ่ม 4B runtime ได้เมื่อ **#21 merge + Product work order**  
แนะนำให้ **#19 และ #20 merge ด้วย** ก่อนเริ่ม
