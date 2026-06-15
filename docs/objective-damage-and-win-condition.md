# Objective Damage & Win Condition — Phase 4B

> **Agent C** — how attacks and skills apply to objectives, and how matches end.
> Reuses `CombatSystem` math; does not change `skills.ts` / `heroes.ts`.

---

## 1. Design Goal

Objectives feel like **armored structures** — not extra heroes. Same combat
the player already uses should work on gates; cores are tougher.

---

## 2. Player Experience

- Basic attack on gate in range → gate HP drops, floating damage number.
- Skills that hit the gate area → gate HP drops (unless excluded below).
- Hitting core through gate while gate up → **no effect** (player learns order).
- Gate falls → core suddenly accepts damage (overlay + HUD change).
- Core hits zero → match ends with clear win/lose screen.

---

## 3. Damage pipeline

### 3.1 Order of evaluation (per player action)

```text
1. Resolve combat vs Training Dummy (unchanged)
2. If action has objective-capable damage:
     find valid enemy objectives in hit shape / range
3. For each valid target:
     if core and state == protected → skip
     if gate and state == destroyed → skip
     if friendly team → skip
     compute rawDamage → CombatSystem.applyDamage
4. Update objective state machine + visuals
5. If match ended → transition to ResultScene
```

### 3.2 Raw damage calculation

```text
base = skill.damage ?? player.attack
raw = base

if target.type == 'gate':
  raw *= (1 + (player.gateDamageBonus ?? 0))
  if skill.gateDamageBonus:
    raw *= (1 + skill.gateDamageBonus)

if target.type == 'core':
  // no gateDamageBonus on core in MVP
  raw = base
```

Round `raw` before armor: `Math.round(raw)`.

**Armor:** objective `armor` field (gate 10, core 15).

### 3.3 MVP stat reference

| Objective | maxHp | armor |
|---|---|---|
| Gate | 1500 | 10 |
| Core | 2000 | 15 |

Example — Guardian basic attack (assume attack 100) vs gate:

- raw = 100 × (1 + 0) = 100
- final = round(100 × 100/110) = **91**

Example — Warrior Gate Breaker (damage 180, gateDamageBonus 0.5) vs gate,
Warrior hero gateDamageBonus 0.2:

- raw = 180 × 1.2 × 1.5 = **324**
- final = round(324 × 100/110) = **295**

---

## 4. What can damage objectives

### 4.1 Basic attack (`melee_arc`)

| Target | Allowed | Condition |
|---|---|---|
| Enemy gate | ✅ | In attack arc + range; gate not destroyed |
| Enemy core | ✅ | Core `vulnerable`; in arc + range |
| Friendly | ❌ | Always blocked |

Use same `testMeleeArc` as dummy — objective center + radius as target.

### 4.2 Skills by runtime type

| Runtime type | Damages objectives? | Rule |
|---|---|---|
| `melee_arc` | ✅ | Same arc test vs objective body |
| `projectile` | ✅ | If projectile path intersects objective radius |
| `aoe_circle` | ✅ | If objective center within AoE circle + radius overlap |
| `heal` | ❌ | Never heals objectives |
| `legacy` | ✅ | If within `skill.range` of objective center |
| `guardian_war_taunt` | ❌ | Visual-only AoE (`isVisualOnlyAoe`) — no objective dmg |
| `priest_holy_circle` | ❌ | Heal/regen placeholder — no objective dmg |

### 4.3 Skill-specific overrides (MVP)

| Skill ID | Objective damage in 4B |
|---|---|
| `warrior_gate_breaker` | ✅ **Enable** — remove from `skipsObjectiveDamage`; melee arc + gate bonus |
| `mage_meteor_siege` | ✅ **Enable** — AoE circle + gate bonus on gates only |
| `guardian_war_taunt` | ❌ No damage |
| `priest_*` heal skills | ❌ No damage to objectives |
| All other damage skills | ✅ Default rules above |

