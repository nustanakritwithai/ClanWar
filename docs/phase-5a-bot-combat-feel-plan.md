# Phase 5A: Bot Combat Feel Plan — Enemy Bot Behavior & Fight Design

> **Agent C** — combat feel and fight-design planning for the first enemy bot.
> **Planning only** — no runtime, assets, or scripts in this phase.
>
> **Base:** Phase 4E closed (`8767580`) — visual reskin live verified.
> **Companion:** Agent D owns Phase 5A **architecture / system** spec (separate PR).
> **This doc:** combat feel, attack behavior, timing, readability, difficulty,
> player feedback, and testable acceptance criteria only.
>
> **Implementation status:** Phase 5A — **DESIGN PLANNING ONLY — IMPLEMENTATION
> NOT STARTED**. Runtime requires this plan + Agent D architecture + explicit
> Product/GPT work order.

---

## 1. Phase Goal

Introduce **one readable enemy** — the **Red Warrior Bot (Basic Melee Enemy)** —
so solo matches feel like a real siege skirmish without breaking Gate/Core,
capture, Siege Buff, timer/score, or 4D combat-feel systems.

**Combat feel statement:**

> *"The player sees the enemy, reads the attack coming, can dodge or fight back,
> and wins or loses the duel fairly — on mobile."*

**Judgment question for sign-off:** *"Does fighting the first bot feel fun and
readable — without breaking existing objectives or regressions?"*

---

## 2. Design Target — First Bot MVP

### Recommended: **Red Warrior Bot / Basic Melee Enemy**

| Reason | Detail |
|---|---|
| Simple | Single melee arc — reuses existing `testMeleeArc` patterns |
| Readable | Red warrior silhouette already in Phase 4E Theme 1 (`phase4e_char_warrior_idle`) |
| Low risk | No projectile prediction, no skill rotation, no pathfinding overhaul |
| Fits 5A-1 | One bot, one lane pressure fantasy — not full MOBA AI |

### What the player must feel

- There is a **real enemy** on the field (not just a dummy).
- The enemy is **chasing** me when I enter their zone.
- The enemy is **about to hit** — telegraph before damage.
- I can **dodge, retreat, or counter-attack**.
- The fight has **rhythm** (wind-up → hit → recovery) — not a collision blob.

### What Phase 5A-1 is not

- Bot army, bot capture, bot gate push, ranged bot, skill bot, or team tactics.

---

## 3. Combat Feel Goals

### Bot loop (timing pillars)

| Phase | Purpose | Player read |
|---|---|---|
| **Detection** | Notice player in range | "He saw me" |
| **Chase** | Close distance at readable speed | "He's coming" |
| **Wind-up** | Telegraph before damage | "I can react" |
| **Hit moment** | Apply damage if still in range | "That connected" |
| **Recovery** | Pause before next swing | "My turn to hit" |
| **Death** | Clear end state | "He's down" |

### Bot must NOT

- Hit **instantly** with no telegraph.
- **Glue** to the player sprite (overlap unreadable).
- Move **faster** than the player (MVP Level 1).
- Deal **burst lethal** damage on mobile.
- Kill the player before they can **move off joystick**.
- Block **joystick / skill buttons** on mobile.

### Preserve frozen systems

Gate/Core loop, 4B-B prompts, 4C-A capture score, 4C-B Siege Buff, 4C-C
timer/score win, 4D/4E combat VFX tiers — bot adds **hero-vs-bot** pressure only.

---

## 4. Suggested First Bot Tuning (Ranges)

Reference player default **Guardian:** HP 1200, attack 45, armor 25, moveSpeed
170, attackRange 60. Bot uses **Warrior-like melee** profile but **tuned down**.

All values are **config-driven** (`bot-red-warrior.ts` or similar) — ranges for
playtest, not final balance lock in this doc.

