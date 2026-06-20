import { BotMemory, type BotMemorySnapshot } from './BotMemory';
import type { BotPerception } from './BotPerception';
import { BOT_BRAIN_CONFIG, type BotBrainConfig } from '../data/bot-brain-config';

/** The bot's current high-level intent — exactly one active at a time. */
export type BotGoal =
  | 'patrol_area'
  | 'chase_player'
  | 'attack_player'
  | 'cast_skill'
  | 'hold_range'
  | 'kite_back'
  | 'investigate_last_seen'
  | 'recover_after_attack'
  | 'return_to_spawn';

/** A single step inside a short 1–3 step plan. */
export type BotPlanStep =
  | 'face_player'
  | 'move_toward_player'
  | 'windup_attack'
  | 'cast_skill_step'
  | 'hold_position'
  | 'kite_from_player'
  | 'hold_recover'
  | 'move_to_last_seen'
  | 'scan_area'
  | 'move_to_spawn'
  | 'resume_patrol';

export interface BotPlan {
  goal: BotGoal;
  steps: BotPlanStep[];
  stepIndex: number;
  stepElapsedMs: number;
}

export type GoalScores = Record<BotGoal, number>;

export interface BotBrainSnapshot {
  goal: BotGoal;
  plan: { steps: BotPlanStep[]; stepIndex: number; currentStep: BotPlanStep };
  scores: GoalScores;
  perception: BotPerception | null;
  memory: BotMemorySnapshot;
  investigateTarget: { x: number; y: number } | null;
}

/** Canonical 1–3 step plan for each goal. */
function planFor(goal: BotGoal): BotPlanStep[] {
  switch (goal) {
    case 'attack_player':
      return ['face_player', 'windup_attack'];
    case 'cast_skill':
      return ['face_player', 'cast_skill_step'];
    case 'chase_player':
      return ['face_player', 'move_toward_player', 'windup_attack'];
    case 'hold_range':
      return ['face_player', 'hold_position'];
    case 'kite_back':
      return ['face_player', 'kite_from_player'];
    case 'recover_after_attack':
      return ['hold_recover'];
    case 'investigate_last_seen':
      return ['move_to_last_seen', 'scan_area', 'resume_patrol'];
    case 'return_to_spawn':
      return ['move_to_spawn', 'resume_patrol'];
    case 'patrol_area':
    default:
      return ['resume_patrol'];
  }
}

// Tie-break order for equal scores (highest priority first). Also the set of
// goals pickGoal considers — every goal must appear here.
const GOAL_PRIORITY: BotGoal[] = [
  'cast_skill',
  'attack_player',
  'recover_after_attack',
  'return_to_spawn',
  'kite_back',
  'hold_range',
  'chase_player',
  'investigate_last_seen',
  'patrol_area',
];

/**
 * Phase 5A-3 — BotBrain.
 *
 * A lightweight, rule-based tactical advisor. Each tick it builds short-term
 * memory from perception, scores every candidate goal additively, picks the
 * winner (with a fixed tie-break), and advances a tiny 1–3 step plan. It is a
 * **pure advisor**: it returns intent only. `BotSystem` executes movement /
 * attack / lifecycle and owns the physics body. No LLM/ML, no behavior tree,
 * no GOAP, no persistent memory.
 */
export class BotBrain {
  public readonly memory: BotMemory;
  private readonly cfg: BotBrainConfig;

  private goal: BotGoal = 'patrol_area';
  private plan: BotPlan = { goal: 'patrol_area', steps: ['resume_patrol'], stepIndex: 0, stepElapsedMs: 0 };
  private lastPerception: BotPerception | null = null;
  private lastScores: GoalScores = this.zeroScores();

  constructor(cfg: BotBrainConfig = BOT_BRAIN_CONFIG) {
    this.cfg = cfg;
    this.memory = new BotMemory(cfg.memory);
  }

