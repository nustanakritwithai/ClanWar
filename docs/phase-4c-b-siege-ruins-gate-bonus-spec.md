# Phase 4C-B: Siege Ruins Gate Damage Bonus — Design Spec

> **Agent C** — formal planning spec for the first capture objective payoff.
> **Planning only** — no runtime, assets, or scripts in this phase.
>
> **Base:** Phase 4C-A merged (`f7cbb94`) — Objective Capture Foundation closed.
> **Predecessor:** `docs/phase-4c-a-objective-capture-acceptance.md`,
> `docs/phase-4c-a-scope-guard.md`
> **Successor (blocked):** Phase 4C-C — score/timer win condition
>
> **Implementation status:** Phase 4C-B planning is authorized. Runtime
> implementation is **not** authorized until this spec and dependent planning
> PRs are merged or explicitly approved.

---

## 1. Phase Goal

Phase 4C-B delivers **one payoff mechanic** for Siege Ruins:

**A team that owns uncontested Siege Ruins deals bonus damage to the enemy Gate.**

This is the first meaningful reward after Phase 4C-A capture foundation. It does
not change win conditions, economy, bot AI, or the frozen Gate/Core loop from
Phase 4B.

**Judgment question for sign-off:** *"Does controlling mid-map make gate pushing
feel faster and more intentional — without breaking gate/core balance or adding
new systems?"*

---

## 2. Player-Facing Purpose

### Why Siege Ruins matters

Siege Ruins sits at the main map junction `(1500, 2100)` where all three routes
converge. In Phase 4C-A it is capturable and awards +8 objective score, but
score does not end the match. Without a payoff, mid-map capture feels optional.

Phase 4C-B makes ruins control **tactically relevant**: holding mid helps break
the enemy gate faster.

### Why it should help Gate pushing

The primary siege loop remains **Attack the Gate → Destroy the Core**. Bonus
damage applies only to the **enemy Gate**, giving attackers a measurable advantage
when they secure the battlefield before pushing.

### Why it should not affect Core

Core is the win target. Applying siege bonus to core would shorten matches
unpredictably and undermine the gate-before-core teaching loop. Core damage
continues to use base damage only — no `gateDamageBonus` stacking (unchanged
from Phase 4B).

### Why it should not create a new win condition

Match still ends only when an enemy core is destroyed (or friendly core destroyed
for defeat). Objective score remains feedback only. Siege Ruins bonus is a
**combat modifier**, not a victory trigger.

### Why it should not add economy yet

EXP, Gold, shop, and item interactions are deferred to later phases. Siege Ruins
payoff in 4C-B is **gate damage only** — no currency, no passive income, no
rewards on hit.

### Why contested state disables the buff

Contesting Siege Ruins should **immediately deny** the enemy buff even before
ownership flips. This makes midfield fights meaningful: standing in the ruins
circle to contest is a valid deny play. If the current owner kept the buff while
contested, mid-map fights would not reduce gate pressure until a full flip
completed — weakening the design intent.

**Contested-off rule (canonical):**

- owned + uncontested → buff **active**
- neutral → buff **off**
- contested → buff **off** for **both** teams

---

## 3. System Rule

### Config

```text
SIEGE_RUINS_GATE_BONUS = 0.30   // MVP
// Fallback if playtest gate TTK too low: 0.20
```

Value must be **config-driven** (e.g. `capture-objectives.ts` or a dedicated
`siege-bonus.ts` config module) — not hardcoded deep inside damage logic.

### Eligibility function

```text
siegeBuffActive(team) :=
  siegeRuins.owner === team
  AND siegeRuins.captureState !== 'contested'
```

### Application rule

```text
if siegeBuffActive(attackerTeam) AND target.type === 'gate' AND target.team !== attackerTeam:
  apply SIEGE_RUINS_GATE_BONUS to raw gate damage
else:
  no siege bonus
```

Only **`siegeRuins`** grants this bonus. Other capture objectives (Resource Camp,
Watchtower, Forward Camp) do not affect gate damage in 4C-B.

### Ownership rule

| `siegeRuins.owner` | Blue bonus vs Red Gate | Red bonus vs Blue Gate |
|---|---|---|
| `blue` (uncontested) | ✅ | ❌ |
| `red` (uncontested) | ❌ | ✅ |
| `neutral` | ❌ | ❌ |

