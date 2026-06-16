# Release Checklist

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-16

---

## Phase 4C-A — Objective Capture Foundation (CLOSED)

**Runtime base:** `8b6882b10c5d4c11070a7232330fb661cdd9d132`  
**Live URL:** https://clan-siege-arena.onrender.com  
**Closure date:** 2026-06-16

### Pre-merge gates

- [x] PR #28 design spec merged
- [x] PR #29 UX/mobile copy merged
- [x] PR #30 capture asset micro-pack merged
- [x] PR #31 runtime foundation merged
- [x] Agent F retest PASS
- [x] Agent E final gate PASS
- [x] Scope guard clean (no 4C-B creep)
- [x] All regression suites PASS

### Post-merge live verification

- [x] HTTP 200 on live URL
- [x] Deployed build fresh after merge
- [x] 16/16 live checklist PASS
- [x] Six capture objectives present
- [x] Capture HUD/progress/owner flip works
- [x] Score awards once, does not end match
- [x] Mobile 915×412 PASS
- [x] Mobile 800×360 PASS
- [x] Gate/Core loop intact
- [x] Zero gameplay-breaking console errors
- [x] No Phase 4C-B behavior detected

### Test suite record

- [x] `npm run build` — PASS
- [x] `mobile-multitouch-verify.mjs` — 14/14
- [x] `phase-3b-b2-regression.mjs` — 11/11
- [x] `phase-3b-b3-visual-regression.mjs` — 8/8
- [x] `phase-4a-map-visual-regression.mjs` — 7/7
- [x] `phase-4b-objective-regression.mjs` — 15/15
- [x] `phase-4b-b-clarity-regression.mjs` — 13/13 (not 13/15 — prior typo)
- [x] `phase-4c-a-capture-regression.mjs` — 11/11

### Closure

- [x] Phase 4C-A closure report complete
- [x] Project status updated
- [ ] Phase 4C-B planning authorized (pending Product/GPT)
- [ ] Phase 4C-B implementation started — **NOT STARTED**

---

## Phase 4C-B — Siege Ruins Gate Damage Bonus (NOT STARTED)

Planning ready only. Do not check implementation items until work order issued.

- [ ] Work order issued by Product/GPT
- [ ] Design spec PR
- [ ] Runtime PR
- [ ] Agent F QA sign-off
- [ ] Agent E final gate
- [ ] Live verification
