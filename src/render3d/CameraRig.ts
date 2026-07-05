import * as THREE from 'three';

// Phase 6A: tilted follow camera (the "มุมกดเฉียงตามหลังผู้เล่น" decision).
//
// The camera sits behind the player toward the blue base (+z) and looks
// north toward the red base (-z), pitched down ~55°. Yaw is FIXED — the world
// never rotates, so screen-up is always "toward the enemy base", exactly like
// the 2D top-down camera. This keeps joystick/WASD direction mapping and all
// player guidance readable without any input remapping.

/** Horizontal distance behind the player (world units, +z). */
const BACK_OFFSET = 620;
/** Camera height above the gameplay plane. */
const HEIGHT = 880;
/** Look-at point is pushed slightly ahead of the player so more of the
 * battlefield ahead (enemy side) is on screen than behind. */
const LOOK_AHEAD = 140;

export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;

  private readonly lookTarget = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 10, 6000);
  }

  /** Snap directly to the target (spawn / respawn). `x,z` = 2D world x,y. */
  public snapTo(x: number, z: number): void {
    this.place(x, z, 1);
  }

  /**
   * Follow the player with a light smoothing lerp. `x,z` are the player's
   * interpolated render position on the gameplay plane.
   */
  public follow(x: number, z: number, dt: number): void {
    // Exponential smoothing that is frame-rate independent.
    const t = 1 - Math.exp(-dt * 8);
    this.place(x, z, t);
  }

  private place(x: number, z: number, lerp: number): void {
    const targetCamX = x;
    const targetCamY = HEIGHT;
    const targetCamZ = z + BACK_OFFSET;

    const cam = this.camera.position;
    cam.x += (targetCamX - cam.x) * lerp;
    cam.y += (targetCamY - cam.y) * lerp;
    cam.z += (targetCamZ - cam.z) * lerp;

    this.lookTarget.set(x, 0, z - LOOK_AHEAD);
    this.camera.lookAt(this.lookTarget);
  }

  public resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
