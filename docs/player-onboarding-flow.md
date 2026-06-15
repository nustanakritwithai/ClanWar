# Player Onboarding Flow — Phase 4B-D

> **Agent D (UX / Onboarding)** — how a new player understands objectives in the
> first session. Docs-only spec for Phase 4B Objective Runtime / Player Guidance.
>
> References: `docs/map-layout-spec.md`, `docs/objective-placement-spec.md`,
> `docs/phase-4-gameplay-loop.md`, `docs/player-experience-checklist.md`.

---

## 1. UX Goal

Within the **first 30 seconds** of a match, a new mobile player should know:

1. **Which team they are on** (Blue, bottom base).
2. **How to move** (joystick / left zone).
3. **Where the main route is** (center tan path, forward = toward enemy).
4. **What to do first** (push main route toward enemy gate).
5. **What to attack** (enemy gate — the wall ahead).
6. **What to protect** (own core — behind own gate, deepest in base).

No tutorial menu, no account flow, no full tutorial system — only **in-match
micro-guidance** layered on top of existing combat controls.

---

## 2. Player Problem

| Moment | Likely confusion | Why |
|---|---|---|
| Spawn | "Where am I? Which way is forward?" | Top-down map; camera may not show enemy base |
| First 10 s | "What is my goal?" | Combat works but win condition not surfaced |
| Seeing gate icon | "Is that an enemy or decoration?" | Gate/core sprites new in 4B; no HP yet in 4B |
| Mid push | "Should I go left/right?" | Three routes visible; MVP only teaches main |
| Own base | "What happens if I walk backward?" | Core location not explained until defend phase |

**Core rule:** If the player must guess, UX is insufficient.

---

## 3. Proposed UX Flow — First 30 Seconds

Timeline assumes **first match** flag (`isFirstMatch = true`). Repeat matches
show fewer overlays (see §Deferred).

### T+0 s — Spawn reveal (0–3 s)

| Element | Behavior |
|---|---|
| Camera | Centered on player at blue spawn (1500, 3900) |
| Team read | Blue spawn platform + blue base floor = "this is home" |
| No modal | Match starts immediately — no loading tutorial screen |

**Player should feel:** "I am on the blue fortress at the bottom."

### T+3 s — Movement nudge (3–8 s)

| Element | Behavior |
|---|---|
| Prompt | Top-center banner: **"Move forward"** / **"เดินไปข้างหน้า"** |
| World hint | 1× `path_arrow_blue` on main route, 2–3 tiles ahead of spawn |
| Joystick | Subtle pulse on joystick base (one-time, 1 s) if no input after 3 s |
| Dismiss | Prompt fades when player moves ≥80 px up-map (y decreases) |

**Player should feel:** "I need to walk up the tan path."

### T+8 s — Main route identity (8–15 s)

| Element | Behavior |
|---|---|
| Prompt | None (terrain carries meaning per Agent C 4A) |
| World hint | `lane_marker_blue` at first fork (y ≈ 3550) — optional, first match only |
| Objective peek | Enemy gate silhouette faintly visible on horizon if camera allows |

**Player should feel:** "The wide center path is the way."

### T+15 s — First objective callout (15–22 s)

| Element | Behavior |
|---|---|
| Prompt | Top-center: **"Attack the Gate"** / **"โจมตีประตู"** |
| World marker | `go-to-gate` world arrow toward `redGate` (1500, 1000) on main route |
| Gate highlight | Subtle pulse ring on `red_gate.svg` (first sighting only) |

**Player should feel:** "The gate at the top is my target."

### T+22 s — Defend awareness (22–30 s)

| Element | Behavior |
|---|---|
| Prompt | Top-center: **"Protect your Core"** / **"ป้องกันแกนหลัก"** |
| World marker | Brief camera nudge or minimap-less **ping** on `blueCore` (1500, 3700) |
| Duration | 3 s then auto-dismiss — do not block movement |

**Player should feel:** "My core is behind me; I push forward but must not forget home."

### 30-second comprehension checklist

| # | Player can answer | Pass |
|---|---|---|
| P1 | "I am Blue team" | ☐ |
| P2 | "Forward = up the map = toward enemy" | ☐ |
| P3 | "Main path is center" | ☐ |
| P4 | "First goal = enemy gate" | ☐ |
| P5 | "My core is behind my gate" | ☐ |

---

## 4. Screen / Mobile Notes

### Safe zones (915×412 and 800×360)

```
┌─────────────────────────────────────────────────────────────┐
│ [HP/MP bar]              [Objective prompt]        [Menu]   │  ← top band (y 0–56)
│                                                             │
│                                                             │
│                    PLAYFIELD (center 55%)                   │  ← no fixed UI
│                                                             │
│                                                             │
│ [Joystick]                              [ATK / Skills]      │  ← bottom band (y −160)
└─────────────────────────────────────────────────────────────┘
```

