# Phase 4C-C: Match Timer and Objective Score Win — Design Spec

> **Agent C** — formal planning spec for the timed match loop and secondary win
> condition. **Planning only** — no runtime, assets, or scripts in this phase.
>
> **Base:** Phase 4C-B closed (`5315304`) — Siege Ruins gate bonus merged and
> live verified.
> **Predecessor:** `docs/phase-4c-a-objective-capture-acceptance.md`,
> `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md`
>
> **Implementation status:** Phase 4C-C planning is authorized. Runtime
> implementation is **not** authorized until this spec and dependent planning
> PRs (Agent D UX, optional Agent B assets) are merged or explicitly approved.

---

## 1. Phase Goal

Phase 4C-C makes the match a **complete timed round** with two win paths:

1. **Primary (unchanged):** Destroy the enemy Core → immediate victory/defeat.
2. **Secondary (new):** Timer reaches zero with no Core destroyed → compare
   **Objective Score**; higher score wins. Ties break on Core HP, then Draw.

Objective Score gains purpose without replacing the Gate/Core siege loop. Score
does **not** trigger victory before time-up. No Sudden Death in MVP.

**Judgment question for sign-off:** *"Does a solo player understand when the
match ends, why they won or lost, and that capturing objectives matters even
when the Core is not destroyed?"*

---

## 2. Player-Facing Purpose

### Why 4C-C is needed

After 4C-A (capture + score feedback) and 4C-B (Siege Ruins gate bonus), matches
can still run indefinitely if the player never destroys a Core. Objective Score
exists but does not decide outcomes. Mobile sessions need a predictable end.

4C-C delivers:

- A clear **match duration** so rounds feel complete, not endless sandbox.
- **Meaningful Objective Score** — capture camps, tower, ruins, and forward camps
  to win when time runs out.
- A reason to fight mid-map **beyond** immediate Siege Buff — every capture adds
  score toward a time-up victory.
- Match end **even when Core is intact** — time-up resolution is valid and readable.

### What stays frozen

- Gate/Core HP, armor, positions, protected-core rules, win-on-core-destroy logic.
- Capture score values and award rules from 4C-A.
- Siege Ruins gate bonus rules from 4C-B.
- No economy, EXP, Gold, shop, bot AI, minimap, or map-awareness UI.

---

## 3. System Rule — Win Resolution

### 3.1 Primary win — Core destroyed (highest priority)

```text
if redCore destroyed  → Blue VICTORY  (reason: core victory)
if blueCore destroyed → Blue DEFEAT   (reason: core victory)
```

- Stops the match **immediately**.
- Stops the timer.
- **Overrides** Objective Score and timer — even if timer had 1 second left.
- Result type: **Core Victory** (win or lose).

### 3.2 Secondary win — Time up

When `matchTimer <= 0` and **no** Core has been destroyed:

```text
blueScore = CaptureSystem.getTeamScore('blue')
redScore  = CaptureSystem.getTeamScore('red')

if blueScore > redScore  → Blue VICTORY  (Score Victory)
if redScore > blueScore  → Blue DEFEAT   (Score Victory)
if blueScore == redScore → apply Core HP tiebreak (Section 3.3)
```

- Result type: **Score Victory** (win or lose).
- Objective Score **must not** end the match before `matchTimer <= 0`.

### 3.3 Tiebreak — Core HP (when scores tied at time-up)

When `blueScore == redScore` at time-up:

```text
blueCoreHp = blueCore.currentHp
redCoreHp  = redCore.currentHp

if blueCoreHp > redCoreHp  → Blue VICTORY  (Core HP Tiebreak Victory)
if redCoreHp > blueCoreHp  → Blue DEFEAT   (Core HP Tiebreak Victory)
if blueCoreHp == redCoreHp → DRAW
```

- Compare **remaining HP** of each team's Core (not max HP).
- Result types: **Core HP Tiebreak Victory** or **Draw**.

### 3.4 No Sudden Death (MVP)

If time-up produces a Draw, the match ends in **Draw**. Do not extend the timer,
spawn overtime, or enable Sudden Death in Phase 4C-C.

### 3.5 Match end invariant

Only **one** result transition per match. After `matchPhase` leaves `in_progress`,
timer stops and no further damage or capture scoring changes the outcome.

---

## 4. Timer Rule

### Config

```text
MATCH_DURATION_SEC = 300   // 5 minutes MVP
```

