import type { ActionKey, InputState } from '../game/types';
import { HtmlJoystick } from '../ui-html/HtmlJoystick';

// Same values as systems/InputSystem.ACTION_LABELS — duplicated instead of
// imported because that module pulls the whole Phaser chunk with it.
const ACTION_LABELS: Record<ActionKey, string> = {
  attack: 'Attack',
  skill1: 'Skill 1',
  skill2: 'Skill 2',
  skill3: 'Skill 3',
  ultimate: 'Ultimate',
  warAction: 'War Action',
  item1: 'Item 1',
  item2: 'Item 2',
};

// Phase 6A: DOM port of systems/InputSystem for the 3D path. Produces the
// exact same InputState shape each frame from WASD/arrows + the HTML virtual
// joystick. Action buttons (touch) arrive with the combat HUD in 6C — for now
// only the keyboard bindings fill the action edge flags, which keeps the
// debug overlay's "last action" parity with 2D.

const KEY_TO_ACTION: Record<string, ActionKey> = {
  KeyJ: 'attack',
  KeyQ: 'skill1',
  KeyE: 'skill2',
  KeyR: 'skill3',
  KeyF: 'ultimate',
  Space: 'warAction',
  Digit1: 'item1',
  Digit2: 'item2',
};

const MOVE_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

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

export class InputSystem3D {
  public readonly state: InputState = createInputState();
  public readonly joystick: HtmlJoystick;

  private readonly held = new Set<string>();
  private readonly pendingActions = new Set<ActionKey>();

  private onKeyDown = (e: KeyboardEvent) => {
    if (MOVE_CODES.has(e.code)) {
      this.held.add(e.code);
      e.preventDefault();
      return;
    }
    const action = KEY_TO_ACTION[e.code];
    if (action && !e.repeat) {
      this.pendingActions.add(action);
      this.state.inputMode = 'keyboard';
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };

  private onBlurOrHide = () => this.reset();

  constructor(uiRoot: HTMLElement) {
    this.joystick = new HtmlJoystick(uiRoot);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlurOrHide);
    document.addEventListener('visibilitychange', this.onBlurOrHide);
  }

  /** Queue an action from a HUD touch button (edge-triggered, like a key). */
  public queueAction(action: ActionKey): void {
    this.pendingActions.add(action);
    this.state.inputMode = 'touch';
  }

  /** Recompute input state for this frame. Call once per rAF. */
  public update(): void {
    this.updateMovement();
    this.updateActions();
  }

  private updateMovement(): void {
    const joy = this.joystick.vector;
    if (joy.x !== 0 || joy.y !== 0) {
      this.state.moveX = joy.x;
      this.state.moveY = joy.y;
      this.state.inputMode = 'touch';
      return;
    }

    let x = 0;
    let y = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) x -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) x += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) y -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) y += 1;

    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
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

    for (const action of this.pendingActions) {
      switch (action) {
        case 'attack': s.attackPressed = true; break;
        case 'skill1': s.skill1Pressed = true; break;
        case 'skill2': s.skill2Pressed = true; break;
        case 'skill3': s.skill3Pressed = true; break;
        case 'ultimate': s.ultimatePressed = true; break;
        case 'warAction': s.warActionPressed = true; break;
        case 'item1': s.item1Pressed = true; break;
        case 'item2': s.item2Pressed = true; break;
      }
      s.lastAction = ACTION_LABELS[action];
    }
    this.pendingActions.clear();
  }

  public reset(): void {
    this.held.clear();
    this.pendingActions.clear();
    this.joystick.reset();
    this.state.moveX = 0;
    this.state.moveY = 0;
  }

  public handleResize(): void {
    this.joystick.applyLayout();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlurOrHide);
    document.removeEventListener('visibilitychange', this.onBlurOrHide);
    this.joystick.destroy();
  }
}
