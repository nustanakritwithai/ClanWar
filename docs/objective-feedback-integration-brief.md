# Objective Feedback Integration Brief (for Agent A — future Phase 4B)

> Forward-looking brief for the runtime track to integrate the Phase 4B-B
> Objective Feedback Asset Pack when the **Phase 4B objective runtime**
> begins. **This is not a work order — do not start runtime work from this
> doc.** Authored by Lane B (Agent B); execution belongs to Lane A (Agent A).
>
> Aligns with Agent A's established conventions from Phase 3B-B3/B4 and
> Phase 4A map visual foundation:
> - World-space feedback → main camera, `uiCamera.ignore()`
> - UI HUD alerts → UI camera, main camera ignores
> - Scene shutdown → destroy all spawned feedback objects

References: `docs/phase-4b-b-objective-feedback-asset-pack.md`,
`docs/objective-feedback-asset-manifest.md`, `docs/objective-asset-manifest.md`,
`docs/objective-visual-integration-brief.md`, `docs/art-style-guide.md`.

---

## 1. Allowed scope (when Phase 4B runtime is approved)

- Load feedback SVGs from `public/assets/objective-feedback/**` via the
  Phaser loader alongside existing `public/assets/objectives/**` bases.
- Render world-space overlays as child/paired sprites at objective world
  positions on the main camera.
- Render UI alert icons as fixed-screen HUD badges on the UI camera.
- Show/hide overlays on objective **state change** (ownership, contested,
  under attack, gate breached, core vulnerable).
- Play one-shot effects (`capture_complete_burst`, `ownership_swap_flash`,
  `objective_defended`, `objective_lost`) via tween + destroy.
- Pair with Phase 3B-B4 base sprites per the state mapping in the manifest.

## 2. Assets to integrate first (priority for Phase 4B core loop)

1. `objective_claimed_blue.svg` / `objective_claimed_red.svg` — ownership
   feedback on capture points
2. `objective_under_attack.svg` + `ui_objective_under_attack.svg` — pressure
   alert (gate/core first)
3. `gate_breached_blue.svg` / `gate_breached_red.svg` + `ui_gate_breached.svg`
   — gate breach visual state
4. `core_vulnerable_blue.svg` / `core_vulnerable_red.svg` +
   `ui_core_vulnerable.svg` — core vulnerable state
5. `ownership_swap_flash.svg` — brief flash on ownership flip

## 3. Assets to integrate second

- `objective_contested.svg` — once contested-capture logic is scoped
- `capture_progress_pulse.svg` + `capture_complete_burst.svg` — once capture
  progress mechanic exists
- `objective_defended.svg` / `objective_lost.svg` — defensive event feedback
- HUD guidance icons: `ui_defend_core`, `ui_attack_gate`, `ui_capture_now`,
  `ui_objective_claimed`

## 4. Files the runtime agent would touch (future)

- Preload/boot step — register `objective-feedback/*` textures with loader
- Objective feedback module under `src/game/**` (e.g.
  `ObjectiveFeedbackRenderer.ts` or extend `ObjectiveSystem.ts`)
- HUD alert slot (UI camera) — separate from world overlays
- **No changes** to `skills.ts`, `heroes.ts`, balance, or input files for
  pure visual wiring

## 5. Preload / render / cleanup expectations

### Preload

```text
// Pseudocode — Agent A implements in Phaser preload
this.load.svg('obj_fb_claimed_blue', 'assets/objective-feedback/objective_claimed_blue.svg');
// ... all 20 keys under a consistent prefix, e.g. obj_fb_*
```

Load all 20 assets in preload. Use a consistent texture-key prefix
(e.g. `obj_fb_`) to avoid collisions with `objectives/*` base keys.

### World-space overlays

