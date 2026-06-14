// Core shared types. Kept deliberately small for Phase 0-1; hero/skill/item
// schemas (doc section 14) are added when those phases begin.

export type TeamId = 'blue' | 'red';

export type ObjectiveType =
  | 'spawn'
  | 'core'
  | 'gate'
  | 'resource'
  | 'watchtower'
  | 'siegeRuins'
  | 'forwardCamp';

// A placeholder map marker: just enough to draw it and label it on the field.
export interface MapMarker {
  id: string;
  type: ObjectiveType;
  team: TeamId | 'neutral';
  label: string;
  x: number;
  y: number;
  radius: number;
}

// A simple rectangular collider (walls, gate bodies) in world coordinates.
export interface WallRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapDefinition {
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  markers: MapMarker[];
  walls: WallRect[];
}

// --- Phase 2: centralized input state -------------------------------------

export type InputMode = 'keyboard' | 'touch';

// Action buttons. Phase 2 only reports "just pressed" edges; the actual
// gameplay effects (damage, cooldowns, shop, war action context) arrive later.
export type ActionKey =
  | 'attack'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'ultimate'
  | 'warAction'
  | 'item1'
  | 'item2';

export interface InputState {
  moveX: number;
  moveY: number;
  attackPressed: boolean;
  skill1Pressed: boolean;
  skill2Pressed: boolean;
  skill3Pressed: boolean;
  ultimatePressed: boolean;
  warActionPressed: boolean;
  item1Pressed: boolean;
  item2Pressed: boolean;
  lastAction: string;
  inputMode: InputMode;
}
