# Objective State Machine Spec — Phase 4B

> **Agent C** — states, transitions, and match-level outcomes for Gate/Core
> objectives. Implementation-agnostic; Agent A maps to enums + system logic.

---

## 1. Design Goal

Every objective and the match itself have **predictable states** so visuals,
HUD, and debug readout always agree.

---

## 2. Player Experience

Player only needs to recognize **five player-facing ideas**:

1. Gate is up → attack gate
2. Gate is breaking → keep attacking
3. Gate is down → core is open
4. Core is breaking → finish the game
5. Game over — won or lost

Internal states (`protected`, `vulnerable`) map to these ideas.

---

## 3. Per-objective states

### 3.1 Gate states

| State | Meaning | Takes damage? | Visual |
|---|---|---|---|
| `intact` | Gate standing | Yes | `*_gate.svg` base |
| `under_attack` | Took damage recently | Yes | base + `objective_under_attack` |
| `destroyed` | Gate breached | No | `gate_breached_*` or `objective_destroyed` |

### 3.2 Core states

| State | Meaning | Takes damage? | Visual |
|---|---|---|---|
| `protected` | Allied gate still up | **No** | `*_core.svg` base only |
| `vulnerable` | Allied gate destroyed | Yes | base + `core_vulnerable_*` |
| `under_attack` | Took damage while vulnerable | Yes | base + vulnerable + `objective_under_attack` |
| `destroyed` | Core eliminated | No | `objective_destroyed` |

### 3.3 Match states

| State | Meaning |
|---|---|
| `in_progress` | Normal play |
| `victory` | Enemy core destroyed (Blue wins) |
| `defeat` | Friendly core destroyed (Blue loses) |

Match ends immediately on `victory` or `defeat` — no sudden death in 4B.

---

## 4. State transition diagrams

### Red Gate (enemy — primary player target)

```text
[intact] ──damage──► [under_attack] ──damage──► … ──hp=0──► [destroyed]
   ▲                        │
   └──── no damage 3s ──────┘ (revert to intact visual overlay clear)
```

On `[destroyed]`:

- Emit `gateBreached` (team=red)
- Set `redCore`: `protected` → `vulnerable`
- Emit `coreVulnerable` (team=red)
- Show `ui_gate_breached` then switch priority to `ui_core_vulnerable`

### Red Core

```text
[protected] ──gate destroyed──► [vulnerable]
[vulnerable] ──damage──► [under_attack] ──…──► [destroyed]
```

`[protected]` + any damage → **absorb 0**, no state change, optional debug log
`blocked: core protected`.

`[destroyed]` → `matchVictory` → `ResultScene` (win).

### Blue Gate / Blue Core (mirror)

Same machine with `team=blue`. Blue Core `[destroyed]` → `matchDefeat`.

**MVP:** No enemy deals damage to Blue objectives unless debug hook or future
bot calls `applyObjectiveDamage(attackerTeam='red', …)`.

### Under-attack timeout

- Enter `under_attack` on any damage that changes HP.
- Revert overlay when **no damage for 2.0 s** (back to `intact` or `vulnerable`).
- Do not revert `destroyed`.

---

## 5. Transition table (authoritative)

| From | Event | To | Side effects |
|---|---|---|---|
| gate `intact` | valid damage | `under_attack` | show under_attack overlay |
| gate `under_attack` | 2s no damage | `intact` | hide under_attack |
| gate `*` (not destroyed) | hp ≤ 0 | `destroyed` | breach VFX; unlock enemy core |
| core `protected` | allied gate destroyed | `vulnerable` | core_vulnerable overlay |
| core `protected` | damage | `protected` | **no-op** |
| core `vulnerable` | valid damage | `under_attack` | under_attack overlay |
| core `under_attack` | 2s no damage | `vulnerable` | hide under_attack |
| core `*` (not destroyed) | hp ≤ 0 | `destroyed` | end match |
| match `in_progress` | redCore destroyed | `victory` | ResultScene |
| match `in_progress` | blueCore destroyed | `defeat` | ResultScene |

---

## 6. MVP Scope

Implement state machine for **four objectives only**. No capture/contest/claim
states — those belong to watchtower/camp (deferred).

**Do not use** these PR #18 assets in 4B logic:

- `objective_claimed_*`, `objective_contested`, `capture_progress_pulse`,
  `capture_complete_burst`, `ui_capture_now`, `ui_objective_claimed`

---

## 7. Deferred states

| State | For |
|---|---|
| `contested` | Capture points |
| `capturing` | Progress ring |
| `claimed` | Ownership flip |
| `rebuilding` | Gate repair |
| `invulnerable_buff` | Skills/items |

---

## 8. Implementation brief — Agent A

### Conceptual data per objective

```text
ObjectiveRuntimeState {
  id: 'blueGate' | 'blueCore' | 'redGate' | 'redCore'
  type: 'gate' | 'core'
  team: 'blue' | 'red'
  x, y, radius
  maxHp, currentHp, armor
  combatState: intact | under_attack | destroyed | protected | vulnerable
  underAttackTimerMs: number
  sprite: Phaser.GameObjects.Image
  overlay: Phaser.GameObjects.Image | null
}
```

### Match state

```text
MatchObjectiveState {
  phase: in_progress | victory | defeat
  playerPriority: attack_gate | attack_core | defend_core
  objectives: Map<id, ObjectiveRuntimeState>
}
```

### Rules

1. Single `ObjectiveSystem` owns all transitions — no duplicate state in `MatchScene`.
2. Visual layer reads `combatState` — does not infer from HP alone.
3. On `MatchScene` shutdown: destroy sprites, overlays, timers, HUD icons.
4. On new match: reset all four to initial table in `gate-core-loop-spec.md`.

---

## 9. Asset mapping on transition

| Transition | World overlay change |
|---|---|
| → `under_attack` | show `objective_under_attack` |
| → gate `destroyed` | swap to `gate_breached_*` or destroyed base |
| → core `vulnerable` | show `core_vulnerable_*` |
| → core `destroyed` | `objective_destroyed`; clear overlays |
| clear under_attack | hide `objective_under_attack` only |

---

## 10. Acceptance criteria

| # | Check |
|---|---|
| SM1 | Red Core cannot leave `protected` before Red Gate `destroyed` |
| SM2 | `under_attack` clears after 2s idle |
| SM3 | `destroyed` is terminal — no HP regen back |
| SM4 | Match `victory`/`defeat` fires exactly once |
| SM5 | Menu → Match resets all states to initial |
