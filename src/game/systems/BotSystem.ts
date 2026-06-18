import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../constants';
import { testMeleeArc } from '../combat/HitShapes';
import type { DamageResult } from '../types';
import type { Player } from '../entities/Player';
import { EnemyBot, type BotState } from '../entities/EnemyBot';
import {
  BOT_WARRIOR,
  BOT_DIFFICULTY_PROFILES,
  DEFAULT_BOT_DIFFICULTY,
  type BotWarriorConfig,
  type BotDifficulty,
  type BotDifficultyProfile,
} from '../data/bot-warrior';
import { BotBrain, type BotGoal, type BotBrainSnapshot } from '../ai/BotBrain';
import { buildPerception } from '../ai/BotPerception';
import { BOT_BRAIN_CONFIG } from '../data/bot-brain-config';

export interface BotSystemHooks {
  /** Keep bot world objects off the fixed UI camera layer. */
  registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;
  /** Live player reference for detection, chase, and damage. */
  getPlayer: () => Player;
  /** Bot landed a melee hit on the player — show feedback + update HUD. */
  onBotHitPlayer: (result: DamageResult, x: number, y: number) => void;
  /** False when the match is resolved / not in progress — freezes bot AI. */
  isMatchActive: () => boolean;
}

export interface BotSnapshot {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  attack: number;
  state: BotState;
  goal: BotGoal;
  dead: boolean;
  detectionRange: number;
  attackRange: number;
  moveSpeed: number;
  speed: number;
  difficulty: BotDifficulty;
  respawnDelayMs: number;
  spawnX: number;
  spawnY: number;
}

export interface BotDifficultyInfo {
  difficulty: BotDifficulty;
  available: BotDifficulty[];
  baseAttack: number;
  effectiveAttack: number;
  effectiveMoveSpeed: number;
  effectiveWindupMs: number;
  effectiveCooldownMs: number;
}

export interface PlayerMeleeHitResult {
  result: DamageResult;
  x: number;
  y: number;
}

/**
 * Phase 5A-1 / 5A-2 / 5A-3 enemy bot AI — single Basic Red Warrior Bot.
 *
 * Lifecycle, spawn, update loop, respawn, patrol movement, difficulty,
 * collisions, and integration with MatchScene. Damage to the player flows
 * through the existing `Player.takeDamage` / `CombatSystem` path — no player
 * formula change. Bot death does not end the match.
 *
 * Phase 5A-3 adds a {@link BotBrain} advisor: each tick BotSystem builds a
 * perception snapshot, ticks the brain (perception → memory → goal → plan →
 * decision), and **executes** the chosen goal using the existing 5A-1/5A-2
 * movement/attack verbs. The brain never moves the body or touches other
 * systems. The combat sub-sequence (wind-up → attack → recovery) runs to
 * completion exactly as before — the brain governs the free states only.
 *
 * Scope guard: one bot, melee only, rule-based brain (no LLM/ML/API, no big
 * behavior tree, no GOAP), no objective/Gate/Core AI, no skills, no multi-bot.
 */
export class BotSystem {
  public readonly bot: EnemyBot;

  private readonly scene: Phaser.Scene;
  private readonly hooks: BotSystemHooks;
  private readonly cfg: BotWarriorConfig;
  private readonly brain: BotBrain;

  private difficulty: BotDifficulty;
  private profile: BotDifficultyProfile;

  private facingAngle = 0;
  private windupTimer = 0;
  private recoveryTimer = 0;
  private cooldownTimer = 0;

  // Respawn
  private respawnTimer = 0;
  private respawnArmed = false;

  // Patrol
  private patrolTarget: { x: number; y: number };
  private patrolPauseTimer = 0;
  private stuckTimer = 0;
  private lastPatrolX = 0;
  private lastPatrolY = 0;

  // Brain-driven stuck detection (separate from patrol's local guard)
  private stuckAccumMs = 0;
  private lastStuckX = 0;
  private lastStuckY = 0;
  private stuck = false;
  private debugStuckOverride: boolean | null = null;

  constructor(
    scene: Phaser.Scene,
    hooks: BotSystemHooks,
    cfg: BotWarriorConfig = BOT_WARRIOR,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
  ) {
    this.scene = scene;
    this.hooks = hooks;
    this.cfg = cfg;
    this.difficulty = difficulty;
    this.profile = BOT_DIFFICULTY_PROFILES[difficulty];

    this.bot = new EnemyBot(scene, cfg, (o) => this.hooks.registerWorldObject(o));
    this.brain = new BotBrain(BOT_BRAIN_CONFIG);
    this.patrolTarget = { x: cfg.spawn.x, y: cfg.spawn.y };
    this.resetPatrol();
  }

