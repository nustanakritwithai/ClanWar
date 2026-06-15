# Mobile HUD UX Spec — Phase 4B-D

> **Agent D** — where objective guidance, alerts, and player stats sit on mobile
> without blocking combat controls. Applies when Phase 4B guidance ships.
>
> References: `src/game/ui/SkillButtons.ts`, `src/game/ui/VirtualJoystick.ts`,
> `src/game/constants.ts` (`COMPACT_LAYOUT_HEIGHT = 480`).

---

## 1. UX Goal

On **915×412** and **800×360** landscape mobile:

- Player always sees **current objective** and **next action** at a glance.
- HP/Mana remain readable during combat.
- Objective UI **never covers** joystick (left) or attack/skills (right).
- Alerts are **short, urgent, and dismissible** — not a second game UI.

---

## 2. Player Problem

| Issue | Current state | Risk after 4B |
|---|---|---|
| Stats top-left only | Text block `Hero HP MP Dummy` | Objective prompts compete for same band |
| No objective slot | Debug markers on map | Players miss gate/core without HUD cue |
| Compact mode crowded | hint + stats + debug stack at x=16 | Adding alerts will overflow on 800×360 |
| Bottom screen = thumbs | Joystick + 8 buttons | Center-bottom items (item1/2) already tight |

---

## 3. Proposed HUD Layout

### Layer model (depth)

| Layer | Depth | Contents |
|---|---|---|
| World | 0–25 | Objectives, markers, arrows (`uiCamera.ignore`) |
| Base HUD | 1000 | HP/MP, menu, debug (existing) |
| Objective HUD | 1100–1200 | Prompts, next objective, alerts |
| Controls | 2000+ | Joystick, skill buttons (untouchable by new UI) |

### 915×412 — compact layout (primary)

```
    0px                                                          915px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ [HP ████░░] [MP ████░░]     ┌─────────────────┐      [≡ Menu]   │
  │                              │ Attack the Gate │                  │
56│                              └─────────────────┘                  │
  │                                                                   │
  │                         (playfield)                               │
  │                                                                   │
  │   [Next: Gate →]                                                  │  ← priority chip, top-left below bars
  │                                                                   │
252│ [Joy]                                          [ULT][S3][S2][S1] │
  │                                                 [War]    [ATK]   │
412└──────────────────────────────────────────────────────────────────┘
```

### 800×360 — extra compact

- HP/MP: single combined bar row at y=6 — `HP 420/500 · MP 80/120`
- Objective prompt: font 13 px, y=28, max 24 chars visible
- Next objective chip: hidden when prompt active (mutual exclusion)
- Menu: icon only `☰` at top-right 40×40 touch target

---

## 4. HUD Element Specs

### 4.1 HP / Mana bar (upgrade from text)

| Property | Normal (≥480 h) | Compact (<480 h) |
|---|---|---|
| Position | x=16, y=16 | x=12, y=6 |
| Width | 140 px each | 120 px each (or combined 200 px) |
| Height | 8 px bar + 11 px label | 6 px bar, label inside tooltip on long-press — **defer long-press** |
| Color HP | Blue fill `#3b82f6`, dark track | Same |
| Color MP | Cyan fill `#22d3ee`, dark track | Same |
| Z-index | 1000 | 1000 |

**Rule:** Bars stay **top-left** — never move to bottom (thumb zone).

### 4.2 Objective prompt (primary call-to-action text)

| Property | Value |
|---|---|
| Position | Horizontal center, y=12 (compact y=8) |
| Max width | 50% screen width |
| Font | 14–16 px compact, 16–18 px normal |
| Background | `#00000088` pill, 8 px padding |
| Duration | 4 s default OR until condition met |
| Max lines | **1** — truncate with ellipsis |
| Animation | Fade in 150 ms, fade out 200 ms |

### 4.3 Next objective indicator (persistent chip)

| Property | Value |
|---|---|
| Position | x=16, y=56 compact / y=72 normal — below HP row |
| Content | `Next: Gate →` / `ถัดไป: ประตู →` |
| Icon | 16 px objective type icon (gate/core) |
| Visibility | Hidden during active danger alert |
| Updates | `gate → core → victory` chain only in MVP |

### 4.4 Objective alert strip (state changes)

