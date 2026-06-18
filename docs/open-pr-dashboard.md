# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-18 (Phase 5A-1 bot MVP runtime draft)  
> **Latest base:** `claude/game-file-analysis-a20xup` @ `022973c`

## Summary

**Phase 4E complete** — PR #52–#55 merged; live verified PASS.

**Phase 5A planning complete:** Bot design (#56), asset plan (#57), combat feel plan (#58) merged.

**Active draft:** Phase 5A-1 Basic Enemy Bot MVP runtime (Agent A) — first enemy bot. **Not Ready, not merged.**

---

## Open PR — Phase 5A-1 Basic Enemy Bot MVP (Draft)

**Agent A: Phase 5A-1 — Basic Enemy Bot MVP**  
Branch `cursor/phase-5a-basic-enemy-bot-mvp` — Base `022973c7c9cfbd6ab8de8cb537bdc2577d9ca6dd`

New files: `src/game/data/bot-warrior.ts`, `src/game/entities/EnemyBot.ts`, `src/game/systems/BotSystem.ts`, `scripts/phase-5a-bot-regression.mjs`. Touched: `src/game/scenes/MatchScene.ts` (integration), docs. No asset/package/deploy changes. No gameplay balance changes.

One Basic Red Warrior Bot (melee): detection → chase → wind-up telegraph → attack → recovery → death. Fallback-first Phaser graphics; no final assets. No respawn, no objective/Gate/Core AI, no skills, no multi-bot.

Regression: `phase-5a-bot-regression.mjs` **18/18**; `phase-4e` 38/38; `phase-4d` 17/17; `phase-4c-c` 18/18; prior stack 57/57.

---

## Recently merged — Phase 5A planning

**PR #57 (Agent B)** — Phase 5A Bot Asset Plan  
MERGED @ `76f75f9ae052d6779b13c8ec5387364516806758`

**PR #56 (Agent D)** — Phase 5A Bot Design Plan  
MERGED @ `5c6f5d8649e656e97de67c183bb6df6550557a27`

---

## Recently merged — Phase 4E (complete)

**PR #55 (Agent A)** — Ranged Normal Attack Projectiles  
MERGED @ `2188e7d3a5baea82e855a85aa5d3ca1640991db4`

**PR #54 (Agent E)** — Phase 4E Closure Docs  
MERGED @ `87675806df9dcd1762bd3afc07a77ac861f504ef`

**PR #53 (Agent A)** — In-Match Character Sprite Hotfix  
MERGED @ `9405d1fba15a4c4195ec67ffdc50c7772bbf4f05`

**PR #52 (Agent A)** — Runtime Reskin Integration — Theme 1  
MERGED @ `aec453ddef9ce983325bbfc58db5a2ad7bd69332`

**PR #51 (Agent B)** — Theme 1 Visual Asset Mock Pack  
MERGED @ `be02369e76678f204db8a5a1aac54ccecbf963ae`

**PR #50 (Agent D)** — Mobile HUD / UX Safe Zones Spec  
MERGED @ `8a3ae5273d495bb47b1ed352d32ffb8dfaeacbce`

**PR #49 (Agent C)** — Visual Design Spec  
MERGED @ `cc6cbde4e552f49f13e71c320642a44cb2413d53`

---

## Live deploy

**URL:** https://clan-siege-arena.onrender.com  
**Bundle:** `index-BrWMfI8H.js`  
**Status:** Verified by Agent F (2026-06-18) — LIVE VERIFIED — IN-MATCH CHARACTER SPRITE HOTFIX PASS

---

## Agent lane summary

| Agent | Status |
|-------|--------|
| A | 4E runtime complete (#52–#55 merged); lane clear |
| B | 4E assets complete (#51 merged); 5A bot asset plan merged (#57) |
| C | 5A bot combat feel plan draft open; 4E design complete (#49 merged) |
| D | 5A bot design merged (#56); 4E UX complete (#50 merged) |
| E | lane clear |
| F | 4E live verification PASS |

---

## Next safe action

1. Review/merge Phase 5A bot combat feel plan PR (#58)  
2. After all planning merges: issue Agent A implementation work order  
3. Phase 5A **runtime** remains **NOT AUTHORIZED** until explicit work order
