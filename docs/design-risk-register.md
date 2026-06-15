# Design Risk Register — Map & Objective Loop

> **Agent C** — design/level risks for Phase 4A–4C. Complements engineering
> risk registers (`phase-3b-b-risk-register.md`, etc.) from a **player
> comprehension** angle.

---

## Active risks (Phase 4A–4B)

| ID | Risk | Likelihood | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| DR-01 | Player cannot identify main route without text labels | High (pre-4A) | High | Agent A | Enforce width + tile contrast per `map-layout-spec` §3.2 | Open |
| DR-02 | High ground and shadow flanks feel identical | Med | High | Agent A | Left=high, right=shadow — never swap; use ramps vs sewer IO | Open |
| DR-03 | Visual clutter: debug circles + text + tiles + arrows | High | Med | Agent A | Fade labels in 4A; remove in 4B; cap arrows at 5 | Open |
| DR-04 | Cosmetic walls mislead about walkable gaps | Med | High | Agent A | Align art to collision rects; playtest gate approach | Open |
| DR-05 | Phase 4A PR scope creeps into objective gameplay | Med | High | Product | Reject combined PR; 4A = terrain only | Open |
| DR-06 | Midfield has no focal landmark before 4B icons | Med | Med | Agent A | Mandatory `road_crossing` at y≈2100 | Open |
| DR-07 | Forward camp placement teaches wrong route mapping | Low | High | Agent C | Lock L/R coordinates in `objective-placement-spec` | Mitigated |
| DR-08 | Sewer purple hue confused with Mage skills | Low | Low | Agent B | Keep sewer desaturated; escalate only if playtest fails | Watch |
| DR-09 | Player thinks game is 1-lane MOBA | Med | High | Agent C | 3-route junction visible before first gate | Open |
| DR-10 | 4B adds 11 objective icons at once — unreadable mid | Med | High | Agent C | MVP icons: gate, core, ruins only (§4B scope) | Open |

---

## Deferred / post-MVP risks

| ID | Risk | Notes |
|---|---|---|
| DR-20 | Capture ring without tutorial confuses | Defer until capture mechanic scoped |
| DR-21 | Resource camps imply farm meta too early | Hide icons until economy phase |
| DR-22 | Minimap without fog leaks strategy | No minimap until fog designed |
| DR-23 | Elevation modifier promised by art only | Document "visual only" in UI if needed |

---

## Escalation triggers

Escalate to Product Director when:

1. Two or more **blockers** (B1–B5 in `level-design-review.md`) fail on same build.
2. Agent A requests **coordinate changes** to markers — requires Agent C sign-off.
3. Agent B asked for **>3 new map assets** in one phase — scope review.
4. Playtester cannot reach mid in 3 minutes without instruction — layout failure.

---

## Review cadence

| Phase | Review doc | Gate |
|---|---|---|
| 4A merge | `level-design-review.md` L1–L9 + B1–B5 | Agent C + Product |
| 4B merge | `objective-placement-spec.md` O1–O6 | Agent C |
| 4C gameplay | `phase-4-gameplay-loop.md` (future) | Product |
