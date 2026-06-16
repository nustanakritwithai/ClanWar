import type { ObjectiveType } from '../types';

export type CaptureObjectiveId =
  | 'forwardCampL'
  | 'forwardCampR'
  | 'siegeRuins'
  | 'resourceCampL'
  | 'resourceCampR'
  | 'watchtower';

export type CaptureOwner = 'neutral' | 'blue' | 'red';
export type CaptureState = 'idle' | 'capturing' | 'contested' | 'captured';

export const CAPTURE_OBJECTIVE_IDS: CaptureObjectiveId[] = [
  'resourceCampL',
  'resourceCampR',
  'watchtower',
  'siegeRuins',
  'forwardCampL',
  'forwardCampR',
];

export interface CaptureObjectiveDefinition {
  id: CaptureObjectiveId;
  type: ObjectiveType;
  label: string;
  x: number;
  y: number;
  radius: number;
  scoreValue: number;
  captureDurationMs: number;
}

const SCORE_BY_TYPE: Partial<Record<ObjectiveType, number>> = {
  resource: 5,
  watchtower: 5,
  siegeRuins: 8,
  forwardCamp: 6,
};

const CAPTURE_DURATION_MS = 7000;

/** Six capturable objectives — positions/radii from map-small-twin-fortress markers. */
export const CAPTURE_OBJECTIVE_DEFINITIONS: CaptureObjectiveDefinition[] = [
  {
    id: 'forwardCampL',
    type: 'forwardCamp',
    label: 'Forward Camp L',
    x: 900,
    y: 2550,
    radius: 60,
    scoreValue: SCORE_BY_TYPE.forwardCamp ?? 6,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
  {
    id: 'forwardCampR',
    type: 'forwardCamp',
    label: 'Forward Camp R',
    x: 2100,
    y: 2550,
    radius: 60,
    scoreValue: SCORE_BY_TYPE.forwardCamp ?? 6,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
  {
    id: 'siegeRuins',
    type: 'siegeRuins',
    label: 'Siege Ruins',
    x: 1500,
    y: 2100,
    radius: 75,
    scoreValue: SCORE_BY_TYPE.siegeRuins ?? 8,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
  {
    id: 'resourceCampL',
    type: 'resource',
    label: 'Resource Camp L',
    x: 850,
    y: 1700,
    radius: 60,
    scoreValue: SCORE_BY_TYPE.resource ?? 5,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
  {
    id: 'resourceCampR',
    type: 'resource',
    label: 'Resource Camp R',
    x: 2150,
    y: 1700,
    radius: 60,
    scoreValue: SCORE_BY_TYPE.resource ?? 5,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
  {
    id: 'watchtower',
    type: 'watchtower',
    label: 'Watchtower',
    x: 1500,
    y: 1600,
    radius: 55,
    scoreValue: SCORE_BY_TYPE.watchtower ?? 5,
    captureDurationMs: CAPTURE_DURATION_MS,
  },
];
