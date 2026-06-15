import Phaser from 'phaser';
import { segmentHitsCircle } from '../combat/HitShapes';
import { Projectile, type ProjectileHitEvent } from '../entities/Projectile';
import type { ProjectileSpawnConfig } from '../types';
import type { TrainingDummy } from '../entities/TrainingDummy';
import type { TeamId } from '../types';

export interface ProjectileObjectiveHit {
  objectiveId: string;
  x: number;
  y: number;
  damage: number;
  skillId: string;
  skillName: string;
  impactAoeRadius?: number;
}

export interface ProjectileSystemHooks {
  registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;
  onHit: (event: ProjectileHitEvent) => void;
  onObjectiveHit?: (event: ProjectileObjectiveHit) => void;
  onExpired: (skillName: string) => void;
  checkObjectiveSegment?: (
    ownerTeam: TeamId,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    hitRadius: number,
    damage: number,
    skillId: string,
  ) => boolean;
}

/** Spawns, updates, and cleans up skill projectiles for a match. */
export class ProjectileSystem {
  private scene: Phaser.Scene;
  private projectiles: Projectile[] = [];
  private hooks: ProjectileSystemHooks;
  private lastResult = '-';

  constructor(scene: Phaser.Scene, hooks: ProjectileSystemHooks) {
    this.scene = scene;
    this.hooks = hooks;
  }

  public spawn(config: ProjectileSpawnConfig): void {
    const projectile = new Projectile(this.scene, config);
    this.hooks.registerWorldObject(projectile.displayObject);
    this.projectiles.push(projectile);
    this.lastResult = `spawned ${config.skillName}`;
  }

  public update(deltaSeconds: number, dummy: TrainingDummy): void {
    const remaining: Projectile[] = [];

    for (const projectile of this.projectiles) {
      if (projectile.destroyed) continue;

      projectile.update(deltaSeconds);

      if (!projectile.destroyed) {
        const prev = projectile.getPreviousPosition();
        let hit = false;

        if (this.hooks.checkObjectiveSegment) {
          hit = this.hooks.checkObjectiveSegment(
            projectile.ownerTeam as TeamId,
            prev.x,
            prev.y,
            projectile.x,
            projectile.y,
            projectile.hitRadius,
            projectile.damage,
            projectile.skillId,
          );
          if (hit) {
            this.hooks.onObjectiveHit?.({
              objectiveId: 'objective',
              x: projectile.x,
              y: projectile.y,
              damage: projectile.damage,
              skillId: projectile.skillId,
              skillName: projectile.skillName,
              impactAoeRadius: projectile.impactAoeRadius,
            });
            this.lastResult = `${projectile.skillName} objective hit`;
            projectile.markDestroyed();
          }
        }

        if (!hit && dummy.canReceiveDamage()) {
          const hitRadius = projectile.hitRadius + dummy.radius;
          if (segmentHitsCircle(prev.x, prev.y, projectile.x, projectile.y, dummy.x, dummy.y, hitRadius)) {
            this.hooks.onHit({
              x: projectile.x,
              y: projectile.y,
              damage: projectile.damage,
              skillId: projectile.skillId,
              skillName: projectile.skillName,
              impactAoeRadius: projectile.impactAoeRadius,
            });
            this.lastResult = `${projectile.skillName} hit`;
            projectile.markDestroyed();
          }
        }
      }

      if (!projectile.destroyed && projectile.isBeyondMaxRange()) {
        this.lastResult = `${projectile.skillName} expired`;
        this.hooks.onExpired(projectile.skillName);
        projectile.markDestroyed();
      }

      if (!projectile.destroyed) {
        remaining.push(projectile);
      } else {
        projectile.destroy();
      }
    }

    this.projectiles = remaining;
  }

  public getActiveCount(): number {
    return this.projectiles.length;
  }

  public getLastResult(): string {
    return this.lastResult;
  }

  public destroy(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles = [];
    this.lastResult = '-';
  }
}
