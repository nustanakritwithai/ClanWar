import Phaser from 'phaser';
import type { CombatTarget, DamageResult, HeroClassId } from '../types';
import { CombatSystem } from '../systems/CombatSystem';
import { resolvePhase4eCharacterTexture } from '../theme/Phase4ETheme';

/** Bot AI states. Visual-facing only — never shown as player copy. */
export type BotState = 'idle' | 'chase' | 'windup' | 'attack' | 'recovery' | 'dead';

const ENEMY_RED = 0xdc2626;
const ENEMY_RED_DARK = 0xb91c1c;
const ENEMY_OUTLINE = 0x0b0e13;
const ENEMY_TINT = 0xff5a5a; // red tint for the class sprite — keeps silhouette, reads hostile
const WINDUP_TINT = 0xf59e0b; // amber telegraph
const ATTACK_TINT = 0xfca5a5;

// World depths stay in the 95–100 band: above ground/tiles, below the fixed
// HUD/UI camera layer (≥1000). No bot art ever covers mobile controls.
const DEPTH_FX = 94;
const DEPTH_BODY = 95;
const DEPTH_VISUAL = 96;
const DEPTH_WARNING = 96;
const DEPTH_OVERHEAD = 97;

type RegisterFn = (obj: Phaser.GameObjects.GameObject) => void;

/** Concrete per-instance stats resolved from the player class + difficulty. */
export interface BotPlayerEntityStats {
  classId: HeroClassId;
  name: string;
  maxHp: number;
  armor: number;
  radius: number;
  attackRange: number;
  attackArcDegrees: number;
  spawn: { x: number; y: number };
}

/**
 * Phase 5A-4 BotPlayer — an AI-controlled *player*, not a monster.
 *
 * Built from a playable class identity (Warrior for 5A-4): it wears the same
 * class sprite the human player uses (via {@link resolvePhase4eCharacterTexture})
 * with an enemy-side red treatment (red tint + red body ring + enemy marker +
 * HP bar), and takes damage through the shared `CombatSystem.applyDamage` path.
 * AI transitions are driven by `BotPlayerSystem`; this class only renders state
 * + HP.
 *
 * Evolved from the 5A-1/5A-2 `EnemyBot` (kept as a compatibility alias). Visual
 * data-tags (`enemyBot`, `botEnemyMarker`, `botHpBar`, `botAttackWarning`) are
 * preserved so prior bot regressions keep working.
 */
export class BotPlayer implements CombatTarget {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly radius: number;
  public readonly classId: HeroClassId;

  public readonly maxHp: number;
  public currentHp: number;
  public readonly armor: number;

  public state: BotState = 'idle';

  /** Class sprite (warrior idle) tinted red — present when the theme texture exists. */
  public visualSprite?: Phaser.GameObjects.Image;

  private readonly scene: Phaser.Scene;
  private readonly register: RegisterFn;
  private readonly attackRange: number;
  private readonly attackArcDegrees: number;
  private readonly spawn: { x: number; y: number };
  private readonly marker: Phaser.GameObjects.Triangle;
  private readonly nameTag: Phaser.GameObjects.Text;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly warning: Phaser.GameObjects.Graphics;
  private readonly displaySize: number;
  private dead = false;
  private displayedHpRatio = 1;
  private bobPhase = 0;