| Stat | Suggested range | Rationale |
|---|---|---|
| **HP** | 500–700 (~42–58% of Guardian) | Player kills bot in ~8–14 basic hits; bot feels killable |
| **Attack (raw)** | 38–52 | Below Guardian 45–Warrior 70; threat without burst |
| **Armor** | 8–15 | Similar to Warrior 15; player damage feels meaningful |
| **Move speed** | 150–168 | **Slower than** Guardian 170 — player can kite |
| **Detection range** | 280–400 px | Mid-map engagement, not whole-map aggro |
| **Attack range** | 58–72 px | Melee only — match `testMeleeArc` body + range |
| **Attack cooldown** | 1.4–2.0 s | Clear gap between swings |
| **Attack wind-up** | 450–650 ms | Telegraph window for dodge |
| **Recovery** | 350–550 ms | Counter-attack window after bot swing |
| **Leash / lose-aggro** (optional) | +80–120 px beyond detection | Return idle if player kites far — reduces chase glue |

**Example feel check (mid-range):** Bot attack 45 vs Guardian armor 25 →
`~36` final per hit. Guardian attack 45 vs bot armor 12 → `~40` final. TTK
bot ~15 hits, player ~33 hits — player favored in straight trade if standing
still; **wind-up + kiting** makes bot dangerous only when player ignores telegraph.

**Do not change** player or gate/core stats in 5A-1.

---

## 5. Bot Attack Readability

Reuse **4D / 4E VFX** where possible — minimal new assets for 5A-1.

### Before bot hits (wind-up)

| Cue | Implementation direction |
|---|---|
| Bot tint flash | Brief red/orange tint `#ef4444` / `#f59e0b` on sprite (200–400 ms) |
| Warning arc | Small front arc or circle at bot feet — reuse `combat/aoe_marker` scaled down |
| Wind-up delay | 450–650 ms **before** damage resolution |
| Optional copy | None required — visual only (avoid spam) |

### On bot hit (player damaged)

| Cue | Implementation direction |
|---|---|
| Player hit flash | Brief red tint on player sprite |
| Damage number | Reuse `CombatText` player-facing color `#f87171` |
| Hit spark | Reuse `phase4e_vfx_normal_hit_spark` or 4D normal tier |
| Knockback | **Out of MVP** — risks jitter, map bounds, mobile feel |

### On bot death

| Cue | Implementation direction |
|---|---|
| Death feedback | Fade out 300–500 ms or small `impact_ring` at bot position |
| Damage number | Final hit number as usual |
| Cleanup | Destroy entity; no corpse collision |
| Respawn | **No respawn in 5A-1** — one bot per match; Menu ↔ Match spawns fresh |

### Enemy identification

- Red team tint / banner on warrior sprite.
- Optional small **enemy marker** (red chevron above head) — UI camera, not world clutter.
- Must not be confused with capture contested icon or Siege Buff badge.

---

## 6. Player Experience & Counterplay

### Player SHOULD be able to

| Action | How design supports it |
|---|---|
| See bot before first hit | Detection → chase at moderate speed; red silhouette |
| Back out of range | Bot attack range finite; wind-up cancelled if player leaves arc |
| Dodge with movement | Wind-up ≥450 ms; move speed advantage |
| Counter-attack | Recovery gap 350–550 ms after bot swing |
| Kill the bot | HP 500–700; player DPS higher in trade |
| Understand what hit them | Hit flash + damage number on player |

### Player must NOT face

| Anti-pattern | Guard |
|---|---|
| Unavoidable hits | Damage only if in arc at **end** of wind-up |
| Infinite chase glue | Slightly slower bot speed + optional leash |
| Sprite overlap blindness | Stop at attack range edge; no stack on player center |
| UI blocked | Bot fights in playfield center — not over controls |

### Mobile note

Telegraph arc must be **visible at 915×412 and 800×360** without covering
timer/score chip or objective plaque (spawn fights mid-lane, not under HUD).

---

## 7. Difficulty Curve (Plan — MVP Uses Level 1 Only)

### Level 1 — **Phase 5A-1 (implement this)**

- **One** Red Warrior Bot.
- Melee only; **no skills**.
- Slower move speed than player.
- Long wind-up; generous recovery.
- Purpose: prove spawn, AI state machine, combat feel, regression.

### Level 2 — Future (5A-2+)

- Slightly faster move (still ≤ player speed or equal with longer wind-up).
- Tighter recovery; still no skills.

### Level 3 — Future (5A-3+)

- Retreat / re-engage spacing; still no ranged or objective AI.

