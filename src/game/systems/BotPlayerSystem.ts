import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../constants';
import { testMeleeArc } from '../combat/HitShapes';
import type { DamageResult, HeroClassId, HeroStats } from '../types';
import type { Player } from '../entities/Player';
import { getHero } from '../data/heroes';
import { BotPlayer, type BotState } from '../entities/BotPlayer';
import {
  BOT_PLAYER,
  BOT_PLAYER_DIFFICULTY_PROFILES,
  DEFAULT_BOT_DIFFICULTY,
  type BotPlayerConfig,
  type BotDifficulty,
  type BotDifficultyProfile,
} from '../data/bot-player-config';
import { BotBrain, type BotGoal, type BotBrainSnapshot } from '../ai/BotBrain';
import { buildPerception } from '../ai/BotPerception';
import { BOT_BRAIN_CONFIG } from '../data/bot-brain-config';
import { BotPlayerController, type BotIntent } from '../controllers/BotPlayerController';

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
  classId: HeroClassId;
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
  classId: HeroClassId;
  baseAttack: number; // class baseline (no difficulty)
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
 * Phase 5A-4 BotPlayerSystem — lifecycle for the single AI-controlled player.
 *
 * Evolved from the 5A-1/5A-2/5A-3 `BotSystem` (kept as a compatibility alias).
 * The bot is now a {@link BotPlayer}: its stat baseline is read BY VALUE from the
 * shared player class table (`getHero(classId)` → Warrior) and difficulty applies
 * bot-only multipliers on top. Player stats and the player damage formula are
 * untouched.
 *
 * Flow: build perception → {@link BotBrain} chooses a goal → {@link BotPlayerController}
 * converts the goal to a {@link BotIntent} → this system executes the intent with
 * the shared movement/attack verbs. The combat sub-sequence (wind-up → attack →
 * recovery) runs to completion exactly as before.
 *
 * Scope guard: one bot, Warrior melee only, rule-based brain (no LLM/ML), no
 * objective/Gate/Core AI, no skills, no ranged, no multi-bot.
 */
export class BotPlayerSystem {
  public readonly bot: BotPlayer;

