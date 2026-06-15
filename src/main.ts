import Phaser from 'phaser';
import { createGameConfig } from './game/config';

// Single entry point. Phaser is bootstrapped here; all gameplay lives in scenes.
const game = new Phaser.Game(createGameConfig());

// Exposed for mobile verification / debug tooling (read-only state inspection).
(window as unknown as Record<string, unknown>).__CLANWAR_GAME__ = game;

// Keep the canvas matched to the window on resize / orientation change.
window.addEventListener('resize', () => {
  game.scale.refresh();
});

export default game;