| Step | Action |
|---|---|
| Create | Spawn overlay sprite at objective `(x, y)`; `setDepth()` above base objective, below units if desired |
| Update | Swap texture key on state change; do not stack multiple ownership overlays |
| Animate | `capture_progress_pulse` — runtime tweens opacity/scale on arc segments |
| One-shot | `ownership_swap_flash`, `capture_complete_burst` — spawn, tween alpha 1→0, destroy |
| Hide | Set `visible = false` or destroy when state clears |
| Camera | `registerWorldObject(overlay)` → `uiCamera.ignore(overlay)` |
| Shutdown | Destroy all overlay sprites on `MatchScene` shutdown |

### UI-space HUD alerts

| Step | Action |
|---|---|
| Create | Fixed-position UI sprite on UI camera (e.g. top banner slot) |
| Update | Swap `ui_*` texture key when alert type changes |
| Hide | Fade out + destroy or pool when alert expires |
| Camera | Main camera ignores; never use `registerWorldObject()` for HUD icons |
| Shutdown | Destroy/pool all HUD alert sprites on scene shutdown |

### Layering (suggested depth order, bottom → top)

1. Map terrain (Phase 4A)
2. `capture_progress_pulse` (ground ring)
3. Objective base sprite (`objectives/*.svg`)
4. Persistent feedback overlay (`objective_claimed_*`, `objective_under_attack`, etc.)
5. One-shot burst (`capture_complete_burst`, `ownership_swap_flash`)
6. Units / combat VFX
7. UI HUD alerts (separate camera)

## 6. Suggested scale (starting points)

| Asset group | Display size (world px) | Notes |
|---|---|---|
| Ownership overlays | 64–96 | Centered on objective anchor |
| Attack/contested overlays | 72–96 | Slightly larger for visibility |
| Capture pulse ring | Scale to capture radius | Match `capture_ring.svg` from PR #13 |
| Gate breached / core vulnerable | 96–128 | May replace or sit atop base sprite |
| One-shot bursts | 80–120 | Brief, then destroy |
| UI HUD badges | 32–48 | Fixed screen position |

## 7. Tests that should pass (when integrated)

- Build passes (`npm run build`).
- Feedback overlays render at correct world positions without covering
  joystick/skill buttons on 915×412 / 800×360 mobile.
- State changes swap the correct overlay texture (blue claimed vs red
  claimed vs contested).
- One-shot effects destroy after tween — no leak across matches.
- HUD alerts appear on UI camera only — do not scroll with world.
- Menu ↔ Match × 3 — no feedback art leak; no texture 404s.
- No console errors.
- Existing combat (3B-B3) and map visual (4A) regressions still pass.

## 8. Forbidden runtime behavior

- ❌ `objective_under_attack.svg` must **not** apply damage — visual
  pressure indicator only.
- ❌ `capture_progress_pulse.svg` must **not** implement capture logic —
  visual progress indicator only; progress value comes from gameplay system.
- ❌ `gate_breached_*.svg` must **not** implement gate HP — visual breach
  state only.
- ❌ `core_vulnerable_*.svg` must **not** implement core HP or damage
  immunity rules — visual vulnerable state only.
- ❌ `ownership_swap_flash.svg` must **not** change ownership — visual
  flash only; ownership change is gameplay logic.
- ❌ HUD `ui_*` icons must **not** implement minimap, pathfinding, or
  click-to-navigate.
- ❌ Do not stack `objective_claimed_blue` and `objective_claimed_red`
  simultaneously — swap textures.
- ❌ No objective gameplay logic in a pure visual pass unless the phase
  brief explicitly scopes it.
- ❌ No changes to existing asset packs (`objectives/`, `map/`, `vfx/`,
  `combat/`, `status/`).
- ❌ No Phase-label / README status change as part of asset wiring unless
  the phase is formally advanced.

---

## Sequencing note

This brief assumes Phase 4A (map visual runtime, PR #16) and Phase 3B-B4
(objective base sprites, PR #13) are available. The objective feedback
pack is stock art for a **separate Phase 4B runtime PR**. Lane B will
prepare additional QA docs when that runtime phase is approved.