**Phase 5A-1 implements Level 1 only.**

---

## 8. Bot State Behavior (Combat-Feel View)

State machine aligns with Agent D architecture — this section defines **feel**
per state.

### Idle

- Bot stands at spawn or patrol anchor (single point OK for MVP).
- Subtle idle bob optional (4E warrior idle sprite).
- **Transition:** player enters detection range → **Chase**.

### Chase

- Move toward player at configured move speed (no teleport).
- Use simple **seek** steering — no pathfinding overhaul; avoid wall jitter by
  stopping at obstacles (Agent D defines collision).
- **Transition:** within attack range → **Wind-up**. Player leaves detection → **Idle**.

### Wind-up

- Bot **stops or slows** (recommend full stop for readability).
- Play telegraph (tint + arc).
- Timer = wind-up ms.
- **Transition:** timer complete → **Attack** if player still in arc; else → **Chase** or **Recovery** (whiff).

### Attack

- Resolve single melee hit via `CombatSystem` on player if in arc + range.
- Play hit VFX on player.
- **Transition:** → **Recovery**.

### Recovery

- Bot idle brief period; no movement or reduced move.
- Player counter-attack window.
- **Transition:** cooldown elapsed → **Chase** if player in detection else **Idle**.

### Dead

- HP ≤ 0; stop all AI and damage.
- Play death feedback; disable collision.
- **No attack** after death.
- Match continues (gate/core objectives unchanged).

---

## 9. Acceptance Criteria

Phase 5A bot combat feel **passes** when all are true:

### Spawn & identity

- **BF-AC1** Bot spawns **once** per match at defined red-side anchor (visible).
- **BF-AC2** Bot reads as **enemy** (red warrior / marker) — not neutral dummy.

### Chase & tempo

- **BF-AC3** Bot **chases** player when inside detection range.
- **BF-AC4** Bot move speed **not faster** than player (Level 1).
- **BF-AC5** Bot does **not teleport** or jitter visibly.

### Attack readability

- **BF-AC6** Bot shows **wind-up telegraph** before every damage swing.
- **BF-AC7** Bot **damages player** when player remains in arc at hit frame.
- **BF-AC8** Bot **does not damage** player who left range during wind-up.
- **BF-AC9** Bot respects **cooldown + recovery** between attacks.

### Player agency

- **BF-AC10** Player can **retreat** out of melee range during wind-up.
- **BF-AC11** Player **understands** being hit (flash + damage number).
- **BF-AC12** Player can **damage and kill** bot.

### Death & reset

- **BF-AC13** Bot **stops attacking** on death.
- **BF-AC14** Bot death feedback plays; no stuck corpse blocking movement.
- **BF-AC15** Menu ↔ Match ×3 — **no duplicate** bots; clean reset.

### Mobile

- **BF-AC16** Fight readable at **915×412**.
- **BF-AC17** Fight readable at **800×360**.

### System preservation

- **BF-AC18** Gate/Core, capture, Siege Buff, timer/score — **unchanged behavior**
  (regression suites pass).

---

## 10. Regression Plan (Agent A)

Future script: `scripts/phase-5a-bot-combat-regression.mjs`

| ID | Test |
|---|---|
| **R1** | Bot spawns exactly once at match start |
| **R2** | Bot has visible enemy marker or red tint |
| **R3** | Bot enters Chase when player within detection range |
| **R4** | Bot moves toward player (position delta toward player) |
| **R5** | Bot enters Wind-up before first damage |
| **R6** | Bot damages player after wind-up when in range |
| **R7** | Bot does **not** damage player who exited range during wind-up |
| **R8** | Bot respects attack cooldown / recovery timing |
| **R9** | Player damages bot; bot HP decreases |
| **R10** | Bot dies at HP ≤ 0 |
| **R11** | Bot stops dealing damage after death |
| **R12** | Menu ↔ Match ×3 — no duplicate bot entities |
| **R13** | Mobile 915×412 layout — controls unobstructed (smoke) |
| **R14** | Mobile 800×360 layout — controls unobstructed (smoke) |
| **R15** | `phase-4b-objective-regression.mjs` still passes |
| **R16** | `phase-4c-a-capture-regression.mjs` still passes |
| **R17** | `phase-4c-b-siege-buff-regression.mjs` still passes |
| **R18** | `phase-4c-c-timer-score-regression.mjs` still passes |
| **R19** | `phase-4d-combat-feel-regression.mjs` still passes |
| **R20** | `phase-4e-visual-reskin-regression.mjs` still passes |
| **R21** | No fatal console errors in bot combat path |

