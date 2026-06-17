# Release Checklist

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-17

---

## Phase 4D — Combat Feel MVP / Player Combat Polish (CLOSED)

**Runtime base:** `a9f5645d09dcdfee5685f7a563583f1f0f70e048`  
**Live URL:** https://clan-siege-arena.onrender.com  
**Live bundle:** `index-BRB6GZcv.js`  
**Closure date:** 2026-06-17

### Planning gates

- [x] PR #43 UX/mobile spec merged @ `080d5d2`
- [x] PR #44 design spec merged @ `856aed4`
- [x] PR #45 FX micro-pack merged @ `c85a7e7`
- [x] PR #46 UI/UX addendum merged @ `5ce5b29`

### Runtime gates

- [x] PR #47 runtime merged @ `a9f5645`
- [x] Agent F retest PASS (17/17 + mobile)
- [x] Agent E final gate PASS
- [x] Ready/Merge executed

### Post-merge live verification

- [x] HTTP 200 on live URL
- [x] Live deploy fresh after PR #47 merge
- [x] 4D bundle markers present on live
- [x] 4D VFX assets load (no 404)
- [x] `phase-4d-combat-feel-regression.mjs` — 17/17 PASS on live
- [x] Prior phase suites — 75/75 PASS on live
- [x] Total live assertions: 92/92 PASS
- [x] Live mobile 915×412 PASS
- [x] Live mobile 800×360 PASS
- [x] Scope guard PASS
- [x] Zero fatal console errors
- [x] Negative trigger PASS
- [x] Prior systems preservation PASS

### Closure

- [x] Phase 4D closure report prepared
- [x] Project status updated
- [ ] Phase 4D closure docs PR merged (pending)

---

## Phase 4C-C — Match Timer and Objective Score Win (CLOSED)

**Runtime base:** `4e928fb536bc2790cd834248723ad43ab4545189`  
**Live URL:** https://clan-siege-arena.onrender.com  
**Live bundle:** `index-MXeXdYxs.js`  
**Closure date:** 2026-06-17

### Planning gates

- [x] PR #38 design spec merged @ `0364faa`
- [x] PR #39 UX/mobile copy merged @ `e0ada76`
- [x] PR #40 asset micro-pack merged @ `ee2a2dd`

### Runtime gates

- [x] PR #41 runtime merged @ `4e928fb`
- [x] Agent F retest PASS (18/18 + 20/20 probe)
- [x] Agent E final gate PASS
- [x] Ready/Merge executed

### Post-merge live verification

- [x] HTTP 200 on live URL
- [x] Live bundle fresh after PR #41 merge
- [x] Match timer + Objective Score system present on live
- [x] `ui_match_timer`, `ui_objective_score`, `ui_time_up` load
- [x] `phase-4c-c-timer-score-regression.mjs` — 18/18 PASS on live
- [x] Prior phase suites — 57/57 PASS on live
- [x] Extended live probe — 15/15 PASS
- [x] Total live assertions: 90/90 PASS
- [x] Live mobile 915×412 PASS
- [x] Live mobile 800×360 PASS
- [x] Scope guard PASS
- [x] Zero fatal console errors
- [x] Menu ↔ Match restart stable

### Closure

- [x] Phase 4C-C closure report prepared
- [x] Project status updated
- [ ] Phase 4C-C closure docs PR merged (pending)
- [ ] Phase 4D planning authorized (pending Product/GPT after closure merge)

---

## Phase 4C-B — Siege Ruins Gate Damage Bonus (CLOSED)

**Runtime base:** `9eaca6db01998d232c4601efe809c303d14b9f04`  
**Closure date:** 2026-06-17

All gates checked — see git history @ closure PR #37.

---

## Phase 4C-A — Objective Capture Foundation (CLOSED)

**Runtime base:** `8b6882b10c5d4c11070a7232330fb661cdd9d132`  
**Closure date:** 2026-06-16

All gates checked — see git history @ closure PR #32.

---

## Phase 4D — Combat Feel MVP / Player Combat Polish (CLOSED)

All gates checked — see [phase-4d-close-report.md](./phase-4d-close-report.md) and closure PR.

---

## Phase 4E — NOT STARTED

Do not check implementation items until work order issued.

---

## Phase 5A — NOT STARTED

Do not check implementation items until work order issued.
