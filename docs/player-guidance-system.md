# Player Guidance System — MVP Spec

> **Agent D** — world-space and HUD markers that answer "what do I do next?"
> for Gate + Core siege loop. Phase 4B visual / 4C gameplay hooks.
>
> References: `docs/map-layout-spec.md` §3.8, `docs/objective-placement-spec.md`,
> `docs/mobile-hud-ux-spec.md`.

---

## 1. UX Goal

At any moment in the first match, the player has **one clear primary action**:

| Match phase | Primary action | Guidance type |
|---|---|---|
| Leaving spawn | Move up main route | Route arrow |
| Approaching mid | Continue on main | Route arrow (fade) |
| Gate in range | Attack enemy gate | Attack marker + prompt |
| Gate under fire | Keep attacking | Warning overlay |
| Gate destroyed | Attack enemy core | Attack marker + prompt |
| Own core threatened | Return / defend | Defend marker + alert |

---

## 2. Player Problem

Without guidance:

- Three routes look equally valid — player wanders on flanks.
- Gate and core silhouettes similar at mobile zoom.
- Player does not know **priority** when both gate and core visible.
- Under-attack state invisible until too late (4C).

---

## 3. Guidance Components (MVP)

### 3.1 Component catalogue

| ID | Type | Space | Priority | MVP |
|---|---|---|---|---|
| `route_guidance` | Path arrow chain | World | Low | ✅ first match |
| `go_to_gate` | Go-here marker | World | Medium | ✅ |
| `attack_gate` | Attack marker | World | High | ✅ |
| `attack_core` | Attack marker | World | High | ✅ after gate down |
| `defend_core` | Defend marker | World | Critical | ✅ when threatened |
| `under_attack` | Warning overlay | World | Critical | ✅ 4C |
| `gate_breached` | State toast + icon | HUD | High | ✅ 4C |
| `core_vulnerable` | State toast + icon | HUD | Critical | ✅ 4C |
| `objective_priority` | Next chip | HUD | Medium | ✅ |
| `ping_marker` | Player ping | World | — | ❌ deferred |
| `flank_arrow` | Side route hint | World | — | ❌ deferred |

### 3.2 `route_guidance`

- **Asset:** `path_arrow_blue.svg` (existing map pack).
- **Placement:** Main route spine only, x = 1500 ± 100, every ~400 px.
- **Count:** 3–5 arrows max visible; recycle as player advances.
- **Lifetime:** First 60 s OR until y < 3400, then fade over 1 s.
- **Rule:** Arrows point **up-map** (toward decreasing y). Never branch to flanks in MVP.

### 3.3 `go_to_gate`

- **Asset:** `go_to_marker` (Agent B feedback pack).
- **Anchor:** 200 px south of `redGate` (1500, 1200) on main route — leads into choke.
- **Show when:** Player crossed `blueFork` AND gate not destroyed AND distance > 800 px.
- **Hide when:** Gate on screen OR player within 400 px of gate.
- **Animation:** Gentle bob 4 px, 1.2 s loop.

### 3.4 `attack_gate` / `attack_core`

- **Asset:** `attack_marker` — red reticle or crossed swords, **not** skill impact VFX.
- **Anchor:** Center of objective sprite bounds.
- **Show when:**
  - `attack_gate`: gate in range AND gate HP > 0 (4C) OR proximity < 500 px (4B).
  - `attack_core`: gate destroyed AND core HP > 0 AND player within 600 px.
- **Hide when:** Objective destroyed or player leaves range for 5 s.
- **Sync:** HUD prompt matches marker target.

### 3.5 `defend_core`

- **Asset:** `defend_marker` — blue shield chevron.
- **Anchor:** `blueCore` (1500, 3700).
- **Show when:** `core_vulnerable` OR enemy within 800 px of blue core (4C bot defer:
  use scripted trigger in playtest).
- **Hide when:** Threat cleared 3 s.
- **Never show** during first 30 s push phase unless actual threat — avoid crying wolf.

### 3.6 `under_attack`

- **Asset:** `objective_warning.svg` (existing).
- **Anchor:** Above gate/core sprite, y offset −40 px world.
- **Show when:** Objective receiving damage (4C hook).
- **Pulse:** 0.5 s alpha 0.7–1.0.
- **Pair with HUD:** "Enemy Attacking Core" only when red team damages blue core — defer
  until bot exists; MVP shows on **player attacking gate** as feedback test.

### 3.7 `gate_breached` / `core_vulnerable`

| State | HUD | World | Duration |
|---|---|---|---|
| Gate breached | Toast + `icon_gate_breached` | Gate → `objective_destroyed.svg` | Toast 3 s |
| Core vulnerable | Toast + `icon_core_vulnerable` | Core pulse ring | Until core destroyed or re-secured |

**Gate breached** = enemy gate HP reached 0 — path to core opens.
**Core vulnerable** = own gate destroyed; enemy can damage core (4C lose path — teach only).

### 3.8 `objective_priority` indicator

HUD chip (see `mobile-hud-ux-spec.md`):

```
Priority stack (MVP):
1. Defend core (critical)
2. Attack core (gate down)
3. Attack gate
4. Move to gate
5. Move forward (default)
```

