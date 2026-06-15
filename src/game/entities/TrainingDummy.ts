import Phaser from 'phaser';
import { COLORS } from '../constants';
import type { DamageResult } from '../types';
import { CombatSystem } from '../systems/CombatSystem';

export const DUMMY_MAX_HP = 1000;
export const DUMMY_ARMOR = 10;
export const DUMMY_RADIUS = 28;
export const DUMMY_RESET_DELAY_MS = 2000;

/** Stationary training target for Phase 3B-A combat testing. */
export class TrainingDummy {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly radius = DUMMY_RADIUS;

  public readonly maxHp = DUMMY_MAX_HP;
  public currentHp = DUMMY_MAX_HP;
  public readonly armor = DUMMY_ARMOR;

  private scene: Phaser.Scene;
  private hpLabel: Phaser.GameObjects.Text;
  private dead = false;
  private resetTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.add.circle(x, y, DUMMY_RADIUS, COLORS.red, 0.85);
    this.sprite.setStrokeStyle(3, 0xffffff, 0.8);
    this.sprite.setDepth(95);

    scene.add
      .text(x, y, 'DUMMY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setDepth(96);

    this.hpLabel = scene.add
      .text(x, y - DUMMY_RADIUS - 14, this.hpText(), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLORS.text,
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(97);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(DUMMY_RADIUS);
    this.body.setImmovable(true);
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }

  public update(): void {
    this.hpLabel.setPosition(this.sprite.x, this.sprite.y - DUMMY_RADIUS - 14);
    this.hpLabel.setText(this.hpText());
  }

  public canReceiveDamage(): boolean {
    return !this.dead;
  }

  public isDead(): boolean {
    return this.dead;
  }

  public takeDamage(rawDamage: number): DamageResult {
    if (this.dead) {
      return {
        rawDamage,
        finalDamage: 0,
        targetHpAfter: 0,
        killed: true,
      };
    }

    const result = CombatSystem.applyDamage(this, rawDamage);
    this.refreshVisual();

    if (result.killed) {
      this.dead = true;
      this.sprite.setAlpha(0.35);
      this.resetTimer?.remove(false);
      this.resetTimer = this.scene.time.delayedCall(DUMMY_RESET_DELAY_MS, () => this.reset());
    }

    return result;
  }

  public reset(): void {
    this.resetTimer?.remove(false);
    this.resetTimer = undefined;
    this.dead = false;
    this.currentHp = this.maxHp;
    this.sprite.setAlpha(1);
    this.sprite.setFillStyle(COLORS.red, 0.85);
    this.hpLabel.setText(this.hpText());
  }

  private refreshVisual(): void {
    this.hpLabel.setText(this.hpText());
    const ratio = this.currentHp / this.maxHp;
    const color = ratio > 0.5 ? COLORS.red : ratio > 0.25 ? 0xf97316 : 0xdc2626;
    this.sprite.setFillStyle(color, 0.85);
  }

  private hpText(): string {
    return `Dummy ${Math.ceil(this.currentHp)}/${this.maxHp}`;
  }
}
