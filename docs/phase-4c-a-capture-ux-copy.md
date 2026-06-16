# Phase 4C-A Capture UX Copy Spec

> **Agent D** — canonical player-facing copy and mobile behavior rules for Phase
> 4C-A Objective Capture Foundation. **Docs only — not a runtime work order.**
>
> References: `docs/phase-4c-a-objective-capture-acceptance.md` (Agent C PR #28),
> `docs/phase-4b-b-ux-copy.md`, `docs/mobile-hud-ux-spec.md`,
> `docs/objective-placement-spec.md`.

---

## 1. UX Goal

A solo mobile player can **capture a neutral objective** without confusion:

- Know they are capturing
- Know when progress is contested or paused
- Know when capture completes and score increases
- Still understand the **primary Gate/Core loop** (unchanged from 4B-B)

Capture is a **side layer** — not the win condition in 4C-A.

---

## 2. Canonical English Copy

### 2.1 General capture (shared)

| Internal key (never shown) | Player-facing EN | Type | Max words |
|---|---|---|---|
| `capturing` | **Capturing** | HUD prompt (near objective) | 1 |
| `contested` | **Contested** | HUD prompt or world label | 1 |
| `captured` | **Captured** | Short toast | 1 |
| `objective_secured` | **Objective Secured** | Toast (generic fallback) | 2 |
| `enemy_capturing` | **Enemy Capturing** | Alert (future bot / contested) | 2 |
| `leave_area` | **Leave Area** | Float hint (optional, on exit mid-capture) | 2 |
| `capture_paused` | **Capture Paused** | HUD sub-state (only if pause shown) | 2 |

**Rules for general strings:**
- Never show internal keys (`capturing`, `contested`, `neutral`, `blue`, `red`).
- Never show `capture_progress`, `owner_state`, or score variable names.
- Alerts ≤ 5 words; HUD prompt ≤ 4 words when possible.

### 2.2 Resource Camp

| Event | Player-facing EN |
|---|---|
| Active capture | **Capturing Resource Camp** |
| Blue completes capture | **Resource Camp Captured** |
| Red completes capture (future) | **Enemy Resource Camp Captured** |

### 2.3 Watchtower

| Event | Player-facing EN |
|---|---|
| Active capture | **Capturing Watchtower** |
| Blue completes capture | **Watchtower Captured** |
| Red completes capture (future) | **Enemy Watchtower Captured** |

### 2.4 Siege Ruins

| Event | Player-facing EN |
|---|---|
| Active capture | **Capturing Siege Ruins** |
| Blue completes capture | **Siege Ruins Captured** |
| Red completes capture (future) | **Enemy Siege Ruins Captured** |

### 2.5 Forward Camp

| Event | Player-facing EN |
|---|---|
| Active capture | **Capturing Forward Camp** |
| Blue completes capture | **Forward Camp Captured** |
| Red completes capture (future) | **Enemy Forward Camp Captured** |

### 2.6 Score feedback

| Score awarded | Player-facing EN | Duration |
|---|---|---|
| +5 (Resource Camp, Watchtower) | **+5 Objective Score** | 1.5–2 s |
| +6 (Forward Camp) | **+6 Objective Score** | 1.5–2 s |
| +8 (Siege Ruins) | **+8 Objective Score** | 1.5–2 s |

**Rules:**
- Show score toast **once** per completed capture.
- Do not stack score toast with objective-name toast in the same frame — pick **one**:
  - Preferred: **Resource Camp Captured** then **+5 Objective Score** 0.3 s later, OR
  - Combined: **Resource Camp Captured (+5)** — max 4 words in combined form: **Camp captured +5**
- Default 4C-A: **typed capture toast** + separate **+N Objective Score** staggered 0.4 s (max 2 toasts in 2 s window).

### 2.7 Copy rules (all capture UI)

1. **No snake_case** in player-facing UI.
2. **No internal keys** as visible text.
3. **No technical wording** (`neutral`, `contested_state`, `progress_pct`).
4. **No long sentences** — one idea per line.
5. **No debug-like wording** (`hp=`, `owner=blue`, `radius=60`).
6. **No modal** in 4C-A.
7. **No repeated spam** — cooldown ≥ 2 s on contested/paused hints.
8. **No more than one objective prompt at a time** (capture OR gate/core, not both fighting for top-center).

---

## 3. Mobile Capture HUD Behavior

### 3.1 When capture UI appears

| Condition | Show |
|---|---|
| Player inside capture radius AND capture progressing | Capture prompt + progress |
| Player inside AND contested | **Contested** + frozen progress |
| Player inside AND paused (left and returned) | Resume progress; optional **Capture Paused** once on exit |
| Player outside all capture radii | **Hide** capture prompt — no global capture HUD |
| Gate/Core priority active (attack gate, destroy core) | Gate/Core HUD **wins** unless player is actively capturing (inside circle) |

**Rule:** Capture prompt appears **only when player is inside or immediately at edge of capture radius** (tolerance ≤ 8 px). Do not show capture text for distant objectives.

### 3.2 Layout — compact mobile (915×412 and 800×360)

```
┌─────────────────────────────────────────────────────────────┐
│ [stats]     [Gate/Core label OR Capture label]      [Menu]   │  top
│              [compact progress bar — only while capturing]     │
│                                                             │
│                    PLAYFIELD                                │
│                                                             │
│ [Joystick]                              [ATK / Skills]      │
└─────────────────────────────────────────────────────────────┘
```

| Element | Position | Size |
|---|---|---|
| Gate/Core label | Top-center (existing 4B-B) | 11–13 px compact |
| Capture label | **Same slot** as gate/core when inside capture zone | 11–13 px |
| Progress bar/ring | Directly below label, max width 40% screen | height 6–8 px bar OR 48 px ring |
| Score toast | Top-center below label, or near objective world position | 1 line, 1.5–2 s |

### 3.3 Priority when Gate/Core and capture compete

```
1. Victory / Defeat (match end)
2. Defend your Core
3. Destroy the Core / Attack the Gate
4. Active capture inside radius (Capturing / Contested)
5. Capture complete toast (brief)
```

If player is capturing Siege Ruins while HUD says **Attack the Gate**, capture label **replaces** gate label **only while inside ruins radius**. On exit, revert to gate label immediately.

### 3.4 Must not cover controls

- No capture UI in bottom 160 px.
- No capture UI in left 45% width below y = height − 180 (joystick zone).
- No capture UI in right 40% width below y = height − 180 (combat cluster).
- Progress ring on ground (world-space) is OK if `uiCamera.ignore` — must not render on UI camera over buttons.

### 3.5 Fit requirements

| Viewport | Requirement |
|---|---|
| **915×412** | Label + progress readable without overlapping Menu |
| **800×360** | Use 11 px font; shorten to **Capturing** + icon if typed name clips |

### 3.6 No stack with Gate/Core spam

- Do not show **Gate Breached** and **Capturing Watchtower** simultaneously.
- Gate/Core toasts suppress capture toasts for 2 s after fire.
- Capture complete toast suppresses gate/core toast for 1.5 s.

---

## 4. Visual Noise Limits (Strict)

| Limit | Rule |
|---|---|
| Top objective prompts | **Max 1** |
| Capture progress indicators (player-active) | **Max 1** |
| Short feedback toast/float per event | **Max 1** (score may follow 0.4 s later) |
| Route arrows | **None** |
| Minimap | **None** |
| Edge indicators | **None** |
| Lane icons / lane tracker | **None** |
| Tutorial overlay | **None** |
| Large center modal | **None** |
| Permanent text above every objective | **None** |

**World feedback:** `capture_ring` / progress at objective feet only while player is capturing that objective — hide when player leaves or capture completes.

---

## 5. Capture Progress UX

### Recommended behavior

| State | Visual | Copy |
|---|---|---|
| Progressing | Compact bar or ring fill (team color) | **Capturing** or typed name |
| Contested | Frozen bar + warning pulse | **Contested** |
| Paused (exited circle) | Bar holds or slowly decays | Optional **Capture Paused** once |
| Complete | Brief flash + owner color swap | **{Objective} Captured** |
| Owned (idle) | Blue/red sprite only — **no permanent bar** | *(silent)* |

### Design rules

- Progress visible **only while player is in zone** and capture not complete.
- Contested must look **different** from progressing (freeze + amber/warning, not same as fill).
- Avoid tiny text on the ring — use HUD label for words.
- Progress animation must **not** look like HP damage bar (no red flash, no `-N` numbers on ring).
- Capture complete feedback lasts **1.5–2 s** then clears.
- Fill duration 6–8 s per Agent C — bar speed matches, no fake instant capture.

---

## 6. Owner State Clarity

| State | Player read | Visual (reuse existing assets) |
|---|---|---|
| Neutral | "Not ours yet" | Neutral/gray variant |
| Blue owned | "We hold this" | Blue variant |
| Red owned | "Enemy holds this" | Red variant |
| Contested | "Can't capture now" | Warning pulse / contested overlay |
| Capturing | "Filling up" | Progress fill + team tint |
| Just captured | "Done" | Short toast + owner swap |

Do not show the words `neutral`, `blue`, `red` as UI text — color and sprite carry team.

---

## 7. Interaction Rules

| Rule | 4C-A MVP |
|---|---|
| Separate capture button | **No** — standing in circle is enough |
| Hold to capture | **No** — passive presence fill |
| Leave circle | Progress pauses (recommended) or slow decay |
| Contested | Progress frozen; show **Contested** so player knows why |
| "Broken" feeling | Must not occur when progress freezes — always explain Contested or Capture Paused |
| Re-capture owned objective | Same rules; toast uses **Captured** variant |

**Enemy capturing (solo MVP):** Logic exists; copy **Enemy Capturing** reserved for when enemy presence is simulated or bot added — do not spam in solo.

---

## 8. Thai Localization (Future — Optional)

**Not required in Phase 4C-A.** EN canonical above is implementation source.

| EN | TH (suggested) |
|---|---|
| Capturing | กำลังยึด |
| Contested | ถูกแย่ง |
| Captured | ยึดแล้ว |
| Objective Secured | ยึดเป้าหมายแล้ว |
| Enemy Capturing | ศัตรูกำลังยึด |
| Leave Area | ออกจากพื้นที่ |
| Capture Paused | หยุดยึดชั่วคราว |
| Capturing Resource Camp | กำลังยึดค่ายทรัพยากร |
| Resource Camp Captured | ยึดค่ายทรัพยากรแล้ว |
| Capturing Watchtower | กำลังยึดหอคอย |
| Watchtower Captured | ยึดหอคอยแล้ว |
| Capturing Siege Ruins | กำลังยึดซากป้อม |
| Siege Ruins Captured | ยึดซากป้อมแล้ว |
| Capturing Forward Camp | กำลังยึดค่ายหน้า |
| Forward Camp Captured | ยึดค่ายหน้าแล้ว |
| +5 Objective Score | +5 คะแนนเป้าหมาย |
| +6 Objective Score | +6 คะแนนเป้าหมาย |
| +8 Objective Score | +8 คะแนนเป้าหมาย |

---

## 9. Guidance Marker Policy

**Phase 4C-A is capture clarity only.**

**Do not add:**
- Route arrows
- Edge indicators
- Lane tracker
- Minimap
- Onboarding tutorial
- Full guidance marker system (`go_to_gate`, `attack_gate_marker`, etc.)

**Exception:** At most **one** temporary marker may be proposed **only if** playtest fails and Product/GPT approves later. **Default: no marker wiring.**

Capture teaching = **in-zone prompt + progress + toast** — not world arrows.

---

## 10. Implementation Brief for Agent A

1. Add capture copy map — internal keys → display strings from §2.
2. Show capture HUD **only** when `playerInCaptureRadius(objectiveId)`.
3. Gate/Core HUD from `ObjectiveSystem` keeps priority per §3.3.
4. On contested: freeze progress + set label **Contested** (no progress increment).
5. On exit: pause progress; optional one **Capture Paused** float with 2 s cooldown.
6. On complete: owner flip + typed toast + staggered **+N Objective Score**.
7. Reuse `capture_ring.svg` / existing contested visuals — no new asset category required.
8. Regression: assert no snake_case; capture label inside radius only; mobile viewports in checklist.

---

## 11. Asset Brief for Agent B

**No new assets required for 4C-A UX sign-off.**

Reuse: `capture_ring.svg`, `capture_progress_pulse.svg`, `objective_contested.svg`, team variants per objective type.

If contested vs capturing still confused in playtest, request **stronger contested pulse only** — not new marker types.

---

## 12. Pass / Caution / Blocker (UX)

**PASS:** Capture UI readable; no control overlap; copy clean; no spam; 915×412 and 800×360 playable.

**PASS WITH CAUTION:** 800×360 tight but usable; progress basic but functional; icon semantics imperfect but label clear.

**BLOCKER:** Joystick/skills blocked; capture text unreadable; progress hidden; snake_case visible; modal blocks combat; feedback spams; 800×360 unplayable.

---

## 13. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| U1 | All §2 canonical strings implemented | ☐ |
| U2 | Max 1 top prompt; capture only in radius | ☐ |
| U3 | Contested shows **Contested**, not silent freeze | ☐ |
| U4 | Score toast matches +5/+6/+8 values | ☐ |
| U5 | Gate/Core loop copy unchanged when not capturing | ☐ |
| U6 | No snake_case on mobile playtest | ☐ |
| U7 | No markers/minimap/lane UI added | ☐ |
