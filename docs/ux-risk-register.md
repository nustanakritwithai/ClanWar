# UX Risk Register — Phase 4B-D

> **Agent D** — player-experience risks for objective onboarding and mobile guidance.
> Review before Phase 4B/4C merge. Complements `docs/design-risk-register.md` (Agent C).
>
> Status key: 🔴 High · 🟡 Medium · 🟢 Low

---

## 1. Risk Summary

| ID | Risk | Severity | Likelihood | Phase |
|---|---|---|---|---|
| UX-R01 | Player does not know where to go | 🔴 | High | 4B |
| UX-R02 | Player does not know gate matters | 🔴 | High | 4B |
| UX-R03 | Player does not know core = win | 🔴 | High | 4B |
| UX-R04 | UI alert blocks mobile controls | 🔴 | Medium | 4B |
| UX-R05 | Too many text messages | 🟡 | High | 4B |
| UX-R06 | Objective marker looks like skill VFX | 🟡 | Medium | 4B |
| UX-R07 | Path arrow implies pathfinding | 🟡 | Medium | 4B |
| UX-R08 | Gate breached moment unclear | 🔴 | Medium | 4C |
| UX-R09 | Core vs gate silhouette confusion | 🟡 | Medium | 4B |
| UX-R10 | Player attacks core through gate | 🟡 | Medium | 4C |
| UX-R11 | Three routes — player gets lost | 🟡 | Medium | 4A/4B |
| UX-R12 | Defend core taught without threat | 🟡 | Low | 4B |
| UX-R13 | Thai text clips on small screens | 🟢 | Medium | 4B |
| UX-R14 | Guidance never turns off — annoys veterans | 🟡 | Medium | 4B |
| UX-R15 | Damage success unclear on objectives | 🟡 | Medium | 4C |

---

## 2. Risk Detail & Mitigation

### UX-R01 — Player does not know where to go

| Field | Detail |
|---|---|
| **Symptom** | Player circles spawn or wanders flanks |
| **Cause** | 3 routes + no objective HUD |
| **Mitigation** | First-match `path_arrow_blue` on main only; prompt "Move forward"; `go_to_gate` at mid |
| **Owner** | Agent A implements; Agent D spec |
| **Verify** | Playtest A1 in `player-experience-checklist.md` |

### UX-R02 — Player does not know gate matters

| Field | Detail |
|---|---|
| **Symptom** | Player fights dummy, ignores gate |
| **Cause** | Gate is static art; no call-to-action |
| **Mitigation** | `attack_gate` marker + "Attack the Gate" at approach; gate damage numbers in 4C |
| **Verify** | Playtest T5 — player names gate as objective by 3 min |

### UX-R03 — Player does not know core = win

| Field | Detail |
|---|---|
| **Symptom** | Player destroys gate and stops |
| **Cause** | No post-gate teach |
| **Mitigation** | "Gate Breached" toast → immediate "Destroy the Core" + attack marker on core |
| **Verify** | Playtest E2 in `objective-explanation-flow.md` |

### UX-R04 — UI alert blocks mobile controls

| Field | Detail |
|---|---|
| **Symptom** | Cannot tap ATK or drag joystick |
| **Cause** | Full-width banner or misplaced touch target |
| **Mitigation** | Top-center prompts only; `disableInteractive` on text; keep bottom 160 px clear |
| **Verify** | H3–H4 in `mobile-hud-ux-spec.md`; PR #8 regression |

### UX-R05 — Too many text messages

| Field | Detail |
|---|---|
| **Symptom** | Screen feels like chat log; player ignores all |
| **Cause** | Stacked prompts from tutorial phases |
| **Mitigation** | Max 1 prompt; queue with priority; ≤6 unique strings in 3 min |
| **Verify** | T6 in `tutorial-first-3-minutes.md` |

### UX-R06 — Objective marker looks like skill VFX

| Field | Detail |
|---|---|
| **Symptom** | Player dodges attack_marker thinking it is enemy AoE |
| **Cause** | Shared red flash aesthetic |
| **Mitigation** | Agent B: distinct ground-ring marker; no particle burst; steady icon |
| **Verify** | G7 playtest — marker vs VFX glance test |

### UX-R07 — Path arrow implies pathfinding

