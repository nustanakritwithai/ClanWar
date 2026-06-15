# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-15 (refreshed after base sync)  
> **Latest base:** `claude/game-file-analysis-a20xup` @ `b03acc2`

## Summary

Open PRs เหลือ **2 ตัว:** #21 (Agent C design spec) และ #22 (Agent E dashboard)

PR #20 merged แล้ว @ `32d283d` — player-guidance assets บน base  
PR #19 merged แล้ว @ `b03acc2` — UX/onboarding docs บน base  
PR #21 base ยัง stale ที่ `32d283d` — ต้อง sync ก่อน Ready/Merge

---

## PR #21 — Agent C (Design / Spec) — OPEN

**Phase 4B-C: Gate/Core objective runtime design spec**  
https://github.com/nustanakritwithai/ClanWar/pull/21

Branch `cursor/phase-4b-c-gate-core-objective-runtime-spec` @ head `e6b5713`  
Base บน GitHub: `32d283d` (**stale** — ก่อน PR #19 merge)  
Latest base: `b03acc2`

State: OPEN · Draft: true · Mergeable: MERGEABLE (CLEAN) บน base ปัจจุบันของ PR

Scope guard: PASS — docs-only (6 ไฟล์ gate/core design spec)

Agent E แนะนำ: **HOLD — NEED SYNC** — sync base ไป `b03acc2`, update dependency refs ต่อ UX docs จาก PR #19 ก่อน Ready/Merge

ไฟล์:
- `docs/phase-4b-objective-runtime-spec.md`
- `docs/gate-core-loop-spec.md`
- `docs/objective-state-machine-spec.md`
- `docs/objective-damage-and-win-condition.md`
- `docs/objective-runtime-acceptance-gate.md`
- `docs/phase-4b-design-risk-register.md`

---

## PR #22 — Agent E (Audit) — OPEN

**Agent E: Phase 4A closure and final gate dashboard**  
https://github.com/nustanakritwithai/ClanWar/pull/22

Branch `cursor/agent-e-phase-4a-closure-dashboard`  
State: OPEN · Draft · docs-only

กำลัง sync board ล่าสุดหลัง PR #20 และ PR #19 merge — push ใหม่จะอัปเดต base ไป `b03acc2`

---

## Recently merged (reference)

**PR #19 (Agent D)** — Objective onboarding UX spec  
MERGED @ `b03acc206a6eaed2863da1e524a6d6ad796aaad3` (2026-06-15T18:58:22Z)

**PR #20 (Agent B)** — Player guidance marker asset pack  
MERGED @ `32d283d17fd96c14388e4a716cf47a1b372b4479` (2026-06-15T18:48:17Z)

**PR #16 (Agent A)** — Map visual runtime @ `23ee8cb`  
**PR #17 (Agent C)** — Phase 4A level design @ `266bc91`  
**PR #18 (Agent B)** — Objective feedback assets @ `9de58e5`

---

## Merge readiness

**#21** — scope OK · review pending · base stale → **Hold until sync**  
**#22** — docs-only dashboard → merge หลัง push sync

---

## Agent A 4B runtime — prerequisites

**พร้อมแล้ว:** #16 (4A runtime), #17 (4A design), #18 (feedback assets), #19 (UX spec), #20 (guidance assets)

**ยังไม่พร้อม:** #21 (gate/core design spec — Draft, base stale), Product work order

Agent A เริ่ม 4B runtime ได้เมื่อ **#21 merged บน latest base + Product work order**
