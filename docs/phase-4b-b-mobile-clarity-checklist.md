# Phase 4B-B Mobile Clarity Checklist

> **Agent D** — playtest and QA checklist for Phase 4B-B Objective Clarity /
> Feedback Polish on mobile. Use after Agent A lands 4B-B runtime PR.
>
> Viewports: **915×412** (primary), **800×360** (secondary).
> References: `docs/phase-4b-b-ux-copy.md`, `docs/mobile-hud-ux-spec.md`.

---

## Pre-flight

- [ ] Fresh load — Menu → ClassSelect → Match (Guardian or Warrior)
- [ ] **Debug overlay OFF** for primary pass
- [ ] **Debug overlay ON** for secondary pass (clutter check only)
- [ ] No prior explanation given to tester
- [ ] Test both viewports on same device or emulator

---

## 1. Top-Center Objective HUD

Run on **915×412** and **800×360**.

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 1.1 | Objective icon visible at spawn | ☐ | ☐ |
| 1.2 | Label visible: **Attack the Gate** | ☐ | ☐ |
| 1.3 | Label not clipped horizontally | ☐ | ☐ |
| 1.4 | Label not clipped vertically | ☐ | ☐ |
| 1.5 | Icon + label not too low (above playfield center) | ☐ | ☐ |
| 1.6 | Does not overlap top-left hint text | ☐ | ☐ |
| 1.7 | Does not overlap top-left stats HUD | ☐ | ☐ |
| 1.8 | Does not overlap Menu button (top-right) | ☐ | ☐ |
| 1.9 | Does not overlap joystick zone (bottom-left) | ☐ | ☐ |
| 1.10 | Does not overlap attack/skill cluster (bottom-right) | ☐ | ☐ |
| 1.11 | Font readable at arm's length | ☐ | ☐ |

**Pass:** Icon and label readable; no overlap with controls or top-left HUD.

---