- Value must be **config-driven** (e.g. `src/game/data/match-timer.ts`) — not
  hardcoded inside UI or scattered magic numbers.
- Playtest may adjust via config only; do not change gate/core stats to compensate.

### Behavior

- Timer **starts** when Match scene begins (match start).
- Timer **counts down** each frame while `matchPhase === 'in_progress'`.
- Timer **stops** when match ends (core destroy or time-up resolution).
- Timer **does not pause** in MVP (no menu pause, no modal pause).
- At **60 seconds remaining**, optional short warning: **Final Minute** (toast or
  chip — Agent D defines placement; not a modal).

### Time-up sequence

1. Timer reaches `0`.
2. If core already destroyed → core result already fired; skip score resolution.
3. Else evaluate score → tiebreak → draw per Section 3.
4. Transition to `ResultScene` with appropriate outcome and reason.
5. Optional brief **Time Up** feedback (≤2s) before or concurrent with result —
   must not block input longer than existing match-end delay.

---

## 5. Objective Score Rule

### Score sources (unchanged from 4C-A)

| Objective | Score on completed capture |
|---|---|
| Resource Camp (L or R) | +5 |
| Watchtower | +5 |
| Siege Ruins | +8 |
| Forward Camp (L or R) | +6 |

### Rules (unchanged)

- Score awarded **once per completed capture** to the capturing team.
- Re-capture awards score again to the new owner (one award per capture event).
- Score does **not** tick over time while holding an objective.
- Score does **not** deal damage to Gate or Core.
- Score does **not** modify Gate/Core stats.
- Score is **not** economy, EXP, Gold, shop currency, ranking, or reward currency.

### Role in 4C-C

- Score is **feedback during play** (+N Objective Score toast remains).
- Score **resolves the match only** when timer reaches 0 and no Core is destroyed.
- Score **never** triggers instant win before time-up.

### Maximum theoretical score (one full map domination)

`5 + 5 + 8 + 6 + 6 + 5 = 35` per team — for playtest balance reference only;
do not change values in 4C-C.

---

## 6. Result Types and Player-Facing Copy

### Result types (internal → player)

| Result type | Blue player outcome | Headline | Reason line (canonical EN) |
|---|---|---|---|
| Core Victory | Victory | **Victory** | **Core Destroyed** |
| Core Victory | Defeat | **Defeat** | **Core Destroyed** |
| Score Victory | Victory | **Victory** | **Victory by Objective Score** |
| Score Victory | Defeat | **Defeat** | **Defeat by Objective Score** |
| Core HP Tiebreak Victory | Victory | **Victory** | **Victory by Core HP Tiebreak** |
| Core HP Tiebreak Victory | Defeat | **Defeat** | **Defeat by Core HP Tiebreak** |
| Draw | — | **Draw** | *(optional subline: Time Up — or reason omitted)* |

### Additional in-match copy

| Event | Copy |
|---|---|
| Timer label | **Time Left** or **Match Time** |
| Time-up transition | **Time Up** |
| Final 60s warning | **Final Minute** |
| Score label | **Objective Score** |

### Forbidden in player UI

- `score_win_debug`, `timer_win_state`, `sudden_death`
- `ranking points`, `gold`, `EXP`, `currency`
- snake_case keys (`enemy_core_destroyed` visible to player — map via copy table)
- Showing numeric timer config or `+30%`-style bonus on score HUD

Thai copy: optional future pass — not required for 4C-C sign-off.

---

## 7. HUD and Player Clarity

### What the player must see during play

- Small **persistent timer** (countdown).
- Compact **Objective Score** for both teams (e.g. `12 — 8` or Blue / Red chips).
- Existing Gate/Core prompts (**Attack the Gate**, **Destroy the Core**, etc.).
- Capture HUD when near objectives (4C-A behavior).
- Siege Buff badge when active (4C-B behavior).

### HUD rules

- **No large permanent scoreboard** or full-width banner.
- **No modal** during active play.
- **No minimap**, route arrows, lane tracker, or edge indicators.
- Timer and score are **secondary** to Gate/Core objective prompts.
- Score gain toasts (+N Objective Score) remain **lowest priority** feedback.

### Priority hierarchy (highest first)

1. Victory / Defeat / Draw result (match end)
2. Core destroyed / Time Up resolution
3. Gate/Core objective prompt
4. Capture HUD (near objective)
5. Siege Buff prompt and badge
6. Objective Score gain feedback (+N toast)