| Zone | Rule |
|---|---|
| Top center | Objective prompts only — max width 50% screen, never full-width bar |
| Top left | HP/Mana compact bar — stays above joystick |
| Top right | Menu + alert icons — never larger than 48×48 px each |
| Bottom left 45% | Reserved for joystick — **no prompts, no markers** |
| Bottom right 40% | Reserved for attack/skills — **no prompts** |
| Center | World markers and arrows only — world-space, `uiCamera.ignore` |

### Viewport specifics

| Viewport | Notes |
|---|---|
| **915×412** (primary) | Compact HUD (`height < 480`). Prompt font 14–16 px. One line only. |
| **800×360** (secondary) | Shorter top band — prompts at y=8, HP at y=32. Verify no overlap with debug. |

---

## 5. UX Copy (first 30 s)

See `docs/ux-copy-and-message-guide.md` for full catalogue. First-30s set:

| Trigger | EN | TH |
|---|---|---|
| No movement @ 3 s | Move forward | เดินไปข้างหน้า |
| Gate visible | Attack the Gate | โจมตีประตู |
| Core intro | Protect your Core | ป้องกันแกนหลัก |

---

## 6. Implementation Brief for Agent A

1. Add `FirstMatchGuidance` (or equivalent) module — **UI layer only**, depth 1500+
   (above stats HUD 1000, below nothing that blocks input).
2. Track `isFirstMatch` via `localStorage` key `csa_first_match_done` — set on
   match end or after 3 min, whichever first.
3. **Objective prompt** component:
   - Top-center text, semi-transparent pill background (`#00000088`).
   - Auto-hide after 4 s OR on trigger condition met.
   - Queue max 1 message — never stack two prompts.
4. **World go-to marker**: sprite or reuse `path_arrow_blue.svg` chain on main
   route spine only (x 1300–1700). Point toward active objective world position.
   `uiCamera.ignore()` — world-space on main camera.
5. **Joystick pulse**: optional tween on `VirtualJoystick` base alpha — skip if
   player already moved.
6. **Do not** block input, pause game, or show full-screen overlay.
7. **Do not** implement gate HP, win/lose, or bot logic in guidance PR — hook to
   existing objective state when 4C lands.
8. Gate guidance activates when player crosses y < 3400 (left spawn band).
9. Core defend prompt fires once per first match when player crosses y < 3600.

---

## 7. Asset Brief for Agent B

| Asset | Use in first 30 s | Status |
|---|---|---|
| `path_arrow_blue.svg` | Main route direction hint | ✅ map pack |
| `lane_marker_blue.svg` | Fork teaching at blueFork | ✅ map pack |
| `red_gate.svg` | Distant target silhouette | ✅ objective pack |
| `blue_core.svg` | Defend ping target | ✅ objective pack |
| `go_to_marker` (new) | World-space "go here" chevron | 🔲 feedback pack |
| `defend_marker` (new) | Shield ping on core | 🔲 feedback pack |

Request from Agent B's **Objective Feedback Asset Pack**: distinct silhouettes
for go/attack/defend markers — not reusing skill VFX shapes.

---

## 8. Design Dependency from Agent C

| Doc | What Agent D needs |
|---|---|
| `map-layout-spec.md` | Spawn band y > 3400, main route x 1300–1700, orientation bottom=home |
| `objective-placement-spec.md` | Gate y 3200/1000, core y 3700/500, sprite scale |
| `phase-4-gameplay-loop.md` | Gate before core, win on red core destroy (4C) |
| `player-experience-checklist.md` | A1–A4 spawn readability gates for 4A |

**Locked assumptions:** Blue player, single-player prototype, main route only for
first-match guidance. Flank routes not taught in first 30 s.

---

## 9. Deferred

| Item | Phase | Reason |
|---|---|---|
| Flank route teaching | 4.x | One action at a time |
| Watchtower / camp callouts | 4.x | Out of MVP scope |
| Full tutorial system / skip menu | Post-MVP | Micro-guidance sufficient |
| Repeat-match onboarding | 4B.1 | Reduce to objective alerts only |
| Minimap | Post-MVP | Not in scope |
| Enemy AI pressure / defend urgency | 4C+ | No bot in MVP |
| Localized voice-over | Post-MVP | Text only |

---

## 10. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| OB1 | New player identifies Blue team within 10 s without reading debug text | ☐ |
| OB2 | Player moves up main route within 15 s without external help | ☐ |
| OB3 | Player can state "attack the gate" as goal by 30 s (playtest question) | ☐ |
| OB4 | Player knows core is behind them / in own base by 30 s | ☐ |
| OB5 | No prompt covers joystick or attack buttons on 915×412 | ☐ |
| OB6 | Max 3 text prompts in first 30 s — no stacking | ☐ |
| OB7 | Guidance disabled or reduced on second match | ☐ |
| OB8 | Menu ↔ Match ×3 — no guidance UI leak | ☐ |
