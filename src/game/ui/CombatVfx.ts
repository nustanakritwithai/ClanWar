import Phaser from 'phaser';

/** Texture keys for combat VFX loaded from public/assets (Agent B lane — read-only). */
export const COMBAT_TEXTURES = {
  hitSpark: 'vfx_hit_spark',
  impactBurst: 'vfx_impact_burst',
  slashArc: 'vfx_slash_arc',
  healSpark: 'vfx_heal_spark',
  healCrossBurst: 'vfx_heal_cross_burst',
  aoeMarker: 'combat_aoe_marker',
  projectileArrow: 'combat_projectile_arrow',
  projectileFireball: 'combat_projectile_fireball',
} as const;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: COMBAT_TEXTURES.hitSpark, path: 'vfx/hit_spark.svg' },
  { key: COMBAT_TEXTURES.impactBurst, path: 'vfx/impact_burst.svg' },
  { key: COMBAT_TEXTURES.slashArc, path: 'vfx/slash_arc.svg' },
  { key: COMBAT_TEXTURES.healSpark, path: 'vfx/heal_spark.svg' },
  { key: COMBAT_TEXTURES.healCrossBurst, path: 'vfx/heal_cross_burst.svg' },
  { key: COMBAT_TEXTURES.aoeMarker, path: 'combat/aoe_marker.svg' },
  { key: COMBAT_TEXTURES.projectileArrow, path: 'combat/projectile_arrow.svg' },
  { key: COMBAT_TEXTURES.projectileFireball, path: 'combat/projectile_fireball.svg' },
];

/** Register combat SVG textures (256×256 authored size). Call from MatchScene preload. */
export function loadCombatVisualAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (loader.scene.textures.exists(key)) continue;
    loader.svg(key, `assets/${path}`, { width: 256, height: 256 });
  }
}

function hasCombatVisualTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

type RegisterFn = (obj: Phaser.GameObjects.GameObject) => void;

function spawnSprite(
  scene: Phaser.Scene,
  texture: string,
  x: number,
  y: number,
  register: RegisterFn,
  opts: {
    depth?: number;
    displaySize?: number;
    tint?: number;
    rotation?: number;
    alpha?: number;
  } = {},
): Phaser.GameObjects.Image | null {
  if (!hasCombatVisualTexture(scene, texture)) return null;

  const sprite = scene.add
    .image(x, y, texture)
    .setDepth(opts.depth ?? 145)
    .setOrigin(0.5);

  const displaySize = opts.displaySize ?? 48;
  sprite.setDisplaySize(displaySize, displaySize);

  if (opts.tint !== undefined) sprite.setTint(opts.tint);
  if (opts.rotation !== undefined) sprite.setRotation(opts.rotation);
  if (opts.alpha !== undefined) sprite.setAlpha(opts.alpha);

  register(sprite);
  return sprite;
}

function spawnOrFallback(
  scene: Phaser.Scene,
  texture: string,
  x: number,
  y: number,
  register: RegisterFn,
  opts: Parameters<typeof spawnSprite>[5],
  fallback: () => Phaser.GameObjects.GameObject,
): Phaser.GameObjects.GameObject {
  return spawnSprite(scene, texture, x, y, register, opts) ?? (() => {
    const obj = fallback();
    register(obj);
    return obj;
  })();
}

/** World-space combat feedback using authored SVG assets (like-for-like swap from primitives). */
export function showHitSpark(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.hitSpark,
    x,
    y,
    register,
    { displaySize: 44 },
    () => scene.add.circle(x, y, 10, 0xfbbf24, 0.9).setDepth(145),
  );

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
  const burst = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.impactBurst,
    x,
    y,
    register,
    { displaySize: 56 },
    () => scene.add.circle(x, y, 18, 0xfb923c, 0.55).setStrokeStyle(2, 0xfde68a, 0.8).setDepth(144),
  );

  scene.tweens.add({
    targets: burst,
    scale: 1.8,
    alpha: 0,
    duration: 260,
    ease: 'Cubic.easeOut',
    onComplete: () => burst.destroy(),
  });
}

export function showSlashArc(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facingAngle: number,
  register: RegisterFn,
): void {
  const arc = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.slashArc,
    x,
    y,
    register,
    { displaySize: 72, rotation: facingAngle, depth: 143, alpha: 0.9 },
    () =>
      scene.add
        .arc(x, y, 36, Phaser.Math.RadToDeg(facingAngle - 0.6), Phaser.Math.RadToDeg(facingAngle + 0.6), false, 0xfbbf24, 0.35)
        .setDepth(143),
  );

  scene.tweens.add({
    targets: arc,
    alpha: 0,
    scale: 1.25,
    duration: 160,
    ease: 'Cubic.easeOut',
    onComplete: () => arc.destroy(),
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
  const diameter = radius * 2;
  const marker = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.aoeMarker,
    x,
    y,
    register,
    { displaySize: diameter, tint, depth: 8, alpha: 0.85 },
    () => scene.add.circle(x, y, radius, tint, 0.12).setStrokeStyle(2, tint, 0.45).setDepth(8),
  );

  scene.tweens.add({
    targets: marker,
    alpha: 0,
    duration: 450,
    ease: 'Cubic.easeOut',
    onComplete: () => marker.destroy(),
  });
}

export function showHealSpark(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.healSpark,
    x,
    y,
    register,
    { displaySize: 36, depth: 145 },
    () =>
      scene.add
        .text(x, y, '+', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: '#4ade80',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(145),
  );

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
  const burst = spawnOrFallback(
    scene,
    COMBAT_TEXTURES.healCrossBurst,
    x,
    y,
    register,
    { displaySize: 52, depth: 144 },
    () => scene.add.circle(x, y, 22, 0x4ade80, 0.25).setStrokeStyle(2, 0x86efac, 0.7).setDepth(144),
  );

  scene.tweens.add({
    targets: burst,
    scale: 1.6,
    alpha: 0,
    duration: 320,
    onComplete: () => burst.destroy(),
  });
}
