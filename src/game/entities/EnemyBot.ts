// Phase 5A-4 compatibility alias.
//
// `EnemyBot` was renamed to `BotPlayer` — the enemy is now an AI-controlled
// *player* (same class identity as the human), not a monster. This thin
// re-export keeps any lingering `EnemyBot` / `BotState` references working during
// the staged migration. New code should import from `./BotPlayer`.
export { BotPlayer as EnemyBot } from './BotPlayer';
export type { BotState, BotPlayerEntityStats } from './BotPlayer';
