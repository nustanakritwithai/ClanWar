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
const DEPTH_BODY = 95;
const DEPTH_WARNING = 96;
const DEPTH_OVERHEAD = 97;

/**
 * Phase 5A-1 Basic Red Warrior Bot — the first autonomous enemy.
 *
 * Owns its visuals (red enemy body, overhead enemy marker + HP bar, melee
 * wind-up warning arc) and HP. It implements {@link CombatTarget} so the player
 * damages it through the existing `CombatSystem.applyDamage` path — no change to
 * the player damage formula. AI transitions are driven by `BotSystem`; this
 * class only renders the current state and resolves HP.
 *
 * Fallback-first per docs/phase-5a-bot-asset-plan.md: pure Phaser Graphics, no
 * new game assets. Themed art can swap in later without touching the AI.
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
  private readonly marker: Phaser.GameObjects.Triangle;
  private readonly nameTag: Phaser.GameObjects.Text;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly warning: Phaser.GameObjects.Graphics;
  private dead = false;

  constructor(scene: Phaser.Scene, cfg: BotWarriorConfig) {
    this.scene = scene;
    this.cfg = cfg;
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

    // Overhead red enemy chevron — reinforces "this is an enemy" at a glance and
    // does not resemble the contested-capture or Siege Buff icons.
    this.marker = scene.add
      .triangle(x, y - cfg.radius - 22, 0, 0, 14, 0, 7, 12, ENEMY_RED)
      .setStrokeStyle(2, ENEMY_OUTLINE, 0.9)
      .setOrigin(0.5)
      .setDepth(DEPTH_OVERHEAD);
    this.marker.setData('botEnemyMarker', true);

    this.nameTag = scene.add
      .text(x, y - cfg.radius - 34, cfg.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#fecaca',
        backgroundColor: '#7f1d1dcc',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_OVERHEAD);
    this.nameTag.setData('botEnemyMarker', true);

    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(DEPTH_OVERHEAD);
    this.hpBar.setData('botHpBar', true);

    this.warning = scene.add.graphics();
    this.warning.setDepth(DEPTH_WARNING);
    this.warning.setData('botAttackWarning', true);
    this.warning.setVisible(false);

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
    this.redrawHpBar();
    this.flashBody(0xffffff, 90);

    if (result.killed) {
      this.die();
    }
    return result;
  }

  /** Telegraph shown for the whole wind-up window so the player can react. */
  public showWindupCue(angle: number): void {
    if (this.dead) return;
    this.warning.setVisible(true);
    this.warning.clear();

    const half = Phaser.Math.DegToRad(this.cfg.attackArcDegrees) / 2;
    const r = this.cfg.attackRange + this.cfg.radius;
    const start = angle - half;
    const end = angle + half;

    this.warning.fillStyle(WINDUP_TINT, 0.18);
    this.warning.slice(this.x, this.y, r, start, end, false);
    this.warning.fillPath();
    this.warning.lineStyle(2, WINDUP_TINT, 0.85);
    this.warning.beginPath();
    this.warning.arc(this.x, this.y, r, start, end, false);
    this.warning.strokePath();

    this.flashBody(WINDUP_TINT, this.cfg.windupMs);
  }

  public hideWindupCue(): void {
    this.warning.setVisible(false);
    this.warning.clear();
  }

  /** Brief impact flash the moment a swing resolves. */
  public showAttackFlash(): void {
    if (this.dead) return;
    this.flashBody(ATTACK_TINT, 140);
  }

  public update(): void {
    const my = this.y - this.cfg.radius;
    this.marker.setPosition(this.x, my - 22);
    this.nameTag.setPosition(this.x, my - 34);
    this.redrawHpBar();
    if (this.warning.visible) {
      // Keep the telegraph anchored to the (stationary during wind-up) body.
      // Re-slice is cheap and avoids drift if the body nudges on a wall.
    }
  }

  private die(): void {
    this.dead = true;
    this.state = 'dead';
    this.body.setVelocity(0, 0);
    this.hideWindupCue();
    this.sprite.setAlpha(0.3);
    this.sprite.setFillStyle(ENEMY_RED_DARK, 0.45);
    this.marker.setVisible(false);
    this.nameTag.setVisible(false);
    this.hpBar.setVisible(false);

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.18,
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
    const ratio = Phaser.Math.Clamp(this.currentHp / this.maxHp, 0, 1);
    const fill = ratio > 0.5 ? ENEMY_RED : ratio > 0.25 ? 0xf97316 : 0xfca5a5;

    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(0x3f1d1d, 0.9);
    this.hpBar.fillRect(x, y, w, h);
    this.hpBar.fillStyle(fill, 0.95);
    this.hpBar.fillRect(x, y, w * ratio, h);
  }

  /** Restore to a live idle bot at spawn (debug / future respawn — not auto-called). */
  public reset(): void {
    this.dead = false;
    this.state = 'idle';
    this.currentHp = this.maxHp;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(this.cfg.spawn.x, this.cfg.spawn.y);
    this.body.reset(this.cfg.spawn.x, this.cfg.spawn.y);
    this.sprite.setScale(1).setAlpha(1).setFillStyle(ENEMY_RED, 0.92);
    this.marker.setVisible(true);
    this.nameTag.setVisible(true);
    this.hpBar.setVisible(true);
    this.hideWindupCue();
    this.redrawHpBar();
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.warning.destroy();
    this.hpBar.destroy();
    this.nameTag.destroy();
    this.marker.destroy();
    this.sprite.destroy();
  }
}
