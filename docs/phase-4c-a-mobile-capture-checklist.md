# Phase 4C-A Mobile Capture Clarity Checklist

> **Agent D** — playtest and QA checklist for Phase 4C-A Objective Capture on
> mobile. Use after Agent A lands capture runtime PR.
>
> Viewports: **915×412** (primary), **800×360** (secondary).
> References: `docs/phase-4c-a-capture-ux-copy.md`,
> `docs/phase-4c-a-objective-capture-acceptance.md`,
> `docs/phase-4b-b-mobile-clarity-checklist.md`.

---

## Pre-flight

- [ ] Fresh load — Menu → ClassSelect → Match
- [ ] **Debug overlay OFF** for primary pass
- [ ] Gate/Core loop verified working (4B-B baseline)
- [ ] Test **915×412** first, then resize to **800×360**
- [ ] No prior explanation given to tester

**Capturable objectives (6):** Resource Camp L/R, Watchtower, Siege Ruins, Forward Camp L/R

---

## 1. Main Objective HUD (Gate/Core) Still Visible

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 1.1 | Spawn shows **Attack the Gate** when not in capture zone | ☐ | ☐ |
| 1.2 | Gate/Core label returns after leaving capture zone | ☐ | ☐ |
| 1.3 | Gate Breached / Destroy the Core still work (4B-B regression) | ☐ | ☐ |
| 1.4 | Capture does not permanently replace gate/core HUD globally | ☐ | ☐ |

---

## 2. Capture Prompt Readability

**Setup:** Walk into neutral Resource Camp L (or any neutral objective).

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 2.1 | Capture prompt appears only inside radius | ☐ | ☐ |
| 2.2 | Prompt readable at arm's length | ☐ | ☐ |
| 2.3 | Typed prompt correct (e.g. **Capturing Resource Camp**) | ☐ | ☐ |
| 2.4 | Shorter **Capturing** fallback if name clips (800×360) | ☐ | ☐ |
| 2.5 | No snake_case or internal keys | ☐ | ☐ |
| 2.6 | Prompt hidden when outside radius | ☐ | ☐ |

---

## 3. Capture Progress Readability

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 3.1 | Progress bar/ring visible while capturing | ☐ | ☐ |
| 3.2 | Progress does not look like HP/damage bar | ☐ | ☐ |
| 3.3 | Fill completes in ~6–8 s uncontested | ☐ | ☐ |
| 3.4 | Progress hidden when not in zone | ☐ | ☐ |
| 3.5 | Progress not clipped at screen edges | ☐ | ☐ |
| 3.6 | Owner color clear on complete (blue variant) | ☐ | ☐ |

---

## 4. Joystick Zone (Left)

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 4.1 | Joystick draggable while capture UI visible | ☐ | ☐ |
| 4.2 | No capture overlay on left thumb area | ☐ | ☐ |
| 4.3 | Movement works during capture fill | ☐ | ☐ |
| 4.4 | Two-finger joystick + attack still works | ☐ | ☐ |

---

## 5. Combat Buttons (Right)

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 5.1 | ATK button tappable during capture | ☐ | ☐ |
| 5.2 | Skill buttons tappable during capture | ☐ | ☐ |
| 5.3 | Ultimate tappable | ☐ | ☐ |
| 5.4 | Capture prompt does not cover action cluster | ☐ | ☐ |
| 5.5 | Capture toast does not cover ATK | ☐ | ☐ |

---

## 6. Overlap and Clutter

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 6.1 | Max 1 top-center objective/capture prompt | ☐ | ☐ |
| 6.2 | Max 1 active capture progress for player | ☐ | ☐ |
| 6.3 | No route arrows | ☐ | ☐ |
| 6.4 | No minimap / edge indicators / lane tracker | ☐ | ☐ |
| 6.5 | No tutorial overlay / center modal | ☐ | ☐ |
| 6.6 | No permanent text above every objective | ☐ | ☐ |
| 6.7 | Gate Breached toast does not stack with capture toast | ☐ | ☐ |

