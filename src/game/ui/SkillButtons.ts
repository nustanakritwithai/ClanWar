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
  cooldownOverlay?: Phaser.GameObjects.Arc;
}

// Phase 2.5 action buttons with press flash and mock cooldown overlay (no
// real gameplay cooldown yet).
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

  private static readonly MOCK_COOLDOWN_MS: Partial<Record<ActionKey, number>> = {
    attack: 220,
    skill1: 280,
    skill2: 300,
    skill3: 320,
    ultimate: 400,
    warAction: 350,
    item1: 240,
    item2: 240,
  };

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

  /** Visual-only cooldown mock to prove future overlay support. */
  public showMockCooldown(action: ActionKey): void {
    const handle = this.buttons.find((b) => b.action === action);
    if (!handle) return;

    if (handle.cooldownOverlay) {
      this.scene.tweens.killTweensOf(handle.cooldownOverlay);
      handle.cooldownOverlay.destroy();
      handle.cooldownOverlay = undefined;
    }

    const duration = SkillButtons.MOCK_COOLDOWN_MS[action] ?? 280;
    const overlay = this.scene.add
      .circle(handle.bg.x, handle.bg.y, handle.radius, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    handle.cooldownOverlay = overlay;

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        overlay.destroy();
        if (handle.cooldownOverlay === overlay) {
          handle.cooldownOverlay = undefined;
        }
      },
    });
  }

  /** Recompute screen positions for the right-side action cluster. */
  public reposition(): void {
    const { width, height } = this.scene.scale;
    const margin = 24;

    const positions: Record<ActionKey, { x: number; y: number }> = {
      attack: { x: width - 100 - margin, y: height - 90 - margin },
      skill1: { x: width - 190 - margin, y: height - 150 - margin },
      skill2: { x: width - 100 - margin, y: height - 190 - margin },
      skill3: { x: width - 10 - margin, y: height - 150 - margin },
      ultimate: { x: width - 190 - margin, y: height - 60 - margin },
      warAction: { x: width - 70 - margin, y: height * 0.5 },
      item1: { x: width / 2 - 50, y: height - 50 - margin },
      item2: { x: width / 2 + 50, y: height - 50 - margin },
    };

    for (const handle of this.buttons) {
      const pos = positions[handle.action];
      handle.bg.setPosition(pos.x, pos.y);
      handle.text.setPosition(pos.x, pos.y);
      if (handle.cooldownOverlay) {
        handle.cooldownOverlay.setPosition(pos.x, pos.y);
      }
    }
  }

  public destroy(): void {
    for (const handle of this.buttons) {
      if (handle.cooldownOverlay) {
        this.scene.tweens.killTweensOf(handle.cooldownOverlay);
        handle.cooldownOverlay.destroy();
      }
      handle.bg.removeAllListeners();
      handle.bg.destroy();
      handle.text.destroy();
    }
    this.buttons = [];
  }
}
