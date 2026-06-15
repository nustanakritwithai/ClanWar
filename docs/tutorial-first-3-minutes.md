# Tutorial — First 3 Minutes Flow

> **Agent D** — phased in-match teaching for Phase 4B/4C MVP. Not a separate
> tutorial mode; layered prompts + world markers during live play.
>
> References: `docs/player-onboarding-flow.md`, `docs/phase-4-gameplay-loop.md`,
> `docs/map-layout-spec.md`.

---

## 1. UX Goal

By **minute 3**, the player should independently:

- Move and attack on mobile.
- Use at least one skill intentionally.
- Follow the main route toward the enemy base.
- Understand **gate → core** as the siege objective chain.

Total active teaching time: **≤90 seconds** of prompts/markers; remainder is
practice travel.

---

## 2. Player Problem

| Phase | Risk |
|---|---|
| 0–10 s | Player stares at HUD, does not move |
| 10–30 s | Player moves but never attacks |
| 30–60 s | Player spams skills without target |
| 1–2 min | Player wanders into flank routes, gets lost |
| 2–3 min | Player reaches gate but does not know it is the objective |

---

## 3. Proposed UX Flow — Minute by Minute

### Phase 0 — Movement (0:00–0:10)

| Time | Trigger | UI | World | Dismiss when |
|---|---|---|---|---|
| 0:03 | No input | **Move forward** | Joystick pulse | Player moves 80 px |
| 0:06 | Moving | *(none)* | `path_arrow_blue` ×2 ahead on main | Player passes y < 3850 |

**Teaching limit:** 1 text prompt.

### Phase 1 — Attack (0:10–0:30)

| Time | Trigger | UI | World | Dismiss when |
|---|---|---|---|---|
| 0:12 | Near dummy OR no attack yet | **Tap Attack** | `attack_marker` on training dummy | First attack input |
| 0:20 | Attacking | **Hit the target** | Damage number feedback (existing combat) | 3 hits landed |
| 0:25 | *(optional)* | *(none)* | Remove dummy marker | Dummy HP < 90% |

If no dummy in path, place guidance on nearest hostile target or gate preview
when 4C adds gate damage.

**Teaching limit:** 2 text prompts max.

### Phase 2 — Skill (0:30–1:00)

| Time | Trigger | UI | World | Dismiss when |
|---|---|---|---|---|
| 0:32 | Attack learned | **Use a Skill** | Highlight `skill1` button ring (UI only) | Skill1 cast |
| 0:45 | Skill on CD | *(none)* | Cooldown overlay (existing) | — |
| 0:55 | Skill used | **Nice!** (0.8 s toast) | — | Auto-hide |

**Teaching limit:** 1 text prompt + 1 celebration toast.

**Do not** teach ultimate, war action, or items in first 3 minutes.

### Phase 3 — Main route push (1:00–2:00)

| Time | Trigger | UI | World | Dismiss when |
|---|---|---|---|---|
| 1:00 | Left spawn band | **Follow main path** | Arrow chain on main route to `blueFork` | y < 3500 |
| 1:20 | At fork | *(none)* | `lane_marker_blue` — left/right not highlighted | Player continues center |
| 1:40 | Mid approach | **Head to enemy gate** | `go-to-gate` marker toward `redGate` | Gate visible on screen |

**Teaching limit:** 2 text prompts. **Do not** explain flank routes — terrain
contrast only (per Agent C 4A).

### Phase 4 — Gate / Core objective (2:00–3:00)

| Time | Trigger | UI | World | Dismiss when |
|---|---|---|---|---|
| 2:00 | Gate on screen | **Attack the Gate** | `attack_marker` on `redGate` | Player attacks gate (4C) |
| 2:20 | Gate damaged | **Keep attacking** | `objective_warning` on gate (4C) | — |
| 2:40 | Gate destroyed (4C) | **Gate Breached!** | Gate → `objective_destroyed` | 3 s toast |
| 2:45 | Post-gate | **Destroy the Core** | `attack_marker` on `redCore` | — |
| 2:55 | Core visible | **This is the win target** | Core pulse highlight | Player attacks core |

**4B visual-only note:** Phases 2:20–2:55 use placeholder triggers (proximity
to gate/core) until 4C HP exists. Text still teaches mental model.

### End of minute 3 — Expected player state

```
Learned          Not yet required
───────          ────────────────
Move             Flank routes
Attack           Watchtower capture
Skill 1          Economy
Main route       Defend vs real enemy
Gate = wall
Core = win
```

---

## 4. Screen / Mobile Notes