**Gate Breaker / Meteor:** still damage dummy if in shape — objective check is
**additional**, not exclusive.

### 4.4 Friendly fire

| Action | Blue Gate/Core | Red Gate/Core |
|---|---|---|
| Blue player | ❌ | ✅ (if valid state) |
| Red player (future) | ✅ | ❌ |

### 4.5 Multiple targets

One swing may hit **dummy and objective** if both in shape — independent damage.

If multiple objectives in one AoE (should not happen for gate/core placement),
apply damage to all valid targets.

---

## 5. Win / lose conditions

### Victory (Blue player wins)

```text
redCore.currentHp <= 0  AND  redCore.combatState == destroyed
→ matchState = victory
→ ResultScene({ outcome: 'victory', reason: 'enemy_core_destroyed' })
```

### Defeat (Blue player loses)

```text
blueCore.currentHp <= 0  AND  blueCore.combatState == destroyed
→ matchState = defeat
→ ResultScene({ outcome: 'defeat', reason: 'friendly_core_destroyed' })
```

### Not in MVP

- Simultaneous core destruction tiebreaker (`rules.ts`)
- Match timer
- Surrender
- Gate-only win

### Testing defeat without bot

Debug-only command or overlay button: `dealDamage(blueCore, 100)` — **dev only**,
gated by `SHOW_DEBUG_OVERLAY`. Not a player-facing feature.

---

## 6. Protected core rule (damage gate)

```text
function canReceiveDamage(objective, rawDamage):
  if objective.combatState == 'destroyed': return false
  if objective.type == 'core' and objective.combatState == 'protected': return false
  if objective.type == 'gate' and objective.combatState == 'destroyed': return false
  return true
```

Log blocked hits at debug level only — no floating "-0" text.

---

## 7. MVP Scope

- Damage numbers: reuse `showCombatText` at objective position (world-space).
- Hit spark / impact VFX on objective when damaged (reuse combat VFX).
- Remove combat log suffix `(no gate dmg)` once objectives live.

**Out of scope:**

- Projectile blocking by gate collision geometry
- Line-of-sight
- Damage falloff by route (high ground)
- Item actives on objectives
- Economy rewards for objective damage

---

## 8. Deferred

| Feature | Phase |
|---|---|
| `gateDamage` item active | 4.x |
| Repair / heal gate skills | 4.x |
| Armor shred on objectives | 4.x |
| Damage while invulnerable buff | 4.x |
| EXP/gold for objective damage | 5+ |

---

## 9. Implementation brief — Agent A

1. Add `ObjectiveSystem.applyDamageFromCombat(context)` called from `MatchScene`
   after existing dummy resolution.
2. Remove or narrow `skipsObjectiveDamage` — only skills listed as ❌ above skip.
3. Pass `ownerTeam: 'blue'` from player attacks.
4. Floating text color: gate `#cfa14a`, core `#f4d35e` (from art style guide).
5. On match end: disable input; delay 0.5s optional; start ResultScene.
6. `ResultScene` already placeholder — pass `outcome` string for display.

### Reset / cleanup

| Event | Action |
|---|---|
| Menu → Match | New `ObjectiveSystem` instance; full HP reset |
| Scene shutdown | Destroy objective sprites, overlays, damage texts |
| Victory/defeat | Do not process further damage |

---

## 10. Acceptance criteria

| # | Check |
|---|---|
| D1 | Basic attack reduces Red Gate HP in range |
| D2 | Red Core at 0 damage while gate intact |
| D3 | Gate Breaker deals bonus damage to gate vs basic attack |
| D4 | Meteor damages gate in AoE; no gate bonus on core |
| D5 | Heal skills do not change objective HP |
| D6 | War Taunt does not damage objectives |
| D7 | Victory only when Red Core HP = 0 |
| D8 | Defeat when Blue Core HP = 0 (debug test) |
