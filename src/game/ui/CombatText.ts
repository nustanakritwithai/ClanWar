import Phaser from 'phaser';

/** Floating combat number in world space (main camera). */
export function showCombatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(150);

  scene.tweens.add({
    targets: label,
    y: y - 36,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}
