// Phase 5A-4: config for the BotPlayer — an AI-controlled *player* (not a
// monster). The bot's stat baseline is read BY VALUE from the shared player
// class table (`HEROES` in heroes.ts, via getHero) so the enemy is literally a
// Warrior played by the AI. Difficulty applies bot-only multipliers on top of
// that class baseline; player stats and the player damage formula are never
// touched.
//
// Phase 5A-4 ships Warrior melee only. `classId` makes future class bots a
// config change, not a rewrite.

import type { HeroClassId } from '../types';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface BotDifficultyProfile {
  /** Multiplies the class HP baseline (bot-only). */
  readonly hpMul: number;
  /** Multiplies the class attack baseline (bot-only). */
  readonly attackMul: number;
  /** Multiplies the class move speed (bot-only), then fairness-clamped. */
  readonly speedMul: number;
  /** Scales the telegraph window (combat feel). */
  readonly windupMul: number;
  /** Scales the swing cooldown (combat feel). */
  readonly cooldownMul: number;
  /** Bot chase speed may not exceed player.moveSpeed × this ratio (fairness). */
  readonly maxPlayerSpeedRatio: number;
}

// Warrior class baseline (heroes.ts): hp 950, attack 70, armor 15, moveSpeed
// 190, attackRange 65. The 5A-2 bot was tuned to hp 600 / attack 44 / speed 160.
// "normal" multipliers therefore pull the Warrior baseline toward the proven
// 5A-2 feel (~0.63 hp/attack, ~0.84 speed) so default play is unchanged in feel
// while genuinely deriving from the class. "hard" trends toward true parity.
export const BOT_PLAYER_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
  easy: { hpMul: 0.5, attackMul: 0.48, speedMul: 0.72, windupMul: 1.3, cooldownMul: 1.25, maxPlayerSpeedRatio: 0.9 },
  normal: { hpMul: 0.63, attackMul: 0.63, speedMul: 0.84, windupMul: 1.0, cooldownMul: 1.0, maxPlayerSpeedRatio: 0.97 },
  hard: { hpMul: 0.8, attackMul: 0.78, speedMul: 0.9, windupMul: 0.85, cooldownMul: 0.82, maxPlayerSpeedRatio: 1.06 },
};

export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'normal';

// Phase 5A-6: class-aware ranged spacing. A ranged BotPlayer keeps a comfortable
// gap and kites instead of rushing into melee. All distances are in pixels and
// live here (config-driven) so behaviour is tuned without touching brain logic.
// Constraint per class: dangerCloseRange < preferredMinRange < preferredMaxRange
// <= the class attackRange (from heroes.ts). Melee classes have no entry and are
// completely unaffected.
export interface RangedSpacingProfile {
  /** Closer than this → the bot kites backward (px). */
  readonly dangerCloseRange: number;
  /** Lower edge of the comfortable band; kite disengages here (hysteresis, px). */
  readonly preferredMinRange: number;
  /** Upper edge of the comfortable band — where the bot likes to fire from (px). */
  readonly preferredMaxRange: number;
  /** Backpedal speed while kiting as a fraction of effective move speed. */
  readonly kiteSpeedMul: number;
}

// Ranger kites the most (largest dangerCloseRange → backs off from farther);
// Mage holds mid-range; Priest holds the safest (highest comfortable band
// relative to its range) — without any healing behaviour yet. Warrior/Guardian
// are melee and intentionally absent.
export const BOT_RANGED_SPACING: Partial<Record<HeroClassId, RangedSpacingProfile>> = {
  ranger: { dangerCloseRange: 160, preferredMinRange: 210, preferredMaxRange: 300, kiteSpeedMul: 0.95 },
  mage: { dangerCloseRange: 120, preferredMinRange: 165, preferredMaxRange: 235, kiteSpeedMul: 0.9 },
  priest: { dangerCloseRange: 120, preferredMinRange: 170, preferredMaxRange: 220, kiteSpeedMul: 0.88 },
};

export interface BotPlayerConfig {
  /** Playable class identity the bot impersonates (Warrior for 5A-4). */
  readonly classId: HeroClassId;
  /** Player-facing identity label (no snake_case / debug strings). */
  readonly name: string;
  /** Physics body + melee hit radius. */
  readonly radius: number;
  /** Distance (px) at which an idle bot notices the player and starts chasing. */
  readonly detectionRange: number;
  /** Minimum gap between the start of one swing and the next (ms). */
  readonly attackCooldownMs: number;
  /** Telegraph window before damage resolves — the dodge window (ms). */
  readonly windupMs: number;
  /** Post-swing pause that opens the player counter-attack window (ms). */
  readonly recoveryMs: number;
  /** Distance (px) beyond which a chasing bot loses aggro. */
  readonly leashRange: number;
  /** Melee arc width (degrees) to confirm the player is in front at hit. */
  readonly attackArcDegrees: number;
  /** World spawn position for the single MVP bot. */
  readonly spawn: { readonly x: number; readonly y: number };
  /** Delay (ms) after death before the single bot respawns at its anchor. */
  readonly respawnDelayMs: number;
  /** Idle patrol: max distance (px) the bot wanders from its spawn anchor. */
  readonly patrolRadius: number;
  /** Idle patrol move speed as a fraction of effective move speed. */
  readonly patrolSpeedMul: number;
  /** Idle patrol pause range (ms) between short walks. */
  readonly patrolPauseMinMs: number;
  readonly patrolPauseMaxMs: number;
}

export const BOT_PLAYER: BotPlayerConfig = {
  classId: 'warrior',
  name: 'Enemy Warrior',
  radius: 24,
  detectionRange: 360,
  attackCooldownMs: 1600,
  windupMs: 550,
  recoveryMs: 450,
  leashRange: 460,
  attackArcDegrees: 110,
  // Forward of the blue spawn (1500,3900) on the central lane, inside the Blue
  // Gate opening — ~515px from spawn, just beyond detectionRange so the bot
  // starts idle and the player triggers the chase by advancing up the lane.
  spawn: { x: 1750, y: 3450 },
  respawnDelayMs: 4000,
  patrolRadius: 110,
  patrolSpeedMul: 0.42,
  patrolPauseMinMs: 700,
  patrolPauseMaxMs: 1500,
};
