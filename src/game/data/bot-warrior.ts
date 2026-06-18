// Phase 5A-1 / 5A-2: config-driven tuning for the first enemy bot — the Basic
// Red Warrior Bot (melee). All gameplay numbers live here so combat feel can be
// tuned without touching the AI state machine (BotSystem) or entity (EnemyBot).
//
// Tuning is held inside the design ranges from docs/phase-5a-bot-design.md §4A
// and docs/phase-5a-bot-combat-feel-plan.md §4. Move speed is intentionally
// below the slowest player class (Guardian 170) so the player can always kite.
//
// Phase 5A-2 adds respawn, idle patrol, and a config-driven difficulty knob.
// Still ONE melee bot — no multi-bot, objective AI, ranged, or skills.

export interface BotWarriorConfig {
  /** Player-facing identity label (no snake_case / debug strings). */
  readonly name: string;
  readonly maxHp: number;
  /** Raw attack before player armor mitigation (CombatSystem applies armor). */
  readonly attack: number;
  readonly armor: number;
  /** px/sec chase speed — must stay below the slowest player class. */
  readonly moveSpeed: number;
  /** Physics body + melee hit radius. */
  readonly radius: number;
  /** Distance (px) at which an idle bot notices the player and starts chasing. */
  readonly detectionRange: number;
  /** Distance (px) at which the bot stops chasing and may wind up an attack. */
  readonly attackRange: number;
  /** Minimum gap between the start of one swing and the next (ms). */
  readonly attackCooldownMs: number;
  /** Telegraph window before damage resolves — the dodge window (ms). */
  readonly windupMs: number;
  /** Post-swing pause that opens the player counter-attack window (ms). */
  readonly recoveryMs: number;
  /** Distance (px) beyond which a chasing bot loses aggro and returns to idle. */
  readonly leashRange: number;
  /** Melee arc width (degrees) used to confirm the player is in front at hit. */
  readonly attackArcDegrees: number;
  /** World spawn position for the single MVP bot. */
  readonly spawn: { readonly x: number; readonly y: number };
  /** Delay (ms) after death before the single bot respawns at its anchor. */
  readonly respawnDelayMs: number;
  /** Idle patrol: max distance (px) the bot wanders from its spawn anchor. */
  readonly patrolRadius: number;
  /** Idle patrol move speed as a fraction of moveSpeed (slow saunter). */
  readonly patrolSpeedMul: number;
  /** Idle patrol pause range (ms) between short walks. */
  readonly patrolPauseMinMs: number;
  readonly patrolPauseMaxMs: number;
}

export const BOT_WARRIOR: BotWarriorConfig = {
  name: 'Enemy Warrior',
  maxHp: 600, // range 500–700: killable in ~12–15 player hits
  attack: 44, // range 38–52: threat without burst
  armor: 12, // range 8–15: player damage stays meaningful
  moveSpeed: 160, // range 150–168: slower than Guardian 170 — player can kite
  radius: 24,
  detectionRange: 360, // range 280–400: mid-range engagement, not whole-map aggro
  attackRange: 66, // range 58–72: melee only
  attackCooldownMs: 1600, // range 1400–2000: clear gap between swings
  windupMs: 550, // range 450–650: telegraph / dodge window
  recoveryMs: 450, // range 350–550: counter-attack window after a swing
  leashRange: 460, // detection + ~100: drop chase if the player kites away
  attackArcDegrees: 110,
  // Forward of the blue spawn (1500,3900) on the central lane, inside the Blue
  // Gate opening (x 1140–1860, no wall between bot and player). ~515px from
  // spawn, just beyond detectionRange so the bot starts idle and the player
  // triggers the chase by advancing up the lane toward the enemy fortress.
  spawn: { x: 1750, y: 3450 },
  respawnDelayMs: 4000,
  patrolRadius: 110, // small ring around spawn — stays clear of the gate walls
  patrolSpeedMul: 0.42, // saunter, clearly slower than a chase
  patrolPauseMinMs: 700,
  patrolPauseMaxMs: 1500,
};

// --- Phase 5A-2 difficulty ---------------------------------------------------
// Config-driven only. Default is "normal" (the tuned 5A-1 feel). "easy" and
// "hard" are prepared multipliers applied to the BASE bot stats — they never
// touch player stats, the player damage formula, or core combat rules. The bot
// chase speed is additionally clamped to player.moveSpeed × maxPlayerSpeedRatio
// in BotSystem so even "hard" stays fair.

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface BotDifficultyProfile {
  readonly moveSpeedMul: number;
  readonly attackMul: number;
  readonly windupMul: number;
  readonly cooldownMul: number;
  /** Bot chase speed may not exceed player.moveSpeed × this ratio. */
  readonly maxPlayerSpeedRatio: number;
}

export const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
  // Slower, softer hits, longer telegraph — forgiving.
  easy: { moveSpeedMul: 0.85, attackMul: 0.75, windupMul: 1.3, cooldownMul: 1.25, maxPlayerSpeedRatio: 0.9 },
  // The tuned, playable 5A-1 baseline.
  normal: { moveSpeedMul: 1.0, attackMul: 1.0, windupMul: 1.0, cooldownMul: 1.0, maxPlayerSpeedRatio: 0.97 },
  // Slightly faster, slightly harder-hitting, tighter cooldown — still not unfair.
  hard: { moveSpeedMul: 1.08, attackMul: 1.12, windupMul: 0.85, cooldownMul: 0.82, maxPlayerSpeedRatio: 1.06 },
};

export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'normal';

