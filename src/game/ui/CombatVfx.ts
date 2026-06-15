import Phaser from 'phaser';

type RegisterFn = (obj: Phaser.GameObjects.GameObject) => void;

/** Minimal world-space combat feedback placeholders (SVG assets deferred). */
export function showHitSpark(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = scene.add
    .circle(x, y, 10, 0xfbbf24, 0.9)
    .setDepth(145);
  register(spark);

  scene.tweens.add({
    targets: spark,
    scale: 2.2,
    alpha: 0,
    duration: 180,
    ease: 'Cubic.easeOut',
    onComplete: () => spark.destroy(),
  });
}

export function showImpactBurst(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const burst = scene.add
    .circle(x, y, 18, 0xfb923c, 0.55)
    .setStrokeStyle(2, 0xfde68a, 0.8)
    .setDepth(144);
  register(burst);

  scene.tweens.add({
    targets: burst,
    scale: 1.8,
    alpha: 0,
    duration: 260,
    ease: 'Cubic.easeOut',
    onComplete: () => burst.destroy(),
  });
}

export function showAoeMarker(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  register: RegisterFn,
  tint = 0x60a5fa,
): void {
  const marker = scene.add
    .circle(x, y, radius, tint, 0.12)
    .setStrokeStyle(2, tint, 0.45)
    .setDepth(8);
  register(marker);

  scene.tweens.add({
    targets: marker,
    alpha: 0,
    duration: 450,
    ease: 'Cubic.easeOut',
    onComplete: () => marker.destroy(),
  });
}

export function showHealSpark(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = scene.add
    .text(x, y, '+', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#4ade80',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(145);
  register(spark);

  scene.tweens.add({
    targets: spark,
    y: y - 24,
    alpha: 0,
    duration: 350,
    ease: 'Cubic.easeOut',
    onComplete: () => spark.destroy(),
  });
}

export function showHealBurst(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const burst = scene.add
    .circle(x, y, 22, 0x4ade80, 0.25)
    .setStrokeStyle(2, 0x86efac, 0.7)
    .setDepth(144);
  register(burst);

  scene.tweens.add({
    targets: burst,
    scale: 1.6,
    alpha: 0,
    duration: 320,
    onComplete: () => burst.destroy(),
  });
}
