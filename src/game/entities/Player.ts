import Phaser from 'phaser';
import { COLORS, PLAYER_MOVE_SPEED, PLAYER_RADIUS } from '../constants';

// Placeholder player: a colored circle with an arcade-physics body. Combat,
// stats and class identity are added in Phase 3+. For now it only moves.
export class Player {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;
  private facing: Phaser.GameObjects.Line;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.circle(x, y, PLAYER_RADIUS, COLORS.blue);
    this.sprite.setStrokeStyle(3, 0xffffff, 0.9);
    this.sprite.setDepth(100);

    // A short line indicating facing direction (last movement vector).
    this.facing = scene.add.line(0, 0, 0, 0, PLAYER_RADIUS + 14, 0, 0xffffff, 0.9);
    this.facing.setOrigin(0, 0);
    this.facing.setDepth(101);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(PLAYER_RADIUS);
    this.body.setCollideWorldBounds(true);
  }

  // direction is an already-normalized vector (or zero vector when idle).
  public move(direction: Phaser.Math.Vector2): void {
    this.body.setVelocity(direction.x * PLAYER_MOVE_SPEED, direction.y * PLAYER_MOVE_SPEED);

    if (direction.lengthSq() > 0) {
      const angle = direction.angle();
      this.facing.setRotation(angle);
    }
  }

  public update(): void {
    // Keep the facing indicator pinned to the player each frame.
    this.facing.setPosition(this.sprite.x, this.sprite.y);
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }
}
