# Phase 5A-1: Basic Enemy Bot MVP — Design Plan

> **Agent D** — system design / UX + gameplay planning for the first autonomous
> enemy in Clan Siege Arena. **Planning only — not a runtime work order.**
>
> **Base:** Phase 4E closed (`8767580`) — full objective, siege, timer, combat
> feel, and visual reskin live.
>
> **Implementation status:** Phase 5A = **DESIGN PLANNING ONLY — IMPLEMENTATION
> NOT STARTED**. Runtime requires explicit Product/GPT work order after this
> plan merges and Agent E scope gate.

---

## 1. Phase Goal

Clan Siege Arena today has a solo player, objectives, capture, Siege Buff, timer,
score win, and visual reskin — but the battlefield feels **empty** without an
opponent that moves and fights back.

**Phase 5A-1** adds one **Basic Enemy Bot** that:

- Spawns on the map
- Detects the player
- Chases the player
- Attacks in melee range
- Takes damage and dies
- Resets / respawns simply

**Judgment question:** *"Does the player feel pressure from a living enemy without
breaking Gate, Core, capture, Siege Buff, timer, or score systems?"*

---

## 2. Design Target — Bot MVP Summary

| Capability | MVP |
|---|---|
| Spawn in match | ✅ 1 bot |
| See / detect player | ✅ distance check |
| Chase player | ✅ direct move toward player |
| Attack player in range | ✅ melee, cooldown |
| Take player damage | ✅ same `CombatSystem` |
| HP + death | ✅ |
| Simple reset / respawn | ✅ timer-based at spawn |
| Objective interaction | ❌ **out of scope** |
| Gate/Core attack | ❌ **out of scope** |
| Capture points | ❌ **out of scope** |
| Skills / projectiles | ❌ **out of scope** |

---

## 3. Scope Guard

### Forbidden in Phase 5A-1

- Multiple bots / bot squads
- Full strategy AI, behavior trees, complex pathfinding
- Bot captures objectives
- Bot attacks Gate/Core tactically
- Multiple bot classes
- Bot skill kits (multi-skill)
- Minimap, economy, EXP, Gold, shop, ranking, rewards
- Multiplayer, login, clan, payment
- Monster AI packs (separate from enemy hero bot)
- Phase 5B / 5C features

### Frozen systems (must not change behavior)

| System | Phase | Bot must not break |
|---|---|---|
| Gate/Core loop | 4B | Protected core, breach, core destroy win |
| Clarity prompts | 4B-B | Attack the Gate, Destroy the Core, etc. |
| Capture + score | 4C-A | Awards, HUD, ownership |
| Siege Buff | 4C-B | +30% enemy Gate, contested-off |
| Timer / score win | 4C-C | 300s, tiebreak, Draw |
| Combat feel | 4D | Hit tiers, damage numbers, mobile FX |
| Visual reskin | 4E | Theme 1 assets, HUD safe zones |

**Bot death does not end the match.** Only Core destroy / timer rules end the match.

---

## 4. Required Design Decisions

### A. First bot type — **Red Warrior Bot (melee)**

**Recommendation:** `Red Warrior Bot` — single melee enemy using **Warrior-like
stats** (no skills, no projectile).

| Reason | Detail |
|---|---|
| Lowest risk | Reuses melee arc / distance checks — no projectile pathing |
| Readable | Short attack range (~65 px) — player learns dodge spacing |
| Thematic | Red team enemy on red fortress side |
| Visual | Reuse `phase4e_char_warrior_idle.svg` with red tint / red outline |

**Config baseline (MVP — tune in `bot-warrior.ts`, not hardcoded in AI):**

```text
BOT_WARRIOR_MAX_HP     = 600
BOT_WARRIOR_ARMOR      = 12
BOT_WARRIOR_ATTACK     = 40
BOT_WARRIOR_MOVE_SPEED = 160
BOT_WARRIOR_ATTACK_RANGE = 60
BOT_ATTACK_COOLDOWN_MS = 1200
BOT_DETECTION_RANGE    = 420
BOT_LEASH_RANGE        = 520   // optional: return idle if player too far
BOT_RESPAWN_DELAY_MS   = 4000
```

