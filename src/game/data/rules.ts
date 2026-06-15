import type { EdgeCaseRules } from '../types';

/**
 * Edge-case match rules for Phase 3+. Spec-only — no runtime enforcement yet.
 */
export const EDGE_CASE_RULES: EdgeCaseRules = {
  simultaneousCoreDestruction: {
    id: 'simultaneous_core_destruction',
    description:
      'If both team cores are destroyed in the same frame, the team that dealt damage to a core first wins.',
  },
  coreDestructionTiebreaker: {
    id: 'core_destruction_tiebreaker',
    description:
      'If first-hit order cannot be determined, the team with higher coreDamageThisMatch wins.',
  },
  respawnWithoutForwardCamp: {
    id: 'respawn_without_forward_camp',
    description:
      'If a team controls no forward camp, players respawn at base.',
  },
  warActionCancelOnDeath: {
    id: 'war_action_cancel_on_death',
    description: 'If a player dies while performing a War Action, cancel the action immediately.',
  },
  contestedObjective: {
    id: 'contested_objective',
    description:
      'If two teams stand on an objective simultaneously, progress stops and the objective is contested.',
  },
  matchTimeTiebreaker: {
    id: 'match_time_tiebreaker',
    description: 'If time expires with equal score, the winner is decided by remaining core HP.',
  },
  coreHpTiebreaker: {
    id: 'core_hp_tiebreaker',
    description: 'If core HP is equal, enter sudden death for 2 minutes.',
  },
  suddenDeathDuration: {
    id: 'sudden_death_duration',
    description: 'Sudden death lasts 2 minutes.',
  },
  suddenDeathTiebreaker: {
    id: 'sudden_death_tiebreaker',
    description:
      'If sudden death does not produce a winner, the team with higher totalObjectiveHoldTime wins.',
  },
};

/** Sudden-death duration in seconds (spec constant for Phase 3+). */
export const SUDDEN_DEATH_SECONDS = 120;
