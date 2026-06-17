import Phaser from 'phaser';

/** Floating combat number in world space (main camera). Caller should register with uiCamera.ignore(). */
export function showCombatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
): Phaser.GameObjects.Text {
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

  return label;
}

// --- Phase 4D damage-number polish ---------------------------------------
// Polish only: tone/size/lifetime per target kind + anti-clutter cap. Damage
// VALUES are unchanged (callers pass the already-computed finalDamage).

export type DamageNumberKind = 'normal' | 'gate' | 'core';

const KIND_STYLE: Record<DamageNumberKind, { size: string; color: string; life: number; rise: number }> = {
  // Normal hit: small, red, short, slight upward drift.
  normal: { size: '15px', color: '#f87171', life: 520, rise: 30 },
  // Gate hit: slightly larger, amber (structural — not reward/currency styled).
  gate: { size: '18px', color: '#cfa14a', life: 600, rise: 34 },
  // Core hit: strongest emphasis, canonical gold.
  core: { size: '22px', color: '#f4d35e', life: 680, rise: 40 },
};

const MAX_PER_CLUSTER = 3;
const CLUSTER_RADIUS = 90;

interface DamageEntry {
  obj: Phaser.GameObjects.Text;
  x: number;
  y: number;
  born: number;
}

// Per-scene registry of live damage numbers (avoids relying on scene.data plugin).
const activeByScene = new WeakMap<Phaser.Scene, DamageEntry[]>();

function pruneEntries(scene: Phaser.Scene): DamageEntry[] {
  const list = (activeByScene.get(scene) ?? []).filter((e) => e.obj.active);
  activeByScene.set(scene, list);
  return list;
}

/**
 * Polished floating damage number. Caps visible numbers near a target cluster
 * (fades the oldest early when exceeded) and staggers spawns to reduce clutter.
 */
export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  kind: DamageNumberKind = 'normal',
): Phaser.GameObjects.Text {
  const style = KIND_STYLE[kind];
  const list = pruneEntries(scene);

  const cluster = list.filter((e) => Math.hypot(e.x - x, e.y - y) <= CLUSTER_RADIUS);
  if (cluster.length >= MAX_PER_CLUSTER) {
    const oldest = cluster.reduce((a, b) => (a.born <= b.born ? a : b));
    scene.tweens.killTweensOf(oldest.obj);
    scene.tweens.add({
      targets: oldest.obj,
      alpha: 0,
      duration: 110,
      onComplete: () => oldest.obj.destroy(),
    });
  }

  // Slight horizontal stagger so stacked hits don't perfectly overlap.
  const stagger = (cluster.length % 3) * 12 - 12;

  const label = scene.add
    .text(x + stagger, y, `-${amount}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: style.size,
      color: style.color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: kind === 'normal' ? 3 : 4,
    })
    .setOrigin(0.5)
    .setDepth(150);

  const entry: DamageEntry = { obj: label, x, y, born: scene.time.now };
  list.push(entry);

  scene.tweens.add({
    targets: label,
    y: y - style.rise,
    alpha: 0,
    duration: style.life,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });

  return label;
}