  // --- effective (difficulty-scaled) stats — bot-only, never touch the player ---
  private get effMoveSpeed(): number {
    return this.cfg.moveSpeed * this.profile.moveSpeedMul;
  }
  private get effAttack(): number {
    return Math.max(1, Math.round(this.cfg.attack * this.profile.attackMul));
  }
  private get effWindupMs(): number {
    return this.cfg.windupMs * this.profile.windupMul;
  }
  private get effCooldownMs(): number {
    return this.cfg.attackCooldownMs * this.profile.cooldownMul;
  }

  public update(deltaMs: number): void {
    this.bot.update(deltaMs);
    const now = this.scene.time.now;

    if (this.bot.isDead()) {
      this.bot.body.setVelocity(0, 0);
      if (!this.respawnArmed) {
        this.respawnTimer = this.cfg.respawnDelayMs;
        this.respawnArmed = true;
      }
      if (this.hooks.isMatchActive()) {
        this.respawnTimer -= deltaMs;
        if (this.respawnTimer <= 0) this.respawnBot(now);
      }
      return;
    }

    if (!this.hooks.isMatchActive()) {
      this.bot.body.setVelocity(0, 0);
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaMs);

    const player = this.hooks.getPlayer();

    // 1) Perceive → think (brain is a pure advisor).
    const perception = buildPerception({
      botX: this.bot.x,
      botY: this.bot.y,
      playerX: player.x,
      playerY: player.y,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
      detectionRange: this.cfg.detectionRange,
      attackRange: this.cfg.attackRange,
      leashRange: this.cfg.leashRange,
      hpRatio: this.bot.currentHp / this.bot.maxHp,
      cooldownReady: this.cooldownTimer <= 0,
      isStuck: this.debugStuckOverride ?? this.stuck,
      state: this.bot.state,
      matchActive: true,
      prevDistanceToPlayer: this.brain.memory.prevDistanceToPlayer,
      motionDeadband: BOT_BRAIN_CONFIG.motionDeadband,
    });
    this.brain.tick(perception, now, deltaMs);

    // 2) The combat sub-sequence runs to completion regardless of the goal —
    //    the brain never interrupts an in-progress swing.
    if (this.bot.state === 'windup') {
      this.bot.body.setVelocity(0, 0);
      this.windupTimer -= deltaMs;
      if (this.windupTimer <= 0) {
        this.bot.hideWindupCue();
        const hit = this.resolveAttack(player);
        this.brain.memory.recordAttack(now);
        if (!hit) this.brain.memory.recordMissedAttack(now);
        this.bot.state = 'recovery';
        this.recoveryTimer = this.cfg.recoveryMs;
        this.cooldownTimer = this.effCooldownMs;
      }
      this.updateStuck(deltaMs, false);
      return;
    }

    if (this.bot.state === 'recovery') {
      this.bot.body.setVelocity(0, 0);
      this.recoveryTimer -= deltaMs;
      if (this.recoveryTimer <= 0) this.bot.state = 'idle';
      this.updateStuck(deltaMs, false);
      return;
    }

    // 3) Execute the brain's chosen goal with existing movement/attack verbs.
    this.executeGoal(this.brain.currentGoal(), perception, player, deltaMs);
  }

