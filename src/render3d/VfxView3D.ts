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

// Phase 6F: one pooled additive Points cloud for every spark/burst/trail.
// Fixed budget (mobile-friendly), no allocation per effect: fading works by
// lerping vertex colors to black under additive blending (black == invisible).
const PARTICLE_BUDGET = 500;

class ParticlePool {
  public readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly vel = new Float32Array(PARTICLE_BUDGET * 3);
  private readonly life = new Float32Array(PARTICLE_BUDGET);
  private readonly maxLife = new Float32Array(PARTICLE_BUDGET);
  private readonly baseColor: THREE.Color[] = [];
  private readonly gravity = new Float32Array(PARTICLE_BUDGET);
  private cursor = 0;

  constructor() {
    this.positions = new Float32Array(PARTICLE_BUDGET * 3);
    this.colors = new Float32Array(PARTICLE_BUDGET * 3);
    this.positions.fill(-99999);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    // Huge static bounds — the cloud spans the whole map; skip per-frame BVH.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(1500, 60, 2100), 6000);
    const mat = new THREE.PointsMaterial({
      size: 9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    for (let i = 0; i < PARTICLE_BUDGET; i++) this.baseColor.push(new THREE.Color(0));
  }

  /** Spawn `count` particles bursting from (x, h, y). */
  public burst(
    x: number, h: number, y: number,
    count: number, color: number,
    speed: number, upBias: number, gravity: number, lifeSec: number,
  ): void {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % PARTICLE_BUDGET;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = h;
      this.positions[i * 3 + 2] = y;
      this.vel[i * 3] = Math.cos(a) * v;
      this.vel[i * 3 + 1] = upBias * (0.5 + Math.random());
      this.vel[i * 3 + 2] = Math.sin(a) * v;
      this.gravity[i] = gravity;
      this.life[i] = lifeSec * (0.6 + Math.random() * 0.4);
      this.maxLife[i] = this.life[i];
      this.baseColor[i].copy(c);
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < PARTICLE_BUDGET; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -99999;
        this.colors[i * 3] = 0; this.colors[i * 3 + 1] = 0; this.colors[i * 3 + 2] = 0;
        continue;
      }
      this.vel[i * 3 + 1] -= this.gravity[i] * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] = Math.max(2, this.positions[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.colors[i * 3] = this.baseColor[i].r * f;
      this.colors[i * 3 + 1] = this.baseColor[i].g * f;
      this.colors[i * 3 + 2] = this.baseColor[i].b * f;
    }
    const geo = this.points.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}

export class VfxView3D {
  public readonly group = new THREE.Group();
  private readonly effects: Effect[] = [];
  private readonly particles = new ParticlePool();

  constructor() {
    this.group.add(this.particles.points);
  }

  public update(dt: number): void {
    this.particles.update(dt);
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

  /** Enemy bot bolt (visual only) — flies a fixed distance then vanishes. */
  public botBolt(x: number, y: number, facing: number, travel: number, kind: NormalAttackBoltKind): void {
    this.spawnBolt(x, y, facing, Math.max(travel, 40), kind);
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
    this.particles.burst(x, 42, y, 10, 0xfde68a, 170, 90, 320, 0.4);
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
    this.particles.burst(x, 34, y, 24, 0xf97316, 260, 150, 380, 0.55);
  }

  /** Phase 6F: gate/core destruction — the biggest moment on the map. */
  public destroyBurst(x: number, y: number): void {
    this.expandingRing(x, y, 30, 240, 0xf97316, 0.5);
    this.expandingRing(x, y, 10, 150, 0xffffff, 0.35);
    this.particles.burst(x, 50, y, 60, 0xfbbf24, 420, 260, 340, 0.9);
    this.particles.burst(x, 40, y, 30, 0x9ca3af, 300, 200, 300, 1.1);
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
    // Gentle rising sparkles (negative gravity = float upward).
    this.particles.burst(x, 20, y, 12, 0x4ade80, 55, 60, -50, 0.8);
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
    let trailAccum = 0;
    let lastT = 0;
    this.timed(ttl, (t) => {
      const dist = 30 + (range - 30) * t;
      mesh.position.set(x + dirX * dist, 46, y + dirY * dist);
      // Faint trail: a particle every ~28 units of travel.
      trailAccum += (t - lastT) * (range - 30);
      lastT = t;
      if (trailAccum >= 28) {
        trailAccum = 0;
        this.particles.burst(mesh.position.x, 46, mesh.position.z, 1, color, 12, 8, 0, 0.3);
      }
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