| Field | Detail |
|---|---|
| **Symptom** | Player follows arrow into wall or wrong flank |
| **Cause** | Arrows on non-walkable or branch tiles |
| **Mitigation** | Arrows **only** on main spine x 1300–1700; fade at fork; never on flanks in MVP |
| **Verify** | G5 — arrows never on flank tiles |

### UX-R08 — Gate breached moment unclear

| Field | Detail |
|---|---|
| **Symptom** | Player does not notice gate destroyed |
| **Cause** | Subtle texture swap only |
| **Mitigation** | Toast "Gate Breached" + `objective_destroyed` + 0.5 s camera shake (optional) + way open toast |
| **Verify** | E4; player describes transition in playtest |

### UX-R09 — Core vs gate silhouette confusion

| Field | Detail |
|---|---|
| **Symptom** | Player attacks wrong structure |
| **Cause** | Similar size at mobile zoom |
| **Mitigation** | Gate on wall line; core deeper + taller sprite; first-sight callouts staggered |
| **Verify** | O6 icon readable without labels |

### UX-R10 — Player attacks core through gate

| Field | Detail |
|---|---|
| **Symptom** | Frustration — attacks seem to do nothing |
| **Cause** | Core invulnerable until gate down (4C) |
| **Mitigation** | Float text "Gate must fall first" + shield shimmer on core |
| **Verify** | E5 |

### UX-R11 — Three routes — player gets lost

| Field | Detail |
|---|---|
| **Symptom** | Player on shadow route at 2 min, far from gate |
| **Cause** | Flanks look inviting |
| **Mitigation** | 4A terrain contrast + main-only guidance; no flank arrows |
| **Verify** | B1–B3 player checklist; C3 no lost return |

### UX-R12 — Defend core taught without threat

| Field | Detail |
|---|---|
| **Symptom** | Player ignores defend message as noise |
| **Cause** | No bot pressure in MVP |
| **Mitigation** | Defend prompt only at spawn teach (22–30 s) + real alert only when damage on blue core |
| **Verify** | No defend alert spam in solo dummy match |

### UX-R13 — Thai text clips on small screens

| Field | Detail |
|---|---|
| **Symptom** | Thai strings cut off on 800×360 |
| **Cause** | Longer glyph width |
| **Mitigation** | Shorter TH copy in guide; ellipsis; test all keys at 14 px |
| **Verify** | C5 in copy guide |

### UX-R14 — Guidance never turns off

| Field | Detail |
|---|---|
| **Symptom** | Veteran players annoyed |
| **Cause** | `isFirstMatch` not persisted |
| **Mitigation** | `localStorage` flag; second match = alerts only, no arrows |
| **Verify** | OB7 |

### UX-R15 — Damage success unclear on objectives

| Field | Detail |
|---|---|
| **Symptom** | Player unsure if gate is taking damage |
| **Cause** | No HP bar or hit feedback |
| **Mitigation** | 4C: damage numbers + `objective_warning` flash; 4B: attack input toward gate triggers brief flash |
| **Verify** | Combat feedback playtest on gate target |

---

## 3. Pre-Merge Checklist (Agent D)

Before Phase 4B guidance PR merges:

- [ ] UX-R04 verified on 915×412 and 800×360
- [ ] UX-R05 — prompt count logged in playtest
- [ ] UX-R06 — Agent B markers distinct from VFX
- [ ] UX-R07 — arrow placement audited on map screenshot
- [ ] UX-R14 — first-match flag works

Before Phase 4C siege loop PR merges:

- [ ] UX-R08 gate breached moment
- [ ] UX-R10 core invulnerable feedback
- [ ] UX-R15 objective damage feedback

---

## 4. Escalation

| If risk materializes in playtest | Action |
|---|---|
| 🔴 block | Fix before merge — Product notified |
| 🟡 fail | Document workaround; fix in 4B.1 |
| 🟢 fail | Backlog |

---

## 5. Deferred Risks (out of MVP scope)

| Risk | Why deferred |
|---|---|
| Minimap confusion | No minimap |
| Economy UI overload | No economy |
| Multiplayer ping abuse | No multiplayer |
| Tutorial skip UX | No tutorial menu |
| Ranked pressure anxiety | No ranking |

---

## 6. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| R1 | All 🔴 risks have documented mitigation | ☐ |
| R2 | Pre-merge checklist completed for 4B guidance PR | ☐ |
| R3 | Playtest worksheet references risk IDs | ☐ |
| R4 | No new 🔴 risk introduced without Product review | ☐ |
