# Phase 3B-B2 Visual Integration Risk Register

> Risks for the future visual-integration pass (replacing primitive
> placeholders with authored SVGs). **Docs-only.** Use with
> `docs/phase-3b-b2-visual-qa-checklist.md`.

| # | Risk | Impact | Mitigation | Owner | Blocker? |
|---|---|---|---|---|---|
| 1 | **Asset load path wrong** — SVG referenced with an incorrect path/key, or not registered with the Phaser loader. | Missing-texture squares or invisible VFX; broken combat feedback. | Load via Phaser loader with verified paths from `public/assets/**`; QA checks for 404s / missing textures; keep a single source-of-truth key map. | Agent A (runtime) | Yes (if VFX invisible/broken) |
| 2 | **SVG performance on mobile** — many SVG textures or large rasterization cost causing frame drops on low-end phones. | Stutter during skill-heavy moments; degraded mobile experience. | Assets are simple, 256×256, power-of-two friendly; cap concurrent instances; reuse textures rather than re-decoding; test on 915×412 / 800×360. | Agent A | Maybe (Yes if visible stutter) |
| 3 | **World/UI camera mixup** — a world VFX added to the UI camera (or vice versa), breaking the dual-camera pattern. | Effects render in wrong position / wrong layer; controls may be covered. | Route all gameplay VFX through `registerWorldObject()` (uiCamera.ignore); keep UI feedback on UI camera only. | Agent A | Yes |
| 4 | **Tween leak** — SVG-based VFX tween without `onComplete: destroy()`, leaving ghost objects. | Accumulating hidden objects; slow degradation over a session. | Mirror existing `CombatVfx.ts` pattern — every tween destroys its target on complete; verify via Menu↔Match ×3. | Agent A | Maybe (Yes if visible slowdown) |
| 5 | **VFX clutter** — too many simultaneous effects (impact + spark + AoE marker + number) overwhelming a small screen. | Reduced readability; combat feels noisy on mobile. | Cap concurrent VFX per cast; keep effects centered; favor short lifetimes. | Both | No (polish) unless it blocks controls → Yes |
| 6 | **Hit readability low** — hit/impact VFX too subtle or too similar to other effects to read as "hit landed". | Player can't tell if a hit connected. | Keep distinct color/shape per feedback type (hit=gold, heal=green, impact=orange); QA readability row. | Agent B (spec) / Agent A (impl) | No (polish) |
| 7 | **Projectile visibility low** — fast arrow/fireball hard to track at 650/520 speed on a phone. | Player loses sight of projectiles; hit/miss feels random. | Use bright projectile SVGs with enough size/contrast; optional short trail; QA projectile-visibility row. | Agent B / Agent A | No (polish) unless it makes gameplay unreadable |
| 8 | **Over-integration beyond scope** — visual pass creeps into adding real status effects, new skills, bots, or objective visuals. | Scope blowup; conflicts with runtime track; unreviewable PR. | Visual pass is **like-for-like swap only** (primitive → SVG); no new gameplay logic; status icons stay non-functional. | Both | Yes (if real status/bot/objective added) |
| 9 | **Status icon misread as real effect** — showing `status/*.svg` makes testers/players assume stun/slow/burn actually work. | False confidence; confusing QA; premature 3C assumptions. | Do **not** display status icons tied to gameplay in this pass; if shown for layout, label clearly as placeholder; defer all status logic to 3C. | Both | Yes (if wired to gameplay) |
| 10 | **Mobile multi-touch regression from visual changes** — added objects/handlers inadvertently interfere with joystick/skill input. | Breaks the PR #8 multi-touch fix. | Visual pass must not modify input files; re-run mobile multi-touch suite after the swap. | Agent A | Yes |

---

## Top risks to watch (Blocker = Yes)
1. **#3 Camera mixup** — most likely to break controls/layout across viewports.
2. **#1 Asset load path** — silent invisible-VFX failures.
3. **#8 Over-integration** — scope discipline (no status/bot/objective).
4. **#9 Status-icon misread** — keep status purely visual/deferred.
5. **#10 Multi-touch regression** — protect the PR #8 mobile fix.