Do **not** give bot `gateDamageBonus` or objective damage hooks in 5A-1.

### B. State machine (minimum)

```
                    ┌─────────┐
         player     │  IDLE   │◄── spawn / respawn
         in range   └────┬────┘
                          │ detect
                          ▼
                    ┌─────────┐
         out of     │  CHASE  │──────► IDLE (player beyond leash)
         attack     └────┬────┘
                          │ in attack range
                          ▼
                    ┌─────────┐
         HP = 0     │ ATTACK  │
                    └────┬────┘
                          │ killed
                          ▼
                    ┌─────────┐
                    │  DEAD   │──► respawn timer ──► IDLE
                    └─────────┘
```

| State | Behavior |
|---|---|
| **idle** | Stand at spawn; scan for player within `BOT_DETECTION_RANGE` |
| **chase** | Move toward player at `moveSpeed`; stop at `attackRange`; respect walls + world bounds |
| **attack** | If in range + cooldown ready → melee hit on player; show hit FX + damage number |
| **dead** | Stop movement; hide or fade sprite; schedule respawn |

**Optional (document only — do not implement in 5A-1):**

- `retreat` — low HP run away
- `guard` — hold spawn until player enters range
- `objective_focus` — push gate/core (5B+)

### C. Existing systems to reuse

| System | Reuse |
|---|---|
| `CombatSystem.applyDamage` | Bot HP and player damage from bot |
| `Player.takeDamage` | Player loses HP when bot hits |
| `showNormalHit` / `showDamageNumber` | 4D combat feedback on bot ↔ player hits |
| `testMeleeArc` / `HitShapes` | Bot melee hit validation (mirror player attack) |
| `Phaser.Physics.Arcade` | Movement, `setCollideWorldBounds`, wall collision group from map |
| `MapRenderer` / `map.walls` | Wall collider group — bot must not pass through |
| `TrainingDummy` patterns | HP label, death alpha, `reset()` timer — reference implementation |
| `Player.move` pattern | Velocity toward target for chase |
| `COLORS.red`, Phase 4E warrior sprite | Enemy visual identity |
| `registerWorldObject` + `uiCamera.ignore` | World FX registration in MatchScene |

**Not reused in 5A-1:** `ObjectiveSystem` damage paths, `CaptureSystem`, `SiegeBuffSystem`, `ProjectileSystem` for bot.

### D. Proposed new files (Agent A — future)

| File | Purpose |
|---|---|
| `src/game/entities/EnemyBot.ts` | Bot entity: sprite, body, HP, state, takeDamage, reset |
| `src/game/systems/BotSystem.ts` | Spawn, update loop, state transitions, attack cooldown |
| `src/game/data/bot-warrior.ts` | Config constants (HP, speed, ranges, cooldowns) |
| `scripts/phase-5a-bot-regression.mjs` | Headless regression for bot MVP |
| `docs/phase-5a-bot-design.md` | This document |

**MatchScene integration (minimal touch):**

- Instantiate `BotSystem` in `create()`
- Call `botSystem.update(delta)` in `update()` after player movement
- Extend `handleAttack()` to also check `EnemyBot` in melee arc (alongside dummy)
- Do **not** refactor objective or timer systems for bot

### E. High-risk files — do NOT modify in 5A-1 MVP

| File | Reason |
|---|---|
| `src/game/systems/MatchTimerSystem.ts` | Timer/score win frozen |
| `src/game/systems/CaptureSystem.ts` | Capture scoring frozen |
| `src/game/systems/SiegeBuffSystem.ts` | Siege buff frozen |
| `src/game/systems/ObjectiveSystem.ts` | Gate/Core win logic — bot must not hook here in MVP |
| `src/game/data/match-rules.ts` | Win resolution frozen |
| `src/game/scenes/ResultScene.ts` | Result copy / flow frozen |
| `src/game/data/capture-objectives.ts` | Score values frozen |
| `src/game/data/siege-buff.ts` | Bonus % frozen |

**Safe to touch (expected):** `MatchScene.ts` (integration only), new bot files,
optional `types.ts` additions for `BotState`, `CombatTarget` if bot implements interface.

---

