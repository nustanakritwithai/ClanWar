import Phaser from 'phaser';
import { createGameConfig } from './game/config';

// Single entry point. Phaser is bootstrapped here; all gameplay lives in scenes.
const game = new Phaser.Game(createGameConfig());

// Keep the canvas matched to the window on resize / orientation change.
window.addEventListener('resize', () => {
  game.scale.refresh();
});

export default game;
