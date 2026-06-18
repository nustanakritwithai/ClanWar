import type { BotMemoryConfig } from '../data/bot-brain-config';
import type { BotPerception } from './BotPerception';
import type { BotGoal } from './BotBrain';

/**
 * Phase 5A-3 — BotMemory.
 *
 * Short-term, time-decaying facts. No persistence. Cleared on respawn. Driven by
 * the scene/game clock (`nowMs` passed in), never `Date.now()`, so headless
 * regression can advance time deterministically.
 */
export interface BotMemorySnapshot {
  lastSeenPlayerX: number | null;
  lastSeenPlayerY: number | null;
  lastSeenAtMs: number | null;
  lastKnownPlayerDir: number | null;
  prevDistanceToPlayer: number | null;
  lastDamageTakenAtMs: number | null;
  lastAttackAtMs: number | null;
  lastMissedAttackAtMs: number | null;
  lastStuckAtMs: number | null;
  recentlyRespawnedUntilMs: number | null;
  recentGoalHistory: BotGoal[];
}

export class BotMemory {
  public lastSeenPlayerX: number | null = null;
  public lastSeenPlayerY: number | null = null;
  public lastSeenAtMs: number | null = null;
  public lastKnownPlayerDir: number | null = null;
  public prevDistanceToPlayer: number | null = null;

  public lastDamageTakenAtMs: number | null = null;
  public lastAttackAtMs: number | null = null;
  public lastMissedAttackAtMs: number | null = null;
  public lastStuckAtMs: number | null = null;
  public recentlyRespawnedUntilMs: number | null = null;

  public recentGoalHistory: BotGoal[] = [];

  constructor(private readonly cfg: BotMemoryConfig) {}

  /** Refresh sighting + derived fields from the current perception. */
  public update(perception: BotPerception, nowMs: number): void {
    if (perception.playerInDetectionRange) {
      this.lastSeenPlayerX = perception.playerX;
      this.lastSeenPlayerY = perception.playerY;
      this.lastSeenAtMs = nowMs;
      this.lastKnownPlayerDir = perception.angleToPlayer;
    }
    if (perception.isStuck) {
      this.lastStuckAtMs = nowMs;
    }
    // Always remember this tick's distance for next tick's closing/fleeing.
    this.prevDistanceToPlayer = perception.distanceToPlayer;
  }

  public isLastSeenValid(nowMs: number): boolean {
    if (this.lastSeenAtMs === null || this.lastSeenPlayerX === null) return false;
    return nowMs - this.lastSeenAtMs <= this.cfg.lastSeenLifetimeMs;
  }

  public recentlyDamaged(nowMs: number): boolean {
    return this.lastDamageTakenAtMs !== null && nowMs - this.lastDamageTakenAtMs <= this.cfg.recentDamageWindowMs;
  }

  public recentlyMissed(nowMs: number): boolean {
    return this.lastMissedAttackAtMs !== null && nowMs - this.lastMissedAttackAtMs <= this.cfg.recentMissWindowMs;
  }

  public recentlyStuck(nowMs: number): boolean {
    return this.lastStuckAtMs !== null && nowMs - this.lastStuckAtMs <= this.cfg.recentMissWindowMs;
  }

  public recentlyRespawned(nowMs: number): boolean {
    return this.recentlyRespawnedUntilMs !== null && nowMs <= this.recentlyRespawnedUntilMs;
  }

  // --- event recorders (called by BotSystem) ---
  public recordDamageTaken(nowMs: number): void {
    this.lastDamageTakenAtMs = nowMs;
  }
  public recordAttack(nowMs: number): void {
    this.lastAttackAtMs = nowMs;
  }
  public recordMissedAttack(nowMs: number): void {
    this.lastMissedAttackAtMs = nowMs;
  }
  public recordGoal(goal: BotGoal): void {
    const h = this.recentGoalHistory;
    if (h[h.length - 1] === goal) return; // only record transitions
    h.push(goal);
    while (h.length > this.cfg.goalHistoryLength) h.shift();
  }

  /** Wipe all short-term state — called on respawn. */
  public clear(nowMs?: number): void {
    this.lastSeenPlayerX = null;
    this.lastSeenPlayerY = null;
    this.lastSeenAtMs = null;
    this.lastKnownPlayerDir = null;
    this.prevDistanceToPlayer = null;
    this.lastDamageTakenAtMs = null;
    this.lastAttackAtMs = null;
    this.lastMissedAttackAtMs = null;
    this.lastStuckAtMs = null;
    this.recentGoalHistory = [];
    this.recentlyRespawnedUntilMs = nowMs !== undefined ? nowMs + this.cfg.recentlyRespawnedMs : null;
  }

  public snapshot(): BotMemorySnapshot {
    return {
      lastSeenPlayerX: this.lastSeenPlayerX,
      lastSeenPlayerY: this.lastSeenPlayerY,
      lastSeenAtMs: this.lastSeenAtMs,
      lastKnownPlayerDir: this.lastKnownPlayerDir,
      prevDistanceToPlayer: this.prevDistanceToPlayer,
      lastDamageTakenAtMs: this.lastDamageTakenAtMs,
      lastAttackAtMs: this.lastAttackAtMs,
      lastMissedAttackAtMs: this.lastMissedAttackAtMs,
      lastStuckAtMs: this.lastStuckAtMs,
      recentlyRespawnedUntilMs: this.recentlyRespawnedUntilMs,
      recentGoalHistory: [...this.recentGoalHistory],
    };
  }
}
