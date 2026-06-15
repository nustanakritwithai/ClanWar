# Phase 3B-B2 Visual Integration QA Checklist

> QA checklist for the future visual-integration pass (swapping
> Phaser-primitive placeholders for the authored SVG assets). **Docs-only** —
> a reviewer fills this in against a build once integration happens. No
> runtime/asset change is made by this file.
>
> Reference: `docs/phase-3b-b2-vfx-asset-manifest.md`,
> `docs/phase-3b-b2-skill-vfx-mapping.md`, `docs/combat-vfx-integration-plan.md`.

| Check | Required Result | Pass/Fail | Notes |
|---|---|---|---|
| VFX does not block joystick | No gameplay VFX renders over the joystick region; joystick stays fully tappable during/after casts | ☐ | |
| VFX does not block skill buttons | No gameplay VFX renders over skill/action buttons; all remain tappable mid-combat | ☐ | |
| World VFX not on UI camera | All hit sparks, impacts, AoE markers, projectiles, heal effects are world-space and `uiCamera.ignore()`-d — they move with the world, not glued to screen | ☐ | |
| UI feedback not on main camera | Any cooldown/ready/denied UI feedback is UI-space and ignored by the main camera | ☐ | |
| Projectile visual does not linger | After a projectile hits or exceeds max range, its sprite is destroyed — no frozen arrow/fireball left on screen | ☐ | |
| AoE marker disappears after tween | `aoe_marker` (and impact burst) fully fade and destroy after their tween — no persistent ground ring | ☐ | |
| Heal feedback is readable | Heal spark / `+N` / heal burst are clearly green, readable against the scene, and don't obscure the player | ☐ | |
| Hit feedback is readable | Hit spark / impact burst clearly read as "hit landed" at mobile size without overwhelming the dummy | ☐ | |
| Projectile is visible enough | Arrow/fireball sprites are large/bright enough to track on a phone at speed (650/520) — not lost against the background | ☐ | |
| Status icons remain deferred | No `status/*.svg` icon is wired to gameplay; if shown at all it is static and does not imply a working stun/slow/burn/etc. | ☐ | |
| SVG assets actually load | If integrated, `public/assets/vfx,combat` SVGs load via the Phaser loader with correct paths — no 404s, no missing-texture squares | ☐ | |
| 915×412 mobile | Full combat (attack, Power Shot, Fireball, an AoE, a heal) renders correctly with no clutter/overlap at 915×412 | ☐ | |
| 800×360 compact | Compact layout still readable; VFX scaled appropriately; ClassSelect still shows all 5 classes | ☐ | |
| Portrait rotate hint | Rotating to portrait still shows the rotate-to-landscape hint, unobstructed by any VFX | ☐ | |
| Menu ↔ Match × 3, no leak | After 3 full cycles (casting projectile + AoE + heal each time), no leftover VFX/projectiles/markers persist; object count returns to baseline | ☐ | |
| No console errors | No asset-load or render errors across the above | ☐ | |
| Mobile multi-touch unaffected | Joystick + skill simultaneous use (PR #8 behavior) still works after the visual swap | ☐ | |

---

## Pass criteria
Integration may proceed to review if **all** rows pass, with special
attention to: no UI-camera mixup, no lingering projectiles/markers, no
clutter over controls, and status icons remaining non-functional (visual
only). Any leak, camera mixup, or control occlusion is a blocker.