---

## 11. Scope Guard

### In scope (5A-1 combat feel)

- One Red Warrior melee bot.
- Detection, chase, wind-up, melee attack, recovery, death.
- Player hit feedback (reuse 4D/4E).
- Config-driven bot stats (ranges above).
- Regression tests R1–R21.

### Out of scope (do not plan in 5A-1)

| Category | Examples |
|---|---|
| Bot teams | Multiple coordinated bots |
| Objective AI | Bot capture, gate push, core attack |
| Ranged bot | Arrows, projectiles, kiting AI |
| Skill bot | Skill rotation, mana, ultimates |
| Pathfinding overhaul | Navmesh, lane routing |
| Economy | EXP, Gold, shop, rewards on kill |
| Meta UI | Minimap, respawn system, rankings |
| Multiplayer | Net sync |
| Future phases | 5B, 5C implementation |

Bot **must not** damage Gate/Core or capture objectives in 5A-1 unless a future
phase explicitly authorizes siege bot behavior.

---

## 12. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Bot overlaps player sprite | High | Stop at attack range; no center stack |
| Wind-up too short on mobile | High | Min 450 ms; playtest 800×360 |
| Bot too lethal vs Guardian | Medium | Attack 38–52 range; tune in config |
| Bot too weak / boring | Medium | Detection on mid-route; chase readable |
| Chase jitter on map edges | Medium | Agent D collision; simple stop |
| Breaks objective regressions | High | R15–R20 mandatory |
| Duplicate bot on reset | High | R12; destroy on scene shutdown |
| Conflicts with Agent D architecture | Medium | C = feel timing; D = system ownership |

---

## 13. Agent Handoffs

### Agent D (Architecture — parallel / first)

- Bot entity, state machine wiring, spawn point, collision, update loop.
- This doc defines **timing and feel**; D defines **structure and APIs**.
- Resolve conflicts in favor of: **readable telegraph** over AI cleverness.

### Agent A (Runtime — after C + D + work order)

- Implement Level 1 Red Warrior Bot per config ranges.
- Wire wind-up → hit → recovery; reuse `CombatSystem` + 4D VFX.
- Add `phase-5a-bot-combat-regression.mjs`.
- **Do not** change gate/core/capture/siege/timer rules.

### Agent B (Assets — optional for 5A-1)

- Reuse `phase4e_char_warrior_idle` + red tint for bot.
- Optional: `phase4e_vfx_bot_windup_arc.svg` — only if reuse insufficient.

### Agent F (QA)

- BF-AC1–18 manual playtest + R1–R21 automated.
- Screenshot probes: bot chase, wind-up, player hit, bot death, mobile layouts.

### Agent E (Final Gate)

- Block bot capture, economy, multi-bot, or stat changes to player/gate/core.

---

## 14. Suggested Spawn & Encounter (Feel)

For first playtest, spawn **one** Red Warrior Bot on **red-side main route**
between red gate `(1500, 1000)` and mid ruins `(1500, 2100)` — e.g. `(1500, 1500)`
±50 px. Player meets bot while walking north toward gate.

- Creates **mid-lane pressure** without blocking capture circle UI at ruins.
- Fight visible in playfield center — not under top HUD.
- Agent D may adjust exact coordinates; feel requirement: **visible before contact**.

---

## 15. References

- `docs/phase-4e-visual-design-spec.md` — warrior silhouette, enemy red palette
- `docs/phase-4d-combat-feel-mvp-spec.md` — hit VFX tiers
- `docs/phase-4d-combat-feel-ux-spec.md` — damage number rules
- `src/game/data/heroes.ts` — player stat reference (frozen)
- `src/game/systems/CombatSystem.ts` — damage formula (reuse, do not change)
- `public/assets/phase-4e/theme1/phase4e_char_warrior_idle.svg` — bot visual base
