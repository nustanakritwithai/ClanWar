import type { TeamId } from '../types';

export type ObjectiveId = 'blueGate' | 'blueCore' | 'redGate' | 'redCore';
export type ObjectiveKind = 'gate' | 'core';

export type GateCombatState = 'intact' | 'under_attack' | 'destroyed';
export type CoreCombatState = 'protected' | 'vulnerable' | 'under_attack' | 'destroyed';
export type ObjectiveCombatState = GateCombatState | CoreCombatState;

export type PlayerObjectivePriority = 'attack_gate' | 'attack_core' | 'defend_core' | 'victory';
export type MatchObjectivePhase = 'in_progress' | 'victory' | 'defeat';

export interface ObjectiveDefinition {
  id: ObjectiveId;
  type: ObjectiveKind;
  team: TeamId;
  x: number;
  y: number;
  radius: number;
  maxHp: number;
  armor: number;
}

export const OBJECTIVE_DEFINITIONS: ObjectiveDefinition[] = [
  {
    id: 'blueGate',
    type: 'gate',
    team: 'blue',
    x: 1500,
    y: 3200,
    radius: 60,
    maxHp: 1500,
    armor: 10,
  },
  {
    id: 'blueCore',
    type: 'core',
    team: 'blue',
    x: 1500,
    y: 3700,
    radius: 90,
    maxHp: 2000,
    armor: 15,
  },
  {
    id: 'redGate',
    type: 'gate',
    team: 'red',
    x: 1500,
    y: 1000,
    radius: 60,
    maxHp: 1500,
    armor: 10,
  },
  {
    id: 'redCore',
    type: 'core',
    team: 'red',
    x: 1500,
    y: 500,
    radius: 90,
    maxHp: 2000,
    armor: 15,
  },
];

export const GATE_OBJECTIVE_IDS: ObjectiveId[] = ['blueGate', 'redGate'];
export const CORE_OBJECTIVE_IDS: ObjectiveId[] = ['blueCore', 'redCore'];
