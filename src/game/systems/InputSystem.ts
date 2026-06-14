import Phaser from 'phaser';

// InputSystem produces a single normalized movement vector per frame, merging
// desktop (WASD + arrow keys) input with an optional mobile virtual joystick.
//
// Phase 0-1 scope: WASD movement is fully implemented. The joystick is
// scaffolded (a touch pad in the lower-left that reports a direction) so Phase 2
// can build the polished ROV-style control on top without reworking the wiring.
export class InputSystem {
  private scene: Phaser.Scene;
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    upArrow: Phaser.Input.Keyboard.Key;
    downArrow: Phaser.Input.Keyboard.Key;
    leftArrow: Phaser.Input.Keyboard.Key;
    rightArrow: Phaser.Input.Keyboard.Key;
  };

  // --- Mobile joystick scaffold (lower-left). Not the final ROV control. ---
  private joystickActive = false;
  private joystickPointerId = -1;
  private joystickOrigin = new Phaser.Math.Vector2();
  private joystickVector = new Phaser.Math.Vector2();
  private readonly joystickMaxRadius = 90;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      upArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      downArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      leftArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rightArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };

    this.setupTouchScaffold();
  }

  // Returns a normalized direction vector (length 0 or 1).
  public getMoveVector(out = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    out.set(0, 0);

    // Keyboard
    if (this.keys.left.isDown || this.keys.leftArrow.isDown) out.x -= 1;
    if (this.keys.right.isDown || this.keys.rightArrow.isDown) out.x += 1;
    if (this.keys.up.isDown || this.keys.upArrow.isDown) out.y -= 1;
    if (this.keys.down.isDown || this.keys.downArrow.isDown) out.y += 1;

    // Joystick overrides keyboard when actively dragged.
    if (this.joystickActive && this.joystickVector.lengthSq() > 0) {
      out.copy(this.joystickVector);
    }

    if (out.lengthSq() > 0) out.normalize();
    return out;
  }

  private setupTouchScaffold(): void {
    const input = this.scene.input;
    // Only treat touches in the lower-left quadrant as joystick input so the
    // rest of the screen stays free for future buttons.
    const inJoystickZone = (p: Phaser.Input.Pointer) =>
      p.x < this.scene.scale.width * 0.45 && p.y > this.scene.scale.height * 0.4;

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joystickActive || !inJoystickZone(p)) return;
      this.joystickActive = true;
      this.joystickPointerId = p.id;
      this.joystickOrigin.set(p.x, p.y);
      this.joystickVector.set(0, 0);
    });

    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joystickActive || p.id !== this.joystickPointerId) return;
      const dx = p.x - this.joystickOrigin.x;
      const dy = p.y - this.joystickOrigin.y;
      this.joystickVector.set(dx, dy);
      if (this.joystickVector.length() > this.joystickMaxRadius) {
        this.joystickVector.setLength(this.joystickMaxRadius);
      }
    });

    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joystickPointerId) return;
      this.joystickActive = false;
      this.joystickPointerId = -1;
      this.joystickVector.set(0, 0);
    };
    input.on('pointerup', release);
    input.on('pointerupoutside', release);
  }
}
