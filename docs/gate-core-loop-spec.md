# Gate/Core Loop Spec — Phase 4B MVP

> **Agent C** — player-facing loop, objective stats, priorities, and UI states.
> Coordinates from `objective-placement-spec.md` — unchanged.

---

## 1. Design Goal

One clear siege loop: **break their gate, then their core**. Blue defends mirror
objectives at home base.

---

## 2. Player Experience

### Match flow (Blue player)

1. Spawn at `(1500, 3900)` on main route.
2. Walk north; Red Gate `(1500, 1000)` is the first combat objective.
3. Damage Red Gate until breached.
4. Red Core `(1500, 500)` becomes hittable.
5. Destroy Red Core → **Victory**.
6. If Blue Core `(1500, 3700)` is ever destroyed → **Defeat**.

### Objective priority (what player should do)

| Condition | Primary objective | HUD guidance icon (PR #18) |
|---|---|---|
| `redGate` intact | Attack Red Gate | `ui_attack_gate.svg` |
| `redGate` destroyed, `redCore` intact | Attack Red Core | `ui_core_vulnerable.svg` |
| `blueCore` under attack (future bot) | Defend Blue Core | `ui_defend_core.svg` |
| `blueGate` destroyed, `blueCore` vulnerable | Defend Blue Core | `ui_defend_core.svg` |

**MVP solo:** Only first two rows matter in practice. Defend states are wired
for future enemy damage — no bot required to ship 4B.

---

## 3. Layout / System Rules — Four objectives

| ID | Type | Team | Position | Initial combat state |
|---|---|---|---|---|
| `blueGate` | gate | blue | (1500, 3200) | `intact` |
| `blueCore` | core | blue | (1500, 3700) | `protected` |
| `redGate` | gate | red | (1500, 1000) | `intact` |
| `redCore` | core | red | (1500, 500) | `protected` |

### MVP stats (starting balance)

| Objective | maxHp | armor | regen | canMove | canAttack |
|---|---|---|---|---|---|
| Blue Gate | 1500 | 10 | 0 | no | no |
| Red Gate | 1500 | 10 | 0 | no | no |
| Blue Core | 2000 | 15 | 0 | no | no |
| Red Core | 2000 | 15 | 0 | no | no |

**Damage formula:** reuse `CombatSystem.calculateDamage(raw, armor)` — same as
heroes/dummy. Minimum 1 damage per hit.

### Hit detection

- Use marker `radius` from map data as objective body radius.
- Gate: radius **60** → display ~96–128 px sprite.
- Core: radius **90** → display ~120–160 px sprite.
- Anchor: **center** of `(x, y)` — matches debug circles today.

### Who can damage whom

| Attacker | Valid targets |
|---|---|
| Blue player | `redGate` (always while intact), `redCore` (only while `vulnerable`) |
| Red player / bot (future) | `blueGate`, `blueCore` (when vulnerable) |
| Friendly fire | **Off** — Blue cannot damage Blue objectives |

### Gate-before-Core rule

| Core | Protected while | Becomes vulnerable when |
|---|---|---|
| `redCore` | `redGate` not `destroyed` | `redGate` → `destroyed` |
| `blueCore` | `blueGate` not `destroyed` | `blueGate` → `destroyed` |

While `protected`, core **ignores all damage** (0 damage, no `under_attack`).

---

## 4. MVP Scope

**Spawn in world:**

- 4 objective entities with base sprites from PR #13.
- Remove debug text labels for these four (sprites replace circles).
- Keep debug circles **off** or alpha ≤ 0.08 in production path.

**Do not spawn gameplay entities for:**

- `forwardCampL/R`, `siegeRuins`, `resourceCampL/R`, `watchtower`, spawns.

`siegeRuins` may remain **map-only visual** (broken walls from 4A) — no HP.

---

## 5. Deferred

- Gate/core HP tuning beyond MVP table
- Objective regen / repair skills
- Gate damage stages (cracked art)
- Enemy bot attacking Blue Core
- Forward camp changing respawn
- Team score / match timer

---

## 6. Basic UI state — Agent A must show

### World-space (main camera)

| State | Base sprite | Overlay (PR #18) |
|---|---|---|
| Gate intact | `blue_gate` / `red_gate` | `objective_under_attack` while pressured |
| Gate destroyed | `objective_destroyed` or `gate_breached_*` | — |
| Core protected | `blue_core` / `red_core` | — |
| Core vulnerable | base core sprite | `core_vulnerable_blue` / `core_vulnerable_red` |
| Core under attack | base + vulnerable overlay | `objective_under_attack` |
| Core destroyed | `objective_destroyed` | — |

### UI-space (UI camera — one slot)

Show **one** priority guidance icon at a time (top-center or per Agent D
`mobile-hud-ux-spec.md`):

| Priority | Icon |
|---|---|
| 1 (defend) | `ui_defend_core` if `blueCore.underAttack` |
| 2 (attack core) | `ui_core_vulnerable` if `redGate` destroyed & `redCore` alive |
| 3 (attack gate) | `ui_attack_gate` if `redGate` intact |

Toast on transitions (copy from Agent D later; MVP may use icon only):

- Gate breached → `ui_gate_breached`
- Core vulnerable → `ui_core_vulnerable`

### Debug-only ( `SHOW_DEBUG_OVERLAY` )

Per objective line:

```text
redGate: intact hp=1420/1500
redCore: protected hp=2000/2000
priority: attack_gate
```

**No persistent HP bars** on mobile HUD in MVP — avoids clutter (Agent D may
revise in 4B.1).

---

## 7. HUD events (conceptual)

`ObjectiveSystem` emits:

| Event | When |
|---|---|
| `objectiveDamaged` | HP changed |
| `objectiveStateChanged` | any state transition |
| `gateBreached` | gate → destroyed |
| `coreVulnerable` | core protected → vulnerable |
| `objectivePriorityChanged` | player priority row changed |
| `matchVictory` | redCore destroyed |
| `matchDefeat` | blueCore destroyed |

---

## 8. Asset dependency — Agent B

### Required (merged — safe to use)

**PR #13** `public/assets/objectives/`:

- `blue_gate.svg`, `red_gate.svg`
- `blue_core.svg`, `red_core.svg`
- `objective_destroyed.svg`
- `objective_warning.svg` (optional flash; prefer PR #18 overlays)

**PR #18** `public/assets/objective-feedback/`:

- `gate_breached_blue.svg`, `gate_breached_red.svg`
- `core_vulnerable_blue.svg`, `core_vulnerable_red.svg`
- `objective_under_attack.svg`
- `ui_attack_gate.svg`, `ui_gate_breached.svg`, `ui_core_vulnerable.svg`, `ui_defend_core.svg`

### Future (do not block 4B)

**Agent B B2** `public/assets/player-guidance/**` — world arrow markers.
Use PR #18 HUD icons until B2 merges.

### Forbidden

- Do not load assets from unmerged branches.
- Do not create new SVGs in runtime PR.

---

## 9. Risk

| Risk | Mitigation |
|---|---|
| Player ignores core after gate | Priority HUD + `core_vulnerable` overlay |
| Four objectives + dummy = crowded UI | One guidance icon; no HP bars on HUD |
| Wrong sprite on wrong team | Pre-tinted textures; no runtime tint on blue/red |

---

## 10. Acceptance criteria (loop-level)

| # | Check |
|---|---|
| G1 | Player can destroy Red Gate using basic attack + skills |
| G2 | Red Core rejects damage until Red Gate destroyed |
| G3 | Red Core takes damage after gate breach |
| G4 | Red Core at 0 HP triggers Victory |
| G5 | Blue Core at 0 HP triggers Defeat (test via debug damage) |
| G6 | Priority icon matches game state |
