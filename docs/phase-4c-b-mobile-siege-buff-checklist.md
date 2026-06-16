# Phase 4C-B Mobile Siege Buff Clarity Checklist

> **Agent D** — playtest checklist for Phase 4C-B Siege Ruins Gate Damage Bonus
> on mobile. Use after Agent A lands runtime PR.
>
> Viewports: **915×412** (primary), **800×360** (secondary).
> References: `docs/phase-4c-b-siege-buff-ux-copy.md`,
> `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md`.

---

## Pre-flight

- [ ] Phase 4C-A capture working (6 objectives, Siege Ruins capturable)
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
| 1.5 | No siege UI overlaps bottom control zones | ☐ |

### Gate/Core HUD

| # | Check | Pass |
|---|---|---|
| 1.6 | **Attack the Gate** visible when not capturing | ☐ |
| 1.7 | Gate/Core prompt not replaced by Siege Buff badge | ☐ |
| 1.8 | Gate Breached / Core is open still work | ☐ |

### Siege Buff UI

| # | Check | Pass |
|---|---|---|
| 1.9 | Capture Siege Ruins → **Siege Buff Active** toast once | ☐ |
| 1.10 | **Siege Buff** badge visible (icon + text) while buff active | ☐ |
| 1.11 | Badge readable, not clipped | ☐ |
| 1.12 | Badge does not overlap Menu button | ☐ |
| 1.13 | Hit enemy gate → **Siege Bonus** float (throttled) | ☐ |
| 1.14 | No **Siege Bonus** on core or hero | ☐ |

### Capture + clutter

| # | Check | Pass |
|---|---|---|
| 1.15 | Capture progress readable at ruins | ☐ |
| 1.16 | Max 1 top-center prompt (gate/core OR capture, not both fighting) | ☐ |
| 1.17 | Stacked toasts do not cover gameplay > 3 s | ☐ |
| 1.18 | No full-width banner | ☐ |
| 1.19 | No modal | ☐ |

### Contested / lost

| # | Check | Pass |
|---|---|---|
| 1.20 | Contest ruins → **Siege Buff Lost** once; badge hides | ☐ |
| 1.21 | Enemy gains ruins → **Enemy Siege Buff Active** once | ☐ |

---

## 2. Viewport 800×360

| # | Check | Pass |
|---|---|---|
| 2.1 | Joystick visible and usable | ☐ |
| 2.2 | Action buttons visible and tappable | ☐ |
| 2.3 | Gate/Core HUD readable | ☐ |
| 2.4 | **Siege Buff** icon readable (icon-only OK) | ☐ |
| 2.5 | Text appears on state change only (toasts) | ☐ |
| 2.6 | No full-width banner | ☐ |
| 2.7 | No modal | ☐ |
| 2.8 | No control overlap | ☐ |
| 2.9 | Toasts not clipped | ☐ |

---

## 3. Copy Hygiene

| # | Check | Pass |
|---|---|---|
| 3.1 | No snake_case anywhere | ☐ |
| 3.2 | No `+30% Gate Damage` unless Product approved | ☐ |
| 3.3 | No `gate_damage_bonus`, `modifier`, `stack` visible | ☐ |
| 3.4 | No `core open` / `core vulnerable` on siege events | ☐ |
| 3.5 | No win soon / instant win wording | ☐ |
| 3.6 | ResultScene still human-readable after match | ☐ |

---

## 4. Pass / Caution / Blocker

### BLOCKER

- Controls blocked
- Gate/Core prompt hidden by siege UI
- **Siege Bonus** every hit
- Siege copy on non-gate targets
- snake_case visible
- 800×360 unplayable
- Modal blocks combat

### PASS WITH CAUTION

- 800×360 tight but usable
- Icon-only badge; toasts subtle
- **Siege Bonus** rare but visible

### PASS

- UX-AC1–AC10 from `phase-4c-b-siege-buff-ux-copy.md` all pass
- No BLOCKER items

---

## 5. Quick Playtest (~10 min)

1. **915×412** — Note **Attack the Gate** at spawn.
2. Capture **Siege Ruins** — expect: Captured → +8 → **Siege Buff Active** (staggered).
3. Confirm **Siege Buff** badge appears.
4. Attack **Red Gate** — expect occasional **Siege Bonus**, not every swing.
5. Simulate contest — **Siege Buff Lost**, badge gone.
6. Verify gate/core loop still completes to Victory.
7. **800×360** — repeat steps 2–4; verify icon badge + controls.
8. Score per §4.

---

## 6. Sign-off

| Role | Verdict |
|---|---|
| Agent D (UX) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent F (QA) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent E (Gate) | ☐ Approved for runtime |
