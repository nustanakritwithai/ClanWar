import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Menu);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add
      .text(cx, height * 0.3, 'CLAN SIEGE ARENA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, height * 0.3 + 50, 'Small Twin Fortress — MVP Prototype', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#9ca3af',
      })
      .setOrigin(0.5);

    this.makeButton(cx, height * 0.55, 'START', () => {
      this.scene.start(SCENE_KEYS.Match);
    });

    this.makeButton(cx, height * 0.55 + 70, 'SELECT CLASS', () => {
      this.scene.start(SCENE_KEYS.ClassSelect);
    });

    this.add
      .text(cx, height - 40, 'Phase 0-1: map + movement only', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#5b6675',
      })
      .setOrigin(0.5);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 260;
    const h = 54;
    const bg = this.add
      .rectangle(x, y, w, h, 0x1f2937)
      .setStrokeStyle(2, COLORS.blue)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x273449));
    bg.on('pointerout', () => bg.setFillStyle(0x1f2937));
    bg.on('pointerdown', onClick);
    text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }
}
