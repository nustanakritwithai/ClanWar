# Phase 5A-3: Bot Brain Design Plan — Memory / Goal / Decision Layer

> **Agent D** — system design / AI architecture planning for the first
> *thinking* enemy in Clan Siege Arena. **Planning only — docs-only. No runtime,
> no `src/` changes, no implementation PR.**
>
> **Base:** Phase 5A-2 closed (`9a3f99c`) — Basic Red Warrior Bot with respawn,
> patrol, difficulty config, and feedback polish is live in the codebase.
>
> **Implementation status:** Phase 5A-3 = **DESIGN PLANNING ONLY —
> IMPLEMENTATION NOT STARTED.** Runtime requires this plan + explicit
> Product/GPT work order + Agent E scope gate before Agent A opens a PR.

---

## 1. Phase Goal

Today's bot (5A-1 + 5A-2) runs a fixed reflex loop:

```
idle/patrol → (player in range) → chase → wind-up → attack → recovery → dead → respawn
```

It reacts, but it does not **think**. The moment the player slips out of
`detectionRange`, the bot instantly forgets them and walks home. It never
investigates, never commits to a short plan, never weighs options.

**Phase 5A-3** adds a lightweight **Bot Brain** so the single bot can:

- **Perceive** the situation as a structured snapshot each tick.
- **Remember** what it just saw for a few seconds (short-term memory).
- Hold a **current goal** and switch it deliberately.
- Queue a **short plan** (1–3 steps) toward that goal.
- **Decide** via simple scoring *before* acting.

**Judgment question for sign-off:** *"Does the bot feel like it is reading the
fight and reacting with intent — chasing, losing you, hunting your last position,
giving up and going home — without breaking any 4B–5A-2 system or growing into a
full behavior-tree/GOAP engine?"*

This is still **one melee bot**. The brain makes the *existing* one smarter; it
adds no new combat verbs.

---

## 2. Design Constraints (hard rules)

**The brain must be a rule-based tactical layer.** Explicitly forbidden:

| Forbidden | Why |
|---|---|
| LLM / external API / token-based AI | Runs in-browser, offline, deterministic, testable |
| Machine learning / training / weights | No data pipeline, no nondeterminism |
| Large behavior tree | Overkill for one melee bot; hard to unit-test |
| Full GOAP planner | Combinatorial planning is out of scope for 5A-3 |
| Persistent memory | Memory is short-term only (seconds), cleared on respawn |

**Must be:** small, synchronous, pure where possible, deterministic given the
same perception input, and trivially snapshot-able for headless regression.

**Target budget:** the whole brain tick should be a handful of comparisons and
score additions — no allocation churn, no per-frame array building beyond a tiny
fixed plan queue.

---

## 3. Where the Brain Sits (responsibility split)

The brain **does not** replace the existing entity or system. It is a **pure
advisor**: `BotSystem` feeds it facts, the brain returns a decision, `BotSystem`
executes that decision using the **same** movement/attack code it already has.

| Module | Owns | Phase |
|---|---|---|
| `EnemyBot` | Entity: HP, body, visuals, local combat/visual state, feedback | 5A-1/5A-2 — **unchanged** |
| `BotSystem` | Lifecycle: spawn, update loop, respawn, patrol movement, difficulty, collisions, VFX hooks, integration with `MatchScene` | 5A-1/5A-2 — **lightly extended** |
| `BotBrain` (new) | Perception → Memory → Decision → Goal → Plan. **Reads** facts, **returns** intent. No Phaser, no physics, no rendering. | 5A-3 — **new** |

**Golden rule:** the brain **reads** the existing world through a perception
struct and **returns** a decision. It never mutates `EnemyBot`, never calls
physics, never touches other systems. `BotSystem` remains the only thing that
moves the body or applies damage — so all 5A-2 tuning, fairness clamps, and
freezes still apply automatically.

```
        ┌──────────────────────────────────────────────┐
        │ BotSystem.update(deltaMs)                      │
        │                                                │
        │  1. perception = buildPerception(bot, player)  │  ← facts in
        │  2. brain.tick(perception, deltaMs)            │
        │        ├─ memory.update(perception)            │
        │        ├─ decision.score(perception, memory)   │
        │        ├─ goal = pickGoal(scores)              │
        │        └─ plan = planFor(goal, perception)     │
        │  3. decision = brain.currentDecision()         │  ← intent out
        │  4. execute(decision)  // existing 5A-2 verbs   │
        │        chase / windup / attack / patrol /       │
        │        moveTo(point) / returnToSpawn / idle     │
        └──────────────────────────────────────────────┘
```

