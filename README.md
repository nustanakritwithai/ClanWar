# Clan Siege Arena

Browser-based 2D top-down siege arena (MVP). Built with **Vite + TypeScript + Phaser 3**.

> Status: **Phase 3A** — class selection, hero runtime stats, HP/mana, skill cooldown/mana.
> No combat damage, shop, bots, or economy runtime yet.

See [docs/phase-2.5.md](docs/phase-2.5.md), [docs/phase-2.6.md](docs/phase-2.6.md), and [docs/phase-3a.md](docs/phase-3a.md).

## Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## What works now (Phase 0–3A)

- Menu → **Start** → **ClassSelect** → Match with chosen hero class.
- Five classes from `HEROES` with real **moveSpeed**, HP, mana, and stats on spawn.
- **Skills** use mana + cooldown from `skills.ts` (visual feedback only, no damage).
- Mobile compact layout, fullscreen entry, PWA manifest (Phase 2.6).
- Debug overlay (toggle with **`** or **F1** in Match).
- Data specs in `src/game/data/` for Phase 3+ combat/economy.

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
