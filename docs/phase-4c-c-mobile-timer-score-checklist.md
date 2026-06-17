# Phase 4C-C Mobile Timer and Objective Score Checklist

> **Agent D** — playtest checklist for Phase 4C-C Match Timer and Objective
> Score Win on mobile. Use after Agent A lands runtime PR.
>
> Viewports: **915×412** (primary), **800×360** (secondary).
> References: `docs/phase-4c-c-timer-score-ux-copy.md`,
> `docs/phase-4c-c-match-timer-score-win-spec.md`.

---

## Pre-flight

- [ ] Phase 4C-A capture working (6 objectives, score awards)
- [ ] Phase 4C-B Siege Buff working
- [ ] Gate/Core loop working (4B-B baseline)
- [ ] **Debug overlay OFF** for primary pass
- [ ] Test 915×412 first, then 800×360
- [ ] No prior explanation given to tester

---

## 1. Viewport 915×412

### Controls

| # | Check | Pass |
|---|---|---|
| 1.1 | Joystick visible and usable | ☐ |
| 1.2 | Attack button tappable | ☐ |
| 1.3 | Skill buttons tappable | ☐ |
| 1.4 | Ultimate tappable | ☐ |
| 1.5 | Timer/score chips do not overlap control zones | ☐ |

### Timer HUD

| # | Check | Pass |
|---|---|---|
| 1.6 | **Time Left** or MM:SS visible at match start | ☐ |
| 1.7 | Timer counts down (e.g. 5:00 → 4:59) | ☐ |
| 1.8 | Timer readable as MM:SS, ≥14 px effective | ☐ |
| 1.9 | Timer does not block Gate/Core top-center prompt | ☐ |

### Objective Score HUD

| # | Check | Pass |
|---|---|---|
| 1.10 | Score visible (e.g. `0 — 0` at start) | ☐ |
| 1.11 | Blue and Red scores distinguishable | ☐ |
| 1.12 | Does not look like gold/currency (no coin icon) | ☐ |
| 1.13 | Updates on capture (+5, +8, etc.) | ☐ |
| 1.14 | No large permanent scoreboard | ☐ |

### Gate/Core + Capture + Siege (regression)

| # | Check | Pass |
|---|---|---|
| 1.15 | **Attack the Gate** visible when appropriate | ☐ |
| 1.16 | Gate/Core prompt not replaced by timer/score | ☐ |
| 1.17 | Capture HUD readable near objectives | ☐ |
| 1.18 | **Siege Buff** badge readable; not hidden by timer/score | ☐ |

### Final Minute + Time Up

| # | Check | Pass |
|---|---|---|
| 1.19 | At 1:00 — **Final Minute** once OR intentional skip documented | ☐ |
| 1.20 | No Final Minute spam | ☐ |
| 1.21 | At 0:00 — **Time Up** appears (non-core end paths) | ☐ |
| 1.22 | **Time Up** does not say Core destroyed | ☐ |

### Clutter

| # | Check | Pass |
|---|---|---|
| 1.23 | No modal during active play | ☐ |
| 1.24 | No full-width banner | ☐ |
| 1.25 | +N Objective Score toast does not override Gate/Core prompt | ☐ |

---

## 2. Viewport 800×360

| # | Check | Pass |
|---|---|---|
| 2.1 | Joystick visible and usable | ☐ |
| 2.2 | Action buttons visible and tappable | ☐ |
| 2.3 | Timer readable (compact `M:SS` or combined chip) | ☐ |
| 2.4 | Score readable (`12–8` or `4:32 · 12–8` combined) | ☐ |
| 2.5 | Gate/Core HUD readable | ☐ |
| 2.6 | Capture HUD readable | ☐ |
| 2.7 | Siege Buff badge not overlapped | ☐ |
| 2.8 | No modal during active play | ☐ |
| 2.9 | No full-width scoreboard | ☐ |
| 2.10 | Long labels hidden or abbreviated OK | ☐ |

---