---

## 4. Brain Architecture (file proposal)

The prompt suggests six files. A six-file split is clean but slightly heavy for
**one** bot. **Agent D recommendation: a 4-file brain** that still cleanly
separates the thinking layers, with perception/decision/plan as data + pure
functions rather than separate stateful classes.

### Recommended (4 files)

| File | Responsibility |
|---|---|
| `src/game/ai/BotBrain.ts` | Orchestrator. Holds `BotMemory`, runs `tick()`, exposes `currentGoal()`, `currentPlan()`, `debugSnapshot()`. |
| `src/game/ai/BotPerception.ts` | `BotPerception` type + `buildPerception(...)` pure builder. No state. |
| `src/game/ai/BotMemory.ts` | `BotMemory` class — short-term facts with time-decay; `update()`, `clear()`, getters. |
| `src/game/data/bot-brain-config.ts` | All tunables: memory lifetimes, score weights, investigate radius, plan timeouts. |

Decision scoring and plan-building live as **pure functions inside `BotBrain.ts`**
(`scoreGoals()`, `planFor()`) — small enough not to warrant their own files, and
easier to unit-test as pure functions.

### Alternative (6 files, prompt's layout)

If Agent E / Agent A prefers maximum separation, split the two pure functions out:

| File | Responsibility |
|---|---|
| `src/game/ai/BotDecision.ts` | `scoreGoals(perception, memory, config) → GoalScores` |
| `src/game/ai/BotPlan.ts` | `planFor(goal, perception, config) → BotPlanStep[]` |

Both layouts are acceptable; **the 4-file layout is the default recommendation**.
Either way the layering (perception / memory / decision / goal / plan) is
identical — only file granularity differs. The handoff (§11) lists the 4-file
default with the 6-file split as an explicitly allowed variant.

---

## 5. Layer A — BotPerception

A **read-only snapshot** built fresh each tick from data the bot already has.
The brain consumes only this struct — it never reaches into `EnemyBot`,
`Player`, or other systems directly.

```ts
export interface BotPerception {
  // Spatial
  botX: number;
  botY: number;
  playerX: number;
  playerY: number;
  distanceToPlayer: number;
  angleToPlayer: number;            // radians, bot → player
  distanceFromSpawn: number;

  // Visibility / range gates (computed from existing config thresholds)
  playerInDetectionRange: boolean;  // distance <= detectionRange
  playerInAttackRange: boolean;     // distance <= attackRange
  playerWithinLeash: boolean;       // distance <= leashRange

  // Player motion (derived vs previous tick / memory)
  playerClosing: boolean;           // distance shrinking
  playerFleeing: boolean;           // distance growing
  playerSpeed: number;              // optional, magnitude of player velocity

  // Self
  hpRatio: number;                  // currentHp / maxHp
  cooldownReady: boolean;           // attack cooldown elapsed
  isStuck: boolean;                 // reuse 5A-2 stuck detection
  state: BotState;                  // current EnemyBot state

  // World
  matchActive: boolean;             // !resolved && phase === in_progress
}
```

**Design notes**

- `buildPerception()` is a **pure function** of `(bot, player, cfg, matchActive,
  prevDistance)`. Pure ⇒ trivially unit-tested without Phaser.
- `playerClosing` / `playerFleeing` derive from comparing `distanceToPlayer` to
  the previous tick's value (held in memory). A small deadband (e.g. ±2px)
  avoids jitter.
- All range booleans use the **existing** `bot-warrior.ts` thresholds — the
  brain introduces no new spatial constants beyond config in
  `bot-brain-config.ts` (e.g. `investigateArriveRadius`).

---

## 6. Layer B — BotMemory

Short-term, time-decaying facts. **No persistence.** Cleared on respawn.

