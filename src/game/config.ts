import Phaser from 'phaser';
import { COLORS } from './constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { MatchScene } from './scenes/MatchScene';
import { ResultScene } from './scenes/ResultScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: COLORS.bg,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    // Boot first, then Menu is started explicitly from Boot.
    scene: [BootScene, MenuScene, ClassSelectScene, MatchScene, ResultScene],
  };
}
