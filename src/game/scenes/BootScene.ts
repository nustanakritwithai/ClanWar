import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';

// BootScene: place for future asset preloading. Phase 0-1 uses shape/text
// placeholders only, so it immediately hands off to the Menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  create(): void {
    this.scene.start(SCENE_KEYS.Menu);
  }
}