```ts
export interface BotMemoryConfig {
  lastSeenLifetimeMs: number;     // how long a sighting stays "valid" (3000–8000)
  recentDamageWindowMs: number;   // "recently hurt" window
  recentMissWindowMs: number;     // "recently whiffed" window
  recentlyRespawnedMs: number;    // grace window after respawn
  goalHistoryLength: number;      // small ring buffer (e.g. 5)
}

export class BotMemory {
  lastSeenPlayerX: number | null;
  lastSeenPlayerY: number | null;
  lastSeenAtMs: number | null;        // timestamp of last valid sighting
  lastKnownPlayerDir: number | null;  // radians at last sighting
  prevDistanceToPlayer: number | null;// for closing/fleeing derivation

  lastDamageTakenAtMs: number | null;
  lastAttackAtMs: number | null;
  lastMissedAttackAtMs: number | null;
  lastStuckAtMs: number | null;
  recentlyRespawnedUntilMs: number | null;

  recentGoalHistory: BotGoal[];       // ring buffer, newest last

  update(perception, nowMs): void;    // refresh sighting + derived fields
  isLastSeenValid(nowMs): boolean;    // nowMs - lastSeenAtMs <= lifetime
  recentlyDamaged(nowMs): boolean;
  recentlyMissed(nowMs): boolean;
  clear(): void;                      // called on respawn
}
```

**Lifetime recommendation:** `lastSeenLifetimeMs` default **5000ms** (inside the
3–8s band). Long enough that a half-second detection blip doesn't wipe the bot's
knowledge; short enough that the bot eventually gives up and returns to patrol.

**Update rules**

- When `perception.playerInDetectionRange` is true → record `lastSeenPlayer{X,Y}`,
  `lastSeenAtMs = now`, `lastKnownPlayerDir = angleToPlayer`.
- Always store `prevDistanceToPlayer` for next tick's closing/fleeing derivation.
- `clear()` nulls everything and is invoked by `BotSystem.respawnBot()` so a
  fresh bot never "remembers" a pre-death chase.

**Time source:** pass `nowMs` (the scene clock) into the brain so memory is
driven by the same clock the regression can advance deterministically — never
`Date.now()`.

---

## 7. Layer C — BotGoal

The bot's **current intent** — exactly one active at a time.

```ts
export type BotGoal =
  | 'patrol_area'           // 5A-2 idle wander
  | 'chase_player'          // pursue a visible player
  | 'attack_player'         // in range + cooldown ready
  | 'investigate_last_seen' // player lost but memory valid → go look
  | 'recover_after_attack'  // post-swing pause / reposition
  | 'return_to_spawn';      // stuck or beyond leash → go home
// future (documented, NOT in 5A-3):
//   | 'cautious_retreat'   // low-HP kiting — gated behind a future flag
```

**Mapping to existing 5A-2 states.** Goals are a *thinking* layer above the
existing `BotState` execution layer — they do not replace it:

| Goal | Drives existing execution |
|---|---|
| `patrol_area` | existing patrol movement |
| `chase_player` | existing chase seek (with fairness clamp) |
| `attack_player` | existing wind-up → attack → recovery |
| `recover_after_attack` | existing recovery hold |
| `investigate_last_seen` | **new tiny verb:** `moveTo(lastSeen)` then scan, reusing chase movement |
| `return_to_spawn` | **new tiny verb:** `moveTo(spawn)` reusing patrol/seek movement |

The only genuinely new *execution* primitive is **`moveTo(point)`** — a
seek-to-world-point that both `investigate_last_seen` and `return_to_spawn`
reuse. Everything else is already implemented in 5A-2.

---

## 8. Layer D — BotPlan

A tiny **ordered queue of 1–3 steps** toward the current goal. Plans keep the
bot from flip-flopping every tick: it commits to a few steps, then re-decides.

```ts
export type BotPlanStep =
  | 'face_player'
  | 'move_toward_player'
  | 'windup_attack'
  | 'hold_recover'
  | 'move_to_last_seen'
  | 'scan_area'
  | 'move_to_spawn'
  | 'resume_patrol';

export interface BotPlan {
  goal: BotGoal;
  steps: BotPlanStep[];     // length 1–3
  stepIndex: number;
  stepDeadlineMs: number | null; // safety timeout so a step can't wedge forever
}
```

**Canonical plans (per goal):**

| Goal | Plan (≤3 steps) |
|---|---|
| `chase_player` | `face_player → move_toward_player → windup_attack` |
| `attack_player` | `face_player → windup_attack` |
| `recover_after_attack` | `hold_recover → (re-decide)` |
| `investigate_last_seen` | `move_to_last_seen → scan_area → resume_patrol` |
| `return_to_spawn` | `move_to_spawn → resume_patrol` |
| `patrol_area` | `resume_patrol` |

