# Project Status

> **Maintained by:** Agent E (Final Gate / Release Auditor)  
> **Last updated:** 2026-06-18 (Phase 5A-4 BotPlayer Class Parity design plan — Agent D, docs-only)  
> **Base branch:** `claude/game-file-analysis-a20xup` @ `7435cdc`

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

**Phase 5A-4 — BotPlayer Class Parity** — **DESIGN PLANNING ONLY — IMPLEMENTATION NOT STARTED**

Agent D design plan (this work) — reframe the enemy from a monster-like `EnemyBot` into a `BotPlayer`: an AI-controlled player that uses the **same class data/stats/sprite/attack rules** as a real player class (Warrior first), differing only in controller (BotBrain vs human input). Stat baseline from `HEROES` (`heroes.ts`) with bot-only difficulty multipliers + fairness clamp; warrior class sprite with red enemy treatment; shared melee combat path. Docs-only; no `src/` changes. Recommends a staged hybrid migration. No multi-bot, ranged, skills, objective AI, or LLM/ML. Phase 5B/5C not started.

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

- **Phase 5A-4 BotPlayer Class Parity Design Plan** — Draft (Agent D) — branch `cursor/phase-5a-4-botplayer-parity-design`, base `7435cdc` — docs-only class-parity architecture. Planning only, not merged.

## Agent lane status

**Agent A** — 4E runtime + 5A-1/5A-2/5A-3 bot runtime merged (#52–#55, #59, #60, #62); lane clear

**Agent B** — 4E assets complete (#51 merged); 5A bot asset plan merged (#57)

**Agent C** — 5A bot combat feel plan draft in progress; 4E design complete (#49 merged)

**Agent D** — 5A bot design (#56) + 5A-3 brain design (#61) merged; **5A-4 BotPlayer class parity design plan in draft** (this work); 4E UX complete (#50 merged)

**Agent E** — lane clear

**Agent F** — 4E live verification PASS (38/38 + 17/17 + prior suites on live)

## Test / deploy evidence

- Phase 5A-3 runtime (merged @ `7435cdc`): build PASS; `phase-5a-bot-brain-regression.mjs` 18/18; `phase-5a-bot-regression.mjs` 20/20; `phase-4e` 38/38; `phase-4d` 17/17; `phase-4c-c` 18/18.
- Phase 5A-4 is **design planning only** — no build/test deliverable this PR (docs-only).
- GitHub CI — no registered checks

## Next safe action

**Review Phase 5A-4 BotPlayer Class Parity design plan (Agent D).** After merge + explicit work order + Agent E scope gate, issue the Agent A 5A-4 runtime work order. Phase 5A-4 runtime, Phase 5B/5C, and final bot assets remain **NOT STARTED** and **NOT AUTHORIZED**.

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