Ownership is read from `CaptureSystem` snapshots (`getSnapshots()` → `id === 'siegeRuins'`).

### Contest rule

When `siegeRuins.captureState === 'contested'` (both teams present per 4C-A
contest definition), `siegeBuffActive` returns **false** for both teams regardless
of `owner`. Buff resumes only when contest clears and the owning team still holds
the point.

---

## 4. Damage Target Eligibility

### Allowed target

- **Enemy Gate only** (`redGate` for Blue attackers, `blueGate` for Red attackers)
- Gate must be in a damageable state (`intact` or `under_attack`; not `destroyed`)

### Forbidden targets

- Enemy Core — protected or vulnerable
- Friendly Gate or Core
- Heroes and Training Dummy
- All capture objectives (`siegeRuins`, camps, watchtower)
- Future minions / bots (rule holds when added)
- Future structures unless explicitly approved in a later phase

---

## 5. Damage Source Eligibility

All player damage paths that can damage a Gate must receive the **same** Siege
Ruins Gate Bonus through the **same** calculation path.

### In scope (must apply bonus when eligible)

- Basic attack (`melee_arc`)
- Melee skills (`melee_arc`, `legacy` in range)
- AoE skills (`aoe_circle`) — including Warrior Gate Breaker, Mage Meteor Siege
- Projectile / ranged damage that hits Gate

### Out of scope (never apply bonus)

- Heal skills
- Visual-only AoE (e.g. Guardian War Taunt)
- Non-damage skills
- Friendly fire (already blocked)

### Unified pipeline requirement

**AC8 / hard rule:** All gate-damage sources must call the same gate bonus
calculation (e.g. `computeRawDamage` or a shared `computeGateRawDamage` helper).

**Known gap on base:** `applyProjectileDamage` currently bypasses
`computeRawDamage` and applies `ctx.rawDamage` directly. Phase 4C-B runtime
**must** route projectile gate hits through the unified path so siege bonus,
hero `gateDamageBonus`, and skill `gateDamageBonus` stack consistently.

---

## 6. Damage Pipeline Expectation

### Order of evaluation (gate target only)

```text
1. Resolve base damage from attack or skill
2. If target.type === 'gate':
     raw = base
     raw *= (1 + player.gateDamageBonus ?? 0)      // existing hero bonus
     if skill.gateDamageBonus:
       raw *= (1 + skill.gateDamageBonus)          // existing skill bonus
     if siegeBuffActive(attackerTeam):
       raw *= (1 + SIEGE_RUINS_GATE_BONUS)         // NEW — 4C-B only
     raw = Math.round(raw)
3. final = CombatSystem.applyDamage(raw, gate.armor)
4. Show floating damage / feedback
```

Siege bonus applies **before armor**, in the same raw gate damage path as
existing gate bonuses per `objective-damage-and-win-condition.md` §3.2.

### Frozen in 4C-B

Do **not** change:

- Gate HP (1500) or Core HP (2000)
- Gate armor (10) or Core armor (15)
- Objective positions
- Protected-core rules
- Win/lose conditions
- `heroes.ts`, `skills.ts`, `items.ts` stat values

---

## 7. UI / UX Expectation

Direction aligns with Agent D assessment. Player-facing canonical copy:

| Event | Copy |
|---|---|
| Player team gains buff | **Siege Buff Active** |
| Player team loses buff | **Siege Buff Lost** |
| Enemy team gains buff (future / awareness) | **Enemy Siege Buff Active** |
| Optional hit feedback on gated bonus hit | **Siege Bonus** |

### UX rules

- Gate/Core HUD remains **highest priority** — Attack the Gate / Destroy the Core
- Siege Buff feedback is **secondary** — compact badge or short toast
- **No modal**, **no pause**, **no full tutorial overlay**
- Throttle gain/loss toasts (e.g. 2–3s cooldown) to prevent capture flip-flop spam
- **No snake_case** or internal debug keys in player UI
- **Do not** show `+30%` or numeric bonus in player UI unless Product explicitly
  approves later
- Optional **Siege Bonus** float on gate hit must be throttled — not every strike

### Mobile

Must remain readable at **915×412** and **800×360** without blocking joystick or
skill buttons. Buff chip sits in the objective HUD row — not a full-width banner.

