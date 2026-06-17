import type { CaptureOwner, CaptureState } from './capture-objectives';
import type { TeamId } from '../types';

/** Config-driven Siege Ruins gate damage bonus (30% default per Phase 4C-B spec). */
export const SIEGE_RUINS_GATE_BONUS = 0.3;

export interface SiegeRuinsState {
  owner: CaptureOwner;
  captureState: CaptureState;
}

export function siegeBuffActive(ruins: SiegeRuinsState | null, team: TeamId): boolean {
  if (!ruins) return false;
  return ruins.owner === team && ruins.captureState !== 'contested';
}
