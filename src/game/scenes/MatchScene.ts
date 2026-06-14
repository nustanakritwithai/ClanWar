import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';
import { smallTwinFortress } from '../data/map-small-twin-fortress';
import type { MapMarker } from '../types';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';

export class MatchScene extends Phaser.Scene {
  private player!: Player;
  private movement!: InputSystem;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private moveVec = new Phaser.Math.Vector2();

  constructor() {
    super(SCENE_KEYS.Match);
  }

  create(): void {
    const map = smallTwinFortress;

    // World + camera bounds match the full map (doc section 5.1).
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    this.drawGround(map.width, map.height);
    this.buildWalls();
    this.drawMarkers(map.markers);

    // Player placeholder at Blue Spawn.
    this.player = new Player(this, map.playerSpawn.x, map.playerSpawn.y);
    this.physics.add.collider(this.player.sprite, this.walls);

    // Camera: smooth follow, zoomed out a touch so a fight is readable.
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    // Movement input system (WASD + mobile joystick scaffold).
    this.movement = new InputSystem(this);

    this.drawHudHints();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  override update(): void {
    const dir = this.movement.getMoveVector(this.moveVec);
    this.player.move(dir);
    this.player.update();
  }

  private computeZoom(): number {
    // Show ~1500px of world width at minimum; clamp for readability. Mobile
    // (narrow) ends up slightly more zoomed out, matching doc section 5.1.
    const z = this.scale.width / 1500;
    return Phaser.Math.Clamp(z, 0.45, 1.1);
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.computeZoom());
  }

  private drawGround(w: number, h: number): void {
    this.add.rectangle(w / 2, h / 2, w, h, COLORS.ground).setDepth(-100);
    // Center line to read team sides at a glance.
    this.add
      .line(0, 0, 0, h / 2, w, h / 2, 0xffffff, 0.08)
      .setOrigin(0, 0)
      .setLineWidth(2)
      .setDepth(-90);
  }

  private buildWalls(): void {
    this.walls = this.physics.add.staticGroup();
    for (const wall of smallTwinFortress.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        COLORS.wall,
      );
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
    }
  }

  private drawMarkers(markers: MapMarker[]): void {
    for (const m of markers) {
      const color = this.markerColor(m);
      const circle = this.add.circle(m.x, m.y, m.radius, color, 0.35);
      circle.setStrokeStyle(3, color, 1);
      circle.setDepth(1);

      this.add
        .text(m.x, m.y, m.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: COLORS.text,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(2);
    }
  }

  private markerColor(m: MapMarker): number {
    if (m.team === 'blue') return COLORS.blue;
    if (m.team === 'red') return COLORS.red;
    if (m.type === 'siegeRuins' || m.type === 'gate' || m.type === 'core') return COLORS.gate;
    return COLORS.neutral;
  }

  private drawHudHints(): void {
    const cam = this.cameras.main;

    this.add
      .text(16, 16, 'WASD / Arrows to move • drag lower-left to move (touch)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    const back = this.add
      .text(cam.width - 16, 16, '⮌ Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }
}
