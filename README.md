# Clan Siege Arena

Browser-based 2D top-down siege arena (MVP). Built with **Vite + TypeScript + Phaser 3**.

> Status: **Phase 2.5** — controls (Phase 2) plus visual action feedback pipeline
> and locked data specs for heroes/skills/economy/items. No real combat, shop,
> bots, or economy runtime yet.

See [docs/phase-2.5.md](docs/phase-2.5.md) for Phase 2.5 details and testing.

## Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## What works now (Phase 0–2.5)

- Menu → **Start** → Match; **Select Class** opens a placeholder list.
- Small Twin Fortress map, WASD/arrows + **virtual joystick** movement.
- **Attack / skills / ultimate / war action / items** — visual feedback only
  (flash, direction arc, button mock cooldown). See `docs/phase-2.5.md`.
- Smooth camera follow, collision, mobile touch UI (joystick + skill buttons).
- Debug overlay (toggle with **`** or **F1** in Match).
- Data specs in `src/game/data/` for Phase 3+ (heroes, skills, economy, items, rules).

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
