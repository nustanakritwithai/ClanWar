import Phaser from 'phaser';
import { COLORS, CURRENT_PHASE_LABEL, SCENE_KEYS, SHOW_DEBUG_OVERLAY } from '../constants';
import { smallTwinFortress } from '../data/map-small-twin-fortress';
import type { MapMarker } from '../types';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';

export class MatchScene extends Phaser.Scene {
  private player!: Player;
  private movement!: InputSystem;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private moveVec = new Phaser.Math.Vector2();

  private menuButton!: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

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

    // Snapshot world objects before adding screen-fixed UI, so we can set up
    // a dedicated UI camera below (scrollFactor(0) hit-testing is unreliable
    // when the main camera is zoomed/scrolled, so UI lives on its own camera).
    const worldObjects = [...this.children.list];

    // Movement + action input (WASD/keys on desktop, joystick + buttons on touch).
    this.movement = new InputSystem(this);

    this.drawHud();

    // UI camera: fixed at zoom 1 / scroll (0,0), shows only screen-fixed UI.
    // The main camera ignores UI objects and the UI camera ignores world
    // objects, so each renders (and hit-tests) only its own layer.
    const uiObjects = this.children.list.filter((o) => !worldObjects.includes(o));
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.ignore(worldObjects);
    this.cameras.main.ignore(uiObjects);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  override update(): void {
    this.movement.update();

    const dir = this.movement.getMoveVector(this.moveVec);
    this.player.move(dir);
    this.player.update();

    this.updateDebugOverlay();
  }

  private handleShutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    this.movement.destroy();
  }

  private computeZoom(): number {
    // Show ~1500px of world width at minimum; clamp for readability. Mobile
    // (narrow) ends up slightly more zoomed out, matching doc section 5.1.
    const z = this.scale.width / 1500;
    return Phaser.Math.Clamp(z, 0.45, 1.1);
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.computeZoom());
    this.uiCamera.setSize(this.scale.width, this.scale.height);
    this.movement.handleResize();
    this.menuButton.setPosition(this.scale.width - 16, 16);
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

  private drawHud(): void {
    this.add
      .text(16, 16, 'WASD/Arrows or left joystick to move • J/Click/buttons for actions', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.menuButton = this.add
      .text(this.scale.width - 16, 16, '⮌ Menu', {
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
    this.menuButton.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.Menu);
    });

    if (SHOW_DEBUG_OVERLAY) {
      // Top-left, below the control hint — kept clear of the joystick and
      // gameplay center. Temporary for Phase 2; safe to remove later.
      this.debugText = this.add
        .text(16, 50, '', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: COLORS.text,
          backgroundColor: '#00000066',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugText) return;
    const s = this.movement.state;
    const move = `${s.moveX.toFixed(2)}, ${s.moveY.toFixed(2)}`;
    this.debugText.setText(
      [
        CURRENT_PHASE_LABEL,
        `input: ${s.inputMode}`,
        `move: ${move}`,
        `last: ${s.lastAction || '-'}`,
      ].join('\n'),
    );
  }
}
