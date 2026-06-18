import type { BotState } from '../entities/BotPlayer';

/**
 * Phase 5A-3 — BotPerception.
 *
 * A read-only snapshot of what the bot can "see" this tick, built fresh by the
 * pure {@link buildPerception} function from data the bot already has. The brain
 * consumes only this struct — it never reaches into EnemyBot / Player / other
 * systems directly. Pure ⇒ trivially unit-testable without Phaser.
 */
export interface BotPerception {
  // Spatial
  botX: number;
  botY: number;
  playerX: number;
  playerY: number;
  distanceToPlayer: number;
  angleToPlayer: number; // radians, bot → player
  distanceFromSpawn: number;

  // Visibility / range gates (existing bot-warrior thresholds)
  playerInDetectionRange: boolean;
  playerInAttackRange: boolean;
  playerWithinLeash: boolean;

  // Player motion (derived vs previous distance held in memory)
  playerClosing: boolean;
  playerFleeing: boolean;

  // Self
  hpRatio: number;
  cooldownReady: boolean;
  isStuck: boolean;
  state: BotState;

  // World
  matchActive: boolean;
}

export interface BuildPerceptionArgs {
  botX: number;
  botY: number;
  playerX: number;
  playerY: number;
  spawnX: number;
  spawnY: number;
  detectionRange: number;
  attackRange: number;
  leashRange: number;
  hpRatio: number;
  cooldownReady: boolean;
  isStuck: boolean;
  state: BotState;
  matchActive: boolean;
  /** Distance to player from the previous tick (from memory) for motion derivation. */
  prevDistanceToPlayer: number | null;
  /** Deadband (px) so tiny jitter does not flip closing/fleeing. */
  motionDeadband: number;
}

/** Pure perception builder. No Phaser, no side effects. */
export function buildPerception(a: BuildPerceptionArgs): BotPerception {
  const dx = a.playerX - a.botX;
  const dy = a.playerY - a.botY;
  const distanceToPlayer = Math.hypot(dx, dy);
  const distanceFromSpawn = Math.hypot(a.botX - a.spawnX, a.botY - a.spawnY);

  let playerClosing = false;
  let playerFleeing = false;
  if (a.prevDistanceToPlayer !== null) {
    const delta = distanceToPlayer - a.prevDistanceToPlayer;
    if (delta < -a.motionDeadband) playerClosing = true;
    else if (delta > a.motionDeadband) playerFleeing = true;
  }

  return {
    botX: a.botX,
    botY: a.botY,
    playerX: a.playerX,
    playerY: a.playerY,
    distanceToPlayer,
    angleToPlayer: Math.atan2(dy, dx),
    distanceFromSpawn,
    playerInDetectionRange: distanceToPlayer <= a.detectionRange,
    playerInAttackRange: distanceToPlayer <= a.attackRange,
    playerWithinLeash: distanceToPlayer <= a.leashRange,
    playerClosing,
    playerFleeing,
    hpRatio: a.hpRatio,
    cooldownReady: a.cooldownReady,
    isStuck: a.isStuck,
    state: a.state,
    matchActive: a.matchActive,
  };
}