## 2. Left Joystick Zone

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 2.1 | Joystick appears in lower-left | ☐ | ☐ |
| 2.2 | Joystick draggable without hitting objective UI | ☐ | ☐ |
| 2.3 | No toast/prompt overlay in left 45% bottom band | ☐ | ☐ |
| 2.4 | Movement responsive while objective label visible | ☐ | ☐ |
| 2.5 | Two-finger: joystick + attack simultaneously (PR #8) | ☐ | ☐ |

**Pass:** Movement never blocked by objective polish UI.

---

## 3. Right Combat Buttons

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 3.1 | ATK button tappable | ☐ | ☐ |
| 3.2 | Skill 1/2/3 tappable | ☐ | ☐ |
| 3.3 | Ultimate tappable | ☐ | ☐ |
| 3.4 | Objective label does not cover action cluster | ☐ | ☐ |
| 3.5 | Gate Breached toast does not cover ATK | ☐ | ☐ |
| 3.6 | Cooldown overlays still visible on skills | ☐ | ☐ |

**Pass:** Full combat cluster usable on both viewports.

---

## 4. ResultScene

Test after destroying Red Core (victory) and via debug defeat if available.

| # | Check | 915×412 | 800×360 |
|---|---|---|---|
| 4.1 | **VICTORY** title readable | ☐ | ☐ |
| 4.2 | Reason: **Enemy core destroyed** | ☐ | ☐ |
| 4.3 | **DEFEAT** title readable (if tested) | ☐ | ☐ |
| 4.4 | Reason: **Your core was destroyed** (if tested) | ☐ | ☐ |
| 4.5 | No snake_case on screen | ☐ | ☐ |
| 4.6 | **← Back to Menu** visible and tappable | ☐ | ☐ |
| 4.7 | No text overflow / clipping | ☐ | ☐ |

**Pass:** Result screen human-readable on smallest viewport.

---

## 5. Protected Core Feedback

**Setup:** Reach Red Core before destroying Red Gate. Attack core with melee and one skill.

| # | Check | Pass |
|---|---|---|
| 5.1 | Feedback appears: **Destroy Gate first** | ☐ |
| 5.2 | No modal or pause | ☐ |
| 5.3 | No technical text (`protected`, `blocked`, snake_case) | ☐ |
| 5.4 | No `-0` damage float | ☐ |
| 5.5 | Repeated attacks do not spam (≥ 2 s gap) | ☐ |
| 5.6 | Red Core HP unchanged | ☐ |
| 5.7 | HUD label still **Attack the Gate** (not Destroy the Core) | ☐ |

**Pass:** Player learns gate must fall first without reading debug.

**Note:** This was a known 4B-A gap — **required fix in 4B-B**.

---

## 6. Gate / Core Transition Clarity

| # | Check | Pass |
|---|---|---|
| 6.1 | Match starts with HUD **Attack the Gate** | ☐ |
| 6.2 | Player can state first target = gate (playtest question, ≤ 60 s) | ☐ |
| 6.3 | Red Gate destroyed → toast **Gate Breached** (once) | ☐ |
| 6.4 | HUD changes to **Destroy the Core** | ☐ |
| 6.5 | Player understands core is now the target (playtest question) | ☐ |
| 6.6 | Transition feedback does not repeat on every frame | ☐ |
| 6.7 | Victory HUD shows **Victory** before ResultScene | ☐ |

**Pass:** Gate → Core transition understandable without external help.

---

## 7. Clutter Limits

| # | Rule | Pass |
|---|---|---|
| 7.1 | Max **1** main HUD objective label visible | ☐ |
| 7.2 | Max **1** toast at a time | ☐ |
| 7.3 | Max **1** important world feedback per objective (e.g. under_attack OR float, not both repeatedly) | ☐ |
| 7.4 | No route arrows wired in 4B-B | ☐ |
| 7.5 | No go-to / attack_gate world markers wired in 4B-B | ☐ |
| 7.6 | No stacked: route arrow + marker + warning + under_attack + toast | ☐ |
| 7.7 | No permanent tutorial panel | ☐ |
| 7.8 | Debug off pass: screen not cluttered (E4-style) | ☐ |

**Pass:** Screen feels playable, not like a tutorial app.

---

## 8. Pass / Fail Rules

### BLOCKER — stop merge

Any one of:

- Snake_case or internal key visible to player (HUD, toast, ResultScene, float)
- Mobile controls blocked (joystick, ATK, or skills untappable)
- ResultScene unreadable or clipped on 800×360
- Player cannot identify first target (**Attack the Gate**) within 60 s with debug off
- Protected core hit gives **no** explanation when 4B-B feedback is in scope
- Modal or pause blocks combat

### CAUTION — merge allowed with documented follow-up

- Icon semantics imperfect but label text is correct
- 800×360 tight but all controls usable after resize
- Gate Breached toast subtle but HUD label updates correctly
- Feedback exists but easy to miss (note for 4B-B.1)

### PASS — 4B-B UX sign-off

- Gate/Core loop understood via HUD + short feedback
- All §1–§7 primary checks pass on 915×412
- §4 and §5 pass on 800×360
- No BLOCKER items
- ≤ 2 CAUTION items with owner assigned

---

## 9. Quick Playtest Script (5 minutes)

1. **0:00** — Start match, debug off, 915×412. Note HUD label. Move up main path.
2. **0:30** — Ask: "What is your first goal?" (expect: gate / Attack the Gate)
3. **1:00** — Reach Red Core early, attack it. Expect: **Destroy Gate first**
4. **2:00** — Destroy Red Gate. Expect: **Gate Breached** + **Destroy the Core**
5. **3:00** — Destroy Red Core. Expect: **Victory** → ResultScene → **Enemy core destroyed**
6. **3:30** — Back to Menu. Resize to 800×360. Repeat steps 1–2 only.
7. **4:00** — Verify controls on 800×360. Note any clip/overlap.
8. **5:00** — Score using §8 rules.

---

## 10. Guidance Marker Policy (Checklist Reminder)

Phase 4B-B **does not** require wiring:

- `route_hint_arrow`
- `go_to_gate_marker`
- `attack_gate_marker`
- `defend_core_marker`
- Minimap
- Full onboarding flow

If playtest fails §6.2 after copy polish, escalate to Product — **do not** add markers in 4B-B without approval.

---

## 11. Sign-off

| Role | Name | Date | Verdict |
|---|---|---|---|
| Agent D (UX) | | | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Agent F (QA) | | | ☐ PASS ☐ CAUTION ☐ BLOCKED |
| Product | | | ☐ Approved |