  private executeGoal(goal: BotGoal, p: ReturnType<typeof buildPerception>, player: Player, deltaMs: number): void {
    switch (goal) {
      case 'attack_player':
      case 'chase_player': {
        this.bot.state = 'chase';
        if (p.playerInAttackRange) {
          this.bot.body.setVelocity(0, 0);
          this.facingAngle = p.angleToPlayer;
          if (this.cooldownTimer <= 0) {
            this.bot.state = 'windup';
            this.windupTimer = this.effWindupMs;
            this.bot.showWindupCue(this.facingAngle, this.effWindupMs);
          }
          this.updateStuck(deltaMs, false);
        } else {
          this.seekTo(player.x, player.y, this.effMoveSpeed, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        }
        break;
      }

      case 'investigate_last_seen': {
        this.bot.state = 'idle';
        const target = this.brain.investigateTarget();
        if (target && Math.hypot(this.bot.x - target.x, this.bot.y - target.y) > BOT_BRAIN_CONFIG.investigateArriveRadius) {
          this.seekTo(target.x, target.y, this.effMoveSpeed, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        } else {
          this.bot.body.setVelocity(0, 0); // scanning at the last-seen point
          this.updateStuck(deltaMs, false);
        }
        break;
      }

      case 'return_to_spawn': {
        this.bot.state = 'idle';
        if (p.distanceFromSpawn > BOT_BRAIN_CONFIG.investigateArriveRadius) {
          this.seekTo(this.cfg.spawn.x, this.cfg.spawn.y, this.effMoveSpeed, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        } else {
          this.bot.body.setVelocity(0, 0);
          this.updateStuck(deltaMs, false);
        }
        break;
      }

      case 'recover_after_attack': {
        // The recovery sub-state owns real recovery; here just hold.
        this.bot.state = 'idle';
        this.bot.body.setVelocity(0, 0);
        this.updateStuck(deltaMs, false);
        break;
      }

      case 'patrol_area':
      default: {
        this.bot.state = 'idle';
        this.patrol(deltaMs);
        this.updateStuck(deltaMs, false); // patrol has its own local stuck guard
        break;
      }
    }
  }

  /** Seek a world point, clamped so the bot is never unfairly faster than the player. */
  private seekTo(tx: number, ty: number, speed: number, playerMoveSpeed: number): void {
    const angle = Math.atan2(ty - this.bot.y, tx - this.bot.x);
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(speed, cap);
    this.bot.body.setVelocity(Math.cos(angle) * v, Math.sin(angle) * v);
    this.facingAngle = angle;
  }

  /** Brain-facing stuck detection: trying to move but barely displacing. */
  private updateStuck(deltaMs: number, moving: boolean): void {
    if (!moving) {
      this.stuck = false;
      this.stuckAccumMs = 0;
      this.lastStuckX = this.bot.x;
      this.lastStuckY = this.bot.y;
      return;
    }
    const moved = Math.hypot(this.bot.x - this.lastStuckX, this.bot.y - this.lastStuckY);
    this.stuckAccumMs = moved < 4 ? this.stuckAccumMs + deltaMs : 0;
    this.stuck = this.stuckAccumMs > 600;
    this.lastStuckX = this.bot.x;
    this.lastStuckY = this.bot.y;
  }

  /** Short idle saunter around the spawn anchor so the bot never stands frozen. */
  private patrol(deltaMs: number): void {
    if (this.patrolPauseTimer > 0) {
      this.patrolPauseTimer -= deltaMs;
      this.bot.body.setVelocity(0, 0);
      return;
    }

    const pdx = this.patrolTarget.x - this.bot.x;
    const pdy = this.patrolTarget.y - this.bot.y;
    const pdist = Math.hypot(pdx, pdy);

    if (pdist < 12) {
      this.bot.body.setVelocity(0, 0);
      this.patrolPauseTimer = Phaser.Math.Between(this.cfg.patrolPauseMinMs, this.cfg.patrolPauseMaxMs);
      this.patrolTarget = this.pickPatrolTarget();
      return;
    }

    const angle = Math.atan2(pdy, pdx);
    const speed = this.effMoveSpeed * this.cfg.patrolSpeedMul;
    this.bot.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.facingAngle = angle;

    const spawnDist = Math.hypot(this.bot.x - this.cfg.spawn.x, this.bot.y - this.cfg.spawn.y);
    if (spawnDist > this.cfg.patrolRadius * 1.6) {
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
    }

    const moved = Math.hypot(this.bot.x - this.lastPatrolX, this.bot.y - this.lastPatrolY);
    this.stuckTimer = moved < 4 ? this.stuckTimer + deltaMs : 0;
    if (this.stuckTimer > 500) {
      this.stuckTimer = 0;
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
      this.patrolPauseTimer = this.cfg.patrolPauseMinMs;
    }
    this.lastPatrolX = this.bot.x;
    this.lastPatrolY = this.bot.y;
  }

  private pickPatrolTarget(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(30, this.cfg.patrolRadius);
    return {
      x: this.cfg.spawn.x + Math.cos(angle) * dist,
      y: this.cfg.spawn.y + Math.sin(angle) * dist,
    };
  }

  private resetPatrol(): void {
    this.patrolTarget = this.pickPatrolTarget();
    this.patrolPauseTimer = Phaser.Math.Between(200, 600);
    this.stuckTimer = 0;
    this.lastPatrolX = this.bot.x;
    this.lastPatrolY = this.bot.y;
    this.stuckAccumMs = 0;
    this.stuck = false;
    this.lastStuckX = this.bot.x;
    this.lastStuckY = this.bot.y;
  }

  private respawnBot(now: number): void {
    this.bot.reset();
    this.bot.showSpawnFeedback();
    this.respawnArmed = false;
    this.windupTimer = 0;
    this.recoveryTimer = 0;
    this.cooldownTimer = 0;
    this.resetPatrol();
    this.brain.onRespawn(now); // clear memory + plan so a fresh bot has no stale chase
  }

  /** Resolve a swing. Returns true if it connected. Damage only when in arc. */
  private resolveAttack(player: Player): boolean {
    this.bot.state = 'attack';
    const arc = testMeleeArc(
      this.bot.x,
      this.bot.y,
      this.facingAngle,
      player.x,
      player.y,
      PLAYER_RADIUS,
      this.cfg.attackRange,
      this.cfg.attackArcDegrees,
    );
    if (!arc.hit) return false; // player dodged out during wind-up

    this.bot.showAttackFlash();
    const result = player.takeDamage(this.effAttack);
    this.hooks.onBotHitPlayer(result, player.x, player.y);
    return true;
  }

  /** Player basic/melee attack against the bot. Returns null when it misses. */
  public tryPlayerMeleeHit(
    casterX: number,
    casterY: number,
    facingAngle: number,
    range: number,
    rawDamage: number,
  ): PlayerMeleeHitResult | null {
    if (this.bot.isDead()) return null;
    const arc = testMeleeArc(casterX, casterY, facingAngle, this.bot.x, this.bot.y, this.bot.radius, range);
    if (!arc.hit) return null;
    const result = this.bot.takeDamage(rawDamage);
    this.brain.memory.recordDamageTaken(this.scene.time.now);
    return { result, x: this.bot.x, y: this.bot.y };
  }

  public isBotAlive(): boolean {
    return !this.bot.isDead();
  }

  public getBotState(): BotState {
    return this.bot.state;
  }

  public getBotSnapshot(): BotSnapshot {
    return {
      x: this.bot.x,
      y: this.bot.y,
      hp: this.bot.currentHp,
      maxHp: this.bot.maxHp,
      armor: this.bot.armor,
      attack: this.effAttack,
      state: this.bot.state,
      goal: this.brain.currentGoal(),
      dead: this.bot.isDead(),
      detectionRange: this.cfg.detectionRange,
      attackRange: this.cfg.attackRange,
      moveSpeed: this.effMoveSpeed,
      speed: Math.hypot(this.bot.body.velocity.x, this.bot.body.velocity.y),
      difficulty: this.difficulty,
      respawnDelayMs: this.cfg.respawnDelayMs,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
    };
  }

  /** Full brain snapshot for headless regression (perception + memory + goal + plan). */
  public getBrainSnapshot(): BotBrainSnapshot {
    return this.brain.snapshot();
  }

  public getDifficultyInfo(): BotDifficultyInfo {
    return {
      difficulty: this.difficulty,
      available: Object.keys(BOT_DIFFICULTY_PROFILES) as BotDifficulty[],
      baseAttack: this.cfg.attack,
      effectiveAttack: this.effAttack,
      effectiveMoveSpeed: this.effMoveSpeed,
      effectiveWindupMs: this.effWindupMs,
      effectiveCooldownMs: this.effCooldownMs,
    };
  }

  /** Debug-only difficulty swap for headless regression (not player-facing). */
  public debugSetDifficulty(difficulty: BotDifficulty): void {
    if (!BOT_DIFFICULTY_PROFILES[difficulty]) return;
    this.difficulty = difficulty;
    this.profile = BOT_DIFFICULTY_PROFILES[difficulty];
  }

  /** Debug-only damage hook for headless regression (not player-facing). */
  public debugDamageBot(amount: number): DamageResult {
    return this.bot.takeDamage(amount);
  }

  /** Debug-only: force/clear the stuck flag for headless regression. */
  public debugSetStuck(value: boolean | null): void {
    this.debugStuckOverride = value;
  }

  /** Debug-only: teleport the bot body for headless regression. */
  public debugTeleportBot(x: number, y: number): void {
    this.bot.sprite.setPosition(x, y);
    this.bot.body.reset(x, y);
  }

  public destroy(): void {
    this.bot.destroy();
  }
}
