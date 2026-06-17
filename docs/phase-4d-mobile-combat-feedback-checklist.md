# Phase 4D Mobile Combat Feedback Checklist

> **Agent D** — playtest checklist for Phase 4D Combat Feel MVP on mobile.
> Use after Agent A lands runtime PR.
>
> Viewports: **915×412** (primary), **800×360** (secondary — design first).
> References: `docs/phase-4d-combat-feel-ux-spec.md`.

---

## Pre-flight

- [ ] Phase 4C-C timer/score working (300 s, score win, draw)
- [ ] Phase 4C-B Siege Buff working
- [ ] Phase 4C-A capture working
- [ ] Gate/Core loop working (4B-B baseline)
- [ ] **Debug overlay OFF** for primary pass
- [ ] Test **800×360 first**, then 915×412
- [ ] No prior explanation given to tester

---

## 1. Viewport 800×360 (design first)

### Controls

| # | Check | Pass |
|---|---|---|
| 1.1 | Joystick visible and usable | ☐ |
| 1.2 | Attack button tappable | ☐ |
| 1.3 | Skill buttons tappable | ☐ |
| 1.4 | Combat effects do not cover joystick | ☐ |
| 1.5 | Combat effects do not cover skill cluster | ☐ |

### HUD preservation

| # | Check | Pass |
|---|---|---|
| 1.6 | Timer/score chip visible (`4:32 · 12–8` or equivalent) | ☐ |
| 1.7 | Gate/Core prompt readable | ☐ |
| 1.8 | Capture HUD readable near objectives | ☐ |
| 1.9 | Siege Buff badge readable | ☐ |

### Combat feedback

| # | Check | Pass |
|---|---|---|
| 1.10 | Normal hit spark visible on dummy hit | ☐ |
| 1.11 | Damage number readable, not overlapping controls | ☐ |
| 1.12 | Gate hit feels heavier than normal hit | ☐ |
| 1.13 | Core hit feels heavier than Gate hit | ☐ |
| 1.14 | Skill cast has visible confirmation | ☐ |
| 1.15 | No full-screen flash | ☐ |
| 1.16 | No long-lived particles (> 0.6 s) | ☐ |
| 1.17 | No persistent camera shake | ☐ |

---

## 2. Viewport 915×412

### Controls + HUD

| # | Check | Pass |
|---|---|---|
| 2.1 | Joystick and action buttons unobstructed | ☐ |
| 2.2 | Time Left + Objective Score visible | ☐ |
| 2.3 | Gate/Core prompt visible during combat | ☐ |
| 2.4 | Capture + Siege Buff UI not hidden | ☐ |

### Combat feedback

| # | Check | Pass |
|---|---|---|
| 2.5 | Normal hit spark + damage number visible | ☐ |
| 2.6 | Gate hit distinct (spark/pulse/number tier) | ☐ |
| 2.7 | Core hit distinct from Gate | ☐ |
| 2.8 | Skill cast feedback confirms press | ☐ |
| 2.9 | Gate Breached reinforced (ring/pulse) without hiding copy | ☐ |
| 2.10 | Multiple rapid hits do not unreadably stack | ☐ |

---

## 3. Structure Milestones

| # | Check | Pass |
|---|---|---|
| 3.1 | Gate destroyed → **Gate Breached** copy still primary | ☐ |
| 3.2 | No full-screen explosion on gate destroy | ☐ |
| 3.3 | Core destroyed → ResultScene without extra delay | ☐ |
| 3.4 | **Victory** / **Defeat** + **Core Destroyed** unchanged | ☐ |
| 3.5 | Score/timer copy does not override Core destroyed result | ☐ |

---

## 4. Copy Hygiene

| # | Check | Pass |
|---|---|---|
| 4.1 | No snake_case in HUD or floats | ☐ |
| 4.2 | No `hit_debug`, `impact_state`, `gate_hit_state`, etc. | ☐ |
| 4.3 | No gold, EXP, currency, ranking, economy wording | ☐ |
| 4.4 | Effects do not imply hidden damage buff | ☐ |
| 4.5 | ResultScene still human-readable | ☐ |

---

## 5. Regression (prior phases)

| # | Check | Pass |
|---|---|---|
| 5.1 | Gate/Core loop complete → Victory/Defeat | ☐ |
| 5.2 | Capture objectives still award score | ☐ |
| 5.3 | Siege Buff + **Siege Bonus** still work | ☐ |
| 5.4 | Timer countdown + time-up score win still work | ☐ |
| 5.5 | Draw path still works | ☐ |

---

## 6. Pass / Caution / Blocker

### BLOCKER

- Controls blocked by combat VFX
- Gate/Core prompt hidden by effects
- Timer/score/Capture/Siege HUD hidden
- Core destroyed result delayed
- Full-screen flash on 800×360
- Persistent shake
- snake_case visible
- Implied balance/stat change

### PASS WITH CAUTION

- 800×360 tight but playable
- Micro shake disabled on compact — acceptable
- Damage numbers occasionally overlap but readable

### PASS

- UX-AC1–AC16 from `phase-4d-combat-feel-ux-spec.md` all pass
- No BLOCKER items

---

## 7. Quick Playtest (~12 min)

1. **800×360** — Hit Training Dummy 5×; confirm spark + number, no control overlap.
2. Attack **Red Gate** — confirm heavier feedback than dummy.
3. Breach gate → **Gate Breached** + brief ring/pulse.
4. Hit **Red Core** — confirm strongest tier; destroy → ResultScene promptly.
5. Cast 2–3 skills — confirm cast flash + existing skill VFX.
6. Capture objective — Capture HUD + timer/score still visible during fight.
7. Hold Siege Ruins — Siege Buff badge not hidden during combat.
8. **915×412** — repeat steps 1–4.
9. Score per §6.

---

## 8. Sign-off

| Role | Verdict |
|---|---|
| Agent D (UX) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent F (QA) | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent E (Gate) | ☐ Approved for runtime |