## 3. Result Paths

Test each path (debug hook or playtest script acceptable).

### Core win (highest priority)

| # | Check | Pass |
|---|---|---|
| 3.1 | Destroy enemy Core before time-up | ☐ |
| 3.2 | **Victory** + **Core Destroyed** on ResultScene | ☐ |
| 3.3 | No score-win reason on core destroy path | ☐ |
| 3.4 | Core destroy overrides timer (even near 0:00) | ☐ |

### Score win

| # | Check | Pass |
|---|---|---|
| 3.5 | Let timer expire; Blue score higher | ☐ |
| 3.6 | **Victory** + **Victory by Objective Score** | ☐ |
| 3.7 | Final score shown (e.g. Blue 12 — Red 8) | ☐ |
| 3.8 | Red higher score → **Defeat by Objective Score** | ☐ |

### Core HP tiebreak

| # | Check | Pass |
|---|---|---|
| 3.9 | Time-up with tied score, Blue Core HP higher | ☐ |
| 3.10 | **Victory by Core HP Tiebreak** + score + HP detail | ☐ |
| 3.11 | Red Core HP higher → **Defeat by Core HP Tiebreak** | ☐ |

### Draw

| # | Check | Pass |
|---|---|---|
| 3.12 | Time-up with tied score AND tied Core HP | ☐ |
| 3.13 | **Draw** — not Victory or Defeat title | ☐ |
| 3.14 | Reason: **Objective Score and Core HP tied** | ☐ |

### No early score win

| # | Check | Pass |
|---|---|---|
| 3.15 | High score before timer ends does NOT end match | ☐ |
| 3.16 | Match continues until Core destroy or timer = 0 | ☐ |

### No Sudden Death

| # | Check | Pass |
|---|---|---|
| 3.17 | Draw ends match — no overtime / Sudden Death prompt | ☐ |

---

## 4. Copy Hygiene

| # | Check | Pass |
|---|---|---|
| 4.1 | No snake_case anywhere in HUD or ResultScene | ☐ |
| 4.2 | No `score_win_debug`, `timer_win_state`, `sudden_death` | ☐ |
| 4.3 | No gold, EXP, currency, ranking, economy wording | ☐ |
| 4.4 | No internal keys visible (`objective_score_state`, etc.) | ☐ |
| 4.5 | ResultScene human-readable on 800×360 | ☐ |

---

## 5. Pass / Caution / Blocker

### BLOCKER

- Controls blocked by timer/score HUD
- Gate/Core prompt hidden by timer/score
- Score HUD looks like currency
- Score win before timer reaches 0
- Draw shown as Victory or Defeat
- Sudden Death / overtime UI
- snake_case visible
- 800×360 unplayable
- Modal blocks combat

### PASS WITH CAUTION

- 800×360 tight but combined chip `4:32 · 12–8` works
- Final Minute skipped on compact layout (timer amber only)
- Result detail lines truncated but reason clear

### PASS

- UX-AC1–AC14 from `phase-4c-c-timer-score-ux-copy.md` all pass
- No BLOCKER items

---

## 6. Quick Playtest (~15 min)

1. **915×412** — Note **Time Left** `5:00` and score `0 — 0` at spawn.
2. Confirm **Attack the Gate** still top-center primary.
3. Capture one objective — score updates; **+N Objective Score** toast once.
4. Verify Siege Buff badge still visible when active.
5. At **1:00** — note **Final Minute** or amber timer only.
6. **Path A:** Destroy Red Core — **Victory** / **Core Destroyed**.
7. **Path B (new match):** Let timer expire with score lead — **Victory by Objective Score** + final score.
8. **Path C (hook):** Tied score tiebreak — verify HP comparison on result.
9. **800×360** — repeat timer/score visibility + controls check.
10. Score per §5.

---

## 7. Sign-off

| Role | Verdict |
|---|---|
| Agent D (UX) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent F (QA) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent E (Gate) | ☐ Approved for runtime |
