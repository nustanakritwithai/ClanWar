import { COMPACT_LAYOUT_HEIGHT, MOVEMENT_ZONE_WIDTH_RATIO } from '../game/constants';

// Phase 6A: DOM port of ui/VirtualJoystick (Phaser version) for the 3D path.
// Same behavior contract: captures only pointers that START in the left
// movement zone, tracks one pointer by id so a second finger can press action
// buttons, dead zone 0.15 with output re-scaled to ramp 0→1, snaps back to
// zero on release/cancel. Layout mirrors InputSystem.getJoystickLayout.

const DEAD_ZONE = 0.15;

export class HtmlJoystick {
  public readonly vector = { x: 0, y: 0 };

  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private originX = 0;
  private originY = 0;
  private baseRadius = 70;
  private knobRadius = 32;
  private activePointerId: number | null = null;

  private onPointerDown = (e: PointerEvent) => {
    if (this.activePointerId !== null) return;
    if (e.clientX >= window.innerWidth * MOVEMENT_ZONE_WIDTH_RATIO) return;
    this.activePointerId = e.pointerId;
    this.updateFromPointer(e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.activePointerId !== e.pointerId) return;
    this.updateFromPointer(e);
  };

  private onPointerRelease = (e: PointerEvent) => {
    if (this.activePointerId !== e.pointerId) return;
    this.reset();
  };

  constructor(root: HTMLElement) {
    this.base = document.createElement('div');
    this.knob = document.createElement('div');
    for (const el of [this.base, this.knob]) {
      el.style.position = 'fixed';
      el.style.borderRadius = '50%';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '20';
      root.appendChild(el);
    }
    this.base.style.background = 'rgba(255,255,255,0.12)';
    this.base.style.border = '2px solid rgba(255,255,255,0.35)';
    this.knob.style.background = 'rgba(255,255,255,0.28)';
    this.knob.style.border = '2px solid rgba(255,255,255,0.6)';

    this.applyLayout();

    document.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerRelease);
    document.addEventListener('pointercancel', this.onPointerRelease);
  }

  /** Same numbers as the 2D InputSystem.getJoystickLayout. */
  public applyLayout(): void {
    const height = window.innerHeight;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    this.originX = compact ? 105 : 110;
    this.originY = compact ? height - 92 : height - 110;
    this.baseRadius = compact ? 60 : 70;
    this.knobRadius = compact ? 27 : 32;

    sizeCircle(this.base, this.baseRadius);
    placeCircle(this.base, this.originX, this.originY, this.baseRadius);
    sizeCircle(this.knob, this.knobRadius);
    if (this.activePointerId === null) {
      placeCircle(this.knob, this.originX, this.originY, this.knobRadius);
    }
  }

  private updateFromPointer(e: PointerEvent): void {
    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    const dist = Math.min(Math.hypot(dx, dy), this.baseRadius);
    const angle = Math.atan2(dy, dx);

    placeCircle(
      this.knob,
      this.originX + Math.cos(angle) * dist,
      this.originY + Math.sin(angle) * dist,
      this.knobRadius,
    );

    const ratio = dist / this.baseRadius;
    if (ratio < DEAD_ZONE) {
      this.vector.x = 0;
      this.vector.y = 0;
      return;
    }
    const scaled = (ratio - DEAD_ZONE) / (1 - DEAD_ZONE);
    this.vector.x = Math.cos(angle) * scaled;
    this.vector.y = Math.sin(angle) * scaled;
  }

  public get isActive(): boolean {
    return this.activePointerId !== null;
  }

  public reset(): void {
    this.activePointerId = null;
    this.vector.x = 0;
    this.vector.y = 0;
    placeCircle(this.knob, this.originX, this.originY, this.knobRadius);
  }

  public destroy(): void {
    document.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerRelease);
    document.removeEventListener('pointercancel', this.onPointerRelease);
    this.base.remove();
    this.knob.remove();
  }
}

function sizeCircle(el: HTMLElement, radius: number): void {
  el.style.width = `${radius * 2}px`;
  el.style.height = `${radius * 2}px`;
}

function placeCircle(el: HTMLElement, centerX: number, centerY: number, radius: number): void {
  el.style.left = `${centerX - radius}px`;
  el.style.top = `${centerY - radius}px`;
}
