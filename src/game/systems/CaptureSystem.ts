import Phaser from 'phaser';
import { COMPACT_LAYOUT_HEIGHT } from '../constants';
import {
  CAPTURE_OBJECTIVE_DEFINITIONS,
  type CaptureObjectiveDefinition,
  type CaptureObjectiveId,
  type CaptureOwner,
  type CaptureState,
} from '../data/capture-objectives';
import { CaptureObjective } from '../entities/CaptureObjective';
import type { ObjectiveType, TeamId } from '../types';
import { showCombatText } from '../ui/CombatText';

const HINT_COOLDOWN_MS = 2000;
const CAPTURED_STATE_MS = 600;
const SCORE_TOAST_DELAY_MS = 400;

export const CAPTURE_TEXTURES = {
  resourceCamp: 'cap_resource_camp',
  siegeRuins: 'cap_siege_ruins',
  forwardCampNeutral: 'cap_forward_camp',
  forwardCampBlue: 'cap_forward_camp_blue',
  forwardCampRed: 'cap_forward_camp_red',
  watchtowerNeutral: 'cap_watchtower_neutral',
  watchtowerBlue: 'cap_watchtower_blue',
  watchtowerRed: 'cap_watchtower_red',
  uiNeutral: 'ui_capture_neutral',
  uiBlue: 'ui_capture_blue',
  uiRed: 'ui_capture_red',
  uiContested: 'ui_capture_contested',
  uiProgress: 'ui_capture_progress',
  uiComplete: 'ui_capture_complete',
} as const;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: CAPTURE_TEXTURES.resourceCamp, path: 'objectives/resource_camp.svg' },
  { key: CAPTURE_TEXTURES.siegeRuins, path: 'objectives/siege_ruins.svg' },
  { key: CAPTURE_TEXTURES.forwardCampNeutral, path: 'objectives/forward_camp.svg' },
  { key: CAPTURE_TEXTURES.forwardCampBlue, path: 'objectives/forward_camp_blue.svg' },
  { key: CAPTURE_TEXTURES.forwardCampRed, path: 'objectives/forward_camp_red.svg' },
  { key: CAPTURE_TEXTURES.watchtowerNeutral, path: 'objectives/watchtower_neutral.svg' },
  { key: CAPTURE_TEXTURES.watchtowerBlue, path: 'objectives/watchtower_blue.svg' },
  { key: CAPTURE_TEXTURES.watchtowerRed, path: 'objectives/watchtower_red.svg' },
  { key: CAPTURE_TEXTURES.uiNeutral, path: 'objective-feedback/ui_capture_neutral.svg' },
  { key: CAPTURE_TEXTURES.uiBlue, path: 'objective-feedback/ui_capture_blue.svg' },
  { key: CAPTURE_TEXTURES.uiRed, path: 'objective-feedback/ui_capture_red.svg' },
  { key: CAPTURE_TEXTURES.uiContested, path: 'objective-feedback/ui_capture_contested.svg' },
  { key: CAPTURE_TEXTURES.uiProgress, path: 'objective-feedback/ui_capture_progress.svg' },
  { key: CAPTURE_TEXTURES.uiComplete, path: 'objective-feedback/ui_capture_complete.svg' },
];

const CAPTURE_COMPLETE_COPY: Partial<Record<ObjectiveType, string>> = {
  resource: 'Resource Camp Captured',
  watchtower: 'Watchtower Captured',
  siegeRuins: 'Siege Ruins Captured',
  forwardCamp: 'Forward Camp Captured',
};

const CAPTURE_ACTIVE_COPY: Partial<Record<ObjectiveType, string>> = {
  resource: 'Capturing Resource Camp',
  watchtower: 'Capturing Watchtower',
  siegeRuins: 'Capturing Siege Ruins',
  forwardCamp: 'Capturing Forward Camp',
};