| Property | Value |
|---|---|
| Position | Top center, **below** objective prompt slot — y=48 compact |
| Height | 28 px max |
| Types | Gate breached, Core vulnerable, Under attack |
| Color | Amber `#f59e0b` border for warning; red `#ef4444` for danger |
| Duration | 3 s, pulsing border 1 Hz — stop pulse after 2 s |
| Sound | Defer — no audio in MVP |

### 4.5 Alert icons (top-right cluster)

| Icon | When | Position |
|---|---|---|
| Core vulnerable | Enemy can hit core (4C) | Menu left, x=width−64 |
| Gate breached | Gate HP = 0 | Same slot, replaces vulnerable |
| Under attack | `objective_warning` active on owned gate/core | Same slot |

Touch target 44×44 min. Tap opens 1-line detail toast (optional 4B.1).

### 4.6 World-space markers (not HUD but coordinated)

| Marker | HUD sync |
|---|---|
| `go-to-gate` active | Prompt = "Head to enemy gate" |
| `attack_marker` on gate | Prompt = "Attack the Gate" |
| `defend_marker` on core | Alert = "Defend the Core" |

Hide world marker when matching HUD alert is dismissed **only if** player
entered trigger zone (avoid flicker).

---

## 5. UX Copy (HUD-specific)

| Slot | EN | TH |
|---|---|---|
| Next objective | Next: Gate | ถัดไป: ประตู |
| Next objective | Next: Core | ถัดไป: แกนหลัก |
| Empty state | Push the main route | เดินทางหลัก |

---

## 6. Implementation Brief for Agent A

1. New `ObjectiveHud.ts` (or extend `MatchScene.drawHud`) — all elements
   `setScrollFactor(0)`, depth 1100–1200, registered on **ui camera only**.
2. **Mutual exclusion**: `showPrompt()` hides `nextObjectiveChip` while active.
3. **Resize handler**: mirror `SkillButtons.reposition()` — recompute on
   `scale.on('resize')` for 915×412 and 800×360.
4. **No-hit-area on prompts**: text objects `disableInteractive()` — alerts
   must not steal touches from joystick zone.
5. HP/MP bars: optional Phase 4B.1 — if time-constrained, keep text stats but
   **move debug text** to toggle-only so objective prompt has room.
6. Alert queue: max 1 visible; new high-priority alert replaces current.
7. `hideMessageAfter(timeoutMs)` with default 4000 — configurable per message type.
8. Verify `MOVEMENT_ZONE_WIDTH_RATIO` (0.45) — no HUD element with x < 45% width
   and y > height − 180.

### Regression checks

- Joystick + skill simultaneous touch (PR #8) still passes.
- `uiCamera.ignore()` on all world objectives/markers.
- Compact layout: `isCompactHud()` === `height < 480`.

---

## 7. Asset Brief for Agent B

| Asset | HUD use | Size |
|---|---|---|
| `icon_gate_small` | Next objective chip | 16×16 UI |
| `icon_core_small` | Next objective chip | 16×16 UI |
| `icon_gate_breached` | Alert icon top-right | 32×32 UI |
| `icon_core_vulnerable` | Alert icon top-right | 32×32 UI |
| `icon_under_attack` | Alert icon top-right | 32×32 UI |

UI icons **flat, no text inside** — readable at 32 px on amber/red badge.

Existing world assets (`objective_warning.svg`, etc.) stay world-space only.

---

## 8. Design Dependency from Agent C

| Input | Usage |
|---|---|
| Objective priority order | Gate before core in `nextObjectiveChip` |
| Win condition | Chip shows "Victory" after core destroyed — handoff to Result scene |
| Player checklist E1–E5 | HUD must not fail E4 (clutter) on debug-off pass |

---

## 9. Deferred

- Minimap corner widget.
- Floating damage recap / objective HP bars in HUD.
- Team score / timer (no round timer in MVP).
- Item bar redesign.
- Gesture-based ping wheel.
- Haptic feedback on alerts.

---

## 10. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| H1 | Objective prompt readable at arm's length on 915×412 | ☐ |
| H2 | HP/MP visible while thumb on joystick | ☐ |
| H3 | No objective HUD element overlaps joystick hit area | ☐ |
| H4 | No objective HUD element overlaps ATK button (44 px radius min) | ☐ |
| H5 | Only 1 prompt + 1 alert visible simultaneously | ☐ |
| H6 | 800×360: no vertical overlap between HP row and prompt | ☐ |
| H7 | Resize rotation/resize — HUD repositions without clip | ☐ |
| H8 | World markers never render on ui camera layer | ☐ |
