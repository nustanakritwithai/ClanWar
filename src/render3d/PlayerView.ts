import * as THREE from 'three';
import { COLORS, PLAYER_RADIUS } from '../game/constants';
import type { PlayerSimState } from '../game/sim/MatchSim';

// Phase 6A: placeholder player — a flat-shaded capsule with a facing beak and
// a ground ring matching the collision radius (so wall-collision parity is
// visible on screen). Replaced by GLTF characters in Phase 6F.

const BODY_LENGTH = 42; // cylinder section of the capsule
const BODY_CENTER_Y = BODY_LENGTH / 2 + PLAYER_RADIUS;

export class PlayerView {
  public readonly group: THREE.Group;

  private readonly bob: THREE.Group;
  private walkPhase = 0;

  constructor() {
    this.group = new THREE.Group();
    this.bob = new THREE.Group();
    this.group.add(this.bob);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.blue,
      flatShading: true,
      roughness: 0.65,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(PLAYER_RADIUS, BODY_LENGTH, 3, 10), bodyMat);
    body.position.y = BODY_CENTER_Y;
    this.bob.add(body);

    // Facing "beak" — child at +x so group.rotation.y = -facingAngle points it
    // along the 2D facing vector (cos a, sin a) mapped onto the xz plane.
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.5 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 6), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(PLAYER_RADIUS + 8, BODY_CENTER_Y + 10, 0);
    this.bob.add(beak);

    // Hitbox ring on the ground = exact collision radius.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(PLAYER_RADIUS - 3, PLAYER_RADIUS, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    this.group.add(ring);
  }

  /**
   * Place the view at the interpolated sim position. `alpha` blends between
   * the previous and current fixed tick; `dt` drives the walk bob.
   */
  public sync(p: PlayerSimState, alpha: number, dt: number): void {
    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    this.group.position.set(x, 0, y);
    this.bob.rotation.y = -p.facingAngle;

    // Light bounce while moving — placeholder "alive" feel until real
    // animations in 6F.
    if (p.moving) {
      this.walkPhase += dt * 11;
      this.bob.position.y = Math.abs(Math.sin(this.walkPhase)) * 6;
    } else {
      this.walkPhase = 0;
      this.bob.position.y *= Math.max(0, 1 - dt * 12);
    }
  }
}