| Rule | Detail |
|---|---|
| One prompt at a time | Queue discards older undismissed low-priority prompts |
| Priority order | Danger > Core vulnerable > Attack objective > Teaching |
| Skill highlight | Ring around button only — does not resize buttons |
| Toast position | Top-center, below objective prompt slot — y ≈ 48–64 px |
| Celebration | Max 0.8 s, non-blocking |
| 800×360 | Reduce to 2 teaching prompts per minute — merge "Follow main path" + "Head to gate" |

### Finger occlusion

During 0:30–1:00 skill phase, highlight appears on **skill1** — verify thumb
on joystick (left) does not cover skill cluster (right). No left-side UI added.

---

## 5. UX Copy

| Phase | EN | TH |
|---|---|---|
| Move | Move forward | เดินไปข้างหน้า |
| Attack | Tap Attack | กดโจมตี |
| Hit | Hit the target | โจมตีเป้าหมาย |
| Skill | Use a Skill | ใช้สกิล |
| Celebrate | Nice! | เยี่ยม! |
| Route | Follow main path | เดินทางหลัก |
| Gate approach | Head to enemy gate | ไปที่ประตูศัตรู |
| Gate attack | Attack the Gate | โจมตีประตู |
| Gate down | Gate Breached! | ประตูแตกแล้ว! |
| Core | Destroy the Core | ทำลายแกนหลัก |
| Win target | This is the win target | นี่คือเป้าหมายชนะ |

Full catalogue: `docs/ux-copy-and-message-guide.md`.

---

## 6. Implementation Brief for Agent A

1. **Guidance state machine** with phases: `move → attack → skill → route → objective`.
   Advance on player actions, not only timers.
2. **Timer ceiling**: if player idle 20 s in a phase, repeat current prompt once
   (max 1 repeat per phase).
3. **Proximity triggers** for gate/core phases using marker coordinates from
   `map-small-twin-fortress.ts` — e.g. gate teach when distance < 600 px.
4. **Skill button highlight**: UI-only stroke tween on `skill1` circle — depth 2003,
   no new input handlers.
5. **4B without 4C**: gate/core attack phases show prompts on proximity + attack
   input toward objective sprite bounds (even if no damage yet).
6. **4C hook**: replace proximity dismiss with `gateHpChanged` / `gateDestroyed` /
   `coreVulnerable` events.
7. Persist `tutorial_phase_reached` in session only — reset each match for MVP.
   First-match flag in `player-onboarding-flow.md` controls overlay density.
8. **Hide all teaching** when `SHOW_DEBUG_OVERLAY` is on AND user toggles
   `guidance_off` debug flag (for QA).

---

## 7. Asset Brief for Agent B

| Asset | Phase | Notes |
|---|---|---|
| `attack_marker` | 0:10–0:30, 2:00+ | Red chevron or crosshair — distinct from damage numbers |
| `go_to_marker` / `go-to-gate` | 1:40+ | Blue arrow on ground — not `path_arrow` (teach vs navigate) |
| `skill_highlight_ring` | 0:30–1:00 | UI-sized ring 72 px — gold, not skill cooldown gray |
| `objective_warning` | 2:20+ | Existing — gate under attack |
| `objective_destroyed` | 2:40+ | Existing — gate down state |
| `core_win_pulse` | 2:55+ | Subtle gold ring — 1.5 s loop, not capture_ring |

---

## 8. Design Dependency from Agent C

| Dependency | Owner | Status |
|---|---|---|
| Main route geometry | `map-layout-spec.md` §3.2 | ✅ |
| Gate/core coordinates | `objective-placement-spec.md` §3.1 | ✅ |
| Gate before core vulnerable | `phase-4-gameplay-loop.md` §4C | ✅ design, pending runtime |
| Dummy placement for attack teach | Level design / Agent A | Confirm near spawn or on main |
| Siege ruins as mid landmark only | `phase-4-gameplay-loop.md` | ✅ not win condition |

---

## 9. Deferred

- Teach flank routes, watchtower, camps, resources.
- Ultimate / war action / item tutorials.
- Multi-step combo tutorials.
- Video / illustrated guide screens.
- Bot-driven "enemy attacking" defend lesson.
- Post-match tutorial recap screen.

---

## 10. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| T1 | Player performs movement within 10 s (fresh tester) | ☐ |
| T2 | Player performs attack within 30 s | ☐ |
| T3 | Player casts skill1 within 60 s | ☐ |
| T4 | Player reaches y < 3000 via main route within 2 min | ☐ |
| T5 | Player can name "gate" and "core" as objectives by 3 min (playtest) | ☐ |
| T6 | ≤6 unique text prompts across full 3 min (no spam) | ☐ |
| T7 | No tutorial prompt blocks joystick or ATK on 915×412 | ☐ |
| T8 | Phases advance on player action, not timer alone | ☐ |
