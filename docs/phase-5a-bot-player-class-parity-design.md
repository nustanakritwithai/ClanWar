# Phase 5A-4: BotPlayer Class Parity Design Plan

> **Agent D** — system design / AI architecture planning to turn the enemy from
> a *monster-like unit* into an *AI-controlled player*. **Planning only —
> docs-only. No runtime, no `src/` changes, no implementation PR.**
>
> **Base:** Phase 5A-3 closed (`7435cdc`) — the single Red Warrior Bot has
> spawn / patrol / chase / wind-up / attack / death / respawn / difficulty and a
> rule-based Bot Brain (perception / memory / goal / plan / decision).
>
> **Implementation status:** Phase 5A-4 = **DESIGN PLANNING ONLY —
> IMPLEMENTATION NOT STARTED.** Runtime requires this plan + an explicit
> Product/GPT work order + Agent E scope gate before Agent A opens a PR.

---

## 1. Phase Goal & Core Direction

Today the enemy is a **monster-like unit**: `EnemyBot` carries its **own**
hand-tuned stats in `bot-warrior.ts` (HP 600, attack 44, armor 12, moveSpeed
160) and a red-circle fallback body. It does not share identity with the player.

**Phase 5A-4** reframes the enemy as a **simulated player** — a *BotPlayer* that
uses the **same class data, stats, sprite, and attack rules as a real player
class**, differing only in its **controller**:

```
Human Player  : player input  → intent → character action
BotPlayer     : BotBrain (AI) → intent → character action
```

> **Judgment question for sign-off:** *"Does the enemy now read as 'a Warrior on
> the red side, played by the AI' — same class, same combat rules — rather than a
> bespoke monster, without changing the human player's balance or breaking any
> 4B–5A-3 system?"*

This is still **one bot**. 5A-4 implements **Warrior BotPlayer only**; the
architecture must make adding Guardian/Ranger/Mage/Priest bots later a config
change, not a rewrite.

---

## 2. Answers to the Core Design Questions (§1 of the brief)

| Question | Answer (grounded in the codebase) |
|---|---|
| Where does BotPlayer get class config? | From the **same `HEROES` table** the human player uses — `src/game/data/heroes.ts` via `getHero(classId)`. The bot reads a `HeroDefinition`, identical source to `Player`. |
| Where do player class stats live? | `src/game/data/heroes.ts` — `HEROES: Record<HeroClassId, HeroDefinition>` (Warrior: hp 950, mana 250, attack 70, armor 15, moveSpeed 190, attackRange 65, gateDamageBonus 0.2). |
| Where do class sprites/visual keys live? | `src/game/theme/Phase4ETheme.ts` — `PHASE4E_THEME1_TEXTURES.char*Idle` + `CHARACTER_THEME_MAP` + `resolvePhase4eCharacterTexture(scene, classId)` (the exact resolver `Player` uses). Warrior → `phase4e_theme1_char_warrior_idle`. |
| How much normal-attack logic can be shared? | The **melee math is already shared**: `testMeleeArc` (`src/game/combat/HitShapes.ts`) and `CombatSystem.applyDamage` are class-agnostic and already used by both `Player` (via `MatchScene.handleAttack`) and `EnemyBot` (via `BotSystem.resolveAttack`). For ranged classes, `normalAttackProjectileKind()` + `showNormalAttackProjectile()` (`CombatVfx.ts`) are the shared visual path — **deferred** to a later phase. |
| Should difficulty be a multiplier on class stat? | **Yes** — difficulty becomes a **bot-only multiplier applied on top of the class baseline** (extending the existing 5A-2 `BOT_DIFFICULTY_PROFILES`), never a separate monster stat block. |
| Should `EnemyBot` be renamed / wrapped / migrated? | **Hybrid, staged** — keep `BotSystem` + `BotBrain`, evolve `EnemyBot` internals into a class-driven `BotPlayer`, with `EnemyBot` kept as a thin deprecated alias for one phase. See §11. |

---

## 3. Recommended Naming

**Preferred: `BotPlayer`** (entity), **`BotPlayerController`** (the
brain→intent→action adapter), **`BotPlayerSystem`** (lifecycle).

