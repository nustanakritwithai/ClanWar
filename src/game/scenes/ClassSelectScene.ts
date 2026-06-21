import Phaser from 'phaser';
import { COLORS, COMPACT_LAYOUT_HEIGHT, SCENE_KEYS } from '../constants';
import { HEROES, HERO_CLASS_ORDER, HERO_ROLE_LABEL } from '../data/heroes';
import type { HeroClassId } from '../types';
import { DEFAULT_BOT_ENCOUNTER } from '../data/bot-player-config';
import { loadPhase4eTheme1Assets, resolvePhase4eCharacterTexture } from '../theme/Phase4ETheme';

/** Viewport height below which class cards use ultra-compact stacking. */
const ULTRA_COMPACT_HEIGHT = 390;

type LayoutMode = 'normal' | 'compact' | 'ultra';

export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.ClassSelect);
  }

  preload(): void {
    loadPhase4eTheme1Assets(this.load);
  }

  create(): void {
    const { width, height } = this.scale;
    const mode = this.getLayoutMode(height);
    const cx = width / 2;

    const layout = this.getLayout(mode, width);

    if (mode === 'ultra') {
      this.add
        .text(12, 10, '← Menu', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: COLORS.text,
          backgroundColor: '#00000066',
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
    }

    this.add
      .text(cx, layout.titleY, 'SELECT CLASS', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: layout.titleSize,
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    HERO_CLASS_ORDER.forEach((id, i) => {
      const hero = HEROES[id];
      const y = layout.startY + i * (layout.cardH + layout.gap) + layout.cardH / 2;
      this.makeHeroCard(cx, y, layout.cardW, layout.cardH, id, hero.name, mode);
    });

    if (mode !== 'ultra') {
      const backY = height - (mode === 'compact' ? 28 : 40);
      this.add
        .text(cx, backY, '← Back to Menu', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: mode === 'compact' ? '16px' : '20px',
          color: COLORS.text,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
    }
  }

  private getLayoutMode(height: number): LayoutMode {
    if (height < ULTRA_COMPACT_HEIGHT) return 'ultra';
    if (height < COMPACT_LAYOUT_HEIGHT) return 'compact';
    return 'normal';
  }

  private getLayout(mode: LayoutMode, width: number) {
    switch (mode) {
      case 'ultra':
        return {
          titleY: 28,
          titleSize: '18px',
          cardW: Math.min(width - 24, 360),
          cardH: 49,
          gap: 4,
          startY: 44,
        };
      case 'compact':
        return {
          titleY: 28,
          titleSize: '24px',
          cardW: Math.min(width - 32, 340),
          cardH: 58,
          gap: 6,
          startY: 56,
        };
      default:
        return {
          titleY: 40,
          titleSize: '32px',
          cardW: 380,
          cardH: 72,
          gap: 10,
          startY: 80,
        };
    }
  }

  private makeHeroCard(
    x: number,
    y: number,
    w: number,
    h: number,
    heroClass: HeroClassId,
    name: string,
    mode: LayoutMode,
  ): void {
    const hero = HEROES[heroClass];
    const s = hero.stats;
    const role = HERO_ROLE_LABEL[heroClass];

    const bg = this.add
      .rectangle(x, y, w, h, 0x1f2937, 0.95)
      .setStrokeStyle(2, COLORS.blue)
      .setInteractive({ useHandCursor: true });

    // Phase 4E Theme 1: optional class preview art, additive only — falls
    // back to the existing text-only card layout when no themed texture is
    // loaded. Preview is tinted with the player's team color (class select
    // is always pre-match, so PLAYER_TEAM is the only relevant team here).
    const previewTexture = resolvePhase4eCharacterTexture(this, heroClass);
    const previewSize = Math.min(h - 12, mode === 'ultra' ? 36 : mode === 'compact' ? 44 : 56);
    const textIndent = previewTexture ? previewSize + 16 : 10;
    if (previewTexture) {
      this.add
        .image(x - w / 2 + 10 + previewSize / 2, y, previewTexture)
        .setDisplaySize(previewSize, previewSize)
        .setTint(COLORS.blue);
    }

    const title = `${name} — ${role}`;
    const statsLine =
      mode === 'ultra'
        ? `HP ${s.hp} MP ${s.mana} SPD ${s.moveSpeed}`
        : mode === 'compact'
          ? `HP ${s.hp}  MP ${s.mana}  ATK ${s.attack}  SPD ${s.moveSpeed}`
          : `HP ${s.hp}  Mana ${s.mana}  ATK ${s.attack}  ARM ${s.armor}  SPD ${s.moveSpeed}  RNG ${s.attackRange}`;

    const titleSize = mode === 'ultra' ? '12px' : mode === 'compact' ? '14px' : '16px';
    const statsSize = mode === 'ultra' ? '10px' : mode === 'compact' ? '11px' : '13px';
    const titleOffset = mode === 'ultra' ? 8 : mode === 'compact' ? 10 : 14;
    const statsOffset = mode === 'ultra' ? 8 : mode === 'compact' ? 10 : 14;

    const titleText = this.add
      .text(x - w / 2 + textIndent, y - titleOffset, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: titleSize,
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const statsText = this.add
      .text(x - w / 2 + textIndent, y + statsOffset, statsLine, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: statsSize,
        color: '#9ca3af',
      })
      .setOrigin(0, 0.5);

    const select = () => {
      // Phase 5B-1: production entry into a match. Spawn the default multi-bot
      // encounter (Duel Plus — Warrior + Ranger) so the real game shows more than
      // one AI BotPlayer with a class mix. A `?encounter=` URL param overrides the
      // preset, and `?botClass=` still forces the legacy single-bot path.
      this.scene.start(SCENE_KEYS.Match, { heroClass, encounter: DEFAULT_BOT_ENCOUNTER });
    };

    bg.on('pointerover', () => bg.setFillStyle(0x273449));
    bg.on('pointerout', () => bg.setFillStyle(0x1f2937, 0.95));
    bg.on('pointerdown', select);
    titleText.setInteractive({ useHandCursor: true }).on('pointerdown', select);
    statsText.setInteractive({ useHandCursor: true }).on('pointerdown', select);
  }
}
