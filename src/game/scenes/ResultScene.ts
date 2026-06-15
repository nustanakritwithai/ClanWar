import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';

export interface ResultSceneData {
  outcome?: 'victory' | 'defeat';
  reason?: string;
}

const REASON_COPY: Record<string, string> = {
  enemy_core_destroyed: 'Enemy core destroyed',
  friendly_core_destroyed: 'Your core was destroyed',
};

function formatResultReason(outcome: 'victory' | 'defeat', reason?: string): string {
  if (reason && REASON_COPY[reason]) return REASON_COPY[reason];
  if (reason && !reason.includes('_')) return reason;
  return outcome === 'victory' ? 'Enemy core destroyed' : 'Your core was destroyed';
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Result);
  }

  create(data: ResultSceneData = {}): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const outcome: 'victory' | 'defeat' = data.outcome === 'defeat' ? 'defeat' : 'victory';
    const isVictory = outcome === 'victory';

    this.add
      .text(cx, height * 0.35, isVictory ? 'VICTORY' : 'DEFEAT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: isVictory ? '#fbbf24' : '#f87171',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const reason = formatResultReason(outcome, data.reason);
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