### Agent B direction (assets)

- **Prefer text-first HUD** for MVP — existing HUD frames may suffice.
- **Do not require** new assets for 4C-C MVP sign-off.
- Future optional micro-pack (after Agent D UX spec):
  - `ui_match_timer.svg`
  - `ui_objective_score.svg`
  - `ui_time_up.svg`
- Asset PR waits for Agent D UX spec acceptance.

---

## 8. Mobile Requirements

### 915×412 (primary)

- Timer readable at a glance (mono digits, ≥14px effective).
- Objective Score readable without opening a panel.
- Gate/Core HUD, Capture HUD, and Siege Buff badge remain readable.
- Joystick (left) and attack/skill buttons (right) **unobstructed**.
- Timer + score occupy **top band** — separate row from objective prompt when possible.

### 800×360 (compact)

- Timer: compact text only (e.g. `4:32`).
- Score: compact number chip (e.g. `12|8`) — avoid long labels if crowded.
- **No full banner**, **no modal** during play.
- **No overlap** with controls or Siege Buff badge.
- If crowded: combine into single top chip `4:32 · 12-8` per Agent D compact spec.

Reference: `docs/mobile-hud-ux-spec.md`, `docs/phase-4c-a-mobile-capture-checklist.md`,
`docs/phase-4c-b-mobile-siege-buff-checklist.md`.

---

## 9. Acceptance Criteria

### AC1 — Core override
Core destroyed causes immediate victory/defeat and overrides score/timer.

### AC2 — Timer start
Timer starts at match start and counts down.

### AC3 — Time-up score resolution
If timer reaches 0 and no Core is destroyed, Objective Score decides the result.

### AC4 — Higher score wins
Higher Objective Score wins at time-up.

### AC5 — Core HP tiebreak
If Objective Score is tied, higher remaining Core HP wins.

### AC6 — Draw
If Objective Score and Core HP are both tied, result is Draw.

### AC7 — No early score win
Objective Score does not trigger victory before timer reaches 0.

### AC8 — Capture scoring unchanged
Capture score awards remain unchanged from 4C-A (values and once-per-capture rule).

### AC9 — Siege Buff unchanged
Siege Ruins gate bonus behavior remains unchanged from 4C-B.

### AC10 — Gate/Core loop unchanged
Gate/Core prompts, protected core, breach transition, and core destroy path unchanged.

### AC11 — Reset
Menu ↔ Match restart clears timer, scores, and result state.

### AC12 — Result clarity
Result screen clearly distinguishes Core Victory, Score Victory, Core HP Tiebreak,
and Draw.

### AC13 — No economy
No economy, EXP, Gold, shop, or ranking behavior added.

### AC14 — No bot AI
No bot AI added.

### AC15 — No map-awareness UI
No minimap, route arrows, lane tracker, or edge indicators added.

### AC16 — Mobile 915×412
Readable and playable at 915×412.

### AC17 — Mobile 800×360
Readable and playable at 800×360.

### AC18 — No snake_case
No snake_case or internal debug strings in player-facing UI.

---

## 10. Regression Expectations

Future Agent A runtime PR must add:

`scripts/phase-4c-c-timer-score-regression.mjs`

### Required cases

- **R1** Timer starts at match start.
- **R2** Timer counts down.
- **R3** Core destroyed before time-up → Core Victory (no score win).
- **R4** Time-up, Blue Objective Score higher → Blue Score Victory.
- **R5** Time-up, Red Objective Score higher → Red Score Victory (test hook).
- **R6** Time-up, tied score, Blue Core HP higher → Blue Core HP Tiebreak Victory.
- **R7** Time-up, tied score, Red Core HP higher → Red Core HP Tiebreak Victory.
- **R8** Time-up, tied score and tied Core HP → Draw.
- **R9** Objective Score does not trigger victory before timer reaches 0.
- **R10** Capture scoring still works (4C-A regression intact).
- **R11** Siege Buff still works (4C-B regression intact).
- **R12** Gate/Core HUD and loop still work (4B-B regression intact).
- **R13** Menu ↔ Match reset clears timer and result state.
- **R14** Mobile 915×412 playable (layout check).
- **R15** Mobile 800×360 playable (layout check).
- **R16** No economy/EXP/Gold/shop/ranking strings in player UI.
- **R17** No Phase 4D / 4E / 5A features introduced.

