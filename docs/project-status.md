# Project Status

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-20 (Phase 5A-6 Ranged Combat Feel Tuning runtime — Agent A draft)  
> **Base branch:** `claude/game-file-analysis-a20xup` @ `d975274`

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

**Phase 5A-6 — Ranged Combat Feel Tuning** — **RUNTIME IN DRAFT (Agent A)**

**Agent A runtime in draft** — branch `cursor/phase-5a-6-ranged-combat-feel-tuning`, base `d975274`: ranged BotPlayers (ranger/mage/priest) now **space like a real player**. A class-aware spacing config (`BOT_RANGED_SPACING`: `dangerCloseRange`/`preferredMinRange`/`preferredMaxRange`/`kiteSpeedMul`) drives two new brain goals — `hold_range` (stop and fire from the comfortable band, never chase closer) and `kite_back` (backpedal when the player gets inside dangerCloseRange). Both score between chase and the safety returns, so the bot prefers spacing over a blind rush but **stuck/off-leash still overrides**, and `attack_player`/`recover_after_attack` still outrank them (shoot when ready, kite/hold while reloading). Kite uses a hysteresis band (engage at dangerClose, disengage at preferredMin) plus the existing motion deadband to prevent goal thrashing. Ranger kites most, mage holds mid, priest holds safest (no healing AI). Projectiles, wind-up dodge window, lost-player investigate, human stats, difficulty scope and all frozen systems are unchanged. `kiteSpeedMul` is still fairness-clamped to the player's speed. No multi-bot, skills, objective AI, advanced pathfinding, or LLM/ML. **Not Ready, not merged.** Phase 5B/5C not started.

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

- **Phase 5A-6 Ranged Combat Feel Tuning Runtime** — Draft (Agent A) — branch `cursor/phase-5a-6-ranged-combat-feel-tuning`, base `d975274` — ranged bot spacing/kite/hold-range + readability. Not Ready, not merged.

## Agent lane status

**Agent A** — 4E runtime + 5A-1→5A-5 bot runtime merged (#52–#55, #59, #60, #62, #64, #65); **5A-6 ranged combat feel tuning runtime in draft** (this work)

**Agent B** — 4E assets complete (#51 merged); 5A bot asset plan merged (#57)

**Agent C** — 5A bot combat feel plan draft in progress; 4E design complete (#49 merged)

**Agent D** — 5A bot design (#56) + 5A-3 brain design (#61) + 5A-4 BotPlayer parity design (#63) merged; 4E UX complete (#50 merged)

**Agent E** — lane clear

**Agent F** — 4E live verification PASS (38/38 + 17/17 + prior suites on live)

## Test / deploy evidence

- `npm run build` — PASS (5A-6 ranged combat feel tuning)
- `phase-5a-ranged-combat-feel-regression.mjs` — **24/24 PASS** (ranger/mage/priest stop-in-range + kite + hold + projectile, no thrash, stuck/off-leash return, investigate, dodge window, human-unchanged, difficulty bot-only, mobile, freeze)
- `phase-5a-bot-player-ranged-parity-regression.mjs` — **26/26 PASS** (5A-5 preserved)
- `phase-5a-bot-player-parity-regression.mjs` — **17/17 PASS** (5A-4 preserved)
- `phase-5a-bot-brain-regression.mjs` — **17/18** (B10 plan-step sampling-window flake — pre-existing, reproduces byte-identically on the unmodified base `d975274`; warrior-only path untouched by 5A-6)
- `phase-5a-bot-regression.mjs` — **20/20 PASS** (preserved)
- `phase-4e-visual-reskin-regression.mjs` — **38/38 PASS**
- `phase-4d-combat-feel-regression.mjs` — 17/17 PASS
- `phase-4c-c-timer-score-regression.mjs` — 18/18 PASS
- GitHub CI — no registered checks

## Next safe action

**One-pass QA of Phase 5A-6 Ranged Combat Feel Tuning runtime draft (Agent F).** Do not Ready/merge without explicit authorization. Phase 5B/5C and final bot assets remain **NOT STARTED** and **NOT AUTHORIZED**.

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
