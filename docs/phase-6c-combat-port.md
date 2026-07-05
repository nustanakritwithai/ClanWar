# Phase 6C — Combat Port (player vs training dummy in 3D)

> Status: **IMPLEMENTED — 28/28 parity checks pass in browser**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6b-map-structures-3d.md](phase-6b-map-structures-3d.md)

## What this phase delivers

The full MatchScene player-vs-training-dummy combat loop, running headlessly
in the sim and rendered by the 3D layer. **Zero new combat math** — the sim
reuses the 2D modules directly:

- `combat/HitShapes` (melee arc / AoE circle / swept projectile segment)
- `systems/CombatSystem` (armor damage formula)
- `systems/SkillRuntimeSystem` (cooldown + mana gating — runtime-pure since
  its only `Player` import is type-only) with the same `data/skills.ts`
- Same constants: mana regen 8/s, projectile hit radius 14, dummy
  1000 HP / 10 armor / 2 s reset, dummy spawn 350 north of player spawn

Ported behaviors (MatchScene.handleAttack / applySkillCombatEffect, minus
objectives/bots which are 6D–6E scope):

- Normal attack: 90° melee arc, no cooldown, ranged classes also fire the
  visual-only bolt (arrow / magic bolt / holy bolt) exactly like 2D.
- `melee_arc` skills (Shield Bash, Cleave, Gate Breaker) with per-skill
  range/arc; `projectile` (Power Shot, Fireball incl. impact AoE);
  `aoe_circle` (self-centered for Holy Circle / War Taunt, facing-point
  otherwise; heal-per-second single application; War Taunt visual-only);
  `heal` (Heal, Revival Prayer); `legacy` (Trap range check, no-op utilities).
- Denied feedback: "NO MANA" / "CD", same gating order as 2D.

## New/changed modules

```
src/game/sim/MatchSim.ts          # + combat state, SimEvent queue, projectiles
src/render3d/DummyView.ts         # scarecrow dummy, HP bar, tip-over death
src/render3d/ProjectileView3D.ts  # arrow/fireball meshes keyed by sim id
src/render3d/VfxView3D.ts         # cone telegraphs, slashes, AoE rings, sparks,
                                  # heal glow, visual normal-attack bolts
src/render3d/CombatTextLayer.ts   # CSS2D damage numbers/+heal/denied + labels
src/ui-html/CombatHud.ts          # action buttons w/ cooldown sweep, HP/mana bars
src/game3d/InputSystem3D.ts       # + queueAction() for HUD touch buttons
src/game3d/boot3d.ts              # event dispatch, view wiring
```

Design: the sim pushes one-shot `SimEvent`s (hits, casts, markers, numbers);
the renderer drains them once per frame. Action presses are consumed after
the first tick of a frame so a slow frame running 2+ ticks can't double-fire.

## Verified (Playwright, all classes)

Final damage vs dummy must equal `round(raw × 100/110)` (armor 10):

| Check | Result |
|---|---|
| Normal attack per class (guardian 45→41, warrior 70→64, ranger 55→50, mage 35→32, priest 30→27) | ✅ all exact |
| Shield Bash 80→73 · Cleave 110→100 · Leap 100→91 · Gate Breaker 180→164 | ✅ |
| Power Shot 120→109 · Arrow Rain 90→82 · Trap 40→36 (legacy range) | ✅ |
| Fireball 130→118 (projectile+impact AoE) · Frost 35→32 · Meteor 240→218 | ✅ |
| Priest Heal/Holy Circle/Revival at full HP → "(HP full)", mana still spent | ✅ |
| War Taunt visual-only (no dummy damage) · Fortress Stand legacy no-op | ✅ |
| Mana deduction (35/55) & cooldown starts on cast | ✅ |
| Cooldown denial → "Skill on cooldown" · empty mana → "Not enough mana" | ✅ |
| Dummy kill at 0 HP → tips over → auto reset to 1000 HP after 2 s | ✅ |
| HUD attack button (touch path) deals damage | ✅ |
| No page errors · `npm run build` clean | ✅ |

28 passed / 0 failed. 2D mode untouched.

## Out of scope (next slices)

Bots in 3D (6D), objectives/capture/timer/win + parity gate (6E), GLTF
models + real VFX (6F), quality tiers (6G).