| Candidate | Verdict |
|---|---|
| **BotPlayer** ✅ | Clearest: "a player that is a bot." Pairs naturally with `Player`. Short, reads well in code (`this.botPlayer`). |
| AIPlayer | Good, but "AI" overloads with the brain layer (`src/game/ai/`); `BotPlayer` keeps "AI" for the *brain*, "Bot" for the *actor*. |
| SimulatedPlayer / BotControlledPlayer | Accurate but verbose. |
| EnemyBot / MonsterBot / EnemyUnit / NPCMonster | ❌ Reinforce the monster framing we are explicitly leaving. |

**Recommendation:** rename the concept to **`BotPlayer`**; keep the *enemy-side*
read as a **visual treatment**, not an identity (a BotPlayer is a Warrior that
happens to be red/AI, not an "EnemyBot").

> Note: `getData('enemyBot')` and the `botEnemyMarker` / `botHpBar` /
> `botAttackWarning` data tags are referenced by the existing regression scripts.
> To avoid breaking 5A-1/5A-2/5A-3 tests, **keep those data-tag string keys
> unchanged** even as the class/file names move to `BotPlayer` (they are internal
> test hooks, not player-facing). Document this explicitly in the handoff.

---

## 4. Recommended Architecture

The 5A-3 split already isolates *thinking* from *acting*. 5A-4 keeps that and
adds **class identity** + a thin **controller seam**:

```
HEROES (heroes.ts) ──► HeroDefinition ──► BotPlayer (class stats + sprite)
                                              ▲
bot-player-config.ts ─ difficulty mult ──────┤  (bot-only scaling)
                                              │
BotBrain (unchanged) ─► intent ─► BotPlayerController ─► BotPlayer actions
                                              ▲
BotPlayerSystem (was BotSystem) ── lifecycle / update / collisions / VFX
```

**Recommended files (future Agent A):**

| File | Role | From |
|---|---|---|
| `src/game/entities/BotPlayer.ts` | Class-driven enemy actor: builds from a `HeroDefinition`, owns body/HP/visuals + enemy treatment. | evolves `EnemyBot.ts` |
| `src/game/data/bot-player-config.ts` | Which class the bot is (default `warrior`), spawn, respawn/patrol carry-over, and the difficulty multiplier table. | merges/extends `bot-warrior.ts` |
| `src/game/controllers/BotPlayerController.ts` | Maps `BotBrain` goal/plan → a neutral `BotIntent` (move/attack/target). The seam that mirrors human input. | new (extracts the goal→verb mapping from `BotSystem`) |
| `src/game/systems/BotPlayerSystem.ts` | Lifecycle/spawn/update/respawn/collision wiring. | renames `BotSystem.ts` |

**Brain layer is untouched:** `BotBrain.ts`, `BotPerception.ts`, `BotMemory.ts`,
`bot-brain-config.ts` stay as-is (they already operate on abstract perception,
not on monster stats).

**Smaller-migration alternative (if churn is a concern):** keep file names
(`BotSystem`/`EnemyBot`) and only change the **stat/visual source** to the class
table internally. This is lower-churn but leaves the misleading "EnemyBot" name.
The recommended path (above) is the staged hybrid in §11, which gets the clean
name while staying test-safe.

---

## 5. Stat / Class-Parity Design

**Baseline source:** `getHero('warrior')` → `HeroDefinition.stats`. The bot's
baseline = the **same numbers the human Warrior uses**. No separate monster stat
block.

**Difficulty = bot-only multipliers** on the class baseline (extends the
existing `BOT_DIFFICULTY_PROFILES`). Proposed:

```
botHp        = classHp        × difficulty.hpMul
botAttack    = round(classAttack × difficulty.attackMul)
botMoveSpeed = classMoveSpeed × difficulty.speedMul   (then fairness-clamped)
// armor, attackRange, attackArc: taken from class as-is (identity), NOT scaled
```

| Value | Source | Scaled by difficulty? |
|---|---|---|
| HP | class | ✅ hpMul |
| attack (raw) | class | ✅ attackMul |
| moveSpeed | class | ✅ speedMul **+ fairness clamp** |
| armor | class | ❌ identity |
| attackRange | class | ❌ identity |
| attackArc / wind-up / cooldown / recovery | bot-brain/bot-player config (combat-feel, not class) | wind-up/cooldown may scale (as in 5A-2) |
| gateDamageBonus | **dropped for bot** | n/a (no objective AI) |

