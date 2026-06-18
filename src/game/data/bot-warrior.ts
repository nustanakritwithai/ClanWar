// Phase 5A-1: config-driven tuning for the first enemy bot — the Basic Red
// Warrior Bot (melee). All gameplay numbers live here so combat feel can be
// tuned without touching the AI state machine (BotSystem) or entity (EnemyBot).
//
// Tuning is held inside the design ranges from docs/phase-5a-bot-design.md §4A
// and docs/phase-5a-bot-combat-feel-plan.md §4. Move speed is intentionally
// below the slowest player class (Guardian 170) so the player can always kite.

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
};