  /** Advance the brain one tick: memory → score → goal → plan. */
  public tick(perception: BotPerception, nowMs: number, deltaMs: number): void {
    this.lastPerception = perception;
    this.memory.update(perception, nowMs);

    const scores = this.scoreGoals(perception, nowMs);
    this.lastScores = scores;
    const nextGoal = this.pickGoal(scores);

    if (nextGoal !== this.goal) {
      this.goal = nextGoal;
      this.plan = { goal: nextGoal, steps: planFor(nextGoal), stepIndex: 0, stepElapsedMs: 0 };
      this.memory.recordGoal(nextGoal);
    }

    this.advancePlan(perception, deltaMs);
  }

  /** Additive, config-driven scoring. Pure function of (perception, memory). */
  private scoreGoals(p: BotPerception, nowMs: number): GoalScores {
    const w = this.cfg.weights;
    const s = this.zeroScores();

    s.patrol_area = w.patrolBaseline;

    if (p.isStuck) s.return_to_spawn += w.returnStuck;
    if (p.distanceFromSpawn > this.cfg.returnToSpawnDistance) s.return_to_spawn += w.returnTooFar;

    if (this.memory.recentlyMissed(nowMs) || p.state === 'recovery') {
      s.recover_after_attack += w.recoverRecentAttack;
    }

    if (p.playerInAttackRange && p.cooldownReady) {
      s.attack_player += w.attackInRange;
    }

    if (p.playerInDetectionRange) {
      s.chase_player += w.chaseVisible + (p.playerClosing ? w.chaseClosingBonus : 0);
    } else if (this.memory.isLastSeenValid(nowMs)) {
      s.investigate_last_seen += w.investigateValidMemory;
    }

    // Ranged spacing (Phase 5A-6). Only meaningful for ranged classes and only
    // while the player is detected and still leashed. Hysteresis: kite engages
    // inside dangerCloseRange and only disengages once the gap re-opens past
    // preferredMinRange, so the bot does not flip kite⇄hold every frame.
    if (p.isRanged && p.playerInDetectionRange && p.playerWithinLeash) {
      const stayKiting = this.goal === 'kite_back' && p.distanceToPlayer < p.preferredMinRange;
      if (p.playerTooClose || stayKiting) {
        s.kite_back += w.kiteTooClose;
      } else if (p.playerInComfortBand) {
        s.hold_range += w.holdInBand;
      }
    }

    // Class skill (Phase 5A-7, MVP). Only scored in a *healthy engage*: not
    // stuck, on-leash, and not mid recovery/wind-up — so the safety returns and
    // the post-attack recovery beat still win, and a skill cast never interrupts
    // an in-flight swing. Offensive classes cast when the player is in skill
    // range; a priest casts its heal defensively when low on HP.
    const engageHealthy =
      !p.isStuck &&
      p.distanceFromSpawn <= this.cfg.returnToSpawnDistance &&
      p.state !== 'recovery' &&
      p.state !== 'windup' &&
      !this.memory.recentlyMissed(nowMs); // let the recovery beat finish after a whiff
    if (p.skillReady && engageHealthy) {
      if (p.skillIsOffensive) {
        // Ranged classes poke from their skill range; melee classes cast at melee
        // (basic-attack) range so the skill weaves with autos instead of replacing
        // the approach. Ranged never cast point-blank — inside danger-close the bot
        // kites to its comfortable band first (5A-6), then casts.
        const inCastRange = p.isRanged ? p.playerInSkillRange : p.playerInAttackRange;
        const tooClose = p.isRanged && p.playerTooClose;
        if (!tooClose && inCastRange && p.playerInDetectionRange && p.playerWithinLeash) {
          s.cast_skill += w.castSkillReady;
        }
      } else if (p.selfHpLow) {
        s.cast_skill += w.castSkillDefensive;
      }
    }

    return s;
  }

