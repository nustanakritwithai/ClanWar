# Phase 4B Design Risk Register

> **Agent C** — design and player-comprehension risks for Gate/Core objective
> runtime. Complements engineering registers (`phase-3b-b-risk-register.md`, etc.).

---

## Active risks (Phase 4B)

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| 4B-01 | **Core hittable before gate falls** | M | **Critical** | `protected` state blocks all damage; test B-D2 | Agent A |
| 4B-02 | **Player doesn't know gate fell → attack core** | H | High | `ui_gate_breached` + `ui_core_vulnerable` + overlay | A + D |
| 4B-03 | **Objective HP too high — boring** | M | Med | MVP 1500/2000; tune in 4B.1 if playtest >12 min | Product |
| 4B-04 | **Objective HP too low — ends in <2 min** | M | Med | Same; Gate Breaker burst monitored | Product |
| 4B-05 | **AoE (Meteor) melts gate instantly** | M | High | Gate armor 10; gate bonus only on gates; cap if needed in 4B.1 | Agent A |
| 4B-06 | **Skill scope creep** | M | High | Damage table in `objective-damage-and-win-condition.md` | Agent C |
| 4B-07 | **Runtime adds watchtower/camp** | M | **Critical** | B-O4 scope check; no markers beyond four IDs | Agent A |
| 4B-08 | **UI shows wrong priority** | M | High | Single `playerPriority` enum; test S-1 | Agent A |
| 4B-09 | **HUD icon covers joystick** | L | High | UI camera + Agent D `mobile-hud-ux-spec` | A + D |
| 4B-10 | **Match state stuck after victory** | L | High | Disable input; one Result transition | Agent A |
| 4B-11 | **Menu ↔ Match objective leak** | M | High | B-M6; destroy on shutdown | Agent A |
| 4B-12 | **Feedback overlay leak** | M | Med | Destroy overlays with objectives | Agent A |
| 4B-13 | **Debug labels + sprites = clutter** | M | Med | Remove four text labels; debug overlay only | Agent A |
| 4B-14 | **Friendly fire on Blue Core** | L | Med | Team check on all damage paths | Agent A |
| 4B-15 | **Using unmerged B2 guidance assets** | L | Med | Block load until branch merged | Agent A |
| 4B-16 | **Player attacks core through gate visually** | M | Med | Protected rule + no damage numbers | Agent A |
| 4B-17 | **Gate Breaker still shows "(no gate dmg)"** | H | Low | Remove skip flag when objectives live | Agent A |
| 4B-18 | **Result scene doesn't explain win** | M | Med | Agent D copy in Result; MVP: "Victory" text OK | Agent D |

---

## Watch items (not blockers)

| ID | Risk | Notes |
|---|---|---|
| 4B-W1 | High ground band wider than main | Terrain only — no elevation damage bonus |
| 4B-W2 | Dummy + gate both in melee arc | Intended — player can practice on dummy |
| 4B-W3 | No enemy pressure on Blue Core | Defeat path exists via debug only until bot |
| 4B-W4 | `objective_warning.svg` vs PR #18 overlap | Prefer PR #18 overlays |

---

## Deferred risks (post-4B)

| ID | Risk | When |
|---|---|---|
| 4B-D1 | Bot focuses core ignoring gate | Bot AI phase |
| 4B-D2 | Capture UI confuses siege loop | Watchtower phase |
| 4B-D3 | Economy rewards distract from core | Economy phase |
| 4B-D4 | Multiplayer desync on objective HP | Multiplayer phase |
| 4B-D5 | Tiebreaker rules | `rules.ts` enforcement phase |

---

## Escalation triggers

Escalate to Product Director when:

1. **4B-01** or **4B-07** confirmed in playtest — block merge.
2. Solo playtest to win takes **>15 min** or **<90 s** consistently.
3. Agent A requests new objective types in 4B PR.
4. Agent A requests `skills.ts` / `heroes.ts` balance changes — defer to 4B.1.

---

## Review cadence

| Event | Reviewer | Doc |
|---|---|---|
| Spec approval | Product | This register + master spec |
| Runtime PR Ready | Agent C | `objective-runtime-acceptance-gate.md` |
| Post-merge playtest | Agent C + D | `player-experience-checklist.md` (extend) |

---

## Risk status legend

- **L** = Likelihood (L/M/H)
- **I** = Impact
- Status: Open until 4B runtime PR passes acceptance gate
