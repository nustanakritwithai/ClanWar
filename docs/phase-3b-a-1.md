# Phase 3B-A.1: Mobile Multi-touch Control Hotfix

## Bug fixed

On mobile, holding the virtual joystick and pressing attack/skill buttons at the
same time did not work. Movement would stop, the joystick would release, or
action buttons would not register — blocking core mobile combat controls.

## Root cause

1. **Phaser default pointer limit** — Phaser 3 tracks only **one** active
   pointer by default. A second finger on an action button replaced the joystick
   pointer instead of running in parallel.
2. **Joystick capture scope** — The joystick listened to global `pointerdown`
   anywhere within its grab radius without restricting to the left movement zone,
   which could compete with right-side UI on edge cases.

Movement was **not** being cleared by `InputSystem` on action press; the
primary fix is enabling multi-pointer tracking and zone-scoped joystick capture.

## Left / right zone design

| Zone | Screen region | Input |
|------|---------------|-------|
| **Movement (left)** | `x < width × 0.45` | Virtual joystick |
| **Action (right)** | `x ≥ width × 0.45` | Skill / attack buttons |

Constant: `MOVEMENT_ZONE_WIDTH_RATIO = 0.45` in `src/game/constants.ts`.

Rules:

- Joystick starts only when `pointerdown` begins in the left zone.
- Joystick tracks **one** `pointerId`; other pointers do not release it.
- Action buttons on the right accept independent `pointerdown` events.
- Desktop WASD + keyboard bindings are unchanged.

## pointerId tracking

`VirtualJoystick`:

- `activePointerId` set on left-zone `pointerdown` when idle.
- `pointermove` / `pointerup` / `pointercancel` handled only for matching id.
- Releasing the action finger does not reset movement.

`config.ts`:

```ts
input: { activePointers: 3 }
```

Allows joystick + one or two action touches simultaneously.

## Acceptance criteria

- [x] Walk with joystick and press attack simultaneously
- [x] Walk with joystick and press Q/E/R/F/skills simultaneously
- [x] Joystick does not release when pressing right-side buttons
- [x] Movement vector is not zeroed by action input
- [x] Desktop WASD + keyboard still works
- [x] Build passes
- [x] No scope creep (no projectiles, AoE, bots, assets)

## Known limitations

- Joystick knob visual stays at the fixed lower-left base; dragging starts from
  anywhere in the left 45% zone (ROV-style), not a floating stick.
- `activePointers: 3` covers joystick + two buttons; more than three simultaneous
  touches are not tracked.
- Debug overlay fields (`joy ptr`, `action+move`) are dev-only (toggle ` or F1).

## Files changed

- `src/game/config.ts` — `activePointers: 3`
- `src/game/constants.ts` — phase label, `MOVEMENT_ZONE_WIDTH_RATIO`
- `src/game/ui/VirtualJoystick.ts` — zone + pointerId isolation
- `src/game/ui/SkillButtons.ts` — independent button pointers
- `src/game/systems/InputSystem.ts` — debug accessors, action+move flag
- `src/game/scenes/MatchScene.ts` — debug overlay fields

## Manual test (915×412 landscape)

1. Hold joystick left, walk up.
2. While moving, tap ATK → attack fires, movement continues.
3. While moving, tap Q/E/R/F/ULT/War/Items → each triggers, movement continues.
4. Release right finger → left finger still moves.
5. Release left finger → movement stops.
6. Spam actions while walking → no crash.
7. Walk to dummy + attack; Mage/Priest Q while moving; cooldown/mana OK.

## Mobile verification (PR #8)

**Render PR preview:** disabled (`pullRequestPreviewsEnabled: false`).

**Test URL (cloudflared tunnel, ephemeral):**

`https://operator-geometry-proposed-handed.trycloudflare.com`

Open on Android Chrome in landscape (~915×412). Tunnel serves the PR branch build via
`npm run preview` with `preview.allowedHosts: true`.

**Automated multi-touch verification (CDP, 915×412):**

```bash
npm run build
npm run preview
node scripts/mobile-multitouch-verify.mjs http://127.0.0.1:4173
```

Results (2026-06-15): **14/14 passed** — walk+attack, walk+skill, release
behavior, Mage/Priest combat while moving, desktop regression.

**Physical device:** pending human confirmation on Android Chrome. PR #8 remains
**draft** until real-device manual test passes.
