# Phase 3B-A: Combat Dummy + Damage Foundation

Adds a **training dummy** to test real damage before bots, AI, or objectives exist.

## What Phase 3B-A adds

- **TrainingDummy** — 1000 HP, 10 armor, north of player spawn
- **CombatSystem** — `finalDamage = max(1, round(raw * 100/(100+armor)))`
- **Basic attack** — range + 90° facing cone; hit/miss feedback
- **Skill foundation** — skills with `damage` hit dummy in `skill.range`; skills with `heal` heal self
- **Floating combat text** — damage (red) / heal (green), auto-destroy ~600ms
- **Dummy reset** — 2s after HP reaches 0

## Still not implemented

- Bot AI, moving enemies, player death/respawn
- Projectiles, real AoE visuals, magic power scaling
- Shop, exp/gold, objectives, multiplayer

## Hit detection notes

- **Attack:** distance ≤ `attackRange + dummy radius` **and** target within 90° facing cone
- **Skills (damage):** distance-only vs `skill.range` (or 160 fallback) — instant check, no projectile
- **Skills (heal):** self-target only; capped at max HP

## Test flow

```bash
npm run build && npm run preview
```

1. ClassSelect → Guardian → walk toward dummy → Attack (hit/miss by range)
2. Warrior → higher attack damage than Guardian
3. Mage → Q Fireball damages dummy in range
4. Priest → Q Heal restores self HP
5. Kill dummy → waits 2s → resets to full HP