Only **top priority** shown. Never show two competing markers.

---

## 4. Screen / Mobile Notes

| Marker type | Max on screen | Size (world px) |
|---|---|---|
| Route arrows | 5 | 48–64 |
| Go / attack / defend | 1 each | 56–72 |
| Warning overlay | 1 per objective | 40–56 |

**Readability:** Markers must be visible at camera zoom 0.45–0.6 (typical mobile).
If marker smaller than player sprite, boost scale.

**Clutter cap:** Max **3** simultaneous guidance elements (e.g. 2 arrows + 1 attack).

---

## 5. UX Copy

Paired messages — full list in `docs/ux-copy-and-message-guide.md`.

| Guidance | EN | TH |
|---|---|---|
| Route | Follow main path | เดินทางหลัก |
| Go gate | Move to the Gate | เดินไปที่ประตู |
| Attack gate | Attack the Gate | โจมตีประตู |
| Attack core | Destroy the Core | ทำลายแกนหลัก |
| Defend | Defend the Core | ป้องกันแกนหลัก |
| Under attack | Under Attack! | กำลังถูกโจมตี! |
| Gate breached | Gate Breached | ประตูแตกแล้ว |
| Core vulnerable | Core Vulnerable | แกนหลักถูกเปิดแล้ว |

---

## 6. Implementation Brief for Agent A

1. **`GuidanceSystem`** module — subscribes to match events, outputs marker + HUD requests.
2. **Single source of truth** for `currentPriority` enum — HUD and world markers read same state.
3. **World markers:** pool and reuse; destroy on `MatchScene` shutdown.
4. **Line-of-sight optional:** MVP does not require — marker shows through fog (no fog yet).
5. **4B mode:** markers use proximity + `isFirstMatch`; no HP dependency.
6. **4C mode:** wire `onObjectiveDamaged`, `onGateDestroyed`, `onCoreVulnerable`.
7. **Do not** implement pathfinding — arrows are **hints along fixed spine**, not nav mesh.
8. **Do not** use `capture_ring` — no capture mechanic in MVP.
9. Fade conflicting markers over 200 ms when priority changes — no pop swap.
10. Expose `guidanceDebug` overlay for QA: show priority enum top-left when debug on.

---

## 7. Asset Brief for Agent B

### Required (Objective Feedback Asset Pack)

| Asset | Description | Distinct from |
|---|---|---|
| `go_to_marker.svg` | Blue ground chevron, points forward | `path_arrow_blue` (thicker, animated bob) |
| `attack_marker.svg` | Red reticle / sword icon, ground ring | Combat hit flash, skill AoE |
| `defend_marker.svg` | Blue shield, ground ring | Capture ring |
| `icon_gate_breached.svg` | HUD 32×32, broken portcullis | `objective_destroyed` (world) |
| `icon_core_vulnerable.svg` | HUD 32×32, cracked crystal + warning | `objective_warning` (world) |
| `icon_under_attack.svg` | HUD 32×32, amber bang | Skill impact |
| `icon_objective_claimed.svg` | HUD — gate/core destroyed by player | Defer to 4C win moment |

### Existing (reuse as-is)

| Asset | Use |
|---|---|
| `path_arrow_blue.svg` | Route guidance |
| `objective_warning.svg` | Under attack world overlay |
| `objective_destroyed.svg` | Gate destroyed state |
| `capture_ring.svg` | **Do not use** in MVP |

### Art direction

- Markers: **flat icon + 40% opacity ground disc** — readable on all 3 tile types.
- No text inside any marker SVG.
- Attack = warm red; defend/go = team blue; warning = amber.

---

## 8. Design Dependency from Agent C

| From Agent C | Guidance impact |
|---|---|
| Main route spine x 1300–1700 | Arrow placement constraint |
| Gate y = 1000 / 3200 | Go-to and attack anchor |
| Core y = 500 / 3700 | Win/lose anchor |
| Gate before core damage | Priority stack order |
| `path_arrow` first 60 s only | `map-layout-spec.md` §3.8 |
| Siege ruins not win target | No attack marker on ruins in MVP |

---

## 9. Deferred

| Item | Reason |
|---|---|
| Ping marker (player-initiated) | Needs input gesture + multiplayer semantics |
| Flank route arrows | Teach main first |
| Watchtower / camp markers | No gameplay |
| Minimap objective dots | Minimap deferred |
| Directional audio pings | No audio MVP |
| Smart path around walls | No pathfinding |

---

## 10. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| G1 | Player always has ≤1 primary HUD prompt indicating next action | ☐ |
| G2 | Attack marker appears on red gate when in range | ☐ |
| G3 | After gate destroyed, attack marker moves to red core | ☐ |
| G4 | Gate breached toast fires once per destruction | ☐ |
| G5 | Route arrows never appear on flank tiles in MVP | ☐ |
| G6 | Max 3 world guidance elements visible | ☐ |
| G7 | Markers distinct from skill VFX at a glance (playtest) | ☐ |
| G8 | Guidance clears on scene shutdown — no leak | ☐ |
