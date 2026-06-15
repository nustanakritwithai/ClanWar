import Phaser from 'phaser';
import type { ActionKey, InputState } from '../types';
import { COMPACT_LAYOUT_HEIGHT } from '../constants';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { SkillButtons } from '../ui/SkillButtons';

export const ACTION_LABELS: Record<ActionKey, string> = {
  attack: 'Attack',
  skill1: 'Skill 1',
  skill2: 'Skill 2',
  skill3: 'Skill 3',
  ultimate: 'Ultimate',
  warAction: 'War Action',
  item1: 'Item 1',
  item2: 'Item 2',
};

function createInputState(): InputState {
  return {
    moveX: 0,
    moveY: 0,
    attackPressed: false,
    skill1Pressed: false,
    skill2Pressed: false,
    skill3Pressed: false,
    ultimatePressed: false,
    warActionPressed: false,
    item1Pressed: false,
    item2Pressed: false,
    lastAction: '',
    inputMode: 'keyboard',
  };
}

// InputSystem is the single source of truth for player input each frame.
// It merges desktop (WASD/arrows + key bindings) and mobile (virtual
// joystick + action buttons) into one `state` object that MatchScene reads.
//
// Lifecycle: call `update()` once per frame, `handleResize()` on scale
// resize, and `destroy()` on scene shutdown to remove all listeners and
// avoid leaks/stuck joystick state across Menu<->Match transitions.
export class InputSystem {
  public readonly state: InputState = createInputState();

  private scene: Phaser.Scene;
  private joystick!: VirtualJoystick;
  private buttons: SkillButtons;
  private pendingActions = new Set<ActionKey>();

  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  // Guards against the click that starts the Match scene (e.g. the Menu's
  // "START" button) being re-delivered to this system's own pointerdown
  // listener while it is still being registered, which would otherwise
  // register a spurious Attack on scene entry.
  private ready = false;

  private onPointerDown = (p: Phaser.Input.Pointer) => {
    if (!this.ready) return;
    // Desktop mouse fallback for Attack: left click on empty ground (not on
    // a UI button, which already handles its own pointerdown).
    if (p.wasTouch || !p.leftButtonDown()) return;
    if (this.scene.input.hitTestPointer(p).length > 0) return;
    if (this.joystick.containsPointer(p)) return;
    this.queueAction('attack', 'keyboard');
  };