---

## 7. Contested and Paused States

**Setup:** Simulate contested via debug/test flag if no live enemy.

| # | Check | Pass |
|---|---|---|
| 7.1 | Contested shows **Contested** (not silent freeze) | ☐ |
| 7.2 | Progress frozen while contested | ☐ |
| 7.3 | Leaving circle pauses or slows progress | ☐ |
| 7.4 | Optional **Capture Paused** — not spammed | ☐ |
| 7.5 | Player does not think capture is broken | ☐ |

---

## 8. Capture Complete and Score

| # | Check | Pass |
|---|---|---|
| 8.1 | Toast: typed capture complete (e.g. **Watchtower Captured**) | ☐ |
| 8.2 | Score toast: **+5** / **+6** / **+8 Objective Score** as appropriate | ☐ |
| 8.3 | Score awarded once per capture (no double toast spam) | ☐ |
| 8.4 | Feedback lasts ~1.5–2 s then clears | ☐ |
| 8.5 | Objective visual = blue owned after capture | ☐ |

**Score reference:** Resource Camp +5, Watchtower +5, Forward Camp +6, Siege Ruins +8

---

## 9. ResultScene and Menu (Regression)

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 9.1 | Victory/Defeat still human-readable | ☐ | ☐ |
| 9.2 | No snake_case on ResultScene | ☐ | ☐ |
| 9.3 | **← Back to Menu** tappable | ☐ | ☐ |
| 9.4 | No text overflow | ☐ | ☐ |

---

## 10. Technical Hygiene

| # | Check | Pass |
|---|---|---|
| 10.1 | No console errors during capture flow | ☐ |
| 10.2 | Menu ↔ Match ×3 — objectives reset neutral | ☐ |
| 10.3 | No scroll/zoom breaks capture UI | ☐ |

---

## 11. Pass / Caution / Blocker Rules

### BLOCKER — stop UX sign-off

Any one of:

- Joystick or skill buttons blocked by capture UI
- Capture text unreadable or clipped on 800×360
- Capture progress hidden while actively capturing
- Snake_case or internal keys visible to player
- Modal blocks combat
- Capture/gate toasts spam (same event >2 times in 3 s)
- 800×360 unplayable (controls unusable)
- Player cannot tell main objective when not in capture zone

### PASS WITH CAUTION — merge allowed with notes

- 800×360 tight but all controls usable
- Progress indicator basic but readable
- Uses **Capturing** short form instead of full typed name on small screen
- Contested state readable but subtle

### PASS — 4C-A UX sign-off

- Capture UI readable on both viewports
- No control overlap
- Copy matches `phase-4c-a-capture-ux-copy.md`
- No spam; max 1 prompt
- Gate/Core loop still clear
- No BLOCKER items

---

## 12. Quick Playtest Script (~8 minutes)

1. **915×412, debug off** — Note **Attack the Gate** at spawn.
2. Walk to **Resource Camp L** — enter circle. Expect: **Capturing Resource Camp** + progress.
3. Step out mid-capture — progress pauses; optional **Capture Paused**.
4. Re-enter — complete capture. Expect: **Resource Camp Captured** + **+5 Objective Score**.
5. Leave zone — HUD returns to **Attack the Gate**.
6. Repeat one **Forward Camp** (+6) and **Siege Ruins** (+8) if time allows.
7. Trigger **Contested** (debug) — expect **Contested**, frozen bar.
8. Complete Gate/Core loop — ResultScene still clean.
9. Resize **800×360** — repeat steps 2–4 only; verify controls + readability.
10. Score using §11.

---

## 13. Guidance Marker Policy (Reminder)

Phase 4C-A **does not** require wiring player-guidance markers, route arrows, minimap, or lane tracker. Fail playtest → escalate to Product; do not add markers without approval.

---

## 14. Sign-off

| Role | Date | Verdict |
|---|---|---|
| Agent D (UX) | | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent F (QA) | | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Product | | ☐ Approved |
