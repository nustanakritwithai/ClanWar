import Phaser from 'phaser';
import type { CombatTarget, DamageResult } from '../types';
import { CombatSystem } from '../systems/CombatSystem';
import type { BotWarriorConfig } from '../data/bot-warrior';

/** Bot AI states. Visual-facing only — never shown as player copy. */
export type BotState = 'idle' | 'chase' | 'windup' | 'attack' | 'recovery' | 'dead';

const ENEMY_RED = 0xdc2626;
const ENEMY_RED_DARK = 0xb91c1c;
const ENEMY_OUTLINE = 0x0b0e13;
const WINDUP_TINT = 0xf59e0b; // amber telegraph
const ATTACK_TINT = 0xfca5a5;

// World depths stay in the 95–100 band: above ground/tiles, below the fixed
// HUD/UI camera layer (≥1000). No bot art ever covers mobile controls.
const DEPTH_FX = 94;
const DEPTH_BODY = 95;
const DEPTH_WARNING = 96;
const DEPTH_OVERHEAD = 97;

type RegisterFn = (obj: Phaser.GameObjects.GameObject) => void;

/**
 * Phase 5A-1 / 5A-2 Basic Red Warrior Bot — the first autonomous enemy.
 *
 * Owns its visuals (red enemy body, overhead enemy marker + HP bar, melee
 * wind-up warning arc, spawn/death feedback) and HP. It implements
 * {@link CombatTarget} so the player damages it through the existing
 * `CombatSystem.applyDamage` path — no change to the player damage formula. AI
 * transitions are driven by `BotSystem`; this class only renders state + HP.
 *
 * Phase 5A-2 polish: smooth HP-bar lerp, spawn ring + fade-in, clearer death
 * burst, pulsing wind-up telegraph, gentle marker bob. Fallback-first per
 * docs/phase-5a-bot-asset-plan.md: pure Phaser Graphics, no new game assets.
 */
export class EnemyBot implements CombatTarget {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly radius: number;

  public readonly maxHp: number;
  public currentHp: number;
  public readonly armor: number;

  public state: BotState = 'idle';

  private readonly scene: Phaser.Scene;
  private readonly cfg: BotWarriorConfig;
  private readonly register: RegisterFn;
  private readonly marker: Phaser.GameObjects.Triangle;
  private readonly nameTag: Phaser.GameObjects.Text;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly warning: Phaser.GameObjects.Graphics;
  private dead = false;
  private displayedHpRatio = 1;
  private bobPhase = 0;

  constructor(scene: Phaser.Scene, cfg: BotWarriorConfig, register: RegisterFn) {
    this.scene = scene;
    this.cfg = cfg;
    this.register = register;
    this.radius = cfg.radius;
    this.maxHp = cfg.maxHp;
    this.currentHp = cfg.maxHp;
    this.armor = cfg.armor;

    const { x, y } = cfg.spawn;

    // Red enemy body — the physics hitbox and the unmistakable enemy read
    // (player is blue). Strong red fill + dark outline = clearly hostile.
    this.sprite = scene.add.circle(x, y, cfg.radius, ENEMY_RED, 0.92);
    this.sprite.setStrokeStyle(3, ENEMY_OUTLINE, 0.95);
    this.sprite.setDepth(DEPTH_BODY);
    this.sprite.setData('enemyBot', true);
    register(this.sprite);

    // Overhead red enemy chevron — reinforces "this is an enemy" at a glance and
    // does not resemble the contested-capture or Siege Buff icons.
    this.marker = scene.add
      .triangle(x, y - cfg.radius - 22, 0, 0, 16, 0, 8, 13, ENEMY_RED)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setOrigin(0.5)
      .setDepth(DEPTH_OVERHEAD);
    this.marker.setData('botEnemyMarker', true);
    register(this.marker);

    this.nameTag = scene.add
      .text(x, y - cfg.radius - 36, cfg.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#fecaca',
        backgroundColor: '#7f1d1dcc',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_OVERHEAD);
    this.nameTag.setData('botEnemyMarker', true);
    register(this.nameTag);

    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(DEPTH_OVERHEAD);
    this.hpBar.setData('botHpBar', true);
    register(this.hpBar);

    this.warning = scene.add.graphics();
    this.warning.setDepth(DEPTH_WARNING);
    this.warning.setData('botAttackWarning', true);
    this.warning.setVisible(false);
    register(this.warning);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(cfg.radius);
    this.body.setCollideWorldBounds(true);

    this.redrawHpBar();
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }

  public isDead(): boolean {
    return this.dead;
  }

  public canReceiveDamage(): boolean {
    return !this.dead;
  }

  /** Apply player damage through the shared CombatSystem (player formula unchanged). */
  public takeDamage(rawDamage: number): DamageResult {
    if (this.dead) {
      return { rawDamage, finalDamage: 0, targetHpAfter: 0, killed: true };
    }

    const result = CombatSystem.applyDamage(this, rawDamage);
    this.flashBody(0xffffff, 90);

    if (result.killed) {
      this.die();
    }
    return result;
  }

