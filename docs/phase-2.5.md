# Phase 2.5: Action Pipeline + Spec Lock

Phase 2.5 wires **input actions → visual player feedback** and locks **data specs**
(heroes, skills, economy, items, edge-case rules) for Phase 3+. This is **not**
real combat — no damage, HP changes, cooldown gameplay, mana, hit detection, shop,
bots, or economy runtime.

## What Phase 2.5 adds

- **Action pipeline (visual-only):** Attack / Skill 1–3 / Ultimate / War Action /
  Item 1–2 trigger `playActionFeedback()` on the placeholder player.
- **Direction indicators:** Short arc/line in the facing direction (150–280 ms),
  auto-destroyed — no pooled object leak.
- **Button mock cooldown:** Skill button overlays fade over ~0.2–0.4 s to prove
  future cooldown UI support (not real cooldown logic).
- **Input cleanup:** `InputSystem.reset()` clears movement, pending actions, all
  action booleans, `lastAction`, and joystick state on blur / visibility hide /
  shutdown.
- **Debug overlay toggle:** Default on (`SHOW_DEBUG_OVERLAY` in `constants.ts`).
  Press **Backquote (`)** or **F1** in Match to toggle (D is reserved for move-right).
- **Data spec files** (numbers only, no runtime):
  - `src/game/data/heroes.ts`
  - `src/game/data/skills.ts`
  - `src/game/data/economy.ts`
  - `src/game/data/items.ts`
  - `src/game/data/rules.ts`

## What is still NOT implemented

- Real damage / HP / death
- Cooldown, mana, or ability logic
- Shop UI or gold/exp runtime
- Bots, multiplayer, class selection gameplay
- Edge-case rule enforcement at runtime

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve dist/
```

## How to test manually

1. **Menu → Start** enters Match.
2. **WASD / arrows** or **virtual joystick** moves the player.
3. **Attack** (J, click ground, ATK button): white flash + forward arc.
4. **Skill 1/2/3** (Q/E/R or buttons): blue / green / purple flash + direction line.
5. **Ultimate** (F or ULT): gold flash + larger scale pulse.
6. **War Action** (Space or button): expanding interaction ring around player.
7. **Item 1/2** (1/2 or buttons): small icon ping + tint.
8. Buttons show a **fading dark overlay** mock cooldown after each press.
9. **` or F1** toggles the debug overlay.
10. **Menu ↔ Match 3×** — no stuck movement or ghost actions after return.
11. **Resize** window — joystick, buttons, HUD, debug text stay positioned.
12. Console should stay free of major errors.

## Phase 3 preview

Use the locked data specs to implement: class stats on spawn, real skill execution
from `SKILLS`, economy ticks from `ECONOMY`, shop purchases from `ITEMS`, and
match resolution from `EDGE_CASE_RULES`.
