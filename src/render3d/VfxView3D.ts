import * as THREE from 'three';
import type { NormalAttackBoltKind } from '../game/sim/MatchSim';

// Phase 6C: transient combat VFX — ground telegraphs, hit sparks, AoE
// markers, heal glows, and the visual-only normal-attack bolts for ranged
// classes (damage is applied instantly by the sim, exactly like the 2D
// showNormalAttackProjectile). Each effect is a short-lived object updated
// per frame and disposed on expiry.

interface Effect {
  /** Advance; return false when finished (object already removed). */
  update(dt: number): boolean;
}

const BOLT_SPEED = 700;
const BOLT_COLORS: Record<NormalAttackBoltKind, number> = {
  arrow: 0xfde68a,
  magic_bolt: 0xc084fc,
  holy_bolt: 0xfff7cc,
};

export class VfxView3D {
  public readonly group = new THREE.Group();
  private readonly effects: Effect[] = [];

  public update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i].update(dt)) {
        this.effects.splice(i, 1);
      }
    }
  }

  /** Normal attack: frontal cone telegraph (+ visual bolt for ranged classes). */
  public attackSwing(x: number, y: number, facing: number, range: number, bolt: NormalAttackBoltKind | null): void {
    this.sector(x, y, facing, 30, range, (50 * Math.PI) / 180, 0xffffff, 0.22, 0.18);
    if (bolt) {
      this.spawnBolt(x, y, facing, range, bolt);
    }
  }

  /** Melee skill slash — wider, brighter arc. */
  public slash(x: number, y: number, facing: number): void {
    this.sector(x, y, facing, 26, 96, (100 * Math.PI) / 180, 0xfbbf24, 0.4, 0.22);
  }

  public castFlash(x: number, y: number): void {
    this.expandingRing(x, y, 26, 54, 0xffffff, 0.2);
  }

  public hitSpark(x: number, y: number): void {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(14),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.95 }),
    );
    mesh.position.set(x, 42, y);
    this.group.add(mesh);
    this.timed(0.16, (t) => {
      mesh.scale.setScalar(1 + t * 0.8);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - t);
      mesh.rotation.y += 0.3;
    }, mesh);
  }

  public impactBurst(x: number, y: number): void {
    this.expandingRing(x, y, 20, 110, 0xf97316, 0.3);
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(24, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.8 }),
    );
    flash.position.set(x, 30, y);
    this.group.add(flash);
    this.timed(0.22, (t) => {
      flash.scale.setScalar(1 + t * 1.6);
      (flash.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
    }, flash);
  }

  /** AoE zone marker: radius ring + soft disc, green for heals. */
  public aoeMarker(x: number, y: number, radius: number, kind: 'damage' | 'heal'): void {
    const color = kind === 'heal' ? 0x4ade80 : 0x60a5fa;
    const group = new THREE.Group();
    group.position.set(x, 2.4, y);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 5, radius, 44),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 5, 44),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);

    this.group.add(group);
    this.timed(0.55, (t) => {
      const s = 0.92 + 0.08 * Math.min(1, t * 4);
      group.scale.setScalar(s);
      const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
      (disc.material as THREE.MeshBasicMaterial).opacity = 0.18 * fade;
    }, group);
  }

  public heal(x: number, y: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(24, 30, 28),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 4, y);
    this.group.add(ring);
    this.timed(0.45, (t) => {
      ring.position.y = 4 + t * 52;
      ring.scale.setScalar(1 - t * 0.35);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
    }, ring);
  }

  // --- helpers ---------------------------------------------------------------

  /** Flat ground sector (cone telegraph) pointing along `facing`. */
  private sector(
    x: number, y: number, facing: number,
    innerR: number, outerR: number, arcRad: number,
    color: number, opacity: number, ttl: number,
  ): void {
    const parent = new THREE.Group();
    parent.position.set(x, 2.2, y);
    parent.rotation.y = -facing;

    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(innerR, outerR, 20, 1, -arcRad / 2, arcRad),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
    this.group.add(parent);

    this.timed(ttl, (t) => {
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - t);
    }, parent);
  }

  private expandingRing(x: number, y: number, fromR: number, toR: number, color: number, ttl: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 2.6, y);
    ring.scale.setScalar(fromR);
    this.group.add(ring);
    this.timed(ttl, (t) => {
      ring.scale.setScalar(fromR + (toR - fromR) * t);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
    }, ring);
  }

  /** Visual-only ranged normal-attack bolt (no sim hit logic — parity with 2D). */
  private spawnBolt(x: number, y: number, facing: number, range: number, kind: NormalAttackBoltKind): void {
    const color = BOLT_COLORS[kind];
    const mesh = kind === 'arrow'
      ? new THREE.Mesh(new THREE.ConeGeometry(4, 24, 6), new THREE.MeshBasicMaterial({ color }))
      : new THREE.Mesh(new THREE.SphereGeometry(8, 10, 8), new THREE.MeshBasicMaterial({ color }));
    if (kind === 'arrow') {
      mesh.rotation.set(0, -facing, -Math.PI / 2, 'YXZ');
    }
    const dirX = Math.cos(facing);
    const dirY = Math.sin(facing);
    mesh.position.set(x + dirX * 30, 46, y + dirY * 30);
    this.group.add(mesh);

    const ttl = Math.max(0.05, (range - 30) / BOLT_SPEED);
    this.timed(ttl, (t) => {
      const dist = 30 + (range - 30) * t;
      mesh.position.set(x + dirX * dist, 46, y + dirY * dist);
    }, mesh);
  }

  /** Run `step(t)` with t 0→1 over `ttl` seconds, then remove + dispose. */
  private timed(ttl: number, step: (t: number) => void, root: THREE.Object3D): void {
    let elapsed = 0;
    this.effects.push({
      update: (dt: number): boolean => {
        elapsed += dt;
        const t = Math.min(1, elapsed / ttl);
        step(t);
        if (t >= 1) {
          this.group.remove(root);
          root.traverse((obj) => {
            const m = obj as THREE.Mesh;
            m.geometry?.dispose?.();
            const mat = m.material as THREE.Material | undefined;
            mat?.dispose?.();
          });
          return false;
        }
        return true;
      },
    });
  }
}
