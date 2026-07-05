import Phaser from 'phaser';
import { createGameConfig } from './game/config';

// Phaser (2D) bootstrap. Loaded via dynamic import from main.ts so the 3D
// renderer path never pays for the Phaser bundle (and vice versa).
export function boot2d(): Phaser.Game {
  const game = new Phaser.Game(createGameConfig());

  // Exposed for mobile verification / debug tooling (read-only state inspection).
  (window as unknown as Record<string, unknown>).__CLANWAR_GAME__ = game;

  // Keep the canvas matched to the window on resize / orientation change.
  window.addEventListener('resize', () => {
    game.scale.refresh();
  });

  return game;
}
