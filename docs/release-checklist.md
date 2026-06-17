# Release Checklist

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-17

---

## Phase 4C-B — Siege Ruins Gate Damage Bonus (CLOSED)

**Runtime base:** `9eaca6db01998d232c4601efe809c303d14b9f04`  
**Live URL:** https://clan-siege-arena.onrender.com  
**Live bundle:** `index-CcckW3-u.js`  
**Closure date:** 2026-06-17

### Planning gates

- [x] PR #33 design spec merged
- [x] PR #34 UX/mobile copy merged
- [x] PR #35 asset micro-pack merged

### Runtime gates

- [x] PR #36 runtime merged
- [x] Agent F retest PASS
- [x] Agent E final gate PASS
- [x] Ready/Merge executed

### Post-merge live verification

- [x] HTTP 200 on live URL
- [x] Live bundle fresh after PR #36 merge
- [x] Siege Buff system present on live
- [x] `ui_siege_buff_active` and `ui_gate_damage_bonus` load
- [x] `phase-4c-b-siege-buff-regression.mjs` — 18/18 PASS on live
- [x] `phase-4b-objective-regression.mjs` — 15/15 PASS on live
- [x] `phase-4b-b-clarity-regression.mjs` — 13/13 PASS on live
- [x] `phase-4c-a-capture-regression.mjs` — 11/11 PASS on live
- [x] Total live assertions: 57/57 PASS
- [x] Live mobile 915×412 PASS
- [x] Live mobile 800×360 PASS
- [x] Scope guard PASS
- [x] No 4C-C behavior present
- [x] Zero fatal console errors

### Closure

- [x] Phase 4C-B closure report prepared
- [x] Project status updated
- [ ] Phase 4C-B closure docs PR merged (pending)
- [ ] Phase 4C-C planning authorized (pending Product/GPT after closure merge)

---

## Phase 4C-A — Objective Capture Foundation (CLOSED)

**Runtime base:** `8b6882b10c5d4c11070a7232330fb661cdd9d132`  
**Closure date:** 2026-06-16

All gates checked — see git history @ closure PR #32.

---

## Phase 4C-C — Score/Timer Win Condition (NOT STARTED)

Do not check implementation items until work order issued.

- [ ] Work order issued by Product/GPT
- [ ] Design spec PR
- [ ] Runtime PR
- [ ] Agent F QA sign-off
- [ ] Agent E final gate
- [ ] Live verification
