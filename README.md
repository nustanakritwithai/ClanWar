# Clan Siege Arena

Browser-based 2D top-down siege arena (MVP). Built with **Vite + TypeScript + Phaser 3**.

> Status: **Phase 4A** — map visual runtime foundation (three-route battlefield SVG tiles in Match).
> No bot AI, shop, objectives gameplay, or player death yet.

See [docs/phase-4a-map-visual-runtime-foundation.md](docs/phase-4a-map-visual-runtime-foundation.md).

> **Phase 6 (in progress): 3D renderer with Three.js.** Append `?renderer=3d`
> to the game URL to try it (Phase 6A: walk the map in 3D; 2D stays the
> default until feature parity). Plan: [docs/phase-6-3d-threejs-upgrade-plan.md](docs/phase-6-3d-threejs-upgrade-plan.md),
> current slice: [docs/phase-6a-renderer-foundation.md](docs/phase-6a-renderer-foundation.md).

## Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## What works now (Phase 0–4A)

- Menu → **Start** → **ClassSelect** → Match with chosen hero class.
- Five classes with real stats, mana regen, skill cooldown/mana from `skills.ts`.
- **Training dummy** — attack + skill damage/heal, floating numbers.
- **Combat SVG VFX** — arrow/fireball projectiles, hit spark, impact burst, AoE marker, heal effects.
- **Map SVG terrain** — three-route battlefield (main / high ground / shadow), bases, structures, guide markers.
- **Mobile multi-touch** — joystick + action buttons simultaneously.
- Mobile compact layout, fullscreen entry, PWA manifest.
- Debug overlay (toggle with **`** or **F1** in Match).

## Deploy on Render

This repo includes a `render.yaml` Blueprint that deploys the game as a free
**Static Site** (Vite build → `dist/`).

**Option A — Blueprint (recommended):**
1. Push this branch to GitHub.
2. In Render: **New → Blueprint**, pick this repo, choose the branch.
3. Render reads `render.yaml` and creates the static site. Click **Apply**.

**Option B — manual Static Site:**
1. Render: **New → Static Site**, connect the repo/branch.
2. Build command: `npm ci && npm run build`
3. Publish directory: `dist`
4. Add a rewrite rule: `/*` → `/index.html` (Redirects/Rewrites tab).

Vite is configured with `base: './'`, so the built asset paths are relative and
work under any Render URL.

## Project layout

```
src/
  main.ts                  # Phaser bootstrap
  game/
    config.ts              # game config + scene list
    constants.ts           # scene keys, map size, colors
    types.ts               # map/marker/wall types
    scenes/                # Boot, Menu, ClassSelect*, Match, Result*
    systems/InputSystem.ts # WASD + joystick scaffold
    entities/Player.ts     # placeholder player
    data/map-small-twin-fortress.ts
```
`*` = placeholder scene for a later phase.

Files are created per-phase on purpose (no empty stubs); the full module tree in
the planning doc is the end-state target, not day-one scaffolding.
