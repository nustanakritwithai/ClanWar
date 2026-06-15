import Phaser from 'phaser';
import type { ProjectileSpawnConfig } from '../types';

const VISUALS: Record<ProjectileSpawnConfig['visual'], { radius: number; color: number }> = {
  arrow: { radius: 10, color: 0xfde68a },
  fireball: { radius: 14, color: 0xf97316 },
};

export interface ProjectileHitEvent {
  x: number;
  y: number;
  damage: number;
  skillId: string;
  skillName: string;
  impactAoeRadius?: number;
}

/** Moving skill projectile with swept hit detection. */
export class Projectile {
  public readonly skillId: string;
  public readonly skillName: string;
  public readonly ownerTeam: string;
  public readonly damage: number;
  public readonly maxRange: number;
  public readonly hitRadius: number;
  public readonly impactAoeRadius?: number;

  public x: number;
  public y: number;
  public traveledDistance = 0;
  public destroyed = false;

  private velocityX: number;
  private velocityY: number;
  private prevX: number;
  private prevY: number;
  private sprite: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, config: ProjectileSpawnConfig) {
    this.skillId = config.skillId;
    this.skillName = config.skillName;
    this.ownerTeam = config.ownerTeam;
    this.damage = config.damage;
    this.maxRange = config.maxRange;
    this.hitRadius = config.hitRadius;
    this.impactAoeRadius = config.impactAoeRadius;

    this.x = config.x;
    this.y = config.y;
    this.prevX = config.x;
    this.prevY = config.y;

    this.velocityX = Math.cos(config.angle) * config.speed;
    this.velocityY = Math.sin(config.angle) * config.speed;

    const visual = VISUALS[config.visual];
    this.sprite = scene.add
      .circle(config.x, config.y, visual.radius, visual.color, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(110);
    this.sprite.setRotation(config.angle);
  }

  public get displayObject(): Phaser.GameObjects.Arc {
    return this.sprite;
  }

  public update(deltaSeconds: number): void {
    if (this.destroyed) return;

    this.prevX = this.x;
    this.prevY = this.y;

    const stepX = this.velocityX * deltaSeconds;
    const stepY = this.velocityY * deltaSeconds;
    const stepDist = Math.hypot(stepX, stepY);

    this.x += stepX;
    this.y += stepY;
    this.traveledDistance += stepDist;
    this.sprite.setPosition(this.x, this.y);
  }

  public isBeyondMaxRange(): boolean {
    return this.traveledDistance >= this.maxRange;
  }

  public getPreviousPosition(): { x: number; y: number } {
    return { x: this.prevX, y: this.prevY };
  }

  public markDestroyed(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sprite.destroy();
  }

  public destroy(): void {
    this.markDestroyed();
  }
}
