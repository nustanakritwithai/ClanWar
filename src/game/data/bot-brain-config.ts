// Phase 5A-3: config-driven tuning for the Bot Brain — the perception / memory /
// goal / plan / decision layer that makes the single enemy bot think before it
// acts. All brain numbers live here so behaviour can be tuned without touching
// brain logic (BotBrain) or the entity/system (EnemyBot / BotSystem).
//
// Rule-based only — no LLM/ML/API. See docs/phase-5a-bot-brain-design.md.

export interface BotMemoryConfig {
  /** How long a sighting stays "valid" — the short-term memory window (ms). */
  readonly lastSeenLifetimeMs: number;
  /** "Recently hurt" window (ms). */
  readonly recentDamageWindowMs: number;
  /** "Recently whiffed a swing" window (ms). */
  readonly recentMissWindowMs: number;
  /** Grace window after respawn (ms). */
  readonly recentlyRespawnedMs: number;
  /** Length of the small goal-history ring buffer. */
  readonly goalHistoryLength: number;
}

export interface BotBrainWeights {
  readonly attackInRange: number;
  readonly chaseVisible: number;
  readonly chaseClosingBonus: number;
  readonly investigateValidMemory: number;
  readonly recoverRecentAttack: number;
  readonly returnStuck: number;
  readonly returnTooFar: number;
  readonly patrolBaseline: number;
}

export interface BotBrainConfig {
  readonly weights: BotBrainWeights;
  /** Distance (px) at which the bot counts as having "reached" a move target. */
  readonly investigateArriveRadius: number;
  /** How long the bot scans the last-seen point before giving up (ms). */
  readonly scanDurationMs: number;
  /** Safety timeout per plan step so a step can never wedge forever (ms). */
  readonly planStepTimeoutMs: number;
  /** Bot distance-from-spawn that triggers a return_to_spawn goal (px). */
  readonly returnToSpawnDistance: number;
  /** Deadband (px) for the closing/fleeing derivation to avoid jitter. */
  readonly motionDeadband: number;
  readonly memory: BotMemoryConfig;
}

export const BOT_BRAIN_CONFIG: BotBrainConfig = {
  weights: {
    attackInRange: 100, // in range + cooldown ready always wins
    chaseVisible: 70, // visible player beats stale memory
    chaseClosingBonus: 10, // slight nudge when the player is closing in
    investigateValidMemory: 50, // lost but remembered → go look
    recoverRecentAttack: 90, // finish the recovery beat before re-engaging
    returnStuck: 80, // safety: wedged → go home
    returnTooFar: 75, // safety: off-leash → go home (beats chase 70)
    patrolBaseline: 10, // floor so something always wins
  },
  investigateArriveRadius: 40,
  scanDurationMs: 800,
  planStepTimeoutMs: 4000,
  returnToSpawnDistance: 520, // > patrolRadius and > leashRange (460) + buffer
  motionDeadband: 2,
  memory: {
    lastSeenLifetimeMs: 5000, // 3–8s band — survives a sub-second detection blip
    recentDamageWindowMs: 2500,
    recentMissWindowMs: 1200,
    recentlyRespawnedMs: 600,
    goalHistoryLength: 5,
  },
};
