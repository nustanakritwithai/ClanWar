import Phaser from 'phaser';
import { COLORS, MANA_REGEN_PER_SECOND, PLAYER_RADIUS } from '../constants';
import { CombatSystem } from '../systems/CombatSystem';
import type { ActionKey, DamageResult, HeroClassId, HeroDefinition } from '../types';

const ACTION_FLASH: Record<ActionKey, { color: number; duration: number; scale?: number }> = {
  attack: { color: 0xffffff, duration: 120 },
  skill1: { color: 0x60a5fa, duration: 150 },
  skill2: { color: 0x4ade80, duration: 150 },
  skill3: { color: 0xa78bfa, duration: 150 },
  ultimate: { color: 0xfbbf24, duration: 220, scale: 1.35 },
  warAction: { color: 0x94a3b8, duration: 200 },
  item1: { color: 0xf472b6, duration: 100 },
  item2: { color: 0x38bdf8, duration: 100 },
};

// Phase 3A+: hero stats at runtime; Phase 3B-A adds heal/takeDamage foundation.
export class Player {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;

  public readonly heroClass: HeroClassId;
  public readonly heroName: string;
  public readonly maxHp: number;
  public currentHp: number;
  public readonly maxMana: number;
  public currentMana: number;
  public readonly attack: number;
  public readonly armor: number;
  public readonly moveSpeed: number;
  public readonly attackRange: number;
  public readonly magicPower?: number;
  public readonly gateDamageBonus?: number;

  private scene: Phaser.Scene;
  private facing: Phaser.GameObjects.Line;
  private facingAngle = 0;
  private baseFillColor = COLORS.blue;

  constructor(scene: Phaser.Scene, x: number, y: number, hero: HeroDefinition) {
    this.scene = scene;
    const stats = hero.stats;

    this.heroClass = hero.id;
    this.heroName = hero.name;
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.maxMana = stats.mana;
    this.currentMana = stats.mana;
    this.attack = stats.attack;
    this.armor = stats.armor;
    this.moveSpeed = stats.moveSpeed;
    this.attackRange = stats.attackRange;
    this.magicPower = stats.magicPower;
    this.gateDamageBonus = stats.gateDamageBonus;

    this.sprite = scene.add.circle(x, y, PLAYER_RADIUS, COLORS.blue);
    this.sprite.setStrokeStyle(3, 0xffffff, 0.9);
    this.sprite.setDepth(100);

    this.facing = scene.add.line(0, 0, 0, 0, PLAYER_RADIUS + 14, 0, 0xffffff, 0.9);
    this.facing.setOrigin(0, 0);
    this.facing.setDepth(101);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(PLAYER_RADIUS);
    this.body.setCollideWorldBounds(true);
  }

  public move(direction: Phaser.Math.Vector2): void {
    this.body.setVelocity(direction.x * this.moveSpeed, direction.y * this.moveSpeed);

    if (direction.lengthSq() > 0) {
      this.facingAngle = direction.angle();
      this.facing.setRotation(this.facingAngle);
    }
  }

  public update(): void {
    this.facing.setPosition(this.sprite.x, this.sprite.y);
  }

  public getFacingAngle(): number {
    return this.facingAngle;
  }

  public canSpendMana(amount: number): boolean {
    return this.currentMana >= amount;
  }

  public spendMana(amount: number): boolean {
    if (!this.canSpendMana(amount)) return false;
    this.currentMana -= amount;
    return true;
  }

  public regenerateMana(deltaSeconds: number): void {
    if (this.currentMana >= this.maxMana) return;
    this.currentMana = Math.min(this.maxMana, this.currentMana + MANA_REGEN_PER_SECOND * deltaSeconds);
  }

  public heal(amount: number): number {
    const before = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    return this.currentHp - before;
  }

  public takeDamage(rawDamage: number): DamageResult {
    return CombatSystem.applyDamage(this, rawDamage);
  }

  public playDeniedFeedback(reason: 'mana' | 'cooldown'): void {
    const label = reason === 'mana' ? 'NO MANA' : 'CD';
    const flash = this.scene.add
      .text(this.sprite.x, this.sprite.y - PLAYER_RADIUS - 16, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#dc2626cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(103);

    this.sprite.setFillStyle(0xef4444, 0.9);
    this.scene.time.delayedCall(120, () => this.sprite.setFillStyle(this.baseFillColor, 1));

    this.scene.tweens.add({
      targets: flash,
      y: flash.y - 14,
      alpha: 0,
      duration: 280,
      onComplete: () => flash.destroy(),
    });
  }

  public playActionFeedback(action: ActionKey): void {
    const spec = ACTION_FLASH[action];

    if (action === 'warAction') {
      this.showWarActionRing();
      return;
    }

    if (action === 'item1' || action === 'item2') {
      this.showItemPing(action, spec.color);
      return;
    }

    this.flashBody(spec.color, spec.duration, spec.scale ?? 1.12);
    this.showDirectionIndicator(action, spec.color);
  }

  private flashBody(color: number, duration: number, peakScale: number): void {
    this.scene.tweens.killTweensOf(this.sprite);

    this.sprite.setFillStyle(color, 1);
    this.sprite.setScale(1);

    this.scene.tweens.add({
      targets: this.sprite,
      scale: peakScale,
      duration: duration * 0.45,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.sprite.setFillStyle(this.baseFillColor, 1);
        this.sprite.setScale(1);
      },
    });
  }

  private showWarActionRing(): void {
    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, PLAYER_RADIUS + 18, 0x94a3b8, 0.25);
    ring.setStrokeStyle(3, 0xe2e8f0, 0.85);
    ring.setDepth(99);

    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.55,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private showItemPing(action: ActionKey, color: number): void {
    const label = action === 'item1' ? 'I1' : 'I2';
    const icon = this.scene.add
      .text(this.sprite.x, this.sprite.y - PLAYER_RADIUS - 10, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: `#${color.toString(16).padStart(6, '0')}cc`,
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(103);

    this.sprite.setFillStyle(color, 0.85);
    this.scene.time.delayedCall(90, () => this.sprite.setFillStyle(this.baseFillColor, 1));

    this.scene.tweens.add({
      targets: icon,
      y: icon.y - 18,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => icon.destroy(),
    });
  }

  private showDirectionIndicator(action: ActionKey, color: number): void {
    const angle = this.facingAngle;
    const cx = this.sprite.x;
    const cy = this.sprite.y;
    const gfx = this.scene.add.graphics();
    gfx.setDepth(98);

    const isAttack = action === 'attack';
    const arcSpan = isAttack ? Phaser.Math.DegToRad(50) : Phaser.Math.DegToRad(70);
    const innerR = PLAYER_RADIUS + 8;
    const outerR = isAttack ? PLAYER_RADIUS + 36 : PLAYER_RADIUS + 48;
    const start = angle - arcSpan / 2;
    const end = angle + arcSpan / 2;

    gfx.lineStyle(isAttack ? 3 : 2, color, 0.9);
    gfx.beginPath();
    gfx.arc(cx, cy, (innerR + outerR) / 2, start, end, false);
    gfx.strokePath();

    if (!isAttack) {
      const tipX = cx + Math.cos(angle) * outerR;
      const tipY = cy + Math.sin(angle) * outerR;
      gfx.lineStyle(2, color, 0.75);
      gfx.lineBetween(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR, tipX, tipY);
    }

    const lifetime = isAttack ? 180 : 240;
    this.scene.time.delayedCall(lifetime, () => gfx.destroy());
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }
}