## 5. Bot Behavior Design (Detail)

### Idle

- Bot spawns at **Red spawn vicinity**: `(1500, 800)` — between red gate line and
  center route, not inside gate collision.
- Each frame: if `distance(bot, player) <= BOT_DETECTION_RANGE` → **chase**.
- Optional leash: if player was chasing but now `distance > BOT_LEASH_RANGE` → **idle**
  and walk back toward spawn (simple homing, not required for AC pass).

### Chase

- `direction = normalize(player.pos - bot.pos)`
- `body.setVelocity(direction * moveSpeed)`
- If `distance <= attackRange` → stop velocity → **attack**
- `setCollideWorldBounds(true)` + collide with map wall group
- **No A\*** pathfinding — direct line movement; walls block naturally

### Attack

- Require `attackCooldown <= 0`
- Melee arc or circle hit check: bot facing player, player within `attackRange`
- On hit: `player.takeDamage(bot.attack)` → `showNormalHit` + `showDamageNumber`
- Bot attack cue: brief red flash on bot sprite (mirror `playActionFeedback`)
- Cooldown reset `BOT_ATTACK_COOLDOWN_MS`
- If player leaves range → **chase**
- **Does not** change damage formula — uses existing `CombatSystem`

### Dead

- Set state `dead`; velocity zero; sprite alpha 0.3 or hidden
- Optional: short death fade tween (≤400 ms) — no full-screen effect
- After `BOT_RESPAWN_DELAY_MS` → `reset()` at spawn: full HP, **idle**
- **Does not** trigger match result
- **Does not** award score or economy

### Player attacking bot

- Extend player melee arc in `handleAttack()` to test `EnemyBot` after/before dummy
- On hit: `bot.takeDamage(player.attack)` + normal hit FX
- Bot death does not block player from hitting objectives in same swing (existing arc may hit multiple — acceptable MVP)

---

## 6. UX / Player Readability

### Visual identity

| Element | Rule |
|---|---|
| Team color | Red fill `#ef4444` + white/dark outline — distinct from blue player |
| Sprite | Phase 4E `phase4e_char_warrior_idle` red-tinted, or red circle fallback |
| Label | **Enemy** or **Warrior** (not snake_case) — optional compact tag above HP |
| HP bar | Thin bar above bot (like dummy HP text) — `420/600` or bar fill |
| Depth | World depth 95–100 — below HUD, above ground |

### Combat feedback

| Event | UX |
|---|---|
| Bot attacks player | Red flash on bot + `showNormalHit` on player + damage number |
| Player hits bot | Existing normal hit tier (4D) |
| Bot chases | Movement itself is the cue — optional subtle dust not required MVP |
| Bot dies | Brief fade; no victory banner |
| Player low HP | Existing player HP in stats HUD — no new death loop in 5A-1 |

### Mobile safe zones (4E)

- Bot HP bar is **world-space** — must not project into joystick/skill zones when fought near screen edges
- Prefer mid-map engagements; spawn at y≈800 encourages fights on center route
- No bot UI in top HUD strip

### Player-facing copy

**Allowed:** Enemy, Warrior (optional tag), damage numbers only.

**Forbidden:** `bot_state`, `chase_mode`, `ai_debug`, snake_case, EXP, Gold, reward.

---

## 7. Acceptance Criteria (Phase 5A-1)

Phase 5A-1 passes when:

| # | Criterion |
|---|---|
| AC1 | At least **1 enemy bot** exists in `MatchScene` |
| AC2 | Bot **chases** player when in detection range |
| AC3 | Bot **attacks** player in melee range on cooldown |
| AC4 | Player can **attack bot** and deal damage |
| AC5 | Bot has **HP** and **dies** at 0 |
| AC6 | Bot **respawns/resets** after death |
| AC7 | Player **HP decreases** when bot hits |
| AC8 | **Damage numbers** show on bot ↔ player hits |
| AC9 | Gate/Core/Capture/Siege Buff/Timer/Score **unchanged** (regression pass) |
| AC10 | Mobile **915×412** playable |
| AC11 | Mobile **800×360** playable |
| AC12 | No fatal **console errors** |
| AC13 | **Menu ↔ Match ×3** — no duplicate bots, no leak |
| AC14 | No **5B/5C** features present |

