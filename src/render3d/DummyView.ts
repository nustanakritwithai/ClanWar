import * as THREE from 'three';
import { COLORS } from '../game/constants';
import type { DummySimState } from '../game/sim/MatchSim';
import { PALETTE } from './palette3d';

// Phase 6C: low-poly training dummy — wooden post scarecrow with a floating
// HP bar (sprites always face the camera). Tips over while dead, springs back
// upright on reset, flashes on hit.

const HP_BAR_WIDTH = 64;

export class DummyView {
  public readonly group: THREE.Group;

  private readonly tipGroup: THREE.Group;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private readonly hpFill: THREE.Sprite;
  private flashRemaining = 0;

  constructor(dummy: DummySimState) {
    this.group = new THREE.Group();
    this.group.position.set(dummy.x, 0, dummy.y);

    this.tipGroup = new THREE.Group();
    this.group.add(this.tipGroup);

    const wood = new THREE.MeshStandardMaterial({ color: PALETTE.wood, flatShading: true, roughness: 1 });
    this.bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.red, flatShading: true, roughness: 0.8 });
    const straw = new THREE.MeshStandardMaterial({ color: 0xcfae6a, flatShading: true, roughness: 1 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 74, 6), wood);
    post.position.y = 37;
    this.tipGroup.add(post);

    const arms = new THREE.Mesh(new THREE.BoxGeometry(64, 7, 7), wood);
    arms.position.y = 62;
    this.tipGroup.add(arms);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(20, 23, 40, 8), this.bodyMat);
    body.position.y = 44;
    this.tipGroup.add(body);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(13), straw);
    head.position.y = 86;
    this.tipGroup.add(head);

    // Hitbox ring on the ground = exact dummy radius (combat readability).
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(dummy.radius - 3, dummy.radius, 28),
      new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.5 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    this.group.add(ring);

    // HP bar sprites (background + fill).
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0b0e13, opacity: 0.85, transparent: true }));
    bg.scale.set(HP_BAR_WIDTH + 4, 9, 1);
    bg.position.y = 118;
    this.group.add(bg);

    this.hpFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4ade80 }));
    this.hpFill.scale.set(HP_BAR_WIDTH, 5.5, 1);
    this.hpFill.position.y = 118;
    this.group.add(this.hpFill);
  }

  public flash(): void {
    this.flashRemaining = 0.14;
  }

  public sync(dummy: DummySimState, dt: number): void {
    // HP bar: width + color by ratio (mirrors the 2D dummy tint thresholds).
    const ratio = Math.max(0, dummy.currentHp / dummy.maxHp);
    this.hpFill.scale.x = Math.max(0.001, HP_BAR_WIDTH * ratio);
    this.hpFill.position.x = -(HP_BAR_WIDTH * (1 - ratio)) / 2;
    const color = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xf97316 : 0xdc2626;
    this.hpFill.material.color.set(color);

    // Hit flash on the body.
    if (this.flashRemaining > 0) {
      this.flashRemaining -= dt;
      this.bodyMat.emissive.set(0xffffff);
      this.bodyMat.emissiveIntensity = 0.6;
    } else {
      this.bodyMat.emissiveIntensity = 0;
    }

    // Tip over while dead; spring upright when alive.
    const targetTilt = dummy.dead ? 1.25 : 0;
    this.tipGroup.rotation.z += (targetTilt - this.tipGroup.rotation.z) * Math.min(1, dt * 10);
  }
}
