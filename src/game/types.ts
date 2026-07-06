// Core shared types. Map/input types for runtime; hero/skill/item/economy specs
// for Phase 3+ live in src/game/data/*.

// Type-only (erased at runtime, so no import cycle) — the multi-bot encounter
// preset ids live with the presets themselves in data/bot-player-config.
import type { BotEncounterId } from './data/bot-player-config';

export type TeamId = 'blue' | 'red';

/** Bot combat/locomotion state (lived in entities/BotPlayer until the Phaser
 * runtime was removed in Phase 6F — values unchanged). */
export type BotState = 'idle' | 'chase' | 'windup' | 'attack' | 'recovery' | 'dead';

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

// --- Phase 2.5 / Phase 3 data spec types ------------------------------------

export type HeroClassId = 'guardian' | 'warrior' | 'ranger' | 'mage' | 'priest';

export interface HeroStats {
  hp: number;
  mana: number;
  attack: number;
  armor: number;
  moveSpeed: number;
  attackRange: number;
  magicPower?: number;
  gateDamageBonus?: number;
}

export interface HeroDefinition {
  id: HeroClassId;
  name: string;
  stats: HeroStats;
}

export type SkillSlot = 'skill1' | 'skill2' | 'skill3' | 'ultimate';

export interface SkillDefinition {
  id: string;
  heroClass: HeroClassId;
  slot: SkillSlot;
  name: string;
  cooldown: number;
  manaCost: number;
  damage?: number;
  heal?: number;
  range?: number;
  radius?: number;
  duration?: number;
  stun?: number;
  slow?: number;
  arc?: number;
  projectileSpeed?: number;
  damageReduction?: number;
  armorBonus?: number;
  attackSpeedBonus?: number;
  gateDamageBonus?: number;
  damagePerSecond?: number;
  damagePerWave?: number;
  waves?: number;
  healPerSecond?: number;
  width?: number;
}

export interface ExpRewards {
  killHero: number;
  assist: number;
  captureObjective: number;
  damageGateMajor: number;
  repairGate: number;
  healAllyMajor: number;
  holdObjectiveTick: number;
}

export interface GoldRewards {
  killGold: number;
  assistGold: number;
  captureGold: number;
  resourceCampTickGold: number;
  passiveGoldPerSecond: number;
}

export interface RespawnRules {
  baseRespawn: number;
  extraRespawnByMinuteDivisor: number;
  maxRespawn: number;
}

export interface EconomyConfig {
  startingGold: number;
  passiveGoldPerSecond: number;
  firstItemTargetTimeSeconds: number;
  maxLevel: number;
  startLevel: number;
  exp: ExpRewards;
  gold: GoldRewards;
  respawn: RespawnRules;
}

export interface ItemDefinition {
  id: string;
  name: string;
  price: number;
  attack?: number;
  armor?: number;
  hp?: number;
  magicPower?: number;
  mana?: number;
  moveSpeed?: number;
  attackSpeedBonus?: number;
  gateDamageBonus?: number;
  healingBonus?: number;
  activeDamageReduction?: number;
  activeDuration?: number;
  activeMoveSpeedBonus?: number;
  repairAmount?: number;
  gateDamage?: number;
  slow?: number;
  duration?: number;
  placeholder?: boolean;
}

export interface EdgeCaseRule {
  id: string;
  description: string;
}

export interface EdgeCaseRules {
  simultaneousCoreDestruction: EdgeCaseRule;
  coreDestructionTiebreaker: EdgeCaseRule;
  respawnWithoutForwardCamp: EdgeCaseRule;
  warActionCancelOnDeath: EdgeCaseRule;
  contestedObjective: EdgeCaseRule;
  matchTimeTiebreaker: EdgeCaseRule;
  coreHpTiebreaker: EdgeCaseRule;
  suddenDeathDuration: EdgeCaseRule;
  suddenDeathTiebreaker: EdgeCaseRule;
}

export interface MatchSceneData {
  heroClass?: HeroClassId;
  /**
   * Phase 5A-7: which class the live AI BotPlayer spawns as. A concrete class id,
   * `'random'`, or `'rotate'`. Omitted → deterministic rotation so the real match
   * is never locked to Warrior. Mirrors the `?botClass=` URL param.
   */
  botClass?: HeroClassId | 'random' | 'rotate';
  /**
   * Phase 5B-1: optional multi-bot encounter preset id (e.g. `'duel_plus'`). When
   * set, the match spawns that preset's class mix instead of a single bot; when
   * omitted, the legacy single-bot path (`botClass`) is used. Mirrors the
   * `?encounter=` URL param.
   */
  encounter?: BotEncounterId;
}

// --- Phase 3B-A: combat foundation ----------------------------------------

export interface CombatTarget {
  currentHp: number;
  maxHp: number;
  armor: number;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  targetHpAfter: number;
  killed: boolean;
}

export type SkillUseFailReason = 'cooldown' | 'mana' | 'no-skill';

export interface SkillUseResult {
  ok: boolean;
  reason?: SkillUseFailReason;
  skillName?: string;
  cooldown?: number;
}

// --- Phase 3B-B1: hit shapes + projectiles -----------------------------

export type SkillRuntimeType =
  | 'melee_arc'
  | 'projectile'
  | 'aoe_circle'
  | 'heal'
  | 'legacy';

export interface ProjectileSpawnConfig {
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxRange: number;
  hitRadius: number;
  damage: number;
  skillId: string;
  skillName: string;
  ownerTeam: TeamId;
  /** AoE radius applied at impact (Fireball). */
  impactAoeRadius?: number;
  visual: 'arrow' | 'fireball';
}
