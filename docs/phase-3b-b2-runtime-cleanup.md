# Phase 3B-B2: Runtime Cleanup + Skill Coverage

## What changed

### Keyboard Q flaky test fix

The chained desktop test in `scripts/mobile-multitouch-verify.mjs` failed because:

1. `keyboard.press('q')` ran without canvas focus — Phaser did not always receive the key.
2. No walk toward dummy before skill — Shield Bash could miss with empty-looking state.
3. Fixed 200ms wait was too short on slow/live builds.

**Fix (test harness only, no gameplay changes):**

- `pressSkillKey()` — focus body, click canvas center, then key down/up
- `walkTowardDummy()` before Q test
- `waitForSkillResult()` polls `lastCombatResult` / `lastAction` up to 1200ms
- Assert on `Shield Bash` in combat/action/hitShape strings

### Skill coverage added

| Skill | Runtime | Placeholder behavior |
|-------|---------|---------------------|
| Gate Breaker | `melee_arc` | Dummy damage only; `gate damage deferred` note; uses `radius` as range fallback |
| War Taunt | `aoe_circle` | Marker only; `taunt/slow deferred`; no dummy damage |
| Leap Strike | `aoe_circle` | Instant AoE at point; `leap dash deferred` |
| Meteor Siege | `aoe_circle` | Instant single-hit; `gate damage deferred` |
| Revival Prayer | `heal` | Self-heal only; `revive deferred` |

### Debug overlay

- `placeholder:` — last placeholder reason from `SkillPlaceholder.ts`
- `skipped:` — last cooldown/mana skip reason
- `skill type` / `hit shape` / `projectiles` unchanged

## Deferred (not in 3B-B2)

- Bot AI, objectives, gates, shop, economy
- Player death/respawn, real revive
- Status effects (stun/slow/taunt/burn/frozen)
- Leap dash movement, AoE DoT/ticking
- SVG asset integration
- Trap, Cleanse, Eagle Barrage, Arcane Wall

## Test checklist

```bash
npm run build
npm run preview
node scripts/mobile-multitouch-verify.mjs http://127.0.0.1:4173
node scripts/phase-3b-b2-regression.mjs http://127.0.0.1:4173
```

- [x] keyboard Q stable (focus + walk + poll)
- [x] Q/E/R/F keyboard skills
- [x] Placeholder skills (Gate Breaker, War Taunt, Leap, Meteor, Revival)
- [x] Power Shot / Fireball hit
- [x] Mobile multi-touch 14/14
- [x] Menu ↔ Match ×3 no projectile leak
- [x] Build passes

## Files

- `src/game/combat/SkillPlaceholder.ts` (new)
- `src/game/scenes/MatchScene.ts`
- `src/game/constants.ts`
- `scripts/mobile-multitouch-verify.mjs`
- `scripts/phase-3b-b2-regression.mjs` (new)