**Rules**

- A plan **completes** when its last step finishes, or its `goal` no longer wins
  the decision score (interrupt), or `stepDeadlineMs` elapses (anti-wedge).
- `scan_area` = stand at the last-seen point for a short beat (e.g. 600–1000ms)
  facing `lastKnownPlayerDir`; if the player reappears in detection during scan,
  the next decision naturally flips to `chase_player`.
- Plans never exceed 3 steps in 5A-3 (scope guard). No nested/recursive plans.

---

## 9. Layer E — BotDecision (scoring)

Each tick, score every candidate goal with **simple additive rules**, then pick
the highest. Scores are plain numbers; weights live in `bot-brain-config.ts`.

```ts
export interface BotBrainConfig {
  weights: {
    attackInRange: number;        // e.g. 100
    chaseVisible: number;         // e.g. 70
    chaseClosingBonus: number;    // e.g. +10 if player closing
    investigateValidMemory: number;// e.g. 50
    recoverRecentAttack: number;  // e.g. 90 (time-bounded)
    returnStuck: number;          // e.g. 80
    returnTooFar: number;         // e.g. 75
    patrolBaseline: number;       // e.g. 10 (floor so something always wins)
  };
  investigateArriveRadius: number; // px to consider "reached" last-seen
  scanDurationMs: number;
  planStepTimeoutMs: number;
  memory: BotMemoryConfig;
}
```

**Scoring sketch (pure function `scoreGoals(perception, memory, now, cfg)`):**

```
score.patrol_area            = patrolBaseline
score.return_to_spawn        = (isStuck ? returnStuck : 0)
                             + (!playerWithinLeash && distanceFromSpawn > leash ? returnTooFar : 0)
score.recover_after_attack   = memory.recentlyMissed(now) || state===recovery ? recoverRecentAttack : 0
score.attack_player          = (playerInAttackRange && cooldownReady) ? attackInRange : 0
score.chase_player           = playerInDetectionRange
                                 ? chaseVisible + (playerClosing ? chaseClosingBonus : 0)
                                 : 0
score.investigate_last_seen  = (!playerInDetectionRange && memory.isLastSeenValid(now))
                                 ? investigateValidMemory : 0

pick = argmax(score)   // ties broken by a fixed priority order:
// attack > recover > chase > investigate > return_to_spawn > patrol
```

**Why these relations matter (and are testable):**

- `attackInRange (100) > chaseVisible (70)` → in range + ready always attacks.
- `chaseVisible (70) > investigateValidMemory (50)` → a visible player always
  beats chasing a stale memory.
- `investigateValidMemory (50) > patrolBaseline (10)` → lost-but-remembered →
  go investigate, not patrol.
- Memory expiry drops `investigate` to 0 → `patrol_area` wins → bot goes home.
- `returnStuck/returnTooFar (80/75)` outrank chase/investigate → safety first
  when wedged or off-leash.
- `recoverRecentAttack (90)` briefly outranks chase so the bot finishes its
  recovery beat (no rhythm-less spam) before re-engaging.

All weights are **config**, so tuning never touches logic.

---

## 10. Integration Plan (how BotSystem uses the brain)

Minimal, additive changes to `BotSystem` (the only allowed runtime edit besides
new files):

1. **Construct** a `BotBrain` in the `BotSystem` constructor.
2. In `update(deltaMs)`, when alive and match active:
   - `const perception = buildPerception(this.bot, player, this.cfg, matchActive, prevDist)`
   - `this.brain.tick(perception, sceneNowMs, deltaMs)`
   - read `this.brain.currentGoal()` / current plan step → **map to the existing
     execution verbs** (chase/windup/attack/patrol/moveTo/returnToSpawn).
3. **Feed events back** to memory via the brain: on bot taking damage, on a
   missed swing (wind-up resolved with no hit), on stuck detection, on respawn
   (`brain.onRespawn()` → `memory.clear()` + reset plan).
4. **Difficulty untouched:** the brain decides *what* to do; the existing
   difficulty-scaled effective stats + fairness clamp still govern *how fast/hard*.

**Strictly unchanged by 5A-3:** player stats, player damage formula, the 5A-2
bot tuning (HP/attack/ranges/cooldown/wind-up/recovery/respawn/patrol),
difficulty profiles, Gate/Core, Capture, Siege Buff, Timer/Score, ResultScene,
package/deploy config. The brain **reads** existing data; it does not move
existing systems into itself.