  /**
   * Telegraph shown for the whole wind-up window so the player can react.
   * Brighter, thicker, and pulsing in 5A-2 for readability on mobile.
   */
  public showWindupCue(angle: number, windupMs: number): void {
    if (this.dead) return;
    this.warning.setVisible(true);
    this.warning.setAlpha(1);
    this.warning.clear();

    const half = Phaser.Math.DegToRad(this.cfg.attackArcDegrees) / 2;
    const r = this.cfg.attackRange + this.cfg.radius;
    const start = angle - half;
    const end = angle + half;

    this.warning.fillStyle(WINDUP_TINT, 0.24);
    this.warning.slice(this.x, this.y, r, start, end, false);
    this.warning.fillPath();
    this.warning.lineStyle(3, WINDUP_TINT, 0.95);
    this.warning.beginPath();
    this.warning.arc(this.x, this.y, r, start, end, false);
    this.warning.strokePath();

    // Pulse the telegraph so it clearly reads as "incoming".
    this.scene.tweens.killTweensOf(this.warning);
    this.scene.tweens.add({
      targets: this.warning,
      alpha: { from: 1, to: 0.45 },
      duration: Math.max(120, windupMs / 3),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.flashBody(WINDUP_TINT, windupMs);
  }

  public hideWindupCue(): void {
    this.scene.tweens.killTweensOf(this.warning);
    this.warning.setVisible(false);
    this.warning.setAlpha(1);
    this.warning.clear();
  }

  /** Brief impact flash the moment a swing resolves. */
  public showAttackFlash(): void {
    if (this.dead) return;
    this.flashBody(ATTACK_TINT, 140);
  }

  public update(deltaMs = 16): void {
    this.bobPhase += deltaMs / 1000;
    const bob = this.dead ? 0 : Math.sin(this.bobPhase * 4) * 2;
    const my = this.y - this.cfg.radius;
    this.marker.setPosition(this.x, my - 22 + bob);
    this.nameTag.setPosition(this.x, my - 36);

    // Smooth HP-bar drain toward the true ratio.
    const target = Phaser.Math.Clamp(this.currentHp / this.maxHp, 0, 1);
    const t = Phaser.Math.Clamp(deltaMs / 120, 0, 1);
    this.displayedHpRatio += (target - this.displayedHpRatio) * t;
    if (Math.abs(target - this.displayedHpRatio) < 0.005) this.displayedHpRatio = target;
    this.redrawHpBar();
  }

  private die(): void {
    this.dead = true;
    this.state = 'dead';
    this.body.setVelocity(0, 0);
    this.hideWindupCue();
    this.marker.setVisible(false);
    this.nameTag.setVisible(false);
    this.hpBar.setVisible(false);

    this.showDeathBurst();

    this.sprite.setFillStyle(ENEMY_RED_DARK, 0.6);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.12,
      duration: 360,
      ease: 'Cubic.easeOut',
    });
  }

  /** Expanding red ring + flash on death — clear "he's down" read. */
  private showDeathBurst(): void {
    const ring = this.scene.add.circle(this.x, this.y, this.cfg.radius * 0.8, ENEMY_RED, 0.0);
    ring.setStrokeStyle(4, ENEMY_RED, 0.9);
    ring.setDepth(DEPTH_FX);
    this.register(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Spawn ring + body fade-in on (re)spawn — clear "he's back" read. */
  public showSpawnFeedback(): void {
    const ring = this.scene.add.circle(this.x, this.y, this.cfg.radius * 2.2, ENEMY_RED, 0.0);
    ring.setStrokeStyle(4, ENEMY_RED, 0.85);
    ring.setDepth(DEPTH_FX);
    this.register(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 0.4,
      alpha: { from: 0.9, to: 0 },
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => ring.destroy(),
    });

    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(0);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.92,
      duration: 320,
      ease: 'Cubic.easeOut',
    });
  }

  private flashBody(color: number, durationMs: number): void {
    if (this.dead) return;
    this.sprite.setFillStyle(color, 0.95);
    this.scene.time.delayedCall(durationMs, () => {
      if (!this.dead) this.sprite.setFillStyle(ENEMY_RED, 0.92);
    });
  }

  private redrawHpBar(): void {
    if (this.dead) return;
    const w = 44;
    const h = 6;
    const x = this.x - w / 2;
    const y = this.y - this.cfg.radius - 16;
    const ratio = Phaser.Math.Clamp(this.displayedHpRatio, 0, 1);
    const fill = ratio > 0.5 ? ENEMY_RED : ratio > 0.25 ? 0xf97316 : 0xfca5a5;

    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(0x3f1d1d, 0.9);
    this.hpBar.fillRect(x, y, w, h);
    this.hpBar.fillStyle(fill, 0.95);
    this.hpBar.fillRect(x, y, w * ratio, h);
  }

  /** Restore to a live idle bot at spawn — HP, state, position, visuals. */
  public reset(): void {
    this.dead = false;
    this.state = 'idle';
    this.currentHp = this.maxHp;
    this.displayedHpRatio = 1;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(this.cfg.spawn.x, this.cfg.spawn.y);
    this.body.reset(this.cfg.spawn.x, this.cfg.spawn.y);
    this.sprite.setScale(1).setAlpha(0.92).setFillStyle(ENEMY_RED, 0.92);
    this.marker.setVisible(true);
    this.nameTag.setVisible(true);
    this.hpBar.setVisible(true);
    this.hideWindupCue();
    this.redrawHpBar();
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.warning);
    this.warning.destroy();
    this.hpBar.destroy();
    this.nameTag.destroy();
    this.marker.destroy();
    this.sprite.destroy();
  }
}