  constructor(scene: Phaser.Scene, stats: BotPlayerEntityStats, register: RegisterFn) {
    this.scene = scene;
    this.register = register;
    this.classId = stats.classId;
    this.radius = stats.radius;
    this.maxHp = stats.maxHp;
    this.currentHp = stats.maxHp;
    this.armor = stats.armor;
    this.attackRange = stats.attackRange;
    this.attackArcDegrees = stats.attackArcDegrees;
    this.spawn = { x: stats.spawn.x, y: stats.spawn.y };
    this.displaySize = stats.radius * 2.2;

    const { x, y } = stats.spawn;

    // Red enemy body — the physics hitbox and an unmistakable red read. Remains
    // the `enemyBot`-tagged object (red fillColor) for prior regression hooks.
    this.sprite = scene.add.circle(x, y, stats.radius, ENEMY_RED, 0.92);
    this.sprite.setStrokeStyle(3, ENEMY_OUTLINE, 0.95);
    this.sprite.setDepth(DEPTH_BODY);
    this.sprite.setData('enemyBot', true);
    register(this.sprite);

    // Class identity: the same Warrior sprite the human player uses, tinted red
    // so it reads as an enemy Warrior — not a monster, not the blue player.
    const texture = resolvePhase4eCharacterTexture(scene, stats.classId);
    if (texture) {
      this.visualSprite = scene.add
        .image(x, y, texture)
        .setDisplaySize(this.displaySize, this.displaySize)
        .setDepth(DEPTH_VISUAL)
        .setTint(ENEMY_TINT);
      this.visualSprite.setData('botClassVisual', true);
      register(this.visualSprite);
      // Keep the body as a thin red ring behind the sprite (still the hitbox).
      this.sprite.setFillStyle(ENEMY_RED, 0.28);
    }

    // Overhead red enemy chevron + name tag — reinforce the enemy read.
    this.marker = scene.add
      .triangle(x, y - stats.radius - 22, 0, 0, 16, 0, 8, 13, ENEMY_RED)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setOrigin(0.5)
      .setDepth(DEPTH_OVERHEAD);
    this.marker.setData('botEnemyMarker', true);
    register(this.marker);

    this.nameTag = scene.add
      .text(x, y - stats.radius - 36, stats.name, {
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
    this.body.setCircle(stats.radius);
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

  public hasCharacterVisual(): boolean {
    return !!this.visualSprite?.visible;
  }

  public getCharacterVisualTextureKey(): string | undefined {
    return this.visualSprite?.texture?.key;
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

  /** Telegraph shown for the whole wind-up window so the player can react. */
  public showWindupCue(angle: number, windupMs: number): void {
    if (this.dead) return;
    this.warning.setVisible(true);
    this.warning.setAlpha(1);
    this.warning.clear();

    const half = Phaser.Math.DegToRad(this.attackArcDegrees) / 2;
    const r = this.attackRange + this.radius;
    const start = angle - half;
    const end = angle + half;

    this.warning.fillStyle(WINDUP_TINT, 0.24);
    this.warning.slice(this.x, this.y, r, start, end, false);
    this.warning.fillPath();
    this.warning.lineStyle(3, WINDUP_TINT, 0.95);
    this.warning.beginPath();
    this.warning.arc(this.x, this.y, r, start, end, false);
    this.warning.strokePath();

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
    const my = this.y - this.radius;
    this.marker.setPosition(this.x, my - 22 + bob);
    this.nameTag.setPosition(this.x, my - 36);
    if (this.visualSprite) this.visualSprite.setPosition(this.x, this.y);

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

    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.12,
      duration: 360,
      ease: 'Cubic.easeOut',
    });
    if (this.visualSprite) {
      this.visualSprite.setTint(ENEMY_RED_DARK);
      this.scene.tweens.killTweensOf(this.visualSprite);
      this.scene.tweens.add({
        targets: this.visualSprite,
        alpha: 0.12,
        duration: 360,
        ease: 'Cubic.easeOut',
      });
    }
  }

  private showDeathBurst(): void {
    const ring = this.scene.add.circle(this.x, this.y, this.radius * 0.8, ENEMY_RED, 0.0);
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

  /** Spawn ring + fade-in on (re)spawn — clear "he's back" read. */
  public showSpawnFeedback(): void {
    const ring = this.scene.add.circle(this.x, this.y, this.radius * 2.2, ENEMY_RED, 0.0);
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

    const bodyAlpha = this.visualSprite ? 0.28 : 0.92;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(0);
    this.scene.tweens.add({ targets: this.sprite, alpha: bodyAlpha, duration: 320, ease: 'Cubic.easeOut' });
    if (this.visualSprite) {
      this.scene.tweens.killTweensOf(this.visualSprite);
      this.visualSprite.setAlpha(0);
      this.scene.tweens.add({ targets: this.visualSprite, alpha: 1, duration: 320, ease: 'Cubic.easeOut' });
    }
  }

  private flashBody(color: number, durationMs: number): void {
    if (this.dead) return;
    if (this.visualSprite) {
      this.visualSprite.setTint(color);
      this.scene.time.delayedCall(durationMs, () => {
        if (!this.dead) this.visualSprite?.setTint(ENEMY_TINT);
      });
      return;
    }
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
    const y = this.y - this.radius - 16;
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
    this.sprite.setPosition(this.spawn.x, this.spawn.y);
    this.body.reset(this.spawn.x, this.spawn.y);
    const bodyAlpha = this.visualSprite ? 0.28 : 0.92;
    this.sprite.setScale(1).setAlpha(bodyAlpha).setFillStyle(ENEMY_RED, this.visualSprite ? 0.28 : 0.92);
    if (this.visualSprite) {
      this.scene.tweens.killTweensOf(this.visualSprite);
      this.visualSprite.setPosition(this.spawn.x, this.spawn.y).setAlpha(1).setTint(ENEMY_TINT);
    }
    this.marker.setVisible(true);
    this.nameTag.setVisible(true);
    this.hpBar.setVisible(true);
    this.hideWindupCue();
    this.redrawHpBar();
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.warning);
    if (this.visualSprite) this.scene.tweens.killTweensOf(this.visualSprite);
    this.warning.destroy();
    this.hpBar.destroy();
    this.nameTag.destroy();
    this.marker.destroy();
    this.visualSprite?.destroy();
    this.sprite.destroy();
  }
}
