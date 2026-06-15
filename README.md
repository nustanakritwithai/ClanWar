# Clan Siege Arena

Browser-based 2D top-down siege arena (MVP). Built with **Vite + TypeScript + Phaser 3**.

> Status: **Phase 2.6** — mobile UX hotfix (fullscreen entry, compact control layout).
> Phase 2.5 action feedback + data specs remain. No combat, shop, bots, or economy runtime.

See [docs/phase-2.5.md](docs/phase-2.5.md) and [docs/phase-2.6.md](docs/phase-2.6.md).

## Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## What works now (Phase 0–2.6)

- Menu → **Start** (requests fullscreen on mobile) → Match; **Select Class** placeholder.
- Small Twin Fortress map, WASD/arrows + **virtual joystick** movement.
- **Attack / skills / ultimate / war action / items** — visual feedback only.
- **Compact mobile layout** on short viewports (`height < 480`) — see `docs/phase-2.6.md`.
- PWA manifest + fullscreen fallback button in Match.
- Debug overlay (toggle with **`** or **F1** in Match).
- Data specs in `src/game/data/` for Phase 3+.

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
