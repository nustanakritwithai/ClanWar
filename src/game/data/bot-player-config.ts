// Phase 5A-4: config for the BotPlayer — an AI-controlled *player* (not a
// monster). The bot's stat baseline is read BY VALUE from the shared player
// class table (`HEROES` in heroes.ts, via getHero) so the enemy is literally a
// Warrior played by the AI. Difficulty applies bot-only multipliers on top of
// that class baseline; player stats and the player damage formula are never
// touched.
//
// Phase 5A-4 ships Warrior melee only. `classId` makes future class bots a
// config change, not a rewrite.

import type { ActionKey, HeroClassId } from '../types';

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

// Phase 5A-7: the playable classes the live match may spawn the single bot as.
// Order also defines the deterministic rotation used by default so the real game
// no longer always shows the first Warrior. Guardian is intentionally excluded
// from the auto-rotation (it is a tank kit), but is still a valid explicit pick.
export const BOT_PLAYABLE_CLASSES: readonly HeroClassId[] = ['warrior', 'ranger', 'mage', 'priest'];

export type LiveBotClassSetting = HeroClassId | 'random' | 'rotate';

/** True when `value` is one of the classes the live match may spawn the bot as. */
export function isBotPlayableClass(value: unknown): value is HeroClassId {
  return typeof value === 'string' && (BOT_PLAYABLE_CLASSES as readonly string[]).includes(value);
}

/**
 * Resolve the live BotPlayer class for a match from the launch setting.
 *
 * - a concrete class id → that class (explicit `?botClass=ranger` etc.)
 * - `'random'`          → a random playable class
 * - `'rotate'` / unset  → deterministic rotation across BOT_PLAYABLE_CLASSES
 *
 * Pure: rotation state is passed in and the next index returned, so the caller
 * (MatchScene) owns persistence (the game registry) and this stays testable.
 */
export function resolveLiveBotClass(
  setting: LiveBotClassSetting | undefined,
  rotationIndex: number,
  rng: () => number = Math.random,
): { classId: HeroClassId; nextRotationIndex: number } {
  if (isBotPlayableClass(setting)) {
    return { classId: setting, nextRotationIndex: rotationIndex };
  }
  if (setting === 'random') {
    const i = Math.floor(rng() * BOT_PLAYABLE_CLASSES.length) % BOT_PLAYABLE_CLASSES.length;
    return { classId: BOT_PLAYABLE_CLASSES[i], nextRotationIndex: rotationIndex };
  }
  // rotate / undefined → cycle deterministically.
  const idx = ((rotationIndex % BOT_PLAYABLE_CLASSES.length) + BOT_PLAYABLE_CLASSES.length) %
    BOT_PLAYABLE_CLASSES.length;
  return { classId: BOT_PLAYABLE_CLASSES[idx], nextRotationIndex: rotationIndex + 1 };
}

// Phase 5B-1: multi-bot encounter presets. The match can spawn more than one
// AI-controlled BotPlayer, each its own class with its own spawn point, brain,
// cooldown/skill runtime and HP. This is *spawn foundation only* — no squad AI,
// no shared targeting, no objective AI, no commander (those are out of scope).
// Each member declares a spawn OFFSET from the base bot anchor (BOT_PLAYER.spawn)
// so members start apart; dynamic separation/spacing is a later phase (5B-2).
export interface BotEncounterMember {
  readonly classId: HeroClassId;
  /** Spawn offset (px) from the base bot spawn anchor — keeps members apart. */
  readonly spawnOffset: { readonly x: number; readonly y: number };
}

// Encounter presets (Phase 5B-4 names, foundation here). `solo` is the single-bot
// shape; the live default (Duel Plus) is an easy, readable two-bot mix. Heavier
// mixes exist for testing/debug but are not the production default until balance.
export type BotEncounterId =
  | 'solo'
  | 'duel_plus'
  | 'arcane_pressure'
  | 'sustain_pressure'
  | 'ranged_harass'
  | 'full_party_lite';

/** Hard cap on simultaneous bots (performance + readability guard). */
export const MAX_BOTS = 4;

/** Default live encounter — easy + readable (Warrior front, Ranger poke). */
export const DEFAULT_BOT_ENCOUNTER: BotEncounterId = 'duel_plus';

export const BOT_ENCOUNTER_PRESETS: Record<BotEncounterId, readonly BotEncounterMember[]> = {
  solo: [{ classId: 'warrior', spawnOffset: { x: 0, y: 0 } }],
  duel_plus: [
    { classId: 'warrior', spawnOffset: { x: -70, y: 40 } },
    { classId: 'ranger', spawnOffset: { x: 90, y: -50 } },
  ],
  arcane_pressure: [
    { classId: 'warrior', spawnOffset: { x: -70, y: 40 } },
    { classId: 'mage', spawnOffset: { x: 100, y: -60 } },
  ],
  sustain_pressure: [
    { classId: 'warrior', spawnOffset: { x: -70, y: 40 } },
    { classId: 'priest', spawnOffset: { x: 110, y: -40 } },
  ],
  ranged_harass: [
    { classId: 'ranger', spawnOffset: { x: -90, y: -40 } },
    { classId: 'mage', spawnOffset: { x: 100, y: -70 } },
  ],
  full_party_lite: [
    { classId: 'warrior', spawnOffset: { x: -80, y: 50 } },
    { classId: 'ranger', spawnOffset: { x: 95, y: -45 } },
    { classId: 'mage', spawnOffset: { x: -110, y: -70 } },
    { classId: 'priest', spawnOffset: { x: 120, y: 75 } },
  ],
};

export type LiveBotEncounterSetting = BotEncounterId;

/** True when `value` is a known encounter preset id. */
export function isBotEncounterId(value: unknown): value is BotEncounterId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BOT_ENCOUNTER_PRESETS, value);
}

/**
 * Resolve an encounter setting to its member list, clamped to {@link MAX_BOTS}.
 * Unknown / undefined falls back to the default live encounter. Pure: spawn
 * offsets are applied by the caller (MatchScene) against the base anchor.
 */
export function resolveBotEncounter(
  setting: LiveBotEncounterSetting | undefined,
): readonly BotEncounterMember[] {
  const id = isBotEncounterId(setting) ? setting : DEFAULT_BOT_ENCOUNTER;
  return BOT_ENCOUNTER_PRESETS[id].slice(0, MAX_BOTS);
}

// Phase 5A-7: class skill (MVP) tuning. The bot casts its class signature skill
// (slot1 from the shared SKILLS table) like a player — offensive classes when the
// player is in skill range, priest defensively when low. Config-driven so the
// decision tuning lives here, not inside the system/brain logic.
export interface BotSkillConfig {
  /** Which skill slot the bot uses as its signature class skill. */
  readonly action: ActionKey;
  /** HP ratio at/below which a defensive (heal) skill is cast. */
  readonly defensiveHpRatio: number;
  /** Bot mana regen per second (bot-only pool seeded from the class baseline). */
  readonly manaRegenPerSecond: number;
}

export const BOT_SKILL: BotSkillConfig = {
  action: 'skill1',
  defensiveHpRatio: 0.55,
  manaRegenPerSecond: 25,
};

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