---

## 8. Regression Plan (`phase-5a-bot-regression.mjs`)

Agent A should implement these cases:

| ID | Test |
|---|---|
| R1 | Bot spawns at match start |
| R2 | Bot has HP > 0 and config armor/attack |
| R3 | Bot transitions idle → chase when player within detection range |
| R4 | Bot moves toward player (position changes over 1 s) |
| R5 | Bot stops within attack range |
| R6 | Bot damages player (player HP decreases) |
| R7 | Player damages bot (bot HP decreases) |
| R8 | Bot dies when HP reaches 0 |
| R9 | Bot respawns after delay (HP restored, visible) |
| R10 | Player damage formula unchanged (armor mitigation spot check) |
| R11 | `phase-4b-objective-regression` / clarity — still pass |
| R12 | `phase-4c-a-capture-regression` — still pass |
| R13 | `phase-4c-b-siege-buff-regression` — still pass |
| R14 | `phase-4c-c-timer-score-regression` — still pass |
| R15 | `phase-4d-combat-feel-regression` — still pass |
| R16 | `phase-4e-visual-reskin-regression` — still pass |
| R17 | Mobile controls not blocked (layout probe) |
| R18 | Menu ↔ Match ×3 — single bot instance |
| R19 | No forbidden debug strings in player UI |
| R20 | No fatal console errors on bot kill cycle |

**Test hooks (debug only):** `debugSetBotState`, `debugTeleportPlayer` — not
player-facing; gated behind `SHOW_DEBUG_OVERLAY` if added.

---

## 9. Runtime Architecture Proposal

```
MatchScene
  ├── player: Player
  ├── dummy: TrainingDummy        (unchanged — still valid target)
  ├── botSystem: BotSystem
  │     └── enemy: EnemyBot       (single instance MVP)
  ├── objectiveSystem             (untouched)
  ├── captureSystem               (untouched)
  ├── siegeBuffSystem             (untouched)
  ├── matchTimerSystem            (untouched)
  └── update():
        player.move()
        botSystem.update(dt)      // state machine + chase + attack
        botSystem.enemy.update()  // HP label follow
```

**Collision setup:**

- Bot body added to same wall collider group as player
- No bot ↔ player physics push required MVP (overlap for hit check only)

**Match result guard:**

- `processActions` and bot attacks skip when `matchResolved` or `matchPhase !== 'in_progress'`

---

## 10. Agent A Implementation Handoff Outline

**When authorized (not now):**

1. Add `bot-warrior.ts` config
2. Implement `EnemyBot` entity (mirror `TrainingDummy` + `Player` movement)
3. Implement `BotSystem` state machine
4. Wire `MatchScene`: spawn, update, player attack hits bot
5. Bot melee hits `player.takeDamage`
6. Add `phase-5a-bot-regression.mjs`
7. Run full 4B–4E regression stack
8. Manual mobile pass 915×412 + 800×360

**Order:** entity → system → MatchScene hooks → regression → mobile QA.

**Explicitly defer:** pathfinding, skills, objectives, gate attack, multi-bot.

---

## 11. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Bot blocks player movement | Medium | No physics push MVP; small radius |
| Player attack only hit dummy | High | Extend `handleAttack` target list |
| Bot breaks match result | High | Bot death ≠ match end; guard `matchResolved` |
| Regression cascade | High | R11–R16 mandatory before merge |
| Wall stuck on direct chase | Medium | Accept MVP; leash + respawn if stuck >5s (optional) |
| HUD clutter near bot HP | Low | World-space bar; fight mid-map |
| Scope creep to 5B | High | Scope guard + Agent E veto |

---

## 12. Phase 5B / 5C Preview (Do Not Implement)

Documented for future only:

- **5B:** bot attacks gate, bot captures point, 2–3 bots
- **5C:** class variety, skill bots, retreat/guard states

---

## 13. Verdict

**BOT DESIGN PLAN READY FOR AGENT A IMPLEMENTATION**

Planning complete. Runtime **not started**. Awaiting merge + Product/GPT work order
+ Agent E scope gate before Agent A opens implementation PR.
