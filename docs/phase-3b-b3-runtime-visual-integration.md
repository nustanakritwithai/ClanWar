# Phase 3B-B3 — Runtime Combat Visual Integration

> **Lane A (Agent A)** — swaps Phaser-primitive combat placeholders for
> existing SVG assets under `public/assets/vfx/` and `public/assets/combat/`.
> Visual-only; no gameplay/balance changes. Does **not** touch
> `public/assets/**` (Agent B lane).

## Scope delivered

- `MatchScene.preload()` loads priority combat SVG textures via Phaser `load.svg`.
- `CombatVfx.ts` — texture keys, loader, hit spark, impact burst, slash arc, AoE marker, heal spark/burst (primitive fallback if texture missing).
- `Projectile.ts` — Power Shot / Fireball bodies use `projectile_arrow.svg` / `projectile_fireball.svg`.
- `MatchScene` — optional slash arc on Cleave, Shield Bash, Gate Breaker melee hits.
- Phase label → `Phase 3B-B3: Runtime Combat Visual Integration`.

## Assets integrated (existing repo only)

| Asset | Use |
|---|---|
| `combat/projectile_arrow.svg` | Power Shot body |
| `combat/projectile_fireball.svg` | Fireball body |
| `vfx/hit_spark.svg` | Melee + projectile hit |
| `vfx/impact_burst.svg` | Fireball impact, AoE hits |
| `combat/aoe_marker.svg` | Arrow Rain / Frost Zone / Holy Circle / placeholder AoE |
| `vfx/heal_spark.svg` | Priest Heal |
| `vfx/heal_cross_burst.svg` | Holy Circle / Revival Prayer |
| `vfx/slash_arc.svg` | Cleave / Shield Bash / Gate Breaker swing |

## Deferred (per brief)

- UI feedback (`cooldown_swirl`, `denied_flash`, etc.)
- Targeting previews (`attack_cone`, `skill_range_circle`, `target_reticle`)
- All `status/*.svg` — Phase 3C
- **Objective assets** (`public/assets/objectives/**`) — Agent B Phase 3B-B4 pack for Phase 4 runtime

## Files changed

- `src/game/ui/CombatVfx.ts`
- `src/game/entities/Projectile.ts`
- `src/game/scenes/MatchScene.ts` (preload + slash arc wiring)
- `src/game/constants.ts`
- `README.md` (status sync)
- `scripts/phase-3b-b3-visual-regression.mjs` (optional extra check)

## Tests

```bash
npm run build
npm run preview
node scripts/mobile-multitouch-verify.mjs http://127.0.0.1:4173
node scripts/phase-3b-b2-regression.mjs http://127.0.0.1:4173
node scripts/phase-3b-b3-visual-regression.mjs http://127.0.0.1:4173
```

## Lane boundaries

- Agent A: `src/game/**`, `scripts/**`, runtime docs — **no** `public/assets/**`
- Agent B (3B-B4): objective asset pack for future Phase 4 — **no** `src/game/**`
