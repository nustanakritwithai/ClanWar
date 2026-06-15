import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';

export interface ResultSceneData {
  outcome?: 'victory' | 'defeat';
  reason?: string;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Result);
  }

  create(data: ResultSceneData = {}): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const outcome = data.outcome ?? 'victory';
    const isVictory = outcome === 'victory';

    this.add
      .text(cx, height * 0.35, isVictory ? 'VICTORY' : 'DEFEAT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: isVictory ? '#fbbf24' : '#f87171',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const reason =
      data.reason ??
      (isVictory ? 'Enemy core destroyed' : 'Your core was destroyed');
    this.add
      .text(cx, height * 0.35 + 52, reason, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const back = this.add
      .text(cx, height * 0.35 + 120, '← Back to Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }
}