**The brain must degrade safely:** if perception says `!matchActive`, the brain
returns a no-op/`patrol_area`-floor decision and `BotSystem` applies the same
freeze it already does. A dead bot's brain is idle until `onRespawn()`.

---

## 11. Implementation Handoff for Agent A

> **This section is the work order Agent A should follow when (and only when)
> Phase 5A-3 runtime is authorized.**

### Files to CREATE

- `src/game/ai/BotBrain.ts` — orchestrator + pure `scoreGoals()` + `planFor()`
- `src/game/ai/BotPerception.ts` — `BotPerception` type + `buildPerception()`
- `src/game/ai/BotMemory.ts` — `BotMemory` class
- `src/game/data/bot-brain-config.ts` — `BOT_BRAIN_CONFIG` defaults
- `scripts/phase-5a-bot-brain-regression.mjs` — brain regression (see §12)

*(Allowed variant: additionally split `src/game/ai/BotDecision.ts` and
`src/game/ai/BotPlan.ts` out of `BotBrain.ts` — the 6-file layout. Pick one.)*

### Files ALLOWED to EDIT

- `src/game/systems/BotSystem.ts` — construct brain, call `tick()`, map decision
  to existing verbs, add `moveTo(point)` seek primitive, feed memory events,
  expose `getBrainSnapshot()` for tests.
- `docs/project-status.md`, `docs/open-pr-dashboard.md`, `docs/agent-worklog.md`

### Files that MUST NOT change

`EnemyBot.ts` (unless a tiny read-only getter is unavoidable), `Player.ts`,
`ObjectiveSystem.ts`, `CaptureSystem.ts`, `SiegeBuffSystem.ts`,
`MatchTimerSystem.ts`, `ResultScene.ts`, `bot-warrior.ts` tuning values,
`package.json` / lock, deploy config, `public/assets/**`.

### Suggested implementation order

1. `bot-brain-config.ts` (constants first).
2. `BotPerception.ts` (pure builder) + unit-style assertions.
3. `BotMemory.ts` (time-decay, clear-on-respawn).
4. `BotBrain.ts` — `scoreGoals()` → `pickGoal()` → `planFor()` → `tick()`.
5. Wire into `BotSystem.update()`; add `moveTo()` + `getBrainSnapshot()`.
6. `phase-5a-bot-brain-regression.mjs`.
7. Re-run 5A-2 + 4E + 4D + 4C-C; manual mobile pass at 915×412 and 800×360.

### Expected runtime behavior (after implementation)

- Sees player → `chase_player`.
- Player flees past `detectionRange` → bot **remembers** last-seen and switches
  to `investigate_last_seen`, walking to that point.
- Reaches last-seen, scans, player not found, memory expires → `return` to
  `patrol_area`.
- Stuck or beyond leash → `return_to_spawn`, then patrol.
- Just swung → `recover_after_attack` before re-deciding (keeps attack rhythm).
- Does **not** forget the player on a sub-second detection blip.
- All 5A-2 behaviors (attack timing, dodge window, respawn, patrol, difficulty,
  feedback) still work because the brain only chooses among existing verbs.

### Expected regression list

`phase-5a-bot-brain-regression.mjs` (§12) **plus** unchanged passes of
`phase-5a-bot-regression.mjs` (20/20), `phase-4e` (38/38), `phase-4d` (17/17),
`phase-4c-c` (18/18).

### Exact scope guard

One bot. Rule-based only. Short-term memory only. No LLM/ML/API, no big behavior
tree, no full GOAP, no multi-bot, no objective/Gate/Core/capture AI, no ranged
bot, no skills, no persistent memory, no economy/minimap/multiplayer, no Phase
5B/5C.

---

## 12. Regression Plan (`phase-5a-bot-brain-regression.mjs`)

Headless Puppeteer, same in-page scene-restart harness as the existing bot
script. Brain state is read via a new `botSystem.getBrainSnapshot()` debug hook
(perception + memory + current goal + plan + scores). Memory/time tests use the
scene clock so they are deterministic.

