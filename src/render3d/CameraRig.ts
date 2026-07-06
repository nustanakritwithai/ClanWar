import * as THREE from 'three';

// Camera rig with two modes:
//
//  - 'chase' (default since the GTA-style request): close third-person camera
//    that sits low behind the player's facing and swings around with damped
//    yaw as they turn — movement input is camera-relative (W = run the way
//    the camera looks), handled via worldizeMove().
//  - 'top' (the original 6A view): high oblique camera, yaw fixed north, the
//    2D-parity view. Toggle at runtime with the V key or start with ?cam=top.
//
// The sim still lives on the 2D plane; only the view and the input basis
// change. worldizeMove() collapses to the identity in 'top' mode, so the old
// behavior is preserved exactly there.

export type CameraMode = 'chase' | 'top';

// -- top (2D-parity) tuning — unchanged from 6A --
const TOP_BACK = 620;
const TOP_HEIGHT = 880;
const TOP_LOOK_AHEAD = 140;

// -- chase (GTA-style) tuning --
/** Distance behind the player along their facing. */
const CHASE_BACK = 340;
/** Camera height above the plane (walls are 140 tall — stay above them). */
const CHASE_HEIGHT = 250;
/** Look-at point pushed ahead of the player so the lane ahead is visible. */
const CHASE_LOOK_AHEAD = 240;
/** Look-at height ≈ character chest. */
const CHASE_LOOK_HEIGHT = 95;
/** Yaw damping — how quickly the camera swings behind a new facing. */
const YAW_DAMP = 4.5;
/** North in 2D world coords (player spawn facing). */
const NORTH = -Math.PI / 2;

export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;
  public mode: CameraMode;

  private readonly lookTarget = new THREE.Vector3();
  /** Current chase yaw — the 2D angle the camera looks along. */
  private yaw = NORTH;

  constructor(aspect: number, mode: CameraMode = 'chase') {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 10, 6000);
    this.mode = mode;
  }

  public toggleMode(): CameraMode {
    this.mode = this.mode === 'chase' ? 'top' : 'chase';
    return this.mode;
  }

  /**
   * Rotate a screen-space move vector (joystick/WASD: +x right, -y forward)
   * into world space for the current camera yaw. Identity in 'top' mode.
   */
  public worldizeMove(moveX: number, moveY: number): { x: number; y: number } {
    const yaw = this.mode === 'chase' ? this.yaw : NORTH;
    const dx = Math.cos(yaw);
    const dy = Math.sin(yaw);
    // screen-forward → (dx, dy); screen-right → (-dy, dx)
    return {
      x: -dy * moveX + dx * -moveY,
      y: dx * moveX + dy * -moveY,
    };
  }

  /** Snap directly to the target (spawn / respawn). `x,z` = 2D world x,y. */
  public snapTo(x: number, z: number, facing = NORTH): void {
    this.yaw = facing;
    this.place(x, z, facing, 1, 1);
  }

  /**
   * Follow the player. `x,z` = interpolated render position; `facing` = the
   * player's current 2D facing angle (drives chase yaw).
   */
  public follow(x: number, z: number, facing: number, dt: number): void {
    const posLerp = 1 - Math.exp(-dt * 8);
    const yawLerp = 1 - Math.exp(-dt * YAW_DAMP);
    this.place(x, z, facing, posLerp, yawLerp);
  }

  private place(x: number, z: number, facing: number, posLerp: number, yawLerp: number): void {
    if (this.mode === 'top') {
      const cam = this.camera.position;
      cam.x += (x - cam.x) * posLerp;
      cam.y += (TOP_HEIGHT - cam.y) * posLerp;
      cam.z += (z + TOP_BACK - cam.z) * posLerp;
      this.lookTarget.set(x, 0, z - TOP_LOOK_AHEAD);
      this.camera.lookAt(this.lookTarget);
      return;
    }

    // Chase: swing yaw toward the player's facing along the shortest arc.
    let diff = facing - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * yawLerp;

    const dx = Math.cos(this.yaw);
    const dy = Math.sin(this.yaw);

    const targetX = x - dx * CHASE_BACK;
    const targetZ = z - dy * CHASE_BACK;
    const cam = this.camera.position;
    cam.x += (targetX - cam.x) * posLerp;
    cam.y += (CHASE_HEIGHT - cam.y) * posLerp;
    cam.z += (targetZ - cam.z) * posLerp;

    this.lookTarget.set(x + dx * CHASE_LOOK_AHEAD, CHASE_LOOK_HEIGHT, z + dy * CHASE_LOOK_AHEAD);
    this.camera.lookAt(this.lookTarget);
  }

  public resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
