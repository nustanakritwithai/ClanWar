import Phaser from 'phaser';
import { COLORS, COMPACT_LAYOUT_HEIGHT, SCENE_KEYS } from '../constants';
import { HEROES, HERO_CLASS_ORDER, HERO_ROLE_LABEL } from '../data/heroes';
import type { HeroClassId } from '../types';

export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.ClassSelect);
  }

  create(): void {
    const { width, height } = this.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const cx = width / 2;

    this.add
      .text(cx, compact ? 28 : 40, 'SELECT CLASS', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '24px' : '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const cardW = compact ? Math.min(width - 32, 340) : 380;
    const cardH = compact ? 58 : 72;
    const gap = compact ? 6 : 10;
    const startY = compact ? 56 : 80;

    HERO_CLASS_ORDER.forEach((id, i) => {
      const hero = HEROES[id];
      const y = startY + i * (cardH + gap) + cardH / 2;
      this.makeHeroCard(cx, y, cardW, cardH, id, hero.name, compact);
    });

    const backY = height - (compact ? 28 : 40);
    this.add
      .text(cx, backY, '← Back to Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '16px' : '20px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }

  private makeHeroCard(
    x: number,
    y: number,
    w: number,
    h: number,
    heroClass: HeroClassId,
    name: string,
    compact: boolean,
  ): void {
    const hero = HEROES[heroClass];
    const s = hero.stats;
    const role = HERO_ROLE_LABEL[heroClass];

    const bg = this.add
      .rectangle(x, y, w, h, 0x1f2937, 0.95)
      .setStrokeStyle(2, COLORS.blue)
      .setInteractive({ useHandCursor: true });

    const title = `${name} — ${role}`;
    const statsLine = compact
      ? `HP ${s.hp}  MP ${s.mana}  ATK ${s.attack}  SPD ${s.moveSpeed}`
      : `HP ${s.hp}  Mana ${s.mana}  ATK ${s.attack}  ARM ${s.armor}  SPD ${s.moveSpeed}  RNG ${s.attackRange}`;

    const titleText = this.add
      .text(x - w / 2 + 12, y - (compact ? 10 : 14), title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '14px' : '16px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const statsText = this.add
      .text(x - w / 2 + 12, y + (compact ? 10 : 14), statsLine, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '11px' : '13px',
        color: '#9ca3af',
      })
      .setOrigin(0, 0.5);

    const select = () => {
      this.scene.start(SCENE_KEYS.Match, { heroClass });
    };

    bg.on('pointerover', () => bg.setFillStyle(0x273449));
    bg.on('pointerout', () => bg.setFillStyle(0x1f2937, 0.95));
    bg.on('pointerdown', select);
    titleText.setInteractive({ useHandCursor: true }).on('pointerdown', select);
    statsText.setInteractive({ useHandCursor: true }).on('pointerdown', select);
  }
}