| ID | Test |
|---|---|
| B1 | Perception snapshot contains player distance / visibility / hpRatio / cooldownReady |
| B2 | Memory records last-seen player position when player enters detection |
| B3 | Memory `isLastSeenValid` expires after `lastSeenLifetimeMs` |
| B4 | Visible player → `chase_player` goal selected |
| B5 | Player in attack range + cooldown ready → `attack_player` goal selected |
| B6 | Player lost but memory valid → `investigate_last_seen` goal selected |
| B7 | Memory expired → `patrol_area` goal selected (returns to patrol) |
| B8 | Stuck state → `return_to_spawn` goal selected |
| B9 | Beyond leash / too far from spawn → `return_to_spawn` selected |
| B10 | Plan queue executes 1–3 steps in order (stepIndex advances) |
| B11 | Recent missed attack raises `recover` score / affects next decision |
| B12 | Bot still damages player **only after** wind-up (5A-2 preserved) |
| B13 | Player can still dodge by leaving range during wind-up (5A-2 preserved) |
| B14 | Respawn clears memory + plan (no stale last-seen after respawn) |
| B15 | Menu ↔ Match reset ×3 → no duplicate bot/brain, single instance |
| B16 | Mobile 915×412 + 800×360 readable, brain runs, controls not blocked |
| B17 | `phase-5a-bot-regression.mjs` still 20/20 |
| B18 | `phase-4e` 38/38, `phase-4d` 17/17, `phase-4c-c` 18/18 |

---

## 13. Acceptance Criteria (Phase 5A-3)

Phase 5A-3 passes when:

| # | Criterion |
|---|---|
| AC1 | `BotBrain` exists as a clear, separate module/layer (not folded into EnemyBot/BotSystem) |
| AC2 | Bot builds a perception snapshot each tick |
| AC3 | Bot records short-term memory |
| AC4 | Bot remembers last-seen player position for a limited, configured time |
| AC5 | Bot switches goal based on decision score |
| AC6 | Bot investigates last-seen position when the player leaves detection |
| AC7 | Bot returns to patrol when memory expires |
| AC8 | Bot returns to spawn when stuck or beyond leash |
| AC9 | 5A-2 attack behavior (wind-up/attack/recovery, dodge window) still works |
| AC10 | 5A-2 respawn / patrol / difficulty / feedback still work |
| AC11 | No duplicate bot/brain after Menu ↔ Match reset |
| AC12 | Mobile 915×412 readable, controls not blocked |
| AC13 | Mobile 800×360 readable, controls not blocked |
| AC14 | Gate/Core/Capture/Siege Buff/Timer/Score unchanged (regressions pass) |
| AC15 | No LLM/ML/API/behavior-tree/GOAP; deterministic, in-browser, testable |

---

## 14. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Goal thrash (flip every tick) | Medium | Plan commitment (1–3 steps) + tie-break priority + small score deadbands |
| Brain wedges on a step | Medium | `planStepTimeoutMs` deadline per step → force re-decide |
| Memory leak across respawn | High | `brain.onRespawn()` → `memory.clear()` + reset plan; tested by B14 |
| Investigate walks into a wall | Medium | Reuse 5A-2 stuck/stray guards; `return_to_spawn` outranks investigate when stuck |
| Brain drifts into moving the body itself | High | Hard rule: brain returns intent only; `BotSystem` owns all movement/damage |
| Scope creep toward GOAP/behavior tree | High | §2 forbidden list + Agent E scope gate + 3-step plan cap |
| Nondeterministic tests (wall-clock) | Medium | Drive memory by scene clock `nowMs`, not `Date.now()` |
| Difficulty interaction surprises | Low | Brain chooses *what*; difficulty governs *how* — orthogonal, unchanged |

---

## 15. Phase 5B / 5C Preview (Do NOT implement)

Documented for future only — explicitly **out of scope** for 5A-3:

- **5B:** bot pushes Gate/contests capture, 2–3 bots, simple squad coordination.
- **5C:** class variety, skill bots, `cautious_retreat` low-HP behavior, ranged
  bot perception (line-of-fire), light influence map.

`cautious_retreat` and `playerSpeed`/line-of-sight perception fields are
**designed-but-deferred** hooks; 5A-3 leaves them as documented future flags.

---

## 16. Verdict

**BOT BRAIN DESIGN PLAN READY FOR AGENT A IMPLEMENTATION**

Planning complete. Runtime **not started**, **no `src/` changes**. Awaiting merge
of this plan + explicit Product/GPT work order + Agent E scope gate before Agent
A opens the Phase 5A-3 implementation PR.
