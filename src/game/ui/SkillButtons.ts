import Phaser from 'phaser';
import { COLORS } from '../constants';
import type { ActionKey } from '../types';

interface ButtonDef {
  action: ActionKey;
  label: string;
  radius: number;
}

interface ButtonHandle extends ButtonDef {
  bg: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
}

// Phase 2 placeholder action buttons (mobile right-side cluster). No gameplay
// effect yet — pressing a button just flashes it and reports the action via
// `onPress` so InputSystem can record it for the debug overlay.
export class SkillButtons {
  private scene: Phaser.Scene;
  private onPress: (action: ActionKey) => void;
  private buttons: ButtonHandle[] = [];

  private static readonly DEFS: ButtonDef[] = [
    { action: 'attack', label: 'ATK', radius: 46 },
    { action: 'skill1', label: 'Q', radius: 34 },
    { action: 'skill2', label: 'E', radius: 34 },
    { action: 'skill3', label: 'R', radius: 34 },
    { action: 'ultimate', label: 'ULT', radius: 50 },
    { action: 'warAction', label: 'War\nAction', radius: 44 },
    { action: 'item1', label: '1', radius: 28 },
    { action: 'item2', label: '2', radius: 28 },
  ];

  constructor(scene: Phaser.Scene, onPress: (action: ActionKey) => void) {
    this.scene = scene;
    this.onPress = onPress;

    for (const def of SkillButtons.DEFS) {
      this.buttons.push(this.createButton(def));
    }
    this.reposition();
  }

  private createButton(def: ButtonDef): ButtonHandle {
    const bg = this.scene.add
      .circle(0, 0, def.radius, 0xffffff, 0.14)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true });

    const text = this.scene.add
      .text(0, 0, def.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: def.radius >= 44 ? '16px' : '14px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001);

    const handle: ButtonHandle = { ...def, bg, text };

    bg.on('pointerdown', () => {
      this.flash(handle);
      this.onPress(def.action);
    });

    return handle;
  }

  private flash(handle: ButtonHandle): void {
    handle.bg.setFillStyle(0xffffff, 0.45);
    this.scene.tweens.add({
      targets: handle.bg,
      duration: 140,
      onComplete: () => handle.bg.setFillStyle(0xffffff, 0.14),
    });
  }

  /** Recompute screen positions for the right-side action cluster. */
  public reposition(): void {
    const { width, height } = this.scene.scale;
    const margin = 24;

    const positions: Record<ActionKey, { x: number; y: number }> = {
      // Bottom-right cluster: Attack centered, skills arc above/left of it.
      attack: { x: width - 100 - margin, y: height - 90 - margin },
      skill1: { x: width - 190 - margin, y: height - 150 - margin },
      skill2: { x: width - 100 - margin, y: height - 190 - margin },
      skill3: { x: width - 10 - margin, y: height - 150 - margin },
      ultimate: { x: width - 190 - margin, y: height - 60 - margin },
      // Right-center: War Action.
      warAction: { x: width - 70 - margin, y: height * 0.5 },
      // Bottom-center: Item 1/2.
      item1: { x: width / 2 - 50, y: height - 50 - margin },
      item2: { x: width / 2 + 50, y: height - 50 - margin },
    };

    for (const handle of this.buttons) {
      const pos = positions[handle.action];
      handle.bg.setPosition(pos.x, pos.y);
      handle.text.setPosition(pos.x, pos.y);
    }
  }

  public destroy(): void {
    for (const handle of this.buttons) {
      handle.bg.removeAllListeners();
      handle.bg.destroy();
      handle.text.destroy();
    }
    this.buttons = [];
  }
}
