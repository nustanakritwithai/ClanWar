import Phaser from 'phaser';
import { COMPACT_LAYOUT_HEIGHT } from '../constants';
import { FINAL_MINUTE_THRESHOLD_SEC, MATCH_DURATION_SEC } from '../data/match-rules';
import type { CaptureSystem } from './CaptureSystem';
import { showCombatText } from '../ui/CombatText';

export const MATCH_TIMER_TEXTURES = {
  uiMatchTimer: 'ui_match_timer',
  uiObjectiveScore: 'ui_objective_score',
  uiTimeUp: 'ui_time_up',
} as const;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: MATCH_TIMER_TEXTURES.uiMatchTimer, path: 'objective-feedback/ui_match_timer.svg' },
  { key: MATCH_TIMER_TEXTURES.uiObjectiveScore, path: 'objective-feedback/ui_objective_score.svg' },
  { key: MATCH_TIMER_TEXTURES.uiTimeUp, path: 'objective-feedback/ui_time_up.svg' },
];

export function loadMatchTimerAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (!loader.scene.textures.exists(key)) {
      loader.image(key, `assets/${path}`);
    }
  }
}

/**
 * Phase 4C-C match timer + Objective Score HUD.
 *
 * Owns the countdown, a compact top-strip HUD (Time Left + Objective Score),
 * and the one-shot "Final Minute" / "Time Up" feedback. The HUD sits at the very
 * top of the screen (above the Gate/Core prompt band) at a lower depth, so it
 * never overrides the Gate/Core prompt, Capture HUD, or Siege Buff badge.
 */
export class MatchTimerSystem {
  private scene: Phaser.Scene;
  private captureSystem: CaptureSystem;
  private registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;

  private remainingMs = MATCH_DURATION_SEC * 1000;
  private stopped = false;
  private expired = false;
  private finalMinuteShown = false;
  private timeUpShown = false;

  private timerIcon?: Phaser.GameObjects.Image;
  private timerLabel?: Phaser.GameObjects.Text;
  private scoreIcon?: Phaser.GameObjects.Image;
  private scoreLabel?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    captureSystem: CaptureSystem,
    registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void,
  ) {
    this.scene = scene;
    this.captureSystem = captureSystem;
    this.registerWorldObject = registerWorldObject;
  }

  public build(): void {
    this.reset();
    this.createHud();
    this.refreshHud();
  }

  public destroy(): void {
    this.timerIcon?.destroy();
    this.timerLabel?.destroy();
    this.scoreIcon?.destroy();
    this.scoreLabel?.destroy();
    this.timerIcon = undefined;
    this.timerLabel = undefined;
    this.scoreIcon = undefined;
    this.scoreLabel = undefined;
  }

  /** Reset to a fresh match. Called on build (Menu ↔ Match restart rebuilds the scene). */
  public reset(): void {
    this.remainingMs = MATCH_DURATION_SEC * 1000;
    this.stopped = false;
    this.expired = false;
    this.finalMinuteShown = false;
    this.timeUpShown = false;
  }

  /** Stop the countdown (e.g. when a Core is destroyed before time-up). */
  public stop(): void {
    this.stopped = true;
  }

  public update(deltaMs: number): void {
    if (!this.stopped && !this.expired) {
      this.remainingMs = Math.max(0, this.remainingMs - deltaMs);

      if (
        !this.finalMinuteShown &&
        this.remainingMs > 0 &&
        this.remainingMs <= FINAL_MINUTE_THRESHOLD_SEC * 1000
      ) {
        this.finalMinuteShown = true;
        this.showToast('Final Minute', '#fbbf24');
      }

      if (this.remainingMs <= 0) {
        this.expired = true;
      }
    }
    this.refreshHud();
  }

  public getRemainingSeconds(): number {
    return Math.ceil(this.remainingMs / 1000);
  }

  public isExpired(): boolean {
    return this.expired;
  }

  /** One-shot "Time Up" feedback. Does not imply a Core was destroyed. */
  public showTimeUp(): void {
    if (this.timeUpShown) return;
    this.timeUpShown = true;

    const { width } = this.scene.scale;
    if (this.scene.textures.exists(MATCH_TIMER_TEXTURES.uiTimeUp)) {
      const icon = this.scene.add
        .image(width / 2, 112, MATCH_TIMER_TEXTURES.uiTimeUp)
        .setDisplaySize(44, 44)
        .setScrollFactor(0)
        .setDepth(1200);
      this.registerWorldObject(icon);
      this.scene.tweens.add({
        targets: icon,
        alpha: 0,
        duration: 1300,
        ease: 'Quad.easeIn',
        onComplete: () => icon.destroy(),
      });
    }
    this.showToast('Time Up', '#f4d35e', 148);
  }

  /** Read-only label snapshots for regression. */
  public getTimerLabel(): string {
    return this.timerLabel?.text ?? '';
  }

  public getScoreLabel(): string {
    return this.scoreLabel?.text ?? '';
  }

  public layoutHud(): void {
    this.relayout();
  }

  private createHud(): void {
    this.timerIcon = this.scene.add
      .image(0, 0, MATCH_TIMER_TEXTURES.uiMatchTimer)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1090);

    this.timerLabel = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e6edf3',
        backgroundColor: '#00000077',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1090);

    this.scoreIcon = this.scene.add
      .image(0, 0, MATCH_TIMER_TEXTURES.uiObjectiveScore)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1090);

    this.scoreLabel = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#fbbf24',
        backgroundColor: '#00000077',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1090);

    this.registerWorldObject(this.timerIcon);
    this.registerWorldObject(this.timerLabel);
    this.registerWorldObject(this.scoreIcon);
    this.registerWorldObject(this.scoreLabel);
  }

  private refreshHud(): void {
    if (!this.timerLabel || !this.scoreLabel) return;

    const compact = this.scene.scale.height < COMPACT_LAYOUT_HEIGHT;
    const total = this.getRemainingSeconds();
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    const time = `${mm}:${ss}`;

    const blue = this.captureSystem.getTeamScore('blue');
    const red = this.captureSystem.getTeamScore('red');

    this.timerLabel.setText(compact ? time : `Time Left ${time}`);
    this.scoreLabel.setText(compact ? `${blue} – ${red}` : `Obj Score ${blue} – ${red}`);

    this.relayout();
  }

  /** Center the timer + score clusters as one row at the very top of the screen. */
  private relayout(): void {
    if (!this.timerIcon || !this.timerLabel || !this.scoreIcon || !this.scoreLabel) return;

    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const y = compact ? 10 : 14;
    const iconSize = compact ? 14 : 18;
    const innerGap = 4;
    const clusterGap = compact ? 12 : 20;

    const tW = this.timerLabel.width;
    const sW = this.scoreLabel.width;
    const totalW = iconSize + innerGap + tW + clusterGap + iconSize + innerGap + sW;

    let x = width / 2 - totalW / 2;
    const iconY = y + (compact ? 1 : 2);

    this.timerIcon.setPosition(x, iconY).setDisplaySize(iconSize, iconSize);
    x += iconSize + innerGap;
    this.timerLabel.setPosition(x, y);
    x += tW + clusterGap;
    this.scoreIcon.setPosition(x, iconY).setDisplaySize(iconSize, iconSize);
    x += iconSize + innerGap;
    this.scoreLabel.setPosition(x, y);
  }

  private showToast(message: string, color: string, y = 132): void {
    const { width } = this.scene.scale;
    const text = showCombatText(this.scene, width / 2, y, message, color);
    this.registerWorldObject(text);
  }
}
