# Phase 6E — Objectives / Match Loop in 3D + Parity Gate + 3D default

> Status: **IMPLEMENTED — 28/28 match-flow checks + 3/3 renderer-switch checks pass**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6d-bots-3d.md](phase-6d-bots-3d.md)

## What this phase delivers

The full match loop in the 3D renderer — a complete playable match with
win/lose/draw — and, with the parity gate passed, **3D is now the default
renderer** (`?renderer=2d` keeps the legacy Phaser game until 6F).

### Logic reused byte-for-byte (pure TS, untouched)
`data/match-rules.ts` (300s duration, `resolveTimeUp` score → core-HP
tiebreak → draw), `data/objectives.ts` (4 gate/core defs), 
`data/capture-objectives.ts` (6 capture points), `data/siege-buff.ts`
(+30% gate damage), `combat/HitShapes`, `systems/CombatSystem`.

### Headless ports (Phaser halves dropped, logic 1:1)
- **`sim/SimObjectives.ts`** ← `systems/ObjectiveSystem`: gate
  `intact→under_attack(2s)→destroyed`; core `protected→vulnerable` (own gate
  down) `→under_attack→destroyed`; protected core blocks all damage with
  "Destroy Gate first" (2s cooldown); unified gate damage pipeline
  `raw × (1+playerBonus) × (1+skillBonus) × (1+siegeBonus)` rounded once;
  4 hit entry points (melee arc / AoE / legacy range / projectile segment);
  priority prompt attack_gate → attack_core → defend_core → victory;
  red core down → victory, blue core down → defeat (500ms beat, sim-tick
  counted).
- **`sim/SimCapture.ts`** ← `systems/CaptureSystem`: stand-in-circle
  progress (7s), leaving pauses in place (no decay) + "Capture Paused",
  complete → owner flip + Objective Score (+5/+6/+8); Siege Ruins ownership
  drives `siegeBuffActive`.
- **`MatchSim`**: timer countdown + one-shot Final Minute (≤60s) + time-up
  resolution (1.3s beat → `matchOver` event); core result wins a same-tick
  race; combat inputs and bots freeze once resolved; every player damage
  path (normal attack, melee/AoE/legacy skills, projectiles incl. impact
  AoE splash) routes to objectives with the same bonuses as 2D
  (`hero.stats.gateDamageBonus` — warrior 0.2, `skill.gateDamageBonus`,
  siege ×1.3, `skipsObjectiveDamage` respected).

### 3D views + HTML HUD
- **`render3d/ObjectiveView3D.ts`**: HP bars + name/state labels over
  gates/cores, protected 🛡 ring, vulnerable/under-attack pulse ring, hit
  flash, destroyed collapse (sink + darken via MapBuilder structure
  handles). **CaptureView3D**: owner-colored ground rings, progress arc,
  labels.
- **`ui-html/MatchHud.ts`**: top strip (⏱ MM:SS + Obj Score), priority
  prompt, capture progress bar, siege badge, toasts, and the end-of-match
  overlay (VICTORY/DEFEAT/DRAW + ResultScene reason copy + score/core-HP
  lines + Play Again).

## Verified (Playwright, dev build)

28/28 match-flow checks — highlights:

| Check | Result |
|---|---|
| Protected red core takes 0 damage while gate intact | ✅ |
| Gate damage math `round(200×100/110)=182` (shared armor formula) | ✅ |
| Gate destroyed → "Gate Breached", core vulnerable, priority → attack_core | ✅ |
| Red core destroyed → VICTORY overlay + reason + Play Again | ✅ |
| Capture: 31% @2s, holds while outside, complete → owner blue +5 score | ✅ |
| Siege buff: pre 91 → post `round(130×100/110)=118` on the same swing | ✅ |
| Warrior gate bonus via real attack: `round(round(70×1.2)×100/110)=76` | ✅ |
| Time-up 5–0 → score_victory overlay with score line | ✅ |
| Time-up 0–0 equal HP → DRAW | ✅ |
| Final Minute toast at ≤60s | ✅ |
| Bots + objectives coexist (duel_plus) · HUD chips render | ✅ |
| Attack input ignored after match resolved | ✅ |

Renderer switch: bare URL → 3D ✅ · `?renderer=2d` → Phaser menu ✅ ·
`?renderer=3d` still works ✅ · no page errors · `npm run build` clean.

## Out of scope (deliberate parity)
No player death/respawn (2D has none); bots don't attack/capture objectives
(2D BotPlayerSystem explicitly has no objective AI) — so red score and the
defeat path stay as unreachable in normal play as they are in 2D.

## Next
6F: real GLTF models + VFX + remove Phaser · 6G: quality tiers/performance.
