import type { TeamId } from '../types';

/**
 * Phase 4C-C match-loop rules.
 *
 * Win conditions (MVP, no Sudden Death):
 *  - A destroyed Core ends the match immediately (existing primary path).
 *  - If the timer reaches 0 with no Core destroyed, the higher Objective Score wins.
 *  - If Objective Score is tied, the higher remaining Core HP wins.
 *  - If Objective Score and Core HP are both tied, the match is a Draw.
 *
 * Objective Score is a match-feedback signal only — never currency, EXP, Gold,
 * shop, or ranking. It is sourced from CaptureSystem.getTeamScore().
 */

/** Total match length in seconds. Config-driven so it can be tuned later. */
export const MATCH_DURATION_SEC = 300;

/** Seconds remaining at which the one-shot "Final Minute" warning fires. */
export const FINAL_MINUTE_THRESHOLD_SEC = 60;

export type MatchOutcome = 'victory' | 'defeat' | 'draw';

export type MatchResultReason =
  | 'enemy_core_destroyed'
  | 'friendly_core_destroyed'
  | 'score_victory'
  | 'score_defeat'
  | 'hp_tiebreak_victory'
  | 'hp_tiebreak_defeat'
  | 'draw';

export interface TimeUpInput {
  playerTeam: TeamId;
  blueScore: number;
  redScore: number;
  blueCoreHp: number;
  redCoreHp: number;
}

export interface MatchResolution {
  outcome: MatchOutcome;
  reason: MatchResultReason;
  blueScore: number;
  redScore: number;
  blueCoreHp: number;
  redCoreHp: number;
}

/**
 * Resolve a time-up result from the player team's perspective. Pure function —
 * assumes the caller has already confirmed no Core was destroyed.
 */
export function resolveTimeUp(input: TimeUpInput): MatchResolution {
  const { playerTeam, blueScore, redScore, blueCoreHp, redCoreHp } = input;
  const base = { blueScore, redScore, blueCoreHp, redCoreHp };

  const playerScore = playerTeam === 'blue' ? blueScore : redScore;
  const enemyScore = playerTeam === 'blue' ? redScore : blueScore;
  const playerCoreHp = playerTeam === 'blue' ? blueCoreHp : redCoreHp;
  const enemyCoreHp = playerTeam === 'blue' ? redCoreHp : blueCoreHp;

  if (playerScore > enemyScore) return { outcome: 'victory', reason: 'score_victory', ...base };
  if (enemyScore > playerScore) return { outcome: 'defeat', reason: 'score_defeat', ...base };

  if (playerCoreHp > enemyCoreHp) return { outcome: 'victory', reason: 'hp_tiebreak_victory', ...base };
  if (enemyCoreHp > playerCoreHp) return { outcome: 'defeat', reason: 'hp_tiebreak_defeat', ...base };

  return { outcome: 'draw', reason: 'draw', ...base };
}
