import {
  CAPTURE_OBJECTIVE_DEFINITIONS,
  type CaptureObjectiveDefinition,
  type CaptureObjectiveId,
  type CaptureOwner,
  type CaptureState,
} from '../data/capture-objectives';
import { siegeBuffActive, type SiegeRuinsState } from '../data/siege-buff';
import type { ObjectiveType, TeamId } from '../types';

// Phase 6E: headless port of systems/CaptureSystem for the 3D renderer path.
//
// Same rules as 2D: stand inside the circle to fill progress
// (100 / durationMs * deltaMs); leaving pauses progress in place (no decay)
// with a "Capture Paused" hint (2000ms cooldown); reaching 100 flips the
// owner and awards Objective Score. Only the blue (human) side can ever be
// inside a circle — bots don't capture in 2D either, so the red/contested
// branches exist for rule parity but are unreachable in normal play.

const HINT_COOLDOWN_MS = 2000;
const CAPTURED_STATE_MS = 600;

const CAPTURE_COMPLETE_COPY: Partial<Record<ObjectiveType, string>> = {
  resource: 'Resource Camp Captured',
  watchtower: 'Watchtower Captured',
  siegeRuins: 'Siege Ruins Captured',
  forwardCamp: 'Forward Camp Captured',
};

export const CAPTURE_ACTIVE_COPY: Partial<Record<ObjectiveType, string>> = {
  resource: 'Capturing Resource Camp',
  watchtower: 'Capturing Watchtower',
  siegeRuins: 'Capturing Siege Ruins',
  forwardCamp: 'Capturing Forward Camp',
};

interface RuntimeCapture {
  def: CaptureObjectiveDefinition;
  owner: CaptureOwner;
  captureProgress: number;
  captureState: CaptureState;
  capturingTeam: TeamId | null;
}

export interface SimCaptureSnapshot {
  id: CaptureObjectiveId;
  type: ObjectiveType;
  label: string;
  x: number;
  y: number;
  radius: number;
  owner: CaptureOwner;
  captureProgress: number;
  captureState: CaptureState;
  scoreValue: number;
}

export type CaptureEmit =
  | { type: 'captureFeedback'; x: number; y: number; message: string; color: string }
  | { type: 'captureCompleted'; id: CaptureObjectiveId; team: TeamId; score: number; x: number; y: number };

export class SimCapture {
  private readonly emit: (event: CaptureEmit) => void;
  private readonly objectives = new Map<CaptureObjectiveId, RuntimeCapture>();
  private blueScore = 0;
  private redScore = 0;
  private hintCooldownMs = 0;
  private capturedStateTimerMs = 0;
  /** Capture point the player currently stands inside (nearest), for HUD. */
  private activeObjectiveId: CaptureObjectiveId | null = null;

  constructor(emit: (event: CaptureEmit) => void) {
    this.emit = emit;
    for (const def of CAPTURE_OBJECTIVE_DEFINITIONS) {
      this.objectives.set(def.id, {
        def,
        owner: 'neutral',
        captureProgress: 0,
        captureState: 'idle',
        capturingTeam: null,
      });
    }
  }

  public update(deltaMs: number, playerX: number, playerY: number, playerTeam: TeamId): void {
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
          }
        }
      }
    }

    let nearestActive: CaptureObjectiveId | null = null;
    let nearestDist = Infinity;

    for (const obj of this.objectives.values()) {
      const blueInside =
        playerTeam === 'blue' &&
        Math.hypot(obj.def.x - playerX, obj.def.y - playerY) <= obj.def.radius;
      const redInside = false; // bots never capture (2D parity)
      const contested = blueInside && redInside;
      const canBlueCapture = obj.owner !== 'blue';

      if (contested) {
        obj.captureState = 'contested';
        obj.capturingTeam = null;
      } else if (blueInside && canBlueCapture) {
        obj.captureState = 'capturing';
        obj.capturingTeam = 'blue';
        const rate = (100 / obj.def.captureDurationMs) * deltaMs;
        obj.captureProgress = Math.min(100, obj.captureProgress + rate);
        if (obj.captureProgress >= 100) {
          this.completeCapture(obj, 'blue');
        }
      } else {
        if (obj.captureState === 'capturing' || obj.captureState === 'contested') {
          const hadProgress = obj.captureProgress > 0;
          obj.captureState = 'idle';
          obj.capturingTeam = null;
          if (hadProgress && this.hintCooldownMs <= 0) {
            this.emit({
              type: 'captureFeedback',
              x: obj.def.x, y: obj.def.y - 36,
              message: 'Capture Paused', color: '#9ca3af',
            });
            this.hintCooldownMs = HINT_COOLDOWN_MS;
          }
        } else if (obj.captureState !== 'captured') {
          obj.captureState = 'idle';
          obj.capturingTeam = null;
        }
      }

      if (blueInside) {
        const dist = Math.hypot(obj.def.x - playerX, obj.def.y - playerY);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestActive = obj.def.id;
        }
      }
    }

    this.activeObjectiveId = nearestActive;
  }

  public getTeamScore(team: TeamId): number {
    return team === 'blue' ? this.blueScore : this.redScore;
  }

  public getActiveObjectiveId(): CaptureObjectiveId | null {
    return this.activeObjectiveId;
  }

  public getSnapshots(): SimCaptureSnapshot[] {
    return [...this.objectives.values()].map((obj) => ({
      id: obj.def.id,
      type: obj.def.type,
      label: obj.def.label,
      x: obj.def.x,
      y: obj.def.y,
      radius: obj.def.radius,
      owner: obj.owner,
      captureProgress: obj.captureProgress,
      captureState: obj.captureState,
      scoreValue: obj.def.scoreValue,
    }));
  }

  public getSiegeRuinsState(): SiegeRuinsState | null {
    const obj = this.objectives.get('siegeRuins');
    if (!obj) return null;
    return { owner: obj.owner, captureState: obj.captureState };
  }

  public siegeBuffActive(team: TeamId): boolean {
    return siegeBuffActive(this.getSiegeRuinsState(), team);
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
      this.emit({
        type: 'captureFeedback',
        x: obj.def.x, y: obj.def.y - 48,
        message: completeCopy,
        color: team === 'blue' ? '#60a5fa' : '#f87171',
      });
      this.emit({
        type: 'captureCompleted',
        id: obj.def.id, team,
        score: obj.def.scoreValue,
        x: obj.def.x, y: obj.def.y,
      });
    }
  }
}