  private onBlurOrHide = () => this.reset();

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
      attack: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      skill1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      skill2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      skill3: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      ultimate: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      warAction: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      item1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      item2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
    };

    const { height } = scene.scale;
    const joyLayout = this.getJoystickLayout(height);
    this.joystick = new VirtualJoystick(scene, joyLayout);
    this.buttons = new SkillButtons(scene, (action) => this.queueAction(action, 'touch'));

    scene.input.on('pointerdown', this.onPointerDown);
    window.addEventListener('blur', this.onBlurOrHide);
    document.addEventListener('visibilitychange', this.onBlurOrHide);

    // Defer until the next frame so the click that started this scene
    // (already mid-dispatch when the listener above was added) is ignored.
    scene.time.delayedCall(0, () => {
      this.ready = true;
    });
  }

  private queueAction(action: ActionKey, mode: InputState['inputMode']): void {
    this.pendingActions.add(action);
    this.state.inputMode = mode;
  }

  /** Recompute input state for this frame. Call once per scene update(). */
  public update(): void {
    this.updateMovement();
    this.updateActions();
  }

  private updateMovement(): void {
    const joy = this.joystick.vector;
    if (joy.lengthSq() > 0) {
      this.state.moveX = joy.x;
      this.state.moveY = joy.y;
      this.state.inputMode = 'touch';
      return;
    }

    let x = 0;
    let y = 0;
    if (this.keys.left.isDown || this.keys.leftArrow.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.rightArrow.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.upArrow.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.downArrow.isDown) y += 1;

    if (x !== 0 || y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
      this.state.inputMode = 'keyboard';
    }

    this.state.moveX = x;
    this.state.moveY = y;
  }

  private updateActions(): void {
    const s = this.state;
    s.attackPressed = false;
    s.skill1Pressed = false;
    s.skill2Pressed = false;
    s.skill3Pressed = false;
    s.ultimatePressed = false;
    s.warActionPressed = false;
    s.item1Pressed = false;
    s.item2Pressed = false;

    this.checkKey('attack', s);
    this.checkKey('skill1', s);
    this.checkKey('skill2', s);
    this.checkKey('skill3', s);
    this.checkKey('ultimate', s);
    this.checkKey('warAction', s);
    this.checkKey('item1', s);
    this.checkKey('item2', s);

    for (const action of this.pendingActions) {
      this.setActionPressed(s, action);
      s.lastAction = ACTION_LABELS[action];
    }
    this.pendingActions.clear();
  }

  private checkKey(action: ActionKey, s: InputState): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys[action])) {
      this.setActionPressed(s, action);
      s.lastAction = ACTION_LABELS[action];
      s.inputMode = 'keyboard';
    }
  }

  private setActionPressed(s: InputState, action: ActionKey): void {
    switch (action) {
      case 'attack':
        s.attackPressed = true;
        break;
      case 'skill1':
        s.skill1Pressed = true;
        break;
      case 'skill2':
        s.skill2Pressed = true;
        break;
      case 'skill3':
        s.skill3Pressed = true;
        break;
      case 'ultimate':
        s.ultimatePressed = true;
        break;
      case 'warAction':
        s.warActionPressed = true;
        break;
      case 'item1':
        s.item1Pressed = true;
        break;
      case 'item2':
        s.item2Pressed = true;
        break;
    }
  }

  /** Convenience accessor for Player movement (Phase 0-1 API). */
  public getMoveVector(out = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    return out.set(this.state.moveX, this.state.moveY);
  }

  /** Reposition joystick/buttons after a scale resize. */
  public handleResize(): void {
    const { height } = this.scene.scale;
    this.applyJoystickLayout(height);
    this.buttons.reposition();
  }

  private getJoystickLayout(height: number): {
    x: number;
    y: number;
    baseRadius: number;
    knobRadius: number;
  } {
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    return {
      x: compact ? 105 : 110,
      y: compact ? height - 92 : height - 110,
      baseRadius: compact ? 60 : 70,
      knobRadius: compact ? 27 : 32,
    };
  }

  private applyJoystickLayout(height: number): void {
    const layout = this.getJoystickLayout(height);
    this.joystick.setSize(layout.baseRadius, layout.knobRadius);
    this.joystick.reposition(layout.x, layout.y);
  }

  /** Mock cooldown overlay on the matching touch button (keyboard or touch). */
  public showButtonCooldown(action: ActionKey): void {
    this.buttons.showMockCooldown(action);
  }

  /**
   * Stop all movement, pending actions, and action flags. Called on window
   * blur, tab hide, or scene shutdown so no input leaks across transitions.
   */
  public reset(): void {
    this.joystick.reset();
    this.pendingActions.clear();
    this.clearActionState();
    this.state.moveX = 0;
    this.state.moveY = 0;
  }

  private clearActionState(): void {
    const s = this.state;
    s.attackPressed = false;
    s.skill1Pressed = false;
    s.skill2Pressed = false;
    s.skill3Pressed = false;
    s.ultimatePressed = false;
    s.warActionPressed = false;
    s.item1Pressed = false;
    s.item2Pressed = false;
    s.lastAction = '';
  }

  /** Remove all listeners and destroy UI. Call on scene shutdown. */
  public destroy(): void {
    this.reset();
    this.scene.input.off('pointerdown', this.onPointerDown);
    window.removeEventListener('blur', this.onBlurOrHide);
    document.removeEventListener('visibilitychange', this.onBlurOrHide);
    this.joystick.destroy();
    this.buttons.destroy();
  }
}
