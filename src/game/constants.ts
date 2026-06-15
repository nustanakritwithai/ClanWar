// Shared constants for Phase 0-1. Gameplay tuning (combat/economy/skills) is
// intentionally NOT here yet — those arrive in later phases.

export const SCENE_KEYS = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  ClassSelect: 'ClassSelectScene',
  Match: 'MatchScene',
  Result: 'ResultScene',
} as const;

// Small Twin Fortress map dimensions (px). See planning doc section 5.1.
export const MAP_WIDTH = 3000;
export const MAP_HEIGHT = 4200;

// Player placeholder movement (px/sec). Real per-class speed comes in Phase 3.
export const PLAYER_MOVE_SPEED = 320;
export const PLAYER_RADIUS = 22;

// Phase 2.5 debug overlay. Default on during dev; toggle at runtime with ` or F1.
export const SHOW_DEBUG_OVERLAY = true;
export const CURRENT_PHASE_LABEL = 'Phase 4A: Map Visual · Phase 4B-A Gate/Core Objectives';

/** Viewport height below which compact mobile HUD/controls are used. */
export const COMPACT_LAYOUT_HEIGHT = 480;

/** Left-side screen fraction reserved for movement (joystick) input. */
export const MOVEMENT_ZONE_WIDTH_RATIO = 0.45;

/** Passive mana regeneration for Phase 3A skill testing (not final balance). */
export const MANA_REGEN_PER_SECOND = 8;

/** Body hit radius for skill projectiles (independent of on-hit AoE). */
export const PROJECTILE_HIT_RADIUS = 14;

/** Player team placeholder until multiplayer/bots exist. */
export const PLAYER_TEAM = 'blue' as const;

// Team colors used for placeholder rendering.
export const COLORS = {
  blue: 0x3b82f6,
  red: 0xef4444,
  neutral: 0x9ca3af,
  bg: 0x10151d,
  ground: 0x182230,
  wall: 0x3a4658,
  gate: 0xcfa14a,
  core: 0xf4d35e,
  text: '#e6edf3',
} as const;
