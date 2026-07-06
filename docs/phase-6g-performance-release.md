# Phase 6G — Performance & Release (closes the Phase 6 master plan)

> Status: **IMPLEMENTED — 9/9 checks pass; Phase 6 (6A–6G) complete**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6f-visual-upgrade.md](phase-6f-visual-upgrade.md)

## What this phase delivers

### Quality tiers (`render3d/Quality.ts`)

| tier | pixel ratio cap | antialias | shadows | particle budget |
|---|---|---|---|---|
| low | 1 | off | off | 220 |
| med | ≤1.5 | on | off | 400 |
| high | ≤2 | on | PCF soft | 500 |

- Selection: `?quality=low|med|high` override, otherwise a device heuristic —
  `deviceMemory`/`hardwareConcurrency` floor picks low; coarse pointer (touch)
  or mid specs pick med (shadows are the single biggest mobile cost); desktops
  default high.
- **FPS watchdog** (`QualityWatchdog`): if fps stays < 38 for 5 s, the runtime
  drops one tier (pixel ratio + shadows; antialias is baked into the GL
  context) — steps down only, never oscillates, stops at low.

### Shadows (high tier)
`Renderer3D` enables PCFSoft shadow maps (2048²) with the directional sun's
shadow box **following the player** (±900 world units) so the 3000×4200 map
never needs one giant map. Casters: characters, structures, walls, instanced
trees; ground receives. All shadow flags are no-ops on low/med.

### Release items
- Fullscreen toggle button (⛶, top-left) in the HTML HUD — mirrors the 2D
  button from the mobile checklist; portrait rotate-hint overlay still works.
- Debug HUD now shows `q:<tier> · cam:<mode>` for live QA.
- `docs/project-status.md` updated — Phase 6 section added, closing 6A–6G.

## Verified (Playwright)

| Check | Result |
|---|---|
| `?quality=high` → `q:high`, shadows under characters, no errors | ✅ |
| `?quality=low` → `q:low`, no errors | ✅ |
| Pixel 5 landscape: heuristic picks `q:med` | ✅ |
| Touch joystick drag moves the player (225 units) | ✅ |
| ATK touch button lands a real hit (599→538, "Hit 61") | ✅ |
| Fullscreen button present | ✅ |
| Portrait shows the rotate hint (blocks HUD as designed) | ✅ |
| No page errors on any tier / viewport | ✅ |
| 6E match-loop 28/28 + camera 3/3 suites still green | ✅ |

Note on fps numbers: this environment runs headless SwiftShader (software GL),
so absolute fps (~8–14) is not representative of real devices; the exit
criterion "60fps mid-range mobile" is addressed structurally (tier system +
watchdog) and should be spot-checked on a physical phone when available.

## Phase 6 wrap-up

| Slice | Delivered | Evidence |
|---|---|---|
| 6A | 3D shell + movement parity | walk-the-map checks |
| 6B | full battlefield | structure/coordinate checks |
| 6C | combat, 5 classes | numeric parity vs 2D |
| 6D | AI bots | 13/13 |
| 6E | match loop + **parity gate** → 3D default | 28/28 |
| 6F | GLTF characters + VFX + **Phaser removed** | 7/7 + regression |
| camera | GTA-style chase (default), V/`?cam=top` | 3/3 |
| 6G | tiers/shadows/fullscreen/release docs | 9/9 |

Bundle: single 716 KB chunk (gzip ~187 KB) + 454 KB glb. Deps: `three` only.
