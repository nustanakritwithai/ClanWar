# Phase 6A — 3D Renderer Foundation (Three.js)

> Status: **IMPLEMENTED — verified in browser (desktop keyboard + touch joystick smoke test)**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Decisions locked with the owner: tilted follow camera behind the player, low-poly stylized art.

## What this phase delivers

The first playable slice of the 2.5D architecture: the existing 2D gameplay
plane simulated headlessly at a fixed 60 Hz tick, rendered in 3D by Three.js.

- `?renderer=3d` on the game URL boots the 3D path; the default URL still
  boots the unchanged Phaser 2D game. Each path is a separate dynamic-import
  chunk — 3D mode never downloads Phaser (3D chunk ≈ 125 KB gzip vs 2D ≈ 378 KB).
- Player capsule (low-poly placeholder, hitbox ring = exact collision radius)
  walks the full Small Twin Fortress map with WASD/arrows or the HTML touch
  joystick (same layout, dead zone, and ramp as the 2D `VirtualJoystick`).
- Walls are boxes sitting exactly on the `WallRect` colliders; collision is a
  pure-TS port (`sim/MovementSim.ts`) with axis-separated resolution so
  diagonal input slides along walls like Arcade physics did.
- Tilted follow camera behind the player (~55° pitch, fixed yaw): screen-up is
  always toward the red base, so joystick/WASD mapping is identical to 2D.
- Objective markers render as colored discs straight from `MapDefinition`
  (coordinate verification aid; real structures land in 6B).
- Debug HUD (fps / position / input mode) toggled with ` or F1, same as 2D.
- `?class=<heroClassId>` selects the hero for movement-speed parity checks.

## New modules

```
src/main.ts                    # renderer switch (dynamic import per mode)
src/main2d.ts                  # unchanged Phaser bootstrap, now lazy-loaded
src/game/sim/MovementSim.ts    # pure circle-vs-WallRect movement + world bounds
src/game/sim/MatchSim.ts       # fixed-tick (60 Hz) match state, 6A: player only
src/render3d/Renderer3D.ts     # WebGL renderer, lights, fog, pixelRatio cap 2
src/render3d/CameraRig.ts      # tilted follow camera (fixed yaw, smoothed)
src/render3d/MapBuilder.ts     # ground/walls/marker discs from MapDefinition
src/render3d/PlayerView.ts     # capsule + facing beak + hitbox ring, walk bob
src/game3d/InputSystem3D.ts    # DOM port of InputSystem → same InputState shape
src/game3d/boot3d.ts           # game loop: fixed tick + interpolated render
src/ui-html/HtmlJoystick.ts    # DOM port of VirtualJoystick (same behavior)
src/ui-html/DebugHud.ts        # fps/pos overlay
```

Dependency rule enforced by construction: `game/sim` imports only `game/*`
pure modules (types, constants, data) — no `three`, no `phaser`, no DOM.

## Coordinate mapping (the one rule of the port)

2D `(x, y)` → 3D `(x, 0, z)` with `z = y`. Blue base = large z (camera side),
red base = far. Facing angle `a` maps to yaw `-a`. Nothing else converts.

## Verified behavior (Playwright, dev build)

| Check | Result |
|---|---|
| Spawn at `playerSpawn` (1500, 3900), warrior speed 190 | ✅ exact |
| Hold W 2s → Δy ≈ −380 (speed × time) | ✅ −383 (timer slop) |
| Walk into west edge wall | ✅ stops at x = 62 (wall 40 + radius 22) |
| Diagonal push into wall | ✅ x stays clamped, y slides (Arcade parity) |
| Push up into blue gate flank wall | ✅ stops at y = 3242 (3180 + 40 + 22) |
| Walk through the gate opening | ✅ passes |
| Touch-drag joystick in left zone | ✅ moves, `inputMode = touch` |
| Default URL (2D Phaser) | ✅ boots unchanged |
| `npm run build` (tsc + vite) | ✅ clean |

fps in the headless software-rendered test browser is not representative;
real-device fps measurement is a 6G exit gate (quality tiers land there).

## Out of scope (per plan — do not add here)

Combat, mana/HP, bots, objectives runtime, menu/class-select screens for 3D,
GLTF models, shadows/post-processing. Next: **6B — Map & Structures 3D**.