**Critical balance note (must be called out to Agent A):** the Warrior class
baseline is **stronger and faster** than the current tuned bot —
attack 70 vs 44, HP 950 vs 600, **moveSpeed 190 vs 160 (and > Guardian 170)**.
So a naive parity swap would make the bot hit harder and outrun the player.
Mitigations, all bot-only:

1. Difficulty `normal` multipliers should pull the Warrior baseline toward the
   proven 5A-2 feel (e.g. `attackMul ≈ 0.6`, `hpMul ≈ 0.65`, `speedMul ≈ 0.85`)
   so `normal` ≈ today's playable bot, while `hard` trends toward true class
   parity.
2. The existing **fairness speed clamp** (`min(botSpeed, player.moveSpeed ×
   maxPlayerSpeedRatio)`) stays — it already prevents the bot from unfairly
   outrunning the player even at moveSpeed 190.

**Human-player protection (non-negotiable):** the bot reads `HEROES` **by value**
and applies multipliers to **its own copy**. It must never mutate the shared
`HEROES` object or the `Player` instance. The regression asserts human stats for
all five classes are byte-identical before/after a bot exists (see §12 T4).

---

## 6. Visual Parity Design

**Same class sprite, enemy-side treatment** — not a new monster, not a blue
player.

| Element | Rule |
|---|---|
| Sprite | `resolvePhase4eCharacterTexture(scene, 'warrior')` → `phase4e_theme1_char_warrior_idle` (the **exact** resolver `Player` uses). |
| Enemy tint | Red tint (e.g. `0xb91c1c`) applied to the class sprite — `Player` tints the same sprite blue (`COLORS.blue`), so bot = same silhouette, red. |
| Enemy ring + marker | Keep the 5A-1/5A-2 red enemy ring/chevron + name tag + HP bar so it is unmistakably hostile. |
| Fallback | If the class texture is missing, fall back to the existing red-circle body (current behavior) — fallback-safe, no new assets. |
| Depth / safe zones | Keep the ≤97 world depth band; readable at 915×412 and 800×360 (no HUD/control overlap). |

**Future class bots (documented, not built):** Guardian → guardian sprite +
red; Ranger → ranger sprite + arrow projectile; Mage → mage sprite + magic bolt;
Priest → priest sprite + holy bolt — each reusing `normalAttackProjectileKind()`
+ `showNormalAttackProjectile()`.

---

## 7. Controller Model (clean seam, design-only)

Define a neutral intent both controllers can produce:

```ts
interface BotIntent {          // (a.k.a. CharacterIntent)
  moveDirection: { x: number; y: number } | null; // normalized, or null = hold
  basicAttack: boolean;
  targetPosition?: { x: number; y: number };       // for seek/investigate/return
  targetEntity?: 'player' | null;
  // useSkill?: SkillSlot;  // FUTURE — not in 5A-4
}
```

- **Human path (existing, unchanged):** `InputSystem` → player presses → `Player`
  actions in `MatchScene`.
- **AI path (5A-4):** `BotBrain` goal/plan → `BotPlayerController` translates to a
  `BotIntent` → `BotPlayerSystem` applies it to the `BotPlayer` using the same
  movement/attack verbs.

This makes the controller the **only** difference between a human and a bot, and
leaves a clean `useSkill` hook for a much later phase. **Design only — do not
implement the intent struct in 5A-4 beyond what the Warrior melee path needs.**

---

## 8. Combat Parity Design

- **Reuse the shared melee path:** the bot's normal attack continues through
  `testMeleeArc` + `CombatSystem.applyDamage` — the same functions the human
  Warrior's basic attack uses. No bot-only damage formula, no bot-only range
  logic.
- **Range/arc from class:** `attackRange` comes from the Warrior `HeroDefinition`
  (65), not a monster constant.
- **Wind-up / cooldown / recovery** stay combat-feel config (the proven 5A-2
  cadence), since the human basic attack has no wind-up and we still want a
  readable, dodgeable bot swing.
- **Phase 5A-4 runtime target:** Warrior BotPlayer, **melee normal attack only**,
  **no skills**, **no ranged bot**.
- **Future:** ranged BotPlayer class parity (5A-5 / 5B) reuses the existing
  player projectile visuals; skill usage is a separate, later phase.

---

## 9. Migration Strategy

Three options were weighed:

