import Phaser from 'phaser';
import { COMPACT_LAYOUT_HEIGHT, PLAYER_TEAM } from '../constants';
import { siegeBuffActive, SIEGE_RUINS_GATE_BONUS } from '../data/siege-buff';
import type { CaptureSystem } from './CaptureSystem';
import type { TeamId } from '../types';
import { showCombatText } from '../ui/CombatText';

export const SIEGE_BUFF_TEXTURES = {
  uiSiegeBuffActive: 'ui_siege_buff_active',
  uiGateDamageBonus: 'ui_gate_damage_bonus',
} as const;

const SIEGE_BONUS_HIT_COOLDOWN_MS = 2500;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: SIEGE_BUFF_TEXTURES.uiSiegeBuffActive, path: 'objective-feedback/ui_siege_buff_active.svg' },
  { key: SIEGE_BUFF_TEXTURES.uiGateDamageBonus, path: 'objective-feedback/ui_gate_damage_bonus.svg' },
];

export function loadSiegeBuffAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (!loader.scene.textures.exists(key)) {
      loader.image(key, `assets/${path}`);
    }
  }
}

export class SiegeBuffSystem {
  private scene: Phaser.Scene;
  private captureSystem: CaptureSystem;
  private registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;

  private blueBuffActive = false;
  private redBuffActive = false;
  private siegeBonusHitCooldownMs = 0;
  private lastToast = '';
  private toastCount = 0;

  private badgeIcon?: Phaser.GameObjects.Image;
  private badgeLabel?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    captureSystem: CaptureSystem,
    registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void,
  ) {
    this.scene = scene;
    this.captureSystem = captureSystem;
    this.registerWorldObject = registerWorldObject;
  }

  public build(): void {
    this.blueBuffActive = false;
    this.redBuffActive = false;
    this.siegeBonusHitCooldownMs = 0;
    this.lastToast = '';
    this.toastCount = 0;
    this.createBadge();
    this.refreshBadge();
  }

  public destroy(): void {
    this.badgeIcon?.destroy();
    this.badgeLabel?.destroy();
    this.badgeIcon = undefined;
    this.badgeLabel = undefined;
  }

  public update(deltaMs: number): void {
    if (this.siegeBonusHitCooldownMs > 0) {
      this.siegeBonusHitCooldownMs = Math.max(0, this.siegeBonusHitCooldownMs - deltaMs);
    }

    const blueNow = this.captureSystem.siegeBuffActive('blue');
    const redNow = this.captureSystem.siegeBuffActive('red');

    if (blueNow && !this.blueBuffActive) {
      this.showToast('Siege Buff Active', '#fbbf24');
    } else if (!blueNow && this.blueBuffActive) {
      this.showToast('Siege Buff Lost', '#9ca3af');
    }

    if (redNow && !this.redBuffActive) {
      this.showToast('Enemy Siege Buff Active', '#f87171');
    }

    this.blueBuffActive = blueNow;
    this.redBuffActive = redNow;
    this.refreshBadge();
  }

  public getGateBonusMultiplier(team: TeamId): number {
    return this.captureSystem.siegeBuffActive(team) ? SIEGE_RUINS_GATE_BONUS : 0;
  }

  public onGateHitWithSiegeBonus(gateX: number, gateY: number): void {
    if (this.siegeBonusHitCooldownMs > 0) return;
    this.siegeBonusHitCooldownMs = SIEGE_BONUS_HIT_COOLDOWN_MS;
    this.showToastAt(gateX, gateY - 56, 'Siege Bonus', '#fbbf24');
  }

  public getLastToast(): string {
    return this.lastToast;
  }

  public getToastCount(): number {
    return this.toastCount;
  }

  public isPlayerBadgeVisible(): boolean {
    return this.badgeIcon?.visible ?? false;
  }

  public layoutHud(): void {
    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const x = width - 16;
    const y = compact ? 88 : 104;

    this.badgeIcon?.setPosition(x, y);
    this.badgeLabel?.setPosition(x - 22, y + 18);
  }

  private createBadge(): void {
    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const x = width - 16;
    const y = compact ? 88 : 104;
    const iconSize = compact ? 28 : 32;

    this.badgeIcon = this.scene.add
      .image(x, y, SIEGE_BUFF_TEXTURES.uiSiegeBuffActive)
      .setDisplaySize(iconSize, iconSize)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1095)
      .setVisible(false);

    this.badgeLabel = this.scene.add
      .text(x - 22, y + 18, 'Siege Buff', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '10px' : '11px',
        color: '#fbbf24',
        backgroundColor: '#00000077',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1095)
      .setVisible(false);

    this.registerWorldObject(this.badgeIcon);
    this.registerWorldObject(this.badgeLabel);
  }

  private refreshBadge(): void {
    const show = siegeBuffActive(this.captureSystem.getSiegeRuinsState(), PLAYER_TEAM);
    const compact = this.scene.scale.height < COMPACT_LAYOUT_HEIGHT;

    this.badgeIcon?.setVisible(show);
    this.badgeLabel?.setVisible(show && !compact);
  }

  private showToast(message: string, color: string): void {
    const { width } = this.scene.scale;
    this.lastToast = message;
    this.toastCount += 1;
    const text = showCombatText(this.scene, width / 2, 120, message, color);
    this.registerWorldObject(text);
  }

  private showToastAt(x: number, y: number, message: string, color: string): void {
    this.lastToast = message;
    this.toastCount += 1;
    const text = showCombatText(this.scene, x, y, message, color);
    this.registerWorldObject(text);
  }
}
