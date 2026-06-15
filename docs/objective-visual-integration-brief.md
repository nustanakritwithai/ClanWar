# Objective Visual Integration Brief (for Agent A — future Phase 4)

> Forward-looking brief for the runtime track to integrate the Phase 3B-B4
> Objective Asset Pack when the **Phase 4 objective runtime** begins.
> **This is not a work order — do not start runtime work from this doc, and
> do not use these assets in Phase 3B-B3.** Authored by Lane B (Agent B);
> execution belongs to Lane A (Agent A).
>
> Aligns with Agent A's established conventions from Phase 3B-B1/B3:
> world-space objects go through `registerWorldObject()` →
> `uiCamera.ignore()` so they never cover the joystick / skill buttons.

References: `docs/phase-3b-b4-objective-asset-pack.md`,
`docs/objective-asset-manifest.md`, `docs/art-style-guide.md`,
`docs/combat-vfx-integration-plan.md` (camera/cleanup conventions).

---

## 1. Allowed scope (when Phase 4 is approved)

- Load the objective SVGs from `public/assets/objectives/**` via the Phaser
  loader and render them as **world-space map objects**.
- Swap textures on objective **state/ownership change**
  (neutral → blue/red → destroyed) using the groupings in the manifest.
- Overlay `capture_ring.svg` / `objective_warning.svg` on objectives as
  world-space markers.
- Keep all rendering on the **main camera**; `uiCamera.ignore()` every
  objective object and overlay.

## 2. Assets to integrate first (priority for Phase 4 core loop)

1. `blue_core.svg` / `red_core.svg` (+ existing `core.svg`) — win-condition nexus
2. `blue_gate.svg` / `red_gate.svg` (+ existing `gate.svg`) — primary siege target
3. `objective_destroyed.svg` — shared destroyed state for gate/core
4. `objective_warning.svg` — "under attack" feedback on gate/core

## 3. Assets to defer (later in Phase 4 / Phase 4.x)

- `watchtower_*` (capture point loop), `forward_camp_*` (forward spawn),
  `resource_camp_food/ore/wood` (economy) — integrate once the capture /
  economy systems are scoped.
- `capture_ring.svg` — needs a capture-progress mechanic to be meaningful.

## 4. Files the runtime agent would touch (future)

- A preload/boot step (e.g. a boot scene or `MatchScene.preload()`) — register
  objective textures with the loader.
- A new objective entity/system under `src/game/**` (e.g.
  `src/game/entities/Objective.ts` and/or `src/game/systems/ObjectiveSystem.ts`)
  — **new files, runtime track's to create.**
- Map data (placement) — runtime track, separate scope.
- **No changes** to `skills.ts`, `heroes.ts`, balance, or input files for
  pure asset rendering.

## 5. Camera / cleanup expectations

- **Camera:** world-space, main camera only; `uiCamera.ignore()` each
  objective sprite and overlay (mirror the combat-VFX pattern).
- **Texture swap:** on ownership/state change, switch the sprite's texture
  key (neutral ↔ blue ↔ red ↔ destroyed) — do not stack multiple sprites.
- **Overlays:** `capture_ring` / `objective_warning` are separate objects
  parented/positioned to the objective; destroy/hide them when the
  capture/warning condition clears.
- **Scene shutdown:** destroy all objective objects + overlays on
  `MatchScene` shutdown so no map art leaks across matches (same discipline
  as `ProjectileSystem.destroy()`).
- **Pre-tinted variants:** texture-swap only; do **not** apply `setTint` to
  `blue_*`/`red_*`. Neutral overlays may be tinted.

## 6. Tests that should pass (when integrated)

- Build passes (`npm run build`).
- Objectives render at correct world positions/scale on desktop and on
  915×412 / 800×360 mobile, without covering joystick/skill buttons.
- State/ownership texture swaps display the correct variant.
- Menu ↔ Match × 3 — no objective art / overlay leak; no texture 404s.
- No console errors.
- Existing combat (3B-B1/B3) and mobile multi-touch (PR #8) regressions
  still pass.

## 7. Must NOT do

- ❌ No objective **gameplay logic** in a pure visual pass (capture,
  ownership rules, gate/core HP, resource income) unless the phase brief
  explicitly scopes it.
- ❌ No real status effects, bot AI, shop/economy balance, or multiplayer
  riding along with the objective art.
- ❌ No map redesign as part of asset wiring.
- ❌ No new assets — use only what this pack + PR #4 already provide.
- ❌ No use of these assets in Phase 3B-B3 (combat visual integration).
- ❌ No Phase-label / README status change as part of asset wiring unless
  the phase is formally advanced.

---

## Sequencing note
This brief assumes Phase 3B-B3 (combat visual integration) lands first and
the objective runtime is its own later phase with its own PR. Lane B
(Agent B) will prepare the matching QA checklist/risk register for the
objective integration when that phase is approved.
