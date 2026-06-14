import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';

// Placeholder for Phase 3. Lists the five planned classes but does not yet wire
// stats/skills or pass a selection into the match.
export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.ClassSelect);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add
      .text(cx, 80, 'SELECT CLASS (placeholder)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const classes = ['Guardian', 'Warrior', 'Ranger', 'Mage', 'Priest'];
    classes.forEach((name, i) => {
      this.add
        .text(cx, 170 + i * 40, `• ${name}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: '#9ca3af',
        })
        .setOrigin(0.5);
    });

    const back = this.add
      .text(cx, height - 60, '← Back to Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }
}