  private pickGoal(scores: GoalScores): BotGoal {
    let best: BotGoal = 'patrol_area';
    let bestScore = -Infinity;
    for (const goal of GOAL_PRIORITY) {
      // Strictly greater means earlier (higher-priority) goals win ties.
      if (scores[goal] > bestScore) {
        bestScore = scores[goal];
        best = goal;
      }
    }
    return best;
  }

  /** Advance the plan's step pointer based on perception conditions. */
  private advancePlan(p: BotPerception, deltaMs: number): void {
    this.plan.stepElapsedMs += deltaMs;
    const step = this.currentStep();
    let advance = false;

    switch (step) {
      case 'face_player':
        advance = true; // instantaneous
        break;
      case 'move_toward_player':
        advance = p.playerInAttackRange;
        break;
      case 'windup_attack':
        advance = false; // terminal; plan rebuilds when the goal changes
        break;
      case 'cast_skill_step':
        advance = false; // terminal; the system resolves the cast, then re-scores
        break;
      case 'hold_position':
        advance = false; // terminal; re-evaluated when scoring changes the goal
        break;
      case 'kite_from_player':
        // Keep backpedalling until the gap re-opens past the comfortable min.
        advance = !p.isRanged || p.distanceToPlayer >= p.preferredMinRange;
        break;
      case 'hold_recover':
        advance = p.state !== 'recovery';
        break;
      case 'move_to_last_seen': {
        const t = this.investigateTarget();
        const reached = t ? Math.hypot(p.botX - t.x, p.botY - t.y) <= this.cfg.investigateArriveRadius : true;
        advance = reached;
        break;
      }
      case 'scan_area':
        advance = this.plan.stepElapsedMs >= this.cfg.scanDurationMs;
        break;
      case 'move_to_spawn':
        advance = p.distanceFromSpawn <= this.cfg.investigateArriveRadius;
        break;
      case 'resume_patrol':
        advance = false; // terminal
        break;
    }

    // Anti-wedge: a non-terminal step can never block forever.
    if (
      !advance &&
      this.plan.stepElapsedMs >= this.cfg.planStepTimeoutMs &&
      step !== 'windup_attack' &&
      step !== 'cast_skill_step' &&
      step !== 'resume_patrol'
    ) {
      advance = true;
    }

    if (advance && this.plan.stepIndex < this.plan.steps.length - 1) {
      this.plan.stepIndex += 1;
      this.plan.stepElapsedMs = 0;
    }
  }

  /** Called by BotSystem on respawn — wipe memory + reset to a clean patrol plan. */
  public onRespawn(nowMs: number): void {
    this.memory.clear(nowMs);
    this.goal = 'patrol_area';
    this.plan = { goal: 'patrol_area', steps: ['resume_patrol'], stepIndex: 0, stepElapsedMs: 0 };
    this.lastScores = this.zeroScores();
  }

  // --- read-only accessors used by BotSystem + regression ---
  public currentGoal(): BotGoal {
    return this.goal;
  }

  public currentStep(): BotPlanStep {
    return this.plan.steps[this.plan.stepIndex];
  }

  /** World point the bot should investigate (last-seen player position). */
  public investigateTarget(): { x: number; y: number } | null {
    if (this.memory.lastSeenPlayerX === null || this.memory.lastSeenPlayerY === null) return null;
    return { x: this.memory.lastSeenPlayerX, y: this.memory.lastSeenPlayerY };
  }

  public snapshot(): BotBrainSnapshot {
    return {
      goal: this.goal,
      plan: { steps: [...this.plan.steps], stepIndex: this.plan.stepIndex, currentStep: this.currentStep() },
      scores: { ...this.lastScores },
      perception: this.lastPerception,
      memory: this.memory.snapshot(),
      investigateTarget: this.investigateTarget(),
    };
  }

  private zeroScores(): GoalScores {
    return {
      patrol_area: 0,
      chase_player: 0,
      attack_player: 0,
      cast_skill: 0,
      hold_range: 0,
      kite_back: 0,
      investigate_last_seen: 0,
      recover_after_attack: 0,
      return_to_spawn: 0,
    };
  }
}
