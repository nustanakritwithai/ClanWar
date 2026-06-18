import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants';
import { hasPhase4eTexture, loadPhase4eTheme1Assets, PHASE4E_THEME1_TEXTURES } from '../theme/Phase4ETheme';

export interface ResultSceneData {
  outcome?: 'victory' | 'defeat' | 'draw';
  reason?: string;
  blueScore?: number;
  redScore?: number;
  blueCoreHp?: number;
  redCoreHp?: number;
}

const REASON_COPY: Record<string, string> = {
  enemy_core_destroyed: 'Enemy core destroyed',
  friendly_core_destroyed: 'Your core was destroyed',
  score_victory: 'Victory by Objective Score',
  score_defeat: 'Defeat by Objective Score',
  hp_tiebreak_victory: 'Victory by Core HP Tiebreak',
  hp_tiebreak_defeat: 'Defeat by Core HP Tiebreak',
  draw: 'Objective Score and Core HP tied',
};

const DEFAULT_REASON: Record<'victory' | 'defeat' | 'draw', string> = {
  victory: 'Enemy core destroyed',
  defeat: 'Your core was destroyed',
  draw: 'Objective Score and Core HP tied',
};

function formatResultReason(outcome: 'victory' | 'defeat' | 'draw', reason?: string): string {
  if (reason && REASON_COPY[reason]) return REASON_COPY[reason];
  if (reason && !reason.includes('_')) return reason;
  return DEFAULT_REASON[outcome];
}

/** Whether this result was decided by the timer rather than a destroyed Core. */
function isTimeUpReason(reason?: string): boolean {
  return (
    reason === 'score_victory' ||
    reason === 'score_defeat' ||
    reason === 'hp_tiebreak_victory' ||
    reason === 'hp_tiebreak_defeat' ||
    reason === 'draw'
  );
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Result);
  }

  preload(): void {
    loadPhase4eTheme1Assets(this.load);
  }

  create(data: ResultSceneData = {}): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const outcome: 'victory' | 'defeat' | 'draw' =
      data.outcome === 'defeat' ? 'defeat' : data.outcome === 'draw' ? 'draw' : 'victory';

    // Phase 4E Theme 1: optional decorative backdrop behind the result text
    // block. Additive only — text positions/values are unchanged.
    if (hasPhase4eTexture(this, PHASE4E_THEME1_TEXTURES.uiResultPanel)) {
      const panelW = Math.min(280, width - 24);
      const panelH = panelW * (160 / 280);
      this.add
        .image(cx, height * 0.32 + 30, PHASE4E_THEME1_TEXTURES.uiResultPanel)
        .setDisplaySize(panelW, panelH);
    }

    const titleText = outcome === 'victory' ? 'VICTORY' : outcome === 'defeat' ? 'DEFEAT' : 'DRAW';
    const titleColor =
      outcome === 'victory' ? '#fbbf24' : outcome === 'defeat' ? '#f87171' : '#cbd5e1';

    this.add
      .text(cx, height * 0.32, titleText, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: titleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const reason = formatResultReason(outcome, data.reason);
    this.add
      .text(cx, height * 0.32 + 52, reason, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    // Detail line(s) for time-up results: final Objective Score and, for
    // tiebreak/draw, the Core HP comparison. Shown as plain feedback — never
    // currency/EXP/ranking wording.
    if (isTimeUpReason(data.reason)) {
      const blueScore = data.blueScore ?? 0;
      const redScore = data.redScore ?? 0;
      this.add
        .text(cx, height * 0.32 + 86, `Objective Score  Blue ${blueScore} – Red ${redScore}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#cbd5e1',
        })
        .setOrigin(0.5);

      const showHp =
        data.reason === 'hp_tiebreak_victory' ||
        data.reason === 'hp_tiebreak_defeat' ||
        data.reason === 'draw';
      if (showHp) {
        const blueHp = Math.ceil(data.blueCoreHp ?? 0);
        const redHp = Math.ceil(data.redCoreHp ?? 0);
        this.add
          .text(cx, height * 0.32 + 110, `Core HP  Blue ${blueHp} – Red ${redHp}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            color: '#cbd5e1',
          })
          .setOrigin(0.5);
      }
    }

    const back = this.add
      .text(cx, height * 0.32 + 156, '← Back to Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENE_KEYS.Menu));
  }
}
