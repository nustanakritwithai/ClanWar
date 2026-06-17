# Phase 4C-C Timer and Objective Score UX Copy Spec

> **Agent D** — canonical player-facing copy and mobile behavior for Phase
> 4C-C Match Timer and Objective Score Win. **Docs only — not a runtime work order.**
>
> References: `docs/phase-4c-c-match-timer-score-win-spec.md` (Agent C PR #38),
> `docs/phase-4c-a-capture-ux-copy.md`, `docs/phase-4c-b-siege-buff-ux-copy.md`,
> `docs/phase-4b-b-ux-copy.md`, `docs/mobile-hud-ux-spec.md`.

---

## 1. UX Goal

A mobile player understands:

- The match has a **fixed duration** (5 minutes MVP) shown as time remaining
- **Objective Score** tracks capture progress — it is **not** gold, EXP, or currency
- **Destroying the enemy Core** still wins immediately (highest priority)
- If time runs out with no Core destroyed, **higher Objective Score wins**
- Tied score breaks on **remaining Core HP**; full tie = **Draw**
- There is **no Sudden Death** in MVP

Gate/Core siege loop remains the primary teaching path. Timer and score are
**persistent background information** that must never override objective prompts.

---

## 2. Design Rules (from Agent C)

### Win resolution

| Condition | Outcome |
|---|---|
| Enemy Core destroyed | Immediate **Victory** / **Defeat** (reason: **Core Destroyed**) |
| Timer = 0, no Core destroyed, Blue score higher | **Victory by Objective Score** |
| Timer = 0, no Core destroyed, Red score higher | **Defeat by Objective Score** |
| Timer = 0, scores tied, Blue Core HP higher | **Victory by Core HP Tiebreak** |
| Timer = 0, scores tied, Red Core HP higher | **Defeat by Core HP Tiebreak** |
| Timer = 0, scores and Core HP both tied | **Draw** |

### Timer

- `MATCH_DURATION_SEC = 300` (5:00 MVP, config-driven)
- Counts down from match start; stops on match end
- No pause in MVP; no Sudden Death

### Objective Score

- Awarded on completed captures only (4C-A values frozen)
- Does **not** trigger victory before timer reaches 0
- Is **not** economy, EXP, Gold, shop reward, or ranking point

---

## 3. Approved Player-Facing Copy (English)

### 3.1 Timer copy

| Use | Approved EN | Type |
|---|---|---|
| Persistent HUD label | **Time Left** | Chip label (915×412) |
| Compact HUD label | **Time** | Chip label (800×360 optional) |
| 60 s remaining warning | **Final Minute** | One-shot toast |
| Timer reaches 0 | **Time Up** | One-shot toast / brief overlay |

Display format: **MM:SS** (e.g. `4:32`, `0:59`, `0:00`). Mono digits preferred.

### 3.2 Score copy

| Use | Approved EN | Type |
|---|---|---|
| Persistent HUD label | **Objective Score** | Chip label (915×412) |
| Compact HUD label | **Score** or **Obj Score** | Chip label (800×360) |
| Team breakdown (if labeled) | **Blue Score** / **Red Score** | Sub-labels |
| Score gain on capture | **+N Objective Score** | One-shot toast (existing 4C-A) |

Display format (915×412): `12 — 8` or **Blue Score** `12` · **Red Score** `8`.
Display format (800×360): `12–8` or `12|8` — no coin/currency icon.

### 3.3 Result copy

| Result type | Title | Reason line |
|---|---|---|
| Core Victory (Blue) | **Victory** / **VICTORY** | **Core Destroyed** |
| Core Victory (Blue loses) | **Defeat** / **DEFEAT** | **Core Destroyed** |
| Score Victory (Blue) | **Victory** / **VICTORY** | **Victory by Objective Score** |
| Score Victory (Blue loses) | **Defeat** / **DEFEAT** | **Defeat by Objective Score** |
| Core HP Tiebreak (Blue) | **Victory** / **VICTORY** | **Victory by Core HP Tiebreak** |
| Core HP Tiebreak (Blue loses) | **Defeat** / **DEFEAT** | **Defeat by Core HP Tiebreak** |
| Draw | **Draw** / **DRAW** | **Objective Score and Core HP tied** |

**Short mobile reason options** (ResultScene subline only if space tight):

- **Score Win** (never as title — reason abbreviation only)
- **HP Tiebreak** (never as title — reason abbreviation only)

CTA unchanged: **← Back to Menu**

### 3.4 Internal keys (never displayed)

Map in code only — never render to player:

```
score_victory_blue          → Victory / Victory by Objective Score
score_victory_red           → Defeat / Defeat by Objective Score
core_hp_tiebreak_victory    → Victory / Victory by Core HP Tiebreak
core_hp_tiebreak_defeat     → Defeat / Defeat by Core HP Tiebreak
draw                        → Draw / Objective Score and Core HP tied
enemy_core_destroyed        → Victory / Core Destroyed
friendly_core_destroyed     → Defeat / Core Destroyed
score_win_debug
timer_win_state
match_timer_state
objective_score_state
```

### 3.5 Forbidden player-facing text

Do **not** use as default UI copy:

- `score_win_debug`, `timer_win_state`, `match_timer_state`, `objective_score_state`
- `sudden_death`, `overtime`, `extra time`
- `gold`, `EXP`, `currency`, `ranking point`, `reward point`, `economy`
- `damage_multiplier`, `modifier`, `stack`
- snake_case keys or internal state names
- Coin/purse/trophy icons on score HUD
- `You win!` without reason line
- Copy implying Core was destroyed when match ended by time-up

### 3.6 Copy rules

1. No snake_case in player-facing UI.
2. No internal keys or technical state names.
3. Timer/score labels ≤ 3 words; result reason ≤ 6 words where possible.
4. No modal during active play. No full-width persistent banner.
5. No Sudden Death prompt or overtime wording.
6. **Time Up** must not imply Core destruction.
7. Score HUD must not look like currency (no `$`, coin icon, gold color as primary).

### 3.7 Thai (future / optional — not required in 4C-C)

| EN | TH (suggested) |
|---|---|
| Time Left | เวลาที่เหลือ |
| Final Minute | นาทีสุดท้าย |
| Time Up | หมดเวลา |
| Objective Score | คะแนนวัตถุประสงค์ |
| Victory by Objective Score | ชนะด้วยคะแนนวัตถุประสงค์ |
| Defeat by Objective Score | แพ้ด้วยคะแนนวัตถุประสงค์ |
| Victory by Core HP Tiebreak | ชนะด้วยเลือดแกนหลัก |
| Defeat by Core HP Tiebreak | แพ้ด้วยเลือดแกนหลัก |
| Draw | เสมอ |
| Core Destroyed | ทำลายแกนหลักแล้ว |

---

## 4. Copy Priority Hierarchy

Timer and score are **persistent background** — they do not compete for
top-center objective prompt. Event toasts follow this order (highest first):

### Priority 1 — Match result

- **Victory** / **Defeat** / **Draw** (ResultScene or end-of-match overlay)

### Priority 2 — Match end transition

- **Core Destroyed** (HUD flash before result, if used)
- **Time Up** (one-shot when timer hits 0 — does not replace result title)

### Priority 3 — Gate/Core objective prompt (top-center)

- Attack the Gate
- Destroy Gate first
- Gate Breached
- Core is open
- Destroy the Core
- Defend your Core

### Priority 4 — Capture HUD (near objective)

- Capturing / Capturing Siege Ruins
- Contested
- Capture Paused
- Siege Ruins Captured / Resource Camp Captured / etc.

### Priority 5 — Siege Buff

- Siege Buff Active / Siege Buff Lost / Enemy Siege Buff Active
- Siege Buff badge (secondary slot)

### Priority 6 — Objective Score gain feedback

- +5 Objective Score / +8 Objective Score / etc. (capture complete only)

### Priority 7 — Final Minute warning

- **Final Minute** toast (lowest event priority; skip if HUD crowded)

**Critical rules:**

- Timer/score chips are **always visible** during play but **never** occupy
  top-center objective prompt slot.
- Gate/Core teaching prompt **always** wins top-center over timer toasts.
- **Final Minute** defers if Priority 3 prompt is active; queue ≤ 0.5 s or skip.

---

## 5. HUD Layout

### 5.1 Layer model

| Layer | Z-index band | Contents |
|---|---|---|
| World | 0–25 | Objectives, markers |
| Base HUD | 1000 | HP/MP, menu |
| Timer/Score chips | 1050 | Persistent MM:SS + score |
| Objective HUD | 1100–1200 | Gate/Core prompt, capture, toasts |
| Siege Buff badge | 1150 | Secondary top-right |
| Controls | 2000+ | Joystick, skill buttons (untouchable) |

### 5.2 Timer chip (persistent)

| Property | 915×412 | 800×360 |
|---|---|---|
| Label | **Time Left** (optional micro-label) | **Time** or icon only |
| Value | `MM:SS` mono, ≥14 px | `M:SS` or `MM:SS`, ≥12 px |
| Position | Top-left band, x=12–16, y=36–44 | x=10, y=32–38 |
| Size | ≤ 72×28 px chip | ≤ 56×22 px |
| Style | `#1a2230` pill, subtle border — match existing HUD chips | Same, may combine with score |

**Must not block:** Gate/Core top-center prompt, Capture HUD, Siege Buff badge,
joystick, action buttons.

### 5.3 Objective Score chip (persistent)

| Property | 915×412 | 800×360 |
|---|---|---|
| Label | **Objective Score** or team labels | **Score** or none |
| Value | `12 — 8` (Blue left, Red right) | `12–8` or `12|8` |
| Position | Adjacent to timer chip, same row | Combined chip `4:32 · 12–8` if crowded |
| Size | ≤ 96×28 px | ≤ 80×22 px |
| Color | Blue `#3b82f6` / Red `#ef4444` digits — **not** gold/yellow coin tones | Same |

**Must not look like currency:** No coin icon, no `$`, no "Gold" label, no shop styling.

### 5.4 Recommended 915×412 layout

```
    0px                                                          915px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ [HP][MP]  [Time Left 4:32] [Obj Score 12—8]         [≡ Menu]   │
  │                              ┌─────────────────┐   [Siege Buff]  │
36│                              │ Attack the Gate │                  │
  │                              └─────────────────┘                  │
  │                         (playfield)                               │
252│ [Joy]                                          [ULT][S3][S2][S1]│
  │                                                 [War]    [ATK]   │
412└──────────────────────────────────────────────────────────────────┘
```

- Timer + score: top-left row below HP/MP (y ≈ 36–44)
- Gate/Core prompt: top-center (y ≈ 8–16) — **primary instruction**
- Siege Buff badge: top-right below Menu (existing 4C-B slot)

### 5.5 Recommended 800×360 layout

```
  [HP·MP]  [4:32 · 12–8]                              [≡][Siege]
              ┌───────────────┐
              │ Attack the Gate│
              └───────────────┘
```

- If crowded: **combine** timer + score into one chip: `4:32 · 12–8`
- Hide long labels; numbers + mono timer sufficient
- No full-width scoreboard; no modal

### 5.6 Score gain toast (unchanged from 4C-A)

- **+N Objective Score** — bottom-third or near capture point
- Lowest priority; does not replace Gate/Core or Capture HUD
- Max 1.5–2 s duration

---

## 6. Result Screen Behavior

Result screen must explain **why** the match ended. Text clarity over new art.
No full-screen illustration. No ranking, rewards, or economy lines.

### 6.1 Core win

| Element | Copy |
|---|---|
| Title | **VICTORY** or **DEFEAT** |
| Reason | **Core Destroyed** |
| Detail | Optional: none required |
| CTA | **← Back to Menu** |

Distinct from score win — reason line never mentions Objective Score.

### 6.2 Score win (time-up)

| Element | Copy |
|---|---|
| Title | **VICTORY** or **DEFEAT** |
| Reason | **Victory by Objective Score** or **Defeat by Objective Score** |
| Detail | Final score: `Blue 12 — Red 8` (always show on score-result paths) |
| CTA | **← Back to Menu** |

### 6.3 Core HP tiebreak

| Element | Copy |
|---|---|
| Title | **VICTORY** or **DEFEAT** |
| Reason | **Victory by Core HP Tiebreak** or **Defeat by Core HP Tiebreak** |
| Detail | Final score: `12 — 12` · Core HP: `Blue 420 — Red 380` |
| CTA | **← Back to Menu** |

Player must see **both** tied score and HP comparison that decided the outcome.

### 6.4 Draw

| Element | Copy |
|---|---|
| Title | **DRAW** |
| Reason | **Objective Score and Core HP tied** |
| Detail | Final score + Core HP (e.g. `8 — 8` · Core HP `500 — 500`) |
| CTA | **← Back to Menu** |

**Never** show Draw as Victory or Defeat. Use neutral styling (not win-green / loss-red title).

### 6.5 ResultScene implementation notes (for Agent A)

- Extend existing `REASON_COPY` / `formatResultReason()` pattern from 4B-B
- Map all internal keys to approved strings — never render keys
- Title may be ALL CAPS; reason line sentence case
- No new result illustration assets required for MVP

---

## 7. Time-Up Transition

When timer reaches `0`:

1. **Freeze** match state — no further damage, capture scoring, or player control
2. Show **Time Up** once (top-center pill, 1.0–1.5 s) — **does not** say Core destroyed
3. Resolve winner per Agent C rules (score → Core HP tiebreak → Draw)
4. Transition to **ResultScene** per existing match-end pattern (same delay as core destroy path)
5. **No** player control continuation after result begins
6. **No** Sudden Death prompt, overtime, or timer extension

**Sequence timing (recommended):**

| Step | Event | Duration |
|---|---|---|
| 1 | Timer displays `0:00` | — |
| 2 | **Time Up** toast | 1.0–1.5 s |
| 3 | Result overlay / ResultScene | Existing match-end delay |
| 4 | Full result with reason + detail | Persistent until Menu |

If Core was destroyed in the same frame as timer hit 0, **Core Destroyed** wins —
skip score resolution and **Time Up** toast.

---

## 8. Final Minute Warning

At **60 seconds remaining** (`1:00` on HUD):

| Behavior | Rule |
|---|---|
| Toast | Optional one-shot **Final Minute** |
| Frequency | Once per match only |
| Duration | 1.5–2 s |
| Position | Top-center pill — **defers** if Gate/Core prompt active |
| Banner | **No** full-width persistent banner |

**If HUD crowded (800×360 or active capture/siege toasts):**

- Skip toast in MVP **or**
- Show chip highlight only (timer digits turn amber at ≤ 60 s) with no extra toast

**Do not spam** — no repeat at 0:30, 0:10, etc. in MVP.

---

## 9. UX Acceptance Criteria

| ID | Criterion | Pass |
|---|---|---|
| UX-AC1 | Player can always see time left during active match | ☐ |
| UX-AC2 | Objective Score readable; not confused with gold/EXP/currency | ☐ |
| UX-AC3 | Core destroyed result distinct from score result (copy + reason) | ☐ |
| UX-AC4 | Time-up result clearly explained (**Time Up** + result reason) | ☐ |
| UX-AC5 | Score Victory / Defeat shows final score on ResultScene | ☐ |
| UX-AC6 | Core HP Tiebreak shows score tie + HP comparison | ☐ |
| UX-AC7 | Draw shown as **Draw** — not Victory/Defeat | ☐ |
| UX-AC8 | Timer/score HUD does not override Gate/Core top-center prompt | ☐ |
| UX-AC9 | Timer/score HUD does not hide Capture HUD | ☐ |
| UX-AC10 | Timer/score HUD does not hide Siege Buff badge | ☐ |
| UX-AC11 | 915×412 readable and playable | ☐ |
| UX-AC12 | 800×360 readable and playable | ☐ |
| UX-AC13 | No snake_case or internal debug strings in player UI | ☐ |
| UX-AC14 | No economy/EXP/Gold/shop/ranking wording | ☐ |

---

## 10. Regression Expectations (Agent A)

Future runtime PR must verify:

- **Time Left** (or compact **Time**) appears and counts down MM:SS
- **Final Minute** appears once at 1:00 — or intentional MVP omission documented
- **Time Up** appears on timer expiry (non-core paths)
- **Victory by Objective Score** / **Defeat by Objective Score** on score win/loss
- **Victory by Core HP Tiebreak** / **Defeat by Core HP Tiebreak** on HP tiebreak
- **Draw** + **Objective Score and Core HP tied** on full tie
- **Core Destroyed** remains highest-priority result (overrides timer/score)
- No score win before timer reaches 0
- 915×412 and 800×360 layouts pass checklist
- No snake_case, internal keys, or currency strings in HUD/ResultScene
- 4C-A capture, 4C-B siege buff, 4B-B gate/core regressions still pass

Script: `scripts/phase-4c-c-timer-score-regression.mjs` (Agent A creates when authorized).

---

## 11. Asset Guidance for Agent B

### MVP default (no new assets required)

- **Text-first HUD** — existing `#1a2230` pill chips sufficient
- Timer: mono text `MM:SS`
- Score: colored digits `12 — 8`
- Result: text-only ResultScene (no new illustration)

### Optional micro-pack (after UX spec lock — not blocking MVP)

| Asset | Use |
|---|---|
| `ui_match_timer.svg` | Optional timer chip icon (800×360 icon-only) |
| `ui_objective_score.svg` | Optional score chip icon — **not** coin-shaped |
| `ui_time_up.svg` | Optional brief time-up toast accent |

### Do not require unless playtest fails

- `ui_score_victory.svg`
- `ui_score_defeat.svg`
- `ui_draw_result.svg`

Asset rules if created: SVG only, no text nodes, no coin/crown/trophy imagery,
no percent sign, distinct from capture/siege icons.

---

## 12. UX Scope Guard

**In scope:**

- Timer/score/result copy
- HUD priority and placement
- Mobile layout (915×412, 800×360)
- Time-up and Final Minute behavior
- ResultScene copy for all four end types
- UX acceptance criteria and handoff notes

**Out of scope:**

- Runtime code, scripts, assets, package files
- Timer/score win implementation
- Economy, EXP, Gold, shop, ranking
- Bot AI, respawn, vision/fog
- Minimap, route arrows, lane tracker, edge indicators
- Multiplayer, login, clan, payment
- Tutorial overhaul, Sudden Death
- Gate/Core stat changes, capture score value changes

---

## 13. Handoff Notes

### Agent B (Assets)

Do not open asset PR until this UX spec is merged. Optional micro-pack per §11.

### Agent A (Runtime — when authorized)

1. Use approved strings from §3 only — central copy map.
2. `MATCH_DURATION_SEC = 300` config-driven.
3. Timer/score chips in §5 placement — secondary to Gate/Core prompt.
4. Extend ResultScene reason map for score/tiebreak/draw paths.
5. **Time Up** toast on timer expiry; no Sudden Death.
6. Core destroy still highest priority — stops timer, skips score resolution.
7. No score victory before `matchTimer <= 0`.
8. Regression: UX-AC1–AC14 + Agent C R1–R17.

### Agent F (QA)

Use `docs/phase-4c-c-mobile-timer-score-checklist.md` after runtime lands.

### Agent E (Gate)

Approve 4C-C runtime only after Agent C spec + this UX spec merged and scope guard confirmed.

---

## 14. Blocker Rules (Future Runtime)

Block merge if:

- Timer/score HUD blocks joystick or attack/skills
- Timer/score hides Gate/Core top-center prompt
- Score HUD looks like currency (coin icon, gold primary color)
- **Time Up** copy implies Core destroyed
- Score win fires before timer reaches 0
- Draw shown as Victory or Defeat
- Sudden Death or overtime UI appears
- snake_case visible in HUD or ResultScene
- 800×360 unplayable
- Modal or full-width scoreboard during active play

---

## 15. Verdict (Spec)

**UX SPEC READY FOR REVIEW** — pending merge of this doc and Agent C PR #38
before runtime authorization.
