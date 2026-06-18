import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../constants';
import { testMeleeArc } from '../combat/HitShapes';
import type { DamageResult } from '../types';
import type { Player } from '../entities/Player';
import { EnemyBot, type BotState } from '../entities/EnemyBot';
import { BOT_WARRIOR, type BotWarriorConfig } from '../data/bot-warrior';

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
}

export interface PlayerMeleeHitResult {
  result: DamageResult;
  x: number;
  y: number;
}

/**
 * Phase 5A-1 enemy bot AI — single Basic Red Warrior Bot.
 *
 * Drives the {@link EnemyBot} through a minimal state machine
 * (idle → chase → wind-up → attack → recovery → dead) using direct-seek
 * movement (no pathfinding). Damage to the player flows through the existing
 * `Player.takeDamage` / `CombatSystem` path — no player formula change. Bot
 * death does not end the match; only Gate/Core/timer rules do that.
 *
 * Scope guard (docs/phase-5a-bot-design.md §3): one bot, melee only, no
 * objective/Gate/Core AI, no skills, no projectiles, no respawn in MVP.
 */
export class BotSystem {
  public readonly bot: EnemyBot;

  private readonly scene: Phaser.Scene;
  private readonly hooks: BotSystemHooks;
  private readonly cfg: BotWarriorConfig;

  private facingAngle = 0;
  private windupTimer = 0;
  private recoveryTimer = 0;
  private cooldownTimer = 0;

  constructor(scene: Phaser.Scene, hooks: BotSystemHooks, cfg: BotWarriorConfig = BOT_WARRIOR) {
    this.scene = scene;
    this.hooks = hooks;
    this.cfg = cfg;

    this.bot = new EnemyBot(scene, cfg);
    // Register every bot world object so the fixed UI camera ignores them.
    this.scene.children.list
      .filter((o) => o.getData && (o.getData('enemyBot') || o.getData('botEnemyMarker') || o.getData('botHpBar') || o.getData('botAttackWarning')))
      .forEach((o) => this.hooks.registerWorldObject(o));
  }

  public update(deltaMs: number): void {
    this.bot.update();

    if (this.bot.isDead()) {
      this.bot.body.setVelocity(0, 0);
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
        this.bot.body.setVelocity(0, 0);
        if (dist <= this.cfg.detectionRange) {
          this.bot.state = 'chase';
        }
        break;

      case 'chase': {
        if (dist > this.cfg.leashRange) {
          this.bot.state = 'idle';
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
            this.windupTimer = this.cfg.windupMs;
            this.bot.showWindupCue(this.facingAngle);
          }
        } else {
          // Direct seek. Never faster than the player (defensive clamp).
          const speed = Math.min(this.cfg.moveSpeed, player.moveSpeed);
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
          this.resolveAttack(player, dist, angleToPlayer);
          this.bot.state = 'recovery';
          this.recoveryTimer = this.cfg.recoveryMs;
          this.cooldownTimer = this.cfg.attackCooldownMs;
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

  /** Damage resolves only if the player is still in the melee arc at the hit frame. */
  private resolveAttack(player: Player, _dist: number, _angleToPlayer: number): void {
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
    const result = player.takeDamage(this.cfg.attack);
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
      attack: this.cfg.attack,
      state: this.bot.state,
      dead: this.bot.isDead(),
      detectionRange: this.cfg.detectionRange,
      attackRange: this.cfg.attackRange,
      moveSpeed: this.cfg.moveSpeed,
      speed: Math.hypot(this.bot.body.velocity.x, this.bot.body.velocity.y),
    };
  }

  /** Debug-only damage hook for headless regression (not player-facing). */
  public debugDamageBot(amount: number): DamageResult {
    return this.bot.takeDamage(amount);
  }

  public destroy(): void {
    this.bot.destroy();
  }
}