  private readonly scene: Phaser.Scene;
  private readonly hooks: BotSystemHooks;
  private readonly cfg: BotPlayerConfig;
  private readonly classStats: HeroStats;
  private readonly attackRange: number;
  private readonly brain: BotBrain;
  private readonly controller: BotPlayerController;

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
    cfg: BotPlayerConfig = BOT_PLAYER,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
  ) {
    this.scene = scene;
    this.hooks = hooks;
    this.cfg = cfg;
    this.difficulty = difficulty;
    this.profile = BOT_PLAYER_DIFFICULTY_PROFILES[difficulty];

    // Stat baseline read BY VALUE from the shared player class table.
    this.classStats = { ...getHero(cfg.classId).stats };
    this.attackRange = this.classStats.attackRange;

    this.bot = new BotPlayer(
      scene,
      {
        classId: cfg.classId,
        name: cfg.name,
        maxHp: Math.max(1, Math.round(this.classStats.hp * this.profile.hpMul)),
        armor: this.classStats.armor,
        radius: cfg.radius,
        attackRange: this.attackRange,
        attackArcDegrees: cfg.attackArcDegrees,
        spawn: { x: cfg.spawn.x, y: cfg.spawn.y },
      },
      (o) => this.hooks.registerWorldObject(o),
    );
    this.brain = new BotBrain(BOT_BRAIN_CONFIG);
    this.controller = new BotPlayerController();
    this.patrolTarget = { x: cfg.spawn.x, y: cfg.spawn.y };
    this.resetPatrol();
  }

  // --- effective (class baseline × difficulty) stats — bot-only ---
  private get effMoveSpeed(): number {
    return this.classStats.moveSpeed * this.profile.speedMul;
  }
  private get effAttack(): number {
    return Math.max(1, Math.round(this.classStats.attack * this.profile.attackMul));
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
      attackRange: this.attackRange,
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

    // 2) The combat sub-sequence runs to completion regardless of the goal.
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

    // 3) Brain goal → controller intent → execute with shared verbs.
    const intent = this.controller.intentFor(this.brain.currentGoal(), perception, {
      playerX: player.x,
      playerY: player.y,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
      investigateTarget: this.brain.investigateTarget(),
    });
    this.executeIntent(intent, perception, player, deltaMs);
  }

  private executeIntent(intent: BotIntent, p: ReturnType<typeof buildPerception>, player: Player, deltaMs: number): void {
    switch (intent.kind) {
      case 'engage': {
        this.bot.state = 'chase';
        if (p.playerInAttackRange) {
          this.bot.body.setVelocity(0, 0);
          this.facingAngle = p.angleToPlayer;
          if (intent.basicAttack && this.cooldownTimer <= 0) {
            this.bot.state = 'windup';
            this.windupTimer = this.effWindupMs;
            this.bot.showWindupCue(this.facingAngle, this.effWindupMs);
          }
          this.updateStuck(deltaMs, false);
        } else {
          this.seekTo(player.x, player.y, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        }
        break;
      }

      case 'seek': {
        this.bot.state = 'idle';
        const tx = intent.targetX ?? this.bot.x;
        const ty = intent.targetY ?? this.bot.y;
        if (Math.hypot(this.bot.x - tx, this.bot.y - ty) > BOT_BRAIN_CONFIG.investigateArriveRadius) {
          this.seekTo(tx, ty, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        } else {
          this.bot.body.setVelocity(0, 0); // scanning / arrived
          this.updateStuck(deltaMs, false);
        }
        break;
      }

      case 'patrol': {
        this.bot.state = 'idle';
        this.patrol(deltaMs);
        this.updateStuck(deltaMs, false);
        break;
      }

      case 'hold':
      default: {
        this.bot.state = 'idle';
        this.bot.body.setVelocity(0, 0);
        this.updateStuck(deltaMs, false);
        break;
      }
    }
  }

  /** Seek a world point, clamped so the bot is never unfairly faster than the player. */
  private seekTo(tx: number, ty: number, playerMoveSpeed: number): void {
    const angle = Math.atan2(ty - this.bot.y, tx - this.bot.x);
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(this.effMoveSpeed, cap);
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
    this.brain.onRespawn(now);
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
      this.attackRange,
      this.cfg.attackArcDegrees,
    );
    if (!arc.hit) return false;

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
      classId: this.bot.classId,
      state: this.bot.state,
      goal: this.brain.currentGoal(),
      dead: this.bot.isDead(),
      detectionRange: this.cfg.detectionRange,
      attackRange: this.attackRange,
      moveSpeed: this.effMoveSpeed,
      speed: Math.hypot(this.bot.body.velocity.x, this.bot.body.velocity.y),
      difficulty: this.difficulty,
      respawnDelayMs: this.cfg.respawnDelayMs,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
    };
  }

  public getBrainSnapshot(): BotBrainSnapshot {
    return this.brain.snapshot();
  }

  public getDifficultyInfo(): BotDifficultyInfo {
    return {
      difficulty: this.difficulty,
      available: Object.keys(BOT_PLAYER_DIFFICULTY_PROFILES) as BotDifficulty[],
      classId: this.cfg.classId,
      baseAttack: this.classStats.attack,
      effectiveAttack: this.effAttack,
      effectiveMoveSpeed: this.effMoveSpeed,
      effectiveWindupMs: this.effWindupMs,
      effectiveCooldownMs: this.effCooldownMs,
    };
  }

  /** Bot class baseline stats (read by value from the player class table). */
  public getClassBaseline(): HeroStats {
    return { ...this.classStats };
  }

  /** Debug-only difficulty swap for headless regression (not player-facing). */
  public debugSetDifficulty(difficulty: BotDifficulty): void {
    if (!BOT_PLAYER_DIFFICULTY_PROFILES[difficulty]) return;
    this.difficulty = difficulty;
    this.profile = BOT_PLAYER_DIFFICULTY_PROFILES[difficulty];
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
