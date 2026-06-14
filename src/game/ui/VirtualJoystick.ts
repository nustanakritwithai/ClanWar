import Phaser from 'phaser';

export interface VirtualJoystickOptions {
  x: number;
  y: number;
  baseRadius?: number;
  knobRadius?: number;
  /** Fraction (0-1) of baseRadius that counts as dead zone. */
  deadZone?: number;
}

// Lower-left ROV-style virtual joystick. Renders a fixed base + draggable knob
// (scroll-factor 0, screen space), exposes a normalized `vector` (length 0..1)
// that InputSystem reads each frame. Movement vector snaps back to 0 on
// release, pointer cancel, or destroy.
export class VirtualJoystick {
  public readonly vector = new Phaser.Math.Vector2();

  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private baseRadius: number;
  private knobRadius: number;
  private deadZone: number;
  private origin = new Phaser.Math.Vector2();
  private pointerId: number | null = null;

  private onPointerDown = (p: Phaser.Input.Pointer) => {
    if (this.pointerId !== null) return;
    const dist = Phaser.Math.Distance.Between(p.x, p.y, this.origin.x, this.origin.y);
    // Slightly larger than the visible base so the joystick is easy to grab.
    if (dist > this.baseRadius * 1.6) return;
    this.pointerId = p.id;
    this.updateFromPointer(p);
  };

  private onPointerMove = (p: Phaser.Input.Pointer) => {
    if (this.pointerId !== p.id) return;
    this.updateFromPointer(p);
  };

  private onPointerRelease = (p: Phaser.Input.Pointer) => {
    if (this.pointerId !== p.id) return;
    this.reset();
  };

  constructor(scene: Phaser.Scene, options: VirtualJoystickOptions) {
    this.scene = scene;
    this.baseRadius = options.baseRadius ?? 70;
    this.knobRadius = options.knobRadius ?? 32;
    this.deadZone = options.deadZone ?? 0.15;
    this.origin.set(options.x, options.y);

    this.base = scene.add
      .circle(options.x, options.y, this.baseRadius, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(2000);

    this.knob = scene.add
      .circle(options.x, options.y, this.knobRadius, 0xffffff, 0.28)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(2001);

    const input = scene.input;
    input.on('pointerdown', this.onPointerDown);
    input.on('pointermove', this.onPointerMove);
    input.on('pointerup', this.onPointerRelease);
    input.on('pointerupoutside', this.onPointerRelease);
    input.on('pointercancel', this.onPointerRelease);
  }

  private updateFromPointer(p: Phaser.Input.Pointer): void {
    const dx = p.x - this.origin.x;
    const dy = p.y - this.origin.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), this.baseRadius);
    const angle = Math.atan2(dy, dx);

    this.knob.setPosition(this.origin.x + Math.cos(angle) * dist, this.origin.y + Math.sin(angle) * dist);

    const ratio = dist / this.baseRadius;
    if (ratio < this.deadZone) {
      this.vector.set(0, 0);
      return;
    }

    // Re-scale so output ramps 0->1 across [deadZone, 1] instead of jumping.
    const scaled = (ratio - this.deadZone) / (1 - this.deadZone);
    this.vector.set(Math.cos(angle) * scaled, Math.sin(angle) * scaled);
  }

  /** Snap the knob back to center and zero the output vector. */
  public reset(): void {
    this.pointerId = null;
    this.vector.set(0, 0);
    this.knob.setPosition(this.origin.x, this.origin.y);
  }

  public get isActive(): boolean {
    return this.pointerId !== null;
  }

  /** True if a pointer is within the joystick's grab radius (used to keep
   * the desktop-attack click fallback from firing on joystick drags). */
  public containsPointer(p: Phaser.Input.Pointer): boolean {
    return Phaser.Math.Distance.Between(p.x, p.y, this.origin.x, this.origin.y) <= this.baseRadius * 1.6;
  }

  /** Recompute screen position on resize/orientation change. */
  public reposition(x: number, y: number): void {
    this.origin.set(x, y);
    this.base.setPosition(x, y);
    if (!this.isActive) {
      this.knob.setPosition(x, y);
    }
  }

  public destroy(): void {
    const input = this.scene.input;
    input.off('pointerdown', this.onPointerDown);
    input.off('pointermove', this.onPointerMove);
    input.off('pointerup', this.onPointerRelease);
    input.off('pointerupoutside', this.onPointerRelease);
    input.off('pointercancel', this.onPointerRelease);
    this.base.destroy();
    this.knob.destroy();
  }
}
