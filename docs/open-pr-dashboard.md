# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-21 (Phase 5A-8 remove bot radius telegraph draft)  
> **Latest base:** `claude/game-file-analysis-a20xup` @ `526da54`

## Summary

**Phase 4E complete** — PR #52–#55 merged; live verified PASS.

**Phase 5A-1 → 5A-7 bot runtime** — PR #59, #60, #62, #64, #65, #66, #67 merged @ `526da54`.

**Active draft:** Phase 5A-8 Remove Bot Pre-Attack / Skill Radius Telegraph (Agent A) — removes the ground-painted attack/skill radius/cone from real gameplay; basic attack + skill cast keep a small fixed body glow + tint flash only. **Not Ready, not merged.**

---

## Open PR — Phase 5A-8 Remove Bot Radius Telegraph (Draft)

**Agent A: Phase 5A-8 — Remove Bot Radius Telegraph**  
Branch `cursor/phase-5a-8-remove-bot-radius-telegraph` — Base `526da54691cb97c461d31d20b48d397a196f1916`

Touched: `src/game/entities/BotPlayer.ts` (replace the sector/cone wind-up draw with a small fixed body glow; drop now-unused `attackRange`/`attackArcDegrees` entity fields; add `getWindupCueRadius()` QA hook), `src/game/systems/BotPlayerSystem.ts` (call-site update, drop the now-unused stats passed into the entity), new `scripts/phase-5a-remove-bot-telegraph-regression.mjs`, docs. **No `Player`/`heroes.ts`/`CombatVfx.ts`/`BotPlayerController.ts`/`BotBrain.ts`/`SkillRuntimeSystem.ts`/objective/capture/siege/timer/result edits** — none were needed; the only ground-painted telegraph in the codebase was the one sector drawn in `BotPlayer.showWindupCue`.

**What changed:** `showWindupCue` used to fill+stroke a sector (`min(attackRange, 130) + radius`, `attackArcDegrees` wide) in front of the bot for the whole wind-up — a map-filling area for ranged classes (up to ~154px for ranger/mage/priest). It now draws a small circle fixed at `radius * 0.5` (~12px) centered on the bot's own body, with no dependency on `attackRange`/`attackArcDegrees` at all — so a ranger's skill cast reads identically to a warrior's melee swing. The existing body tint flash, `botAttackWarning`-tagged visibility lifecycle (so older suites that just check "some wind-up cue exists" keep passing), normal-attack projectiles, distinct skill bolt, heal burst/spark, and all damage/heal timing are untouched.

Regression: `phase-5a-remove-bot-telegraph-regression.mjs` (new) **22/22**; `phase-5a-live-botplayer-class-skill-parity` 28/28; `phase-5a-ranged-combat-feel` 24/24; `phase-5a-bot-player-ranged-parity` 26/26; `phase-5a-bot-player-parity` 17/17; `phase-5a-bot-brain` 18/18; `phase-5a-bot-regression` 20/20; `phase-4e` 38/38; `phase-4d` 17/17; `phase-4c-c` 18/18 — all 10 commands run sequentially on a single idle preview.

---

## Recently merged — Phase 5A

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
