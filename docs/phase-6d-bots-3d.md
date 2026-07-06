# Phase 6D — Bots in 3D (AI enemy players)

> Status: **IMPLEMENTED — 13/13 bot checks pass in browser**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6c-combat-port.md](phase-6c-combat-port.md)

## What this phase delivers

AI enemy BotPlayers fighting in the 3D renderer, reusing the entire 2D bot
**brain** unchanged and porting only the executor off Phaser.

- **AI reused byte-for-byte** (pure TS, no Phaser): `ai/BotBrain`,
  `ai/BotPerception`, `ai/BotMemory`, `controllers/BotPlayerController`,
  `data/bot-brain-config`, `data/bot-player-config` (difficulty profiles,
  ranged spacing, encounter presets, separation config), plus
  `SkillRuntimeSystem` for the class skill.
- **`sim/SimBot.ts`** — headless port of `systems/BotUnit`: same
  perceive→brain→controller→execute loop, wind-up → attack → recovery
  sequence, respawn, patrol, stuck detection, difficulty-scaled stats
  (bot-only multipliers, fairness clamp vs the player's speed), ranged
  spacing (kite/hold), and class-skill weaving. Movement integrates through
  the same `stepCircleMovement` + `WallRect` collision the player uses;
  Phaser bodies/tweens are replaced by a `think()` / `integrate()` split and
  `BotEmit` render events.
- **Both combat directions in `MatchSim`**: bots damage the player through
  the shared `CombatSystem` formula (HP shown in the HUD, hurt flash + damage
  number); the player's normal attack, melee skills, AoE skills, and
  projectiles (incl. impact-AoE splash) all hit bots via the same
  `HitShapes` used against the dummy.
- **Multi-bot** encounters with Phase 5B-2 separation ported (soft push,
  melee-holds-front / ranged-yields bias, leash-safe, smoothed).
- **`render3d/BotView3D.ts`** — red enemy capsule per class (ranged bots wear
  a floating orb), facing beak, HP bar + name label (CSS2D), amber wind-up
  telegraph, hit flash on HP drop, death tip-over + fade, respawn pop.
- URL params: `?botClass=<class>` (single bot) or `?encounter=<preset>`
  (duel_plus / arcane_pressure / … / full_party_lite), mirroring
  `MatchSceneData`. Neither → one Warrior bot.

## Verified (Playwright, dev build) — 13/13

| Check | Result |
|---|---|
| Single warrior bot spawns at 1750,3450 | ✅ |
| Bot detects, chases, and its swing damages the player (HP drop + "Enemy hit you") | ✅ |
| Player nukes bot → dead → respawns at full HP after 4 s | ✅ |
| Player normal attack damages the bot (shared formula) | ✅ |
| Ranged mage bot damages the player from range | ✅ |
| `encounter=duel_plus` → 2 bots (warrior + ranger), spawned apart (sep) | ✅ |
| `encounter=full_party_lite` → 4 bots | ✅ |
| No page errors · `npm run build` clean | ✅ |

Bot difficulty defaults to `normal`, so effective Warrior stats match the 2D
enemy (hp 599, etc.). Human stats/formula untouched.

## Out of scope (next slices)

Objectives / capture / siege buff / match timer + win condition and the
**parity gate** (6E, then 3D becomes default), GLTF models + real VFX (6F),
quality tiers (6G). Player death/respawn is intentionally absent — the 2D
game has none either.
