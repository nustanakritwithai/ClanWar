# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-21 (Phase 5B-2 multi bot separation / formation safety draft)  
> **Latest base:** `claude/game-file-analysis-a20xup` @ `fa7480f`

## Summary

**Phase 4E complete** — PR #52–#55 merged; live verified PASS.

**Phase 5A-1 → 5A-8 bot runtime** — PR #59, #60, #62, #64, #65, #66, #67, #68 merged @ `f73766e`.

**Phase 5B-1 Multi Bot Spawn Foundation** — PR #69 merged @ `fa7480f`.

**Active draft:** Phase 5B-2 Multi Bot Separation / Formation Safety (Agent A) — multiple BotPlayers no longer stack / collapse into one blob when converging on the player; a soft, class-aware bot-vs-bot separation push keeps a readable gap without breaking attacks, kiting, leash, or the off-leash return. Separation safety only — no squad AI / objective AI / balance scaling. **Not Ready, not merged.**

---

## Open PR — Phase 5B-2 Multi Bot Separation / Formation Safety (Draft)

**Agent A: Phase 5B-2 — Multi Bot Separation / Formation Safety**  
Branch `cursor/phase-5b-2-multi-bot-separation-formation-safety` — Base `fa7480ffd1fe3bfc315e795ab05f63cd2b0cf2b4`

Touched: `src/game/systems/BotUnit.ts` (separation state + `getSeparationSample()` / `applySeparation()`; additive `leashRange` in the snapshot), `src/game/systems/BotPlayerSystem.ts` (manager applies a post-process separation pass after each unit's intent, multi-bot only), `src/game/data/bot-player-config.ts` (`MULTI_BOT_SEPARATION` config), new `scripts/phase-5b-2-multi-bot-separation-regression.mjs`, docs. **No `Player`/`heroes.ts`/`CombatVfx.ts`/`BotBrain.ts`/`BotPlayerController.ts`/`SkillRuntimeSystem.ts`/`MatchScene.ts`/`ClassSelectScene.ts`/`types.ts`/objective/capture/siege/timer/result edits.** No asset/package/deploy changes.

**What changed:** Each `BotUnit` still computes its own brain/controller intent; the manager then applies a SOFT bot-vs-bot separation push as a post-process — nearby living bots push away from each other, scaled by proximity, smoothed over time, clamped to the bot's fair move speed. It is class-aware (melee yields less so the Warrior holds the front and reaches melee; ranged yields fully and is pushed harder off a melee body so Ranger/Mage/Priest stay out of the Warrior's space), and is suppressed while a bot is planted in a swing (windup/recovery → clean attacks, no jitter) or returning to spawn (the off-leash/stuck safety wins). The outward-from-spawn component is dropped at the leash edge so separation can never carry a bot past its leash. Single-bot matches skip the pass entirely, so the whole 5A surface is byte-for-byte unchanged. **Out of scope (NOT done):** squad AI, shared targeting, group target selection, objective AI, formation commander, tactical roles, flank/surround AI, advanced pathfinding, multi-bot balance scaling (5B-3).

Regression: `phase-5b-2-multi-bot-separation-regression.mjs` (new) **23/23** (verified ×2); `phase-5b-1-multi-bot-spawn` 23/23; `phase-5a-remove-bot-telegraph` 22/22; `phase-5a-live-botplayer-class-skill-parity` 28/28; `phase-5a-ranged-combat-feel` 24/24; `phase-5a-bot-player-ranged-parity` 26/26; `phase-5a-bot-player-parity` 17/17; `phase-5a-bot-brain` 18/18; `phase-5a-bot-regression` 20/20; `phase-4e` 38/38; `phase-4d` 17/17; `phase-4c-c` 18/18 — all run sequentially on a single idle preview. `npm run build` PASS.

---

## Recently merged — Phase 5B-1 Multi Bot Spawn Foundation

**PR #69 (Agent A)** — Phase 5B-1 Multi Bot Spawn Foundation  
MERGED @ `fa7480ffd1fe3bfc315e795ab05f63cd2b0cf2b4`

---

## Recently merged — Phase 5A

**PR #68 (Agent A)** — Phase 5A-8 Remove Bot Radius Telegraph  
MERGED @ `f73766eb419333608df081a2977a3633e7e2f13c`

**PR #67 (Agent A)** — Phase 5A-7 Live BotPlayer Class + Player Attack/Skill Parity Fix  
MERGED @ `526da54691cb97c461d31d20b48d397a196f1916`

**PR #66 (Agent A)** — Phase 5A-6 Ranged Combat Feel Tuning Runtime  
MERGED @ `96727ac0927dc761fad08425f60712f00f9465c8`

**PR #65 (Agent A)** — Phase 5A-5 BotPlayer Ranged Class Parity Runtime  
MERGED @ `d975274362d54db6bda12ec9015598e811bdaa96`

**PR #64 (Agent A)** — Phase 5A-4 BotPlayer Class Parity Runtime  
MERGED @ `25514e37a623e27893883895a1224c8e2057c27f`

**PR #63 (Agent D)** — Phase 5A-4 BotPlayer Class Parity Design Plan  
MERGED @ `81e81a59c52d6e89aa1d28406b5bb2a886afd4a3`

**PR #62 (Agent A)** — Phase 5A-3 Bot Brain Runtime  
MERGED @ `7435cdc64633ed55bd8b862b6a7e30aa0dcf95b8`

**PR #61 (Agent D)** — Phase 5A-3 Bot Brain Design Plan  
MERGED @ `8db7847007c02f9d2dcc4173d79f8273e8ad0e32`

**PR #60 (Agent A)** — Phase 5A-2 Bot Polish  
MERGED @ `9a3f99c9bac63bb420dcf49baf91803ca8c3cfc7`

**PR #59 (Agent A)** — Phase 5A-1 Basic Enemy Bot MVP  
MERGED @ `629756ab93fab993b511daaaa8597dad8cdc2bdb`

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