| Approach | Pros | Cons |
|---|---|---|
| A. Safe wrapper (BotPlayer adapter around EnemyBot) | lowest immediate risk | two parallel concepts; tech debt; double maintenance |
| B. Hard rename/refactor (EnemyBot→BotPlayer, BotSystem→BotPlayerSystem in one go) | cleanest end state | highest churn; risks the 5A-1/5A-2/5A-3 regressions + data-tag hooks in one PR |
| **C. Hybrid, staged (recommended)** | clean name + low risk per step; regressions stay green throughout | spans a couple of small steps |

**Recommended: C — staged hybrid, in this order:**

1. **Class-source swap (behavior-preserving):** point the existing entity's stat
   + sprite source at `getHero('warrior')` + `resolvePhase4eCharacterTexture`,
   with `normal` difficulty multipliers tuned so the *observable* behavior ≈
   today's bot. Regressions must stay green (this is a no-feature-change refactor
   of the stat **source**).
2. **Rename to BotPlayer:** rename `EnemyBot`→`BotPlayer`, `BotSystem`→
   `BotPlayerSystem`; keep `EnemyBot` as a one-phase deprecated `export`-alias and
   **keep the `enemyBot`/`bot*` data-tag strings** so regression hooks survive.
3. **Extract `BotPlayerController`:** move the brain-goal→verb mapping out of the
   system into the controller seam (§7).

Each step is independently shippable and independently QA-able; the parity
regression (§12) gates the whole sequence.

---

## 10. Scope Guard

**In scope (5A-4 design):** BotPlayer concept, class-parity plan, Warrior-bot
migration plan, stat-source plan, visual-parity plan, controller-separation plan,
regression plan, Agent A handoff.

**Out of scope:** multiple bots, team AI, objective/Gate/Core/capture AI, ranged
bot *implementation*, skill AI, economy, minimap, multiplayer, persistent memory,
LLM/API/ML, Phase 5B/5C.

---

## 11. Acceptance Criteria (for future implementation)

| # | Criterion |
|---|---|
| AC1 | A `BotPlayer` concept exists (entity/module), distinct from a "monster". |
| AC2 | Bot's class identity = `warrior`. |
| AC3 | Bot stat baseline comes from the player Warrior class (`HEROES`) or a documented shared source. |
| AC4 | Difficulty applies **bot-only** multipliers on the class baseline. |
| AC5 | Human player stats (all 5 classes) are unchanged. |
| AC6 | Bot visual uses the Warrior class sprite with an enemy-side treatment (red tint + ring/marker + HP bar). |
| AC7 | Bot still patrols / chases / attacks / respawns (5A-1/5A-2 preserved). |
| AC8 | BotBrain still works (perception/memory/goal/plan/decision — 5A-3 preserved). |
| AC9 | No duplicate bot after Menu↔Match reset. |
| AC10 | Mobile 915×412 readable. |
| AC11 | Mobile 800×360 readable. |
| AC12 | Gate/Core/Capture/Siege Buff/Timer/Score unchanged. |
| AC13 | No Phase 5B/5C features; one bot, melee only, no skills, no ranged. |

---

## 12. Regression Plan (`scripts/phase-5a-bot-player-parity-regression.mjs`)

Headless Puppeteer, same in-page scene-restart harness. Read bot identity via an
extended `getBotSnapshot()` (adds `classId`) and the existing `getBrainSnapshot()`.

| ID | Test |
|---|---|
| T1 | BotPlayer reports `classId === 'warrior'` |
| T2 | BotPlayer baseline stats derive from Warrior `HEROES` (armor/attackRange == class; HP/attack == class × normal multiplier) |
| T3 | Difficulty multiplier changes bot effective stats only (easy<normal<hard for attack) |
| T4 | Human Warrior/Guardian/Ranger/Mage/Priest stats unchanged vs `HEROES` after a bot exists |
| T5 | BotPlayer visual uses the warrior class texture key (`phase4e_theme1_char_warrior_idle`) |
| T6 | BotPlayer has enemy marker + red treatment (red-dominant tint / ring) |
| T7 | BotPlayer normal attack is the shared melee warrior attack (damages player after wind-up via `testMeleeArc`/`CombatSystem`) |
| T8 | BotBrain still selects chase / attack / investigate by situation |
| T9 | Respawn clears brain memory + plan safely |
| T10 | Menu↔Match reset ×3 → no duplicate BotPlayer |
| T11 | Mobile 915×412 readable, controls free |
| T12 | Mobile 800×360 readable, controls free |
| T13 | `phase-5a-bot-brain-regression.mjs` still passes |
| T14 | `phase-5a-bot-regression.mjs` still passes |
| T15 | `phase-4e` / `phase-4d` / `phase-4c-c` still pass |

