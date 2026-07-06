import * as THREE from 'three';
import type { BotSnapshot } from '../game/sim/SimBot';
import type { CombatTextLayer } from './CombatTextLayer';

// Phase 6D: 3D view for the AI enemy bots. Each bot is a red enemy capsule
// (per-class body) with a facing beak, a floating HP bar + name label, an
// amber wind-up telegraph, a hit flash (on HP drop), and a death tip-over /
// spawn pop. Views are diffed against the sim's bot snapshots by id every
// frame — spawning/despawning needs no events.

const ENEMY_RED = 0xdc2626;
const ENEMY_TINT = 0xff5a5a;
const WINDUP = 0xf59e0b;
const BODY_LEN = 42;
const BODY_CY = BODY_LEN / 2 + 22;
const HP_W = 54;

interface BotVisual {
  group: THREE.Group;
  tip: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  hpFill: THREE.Sprite;
  label: { set(t: string): void; setPosition(x: number, y: number): void; remove(): void };
  lastHp: number;
  flash: number;
  spawnPop: number;
}

export class BotView3D {
  public readonly group = new THREE.Group();
  private readonly views = new Map<string, BotVisual>();
  private readonly combatText: CombatTextLayer;

  constructor(combatText: CombatTextLayer) {
    this.combatText = combatText;
  }

  public sync(bots: readonly BotSnapshot[], alpha: number, dt: number): void {
    const seen = new Set<string>();

    for (const bot of bots) {
      seen.add(bot.id);
      let v = this.views.get(bot.id);
      if (!v) {
        v = this.create(bot);
        this.views.set(bot.id, v);
        this.group.add(v.group);
      }

      const x = bot.prevX + (bot.x - bot.prevX) * alpha;
      const z = bot.prevY + (bot.y - bot.prevY) * alpha;
      v.group.position.set(x, 0, z);
      v.tip.rotation.y = -bot.facingAngle;
      v.label.setPosition(x, z);

      // Hit flash when HP dropped since last frame.
      if (bot.currentHp < v.lastHp) v.flash = 0.14;
      v.lastHp = bot.currentHp;

      // HP bar width + color.
      const ratio = Math.max(0, bot.currentHp / bot.maxHp);
      v.hpFill.scale.x = Math.max(0.001, HP_W * ratio);
      v.hpFill.position.x = -(HP_W * (1 - ratio)) / 2;
      (v.hpFill.material as THREE.SpriteMaterial).color.set(ratio > 0.5 ? ENEMY_RED : ratio > 0.25 ? 0xf97316 : 0xfca5a5);

      // Wind-up telegraph (amber emissive) or hit flash (white).
      if (v.flash > 0) {
        v.flash -= dt;
        v.bodyMat.emissive.set(0xffffff);
        v.bodyMat.emissiveIntensity = 0.7;
      } else if (bot.state === 'windup') {
        v.bodyMat.emissive.set(WINDUP);
        v.bodyMat.emissiveIntensity = 0.4 + 0.3 * Math.sin(performance.now() / 60);
      } else {
        v.bodyMat.emissiveIntensity = 0;
      }

      // Death tip-over + fade; spawn pop-in.
      const targetTilt = bot.dead ? 1.3 : 0;
      v.tip.rotation.z += (targetTilt - v.tip.rotation.z) * Math.min(1, dt * 9);
      const targetScale = bot.dead ? 0.6 : 1;
      const cur = v.group.scale.x;
      v.group.scale.setScalar(cur + (targetScale - cur) * Math.min(1, dt * 8));
      v.label.set(bot.dead ? '' : `${bot.name}`);
      v.hpFill.visible = !bot.dead;
    }

    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.group.remove(v.group);
      v.label.remove();
      this.views.delete(id);
    }
  }

  private create(bot: BotSnapshot): BotVisual {
    const group = new THREE.Group();
    const tip = new THREE.Group();
    group.add(tip);

    const bodyMat = new THREE.MeshStandardMaterial({ color: ENEMY_TINT, flatShading: true, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(bot.radius, BODY_LEN, 3, 10), bodyMat);
    body.position.y = BODY_CY;
    tip.add(body);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(9, 22, 6),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, flatShading: true }),
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(bot.radius + 8, BODY_CY + 10, 0);
    tip.add(beak);

    // Ranged bots get a small floating orb so class reads at a glance.
    if (bot.isRanged) {
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(7),
        new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0xef4444, emissiveIntensity: 0.5, flatShading: true }),
      );
      orb.position.set(bot.radius + 2, BODY_CY + 34, 0);
      tip.add(orb);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(bot.radius - 3, bot.radius, 28),
      new THREE.MeshBasicMaterial({ color: ENEMY_RED, transparent: true, opacity: 0.5 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    group.add(ring);

    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x3f1d1d, transparent: true, opacity: 0.9 }));
    bg.scale.set(HP_W + 4, 8, 1);
    bg.position.y = 118;
    group.add(bg);
    const hpFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: ENEMY_RED }));
    hpFill.scale.set(HP_W, 5, 1);
    hpFill.position.y = 118;
    group.add(hpFill);

    const label = this.combatText.createLabel(bot.x, bot.y, 138, { color: '#fecaca', background: 'rgba(127,29,29,0.8)' });

    return { group, tip, bodyMat, hpFill, label, lastHp: bot.currentHp, flash: 0, spawnPop: 0 };
  }
}