Existing suites (`phase-4c-a-capture-regression.mjs`,
`phase-4c-b-siege-buff-regression.mjs`, `phase-4b-b-clarity-regression.mjs`,
`phase-4b-objective-regression.mjs`) must continue to pass.

---

## 11. Scope Guard

### In scope

- Design spec (this document)
- Win rule, timer rule, score rule, tie rule
- UI priority and mobile constraints
- Acceptance criteria and regression expectations
- Handoff notes for Agent D, B, A, F, E

### Out of scope

- Runtime code, assets, scripts (in this PR)
- Implementation of any gameplay system
- Economy, shop, EXP/Gold
- Bot AI
- Forward Camp respawn
- Watchtower vision/fog
- Resource Camp reward ticks
- Minimap, route arrows, lane tracker, edge indicators
- Multiplayer, login, clan, ranking, payment
- Tutorial overhaul
- Sudden Death
- New objective types
- Gate/Core HP, armor, or position changes
- Changing capture score values

---

## 12. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Solo MVP — Red never captures; score win one-sided | Medium | Test hooks for Red score; playtest time-up paths |
| Core HP tiebreaker often equal in solo (both full) | Medium | Accept Draw on 0–0 score; document expected solo behavior |
| HUD crowding on 800×360 | High | Compact combined chip; Agent D layout spec |
| Player confuses score with gold/EXP | Medium | Distinct copy and color; no coin icon |
| Score win before time-up bug | High | AC7 + R9; single match-end gate |
| Scope creep Sudden Death / ranking | High | Scope guard + Agent E veto |
| Timer pauses incorrectly on match end | Medium | R2/R3; stop timer in same path as `endMatch` |

---

## 13. Handoff Notes

### Agent D (UX)

Prepare timer/score HUD copy, mobile layout (915×412 and 800×360), result wording
for all four result types, Final Minute warning, and priority rules vs Gate/Core,
capture, and Siege Buff. Text-first MVP; define compact 800×360 chip layout.

### Agent B (Assets)

**Do not** open asset PR until Agent D UX spec is accepted. Optional future
micro-pack: `ui_match_timer.svg`, `ui_objective_score.svg`, `ui_time_up.svg`.
Not required for MVP sign-off.

### Agent A (Runtime)

**Do not implement** until this spec + Agent D UX (and optional B assets if used)
are merged and Product/GPT explicitly authorize runtime.

When authorized:

- Add config `MATCH_DURATION_SEC = 300`
- Add `MatchTimerSystem` (or equivalent) — reads score from `CaptureSystem`,
  core HP from `ObjectiveSystem`, coordinates match end with existing `endMatch`
- Extend `ResultScene` reason copy map for score/tiebreak/draw
- Add `scripts/phase-4c-c-timer-score-regression.mjs`
- Do not modify capture score values or siege buff logic

### Agent F (QA)

Retest timer countdown, all result paths (core, score, tiebreak, draw), core
priority over score, no early score win, mobile layouts, Menu ↔ Match reset, and
full 4C-A / 4C-B / 4B regression suites.

### Agent E (Final Gate)

Gate 4C-C runtime only after 4C-B closure confirmed, planning docs merged, scope
guard confirmed, and Agent F playtest pass. Veto economy, bot, Sudden Death, or
gate/core stat changes.

---

## 14. Phase 4C-C Runtime Readiness Gate

Phase 4C-C **runtime** may open only after:

1. This spec PR merged (or explicitly approved)
2. Agent D timer/score UX spec merged
3. Product/GPT runtime work order issued
4. Agent E confirms scope guard

Optional: Agent B micro-pack merged before polish sign-off — not blocking MVP.

---

## 15. References

- `docs/phase-4c-a-objective-capture-acceptance.md` — score rules (frozen)
- `docs/phase-4c-a-scope-guard.md` — timer win deferred to 4C-C
- `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md` — siege buff (frozen)
- `docs/phase-4b-b-objective-clarity-acceptance.md` — gate/core clarity (frozen)
- `docs/objective-damage-and-win-condition.md` — core destroy win path
- `docs/gate-core-loop-spec.md` — loop stats (frozen)
- `src/game/systems/CaptureSystem.ts` — `getTeamScore()`
- `src/game/systems/ObjectiveSystem.ts` — core HP, `matchPhase`, `endMatch`
- `src/game/scenes/ResultScene.ts` — result copy extension point