---

## 8. Asset Expectation

Direction aligns with Agent B assessment. No new world art required.

### Recommended micro-pack (Agent B — after spec accepted)

| Asset key | Purpose | Priority |
|---|---|---|
| `ui_siege_buff_active.svg` | HUD chip when player's team has siege buff | Required / recommended |
| `ui_gate_damage_bonus.svg` | Optional hit or HUD accent for gate bonus active | Required / recommended |

### Optional (only if later needed)

- `ui_siege_buff_blue.svg`
- `ui_siege_buff_red.svg`

### Interim (before micro-pack merges)

`status/buff_attack.svg` may serve as a temporary HUD chip — not a permanent
substitute; replace when micro-pack lands.

### Not required in 4C-B

- Minimap icons
- Route arrows
- Edge indicators
- Lane tracker
- New world-space siege ruins overlays (4C-A sprites sufficient)

---

## 9. Acceptance Criteria

### AC1 — Blue owns uncontested ruins
If Blue owns Siege Ruins and it is uncontested, Blue deals bonus damage to Red Gate.

### AC2 — Red owns uncontested ruins
If Red owns Siege Ruins and it is uncontested, Red deals bonus damage to Blue Gate
(test hook / symmetry for future bot).

### AC3 — Neutral ruins
If Siege Ruins is neutral, neither team gets the bonus.

### AC4 — Contested ruins
If Siege Ruins is contested, neither team gets the bonus.

### AC5 — Gate only
Bonus applies only to enemy Gate.

### AC6 — Not Core
Bonus does not apply to Core (protected or vulnerable).

### AC7 — Not heroes / dummies / capture objectives
Bonus does not apply to heroes, Training Dummy, or capture objectives.

### AC8 — Unified damage path
All Gate damage sources (melee, AoE, range, projectile) use the same gate bonus
calculation path including siege bonus.

### AC9 — Gate/Core loop unchanged
Phase 4B-B flow unchanged: prompts, protected core, breach transition, result copy,
Menu ↔ Match reset for gate/core state.

### AC10 — Score is not win condition
Objective score remains feedback only; capturing ruins or gaining score does not
end the match.

### AC11 — No forbidden systems
No economy, EXP, Gold, shop, bot AI, respawn, vision, minimap, or timer win added.

### AC12 — Mobile 915×412
Layout playable; buff feedback readable; controls unobstructed.

### AC13 — Mobile 800×360
Compact layout playable; buff feedback readable.

### AC14 — No snake_case in player UI
No internal keys (`siege_buff_active`, `siege_ruins_bonus`, etc.) in HUD, toasts,
or floating text.

### AC15 — Reset clarity
Menu ↔ Match clears siege buff state; neutral ruins; baseline gate damage at
match start.

---

## 10. Regression Expectations

Future Agent A implementation must add or extend tests in `scripts/**` to verify:

- **R-1** Neutral ruins → gate damage equals baseline (no siege bonus)
- **R-2** Blue owns uncontested ruins → Red Gate damage increased by configured %
- **R-3** Red owns uncontested ruins → Blue Gate damage increased (test hook)
- **R-4** Contested ruins → bonus disabled for both teams
- **R-5** Bonus removed when ownership lost (flip to enemy or neutral)
- **R-6** Bonus never applies to Core
- **R-7** Bonus never applies to hero / dummy
- **R-8** Melee, AoE, and projectile gate hits all apply same bonus (AC8)
- **R-9** Menu ↔ Match ×3 → no stale buff; neutral ruins; baseline damage
- **R-10** `phase-4b-objective-regression.mjs` still passes
- **R-11** `phase-4b-b-clarity-regression.mjs` still passes
- **R-12** `phase-4c-a-capture-regression.mjs` still passes
- **R-13** Mobile 915×412 — buff chip readable; no control overlap
- **R-14** Mobile 800×360 — compact layout pass
- **R-15** No 4C-C timer/score win behavior introduced
- **R-16** Gate Breaker + siege bonus — document effective damage; flag if gate
  TTK below design target at `SIEGE_RUINS_GATE_BONUS = 0.30`

---

## 11. Scope Guard

### In scope

