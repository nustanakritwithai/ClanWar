import Phaser from 'phaser';
import {
  COLORS,
  COMPACT_LAYOUT_HEIGHT,
  CURRENT_PHASE_LABEL,
  SCENE_KEYS,
  SHOW_DEBUG_OVERLAY,
} from '../constants';
import { smallTwinFortress } from '../data/map-small-twin-fortress';
import type { ActionKey, InputState, MapMarker } from '../types';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';
import { isFullscreenActive, requestGameFullscreen } from '../utils/fullscreen';

const ACTION_KEYS: ActionKey[] = [
  'attack',
  'skill1',
  'skill2',
  'skill3',
  'ultimate',
  'warAction',
  'item1',
  'item2',
];

const HUD_HINT_NORMAL =
  'WASD/Arrows or joystick • J/Q/E/R/F/Space/1/2 or buttons • ` or F1: debug';
const HUD_HINT_COMPACT = 'Move: joystick/WASD • Actions: buttons';

export class MatchScene extends Phaser.Scene {
  private player!: Player;
  private movement!: InputSystem;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private moveVec = new Phaser.Math.Vector2();

  private hintText!: Phaser.GameObjects.Text;
  private menuButton!: Phaser.GameObjects.Text;
  private fullscreenButton?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private debugOverlayVisible = SHOW_DEBUG_OVERLAY;
  private debugToggleHandler?: () => void;
  private fullscreenChangeHandler?: () => void;

  constructor() {
    super(SCENE_KEYS.Match);
  }

  create(): void {
    const map = smallTwinFortress;

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    this.drawGround(map.width, map.height);
    this.buildWalls();
    this.drawMarkers(map.markers);

    this.player = new Player(this, map.playerSpawn.x, map.playerSpawn.y);
    this.physics.add.collider(this.player.sprite, this.walls);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    const worldObjects = [...this.children.list];

    this.movement = new InputSystem(this);

    this.drawHud();
    this.setupDebugToggle();
    this.setupFullscreenButton();

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

    this.processActions();
    this.updateDebugOverlay();
  }

  private processActions(): void {
    const s = this.movement.state;

    for (const action of ACTION_KEYS) {
      const pressed = this.isActionPressed(s, action);
      if (!pressed) continue;

      this.player.playActionFeedback(action);
      this.movement.showButtonCooldown(action);
    }
  }

  private isActionPressed(s: InputState, action: ActionKey): boolean {
    switch (action) {
      case 'attack':
        return s.attackPressed;
      case 'skill1':
        return s.skill1Pressed;
      case 'skill2':
        return s.skill2Pressed;
      case 'skill3':
        return s.skill3Pressed;
      case 'ultimate':
        return s.ultimatePressed;
      case 'warAction':
        return s.warActionPressed;
      case 'item1':
        return s.item1Pressed;
      case 'item2':
        return s.item2Pressed;
    }
  }

  private setupDebugToggle(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    this.debugToggleHandler = () => {
      this.debugOverlayVisible = !this.debugOverlayVisible;
      if (this.debugText) {
        this.debugText.setVisible(this.debugOverlayVisible);
      }
    };

    kb.on('keydown-BACK_QUOTE', this.debugToggleHandler);
    kb.on('keydown-F1', this.debugToggleHandler);
  }

  private setupFullscreenButton(): void {
    this.fullscreenButton = this.add
      .text(0, 0, 'Fullscreen', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.fullscreenButton.on('pointerdown', async () => {
      await requestGameFullscreen();
      this.updateFullscreenButtonVisibility();
    });

    this.fullscreenChangeHandler = () => this.updateFullscreenButtonVisibility();
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);

    this.updateFullscreenButtonVisibility();
    this.layoutTopHud();
  }

  private updateFullscreenButtonVisibility(): void {
    if (!this.fullscreenButton) return;
    const active = isFullscreenActive();
    this.fullscreenButton.setVisible(!active);
    this.fullscreenButton.setActive(!active);
  }

  private handleShutdown(): void {
    this.scale.off('resize', this.handleResize, this);

    const kb = this.input.keyboard;
    if (kb && this.debugToggleHandler) {
      kb.off('keydown-BACK_QUOTE', this.debugToggleHandler);
      kb.off('keydown-F1', this.debugToggleHandler);
      this.debugToggleHandler = undefined;
    }

    if (this.fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
      document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = undefined;
    }

    this.movement.destroy();
  }

  private computeZoom(): number {
    const z = this.scale.width / 1500;
    return Phaser.Math.Clamp(z, 0.45, 1.1);
  }

  private isCompactHud(): boolean {
    return this.scale.height < COMPACT_LAYOUT_HEIGHT;
  }

  private layoutTopHud(): void {
    const { width } = this.scale;
    const compact = this.isCompactHud();
    const topMargin = compact ? 8 : 16;
    const rightMargin = compact ? 10 : 16;

    this.hintText.setPosition(topMargin, topMargin);
    this.hintText.setFontSize(compact ? '12px' : '16px');
    this.hintText.setText(compact ? HUD_HINT_COMPACT : HUD_HINT_NORMAL);

    this.menuButton.setPosition(width - rightMargin, topMargin);

    if (this.debugText) {
      this.debugText.setPosition(topMargin, compact ? 36 : 50);
      this.debugText.setFontSize(compact ? '11px' : '13px');
    }

    if (this.fullscreenButton) {
      // Sit left of Menu with a gap so they never overlap.
      const menuLeft = this.menuButton.x - this.menuButton.width;
      this.fullscreenButton.setPosition(menuLeft - 10, topMargin);
      this.fullscreenButton.setOrigin(1, 0);
    }
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.computeZoom());
    this.uiCamera.setSize(this.scale.width, this.scale.height);
    this.movement.handleResize();
    this.layoutTopHud();
  }

  private drawGround(w: number, h: number): void {
    this.add.rectangle(w / 2, h / 2, w, h, COLORS.ground).setDepth(-100);
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
    const compact = this.isCompactHud();

    this.hintText = this.add
      .text(16, 16, compact ? HUD_HINT_COMPACT : HUD_HINT_NORMAL, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '12px' : '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.menuButton = this.add
      .text(this.scale.width - 16, 16, '⮌ Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '14px' : '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.menuButton.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.Menu);
    });

    if (SHOW_DEBUG_OVERLAY) {
      this.debugText = this.add
        .text(16, compact ? 36 : 50, '', {
          fontFamily: 'monospace',
          fontSize: compact ? '11px' : '13px',
          color: COLORS.text,
          backgroundColor: '#00000066',
          padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);
      this.debugText.setVisible(this.debugOverlayVisible);
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugText || !this.debugOverlayVisible) return;
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