interface RuntimeCapture {
  def: CaptureObjectiveDefinition;
  entity: CaptureObjective;
  owner: CaptureOwner;
  captureProgress: number;
  captureState: CaptureState;
  capturingTeam: TeamId | null;
}

export interface CaptureSnapshot {
  id: CaptureObjectiveId;
  type: ObjectiveType;
  owner: CaptureOwner;
  captureProgress: number;
  captureState: CaptureState;
  scoreValue: number;
}

export function loadCaptureAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (!loader.scene.textures.exists(key)) {
      loader.image(key, `assets/${path}`);
    }
  }
}

export class CaptureSystem {
  private scene: Phaser.Scene;
  private registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;
  private onGateHudVisibilityChange: (visible: boolean) => void;

  private objectives = new Map<CaptureObjectiveId, RuntimeCapture>();
  private blueScore = 0;
  private redScore = 0;
  private activeObjectiveId: CaptureObjectiveId | null = null;
  private simulatedPlayerObjectiveId: CaptureObjectiveId | null = null;
  private simulatedEnemyObjectiveId: CaptureObjectiveId | null = null;
  private hintCooldownMs = 0;
  private lastFeedback = '';
  private feedbackCount = 0;
  private capturedStateTimerMs = 0;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

  private captureHudLabel?: Phaser.GameObjects.Text;
  private captureProgressBar?: Phaser.GameObjects.Graphics;
  private captureHudIcon?: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void,
    onGateHudVisibilityChange: (visible: boolean) => void,
  ) {
    this.scene = scene;
    this.registerWorldObject = registerWorldObject;
    this.onGateHudVisibilityChange = onGateHudVisibilityChange;
  }

  public build(): void {
    this.blueScore = 0;
    this.redScore = 0;
    this.activeObjectiveId = null;
    this.simulatedPlayerObjectiveId = null;
    this.simulatedEnemyObjectiveId = null;
    this.hintCooldownMs = 0;
    this.lastFeedback = '';
    this.feedbackCount = 0;
    this.capturedStateTimerMs = 0;

    for (const def of CAPTURE_OBJECTIVE_DEFINITIONS) {
      const texture = this.textureForOwner(def.type, 'neutral');
      const entity = new CaptureObjective(this.scene, def, texture, this.registerWorldObject);
      this.objectives.set(def.id, {
        def,
        entity,
        owner: 'neutral',
        captureProgress: 0,
        captureState: 'idle',
        capturingTeam: null,
      });
      entity.applyVisual(texture, 'idle', 0);
    }

    this.createCaptureHud();
    this.hideCaptureHud();
  }

  public destroy(): void {
    for (const obj of this.objectives.values()) {
      obj.entity.destroy();
    }
    this.objectives.clear();
    this.captureHudLabel?.destroy();
    this.captureProgressBar?.destroy();
    this.captureHudIcon?.destroy();
    this.captureHudLabel = undefined;
    this.captureProgressBar = undefined;
    this.captureHudIcon = undefined;
    this.onGateHudVisibilityChange(true);
  }

  public update(deltaMs: number, playerX: number, playerY: number, playerTeam: TeamId): void {
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;

    if (this.hintCooldownMs > 0) {
      this.hintCooldownMs = Math.max(0, this.hintCooldownMs - deltaMs);
    }

    if (this.capturedStateTimerMs > 0) {
      this.capturedStateTimerMs = Math.max(0, this.capturedStateTimerMs - deltaMs);
      if (this.capturedStateTimerMs === 0) {
        for (const obj of this.objectives.values()) {
          if (obj.captureState === 'captured') {
            obj.captureState = 'idle';
            obj.capturingTeam = null;
            obj.captureProgress = 0;
            this.syncVisual(obj);
          }
        }
      }
    }

    let nearestActive: CaptureObjectiveId | null = null;
    let nearestDist = Infinity;

    for (const obj of this.objectives.values()) {
      const blueInside = this.isTeamInside(obj, playerTeam, playerX, playerY);
      const redInside = this.isTeamInside(obj, 'red', playerX, playerY);
      const contested = blueInside && redInside;
      const canBlueCapture = obj.owner !== 'blue';
      const canRedCapture = obj.owner !== 'red';

      let nextState: CaptureState = 'idle';
      let nextTeam: TeamId | null = null;

      if (contested) {
        nextState = 'contested';
      } else if (blueInside && canBlueCapture) {
        nextState = 'capturing';
        nextTeam = 'blue';
      } else if (redInside && canRedCapture) {
        nextState = 'capturing';
        nextTeam = 'red';
      } else if (obj.captureState === 'captured') {
        nextState = 'captured';
        nextTeam = obj.capturingTeam;
      }

      if (nextState === 'contested') {
        obj.captureState = 'contested';
        obj.capturingTeam = null;
      } else if (nextState === 'capturing' && nextTeam) {
        const wasCapturing = obj.captureState === 'capturing' && obj.capturingTeam === nextTeam;
        obj.captureState = 'capturing';
        obj.capturingTeam = nextTeam;
        const rate = (100 / obj.def.captureDurationMs) * deltaMs;
        obj.captureProgress = Math.min(100, obj.captureProgress + rate);
        if (!wasCapturing && obj.captureProgress > 0 && obj.captureProgress < 100) {
          // resumed after pause
        }
        if (obj.captureProgress >= 100) {
          this.completeCapture(obj, nextTeam);
        }
      } else {
        if (obj.captureState === 'capturing' || obj.captureState === 'contested') {
          const hadProgress = obj.captureProgress > 0;
          obj.captureState = 'idle';
          obj.capturingTeam = null;
          if (hadProgress && this.hintCooldownMs <= 0) {
            this.showFeedback(obj.def.x, obj.def.y - 36, 'Capture Paused', '#9ca3af');
            this.hintCooldownMs = HINT_COOLDOWN_MS;
          }
        } else if (obj.captureState !== 'captured') {
          obj.captureState = 'idle';
          obj.capturingTeam = null;
        }
      }

      this.syncVisual(obj);

      const playerInside =
        this.simulatedPlayerObjectiveId === obj.def.id ||
        Math.hypot(obj.def.x - this.lastPlayerX, obj.def.y - this.lastPlayerY) <= obj.def.radius;
      if (playerInside) {
        const dist = Math.hypot(obj.def.x - this.lastPlayerX, obj.def.y - this.lastPlayerY);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestActive = obj.def.id;
        }
      }
    }

    this.activeObjectiveId = nearestActive;
    this.refreshCaptureHud(nearestActive);
  }

  public getCaptureCount(): number {
    return this.objectives.size;
  }

  public getTeamScore(team: TeamId): number {
    return team === 'blue' ? this.blueScore : this.redScore;
  }

  public getSnapshots(): CaptureSnapshot[] {
    return [...this.objectives.values()].map((obj) => ({
      id: obj.def.id,
      type: obj.def.type,
      owner: obj.owner,
      captureProgress: obj.captureProgress,
      captureState: obj.captureState,
      scoreValue: obj.def.scoreValue,
    }));
  }

  public getCaptureHudLabel(): string {
    return this.captureHudLabel?.text ?? '';
  }

  public getLastFeedback(): string {
    return this.lastFeedback;
  }

  public getFeedbackCount(): number {
    return this.feedbackCount;
  }

  public getActiveObjectiveId(): CaptureObjectiveId | null {
    return this.activeObjectiveId;
  }

  /** Test hook — simulate blue player presence inside an objective circle. */
  public simulatePlayerAtObjective(id: CaptureObjectiveId | null): void {
    this.simulatedPlayerObjectiveId = id;
  }

  /** Test hook — simulate enemy presence inside an objective circle (headless contest). */
  public simulateEnemyAtObjective(id: CaptureObjectiveId | null): void {
    this.simulatedEnemyObjectiveId = id;
  }

  /** Test hook — force capture progress for regression (does not award score). */
  public debugSetCaptureProgress(id: CaptureObjectiveId, progress: number): void {
    const obj = this.objectives.get(id);
    if (!obj) return;
    obj.captureProgress = Phaser.Math.Clamp(progress, 0, 100);
    this.syncVisual(obj);
  }

  /** Test hook — complete capture for a team without standing in circle. */
  public debugCompleteCapture(id: CaptureObjectiveId, team: TeamId): void {
    const obj = this.objectives.get(id);
    if (!obj) return;
    obj.captureProgress = 100;
    this.completeCapture(obj, team);
  }

  public layoutHud(): void {
    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const hudY = compact ? 36 : 44;
    const labelY = compact ? 58 : 72;
    const barY = compact ? 76 : 92;
    const barW = Math.min(width * 0.4, 200);
    const iconSize = compact ? 36 : 48;

    this.captureHudIcon?.setPosition(width / 2, hudY).setDisplaySize(iconSize, iconSize);
    this.captureHudLabel?.setPosition(width / 2, labelY);
    this.captureProgressBar?.setPosition(width / 2 - barW / 2, barY);
  }

  private isTeamInside(
    obj: RuntimeCapture,
    team: TeamId,
    playerX: number,
    playerY: number,
  ): boolean {
    if (team === 'blue' && this.simulatedPlayerObjectiveId === obj.def.id) return true;
    if (team === 'red' && this.simulatedEnemyObjectiveId === obj.def.id) return true;
    if (team === 'blue') {
      return Math.hypot(obj.def.x - playerX, obj.def.y - playerY) <= obj.def.radius;
    }
    return false;
  }

  private completeCapture(obj: RuntimeCapture, team: TeamId): void {
    const previousOwner = obj.owner;
    obj.owner = team;
    obj.captureProgress = 100;
    obj.captureState = 'captured';
    obj.capturingTeam = team;
    this.capturedStateTimerMs = CAPTURED_STATE_MS;

    if (previousOwner !== team) {
      if (team === 'blue') this.blueScore += obj.def.scoreValue;
      else this.redScore += obj.def.scoreValue;

      const completeCopy = CAPTURE_COMPLETE_COPY[obj.def.type] ?? 'Objective Secured';
      this.showFeedback(obj.def.x, obj.def.y - 48, completeCopy, team === 'blue' ? '#60a5fa' : '#f87171');
      this.scene.time.delayedCall(SCORE_TOAST_DELAY_MS, () => {
        this.showFeedback(
          obj.def.x,
          obj.def.y - 24,
          `+${obj.def.scoreValue} Objective Score`,
          '#fbbf24',
        );
      });
    }

    this.syncVisual(obj);
  }

  private syncVisual(obj: RuntimeCapture): void {
    const texture = this.textureForOwner(obj.def.type, obj.owner);
    obj.entity.applyVisual(texture, obj.captureState, obj.captureProgress);
  }

  private textureForOwner(type: ObjectiveType, owner: CaptureOwner): string {
    if (type === 'watchtower') {
      if (owner === 'blue') return CAPTURE_TEXTURES.watchtowerBlue;
      if (owner === 'red') return CAPTURE_TEXTURES.watchtowerRed;
      return CAPTURE_TEXTURES.watchtowerNeutral;
    }
    if (type === 'forwardCamp') {
      if (owner === 'blue') return CAPTURE_TEXTURES.forwardCampBlue;
      if (owner === 'red') return CAPTURE_TEXTURES.forwardCampRed;
      return CAPTURE_TEXTURES.forwardCampNeutral;
    }
    if (type === 'siegeRuins') return CAPTURE_TEXTURES.siegeRuins;
    return CAPTURE_TEXTURES.resourceCamp;
  }

  private createCaptureHud(): void {
    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const hudY = compact ? 36 : 44;
    const labelY = compact ? 58 : 72;
    const barY = compact ? 76 : 92;
    const barW = Math.min(width * 0.4, 200);
    const labelSize = compact ? '11px' : '13px';
    const iconSize = compact ? 36 : 48;

    this.captureHudIcon = this.scene.add
      .image(width / 2, hudY, CAPTURE_TEXTURES.uiNeutral)
      .setDisplaySize(iconSize, iconSize)
      .setScrollFactor(0)
      .setDepth(1105)
      .setVisible(false);

    this.captureHudLabel = this.scene.add
      .text(width / 2, labelY, 'Capturing', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: labelSize,
        color: '#e6edf3',
        backgroundColor: '#00000077',
        padding: { x: compact ? 5 : 6, y: compact ? 2 : 3 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1105)
      .setVisible(false);

    this.captureProgressBar = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(1105)
      .setVisible(false);

    this.registerWorldObject(this.captureHudIcon);
    this.registerWorldObject(this.captureHudLabel);
    this.registerWorldObject(this.captureProgressBar);
    this.layoutHud();
    this.drawProgressBar(0, barW, barY);
  }

  private refreshCaptureHud(activeId: CaptureObjectiveId | null): void {
    if (!activeId) {
      this.hideCaptureHud();
      return;
    }

    const obj = this.objectives.get(activeId);
    if (!obj) {
      this.hideCaptureHud();
      return;
    }

    const playerInside =
      this.simulatedPlayerObjectiveId === obj.def.id ||
      Math.hypot(obj.def.x - this.lastPlayerX, obj.def.y - this.lastPlayerY) <= obj.def.radius;

    if (!playerInside || (obj.owner === 'blue' && obj.captureState === 'idle')) {
      this.hideCaptureHud();
      return;
    }

    this.onGateHudVisibilityChange(false);
    this.captureHudIcon?.setVisible(true);
    this.captureHudLabel?.setVisible(true);
    this.captureProgressBar?.setVisible(
      obj.captureState === 'capturing' || obj.captureState === 'contested',
    );

    let label = 'Capturing';
    let icon: string = CAPTURE_TEXTURES.uiNeutral;

    if (obj.captureState === 'contested') {
      label = 'Contested';
      icon = CAPTURE_TEXTURES.uiContested;
    } else if (obj.captureState === 'capturing') {
      label = CAPTURE_ACTIVE_COPY[obj.def.type] ?? 'Capturing';
      icon =
        obj.capturingTeam === 'red'
          ? CAPTURE_TEXTURES.uiRed
          : obj.capturingTeam === 'blue'
            ? CAPTURE_TEXTURES.uiBlue
            : CAPTURE_TEXTURES.uiProgress;
    }

    this.captureHudLabel?.setText(label);
    this.captureHudIcon?.setTexture(icon);

    const { width, height } = this.scene.scale;
    const compact = height < COMPACT_LAYOUT_HEIGHT;
    const barY = compact ? 76 : 92;
    const barW = Math.min(width * 0.4, 200);
    this.drawProgressBar(obj.captureProgress, barW, barY);
  }

  private hideCaptureHud(): void {
    this.captureHudIcon?.setVisible(false);
    this.captureHudLabel?.setVisible(false);
    this.captureProgressBar?.setVisible(false);
    this.onGateHudVisibilityChange(true);
  }

  private drawProgressBar(progress: number, barW: number, barY: number): void {
    if (!this.captureProgressBar) return;
    const { width } = this.scene.scale;
    const x = width / 2 - barW / 2;
    const h = 7;
    this.captureProgressBar.clear();
    this.captureProgressBar.fillStyle(0x000000, 0.55);
    this.captureProgressBar.fillRect(x, barY, barW, h);
    this.captureProgressBar.fillStyle(0x60a5fa, 0.95);
    this.captureProgressBar.fillRect(x, barY, barW * (progress / 100), h);
  }

  private showFeedback(x: number, y: number, message: string, color: string): void {
    this.lastFeedback = message;
    this.feedbackCount += 1;
    const text = showCombatText(this.scene, x, y, message, color);
    this.registerWorldObject(text);
  }
}