- Siege Ruins ownership → Gate Damage Bonus
- Contested disables bonus (contested-off rule)
- Config-driven `SIEGE_RUINS_GATE_BONUS`
- Unified gate damage pipeline (including projectile fix)
- Compact buff UI direction (copy + optional micro-pack keys)
- Regression criteria and design handoff to D / B / A / F / E

### Out of scope

- Runtime implementation (this PR is spec only)
- Asset file creation (Agent B separate PR)
- Economy, EXP/Gold, shop/items
- Bot AI
- Forward Camp respawn
- Watchtower vision/fog
- Resource Camp reward ticks
- Minimap, route arrows, edge indicators, lane tracker
- Timer/score win condition (Phase 4C-C)
- Sudden Death
- Multiplayer, account/login, clan/ranking/payment
- Tutorial overhaul
- New objective types
- Gate/Core HP, armor, or position changes
- Payoffs for non–Siege-Ruins capture objectives

---

## 12. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| +30% stacks with Warrior/Mage gate skills → gate melts too fast | High | Config fallback `0.20`; playtest before Ready; do not change gate HP |
| Projectile bypasses unified bonus path | Medium | AC8 + R-8; mandatory fix in Agent A PR |
| Buff toast spam on contest flip-flop | Medium | Cooldown on gain/loss; contested-off rule |
| Player confuses +8 score with siege buff | Medium | Distinct copy; score toast vs Siege Buff Active |
| Solo MVP — Red never attacks gate | Low | AC2/R-3 via test hook; symmetry for future bot |
| Scope creep into economy or 4C-C | High | Scope guard + Agent E final gate |
| Missing siege buff assets | Low | Interim `buff_attack.svg`; micro-pack before polish sign-off |

---

## 13. Handoff Notes

### Agent D (UX)

Prepare UX copy and mobile checklist for:

- **Siege Buff Active**
- **Siege Buff Lost**
- **Enemy Siege Buff Active**
- **Siege Bonus** (optional hit float)

Define placement: secondary chip in objective HUD row; throttle rules; 915×412 and
800×360 checklist. Do not show numeric `+30%` unless Product approves.

### Agent B (Assets)

Prepare optional **2-file micro-pack** only after this spec is accepted:

- `ui_gate_damage_bonus.svg`
- `ui_siege_buff_active.svg`

Optional later: `ui_siege_buff_blue.svg`, `ui_siege_buff_red.svg`. No minimap,
route, or world art.

### Agent A (Runtime)

**Do not start** until C / D / B planning PRs are merged or explicitly approved.

Requirements when authorized:

- Read `siegeRuins` owner + `captureState` from `CaptureSystem`
- Keep `SIEGE_RUINS_GATE_BONUS` config-driven
- Route **all** gate damage through unified bonus calculation (fix projectile gap)
- Wire minimal buff gain/loss feedback per Section 7
- Add regression tests per Section 10

### Agent F (QA)

Test all damage paths (melee, AoE, projectile), contested-off rule, ownership
flip, Menu ↔ Match reset, mobile layouts, and full gate/core + capture regression
suites. Playtest: does mid capture feel worth the detour without gate melting
too fast?

### Agent E (Final Gate)

Block runtime implementation until planning docs merged and scope guard confirmed.
Veto any PR that adds economy, timer win, bot, or gate/core stat changes.

---

## 14. Phase 4C-C Readiness Gate (Preview — Do Not Start)

Phase 4C-C (score/timer win condition) may open only after:

1. Phase 4C-B runtime polish merged
2. Agent D siege-buff UX pass
3. Agent F playtest pass (AC1–AC15)
4. Agent E final gate pass
5. Solo player understands ruins → gate bonus without confusion

---

## 15. References

- `docs/phase-4c-a-objective-capture-acceptance.md` — capture foundation (closed)
- `docs/phase-4c-a-scope-guard.md` — Siege Ruins bonus deferred to 4C-B
- `docs/phase-4b-b-objective-clarity-acceptance.md` — frozen gate/core clarity rules
- `docs/objective-damage-and-win-condition.md` — gate damage pipeline
- `docs/gate-core-loop-spec.md` — siege loop stats (frozen)
- `src/game/data/capture-objectives.ts` — `siegeRuins` definition
- `src/game/systems/CaptureSystem.ts` — owner / contest state
- `src/game/systems/ObjectiveSystem.ts` — `computeRawDamage`, gate damage paths
