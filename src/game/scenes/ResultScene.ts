import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';

// Placeholder for Phase 9. Win/lose summary and scoreboard arrive later.
export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Result);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add
      .text(cx, height * 0.4, 'MATCH RESULT (placeholder)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const back = this.add
      .text(cx, height * 0.4 + 70, '← Back to Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }
}
