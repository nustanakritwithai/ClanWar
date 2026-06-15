import Phaser from 'phaser';
import { COLORS, COMPACT_LAYOUT_HEIGHT } from '../constants';
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

const NORMAL_RADII: Record<ActionKey, number> = {
  attack: 46,
  skill1: 34,
  skill2: 34,
  skill3: 34,
  ultimate: 50,
  warAction: 44,
  item1: 28,
  item2: 28,
};

const COMPACT_RADII: Record<ActionKey, number> = {
  attack: 41,
  skill1: 31,
  skill2: 31,
  skill3: 31,
  ultimate: 43,
  warAction: 37,
  item1: 25,
  item2: 25,
};

function clampToScreen(
  pos: { x: number; y: number },
  radius: number,
  width: number,
  height: number,
  margin: number,
): { x: number; y: number } {
  return {
    x: Phaser.Math.Clamp(pos.x, margin + radius, width - margin - radius),
    y: Phaser.Math.Clamp(pos.y, margin + radius, height - margin - radius),
  };
}

// Phase 2.6: adaptive compact layout for short mobile viewports.
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

  private getRadius(action: ActionKey, compact: boolean): number {
    return compact ? COMPACT_RADII[action] : NORMAL_RADII[action];
  }

  private computePositions(
    width: number,
    height: number,
    compact: boolean,
    radii: Record<ActionKey, number>,
  ): Record<ActionKey, { x: number; y: number }> {
    const margin = compact ? 16 : 24;

    if (!compact) {
      return {
        attack: { x: width - 100 - margin, y: height - 90 - margin },
        skill1: { x: width - 190 - margin, y: height - 150 - margin },
        skill2: { x: width - 100 - margin, y: height - 190 - margin },
        skill3: { x: width - 10 - margin, y: height - 150 - margin },
        ultimate: { x: width - 190 - margin, y: height - 60 - margin },
        warAction: { x: width - 70 - margin, y: height * 0.5 },
        item1: { x: width / 2 - 50, y: height - 50 - margin },
        item2: { x: width / 2 + 50, y: height - 50 - margin },
      };
    }

    const safeRight = 52;
    const safeBottom = 32;
    const attackX = width - safeRight - 112;
    const attackY = height - safeBottom - 70;

    let positions: Record<ActionKey, { x: number; y: number }> = {
      attack: { x: attackX, y: attackY },
      skill1: { x: attackX - 72, y: attackY - 52 },
      skill2: { x: attackX, y: attackY - 106 },
      skill3: { x: attackX + 72, y: attackY - 52 },
      ultimate: { x: attackX - 82, y: attackY + 18 },
      warAction: { x: width - safeRight - 48, y: attackY - 150 },
      item1: { x: width / 2 - 50, y: height - safeBottom - 28 },
      item2: { x: width / 2 + 50, y: height - safeBottom - 28 },
    };

    // If skill3 clips the right edge, shift the whole combat cluster left.
    const skill3Right = positions.skill3.x + radii.skill3;
    const maxRight = width - margin;
    if (skill3Right > maxRight) {
      const shift = skill3Right - maxRight;
      const clusterKeys: ActionKey[] = ['attack', 'skill1', 'skill2', 'skill3', 'ultimate', 'warAction'];
      for (const key of clusterKeys) {
        positions[key] = { x: positions[key].x - shift, y: positions[key].y };
      }
    }

    return positions;
  }

  private warnIfButtonsOverlap(radii: Record<ActionKey, number>): void {
    for (let i = 0; i < this.buttons.length; i++) {
      for (let j = i + 1; j < this.buttons.length; j++) {
        const a = this.buttons[i];
        const b = this.buttons[j];
        const dist = Phaser.Math.Distance.Between(a.bg.x, a.bg.y, b.bg.x, b.bg.y);
        const minDist = radii[a.action] + radii[b.action] + 4;
        if (dist < minDist) {
          console.warn(
            `SkillButtons overlap: ${a.action} & ${b.action} (${dist.toFixed(0)}px < ${minDist}px)`,
          );
        }
      }
    }
  }

  public reposition(): void {
    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const margin = compact ? 16 : 24;

    const radii = {} as Record<ActionKey, number>;
    for (const key of Object.keys(NORMAL_RADII) as ActionKey[]) {
      radii[key] = this.getRadius(key, compact);
    }

    let positions = this.computePositions(width, height, compact, radii);

    for (const handle of this.buttons) {
      const r = radii[handle.action];
      handle.radius = r;
      handle.bg.setRadius(r);
      handle.bg.setInteractive({ useHandCursor: true });

      const fontSize = r >= 42 ? '15px' : r >= 36 ? '13px' : '12px';
      handle.text.setFontSize(fontSize);

      positions[handle.action] = clampToScreen(
        positions[handle.action],
        r,
        width,
        height,
        margin,
      );
    }

    for (const handle of this.buttons) {
      const pos = positions[handle.action];
      handle.bg.setPosition(pos.x, pos.y);
      handle.text.setPosition(pos.x, pos.y);
      if (handle.cooldownOverlay) {
        handle.cooldownOverlay.setPosition(pos.x, pos.y);
        handle.cooldownOverlay.setRadius(handle.radius);
      }
    }

    this.warnIfButtonsOverlap(radii);
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
