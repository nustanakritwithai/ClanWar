// Phase 5A-4 compatibility alias.
//
// `BotSystem` was renamed to `BotPlayerSystem` (lifecycle for the single
// AI-controlled player). This thin re-export keeps existing `BotSystem`
// imports (e.g. MatchScene) working during the staged migration. New code
// should import from `./BotPlayerSystem`.
export { BotPlayerSystem as BotSystem } from './BotPlayerSystem';
export type {
  BotSystemHooks,
  BotSnapshot,
  BotDifficultyInfo,
  PlayerMeleeHitResult,
} from './BotPlayerSystem';
