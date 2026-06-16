import Phaser from 'phaser';
import type { CaptureObjectiveDefinition, CaptureState } from '../data/capture-objectives';

const DISPLAY_SIZE = 96;

/** World sprite for a capturable map objective. */
export class CaptureObjective {
  public readonly definition: CaptureObjectiveDefinition;
  public readonly baseSprite: Phaser.GameObjects.Image;
  public readonly progressRing: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    definition: CaptureObjectiveDefinition,
    textureKey: string,
    register: (obj: Phaser.GameObjects.GameObject) => void,
  ) {
    this.definition = definition;

    this.baseSprite = scene.add
      .image(definition.x, definition.y, textureKey)
      .setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE)
      .setDepth(18);

    this.progressRing = scene.add
      .image(definition.x, definition.y, 'ui_capture_progress')
      .setDisplaySize(DISPLAY_SIZE + 20, DISPLAY_SIZE + 20)
      .setDepth(19)
      .setVisible(false)
      .setAlpha(0.85);

    register(this.baseSprite);
    register(this.progressRing);
  }

  public applyVisual(textureKey: string, captureState: CaptureState, progress: number): void {
    this.baseSprite.setTexture(textureKey);
    const showProgress = captureState === 'capturing' || captureState === 'contested';
    this.progressRing.setVisible(showProgress);
    if (showProgress) {
      this.progressRing.setAlpha(captureState === 'contested' ? 0.55 : 0.85);
      this.progressRing.setScale(0.85 + (progress / 100) * 0.2);
    }
  }

  public destroy(): void {
    this.baseSprite.destroy();
    this.progressRing.destroy();
  }
}
