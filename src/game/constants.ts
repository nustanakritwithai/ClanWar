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

// Phase 2 input/debug overlay. Set to false to hide it once controls are
// validated; safe to delete this flag and the overlay code in a later phase.
export const SHOW_DEBUG_OVERLAY = true;
export const CURRENT_PHASE_LABEL = 'Phase 2: Controls';

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
