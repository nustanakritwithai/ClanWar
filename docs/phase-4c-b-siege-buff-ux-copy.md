# Phase 4C-B Siege Buff UX Copy Spec

> **Agent D** — canonical player-facing copy and mobile behavior for Phase
> 4C-B Siege Ruins Gate Damage Bonus. **Docs only — not a runtime work order.**
>
> References: `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md` (Agent C PR #33),
> `docs/phase-4c-a-capture-ux-copy.md`, `docs/phase-4b-b-ux-copy.md`,
> `docs/mobile-hud-ux-spec.md`.

---

## 1. UX Goal

A mobile player understands:

- **Holding uncontested Siege Ruins** makes damage to the **enemy Gate** stronger
- **Losing ruins or contest** removes that advantage
- This is **not** the same as Gate Breached, Core is open, or Victory

Gate/Core loop remains the primary path to win. Siege Buff is a **secondary combat modifier**.

---

## 2. Design Rule (from Agent C)

Siege Buff is **active** for a team only when:

```
Siege Ruins owner === team
AND Siege Ruins captureState !== contested
```

| Ruins state | Buff |
|---|---|
| Blue owned + uncontested | Blue buff **on** |
| Red owned + uncontested | Red buff **on** |
| Contested | Buff **off** for **both** teams |
| Neutral | Buff **off** for both |

Bonus applies **only** to enemy **Gate** damage — not Core, heroes, dummies, or capture objectives.

---

## 3. Approved Player-Facing Copy (English)

### 3.1 Canonical strings (implementation source)

| Event | Approved EN | Type |
|---|---|---|
| Player gains buff | **Siege Buff Active** | One-shot toast |
| Player loses buff | **Siege Buff Lost** | One-shot toast |
| Enemy gains buff | **Enemy Siege Buff Active** | One-shot toast |
| Gate hit with buff | **Siege Bonus** | World float (throttled) |
| Persistent HUD | **Siege Buff** | Small badge/chip |

**Internal keys (never displayed):** `siege_buff_active`, `gate_damage_bonus`, `SIEGE_RUINS_GATE_BONUS` — map to display strings in code only.

### 3.2 Forbidden player-facing text

Do **not** use as default UI copy:

- `+30% Gate Damage` (balance may change; omit % unless Product/GPT explicitly approves)
- `gate_damage_bonus`, `siege_buff_active`, `damage_multiplier`, `modifier`, `stack`
- `win soon`, `victory soon`, `instant win`
- `core open`, `core vulnerable` (reserved for Core loop)
- `Gate Breached` for buff events (gate destruction only)
- Economy/EXP/Gold/score-win wording

### 3.3 Copy rules

1. No snake_case in player-facing UI.
2. No internal keys or technical modifier names.
3. Alerts/toasts ≤ 4 words where possible.
4. No modal. No tutorial overlay. No permanent full-width banner.
5. No spam — see §5 timing.
6. No duplicate message in HUD + toast + float for the same event.

### 3.4 Thai (future / optional — not required in 4C-B)

| EN | TH (suggested) |
|---|---|
| Siege Buff Active | บัฟปราการเปิดใช้งาน |
| Siege Buff Lost | บัฟปราการหายไป |
| Enemy Siege Buff Active | ศัตรูได้บัฟปราการ |
| Siege Bonus | โบนัสทำลายประตู |
| Siege Buff | บัฟปราการ |

---

## 4. Copy Priority Hierarchy

Only **one** primary top-center message at a time. Lower tiers must not override higher.

### Priority 1 — Gate/Core loop (always wins top-center)

- Attack the Gate
- Destroy Gate first
- Gate Breached
- Core is open
- Destroy the Core
- Defend your Core
- Victory / VICTORY
- Defeat / DEFEAT
- Result: Enemy core destroyed / Your core was destroyed

### Priority 2 — Capture (inside capture radius only)

- Capturing / Capturing Siege Ruins
- Contested
- Capture Paused
- Siege Ruins Captured
- Resource Camp Captured / etc.

### Priority 3 — Siege Buff state change (toast)

- Siege Buff Active
- Siege Buff Lost
- Enemy Siege Buff Active

### Priority 4 — Gate hit float

- Siege Bonus (enemy gate only, throttled)

### Priority 5 — Objective Score

- +8 Objective Score (and other +N) — on capture complete only

**Critical rule:** Siege Buff must **never** override Gate/Core top-center objective prompt. Persistent **Siege Buff** badge uses a **secondary slot** (not top-center).

---

## 5. HUD Behavior

### 5.1 Persistent badge (while player team has buff)

| Viewport | Display |
|---|---|
| **915×412** | Small icon + **Siege Buff** text (10–11 px) |
| **800×360** | **Icon only** preferred; text on state-change toast only |

**Placement:** Top-right area below/alongside Menu — **not** top-center. Suggested: x = width − 72, y = 48–56 compact. Max footprint 64×24 px.

**Hide when:** Buff inactive (neutral, contested, or enemy-owned).

### 5.2 State-change toasts

| Toast | When | Duration |
|---|---|---|
| Siege Buff Active | Blue gains uncontested ruins | 1.5–2 s |
| Siege Buff Lost | Blue loses buff (lost ruins OR contested) | 1.5–2 s |
| Enemy Siege Buff Active | Red gains uncontested ruins | 1.5–2 s |

- Top-center pill, max 50% screen width — **does not** replace Priority 1 label if gate/core prompt is showing; queue or defer 0.5 s if conflict.
- No modal. No full-width banner.

### 5.3 Gate hit float

- **Siege Bonus** at gate world position
- Only when bonus actually applied to gate damage
- Max once per **2–3 seconds** per gate
- Never on Core, hero, dummy, camps, watchtower

### 5.4 Explicitly out of scope for 4C-B UI

- Minimap
- Route arrows
- Lane tracker
- Edge indicators
- Tutorial overlay
- Permanent large banner
- Scoreboard redesign

---

## 6. Timing and Anti-Spam

| Event | Behavior |
|---|---|
| Gain buff (capture flip to blue, uncontested) | **Siege Buff Active** once |
| Lose buff (ownership lost) | **Siege Buff Lost** once |
| Ruins becomes contested (buff off) | **Siege Buff Lost** once (same copy — buff disabled) |
| Enemy gains buff | **Enemy Siege Buff Active** once |
| Buff already active | **No** repeat toast while state unchanged |
| Gate hit with buff | **Siege Bonus** float, cooldown ≥ 2 s (recommend 3 s) |
| Capture + buff same moment | Stagger: **Siege Ruins Captured** → **+8 Objective Score** (0.4 s) → **Siege Buff Active** (0.5 s) |
| Shared siege toast cooldown | ≥ 2 s between any Priority 3 siege toasts |

**Do not** show Siege Bonus on every gate hit. **Do not** show buff toast on every frame while standing in ruins.

---

## 7. State Clarity

Player must understand without minimap or tutorial:

| Question | How UX answers |
|---|---|
| Who owns Siege Ruins? | Owner sprite (neutral / blue / red) + contested overlay |
| Does my team have buff? | **Siege Buff** badge while active |
| Does enemy have buff? | **Enemy Siege Buff Active** toast on flip; red-owned sprite at ruins |
| Is gate bonus active now? | Badge on + occasional **Siege Bonus** on gate hits |

**Distinction from Core loop:**

| Concept | Copy | Never mix with |
|---|---|---|
| Siege Buff | Siege Buff Active, Siege Bonus | Core is open, Core vulnerable |
| Gate destroyed | Gate Breached | Siege Buff Active |
| Win target | Destroy the Core | Siege Buff, instant win |

---

## 8. UX Acceptance Criteria

| ID | Criterion | Pass |
|---|---|---|
| UX-AC1 | Player team gains buff → one-shot **Siege Buff Active** | ☐ |
| UX-AC2 | Player team loses buff → **Siege Buff Lost** once | ☐ |
| UX-AC3 | Enemy gains buff → **Enemy Siege Buff Active** once | ☐ |
| UX-AC4 | While player has buff → compact persistent **Siege Buff** indicator | ☐ |
| UX-AC5 | Gate/Core HUD higher priority than Siege Buff (top-center) | ☐ |
| UX-AC6 | **Siege Bonus** throttled (≥ 2 s), not every hit | ☐ |
| UX-AC7 | No siege copy on Core, hero, dummy, non-gate objectives | ☐ |
| UX-AC8 | No snake_case, debug keys, or modifier jargon visible | ☐ |
| UX-AC9 | 915×412 readable and playable | ☐ |
| UX-AC10 | 800×360 readable and playable | ☐ |

---

## 9. UX Scope Guard

**Out of scope for Phase 4C-B UX:**

- Tutorial overhaul, onboarding flow
- Minimap, edge indicators, route arrows, lane tracker
- Scoreboard redesign, economy/EXP/Gold UI, shop UI
- Bot command UI, respawn UI, vision/fog UI, timer win UI
- New banner system overhaul
- Watchtower / Forward Camp / Resource Camp payoffs
- Displaying `+30%` unless Product explicitly approves

**In scope:**

- Five approved strings + badge behavior + throttled gate float
- Contested-off feedback via **Siege Buff Lost**
- Mobile layout rules for 915×412 and 800×360

---

## 10. Handoff Notes

### Agent B (optional assets — max 2)

| Asset | Use |
|---|---|
| `ui_siege_buff_active.svg` | Persistent badge icon |
| `ui_gate_damage_bonus.svg` | Optional gate float accent — **Siege Bonus** text remains HUD/world text |

No new marker pack. No route arrows.

### Agent A (runtime — when authorized)

1. Use approved strings only from §3.1 — central copy map.
2. `siegeBuffActive(team)` per Agent C contested-off rule.
3. Apply bonus in unified damage path — enemy gate only.
4. Gate/Core HUD priority unchanged (`ObjectiveSystem` top-center).
5. Badge in secondary slot; toasts on state **edges** only.
6. No `+30%` in UI unless Product approves.
7. Regression: no snake_case; throttle **Siege Bonus**; UX-AC1–AC10.

### Agent F (future QA)

- Verify copy, spam cooldown, 915×412 and 800×360 layouts
- Verify contested disables buff + **Siege Buff Lost**
- Verify no siege text on core/hero hits
- Use `docs/phase-4c-b-mobile-siege-buff-checklist.md`

### Agent E (gate)

Use this doc + Agent C spec before approving 4C-B runtime PR.

---

## 11. Blocker Rules (Future Runtime)

Block merge if:

- Siege Buff UI blocks joystick or attack/skills
- Siege UI hides Gate/Core top-center prompt
- **Siege Bonus** spams every hit
- Copy implies win, economy, or score victory
- Siege copy on Core/hero damage
- snake_case visible
- 800×360 unplayable
- Modal or tutorial overlay added

---

## 12. Verdict (Spec)

**UX SPEC READY FOR REVIEW** — pending merge of this doc and Agent C PR #33 before runtime authorization.
