# Project Status

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-21 (Phase 5B-1 Multi Bot Spawn Foundation — Agent A draft)  
> **Base branch:** `claude/game-file-analysis-a20xup` @ `f73766e`

## Current phase

**Phase 4C-A — Objective Capture Foundation** — **CLOSED** (live verified 2026-06-16)

**Phase 4C-B — Siege Ruins Gate Damage Bonus** — **CLOSED — live verified** (2026-06-17)

**Phase 4C-C — Match Timer and Objective Score Win** — **CLOSED — live verified** (2026-06-17)

**Phase 4D — Combat Feel MVP / Player Combat Polish** — **CLOSED — live verified** (2026-06-17)

**Phase 4E — Visual Direction / MMORPG 2D Pixel Art Upgrade** — **CLOSED — live verified** (2026-06-18)

Theme 1 runtime reskin merged (PR #52), in-match character sprite hotfix merged (PR #53), closure docs merged (PR #54), ranged normal attack visual projectiles merged (PR #55 @ `2188e7d`). Visual-only — no gameplay balance changes. Prior 4B–4D systems preserved on live.

**Phase 5A-1 — Basic Enemy Bot MVP** — **MERGED** (PR #59 @ `629756a`)

One Basic Red Warrior Bot (melee) with detection/chase/wind-up/attack/death, fallback-first Phaser graphics, no final assets. Visual + AI only; all 4B–4E systems frozen.

**Phase 5A-2 — Bot Polish** — **MERGED** (PR #60 @ `9a3f99c`)

Respawn, idle patrol, config-driven `easy|normal|hard` difficulty (default `normal`), and combat-feedback clarity (spawn ring, death burst, pulsing wind-up, smooth HP bar). Still one melee bot; no change to player stats / damage formula / core combat rules.

**Phase 5A-3 — Bot Brain (Memory / Goal / Decision)** — **MERGED** (PR #62 @ `7435cdc`)

Rule-based brain (`src/game/ai/` + `bot-brain-config.ts`): perception snapshot, short-term memory (~5s), goal scoring, 1–3 step plan, decision. Brain is a pure advisor; `BotSystem` executes. All 5A-2 behavior preserved.

**Phase 5A-4 — BotPlayer Class Parity** — **MERGED** (PR #64 @ `25514e3`)

The enemy is a `BotPlayer` (AI-controlled Warrior), not a monster. Stat baseline read by value from `HEROES`; bot-only difficulty multipliers + fairness clamp; Warrior class sprite tinted red with enemy ring/marker/HP bar; shared `testMeleeArc`/`CombatSystem` path. `EnemyBot`/`BotSystem` kept as compatibility aliases. Human stats unchanged.

**Phase 5A-5 — BotPlayer Ranged Class Parity** — **MERGED** (PR #65 @ `d975274`)

BotPlayer supports ranged classes (ranger/mage/priest) alongside warrior. Each class reads its baseline **by value** from `HEROES`, wears its own class sprite (red enemy treatment), and ranged classes fire the matching normal-attack projectile (ranger → arrow, mage → magic bolt, priest → holy bolt) by reusing the existing Phase 4E `showNormalAttackProjectile` — **visual-only, no new damage formula**. The brain uses the class `attackRange`. `debugSetClass` is the test/runtime hook. Warrior/Guardian stay melee. Human stats unchanged; difficulty bot-only.

**Phase 5A-6 — Ranged Combat Feel Tuning** — **MERGED** (PR #66 @ `96727ac`)

Ranged BotPlayers (ranger/mage/priest) space like a real player: a class-aware `BOT_RANGED_SPACING` config drives `hold_range` (stop and fire from the comfortable band) and `kite_back` (backpedal inside dangerCloseRange), scored between chase and the safety returns with kite hysteresis to prevent thrashing. Fairness-clamped, no healing AI, human stats / difficulty scope / frozen systems unchanged.

**Phase 5A-7 — Live BotPlayer Class + Player Attack/Skill Parity Fix** — **MERGED** (PR #67 @ `526da54`)

Fixes the **actual live match path** the product owner saw: the bot was hard-locked to the first Warrior because `MatchScene` constructed `BotPlayerSystem` with no class config (always `BOT_PLAYER.classId = 'warrior'`); `debugSetClass` (tests only) was the sole class switch. The live spawn path now selects a real class — `resolveLiveBotClass` (concrete `?botClass=` / launch data, `random`, or deterministic rotation), with `ClassSelectScene` opting production into **rotation** across Warrior/Ranger/Mage/Priest (a bare `MatchScene` start keeps the Warrior default for tooling). Each ranged class shows its sprite + matching normal-attack projectile in the real match. **Skill parity MVP:** the bot reads its class signature skill (slot1) from the shared `SKILLS` table through the same `SkillRuntimeSystem` the human uses, and weaves it like a real player (`castSkillReady` 95, between chase 70 and attack 100); a low-HP priest prioritises its heal (`castSkillDefensive` 105). Offensive skill damage resolves through the shared `player.takeDamage`/`CombatSystem` formula; skill VFX reuse the player's cast-flash/projectile/heal visuals; cooldown + bot-only mana gate spam. 5A-6 spacing/kite, investigate, dodge, mobile, human stats, difficulty scope, frozen systems unchanged.

**Phase 5A-8 — Remove Bot Pre-Attack / Skill Radius Telegraph** — **MERGED** (PR #68 @ `f73766e`)

Removed the ground-painted attack/skill radius/cone the product owner did not want: `BotPlayer.showWindupCue` drew a sector spanning `min(attackRange, 130) + radius` for the whole wind-up (a map-filling area read for ranged classes). The sector draw was replaced with a small **fixed** glow (`radius * 0.5`, ~12px) on the bot's own body, independent of `attackRange`/`attackArcDegrees` — no radius circle, cone, or range ring remains in gameplay. Body tint flash stays as the readability signal; projectiles, skill VFX, damage/heal timing, and BotBrain were unchanged. Now-unused `attackRange`/`attackArcDegrees` entity fields were deleted.

**Phase 5B-1 — Multi Bot Spawn Foundation** — **RUNTIME IN DRAFT (Agent A)**

**Agent A runtime in draft** — branch `cursor/phase-5b-1-multi-bot-spawn-foundation`, base `f73766e`. First authorized Phase 5B work: the match can spawn **more than one** AI BotPlayer, config-driven, each its own class / spawn / brain / cooldown / skill runtime / mana / HP. The Phase-5A `BotPlayerSystem` (which was simultaneously "the system MatchScene talks to" and the single bot's brain/combat runtime) was split: the per-bot runtime moved **unchanged** into a new `BotUnit`, and `BotPlayerSystem` became a thin **manager** owning `BotUnit[]`. Every legacy single-bot accessor (`bot`, `getBotSnapshot`, `tryPlayerMeleeHit`, all debug hooks) delegates to the primary unit, so the entire 5A regression surface is byte-for-byte unchanged; new multi-bot API (`getBotCount`, `getBotSnapshots`, `getBrainSnapshots`, `getSkillInfos`, per-index debug hooks) is additive. Encounter presets live in `bot-player-config.ts` (`duel_plus`/`arcane_pressure`/`sustain_pressure`/`ranged_harass`/`full_party_lite`, capped at `MAX_BOTS = 4`); each member declares a spawn offset from the base anchor so bots start apart. A **bare `MatchScene` start stays single-bot** (legacy tooling/regressions get exactly one bot via the existing `botClass` path); production (`ClassSelectScene`) and the new suite opt into a multi-bot encounter via launch data / `?encounter=`. Player melee now cleaves (every bot in the arc takes damage, closest returned for HUD). **Out of scope (NOT done):** squad AI, shared targeting, objective AI, inter-bot separation/spacing (5B-2), multi-bot balance scaling (5B-3), commander. New regression `phase-5b-1-multi-bot-spawn-regression.mjs` (23 checks) proves ≥2 independent bots that each attack/cast/die/respawn, reset×3 with no bot/projectile/brain duplication or leak, the single-bot path intact, mobile readability, human stats, difficulty scope, and frozen systems unchanged. All 10 existing suites stay green. **Not Ready, not merged.** Phase 5B-2…5C not started.

## Base snapshot

```
76f75f9  Merge pull request #57 (Phase 5A bot asset plan)
5c6f5d8  Merge pull request #56 (Phase 5A bot design plan)
2188e7d  Merge pull request #55 (Phase 4E ranged normal attack projectiles)
8767580  Merge pull request #54 (Phase 4E closure docs)
9405d1f  Merge pull request #53 (Phase 4E in-match character sprite hotfix)
aec453d  Merge pull request #52 (Phase 4E runtime reskin integration)
be02369  Merge pull request #51 (Phase 4E Theme 1 asset mock pack)
8a3ae52  Merge pull request #50 (Phase 4E mobile HUD / UX spec)
cc6cbde  Merge pull request #49 (Phase 4E visual design spec)
```

**Runtime base SHA:** `76f75f9ae052d6779b13c8ec5387364516806758`

**Live URL (verified):** https://clan-siege-arena.onrender.com

**Live bundle:** `index-BrWMfI8H.js` (4E + hotfix build, verified 2026-06-18)

## Phase 4E merged deliverables

### Planning and assets

- **PR #49 (C)** — Visual Design Spec @ `cc6cbde`
- **PR #50 (D)** — Mobile HUD / UX Safe Zones Spec @ `8a3ae52`
- **PR #51 (B)** — Theme 1 Asset Mock Pack @ `be02369`

### Runtime

- **PR #52 (A)** — Runtime Reskin Integration @ `aec453d`
- **PR #53 (A)** — In-Match Character Sprite Hotfix @ `9405d1f`
- **PR #55 (A)** — Ranged Normal Attack Projectiles @ `2188e7d`

### Closure

- **PR #54 (E)** — Phase 4E Closure Docs @ `8767580`

## Phase 5A planning (in progress)

- **PR #56 (D)** — Bot Design Plan @ `5c6f5d8` — **MERGED**
- **PR #57 (B)** — Bot Asset Plan @ `76f75f9` — **MERGED**
- **PR #58 (C)** — Bot Combat Feel Plan — Draft — planning only

## Open PRs

- **Phase 5A-7 Live BotPlayer Class + Skill Parity Runtime Fix** — Draft (Agent A) — branch `cursor/phase-5a-7-live-botplayer-class-skill-parity-fix`, base `96727ac` — live class selection (rotation/`?botClass=`) + class-skill weave MVP via the shared skill pipeline. Not Ready, not merged.

## Agent lane status

**Agent A** — 4E runtime + 5A-1→5A-6 bot runtime merged (#52–#55, #59, #60, #62, #64, #65, #66); **5A-7 live class + skill parity runtime fix in draft** (this work)

**Agent B** — 4E assets complete (#51 merged); 5A bot asset plan merged (#57)

**Agent C** — 5A bot combat feel plan draft in progress; 4E design complete (#49 merged)

**Agent D** — 5A bot design (#56) + 5A-3 brain design (#61) + 5A-4 BotPlayer parity design (#63) merged; 4E UX complete (#50 merged)

**Agent E** — lane clear

**Agent F** — 4E live verification PASS (38/38 + 17/17 + prior suites on live)

## Test / deploy evidence

- `npm run build` — PASS (5A-7 live class + skill parity fix)
- `phase-5a-live-botplayer-class-skill-parity-regression.mjs` — **28/28 PASS** (live spawn of warrior/ranger/mage/priest via launch path, rotation not locked to warrior, class sprite + projectile in real match, skill cast via shared `SKILLS`/`SkillRuntimeSystem`, shared-formula damage, readable telegraph + VFX, cooldown spam-guard, priest defensive heal, 5A-6 spacing/kite preserved, investigate, reset×3, mobile, human-unchanged, difficulty bot-only, freeze, no console errors)
- `phase-5a-ranged-combat-feel-regression.mjs` — **24/24 PASS** (5A-6 preserved)
- `phase-5a-bot-player-ranged-parity-regression.mjs` — **26/26 PASS** (5A-5 preserved)
- `phase-5a-bot-player-parity-regression.mjs` — **17/17 PASS** (5A-4 preserved)
- `phase-5a-bot-brain-regression.mjs` — **18/18 PASS** (B10 plan-step now green — the skill weave keeps the chase plan's basic-attack windup observable; verified 18/18 ×3)
- `phase-5a-bot-regression.mjs` — **20/20 PASS** (preserved)
- `phase-4e-visual-reskin-regression.mjs` — **38/38 PASS**
- `phase-4d-combat-feel-regression.mjs` — 17/17 PASS
- `phase-4c-c-timer-score-regression.mjs` — 18/18 PASS
- GitHub CI — no registered checks

## Next safe action

**One-pass QA of Phase 5A-7 Live BotPlayer Class + Skill Parity runtime fix (Agent F).** Do not Ready/merge without explicit authorization. Phase 5B/5C and final bot assets remain **NOT STARTED** and **NOT AUTHORIZED**.

## Must not do

- Do not start Phase 5A **runtime** or create final assets without explicit work order (5A planning authorized)
- Agent E: do not Ready/Merge PRs without explicit authorization

## Related docs

- [phase-5a-bot-design.md](./phase-5a-bot-design.md) — Phase 5A bot design plan (merged)
- [phase-5a-bot-asset-plan.md](./phase-5a-bot-asset-plan.md) — Phase 5A bot asset plan (merged)
- [phase-5a-bot-combat-feel-plan.md](./phase-5a-bot-combat-feel-plan.md) — Phase 5A bot combat feel plan (draft)
- [phase-4e-close-report.md](./phase-4e-close-report.md) — Phase 4E closure report
- [phase-4e-runtime-reskin-report.md](./phase-4e-runtime-reskin-report.md)
- [phase-close-report.md](./phase-close-report.md)
- [final-gate-report.md](./final-gate-report.md)
- [open-pr-dashboard.md](./open-pr-dashboard.md)
- [release-checklist.md](./release-checklist.md)
- [agent-worklog.md](./agent-worklog.md)