---

## 13. Implementation Handoff for Agent A

> **Work order to follow when (and only when) Phase 5A-4 runtime is authorized.**

**Recommended approach:** §9 Option **C** — staged hybrid (class-source swap →
rename to BotPlayer → extract controller).

**Files to CREATE:**
- `src/game/entities/BotPlayer.ts` (evolved from `EnemyBot.ts`)
- `src/game/data/bot-player-config.ts` (class selection + difficulty multipliers)
- `src/game/controllers/BotPlayerController.ts` (brain→intent seam)
- `scripts/phase-5a-bot-player-parity-regression.mjs`

**Files ALLOWED to EDIT:**
- `src/game/systems/BotSystem.ts` → rename to `BotPlayerSystem.ts` (keep behavior)
- `src/game/scenes/MatchScene.ts` — **only** the bot construction/wiring line(s)
  (it constructs the bot system) — minimal touch
- `docs/project-status.md`, `docs/open-pr-dashboard.md`, `docs/agent-worklog.md`

**Files FORBIDDEN to edit:**
- `src/game/data/heroes.ts` (read-only source of truth — never mutate)
- `src/game/entities/Player.ts`, `ObjectiveSystem.ts`, `CaptureSystem.ts`,
  `SiegeBuffSystem.ts`, `MatchTimerSystem.ts`, `ResultScene.ts`
- `package.json` / lock, deploy config, `public/assets/**`
- `src/game/ai/*` (brain is stable; touch only if a snapshot field must be added)

**Stat-source rules:** baseline from `getHero('warrior')` by value; difficulty
multiplies HP/attack/(clamped)moveSpeed only; armor/attackRange identical to
class; never mutate `HEROES` or `Player`.

**Visual-parity rules:** `resolvePhase4eCharacterTexture` for the sprite + red
tint + existing enemy ring/marker/HP bar; red-circle fallback retained; keep
`enemyBot`/`bot*` data-tag strings for regression hooks.

**Expected behavior:** a red Warrior that the AI plays — patrols, chases,
investigates last-seen, attacks with a readable dodgeable melee swing using the
shared combat path, respawns, and never unfairly outruns the player.

**Strict scope guard:** Warrior BotPlayer only; melee only; one bot; no skills,
no ranged, no objective AI, no multi-bot, no LLM/ML, no Phase 5B/5C.

---

## 14. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Class baseline (atk 70 / spd 190) makes the bot unfair | **High** | `normal` difficulty multipliers tuned to ≈ 5A-2 feel; existing fairness speed clamp retained; T-tests assert dodgeable cadence preserved |
| Accidental mutation of shared `HEROES` / `Player` stats | **High** | Read by value; `heroes.ts`/`Player.ts` forbidden to edit; T4 asserts all 5 human classes unchanged |
| Rename breaks 5A-1/5A-2/5A-3 regression hooks | Medium | Keep `enemyBot`/`bot*` data-tag strings; keep `EnemyBot` deprecated alias for one phase; staged migration keeps suites green per step |
| Sprite swap looks like the blue player or a new monster | Medium | Same class sprite + **red** tint + enemy ring/marker; T5/T6 assert texture key + red treatment |
| Scope creep into ranged/skills/multi-class | Medium | Warrior-melee-only guard; future classes documented but deferred |
| Big-bang refactor regression cascade | Medium | Option C staged hybrid; each step independently QA-gated by the parity regression |

---

## 15. Phase 5A-5 / 5B Preview (Do NOT implement)

- **5A-5:** ranged BotPlayer class parity (Ranger/Mage/Priest) reusing player
  projectile visuals; per-class difficulty tuning.
- **5B:** bot pushes Gate / contests capture, 2–3 BotPlayers, light coordination.

---

## 16. Verdict

**BOTPLAYER CLASS PARITY DESIGN READY FOR AGENT A IMPLEMENTATION**

Planning complete. Runtime **not started**, **no `src/` changes**. Awaiting merge
of this plan + explicit Product/GPT work order + Agent E scope gate before Agent
A opens the Phase 5A-4 implementation PR.
