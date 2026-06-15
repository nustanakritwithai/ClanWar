# Phase 3A: Class Stats + Skill Runtime

Phase 3A makes class selection and hero stats **real at runtime**, with HP/mana display
and skill cooldown/mana costs from `skills.ts`. **No combat damage**, hit detection,
enemies, or economy yet.

## What Phase 3A adds

- **ClassSelectScene** — pick Guardian / Warrior / Ranger / Mage / Priest from `HEROES`
- **Menu → Start → ClassSelect** (fullscreen entry preserved)
- **Player** uses per-class `moveSpeed`, HP, mana, attack, armor, etc.
- **Mana regen** — `MANA_REGEN_PER_SECOND = 8` (testing helper, not final balance)
- **SkillRuntimeSystem** — cooldown + mana gate for skill1/2/3/ultimate
- **Real cooldown overlays** on skill buttons (duration from `skills.ts`)
- **HUD** — hero name, HP, mana, last skill result
- **Debug overlay** — hero, hp/mana, skill use/fail messages

## Still not implemented

- Damage, hit detection, death, respawn
- Bots, shop, exp/gold runtime, objectives
- Ultimate level-6 unlock (ultimate is usable now for testing; lock comes later)

## Run & test

```bash
npm install
npm run build
npm run preview
```

1. Menu → **Start** → ClassSelect → pick a class → Match
2. HUD shows correct hero + HP/mana
3. Press **Q/E/R/F** — mana drops, cooldown overlay matches skill spec
4. Spam skill during cooldown → denied (no double spend)
5. Drain mana → skill denied until regen
6. Attack / War Action / Items still visual-only
