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
 * Phase 5A-1 / 5A-2 enemy bot AI — single Basic Red Warrior Bot.
 *
 * Drives the {@link EnemyBot} through a minimal state machine
 * (idle/patrol → chase → wind-up → attack → recovery → dead → respawn) using
 * direct-seek movement (no pathfinding). Damage to the player flows through the
 * existing `Player.takeDamage` / `CombatSystem` path — no player formula change.
 * Bot death does not end the match; only Gate/Core/timer rules do that.
 *
 * Phase 5A-2 adds: config-driven respawn, a short idle patrol around the spawn
 * anchor, and an `easy | normal | hard` difficulty knob (default `normal`) that
 * scales ONLY bot stats. Scope guard (docs/phase-5a-bot-design.md §3): one bot,
 * melee only, no objective/Gate/Core AI, no skills, no projectiles, no multi-bot.
 */
export class BotSystem {
  public readonly bot: EnemyBot;

  private readonly hooks: BotSystemHooks;
  private readonly cfg: BotWarriorConfig;

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

  constructor(
    scene: Phaser.Scene,
    hooks: BotSystemHooks,
    cfg: BotWarriorConfig = BOT_WARRIOR,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
  ) {
    this.hooks = hooks;
    this.cfg = cfg;
    this.difficulty = difficulty;
    this.profile = BOT_DIFFICULTY_PROFILES[difficulty];

    this.bot = new EnemyBot(scene, cfg, (o) => this.hooks.registerWorldObject(o));
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

    if (this.bot.isDead()) {
      this.bot.body.setVelocity(0, 0);
      // Arm the respawn countdown once, then tick it only while the match runs.
      if (!this.respawnArmed) {
        this.respawnTimer = this.cfg.respawnDelayMs;
        this.respawnArmed = true;
      }
      if (this.hooks.isMatchActive()) {
        this.respawnTimer -= deltaMs;
        if (this.respawnTimer <= 0) this.respawnBot();
      }
      return;
    }

    if (!this.hooks.isMatchActive()) {
      this.bot.body.setVelocity(0, 0);
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaMs);

    const player = this.hooks.getPlayer();
    const dx = player.x - this.bot.x;
    const dy = player.y - this.bot.y;
    const dist = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);

    switch (this.bot.state) {
      case 'idle':
        if (dist <= this.cfg.detectionRange) {
          this.bot.state = 'chase';
          break;
        }
        this.patrol(deltaMs);
        break;

      case 'chase': {
        if (dist > this.cfg.leashRange) {
          // Lost aggro — saunter back toward the spawn anchor and idle.
          this.bot.state = 'idle';
          this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
          this.patrolPauseTimer = 0;
          this.bot.body.setVelocity(0, 0);
          break;
        }
        if (dist <= this.cfg.attackRange) {
          // In range: stop and hold. Swing only when the cooldown is ready,
          // which gives the player a counter-attack window between swings.
          this.bot.body.setVelocity(0, 0);
          this.facingAngle = angleToPlayer;
          if (this.cooldownTimer <= 0) {
            this.bot.state = 'windup';
            this.windupTimer = this.effWindupMs;
            this.bot.showWindupCue(this.facingAngle, this.effWindupMs);
          }
        } else {
          // Direct seek. Clamp so the bot is never unfairly faster than the
          // player (per-difficulty cap; even "hard" stays close to fair).
          const cap = player.moveSpeed * this.profile.maxPlayerSpeedRatio;
          const speed = Math.min(this.effMoveSpeed, cap);
          this.bot.body.setVelocity(Math.cos(angleToPlayer) * speed, Math.sin(angleToPlayer) * speed);
          this.facingAngle = angleToPlayer;
        }
        break;
      }

      case 'windup':
        this.bot.body.setVelocity(0, 0);
        this.windupTimer -= deltaMs;
        if (this.windupTimer <= 0) {
          this.bot.hideWindupCue();
          this.resolveAttack(player);
          this.bot.state = 'recovery';
          this.recoveryTimer = this.cfg.recoveryMs;
          this.cooldownTimer = this.effCooldownMs;
        }
        break;

      case 'recovery':
        this.bot.body.setVelocity(0, 0);
        this.recoveryTimer -= deltaMs;
        if (this.recoveryTimer <= 0) {
          this.bot.state = dist <= this.cfg.detectionRange ? 'chase' : 'idle';
        }
        break;

      case 'attack':
        // Transient — resolution happens inline at wind-up end.
        this.bot.state = 'recovery';
        break;

      case 'dead':
        this.bot.body.setVelocity(0, 0);
        break;
    }
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

    // Stray guard — if pushed far from spawn (e.g. nudged a wall), head home.
    const spawnDist = Math.hypot(this.bot.x - this.cfg.spawn.x, this.bot.y - this.cfg.spawn.y);
    if (spawnDist > this.cfg.patrolRadius * 1.6) {
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
    }

    // Stuck guard — barely moved while trying to walk → repath to spawn + pause.
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
  }

  private respawnBot(): void {
    this.bot.reset();
    this.bot.showSpawnFeedback();
    this.respawnArmed = false;
    this.windupTimer = 0;
    this.recoveryTimer = 0;
    this.cooldownTimer = 0;
    this.resetPatrol();
  }

  /** Damage resolves only if the player is still in the melee arc at the hit frame. */
  private resolveAttack(player: Player): void {
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
    if (!arc.hit) return; // player dodged out during wind-up

    this.bot.showAttackFlash();
    const result = player.takeDamage(this.effAttack);
    this.hooks.onBotHitPlayer(result, player.x, player.y);
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

  public destroy(): void {
    this.bot.destroy();
  }
}
