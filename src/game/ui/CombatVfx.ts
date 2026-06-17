import Phaser from 'phaser';
import { COMPACT_LAYOUT_HEIGHT } from '../constants';
import { resolvePhase4eVfxTexture } from '../theme/Phase4ETheme';

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
  // Phase 4D combat-feel micro-pack (PR #45).
  gateHitSpark: 'vfx_gate_hit_spark',
  coreHitPulse: 'vfx_core_hit_pulse',
  skillCastFlash: 'vfx_skill_cast_flash',
  impactRing: 'vfx_impact_ring',
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
  { key: COMBAT_TEXTURES.gateHitSpark, path: 'vfx/fx_gate_hit_spark.svg' },
  { key: COMBAT_TEXTURES.coreHitPulse, path: 'vfx/fx_core_hit_pulse.svg' },
  { key: COMBAT_TEXTURES.skillCastFlash, path: 'vfx/fx_skill_cast_flash.svg' },
  { key: COMBAT_TEXTURES.impactRing, path: 'vfx/fx_impact_ring.svg' },
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

// --- Phase 4D combat-feel helpers ----------------------------------------
// All VFX stay at depth <= 200 (HUD is depth >= 1090 and the controls live on a
// separate UI camera), so combat FX can never cover HUD or controls.

/** Normal unit/projectile hit — reduced scale, short life, no shake/ring. */
export function showNormalHit(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = spawnOrFallback(
    scene,
    resolvePhase4eVfxTexture(scene, COMBAT_TEXTURES.hitSpark),
    x,
    y,
    register,
    { displaySize: 26, depth: 145 },
    () => scene.add.circle(x, y, 6, 0xfbbf24, 0.9).setDepth(145),
  );

  scene.tweens.add({
    targets: spark,
    scale: 1.5,
    alpha: 0,
    duration: 150,
    ease: 'Cubic.easeOut',
    onComplete: () => spark.destroy(),
  });
}

/** Gate hit — structural spark + small pulse. No destruction implication, no shake. */
export function showGateHitSpark(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const spark = spawnOrFallback(
    scene,
    resolvePhase4eVfxTexture(scene, COMBAT_TEXTURES.gateHitSpark),
    x,
    y,
    register,
    { displaySize: 52, depth: 146 },
    () => scene.add.circle(x, y, 14, 0xcfa14a, 0.85).setDepth(146),
  );

  scene.tweens.add({
    targets: spark,
    scale: 1.55,
    alpha: 0,
    duration: 240,
    ease: 'Cubic.easeOut',
    onComplete: () => spark.destroy(),
  });
}

/** Core hit — stronger pulse (cyan ring). Caller may trigger micro-shake separately. */
export function showCoreHitPulse(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const pulse = spawnOrFallback(
    scene,
    resolvePhase4eVfxTexture(scene, COMBAT_TEXTURES.coreHitPulse),
    x,
    y,
    register,
    { displaySize: 76, depth: 146 },
    () => scene.add.circle(x, y, 22, 0x22d3ee, 0.3).setStrokeStyle(2, 0x67e8f9, 0.85).setDepth(146),
  );

  scene.tweens.add({
    targets: pulse,
    scale: 2.0,
    alpha: 0,
    duration: 320,
    ease: 'Cubic.easeOut',
    onComplete: () => pulse.destroy(),
  });
}

/** Successful skill cast start flash at the caster. Callers must gate on cast success. */
export function showSkillCastFlash(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const flash = spawnOrFallback(
    scene,
    resolvePhase4eVfxTexture(scene, COMBAT_TEXTURES.skillCastFlash),
    x,
    y,
    register,
    { displaySize: 60, depth: 142, alpha: 0.9 },
    () => scene.add.circle(x, y, 24, 0x93c5fd, 0.35).setStrokeStyle(2, 0xbfdbfe, 0.7).setDepth(142),
  );

  scene.tweens.add({
    targets: flash,
    scale: 1.4,
    alpha: 0,
    duration: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

/** Heavy structure moment (Gate destroyed / Core destroyed) — expanding ring. */
export function showImpactRing(scene: Phaser.Scene, x: number, y: number, register: RegisterFn): void {
  const ring = spawnOrFallback(
    scene,
    resolvePhase4eVfxTexture(scene, COMBAT_TEXTURES.impactRing),
    x,
    y,
    register,
    { displaySize: 84, depth: 146 },
    () => scene.add.circle(x, y, 26, 0xfbbf24, 0.12).setStrokeStyle(3, 0xfde68a, 0.8).setDepth(146),
  );

  scene.tweens.add({
    targets: ring,
    scale: 2.4,
    alpha: 0,
    duration: 420,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
}

export type ShakeKind = 'core_hit' | 'gate_destroyed' | 'core_destroyed';

/**
 * Camera-only micro screen shake (main camera). Controls live on a separate UI
 * camera and are unaffected. Disabled/strongly reduced on compact (800×360):
 * core-hit shake is dropped and structure-destroy shake is capped to ~0.3px.
 */
export function microShake(scene: Phaser.Scene, kind: ShakeKind): void {
  const compact = scene.scale.height < COMPACT_LAYOUT_HEIGHT;
  let durationMs = 0;
  let intensity = 0;

  if (kind === 'core_hit') {
    if (compact) return; // disabled on small screens
    durationMs = 90;
    intensity = 0.0016; // ~1px on a 720px view
  } else if (kind === 'gate_destroyed') {
    durationMs = compact ? 70 : 120;
    intensity = compact ? 0.0009 : 0.0022;
  } else {
    durationMs = compact ? 90 : 150;
    intensity = compact ? 0.001 : 0.003;
  }

  scene.cameras.main.shake(durationMs, intensity);
}
